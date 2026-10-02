import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../constants/theme';
import { updateProfile, UserResponse } from '../services/auth';
import AppAlert, { AppAlertVariant } from './AppAlert';
import FormField from './FormField';
import ScreenHeader from './ScreenHeader';

interface ProfileProps {
  visible: boolean;
  onClose: () => void;
  onEdit: () => void;
  onLogout: () => void;
  user: UserResponse | null;
  loggingOut: boolean;
}

export function ProfileModal({ visible, onClose, onEdit, onLogout, user, loggingOut }: ProfileProps) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader title="Perfil" onBack={onClose} />
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.account}>
            <Text style={styles.name}>{user?.name ?? 'Usuário'}</Text>
            <Text style={styles.email}>{user?.email ?? ''}</Text>
          </View>
          <Pressable accessibilityRole="button" style={styles.button} onPress={onEdit}>
            <Text style={styles.buttonText}>Editar perfil</Text>
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: loggingOut, busy: loggingOut }} disabled={loggingOut} style={styles.dangerButton} onPress={onLogout}>
            <Text style={styles.dangerText}>{loggingOut ? 'Saindo...' : 'Sair da conta'}</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface EditProps {
  visible: boolean;
  onClose: () => void;
  user: UserResponse | null;
  onSaved: (updated: UserResponse) => void;
}

export function EditProfileModal({ visible, onClose, user, onSaved }: EditProps) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [saving, setSaving] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean; variant: AppAlertVariant; title: string; message?: string; onCloseAction?: () => void;
  }>({ visible: false, variant: 'error', title: '' });

  useEffect(() => {
    if (visible) {
      setName(user?.name ?? '');
      setEmail(user?.email ?? '');
    }
  }, [visible, user]);

  const closeAlert = () => {
    const action = alert.onCloseAction;
    setAlert((prev) => ({ ...prev, visible: false, onCloseAction: undefined }));
    action?.();
  };

  const handleSave = async () => {
    if (saving) return;
    const trimmedName = name.trim();
    const trimmedEmail = email.trim();
    if (!trimmedName || !trimmedEmail) {
      setAlert({ visible: true, variant: 'error', title: 'Atenção', message: 'Preencha nome e e-mail.' });
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile(trimmedName, trimmedEmail);
      if (result.success && result.user) {
        onSaved(result.user);
        setAlert({ visible: true, variant: 'success', title: 'Perfil atualizado', message: 'Suas informações foram salvas.', onCloseAction: onClose });
      } else {
        setAlert({ visible: true, variant: 'error', title: 'Não foi possível salvar', message: result.message ?? 'Tente novamente.' });
      }
    } catch {
      setAlert({ visible: true, variant: 'error', title: 'Não foi possível salvar', message: 'Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView edges={['bottom']} style={styles.container}>
        <ScreenHeader title="Editar perfil" onBack={onClose} />
        <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
            <Text style={styles.email}>Mantenha seus dados de acesso atualizados.</Text>
            <FormField label="Nome" icon="person-outline" value={name} onChangeText={setName} placeholder="Seu nome" editable={!saving} />
            <FormField label="E-mail" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" editable={!saving} />
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving, busy: saving }} style={[styles.button, saving && styles.disabled]} onPress={handleSave} disabled={saving}>
              <Text style={styles.buttonText}>{saving ? 'Salvando...' : 'Salvar alterações'}</Text>
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
        <AppAlert visible={alert.visible} variant={alert.variant} title={alert.title} message={alert.message} onClose={closeAlert} />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  account: { backgroundColor: theme.colors.surface, padding: theme.spacing.lg, borderRadius: theme.radius.lg, gap: theme.spacing.sm },
  name: { color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.xl, fontWeight: '700' },
  email: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.md, lineHeight: 24 },
  button: { minHeight: theme.touchTarget, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, padding: theme.spacing.md, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: theme.colors.textLight, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  dangerButton: { minHeight: theme.touchTarget, backgroundColor: theme.colors.dangerSurface, borderRadius: theme.radius.md, padding: theme.spacing.md, alignItems: 'center', justifyContent: 'center' },
  dangerText: { color: theme.colors.danger, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  disabled: { opacity: 0.6 },
});
