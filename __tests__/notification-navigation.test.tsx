import { act, render, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';
import NotificationNavigation from '../components/NotificationNavigation';
import { NotificationProvider } from '../services/notification-context';
import { login } from '../services/auth';

jest.mock('expo-router', () => ({ useRouter: jest.fn(), useRootNavigationState: jest.fn() }));
const push = jest.fn();
const token = `synthetic.${btoa(JSON.stringify({ exp: 4102444800 }))}.synthetic`;
const user = { id: 'user-a', name: 'Alice', email: 'alice@example.test', createdAt: '', updatedAt: '' };
const originalFetch = global.fetch;
const mockFetch = jest.fn();

function tapped(data: Record<string, unknown>): Notifications.NotificationResponse {
  return {
    actionIdentifier: 'default',
    notification: { date: 0, request: { identifier: 'synthetic-message-1', trigger: null,
      content: { title: null, subtitle: null, body: null, categoryIdentifier: null, sound: null, data } } },
  };
}

const destination = { sightingId: 'sighting-1', notificationId: 'sighting-1', userId: 'user-a' };
const response = (value: unknown): Response => ({ ok: true, status: 200, text: async () => JSON.stringify(value) } as Response);

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.replaceProperty(Platform, 'OS', 'android');
  jest.mocked(isRunningInExpoGo).mockReturnValue(false);
  global.fetch = mockFetch;
  mockFetch.mockReset();
  mockFetch.mockImplementation(async (url: string) => {
    if (url.endsWith('/api/auth/login')) return response({ token, user });
    if (url.endsWith('/notification-subscriptions')) return response({ startedAt: '', pushEnabled: true, unreadCount: 1 });
    if (url.endsWith('/read')) return response({ id: 'sighting-1', sightingId: 'sighting-1', readAt: '2026-01-01T00:00:00Z' });
    if (url.endsWith('/unread-count')) return response({ unreadCount: 0 });
    return response(null);
  });
  jest.mocked(useRouter).mockReturnValue({
    push, back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), replace: jest.fn(),
    dismiss: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn(), canDismiss: () => false,
    setParams: jest.fn(), reload: jest.fn(), prefetch: jest.fn(),
  });
  jest.mocked(useRootNavigationState).mockReturnValue({
    key: 'root', index: 0, routeNames: ['index'], routes: [{ key: 'index', name: 'index' }],
    type: 'stack', stale: false,
  });
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(null);
});

afterEach(() => { jest.restoreAllMocks(); global.fetch = originalFetch; });

test('Expo Go não instala handler nem consulta respostas nativas de push', async () => {
  jest.mocked(isRunningInExpoGo).mockReturnValue(true);
  await login(user.email, 'synthetic-password');
  await render(<NotificationProvider><NotificationNavigation /></NotificationProvider>);
  await waitFor(() => expect(mockFetch.mock.calls.some(([url]) => url.endsWith('/notification-subscriptions'))).toBe(true));
  expect(Notifications.setNotificationHandler).not.toHaveBeenCalled();
  expect(Notifications.addNotificationResponseReceivedListener).not.toHaveBeenCalled();
  expect(Notifications.getLastNotificationResponseAsync).not.toHaveBeenCalled();
  expect(push).not.toHaveBeenCalled();
});

test('abertura fria consome o toque uma vez e não duplica a resposta do listener', async () => {
  await login(user.email, 'synthetic-password');
  const event = tapped(destination);
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(event);
  await render(<NotificationProvider><NotificationNavigation /></NotificationProvider>);
  await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
  await act(async () => { listener(event); });
  expect(push).toHaveBeenCalledTimes(1);
  expect(push).toHaveBeenCalledWith({ pathname: '/sightings/[id]', params: { id: 'sighting-1' } });
  expect(Notifications.clearLastNotificationResponseAsync).toHaveBeenCalledTimes(1);
});

test('sem sessão válida o destino aguarda login e só então acessa o detalhe', async () => {
  jest.mocked(Notifications.getLastNotificationResponseAsync).mockResolvedValue(tapped(destination));
  await render(<NotificationProvider><NotificationNavigation /></NotificationProvider>);
  expect(push).not.toHaveBeenCalled();
  await act(async () => { await login(user.email, 'synthetic-password'); });
  await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
});

test('payload de outra conta ou URL arbitrária não navega nem marca a caixa atual', async () => {
  await login(user.email, 'synthetic-password');
  await render(<NotificationProvider><NotificationNavigation /></NotificationProvider>);
  await waitFor(() => expect(mockFetch.mock.calls.some(([url]) => url.endsWith('/notification-subscriptions'))).toBe(true));
  const listener = jest.mocked(Notifications.addNotificationResponseReceivedListener).mock.calls[0][0];
  for (const data of [{ ...destination, userId: 'user-b' }, { ...destination, sightingId: 'https://other.example' }]) {
    await act(async () => { listener(tapped(data)); });
  }
  expect(push).not.toHaveBeenCalled();
  expect(mockFetch.mock.calls.some(([url]) => url.endsWith('/read'))).toBe(false);
});
