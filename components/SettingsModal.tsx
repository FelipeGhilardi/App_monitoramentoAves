import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import appConfig from '../app.json';
import { theme } from '../constants/theme';
import { UserResponse } from '../services/auth';
import ScreenHeader from './ScreenHeader';

interface Props {
  visible: boolean;
  user: UserResponse | null;
  onClose: () => void;
  onEdit: () => void;
  onAbout: () => void;
  onLogout: () => void;
  loggingOut: boolean;
}

export default function SettingsModal({ visible, user, onClose, onEdit, onAbout, onLogout, loggingOut }: Props) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader title="Configurações" onBack={onClose} />
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Sua conta</Text>
          <View style={styles.card}>
            <View style={styles.account}>
              <Text style={styles.name}>{user?.name ?? 'Usuário'}</Text>
              <Text style={styles.secondary}>{user?.email ?? ''}</Text>
            </View>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onEdit}>
              <Ionicons name="person-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.rowText}>Editar perfil</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
          <Text style={styles.sectionTitle}>Aplicativo</Text>
          <View style={styles.card}>
            <Pressable accessibilityRole="button" style={({ pressed }) => [styles.row, pressed && styles.pressed]} onPress={onAbout}>
              <Ionicons name="information-circle-outline" size={22} color={theme.colors.primary} />
              <Text style={styles.rowText}>Sobre o Projeto</Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.textSecondary} />
            </Pressable>
            <View style={styles.row}>
              <Text style={styles.rowText}>Versão do aplicativo</Text>
              <Text style={styles.secondary}>{appConfig.expo.version}</Text>
            </View>
          </View>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: loggingOut, busy: loggingOut }} disabled={loggingOut} style={({ pressed }) => [styles.logout, (pressed || loggingOut) && styles.pressed]} onPress={onLogout}>
            <Ionicons name="log-out-outline" size={22} color={theme.colors.danger} />
            <Text style={styles.logoutText}>{loggingOut ? 'Saindo...' : 'Sair da conta'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  sectionTitle: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, fontWeight: '600' },
  card: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg },
  account: { padding: theme.spacing.md, gap: theme.spacing.xs },
  name: { fontSize: theme.fonts.sizes.lg, fontWeight: '600', color: theme.colors.textPrimary },
  secondary: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, minHeight: 64, padding: theme.spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  rowText: { flex: 1, fontSize: theme.fonts.sizes.md, color: theme.colors.textPrimary },
  logout: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.dangerSurface },
  logoutText: { color: theme.colors.danger, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  pressed: { opacity: 0.65 },
});
