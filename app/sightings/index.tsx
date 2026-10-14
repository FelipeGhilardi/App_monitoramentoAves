import { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList, Modal, Pressable, ScrollView, StyleSheet, Switch,
  Text, TextInput, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import SightingCard from '../../components/SightingCard';
import IconButton from '../../components/IconButton';
import ScreenHeader from '../../components/ScreenHeader';
import ScreenState from '../../components/ScreenState';
import { theme } from '../../constants/theme';
import { fetchSpecies, SpeciesResponse } from '../../services/species';
import {
  fetchSightingsPage, SightingResponse, SightingsSort,
} from '../../services/sightings';
import { subscribeToSightingChanges } from '../../services/sighting-events';

const PAGE_SIZE = 50;
const UNIDENTIFIED_SPECIES_NAMES = new Set([
  'outros', 'ave nao identificada', 'especie nao identificada',
]);

const sortOptions: { id: SightingsSort; label: string }[] = [
  { id: 'newest', label: 'Mais recentes' },
  { id: 'oldest', label: 'Mais antigos' },
  { id: 'species_asc', label: 'Espécie (A-Z)' },
  { id: 'species_desc', label: 'Espécie (Z-A)' },
];

interface Filters {
  date: string;
  speciesId: string | null;
  includeUnidentified: boolean;
  sort: SightingsSort;
}

function ChoiceModal({
  visible, title, options, selectedId, onSelect, onClose,
}: {
  visible: boolean;
  title: string;
  options: { id: string; label: string }[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.modalContainer}>
          <ScreenHeader title={title} onBack={onClose} />
          <ScrollView contentContainerStyle={styles.optionList}>
            {options.map((option) => {
              const selected = option.id === selectedId;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  onPress={() => { onSelect(option.id); onClose(); }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                >
                  <Text style={styles.optionText}>{option.label}</Text>
                  {selected && <Ionicons name="checkmark" size={22} color={theme.colors.primary} />}
                </Pressable>
              );
            })}
          </ScrollView>
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

export default function SightingsScreen() {
  const router = useRouter();
  const requestVersion = useRef(0);
  const [species, setSpecies] = useState<SpeciesResponse[]>([]);
  const [speciesError, setSpeciesError] = useState<string | null>(null);
  const [date, setDate] = useState('');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [includeUnidentified, setIncludeUnidentified] = useState(false);
  const [sort, setSort] = useState<SightingsSort>('newest');
  const [activeFilters, setActiveFilters] = useState<Filters>({
    date: '', speciesId: null, includeUnidentified: false, sort: 'newest',
  });
  const [sightings, setSightings] = useState<SightingResponse[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [choice, setChoice] = useState<'species' | 'sort' | null>(null);
  const [filtersExpanded, setFiltersExpanded] = useState(false);

  const loadSpecies = useCallback(async () => {
    const result = await fetchSpecies();
    if (result.success && result.data) {
      setSpecies(result.data.filter((item) => !UNIDENTIFIED_SPECIES_NAMES.has(normalizeSpeciesName(item.name))));
      setSpeciesError(null);
    } else {
      setSpecies([]);
      setSpeciesError(result.message ?? 'Não foi possível carregar as espécies.');
    }
  }, []);

  useEffect(() => {
    void loadSpecies();
  }, [loadSpecies]);

  const loadSightings = useCallback(async (nextCursor: string | null, append: boolean) => {
    const version = ++requestVersion.current;
    if (append) setLoadingMore(true);
    else {
      setLoading(true);
      setError(null);
    }

    const result = await fetchSightingsPage({
      cursor: nextCursor,
      date: activeFilters.date || undefined,
      speciesId: activeFilters.speciesId,
      includeUnidentified: activeFilters.speciesId ? false : activeFilters.includeUnidentified,
      sort: activeFilters.sort,
      limit: PAGE_SIZE,
    });

    if (version !== requestVersion.current) return;
    if (result.success && result.data) {
      setSightings((current) => {
        if (!append) return result.data!.items;
        const known = new Set(current.map((item) => item.id));
        return [...current, ...result.data!.items.filter((item) => !known.has(item.id))];
      });
      setCursor(result.data.nextCursor);
      setHasMore(result.data.hasMore);
      setError(null);
    } else {
      setError(result.message ?? 'Não foi possível carregar avistamentos.');
      if (!append) {
        setSightings([]);
        setCursor(null);
        setHasMore(false);
      }
    }
    if (append) setLoadingMore(false);
    else setLoading(false);
  }, [activeFilters]);

  useEffect(() => {
    void loadSightings(null, false);
  }, [loadSightings]);

  useEffect(() => subscribeToSightingChanges(() => { void loadSightings(null, false); }), [loadSightings]);

  const applyFilters = () => {
    const normalizedDate = date.trim();
    if (normalizedDate && !/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) {
      setDateError('Informe a data no formato AAAA-MM-DD.');
      return;
    }
    setDateError(null);
    setActiveFilters({
      date: normalizedDate,
      speciesId: selectedSpeciesId,
      includeUnidentified,
      sort,
    });
  };

  const clearFilters = () => {
    setDate('');
    setSelectedSpeciesId(null);
    setIncludeUnidentified(false);
    setSort('newest');
    setDateError(null);
    setActiveFilters({ date: '', speciesId: null, includeUnidentified: false, sort: 'newest' });
  };

  const selectedSpecies = species.find((item) => item.id === selectedSpeciesId);
  const selectedSort = sortOptions.find((item) => item.id === sort)?.label ?? 'Mais recentes';
  const speciesOptions = [{ id: '', label: 'Todas as espécies' }, ...species.map((item) => ({ id: item.id, label: item.name }))];

  return (
    <View style={styles.container}>
      <ScreenHeader
        title="Avistamentos"
        subtitle="Explore o histórico do comedouro"
        onBack={() => router.canGoBack() ? router.back() : router.replace('/(tabs)')}
        actions={
          <IconButton
            icon="refresh"
            label="Atualizar avistamentos"
            onPress={() => void loadSightings(null, false)}
            disabled={loadingMore}
            loading={loading}
          />
        }
      />
      <FlatList
        data={sightings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SightingCard
            sighting={item}
            onPress={() => router.push({ pathname: '/sightings/[id]', params: { id: item.id } })}
          />
        )}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.filters}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={filtersExpanded ? 'Ocultar filtros' : 'Mostrar filtros'}
              accessibilityState={{ expanded: filtersExpanded }}
              onPress={() => setFiltersExpanded((expanded) => !expanded)}
              style={({ pressed }) => [styles.filterToggle, pressed && styles.pressed]}
            >
              <Text style={styles.filterTitle}>Filtros</Text>
              <Ionicons name={filtersExpanded ? 'chevron-up' : 'chevron-down'} size={22} color={theme.colors.primary} />
            </Pressable>
            {filtersExpanded && (
              <View style={styles.filterContent}>
                <TextInput
                  accessibilityLabel="Filtrar por dia"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  placeholder="Dia (AAAA-MM-DD)"
                  placeholderTextColor={theme.colors.textSecondary}
                  value={date}
                  onChangeText={setDate}
                  style={[styles.dateInput, dateError && styles.inputError]}
                />
                {dateError && <Text accessibilityRole="alert" style={styles.errorText}>{dateError}</Text>}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Filtrar por espécie"
                  onPress={() => setChoice('species')}
                  style={({ pressed }) => [styles.select, pressed && styles.pressed]}
                >
                  <Text style={styles.selectLabel}>Espécie</Text>
                  <Text style={styles.selectValue}>{selectedSpecies?.name ?? 'Todas as espécies'}</Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </Pressable>
                {speciesError && (
                  <View style={styles.speciesError}>
                    <Text style={styles.errorText}>{speciesError}</Text>
                    <Pressable accessibilityRole="button" onPress={() => void loadSpecies()}>
                      <Text style={styles.retryText}>Tentar novamente</Text>
                    </Pressable>
                  </View>
                )}
                <View style={styles.switchRow}>
                  <View style={styles.switchText}>
                    <Text style={styles.selectLabel}>Incluir avistamentos sem identificação</Text>
                    {selectedSpeciesId && <Text style={styles.hint}>A espécie selecionada tem prioridade.</Text>}
                  </View>
                  <Switch
                    accessibilityLabel="Incluir avistamentos sem identificação"
                    accessibilityState={{ disabled: Boolean(selectedSpeciesId) }}
                    disabled={Boolean(selectedSpeciesId)}
                    value={includeUnidentified}
                    onValueChange={setIncludeUnidentified}
                  />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Organizar avistamentos"
                  onPress={() => setChoice('sort')}
                  style={({ pressed }) => [styles.select, pressed && styles.pressed]}
                >
                  <Text style={styles.selectLabel}>Organizar por</Text>
                  <Text style={styles.selectValue}>{selectedSort}</Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </Pressable>
                <View style={styles.filterActions}>
                  <Pressable accessibilityRole="button" onPress={applyFilters} style={({ pressed }) => [styles.applyButton, pressed && styles.pressed]}>
                    <Text style={styles.applyText}>Aplicar filtros</Text>
                  </Pressable>
                  <Pressable accessibilityRole="button" onPress={clearFilters} style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}>
                    <Text style={styles.clearText}>Limpar</Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={loading ? (
          <ScreenState loading title="Carregando avistamentos..." />
        ) : error ? (
          <ScreenState title="Não foi possível carregar" message={error} icon="cloud-offline-outline" actionLabel="Tentar novamente" onAction={() => void loadSightings(null, false)} />
        ) : (
          <ScreenState title="Nenhum avistamento encontrado" message="Tente ajustar os filtros aplicados." />
        )}
        ListFooterComponent={sightings.length > 0 ? (
          <View style={styles.footer}>
            {error && <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text>}
            {hasMore && (
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ disabled: loadingMore, busy: loadingMore }}
                disabled={loadingMore}
                onPress={() => cursor && void loadSightings(cursor, true)}
                style={({ pressed }) => [styles.loadMoreButton, (pressed || loadingMore) && styles.pressed]}
              >
                <Text style={styles.applyText}>{loadingMore ? 'Carregando...' : 'Carregar mais'}</Text>
              </Pressable>
            )}
          </View>
        ) : null}
        showsVerticalScrollIndicator={false}
      />
      <ChoiceModal
        visible={choice === 'species'}
        title="Filtrar por espécie"
        options={speciesOptions}
        selectedId={selectedSpeciesId ?? ''}
        onSelect={(id) => setSelectedSpeciesId(id || null)}
        onClose={() => setChoice(null)}
      />
      <ChoiceModal
        visible={choice === 'sort'}
        title="Organizar avistamentos"
        options={sortOptions}
        selectedId={sort}
        onSelect={(id) => setSort(id as SightingsSort)}
        onClose={() => setChoice(null)}
      />
    </View>
  );
}

function normalizeSpeciesName(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('pt-BR');
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  list: { padding: theme.spacing.md, gap: theme.spacing.md, paddingBottom: theme.spacing.lg, flexGrow: 1 },
  filters: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, gap: theme.spacing.sm },
  filterToggle: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  filterTitle: { flex: 1, fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.textPrimary },
  filterContent: { gap: theme.spacing.sm },
  dateInput: { minHeight: theme.touchTarget, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.md, paddingHorizontal: 12 },
  inputError: { borderColor: theme.colors.danger },
  select: { minHeight: theme.touchTarget, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm },
  selectLabel: { flex: 1, color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.md },
  selectValue: { maxWidth: '52%', color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, textAlign: 'right' },
  switchRow: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.md, paddingHorizontal: theme.spacing.xs },
  switchText: { flex: 1, gap: theme.spacing.xs },
  hint: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.xs },
  filterActions: { flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.xs },
  applyButton: { flex: 1, minHeight: theme.touchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.md, backgroundColor: theme.colors.primary, borderRadius: theme.radius.md },
  applyText: { color: theme.colors.textLight, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  clearButton: { minHeight: theme.touchTarget, alignItems: 'center', justifyContent: 'center', paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md },
  clearText: { color: theme.colors.primary, fontSize: theme.fonts.sizes.md, fontWeight: '600' },
  footer: { alignItems: 'center', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm },
  loadMoreButton: { minHeight: theme.touchTarget, minWidth: 170, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.primary, borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md },
  errorText: { color: theme.colors.danger, fontSize: theme.fonts.sizes.sm, lineHeight: 20, textAlign: 'center' },
  speciesError: { gap: theme.spacing.xs, paddingHorizontal: theme.spacing.xs },
  retryText: { color: theme.colors.primary, fontSize: theme.fonts.sizes.sm, fontWeight: '600' },
  pressed: { opacity: 0.65 },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  optionList: { padding: theme.spacing.md, gap: theme.spacing.sm },
  option: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  optionText: { flex: 1, color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.md },
});
