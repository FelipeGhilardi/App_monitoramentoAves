import { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { AppState } from 'react-native';
import { getToken } from './api';
import { expireSession, getCurrentUser, isLoggedIn } from './auth';
import { deactivateNotificationDevice, registerNotificationDevice } from './notification-device';
import { nativeNotifications, notificationSupport } from './notification-runtime';
import { onSessionChange } from './session-events';
import {
  fetchNotifications, fetchUnreadCount, NotificationItem, NotificationPage, NotificationPreferences,
  notificationError, readNotification, saveNotificationPreference, subscribeNotifications,
} from './notifications';

interface NotificationContextValue {
  userId: string | null;
  preferences: NotificationPreferences | null;
  unreadCount: number;
  permission: string;
  registered: boolean;
  busy: boolean;
  error: string | null;
  revision: number;
  synchronise: (requestPermission?: boolean) => Promise<void>;
  setPushEnabled: (enabled: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  list: (cursor?: string | null) => Promise<NotificationPage>;
  read: (id: string) => Promise<NotificationItem>;
  reportError: (error: unknown) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [permission, setPermission] = useState('unknown');
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const epoch = useRef(0);
  const session = useRef<{ token: string; userId: string } | null>(null);
  const syncing = useRef(false);
  const resync = useRef(false);
  const pendingPermissionRequest = useRef(false);
  const alive = useRef(true);

  const reportError = useCallback((failure: unknown) => { setError(notificationError(failure)); }, []);

  const refresh = useCallback(async () => {
    const current = session.current;
    const version = epoch.current;
    if (!current) return;
    const result = await fetchUnreadCount(current.token);
    if (epoch.current === version && session.current === current) {
      setUnreadCount(result.unreadCount);
      setRevision((value) => value + 1);
    }
  }, []);

  const synchronise = useCallback(async (requestPermission = false): Promise<void> => {
    if (!alive.current) return;
    if (syncing.current) {
      resync.current = true;
      pendingPermissionRequest.current ||= requestPermission;
      return;
    }
    syncing.current = true;
    const version = epoch.current;
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) return;
      if (!await isLoggedIn()) return;
      const user = await getCurrentUser();
      if (!user) throw new Error('Não foi possível identificar a conta para notificações.');
      if (version !== epoch.current) return;
      const current = session.current?.token === token && session.current.userId === user.id
        ? session.current : { token, userId: user.id };
      session.current = current;
      setUserId(user.id);
      const subscribed = await subscribeNotifications(token);
      if (version !== epoch.current) return;
      setPreferences(subscribed);
      setUnreadCount(subscribed.unreadCount);
      setError(null);
      setRevision((value) => value + 1);
      const Notifications = nativeNotifications();
      if (!Notifications) {
        setPermission(notificationSupport());
        setRegistered(false);
        return;
      }
      await Notifications.setNotificationChannelAsync('sightings', {
        name: 'Novos avistamentos', importance: Notifications.AndroidImportance.HIGH, sound: 'default',
      });
      let permissions = await Notifications.getPermissionsAsync();
      if (version !== epoch.current) return;
      if (requestPermission && !permissions.granted && permissions.canAskAgain) {
        permissions = await Notifications.requestPermissionsAsync();
      }
      if (version !== epoch.current) return;
      setPermission(permissions.status);
      if (!permissions.granted) {
        await deactivateNotificationDevice(token);
        if (version === epoch.current) setRegistered(false);
        return;
      }
      const deviceToken = await Notifications.getDevicePushTokenAsync();
      if (version !== epoch.current) return;
      if (deviceToken.type !== 'android' || typeof deviceToken.data !== 'string') {
        throw new Error('Token Android indisponível. Use uma build própria, não o Expo Go.');
      }
      await registerNotificationDevice(token, user.id, deviceToken.data);
      if (version === epoch.current) setRegistered(true);
    } catch (failure) {
      if (version !== epoch.current) return;
      if (failure && typeof failure === 'object' && 'status' in failure && failure.status === 401) {
        await expireSession();
        setError('Sessão expirada. Entre novamente para reconciliar o dispositivo de notificações.');
      } else reportError(failure);
    } finally {
      syncing.current = false;
      setBusy(false);
      if (resync.current && alive.current) {
        const request = pendingPermissionRequest.current;
        resync.current = false;
        pendingPermissionRequest.current = false;
        queueMicrotask(() => { void synchronise(request); });
      }
    }
  }, [reportError]);

  useEffect(() => {
    let mounted = true;
    alive.current = true;
    const run = () => { if (mounted) void synchronise(false); };
    const off = onSessionChange(() => {
      epoch.current++;
      session.current = null;
      pendingPermissionRequest.current = false;
      setUserId(null);
      setPreferences(null);
      setUnreadCount(0);
      setRegistered(false);
      setPermission('unknown');
      setError(null);
      setRevision((value) => value + 1);
      // Let any old synchronisation unwind before starting the new account.
      setTimeout(run, 0);
    });
    const state = AppState.addEventListener('change', (value) => { if (value === 'active') run(); });
    const notifications = nativeNotifications();
    const received = notifications?.addNotificationReceivedListener(() => { void refresh().catch(reportError); });
    const tokenChange = notifications?.addPushTokenListener(run);
    run();
    return () => {
      mounted = false;
      alive.current = false;
      epoch.current++;
      session.current = null;
      off();
      state.remove();
      received?.remove();
      tokenChange?.remove();
    };
  }, [refresh, reportError, synchronise]);

  const requireSession = () => {
    if (!session.current) throw new Error('Entre na sua conta para acessar as notificações.');
    return session.current;
  };

  const list = async (cursor?: string | null) => {
    const current = requireSession();
    const page = await fetchNotifications(current.token, cursor);
    if (session.current !== current) throw new Error('A conta mudou durante a consulta.');
    return page;
  };

  const read = async (id: string) => {
    const current = requireSession();
    const item = await readNotification(current.token, id);
    if (session.current !== current) throw new Error('A conta mudou durante a leitura.');
    await refresh();
    return item;
  };

  const setPushEnabled = async (enabled: boolean) => {
    const current = requireSession();
    setBusy(true);
    try {
      const saved = await saveNotificationPreference(current.token, enabled);
      if (session.current === current) { setPreferences(saved); setError(null); }
    } catch (failure) {
      if (session.current === current) reportError(failure);
    } finally { setBusy(false); }
  };

  return (
    <NotificationContext.Provider value={{
      userId, preferences, unreadCount, permission, registered, busy, error, revision,
      synchronise, setPushEnabled, refresh, list, read, reportError,
    }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications(): NotificationContextValue {
  const context = useContext(NotificationContext);
  if (!context) throw new Error('NotificationProvider ausente.');
  return context;
}
