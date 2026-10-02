import { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface Props extends TextInputProps {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  action?: ReactNode;
}

export default function FormField({ label, icon, action, style, ...props }: Props) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.wrapper}>
        {icon && <Ionicons name={icon} size={20} color={theme.colors.textSecondary} />}
        <TextInput
          accessibilityLabel={label}
          placeholderTextColor={theme.colors.textSecondary}
          {...props}
          style={[styles.input, style]}
        />
        {action}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: theme.spacing.sm, marginBottom: theme.spacing.md },
  label: { fontSize: theme.fonts.sizes.sm, fontWeight: '600', color: theme.colors.textPrimary },
  wrapper: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: theme.colors.background,
    borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md,
  },
  input: { flex: 1, minHeight: 56, paddingHorizontal: theme.spacing.sm, paddingVertical: 14, fontSize: theme.fonts.sizes.md, color: theme.colors.textPrimary },
});
