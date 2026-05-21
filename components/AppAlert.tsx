import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

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
  error: { icon: 'alert-circle', color: '#dc2626', bg: '#fef2f2' },
  success: { icon: 'checkmark-circle', color: '#16a34a', bg: '#f0fdf4' },
  info: { icon: 'information-circle', color: '#2563eb', bg: '#eff6ff' },
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

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
            <Ionicons name={cfg.icon} size={38} color={cfg.color} />
          </View>

          <Text style={styles.title}>{title}</Text>
          {message ? <Text style={styles.message}>{message}</Text> : null}

          <TouchableOpacity
            style={[styles.button, { backgroundColor: cfg.color }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <Text style={styles.buttonText}>{confirmLabel}</Text>
          </TouchableOpacity>
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
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 10,
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
    fontSize: 19,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
    marginBottom: 6,
  },
  message: {
    fontSize: 14,
    color: 'rgba(0,0,0,0.6)',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 18,
  },
  button: {
    width: '100%',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  buttonText: {
    color: 'white',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
