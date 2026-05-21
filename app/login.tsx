import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { login } from '../services/auth';
import AppAlert, { AppAlertVariant } from '../components/AppAlert';

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
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} bounces={false} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Image
            source={require('../assets/loginImage.jpg')}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
          />
          <View style={styles.heroOverlay} />
          <View style={styles.logoContainer}>
            <View style={styles.logoBox}>
              <Ionicons name="camera" size={32} color="white" />
            </View>
            <Text style={styles.logoText}>AvistAI</Text>
          </View>
        </View>

        <View style={styles.form}>
          <Text style={styles.title}>Bem-vindo de volta!</Text>
          <Text style={styles.subtitle}>Faça login para continuar observando.</Text>

          <Text style={styles.label}>E-mail</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={18} color="rgba(0,0,0,0.35)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="seu@email.com"
              placeholderTextColor="rgba(0,0,0,0.35)"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <Text style={styles.label}>Senha</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="rgba(0,0,0,0.35)" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(0,0,0,0.35)"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color="rgba(0,0,0,0.35)"
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Esqueci minha senha</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.loginBtn, loading && { opacity: 0.7 }]}
            onPress={handleLogin}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.loginBtnText}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Text>
          </TouchableOpacity>

          <Text style={styles.orText}>Não tem uma conta?</Text>
          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => router.push('/signup')}
            activeOpacity={0.85}
          >
            <Text style={styles.signupBtnText}>Criar conta</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AppAlert
        visible={alert.visible}
        variant={alert.variant}
        title={alert.title}
        message={alert.message}
        onClose={closeAlert}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },
  hero: { height: 260, alignItems: 'center', justifyContent: 'center' },
  heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.2)' },
  logoContainer: { alignItems: 'center', zIndex: 1 },
  logoBox: {
    width: 72, height: 72, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)', marginBottom: 10,
  },
  logoText: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  form: {
    backgroundColor: 'white',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    marginTop: -28, paddingHorizontal: 24,
    paddingTop: 32, paddingBottom: 40,
  },
  title: { fontSize: 26, fontWeight: 'bold', color: '#000', marginBottom: 6 },
  subtitle: { fontSize: 14, color: 'rgba(0,0,0,0.55)', marginBottom: 28 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', borderRadius: 14, marginBottom: 18,
  },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 16, fontSize: 15, color: '#000' },
  eyeBtn: { padding: 16 },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 24, marginTop: -8 },
  forgotText: { fontSize: 13, fontWeight: 'bold', color: '#2563eb' },
  loginBtn: {
    backgroundColor: '#2563eb', borderRadius: 14,
    padding: 17, alignItems: 'center', marginBottom: 20,
  },
  loginBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  orText: { textAlign: 'center', fontSize: 13, color: 'rgba(0,0,0,0.55)', marginBottom: 14 },
  signupBtn: { borderWidth: 2, borderColor: '#2563eb', borderRadius: 14, padding: 17, alignItems: 'center' },
  signupBtnText: { color: '#2563eb', fontSize: 16, fontWeight: 'bold' },
});