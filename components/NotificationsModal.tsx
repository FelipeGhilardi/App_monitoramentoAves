import { useEffect, useRef, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
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
  const request = useRef(0);
  const context = useRef(notifications);
  context.current = notifications;
  const busy = useRef(false);
  const account = useRef(notifications.userId);
  account.current = notifications.userId;

  const load = async (next?: string | null) => {
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
  }, [notifications.userId]);

  useEffect(() => {
    if (visible && notifications.userId) void load();
    return () => { request.current++; };
  }, [visible, notifications.userId, notifications.revision]);

  const select = async (item: NotificationItem) => {
    if (reading) return;
    const owner = account.current;
    setReading(true);
    try {
      await notifications.read(item.id);
      if (owner !== account.current) return;
      onClose();
      router.push({ pathname: '/sightings/[id]', params: { id: item.sightingId } });
    } catch (failure) {
      if (owner === account.current) setError(notificationError(failure));
    } finally { setReading(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider style={styles.container}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader title="Notificações" onBack={onClose} />
        {error && <ScreenState title="Não foi possível atualizar" message={error} actionLabel="Tentar novamente" onAction={() => void load()} />}
        <FlatList
          data={items} keyExtractor={(item) => item.id} contentContainerStyle={styles.content}
          renderItem={({ item }) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`${item.readAt ? 'Lida' : 'Não lida'}: ${item.title}`}
              disabled={reading} onPress={() => void select(item)} style={styles.card}>
              <Text style={[styles.title, !item.readAt && styles.unread]}>{item.title}</Text>
              <Text style={styles.text}>{item.body}</Text>
              <Text style={styles.text}>{new Date(item.createdAt).toLocaleString('pt-BR')}</Text>
            </Pressable>
          )}
          ListEmptyComponent={!error ? <ScreenState loading={loading}
            title={loading ? 'Carregando notificações...' : 'Nenhuma notificação ainda'}
            message={loading ? undefined : 'Novos avistamentos aparecerão aqui após sua participação.'} /> : null}
          ListFooterComponent={cursor ? <Pressable accessibilityRole="button" disabled={loading}
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
  title: { fontSize: theme.fonts.sizes.md, color: theme.colors.textPrimary },
  unread: { fontWeight: '700' },
  text: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
});
