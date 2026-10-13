import { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { randomUUID } from 'expo-crypto';
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
  const [error, setError] = useState<string | null>(null);
  const [reading, setReading] = useState(false);
  const [confirming, setConfirming] = useState(false);
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
      if (version === request.current) { busy.current = false; setLoading(false); }
    }
  };

  useEffect(() => {
    request.current++;
    setItems([]);
    setCursor(null);
    setError(null);
    setConfirming(false);
    setClearing(false);
    setReading(false);
    setLoading(false);
    busy.current = false;
    clearInFlight.current = false;
    clearKey.current = null;
  }, [notifications.userId, notifications.sessionRevision]);

  useEffect(() => {
    if (visible && notifications.userId) void load();
    return () => { request.current++; };
  }, [visible, notifications.userId, notifications.sessionRevision, notifications.revision]);

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
      setConfirming(false);
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

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader title="Notificações" onBack={onClose} />
        <Pressable accessibilityRole="button" accessibilityLabel="Limpar notificações"
          accessibilityState={{ disabled: clearing || reading || loading || items.length === 0, busy: clearing }}
          disabled={clearing || reading || loading || items.length === 0}
          onPress={() => setConfirming(true)} style={styles.card}>
          <Text style={styles.title}>{clearing ? 'Limpando notificações...' : 'Limpar notificações'}</Text>
        </Pressable>
        {confirming && <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.title}>Limpar todas as suas notificações? Você continuará recebendo novos avisos.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="Confirmar limpeza" disabled={clearing}
            accessibilityState={{ disabled: clearing, busy: clearing }} onPress={() => void clear()} style={styles.action}>
            <Text style={styles.title}>{clearing ? 'Limpando...' : 'Confirmar limpeza'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Cancelar limpeza" disabled={clearing}
            onPress={() => { setConfirming(false); clearKey.current = null; }} style={styles.action}>
            <Text style={styles.title}>Cancelar</Text>
          </Pressable>
        </View>}
        {error && <ScreenState title="Não foi possível atualizar" message={error} actionLabel="Tentar novamente" onAction={() => void load()} />}
        <FlatList
          data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.readAt ? 'Lida' : 'Não lida'}: ${item.title}`}
              disabled={reading || clearing || confirming} onPress={() => void select(item)} style={styles.card}>
              <Text style={[styles.title, !item.readAt && styles.unread]}>{item.title}</Text>
              <Text style={styles.text}>{item.body}</Text>
              <Text style={styles.text}>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
            </Pressable>
          )}
          ListEmptyComponent={!error ? <ScreenState loading={loading}
            title={loading ? 'Carregando notificações...' : 'Nenhuma notificação ainda'}
            message={loading ? undefined : 'Novos avistamentos aparecerão aqui após sua participação.'} /> : null}
          ListFooterComponent={cursor ? <Pressable accessibilityRole="button" disabled={loading || clearing || confirming}
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
  action: { minHeight: theme.touchTarget, justifyContent: 'center' },
  title: { fontSize: theme.fonts.sizes.md, color: theme.colors.textPrimary },
  unread: { fontWeight: '700' },
  text: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
});
