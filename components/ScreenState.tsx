import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface Props {
  title: string;
  message?: string;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  actionLabel?: string;
  onAction?: () => void;
}

export default function ScreenState({ title, message, loading, icon = 'leaf-outline', actionLabel, onAction }: Props) {
  return (
    <View style={styles.container} accessibilityLiveRegion="polite">
      {loading ? <ActivityIndicator color={theme.colors.primary} /> : (
        <View style={styles.icon}><Ionicons name={icon} size={30} color={theme.colors.primary} /></View>
      )}
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
      {actionLabel && onAction && (
        <Pressable accessibilityRole="button" onPress={onAction} style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}>
          <Text style={styles.actionText}>{actionLabel}</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: theme.spacing.lg, alignItems: 'center', gap: theme.spacing.sm,
  },
  icon: { backgroundColor: theme.colors.infoSurface, padding: theme.spacing.md, borderRadius: theme.radius.full },
  title: { fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.textPrimary, textAlign: 'center' },
  message: { fontSize: theme.fonts.sizes.sm, lineHeight: 21, color: theme.colors.textSecondary, textAlign: 'center' },
  action: {
    minHeight: theme.touchTarget, justifyContent: 'center', alignItems: 'center',
    backgroundColor: theme.colors.primary, borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, marginTop: theme.spacing.sm,
  },
  actionText: { color: theme.colors.textLight, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
});
