import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import IconButton from './IconButton';

interface Props {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children?: ReactNode;
  onBack?: () => void;
  safeTop?: boolean;
}

export default function ScreenHeader({ title, subtitle, actions, children, onBack, safeTop = true }: Props) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: (safeTop ? insets.top : 0) + theme.spacing.sm }]}>
      <View style={styles.row}>
        {onBack && <IconButton icon="arrow-back" label="Voltar" onPress={onBack} />}
        <View style={styles.titles}>
          <Text accessibilityRole="header" style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
        </View>
        {actions && <View style={styles.actions}>{actions}</View>}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: theme.colors.surface, paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.md, gap: theme.spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.border,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  titles: { flex: 1, gap: theme.spacing.xs },
  title: { fontSize: theme.fonts.sizes.xl, fontWeight: '700', color: theme.colors.textPrimary },
  subtitle: { fontSize: theme.fonts.sizes.sm, lineHeight: 20, color: theme.colors.textSecondary },
  actions: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs },
});
