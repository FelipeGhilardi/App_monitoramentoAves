import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import { login } from '../services/auth';
import { NotificationProvider, useNotifications } from '../services/notification-context';
import NotificationsModal from '../components/NotificationsModal';
import SettingsModal from '../components/SettingsModal';

jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
const user = { id: 'user-a', name: 'Alice', email: 'alice@example.test', createdAt: '', updatedAt: '' };
const token = `synthetic.${btoa(JSON.stringify({ exp: 4102444800 }))}.synthetic`;
const notice = { id: 'sighting-1', sightingId: 'sighting-1', title: 'Novo avistamento registrado',
  body: 'Registro disponível.', createdAt: '2026-01-01T00:00:00Z', readAt: null };
const originalFetch = global.fetch;
const mockFetch = jest.fn();
const push = jest.fn();
let pushEnabled = true;
let failRead = false;
let inbox: typeof notice[];
let count: number;
let failClear = false;
let loginUser = user;
let activeNotifications: ReturnType<typeof useNotifications>;

const response = (value: unknown, status = 200): Response => ({
  ok: status >= 200 && status < 300, status, text: async () => value == null ? '' : JSON.stringify(value),
} as Response);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.mocked(isRunningInExpoGo).mockReturnValue(false);
  global.fetch = mockFetch;
  pushEnabled = true;
  failRead = false;
  failClear = false;
  inbox = [notice];
  count = 1;
  loginUser = user;
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url: string, options: RequestInit) => {
    if (url.endsWith('/api/auth/login')) return response({ token, user: loginUser });
    if (url.endsWith('/notification-subscriptions') || url.endsWith('/notification-preferences')) {
      if (options.method === 'PUT') pushEnabled = JSON.parse(String(options.body)).pushEnabled;
      return response({ startedAt: '2026-01-01T00:00:00Z', pushEnabled, unreadCount: count });
    }
    if (url.includes('/notifications?')) return response({ items: inbox, nextCursor: null });
    if (url.endsWith('/api/notifications') && options.method === 'DELETE') {
      if (failClear) return response({ message: 'Falha sintética de limpeza' }, 503);
      inbox = [];
      count = 0;
      return response(null, 204);
    }
    if (url.endsWith('/unread-count')) return response({ unreadCount: 0 });
    if (url.endsWith('/read')) return failRead
      ? response({ message: 'Falha sintética de leitura' }, 503)
      : response({ ...notice, readAt: '2026-01-01T00:01:00Z' });
    return response(null, 204);
  });
  jest.mocked(useRouter).mockReturnValue({
    push, back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), replace: jest.fn(),
    dismiss: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn(), canDismiss: () => false,
    setParams: jest.fn(), reload: jest.fn(), prefetch: jest.fn(),
  });
  jest.mocked(Notifications.getPermissionsAsync).mockResolvedValue({
    status: Notifications.PermissionStatus.DENIED, granted: false, canAskAgain: true, expires: 'never',
  });
  await login(user.email, 'synthetic-password');
  mockFetch.mockClear();
});

  function InboxStatus() {
    const notifications = useNotifications();
    activeNotifications = notifications;
    return <View>
      <Text testID="notification-count">{notifications.unreadCount}</Text>
      <Text testID="notification-user">{notifications.userId}</Text>
      <Pressable accessibilityLabel="Atualizar contador"
        onPress={() => { void notifications.refresh(); }}><Text>Atualizar contador</Text></Pressable>
      <Pressable accessibilityLabel="Sincronizar contexto"
        onPress={() => { void notifications.synchronise(); }}><Text>Sincronizar contexto</Text></Pressable>
    </View>;
  }

  function deferredResponse() {
    let resolve!: (value: Response) => void;
    const promise = new Promise<Response>((done) => { resolve = done; });
    return { promise, resolve };
  }

  test('limpeza pede confirmação; cancelar não chama a API; sucesso esvazia e novos eventos continuam', async () => {
    const screen = await render(<NotificationProvider><InboxStatus />
      <NotificationsModal visible onClose={() => {}} /></NotificationProvider>);
    await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Limpar notificações'));
    expect(screen.getByText('Limpar todas as suas notificações? Você continuará recebendo novos avisos.')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Cancelar limpeza'));
    expect(mockFetch.mock.calls.some(([url]) => url.endsWith('/api/notifications'))).toBe(false);
    await fireEvent.press(screen.getByLabelText('Limpar notificações'));
    await fireEvent.press(screen.getByLabelText('Confirmar limpeza'));
    await waitFor(() => expect(screen.getByText('Nenhuma notificação ainda')).toBeTruthy());
    expect(screen.getByTestId('notification-count').props.children).toBe(0);
    expect(screen.getByLabelText('Limpar notificações').props.accessibilityState.disabled).toBe(true);
    inbox = [{ ...notice, id: 'fresh', sightingId: 'fresh', title: 'Novo aviso após limpeza' }];
    count = 1;
    const listener = jest.mocked(Notifications.addNotificationReceivedListener).mock.calls[0][0];
    mockFetch.mockImplementationOnce(async () => response({ unreadCount: 1 }));
    await act(async () => { listener({} as Notifications.Notification); });
    await waitFor(() => expect(screen.getByLabelText('Não lida: Novo aviso após limpeza')).toBeTruthy());
    expect(screen.getByTestId('notification-count').props.children).toBe(1);
  });

  test('falha conserva caixa e contador; retry conserva chave; loading impede leitura e confirmação dupla', async () => {
    failClear = true;
    const screen = await render(<NotificationProvider><InboxStatus />
      <NotificationsModal visible onClose={() => {}} /></NotificationProvider>);
    await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
    await fireEvent.press(screen.getByLabelText('Limpar notificações'));
    await fireEvent.press(screen.getByLabelText('Confirmar limpeza'));
    await waitFor(() => expect(screen.getByText('Falha sintética de limpeza')).toBeTruthy());
    expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy();
    expect(screen.getByTestId('notification-count').props.children).toBe(1);
    const pending = deferredResponse();
    const handler = mockFetch.getMockImplementation()!;
    mockFetch.mockImplementation((url: string, options: RequestInit) =>
      url.endsWith('/api/notifications') ? pending.promise : handler(url, options));
    await fireEvent.press(screen.getByLabelText('Confirmar limpeza'));
    expect(screen.getByText('Limpando notificações...')).toBeTruthy();
    expect(screen.getByLabelText('Confirmar limpeza').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByLabelText('Confirmar limpeza'));
    await fireEvent.press(screen.getByLabelText('Não lida: Novo avistamento registrado'));
    expect(push).not.toHaveBeenCalled();
    const deletes = mockFetch.mock.calls.filter(([url]) => url.endsWith('/api/notifications'));
    expect(deletes).toHaveLength(2);
    expect(deletes[0][1].headers['Idempotency-Key']).toBe(deletes[1][1].headers['Idempotency-Key']);
    inbox = [];
    await act(async () => { pending.resolve(response(null, 204)); });
    await waitFor(() => expect(screen.getByText('Nenhuma notificação ainda')).toBeTruthy());
  });

  test('respostas antigas de listagem, refresh e sincronização não repovoam a caixa após limpar', async () => {
    const screen = await render(<NotificationProvider><InboxStatus />
      <NotificationsModal visible onClose={() => {}} /></NotificationProvider>);
    await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
    await waitFor(() => expect(Notifications.getPermissionsAsync).toHaveBeenCalled());
    await fireEvent.press(screen.getByLabelText('Limpar notificações'));
    const staleCount = deferredResponse();
    const staleSubscription = deferredResponse();
    const stalePage = deferredResponse();
    const handler = mockFetch.getMockImplementation()!;
    let capturePage = true;
    let captureCount = true;
    let captureSubscription = true;
    mockFetch.mockImplementation((url: string, options: RequestInit) => {
      if (captureCount && url.endsWith('/unread-count')) { captureCount = false; return staleCount.promise; }
      if (captureSubscription && url.endsWith('/notification-subscriptions')) {
        captureSubscription = false; return staleSubscription.promise;
      }
      if (capturePage && url.includes('/notifications?')) { capturePage = false; return stalePage.promise; }
      return handler(url, options);
    });
    await fireEvent.press(screen.getByLabelText('Atualizar contador'));
    await fireEvent.press(screen.getByLabelText('Sincronizar contexto'));
    const listener = jest.mocked(Notifications.addNotificationReceivedListener).mock.calls[0][0];
    await act(async () => { listener({} as Notifications.Notification); });
    await waitFor(() => expect(capturePage).toBe(false));
    expect(screen.getByLabelText('Limpar notificações').props.accessibilityState.disabled).toBe(true);
    await fireEvent.press(screen.getByLabelText('Confirmar limpeza'));
    await waitFor(() => expect(screen.getByText('Nenhuma notificação ainda')).toBeTruthy());
    await act(async () => {
      staleCount.resolve(response({ unreadCount: 99 }));
      staleSubscription.resolve(response({ startedAt: '', pushEnabled: true, unreadCount: 99 }));
      stalePage.resolve(response({ items: [notice], nextCursor: 'stale-cursor' }));
    });
    expect(screen.queryByLabelText('Não lida: Novo avistamento registrado')).toBeNull();
    expect(screen.getByTestId('notification-count').props.children).toBe(0);
  });

  test('resposta de limpeza da conta anterior não apaga avisos da nova sessão', async () => {
    const screen = await render(<NotificationProvider><InboxStatus />
      <NotificationsModal visible onClose={() => {}} /></NotificationProvider>);
    await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
    const pending = deferredResponse();
    const handler = mockFetch.getMockImplementation()!;
    mockFetch.mockImplementation((url: string, options: RequestInit) =>
      url.endsWith('/api/notifications') ? pending.promise : handler(url, options));
    await fireEvent.press(screen.getByLabelText('Limpar notificações'));
    await fireEvent.press(screen.getByLabelText('Confirmar limpeza'));
    loginUser = { ...user, id: 'user-b', name: 'Bob' };
    inbox = [{ ...notice, id: 'bob-notice', title: 'Aviso de Bob' }];
    await act(async () => { await login('bob@example.test', 'synthetic-password'); });
    await waitFor(() => expect(screen.getByLabelText('Não lida: Aviso de Bob')).toBeTruthy());
    await act(async () => { pending.resolve(response(null, 204)); });
    expect(screen.getByLabelText('Não lida: Aviso de Bob')).toBeTruthy();
    expect(screen.getByTestId('notification-count').props.children).toBe(1);
    expect(screen.getByTestId('notification-user').props.children).toBe('user-b');
  });

test('leitura iniciada antes da limpeza não confirma resultado nem altera contador da nova caixa', async () => {
  const screen = await render(<NotificationProvider><InboxStatus />
    <NotificationsModal visible onClose={() => {}} /></NotificationProvider>);
  await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
  const pending = deferredResponse();
  const handler = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url: string, options: RequestInit) =>
    url.endsWith('/read') ? pending.promise : handler(url, options));
  const reading = activeNotifications.read(notice.id).catch((failure) => failure);
  await fireEvent.press(screen.getByLabelText('Limpar notificações'));
  await fireEvent.press(screen.getByLabelText('Confirmar limpeza'));
  await waitFor(() => expect(screen.getByText('Nenhuma notificação ainda')).toBeTruthy());
  await act(async () => { pending.resolve(response({ ...notice, readAt: '2026-01-01T00:01:00Z' })); });
  expect(await reading).toEqual(new Error('A caixa mudou durante a leitura.'));
  expect(screen.getByTestId('notification-count').props.children).toBe(0);
  expect(screen.queryByLabelText('Não lida: Novo avistamento registrado')).toBeNull();
});

test('limpeza fica desabilitada durante uma leitura da caixa', async () => {
  const screen = await render(<NotificationProvider><NotificationsModal visible onClose={() => {}} /></NotificationProvider>);
  await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
  const pending = deferredResponse();
  const handler = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url: string, options: RequestInit) =>
    url.endsWith('/read') ? pending.promise : handler(url, options));
  await fireEvent.press(screen.getByLabelText('Não lida: Novo avistamento registrado'));
  expect(screen.getByLabelText('Limpar notificações').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByLabelText('Limpar notificações'));
  expect(screen.queryByLabelText('Confirmar limpeza')).toBeNull();
  await act(async () => { pending.resolve(response({ ...notice, readAt: '2026-01-01T00:01:00Z' })); });
  await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  expect(mockFetch.mock.calls.some(([url]) => url.endsWith('/api/notifications'))).toBe(false);
});

test('resposta antiga também é ignorada após renovar sessão da mesma conta', async () => {
  const screen = await render(<NotificationProvider><InboxStatus />
    <NotificationsModal visible onClose={() => {}} /></NotificationProvider>);
  await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
  const pending = deferredResponse();
  const handler = mockFetch.getMockImplementation()!;
  mockFetch.mockImplementation((url: string, options: RequestInit) =>
    url.endsWith('/api/notifications') ? pending.promise : handler(url, options));
  await fireEvent.press(screen.getByLabelText('Limpar notificações'));
  await fireEvent.press(screen.getByLabelText('Confirmar limpeza'));
  inbox = [{ ...notice, id: 'session-notice', title: 'Aviso na sessão renovada' }];
  await act(async () => { await login(user.email, 'synthetic-password'); });
  await waitFor(() => expect(screen.getByLabelText('Não lida: Aviso na sessão renovada')).toBeTruthy());
  await act(async () => { pending.resolve(response(null, 204)); });
  expect(screen.getByLabelText('Não lida: Aviso na sessão renovada')).toBeTruthy();
  expect(screen.queryByText('A conta mudou durante a limpeza.')).toBeNull();
  expect(screen.getByTestId('notification-count').props.children).toBe(1);
});

afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

test('histórico funciona sem push; abrir lista não marca e tocar confirma leitura antes de navegar', async () => {
  const onClose = jest.fn();
  const screen = await render(<NotificationProvider><NotificationsModal visible onClose={onClose} /></NotificationProvider>);
  await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(mockFetch.mock.calls.some(([url]) => url.endsWith('/read'))).toBe(false);
  await fireEvent.press(screen.getByLabelText('Não lida: Novo avistamento registrado'));
  await waitFor(() => expect(push).toHaveBeenCalledWith({ pathname: '/sightings/[id]', params: { id: 'sighting-1' } }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('falha ao marcar leitura é explícita e não navega nem confirma sucesso', async () => {
  failRead = true;
  const onClose = jest.fn();
  const screen = await render(<NotificationProvider><NotificationsModal visible onClose={onClose} /></NotificationProvider>);
  await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Não lida: Novo avistamento registrado'));
  await waitFor(() => expect(screen.getByText('Falha sintética de leitura')).toBeTruthy());
  expect(push).not.toHaveBeenCalled();
  expect(onClose).not.toHaveBeenCalled();
});

test('Expo Go mantém histórico e preferência, explica a limitação e não tenta cadastrar push', async () => {
  jest.mocked(isRunningInExpoGo).mockReturnValue(true);
  const screen = await render(<NotificationProvider>
    <SettingsModal visible user={user} onClose={() => {}}
      onEdit={() => {}} onAbout={() => {}} onLogout={() => {}} loggingOut={false} />
    <NotificationsModal visible onClose={() => {}} />
  </NotificationProvider>);
  await waitFor(() => expect(screen.getByText('Push exige uma build própria do app; não funciona no Expo Go.')).toBeTruthy());
  await waitFor(() => expect(screen.getByLabelText('Não lida: Novo avistamento registrado')).toBeTruthy());
  await fireEvent(screen.getByLabelText('Push de novos avistamentos'), 'change', { nativeEvent: { value: false } });
  await waitFor(() => expect(pushEnabled).toBe(false));
  await fireEvent.press(screen.getByText('Sincronizar alertas'));
  expect(Notifications.getPermissionsAsync).not.toHaveBeenCalled();
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  expect(Notifications.getDevicePushTokenAsync).not.toHaveBeenCalled();
  expect(Notifications.addNotificationReceivedListener).not.toHaveBeenCalled();
  expect(Notifications.addPushTokenListener).not.toHaveBeenCalled();
  expect(mockFetch.mock.calls.some(([url]) => url.includes('/notification-devices/'))).toBe(false);
});

test('preferência confirma no backend e permissão Android só é solicitada após ação explicativa', async () => {
  const screen = await render(<NotificationProvider><SettingsModal visible user={user} onClose={() => {}}
    onEdit={() => {}} onAbout={() => {}} onLogout={() => {}} loggingOut={false} /></NotificationProvider>);
  await waitFor(() => expect(screen.getByLabelText('Push de novos avistamentos').props.enabled).toBe(true));
  await fireEvent(screen.getByLabelText('Push de novos avistamentos'), 'change', { nativeEvent: { value: false } });
  await waitFor(() => expect(screen.getByLabelText('Push de novos avistamentos').props.on).toBe(false));
  expect(pushEnabled).toBe(false);
  expect(Notifications.requestPermissionsAsync).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('Sincronizar alertas'));
  await waitFor(() => expect(screen.getByText('Este dispositivo está registrado.')).toBeTruthy());
  expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('sightings', expect.any(Object));
  expect(Notifications.getDevicePushTokenAsync).toHaveBeenCalled();
  expect(mockFetch.mock.calls.some(([url, options]) => url.includes('/notification-devices/') && options.method === 'PUT')).toBe(true);
});
