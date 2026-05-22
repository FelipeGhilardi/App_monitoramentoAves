import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { fetchSpecies, SpeciesResponse } from '../../services/species';

function SpeciesCard({ species }: { species: SpeciesResponse }) {
  return (
    <View style={styles.card}>
      <View style={styles.imageContainer}>
        {species.imageUrl ? (
          <Image
            source={{ uri: species.imageUrl }}
            style={styles.image}
            contentFit="cover"
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Ionicons name="image-outline" size={40} color="rgba(0,0,0,0.25)" />
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <Text style={styles.species}>{species.name}</Text>
        <Text style={styles.scientificName}>{species.scientificName}</Text>

        {species.description ? (
          <View style={styles.descriptionBox}>
            <Ionicons
              name="information-circle-outline"
              size={16}
              color="#3b82f6"
              style={{ marginTop: 1 }}
            />
            <Text style={styles.descriptionText}>{species.description}</Text>
          </View>
        ) : null}

        {species.tips ? (
          <View style={styles.tipsBox}>
            <Ionicons
              name="bulb-outline"
              size={16}
              color="#16a34a"
              style={{ marginTop: 1 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.tipsLabel}>Dicas</Text>
              <Text style={styles.tipsText}>{species.tips}</Text>
            </View>
          </View>
        ) : null}
      </View>
    </View>
  );
}

export default function CollectionScreen() {
  const [search, setSearch] = useState('');
  const [species, setSpecies] = useState<SpeciesResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSpecies = useCallback(async () => {
    setLoading(true);
    const result = await fetchSpecies();
    if (result.success && result.data) {
      setSpecies(result.data);
      setError(null);
    } else {
      setSpecies([]);
      setError(result.message ?? 'Erro ao carregar espécies.');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSpecies();
  }, [loadSpecies]);

  const term = search.trim().toLowerCase();
  const filtered = term
    ? species.filter((s) =>
        [s.name, s.scientificName]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(term))
      )
    : species;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Minha Coleção</Text>
        <Text style={styles.headerSubtitle}>
          {species.length === 0
            ? 'Nenhuma espécie ainda'
            : `${species.length} ${species.length === 1 ? 'espécie catalogada' : 'espécies catalogadas'}`}
        </Text>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={16} color="rgba(255,255,255,0.7)" />
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar por nome ou nome científico..."
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={search}
              onChangeText={setSearch}
            />
          </View>
        </View>
      </View>

      {loading ? (
        <View style={styles.statusBox}>
          <ActivityIndicator color="#2563eb" />
          <Text style={styles.statusText}>Carregando espécies...</Text>
        </View>
      ) : error ? (
        <View style={styles.statusBox}>
          <Ionicons name="cloud-offline-outline" size={36} color="rgba(0,0,0,0.4)" />
          <Text style={styles.statusText}>{error}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={loadSpecies}>
            <Text style={styles.retryBtnText}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.statusBox}>
          <Ionicons name="leaf-outline" size={36} color="rgba(0,0,0,0.3)" />
          <Text style={styles.emptyTitle}>
            {term ? 'Nenhuma espécie encontrada' : 'Nenhuma espécie cadastrada'}
          </Text>
          <Text style={styles.emptyText}>
            {term
              ? 'Tente ajustar sua busca.'
              : 'Assim que houver espécies cadastradas, elas aparecerão aqui.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SpeciesCard species={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'white' },

  header: {
    backgroundColor: '#2563eb',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 16,
    gap: 10,
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: 'white' },
  headerSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: 'white' },

  list: { padding: 16, gap: 20, paddingBottom: 40 },

  card: {
    backgroundColor: 'white', borderRadius: 16, overflow: 'hidden',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
    borderWidth: 1, borderColor: '#f3f4f6',
  },
  imageContainer: { position: 'relative' },
  image: { width: '100%', height: 220 },
  imagePlaceholder: {
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },

  cardBody: { padding: 16, gap: 6 },
  species: { fontSize: 20, fontWeight: 'bold', color: '#000' },
  scientificName: {
    fontSize: 13, color: 'rgba(0,0,0,0.5)',
    fontStyle: 'italic', marginBottom: 4,
  },

  descriptionBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#f0f7ff', borderRadius: 10, padding: 12, marginVertical: 4,
  },
  descriptionText: {
    flex: 1, fontSize: 13, color: 'rgba(0,0,0,0.7)', lineHeight: 19,
  },

  tipsBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: '#f0fdf4', borderRadius: 10, padding: 12, marginTop: 4,
    borderLeftWidth: 3, borderLeftColor: '#16a34a',
  },
  tipsLabel: {
    fontSize: 12, fontWeight: 'bold', color: '#16a34a',
    marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  tipsText: { fontSize: 13, color: 'rgba(0,0,0,0.75)', lineHeight: 19 },

  statusBox: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 32, gap: 10,
  },
  statusText: { fontSize: 13, color: 'rgba(0,0,0,0.6)', textAlign: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: 'bold', color: '#000', marginTop: 6 },
  emptyText: { fontSize: 13, color: 'rgba(0,0,0,0.5)', textAlign: 'center', lineHeight: 19 },

  retryBtn: {
    backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginTop: 4,
  },
  retryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },
});
