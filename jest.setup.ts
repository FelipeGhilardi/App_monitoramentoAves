jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('@expo/vector-icons', () => ({
  Ionicons: () => null,
}));

jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => '11111111-1111-4111-8111-111111111111'),
}));

jest.mock('expo', () => ({
  ...jest.requireActual('expo'),
  isRunningInExpoGo: jest.fn(() => false),
}));

jest.mock('expo-notifications', () => ({
  AndroidImportance: { HIGH: 4 },
  PermissionStatus: { DENIED: 'denied', GRANTED: 'granted', UNDETERMINED: 'undetermined' },
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  getPermissionsAsync: jest.fn(async () => ({ status: 'denied', granted: false, canAskAgain: true })),
  requestPermissionsAsync: jest.fn(async () => ({ status: 'granted', granted: true, canAskAgain: true })),
  getDevicePushTokenAsync: jest.fn(async () => ({ type: 'android', data: 'synthetic-token-1234567890' })),
  addNotificationReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addNotificationResponseReceivedListener: jest.fn(() => ({ remove: jest.fn() })),
  addPushTokenListener: jest.fn(() => ({ remove: jest.fn() })),
  getLastNotificationResponseAsync: jest.fn(async () => null),
  clearLastNotificationResponseAsync: jest.fn(async () => undefined),
  dismissAllNotificationsAsync: jest.fn(async () => undefined),
}));

jest.mock('expo-screen-orientation', () => ({
  OrientationLock: { LANDSCAPE: 'LANDSCAPE', PORTRAIT_UP: 'PORTRAIT_UP' },
  lockAsync: jest.fn(async () => undefined),
}));

jest.mock('react-native-safe-area-context', () =>
  jest.requireActual('react-native-safe-area-context/jest/mock').default
);
