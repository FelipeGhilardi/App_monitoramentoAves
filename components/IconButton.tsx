import { ActivityIndicator, Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  color?: string;
  style?: StyleProp<ViewStyle>;
}

export default function IconButton({
  icon, label, onPress, disabled = false, loading = false,
  color = theme.colors.textPrimary, style,
}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [styles.button, style, (pressed || disabled || loading) && styles.dimmed]}
    >
      {loading ? <ActivityIndicator color={color} /> : <Ionicons name={icon} size={24} color={color} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: theme.touchTarget, minHeight: theme.touchTarget,
    alignItems: 'center', justifyContent: 'center', borderRadius: theme.radius.md,
  },
  dimmed: { opacity: 0.6 },
});
