import { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList,
  Pressable, TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { fetchSpecies, SpeciesResponse } from '../../services/species';
import { theme } from '../../constants/theme';
import ScreenHeader from '../../components/ScreenHeader';
import ScreenState from '../../components/ScreenState';
import IconButton from '../../components/IconButton';

function SpeciesCard({ species }: { species: SpeciesResponse }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = Boolean(species.description || species.tips);
  return (
    <View style={styles.card}>
      <View style={styles.summary}>
        <View style={styles.imageContainer}>
          {species.imageUrl ? (
            <Image source={{ uri: species.imageUrl }} style={styles.image} contentFit="cover" />
          ) : (
            <View style={[styles.image, styles.imagePlaceholder]}>
              <Ionicons name="image-outline" size={32} color={theme.colors.textSecondary} />
            </View>
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.species}>{species.name}</Text>
          <Text style={styles.scientificName}>{species.scientificName}</Text>
        </View>
      </View>
      {hasDetails && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${expanded ? 'Ocultar' : 'Mostrar'} informações sobre ${species.name}`}
          accessibilityState={{ expanded }}
          onPress={() => setExpanded(!expanded)}
          style={styles.expandButton}
        >
          <Text style={styles.expandText}>{expanded ? 'Menos informações' : 'Conhecer a espécie'}</Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.primary} />
        </Pressable>
      )}
      {expanded && (
        <View style={styles.details}>
          {species.description && (
            <View style={styles.descriptionBox}>
              <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
              <Text style={styles.descriptionText}>{species.description}</Text>
            </View>
          )}
          {species.tips && (
            <View style={styles.tipsBox}>
              <Ionicons name="bulb-outline" size={20} color={theme.colors.success} />
              <View style={{ flex: 1 }}>
                <Text style={styles.tipsLabel}>Dicas</Text>
                <Text style={styles.tipsText}>{species.tips}</Text>
              </View>
            </View>
          )}
        </View>
      )}
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
      <ScreenHeader
        title="Coleção"
        subtitle={loading ? 'Explore o catálogo de aves' : `${species.length} ${species.length === 1 ? 'espécie catalogada' : 'espécies catalogadas'}`}
      >
          <View style={styles.searchBox}>
            <Ionicons name="search-outline" size={20} color={theme.colors.textSecondary} />
            <TextInput
              accessibilityLabel="Buscar espécies"
              style={styles.searchInput}
              placeholder="Nome ou nome científico"
              placeholderTextColor={theme.colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && <IconButton icon="close" label="Limpar busca" onPress={() => setSearch('')} />}
          </View>
      </ScreenHeader>

      {loading ? (
        <View style={styles.statusBox}>
          <ScreenState loading title="Carregando espécies..." />
        </View>
      ) : error ? (
        <View style={styles.statusBox}>
          <ScreenState title="Não foi possível carregar" message={error} icon="cloud-offline-outline" actionLabel="Tentar novamente" onAction={loadSpecies} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.statusBox}>
          <ScreenState title={term ? 'Nenhuma espécie encontrada' : 'Nenhuma espécie cadastrada'}
            message={term
              ? 'Tente ajustar sua busca.'
              : 'Assim que houver espécies cadastradas, elas aparecerão aqui.'}
          />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => <SpeciesCard species={item} />}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: theme.colors.background, borderRadius: theme.radius.md,
    paddingHorizontal: 12, gap: 8, borderWidth: 1, borderColor: theme.colors.border,
  },
  searchInput: { flex: 1, minHeight: 52, paddingVertical: 12, fontSize: theme.fonts.sizes.md, color: theme.colors.textPrimary },
  list: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.lg },

  card: {
    backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: theme.spacing.md, gap: theme.spacing.sm,
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border,
  },
  summary: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md },
  imageContainer: { width: 88, height: 88, borderRadius: theme.radius.md, overflow: 'hidden' },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: {
    backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center',
  },

  cardBody: { flex: 1, gap: 6 },
  species: { fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.textPrimary },
  scientificName: {
    fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary,
    fontStyle: 'italic', marginBottom: 4,
  },

  descriptionBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: theme.colors.infoSurface, borderRadius: theme.radius.md, padding: 12, marginVertical: 4,
  },
  descriptionText: {
    flex: 1, fontSize: theme.fonts.sizes.md, color: theme.colors.textSecondary, lineHeight: 24,
  },

  tipsBox: {
    flexDirection: 'row', gap: 8,
    backgroundColor: theme.colors.successSurface, borderRadius: theme.radius.md, padding: 12, marginTop: 4,
    borderLeftWidth: 3, borderLeftColor: theme.colors.success,
  },
  tipsLabel: {
    fontSize: theme.fonts.sizes.sm, fontWeight: '600', color: theme.colors.success,
    marginBottom: 2, textTransform: 'uppercase', letterSpacing: 0.4,
  },
  tipsText: {   fontSize: theme.fonts.sizes.md, color: theme.colors.textSecondary, lineHeight: 24 },

  statusBox: {
    flex: 1, justifyContent: 'center', padding: theme.spacing.md,
  },
  expandButton: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  expandText: { flex: 1, color: theme.colors.primary, fontSize: theme.fonts.sizes.sm, fontWeight: '600' },
  details: { gap: theme.spacing.sm },
});
