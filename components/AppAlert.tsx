import { Modal, View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';

export type AppAlertVariant = 'error' | 'success' | 'info';

interface AppAlertProps {
  visible: boolean;
  variant?: AppAlertVariant;
  title: string;
  message?: string;
  confirmLabel?: string;
  onClose: () => void;
}

const variantConfig: Record<
  AppAlertVariant,
  { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }
> = {
  error: { icon: 'alert-circle', color: theme.colors.danger, bg: theme.colors.dangerSurface },
  success: { icon: 'checkmark-circle', color: theme.colors.success, bg: theme.colors.successSurface },
  info: { icon: 'information-circle', color: theme.colors.primary, bg: theme.colors.infoSurface },
};

export default function AppAlert({
  visible,
  variant = 'error',
  title,
  message,
  confirmLabel = 'OK',
  onClose,
}: AppAlertProps) {
  const cfg = variantConfig[variant];
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={[styles.overlay, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.card}>
          <ScrollView contentContainerStyle={styles.cardContent}>
            <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
              <Ionicons name={cfg.icon} size={38} color={cfg.color} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            {message ? <Text style={styles.message}>{message}</Text> : null}
            <TouchableOpacity
              accessibilityRole="button"
              style={[styles.button, { backgroundColor: cfg.color }]}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <Text style={styles.buttonText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '100%',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.lg,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
  },
  cardContent: {
    padding: theme.spacing.lg,
    alignItems: 'center',
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: theme.fonts.sizes.lg,
    fontWeight: 'bold',
    color: theme.colors.textPrimary,
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: theme.fonts.sizes.md,
    color: theme.colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 18,
  },
  button: {
    width: '100%',
    minHeight: theme.touchTarget,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: theme.colors.textLight,
    fontSize: theme.fonts.sizes.md,
    fontWeight: 'bold',
  },
});
