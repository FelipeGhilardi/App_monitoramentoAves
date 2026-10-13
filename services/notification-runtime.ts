import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

export function notificationSupport(): 'supported' | 'expo-go' | 'unsupported' {
  if (Platform.OS !== 'android') return 'unsupported';
  return isRunningInExpoGo() ? 'expo-go' : 'supported';
}

export function nativeNotifications(): typeof import('expo-notifications') | null {
  if (notificationSupport() !== 'supported') return null;
  return require('expo-notifications');
}
