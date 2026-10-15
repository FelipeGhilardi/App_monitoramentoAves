import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { getCurrentUser, login, logout, isLoggedIn } from '../services/auth';
import { getToken, setToken } from '../services/api';
import { deactivateNotificationDevice, registerNotificationDevice, hasPendingDeviceDeactivation } from '../services/notification-device';
import { clearNotifications, fetchNotifications, notificationDestination } from '../services/notifications';

const user = { id: 'user-a', name: 'Alice', email: 'alice@example.test', createdAt: '', updatedAt: '' };
const token = `synthetic.${btoa(JSON.stringify({ exp: 4102444800 }))}.synthetic`;
const originalFetch = global.fetch;
const mockFetch = jest.fn();
const response = (value: unknown, status = 200): Response => ({
  ok: status >= 200 && status < 300, status, text: async () => value == null ? '' : JSON.stringify(value),
} as Response);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  global.fetch = mockFetch;
  mockFetch.mockReset();
  mockFetch.mockResolvedValue(response(null, 204));
});

afterAll(() => { global.fetch = originalFetch; });

test('destino aceita somente IDs internos e vínculo com a mesma notificação', () => {
  expect(notificationDestination({ sightingId: 'sighting-1', notificationId: 'sighting-1', userId: 'user-a' }))
    .toEqual({ sightingId: 'sighting-1', notificationId: 'sighting-1', userId: 'user-a' });
  for (const data of [null, { sightingId: 'https://other.example', notificationId: 'x', userId: 'user-a' },
    { sightingId: 'sighting-1', notificationId: 'sighting-2', userId: 'user-a' }]) {
    expect(() => notificationDestination(data)).toThrow('destino inválido');
  }
});

test('consulta usa cursor escapado e token da sessão capturada, não de outra conta', async () => {
  await setToken('other-account-token');
  mockFetch.mockResolvedValue(response({ items: [], nextCursor: null }));
  await fetchNotifications(token, 'opaque+/=');
  const [url, options] = mockFetch.mock.calls[0];
  expect(url).toContain('cursor=opaque%2B%2F%3D');
  expect(options.headers.Authorization).toBe(`Bearer ${token}`);
});

test('limpeza usa DELETE autenticado e a mesma chave fornecida em retentativas', async () => {
  await setToken('other-account-token');
  await clearNotifications(token, 'confirmation-1');
  await clearNotifications(token, 'confirmation-1');
  expect(mockFetch).toHaveBeenCalledTimes(2);
  for (const [url, options] of mockFetch.mock.calls) {
    expect(url).toMatch(/\/api\/notifications$/);
    expect(options.method).toBe('DELETE');
    expect(options.headers['Idempotency-Key']).toBe('confirmation-1');
    expect(options.headers.Authorization).toBe(`Bearer ${token}`);
    expect(options.body).toBeUndefined();
  }
});

test('falha de desativação impede logout; repetição retira somente a instalação e mantém histórico', async () => {
  mockFetch.mockResolvedValueOnce(response({ token, user }));
  expect((await login(user.email, 'synthetic-password')).success).toBe(true);
  await registerNotificationDevice(token, user.id, 'synthetic-native-token');
  mockFetch.mockResolvedValueOnce(response({ message: 'Falha sintética' }, 503));
  await expect(logout()).rejects.toEqual({ status: 503, message: 'Falha sintética' });
  expect(await getToken()).toBe(token);
  mockFetch.mockResolvedValueOnce(response(null, 204));
  await logout();
  expect(await getToken()).toBeNull();
  const deletes = mockFetch.mock.calls.filter(([, options]) => options.method === 'DELETE');
  expect(deletes).toHaveLength(2);
  expect(deletes[0][0]).toMatch(/notification-devices\/11111111-1111-4111-8111-111111111111$/);
  expect(mockFetch.mock.calls.some(([url]) => url.includes('/api/notifications/'))).toBe(false);
});

test('expiração limpa sessão sem tentar desativar com JWT inválido e deixa reconciliação pendente', async () => {
  await setToken(token);
  await registerNotificationDevice(token, user.id, 'synthetic-native-token');
  await setToken(`synthetic.${btoa(JSON.stringify({ exp: 1 }))}.synthetic`);
  mockFetch.mockClear();
  expect(await isLoggedIn()).toBe(false);
  expect(await getToken()).toBeNull();
  expect(await hasPendingDeviceDeactivation()).toBe(true);
  expect(mockFetch).not.toHaveBeenCalled();
});

test('recupera e persiste o ID de sessões antigas pelo subject do JWT', async () => {
  const id = '11111111-1111-4111-8111-111111111111';
  const legacyToken = `synthetic.${btoa(JSON.stringify({ sub: id, exp: 4102444800 }))}.synthetic`;
  await setToken(legacyToken);
  await AsyncStorage.setItem('userEmail', 'alice@example.test');

  expect(await getCurrentUser()).toMatchObject({ id, email: 'alice@example.test' });
  expect(await AsyncStorage.getItem('userId')).toBe(id);
});

test('logout aguarda cadastro já iniciado e desativa depois, mesmo quando a resposta de cadastro se perde', async () => {
  await setToken(token);
  let resolveRegistration!: (result: Response) => void;
  mockFetch.mockImplementationOnce(() => new Promise<Response>((resolve) => { resolveRegistration = resolve; }));
  const registration = registerNotificationDevice(token, user.id, 'synthetic-native-token');
  // The public storage intent confirms that the registration is in flight.
  while (!resolveRegistration) await Promise.resolve();
  const leaving = logout();
  resolveRegistration(response({ message: 'Falha sintética de retorno' }, 503));
  await expect(registration).rejects.toMatchObject({ status: 503 });
  await leaving;
  expect(mockFetch.mock.calls.map(([, options]) => options.method)).toEqual(['PUT', 'DELETE']);
  expect(await getToken()).toBeNull();
});
