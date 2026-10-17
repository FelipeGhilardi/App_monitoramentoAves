import { useEffect, useRef } from 'react';
import { useRootNavigationState, useRouter } from 'expo-router';
import type { NotificationResponse } from 'expo-notifications';
import { useNotifications } from '../services/notification-context';
import { notificationDestination } from '../services/notifications';
import { nativeNotifications } from '../services/notification-runtime';

export default function NotificationNavigation() {
  const router = useRouter();
  const navigation = useRootNavigationState();
  const context = useNotifications();
  const Notifications = nativeNotifications();
  const current = useRef(context);
  current.current = context;
  const pending = useRef<NotificationResponse | null>(null);
  const handled = useRef(new Set<string>());
  const running = useRef(false);
  const ready = useRef(false);
  ready.current = Boolean(navigation?.key);
  const process = useRef<() => Promise<void>>(async () => {});

  process.current = async () => {
    const response = pending.current;
    if (!Notifications || !response || !current.current.userId || !ready.current || running.current) return;
    const key = response.notification.request.identifier;
    if (handled.current.has(key)) { pending.current = null; return; }
    running.current = true;
    try {
      const target = notificationDestination(response.notification.request.content.data);
      if (target.userId !== current.current.userId) {
        throw new Error('Esta notificação pertence a outra conta.');
      }
      await current.current.read(target.notificationId);
      if (target.userId !== current.current.userId) return;
      handled.current.add(key);
      pending.current = null;
      await Notifications.clearLastNotificationResponseAsync();
      router.push({ pathname: '/sightings/[id]', params: { id: target.sightingId } });
    } catch (failure) {
      pending.current = null;
      current.current.reportError(failure);
    } finally { running.current = false; }
  };

  useEffect(() => {
    if (!Notifications) return;
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true, shouldSetBadge: false, shouldShowBanner: true, shouldShowList: true,
      }),
    });
    let alive = true;
    const receive = (response: NotificationResponse) => {
      if (!alive) return;
      pending.current = response;
      void process.current();
    };
    const listener = Notifications.addNotificationResponseReceivedListener(receive);
    void Notifications.getLastNotificationResponseAsync()
      .then((response) => { if (response) receive(response); })
      .catch((failure: unknown) => current.current.reportError(failure));
    return () => { alive = false; listener.remove(); };
  }, [Notifications]);

  useEffect(() => { void process.current(); }, [context.userId, navigation?.key]);
  return null;
}
