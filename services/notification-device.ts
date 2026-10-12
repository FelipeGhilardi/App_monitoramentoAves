import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { randomUUID } from 'expo-crypto';
import { apiFetch } from './api';

const INSTALLATION_KEY = 'notificationInstallationId';
const OWNER_KEY = 'notificationDeviceOwner';
const PENDING_KEY = 'notificationDeviceDeactivationPending';
let installation: Promise<string> | null = null;
let operations: Promise<void> = Promise.resolve();
let lifecycleVersion = 0;
let leaving = false;

function serial<T>(operation: () => Promise<T>): Promise<T> {
  const result = operations.then(operation);
  operations = result.then(() => undefined, () => undefined);
  return result;
}

export function beginNotificationLogout(): void { leaving = true; lifecycleVersion++; }
export function endNotificationLogout(): void { leaving = false; }

export function installationId(): Promise<string> {
  if (!installation) {
    installation = (async () => {
      const existing = await AsyncStorage.getItem(INSTALLATION_KEY);
      if (existing) return existing;
      const id = randomUUID();
      await AsyncStorage.setItem(INSTALLATION_KEY, id);
      return id;
    })().catch((error: unknown) => {
      installation = null;
      throw error;
    });
  }
  return installation;
}

export async function registerNotificationDevice(sessionToken: string, userId: string, nativeToken: string): Promise<void> {
  const version = lifecycleVersion;
  return serial(async () => {
    if (leaving || version !== lifecycleVersion) throw new Error('Cadastro interrompido pela saída da conta.');
    const id = await installationId();
    // Record intent first: an accepted request with a lost response must still be deactivated on logout.
    await AsyncStorage.setItem(OWNER_KEY, userId);
    await apiFetch<void>(`/api/notification-devices/${id}`, {
      method: 'PUT', body: JSON.stringify({ token: nativeToken }),
    }, sessionToken);
    await AsyncStorage.removeItem(PENDING_KEY);
  });
}

export async function deactivateNotificationDevice(sessionToken: string): Promise<void> {
  return serial(async () => {
    if (!await AsyncStorage.getItem(OWNER_KEY)) return;
    const id = await installationId();
    await apiFetch<void>(`/api/notification-devices/${id}`, { method: 'DELETE' }, sessionToken);
    if (Platform.OS === 'android') {
      const notifications = await import('expo-notifications');
      await notifications.dismissAllNotificationsAsync();
    }
    await AsyncStorage.multiRemove([OWNER_KEY, PENDING_KEY]);
  });
}

export async function markDeviceDeactivationPending(): Promise<void> {
  return serial(async () => {
    if (await AsyncStorage.getItem(OWNER_KEY)) await AsyncStorage.setItem(PENDING_KEY, 'true');
  });
}

export async function hasPendingDeviceDeactivation(): Promise<boolean> {
  return await AsyncStorage.getItem(PENDING_KEY) === 'true';
}
