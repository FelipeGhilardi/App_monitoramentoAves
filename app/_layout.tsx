import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ScreenOrientation from 'expo-screen-orientation';
import { NotificationProvider } from '../services/notification-context';
import NotificationNavigation from '../components/NotificationNavigation';

export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP)
      .catch((error: unknown) => console.warn('Não foi possível travar o app em retrato.', error));
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <NotificationProvider>
        <NotificationNavigation />
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="signup" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="sightings/index" />
          <Stack.Screen name="sightings/[id]" />
        </Stack>
        </NotificationProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}