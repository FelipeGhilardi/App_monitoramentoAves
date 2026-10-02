import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { register } from '../services/auth';
import AppAlert, { AppAlertVariant } from '../components/AppAlert';
import AuthLayout, { authStyles as styles } from '../components/AuthLayout';
import FormField from '../components/FormField';
import IconButton from '../components/IconButton';

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean; variant: AppAlertVariant; title: string; message?: string; onCloseAction?: () => void;
  }>({ visible: false, variant: 'error', title: '' });

  const showAlert = (variant: AppAlertVariant, title: string, message?: string, onCloseAction?: () => void) =>
    setAlert({ visible: true, variant, title, message, onCloseAction });

  const closeAlert = () => {
    const action = alert.onCloseAction;
    setAlert((prev) => ({ ...prev, visible: false, onCloseAction: undefined }));
    action?.();
  };

  const handleSignup = async () => {
    if (loading) return;
    if (!name || !email || !password || !confirmPassword) {
      showAlert('error', 'Atenção', 'Preencha todos os campos.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('error', 'Senhas diferentes', 'As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      showAlert('error', 'Senha muito curta', 'A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setLoading(true);
    const result = await register(name.trim(), email.trim(), password);
    setLoading(false);
    if (result.success) {
      showAlert('success', 'Conta criada!', 'Seu cadastro foi realizado com sucesso. Faça login para continuar.', () => router.replace('/login'));
    } else {
      showAlert('error', 'Não foi possível cadastrar', result.message ?? 'Tente novamente.');
    }
  };

  return (
    <>
      <AuthLayout image={require('../assets/cadastroImage.jpg')} title="Criar sua conta" subtitle="Comece a observar aves hoje mesmo!">
        <FormField label="Nome completo" icon="person-outline" value={name} onChangeText={setName} placeholder="Seu nome" autoComplete="name" editable={!loading} />
        <FormField label="E-mail" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="seu@email.com" keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!loading} />
        <FormField
          label="Senha" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="Mínimo 6 caracteres"
          secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="new-password" editable={!loading}
          action={<IconButton icon={showPassword ? 'eye-off-outline' : 'eye-outline'} label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setShowPassword(!showPassword)} />}
        />
        <FormField
          label="Confirmar senha" icon="lock-closed-outline" value={confirmPassword} onChangeText={setConfirmPassword} placeholder="••••••••"
          secureTextEntry={!showConfirm} autoCapitalize="none" autoComplete="new-password" editable={!loading}
          action={<IconButton icon={showConfirm ? 'eye-off-outline' : 'eye-outline'} label={showConfirm ? 'Ocultar confirmação de senha' : 'Mostrar confirmação de senha'} onPress={() => setShowConfirm(!showConfirm)} />}
        />
        <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} style={[styles.primaryButton, loading && styles.disabled]} onPress={handleSignup} disabled={loading} activeOpacity={0.85}>
          <Text style={styles.primaryText}>{loading ? 'Criando conta...' : 'Criar conta'}</Text>
        </TouchableOpacity>
        <Text style={styles.caption}>Já tem uma conta?</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={() => router.back()} activeOpacity={0.85}>
          <Text style={styles.secondaryText}>Fazer login</Text>
        </TouchableOpacity>
      </AuthLayout>
      <AppAlert visible={alert.visible} variant={alert.variant} title={alert.title} message={alert.message} onClose={closeAlert} />
    </>
  );
}
