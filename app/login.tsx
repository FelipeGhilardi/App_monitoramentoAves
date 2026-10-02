import { useState } from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { login } from '../services/auth';
import AppAlert, { AppAlertVariant } from '../components/AppAlert';
import AuthLayout, { authStyles as styles } from '../components/AuthLayout';
import FormField from '../components/FormField';
import IconButton from '../components/IconButton';

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alert, setAlert] = useState<{
    visible: boolean;
    variant: AppAlertVariant;
    title: string;
    message?: string;
  }>({ visible: false, variant: 'error', title: '' });

  const showAlert = (variant: AppAlertVariant, title: string, message?: string) =>
    setAlert({ visible: true, variant, title, message });

  const closeAlert = () => setAlert((prev) => ({ ...prev, visible: false }));

  const handleLogin = async () => {
    if (loading) return;
    if (!email.trim() || !password.trim()) {
      showAlert('error', 'Atenção', 'Preencha e-mail e senha.');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);
    setLoading(false);

    if (result.success) {
      router.replace('/(tabs)');
    } else {
      showAlert('error', 'Não foi possível entrar', result.message ?? 'E-mail ou senha incorretos.');
    }
  };

  return (
    <>
      <AuthLayout image={require('../assets/loginImage.jpg')} title="Bem-vindo de volta!" subtitle="Faça login para continuar observando.">
        <FormField
          label="E-mail" icon="mail-outline" value={email} onChangeText={setEmail} placeholder="seu@email.com"
          keyboardType="email-address" autoCapitalize="none" autoComplete="email" editable={!loading}
        />
        <FormField
          label="Senha" icon="lock-closed-outline" value={password} onChangeText={setPassword} placeholder="••••••••"
          secureTextEntry={!showPassword} autoCapitalize="none" autoComplete="current-password" editable={!loading}
          action={<IconButton icon={showPassword ? 'eye-off-outline' : 'eye-outline'} label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} onPress={() => setShowPassword(!showPassword)} />}
        />
        <TouchableOpacity style={styles.forgotButton}>
          <Text style={styles.secondaryText}>Esqueci minha senha</Text>
        </TouchableOpacity>
        <TouchableOpacity
          accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }}
          style={[styles.primaryButton, loading && styles.disabled]}
          onPress={handleLogin} activeOpacity={0.85} disabled={loading}
        >
          <Text style={styles.primaryText}>{loading ? 'Entrando...' : 'Entrar'}</Text>
        </TouchableOpacity>
        <Text style={styles.caption}>Não tem uma conta?</Text>
        <TouchableOpacity accessibilityRole="button" style={styles.secondaryButton} onPress={() => router.push('/signup')} activeOpacity={0.85}>
          <Text style={styles.secondaryText}>Criar conta</Text>
        </TouchableOpacity>
      </AuthLayout>

      <AppAlert
        visible={alert.visible}
        variant={alert.variant}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
      />
    </>
  );
}
