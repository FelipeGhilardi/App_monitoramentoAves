const mockPlatform = { OS: 'android' };
let mockExpoGo = false;
const mockModuleLoaded = jest.fn();
const mockNotifications = { dismissAllNotificationsAsync: jest.fn() };

jest.mock('react-native', () => ({ Platform: mockPlatform }));
jest.mock('expo', () => ({ isRunningInExpoGo: () => mockExpoGo }));
jest.mock('expo-notifications', () => {
  mockModuleLoaded();
  return mockNotifications;
});

beforeEach(() => {
  mockPlatform.OS = 'android';
  mockExpoGo = false;
  mockModuleLoaded.mockClear();
});

test('Expo Go Android nunca carrega o módulo de notificações', () => {
  mockExpoGo = true;
  jest.isolateModules(() => {
    const runtime = require('../services/notification-runtime');
    expect(runtime.notificationSupport()).toBe('expo-go');
    expect(runtime.nativeNotifications()).toBeNull();
  });
  expect(mockModuleLoaded).not.toHaveBeenCalled();
});

test.each(['ios', 'web'])('%s mantém push indisponível sem carregar módulo nativo', (platform) => {
  mockPlatform.OS = platform;
  jest.isolateModules(() => {
    const runtime = require('../services/notification-runtime');
    expect(runtime.notificationSupport()).toBe('unsupported');
    expect(runtime.nativeNotifications()).toBeNull();
  });
  expect(mockModuleLoaded).not.toHaveBeenCalled();
});

test('build própria Android carrega o módulo e permite APIs nativas de notificações', () => {
  jest.isolateModules(() => {
    const runtime = require('../services/notification-runtime');
    expect(runtime.notificationSupport()).toBe('supported');
    expect(runtime.nativeNotifications()).toBe(mockNotifications);
  });
  expect(mockModuleLoaded).toHaveBeenCalledTimes(1);
});
