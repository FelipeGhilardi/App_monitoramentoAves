import { ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image, ImageProps } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

interface Props {
  image: ImageProps['source'];
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function AuthLayout({ image, title, subtitle, children }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
          <View style={styles.hero}>
            <Image source={image} style={StyleSheet.absoluteFillObject} contentFit="cover" />
            <View style={styles.overlay} />
            <View style={styles.brand}>
              <Ionicons name="camera-outline" size={32} color={theme.colors.textLight} />
              <Text style={styles.brandName}>AvistAI</Text>
            </View>
          </View>
          <View style={styles.form}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>{subtitle}</Text>
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.surface },
  scroll: { flexGrow: 1 },
  hero: { height: 176, justifyContent: 'center', padding: theme.spacing.lg },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  brandName: { fontSize: theme.fonts.sizes.xxl, color: theme.colors.textLight, fontWeight: '700', flexShrink: 1 },
  form: { padding: theme.spacing.lg, backgroundColor: theme.colors.surface },
  title: { color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.xl, fontWeight: '700', marginBottom: theme.spacing.sm },
  subtitle: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.md, lineHeight: 24, marginBottom: theme.spacing.lg },
});

export const authStyles = StyleSheet.create({
  primaryButton: { minHeight: 56, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md, marginBottom: theme.spacing.md },
  primaryText: { color: theme.colors.textLight, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  secondaryButton: { minHeight: 56, borderWidth: 1, borderColor: theme.colors.primary, borderRadius: theme.radius.md, alignItems: 'center', justifyContent: 'center', padding: theme.spacing.md },
  secondaryText: { color: theme.colors.primary, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  caption: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, textAlign: 'center', marginBottom: theme.spacing.md },
  forgotButton: { alignSelf: 'flex-end', minHeight: theme.touchTarget, justifyContent: 'center', marginBottom: theme.spacing.md },
  disabled: { opacity: 0.6 },
});
