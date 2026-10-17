import { useEffect, useRef, useState } from 'react';
import { Alert, FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';
import { useNotifications } from '../services/notification-context';
import { NotificationItem, notificationError } from '../services/notifications';
import ScreenHeader from './ScreenHeader';
import ScreenState from './ScreenState';

export default function NotificationsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const notifications = useNotifications();
  const router = useRouter();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const clearKey = useRef<string | null>(null);
  const clearInFlight = useRef(false);
  const request = useRef(0);
  const context = useRef(notifications);
  context.current = notifications;
  const busy = useRef(false);
  const account = useRef(notifications.userId);
  const sessionRevision = useRef(notifications.sessionRevision);
  const accountVersion = useRef(0);
  if (account.current !== notifications.userId || sessionRevision.current !== notifications.sessionRevision) {
    accountVersion.current++;
  }
  account.current = notifications.userId;
  sessionRevision.current = notifications.sessionRevision;

  const load = async (next?: string | null) => {
    if (clearInFlight.current) return;
    if (busy.current && next) return;
    busy.current = true;
    const version = ++request.current;
    const owner = account.current;
    setLoading(true);
    try {
      const page = await context.current.list(next);
      if (version !== request.current || owner !== account.current) return;
      setItems((old) => {
        const merged = new Map((next ? old : []).map((item) => [item.id, item]));
        page.items.forEach((item) => merged.set(item.id, item));
        return [...merged.values()];
      });
      setCursor(page.nextCursor);
      setError(null);
    } catch (failure) {
      if (version === request.current && owner === account.current) setError(notificationError(failure));
    } finally {
      if (version === request.current) {
        busy.current = false;
        setLoading(false);
        setHasLoaded(true);
      }
    }
  };

  useEffect(() => {
    request.current++;
    setItems([]);
    setCursor(null);
    setError(null);
    setClearing(false);
    setReading(false);
    setLoading(false);
    setHasLoaded(false);
    busy.current = false;
    clearInFlight.current = false;
    clearKey.current = null;
  }, [notifications.userId, notifications.sessionRevision]);

  useEffect(() => {
    if (visible && notifications.userId) {
      setHasLoaded(false);
      void load();
    }
    return () => { request.current++; };
  }, [visible, notifications.userId, notifications.sessionRevision, notifications.inboxRevision]);

  const select = async (item: NotificationItem) => {
    if (reading || clearInFlight.current) return;
    const owner = account.current;
    const version = accountVersion.current;
    setReading(true);
    try {
      await notifications.read(item.id);
      if (owner !== account.current || version !== accountVersion.current) return;
      onClose();
      router.push({ pathname: '/sightings/[id]', params: { id: item.sightingId } });
    } catch (failure) {
      if (owner === account.current && version === accountVersion.current) setError(notificationError(failure));
    } finally { if (version === accountVersion.current) setReading(false); }
  };

  const clear = async () => {
    if (clearInFlight.current || reading) return;
    clearInFlight.current = true;
    const owner = account.current;
    const version = accountVersion.current;
    clearKey.current ??= randomUUID();
    request.current++;
    busy.current = false;
    setLoading(false);
    setClearing(true);
    try {
      await context.current.clear(clearKey.current);
      if (owner !== account.current || version !== accountVersion.current) return;
      request.current++;
      setItems([]);
      setCursor(null);
      setError(null);
      clearKey.current = null;
    } catch (failure) {
      if (owner === account.current && version === accountVersion.current) setError(notificationError(failure));
    } finally {
      if (owner === account.current && version === accountVersion.current) {
        clearInFlight.current = false;
        setClearing(false);
      }
    }
    if (owner === account.current && version === accountVersion.current && clearKey.current === null) void load();
  };

  const confirmClear = () => {
    if (clearing || reading || loading || items.length === 0) return;

    Alert.alert(
      'Limpar notificações?',
      'Todas as notificações atuais serão removidas. Novos avisos continuarão chegando.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Limpar', style: 'destructive', onPress: () => void clear() },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader
          title="Notificações"
          onBack={onClose}
          actions={
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Limpar notificações"
              accessibilityState={{ disabled: clearing || reading || loading || items.length === 0, busy: clearing }}
              disabled={clearing || reading || loading || items.length === 0}
              onPress={confirmClear}
              style={({ pressed }) => [styles.clearButton, (pressed || clearing) && styles.pressed]}
            >
              <Ionicons name="trash-outline" size={19} color={theme.colors.danger} />
              <Text style={styles.clearButtonText}>{clearing ? 'Limpando...' : 'Limpar'}</Text>
            </Pressable>
          }
        />
        {error && <ScreenState title="Não foi possível atualizar" message={error} actionLabel="Tentar novamente" onAction={() => void load()} />}
        <FlatList
          data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.readAt ? 'Lida' : 'Não lida'}: ${item.title}`}
              disabled={reading || clearing} onPress={() => void select(item)} style={styles.card}>
              <Text style={[styles.title, !item.readAt && styles.unread]}>{item.title}</Text>
              <Text style={styles.text}>{item.body}</Text>
              <Text style={styles.text}>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
            </Pressable>
          )}
          ListEmptyComponent={!error ? <ScreenState loading={loading || !hasLoaded}
            title={loading || !hasLoaded ? 'Carregando notificações...' : 'Nenhuma notificação ainda'}
            message={loading || !hasLoaded ? undefined : 'Novos avistamentos aparecerão aqui após sua participação.'} /> : null}
          ListFooterComponent={cursor ? <Pressable accessibilityRole="button" disabled={loading || clearing}
            onPress={() => void load(cursor)} style={styles.card}><Text style={styles.title}>
              {loading ? 'Carregando...' : 'Carregar mais'}
            </Text></Pressable> : null}
        />
      </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  card: { minHeight: theme.touchTarget, padding: theme.spacing.md, gap: theme.spacing.sm, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg },
  clearButton: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.xs, paddingHorizontal: theme.spacing.sm },
  clearButtonText: { color: theme.colors.danger, fontSize: theme.fonts.sizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.65 },
  title: { fontSize: theme.fonts.sizes.md, color: theme.colors.textPrimary },
  unread: { fontWeight: '700' },
  text: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
});
