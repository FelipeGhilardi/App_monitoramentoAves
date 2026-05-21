import { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput,
  TouchableOpacity, KeyboardAvoidingView,
  Platform, ScrollView
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { register } from '../services/auth';
import AppAlert, { AppAlertVariant } from '../components/AppAlert';

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
    visible: boolean;
    variant: AppAlertVariant;
    title: string;
    message?: string;
    onCloseAction?: () => void;
  }>({ visible: false, variant: 'error', title: '' });

  const showAlert = (
    variant: AppAlertVariant,
    title: string,
    message?: string,
    onCloseAction?: () => void
  ) => setAlert({ visible: true, variant, title, message, onCloseAction });

  const closeAlert = () => {
    const action = alert.onCloseAction;
    setAlert((prev) => ({ ...prev, visible: false, onCloseAction: undefined }));
    action?.();
  };

  const handleSignup = async () => {
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
      showAlert(
        'success',
        'Conta criada!',
        'Seu cadastro foi realizado com sucesso. Faça login para continuar.',
        () => router.replace('/login')
      );
    } else {
      showAlert('error', 'Não foi possível cadastrar', result.message ?? 'Tente novamente.');
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
            source={{ uri: 'https://images.unsplash.com/photo-1648227842965-25d3d33372da?w=800' }}
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
          <Text style={styles.title}>Criar sua conta</Text>
          <Text style={styles.subtitle}>Comece a observar aves hoje mesmo!</Text>

          <Text style={styles.label}>Nome completo</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="person-outline" size={18} color="rgba(0,0,0,0.35)" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Seu nome"
              placeholderTextColor="rgba(0,0,0,0.35)"
            />
          </View>

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
              placeholder="Mínimo 6 caracteres"
              placeholderTextColor="rgba(0,0,0,0.35)"
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(0,0,0,0.35)" />
            </TouchableOpacity>
          </View>

          <Text style={styles.label}>Confirmar senha</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={18} color="rgba(0,0,0,0.35)" style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { paddingRight: 48 }]}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="••••••••"
              placeholderTextColor="rgba(0,0,0,0.35)"
              secureTextEntry={!showConfirm}
            />
            <TouchableOpacity style={styles.eyeBtn} onPress={() => setShowConfirm(!showConfirm)}>
              <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={18} color="rgba(0,0,0,0.35)" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.createBtn, loading && { opacity: 0.7 }]}
            onPress={handleSignup}
            activeOpacity={0.85}
            disabled={loading}
          >
            <Text style={styles.createBtnText}>{loading ? 'Criando conta...' : 'Criar conta'}</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>Já tem uma conta?</Text>
          <TouchableOpacity style={styles.loginBtn} onPress={() => router.back()} activeOpacity={0.85}>
            <Text style={styles.loginBtnText}>Fazer login</Text>
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
  hero: { height: 220, alignItems: 'center', justifyContent: 'center' },
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
  subtitle: { fontSize: 14, color: 'rgba(0,0,0,0.55)', marginBottom: 24 },
  label: { fontSize: 13, fontWeight: 'bold', color: '#000', marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#f3f4f6', borderRadius: 14, marginBottom: 18,
  },
  inputIcon: { paddingLeft: 16 },
  input: { flex: 1, paddingHorizontal: 12, paddingVertical: 16, fontSize: 15, color: '#000' },
  eyeBtn: { padding: 16 },
  createBtn: {
    backgroundColor: '#2563eb', borderRadius: 14,
    padding: 17, alignItems: 'center', marginTop: 8, marginBottom: 20,
  },
  createBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  orText: { textAlign: 'center', fontSize: 13, color: 'rgba(0,0,0,0.55)', marginBottom: 14 },
  loginBtn: { borderWidth: 2, borderColor: '#2563eb', borderRadius: 14, padding: 17, alignItems: 'center' },
  loginBtnText: { color: '#2563eb', fontSize: 16, fontWeight: 'bold' },
});