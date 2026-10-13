import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import { login } from '../services/auth';
import { NotificationProvider } from '../services/notification-context';
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
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url: string, options: RequestInit) => {
    if (url.endsWith('/api/auth/login')) return response({ token, user });
    if (url.endsWith('/notification-subscriptions') || url.endsWith('/notification-preferences')) {
      if (options.method === 'PUT') pushEnabled = JSON.parse(String(options.body)).pushEnabled;
      return response({ startedAt: '2026-01-01T00:00:00Z', pushEnabled, unreadCount: 1 });
    }
    if (url.includes('/notifications?')) return response({ items: [notice], nextCursor: null });
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
