import { useEffect, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import SightingImageViewer from '../../components/SightingImageViewer';
import { isLoggedIn } from '../../services/auth';
import {
  fetchSightingById, formatSightingDate, getSightingTitle, SightingResponse,
} from '../../services/sightings';

type PageStatus = 'loading' | 'ready' | 'unauthorized' | 'not-found' | 'error';

export default function SightingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
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
    setStatus('loading');
    setSighting(null);
    setImageLoaded(false);
    setImageError(false);
    setShowImage(false);

    const load = async () => {
      if (typeof id !== 'string' || !id.trim()) {
        setStatus('not-found');
        return;
      }

      try {
        if (!(await isLoggedIn())) {
          if (active) setStatus('unauthorized');
          return;
        }

        const result = await fetchSightingById(id);
        if (!active) return;
        if (result.success && result.data) {
          setSighting(result.data);
          setStatus('ready');
        } else if (result.status === 401) {
          setStatus('unauthorized');
        } else if (result.status === 404 || result.status === 400) {
          setStatus('not-found');
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
    return () => { active = false; };
  }, [id, retryCount]);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const imageUrl = sighting?.imageUrl?.trim() || null;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={goBack} accessibilityRole="button" accessibilityLabel="Voltar" style={styles.back}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </Pressable>
        <Text style={styles.headerTitle}>Avistamento</Text>
      </View>

      {status !== 'ready' || !sighting ? (
        <View style={styles.state}>
          {status === 'loading' ? <ActivityIndicator color="#2563eb" size="large" /> : (
            <Ionicons
              name={status === 'unauthorized' ? 'lock-closed-outline' : 'image-outline'}
              size={38}
              color="#6b7280"
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
          {status === 'error' && (
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
            <Ionicons name="calendar-outline" size={18} color="#6b7280" />
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
              {!imageLoaded && <ActivityIndicator color="#2563eb" style={styles.photoLoading} />}
              {imageLoaded && <Text style={styles.photoHint}>Toque para ampliar</Text>}
            </Pressable>
          ) : (
            <View style={styles.placeholder}>
              <Ionicons name="image-outline" size={36} color="#9ca3af" />
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
  container: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: 'white', flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 10, gap: 12,
  },
  back: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  state: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 },
  stateText: { fontSize: 15, textAlign: 'center', color: '#374151' },
  action: { backgroundColor: '#2563eb', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 10 },
  actionText: { color: 'white', fontWeight: 'bold' },
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 25, fontWeight: 'bold', color: '#111827' },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 20 },
  date: { color: '#6b7280', fontSize: 14 },
  photoFrame: {
    height: 320, backgroundColor: '#111827', borderRadius: 16, overflow: 'hidden',
    alignItems: 'center', justifyContent: 'center',
  },
  photo: { width: '100%', height: '100%' },
  photoLoading: { position: 'absolute' },
  photoHint: {
    position: 'absolute', bottom: 12, color: 'white', backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12,
  },
  placeholder: {
    height: 220, backgroundColor: 'white', borderRadius: 16,
    alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20,
  },
  placeholderText: { color: '#6b7280', textAlign: 'center', fontSize: 14 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#111827', marginTop: 24, marginBottom: 12 },
  speciesRow: {
    backgroundColor: 'white', borderRadius: 12, padding: 16, marginBottom: 10, gap: 4,
  },
  speciesName: { fontSize: 16, fontWeight: '600', color: '#111827' },
  scientificName: { fontSize: 13, color: '#6b7280', fontStyle: 'italic' },
});
