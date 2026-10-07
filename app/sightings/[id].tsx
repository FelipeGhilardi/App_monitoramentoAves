import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SightingImageViewer from '../../components/SightingImageViewer';
import ScreenHeader from '../../components/ScreenHeader';
import { theme } from '../../constants/theme';
import { isLoggedIn } from '../../services/auth';
import {
  fetchSightingById, formatSightingDate, getSightingTitle, SightingResponse,
} from '../../services/sightings';

type PageStatus = 'loading' | 'ready' | 'unauthorized' | 'not-found' | 'error';
const NOT_FOUND_RECHECK_DELAY_MS = 500;

export default function SightingDetailScreen() {
  const { id: routeId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(routeId) ? (routeId.length === 1 ? routeId[0] : '') : routeId;
  const router = useRouter();
  const [status, setStatus] = useState<PageStatus>('loading');
  const [sighting, setSighting] = useState<SightingResponse | null>(null);
  const [error, setError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [imageAttempt, setImageAttempt] = useState(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showImage, setShowImage] = useState(false);

  useEffect(() => {
    let active = true;
    let recheckedNotFound = false;
    let recheckTimer: ReturnType<typeof setTimeout> | undefined;
    setStatus('loading');
    setSighting(null);
    setError('');
    setImageLoaded(false);
    setImageError(false);
    setShowImage(false);

    const load = async () => {
      if (id === undefined) return;
      if (!id.trim()) {
        setStatus('not-found');
        return;
      }

      try {
        const loggedIn = await isLoggedIn();
        if (!active) return;
        if (!loggedIn) {
          setStatus('unauthorized');
          return;
        }

        const result = await fetchSightingById(id);
        if (!active) return;
        if (result.success && result.data) {
          setSighting(result.data);
          setStatus('ready');
        } else if (result.status === 401) {
          setStatus('unauthorized');
        } else if (result.status === 404) {
          if (!recheckedNotFound) {
            recheckedNotFound = true;
            recheckTimer = setTimeout(() => { if (active) void load(); }, NOT_FOUND_RECHECK_DELAY_MS);
          } else {
            setStatus('not-found');
          }
        } else {
          setError(result.message ?? 'Não foi possível carregar o avistamento.');
          setStatus('error');
        }
      } catch {
        if (active) {
          setError('Não foi possível verificar sua sessão. Tente novamente.');
          setStatus('error');
        }
      }
    };

    void load();
    return () => {
      active = false;
      clearTimeout(recheckTimer);
    };
  }, [id, retryCount]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const imageUrl = sighting?.imageUrl?.trim() || null;

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Avistamento" onBack={goBack} safeTop={false} />

      {status !== 'ready' || !sighting ? (
        <View style={styles.state}>
          {status === 'loading' ? <ActivityIndicator color={theme.colors.primary} size="large" /> : (
            <Ionicons
              name={status === 'unauthorized' ? 'lock-closed-outline' : 'image-outline'}
              size={38}
              color={theme.colors.textSecondary}
            />
          )}
          <Text style={styles.stateText}>
            {status === 'loading' && 'Carregando avistamento...'}
            {status === 'unauthorized' && 'Faça login para ver este avistamento.'}
            {status === 'not-found' && 'Avistamento não encontrado.'}
            {status === 'error' && error}
          </Text>
          {status === 'unauthorized' && (
            <Pressable
              onPress={() => router.replace('/login')}
              accessibilityRole="button"
              style={styles.action}
            >
              <Text style={styles.actionText}>Ir para login</Text>
            </Pressable>
          )}
          {(status === 'error' || (status === 'not-found' && Boolean(id?.trim()))) && (
            <Pressable
              onPress={() => setRetryCount((count) => count + 1)}
              accessibilityRole="button"
              style={styles.action}
            >
              <Text style={styles.actionText}>Tentar novamente</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{getSightingTitle(sighting)}</Text>
          <View style={styles.dateRow}>
            <Ionicons name="calendar-outline" size={18} color={theme.colors.textSecondary} />
            <Text style={styles.date}>{formatSightingDate(sighting)}</Text>
          </View>

          {imageUrl && !imageError ? (
            <Pressable
              style={styles.photoFrame}
              onPress={() => setShowImage(true)}
              disabled={!imageLoaded}
              accessibilityRole="button"
              accessibilityLabel="Ampliar foto do avistamento"
            >
              <Image
                key={imageAttempt}
                source={{ uri: imageUrl }}
                style={styles.photo}
                contentFit="contain"
                testID="sighting-photo"
                accessibilityLabel="Foto do avistamento"
                onLoad={() => setImageLoaded(true)}
                onError={() => { setImageLoaded(false); setImageError(true); }}
              />
              {!imageLoaded && <ActivityIndicator color={theme.colors.primary} style={styles.photoLoading} />}
              {imageLoaded && <Text style={styles.photoHint}>Toque para ampliar</Text>}
            </Pressable>
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={36} color={theme.colors.textSecondary} />
              <Text style={styles.placeholderText}>
                {imageError ? 'Não foi possível carregar a imagem do registro.' : 'Sem imagem do registro'}
              </Text>
              {imageError && (
                <Pressable
                  onPress={() => { setImageLoaded(false); setImageError(false); setImageAttempt((n) => n + 1); }}
                  accessibilityRole="button"
                  style={styles.action}
                >
                  <Text style={styles.actionText}>Tentar novamente</Text>
                </Pressable>
              )}
            </View>
          )}

          <Text style={styles.sectionTitle}>Espécies identificadas</Text>
          {sighting.species.length > 0 ? sighting.species.map((species) => (
            <View key={species.id} style={styles.speciesRow}>
              <Text style={styles.speciesName}>{species.name}</Text>
              <Text style={styles.scientificName}>{species.scientificName}</Text>
            </View>
          )) : <Text style={styles.date}>Nenhuma espécie informada.</Text>}
        </ScrollView>
      )}

      {showImage && imageUrl && <SightingImageViewer uri={imageUrl} onClose={() => setShowImage(false)} />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  stateText: { fontSize: theme.fonts.sizes.md, lineHeight: 24, textAlign: 'center', color: theme.colors.textSecondary },
  action: { minHeight: theme.touchTarget, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm },
  actionText: { color: theme.colors.textLight, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  content: { padding: theme.spacing.md, paddingBottom: theme.spacing.lg },
  title: { fontSize: theme.fonts.sizes.xl, fontWeight: '700', color: theme.colors.textPrimary },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 20 },
  date: { flexShrink: 1, color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, lineHeight: 21 },
  photoFrame: {
    width: '100%', aspectRatio: 4 / 3, backgroundColor: theme.colors.textPrimary, borderRadius: theme.radius.lg, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoLoading: { position: 'absolute' },
  photoHint: {
    position: 'absolute', bottom: 12, color: theme.colors.textLight, backgroundColor: 'rgba(0,0,0,0.6)', fontSize: theme.fonts.sizes.sm,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  placeholder: {
    minHeight: 220, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20,
  },
  placeholderText: { color: theme.colors.textSecondary, textAlign: 'center', fontSize: theme.fonts.sizes.md, lineHeight: 24 },
  sectionTitle: { fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.textPrimary, marginTop: theme.spacing.lg, marginBottom: 12 },
  speciesRow: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, padding: theme.spacing.md, marginBottom: theme.spacing.sm, gap: theme.spacing.xs,
  },
  speciesName: { fontSize: theme.fonts.sizes.md, fontWeight: '600', color: theme.colors.textPrimary },
  scientificName: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary, fontStyle: 'italic' },
});
