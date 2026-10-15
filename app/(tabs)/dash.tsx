import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ActivityChart from '../../components/ActivityChart';
import IconButton from '../../components/IconButton';
import ScreenHeader from '../../components/ScreenHeader';
import ScreenState from '../../components/ScreenState';
import { theme } from '../../constants/theme';
import {
  DashboardPeriod, DashboardResponse, DashboardSpeciesCount, fetchDashboard,
} from '../../services/dashboard';
import { subscribeToSightingChanges } from '../../services/sighting-events';

const PERIOD_OPTIONS: { id: DashboardPeriod; label: string; compactLabel: string }[] = [
  { id: '7', label: 'Últimos 7 dias', compactLabel: '7 dias' },
  { id: '30', label: 'Últimos 30 dias', compactLabel: '30 dias' },
  { id: '90', label: 'Últimos 90 dias', compactLabel: '90 dias' },
  { id: '180', label: 'Últimos 180 dias', compactLabel: '180 dias' },
  { id: '365', label: 'Últimos 365 dias', compactLabel: '365 dias' },
  { id: 'all', label: 'Todo o histórico', compactLabel: 'Histórico' },
];
const MAX_SPECIES_IN_CHART = 10;

function StatCard({
  icon, iconBg, value, label, detail,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  value: string;
  label: string;
  detail?: string;
}) {
  return (
    <View accessible accessibilityLabel={`${label}: ${value}${detail ? `, ${detail}` : ''}`} style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <Text numberOfLines={2} style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {detail && <Text style={styles.statDetail}>{detail}</Text>}
    </View>
  );
}

function ChartCard({
  title, subtitle, icon, children,
}: {
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  children: ReactNode;
}) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <View style={styles.chartTitles}>
          <Text style={styles.chartTitle}>{title}</Text>
          <Text style={styles.chartSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.chartIcon}>
          <Ionicons name={icon} size={20} color={theme.colors.primary} />
        </View>
      </View>
      {children}
    </View>
  );
}

function SpeciesPicker({
  visible, species, selectedSpeciesId, onSelect, onClose,
}: {
  visible: boolean;
  species: DashboardSpeciesCount[];
  selectedSpeciesId: string | null;
  onSelect: (speciesId: string | null) => void;
  onClose: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaProvider>
        <SafeAreaView style={styles.modalContainer}>
          <ScreenHeader title="Frequência por espécie" onBack={onClose} />
          <ScrollView contentContainerStyle={styles.optionList}>
            <Pressable
              accessibilityRole="radio"
              accessibilityLabel="Todas as espécies identificadas"
              accessibilityState={{ selected: selectedSpeciesId === null }}
              onPress={() => { onSelect(null); onClose(); }}
              style={({ pressed }) => [styles.option, pressed && styles.pressed]}
            >
              <Text style={styles.optionText}>Todas as espécies identificadas</Text>
              {selectedSpeciesId === null && <Ionicons name="checkmark" size={22} color={theme.colors.primary} />}
            </Pressable>
            {species.map((item) => {
              const selected = item.id === selectedSpeciesId;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="radio"
                  accessibilityLabel={item.name}
                  accessibilityState={{ selected }}
                  onPress={() => { onSelect(item.id); onClose(); }}
                  style={({ pressed }) => [styles.option, pressed && styles.pressed]}
                >
                  <View style={styles.optionTextContainer}>
                    <Text style={styles.optionText}>{item.name}</Text>
                    <Text style={styles.optionCount}>{item.count} {item.count === 1 ? 'avistamento' : 'avistamentos'}</Text>
                  </View>
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

export default function StatisticsScreen() {
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<DashboardPeriod>('7');
  const [selectedSpeciesId, setSelectedSpeciesId] = useState<string | null>(null);
  const [speciesPickerVisible, setSpeciesPickerVisible] = useState(false);

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    const result = await fetchDashboard(period, selectedSpeciesId);
    if (result.success && result.data) {
      setDashboard(result.data);
      setError(null);
    } else {
      setDashboard(null);
      setError(result.message ?? 'Erro ao carregar estatísticas.');
    }

    if (isRefresh) setRefreshing(false);
    else setLoading(false);
  }, [period, selectedSpeciesId]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  useEffect(() => subscribeToSightingChanges(() => { void loadDashboard(true); }), [loadDashboard]);

  const selectedPeriod = PERIOD_OPTIONS.find((option) => option.id === period)!;
  const selectedSpecies = dashboard?.species.find((item) => item.id === selectedSpeciesId);
  const leadingSpecies = dashboard?.leadingSpecies ?? [];
  const leadingSpeciesNames = leadingSpecies.map((item) => item.name).join(' e ');
  const leadingCount = leadingSpecies[0]?.count;
  const chartSpecies = dashboard?.species.slice(0, MAX_SPECIES_IN_CHART) ?? [];
  const hasData = Boolean(dashboard && dashboard.totalSightings > 0);

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <ScreenHeader
          title="Estatísticas"
          subtitle={selectedPeriod.label}
          actions={(
            <IconButton
              icon="refresh"
              label="Atualizar estatísticas"
              onPress={() => void loadDashboard(true)}
              disabled={loading || refreshing}
              loading={refreshing}
            />
          )}
        >
          <View style={styles.headerFilters}>
            {PERIOD_OPTIONS.map((option) => {
              const selected = period === option.id;
              return (
                <Pressable
                  key={option.id}
                  accessibilityRole="button"
                  accessibilityLabel={option.label}
                  accessibilityState={{ selected }}
                  onPress={() => setPeriod(option.id)}
                  style={({ pressed }) => [
                    styles.filterChip,
                    selected && styles.filterChipSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.filterChipText, selected && styles.filterChipSelectedText]}>
                    {option.compactLabel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScreenHeader>

        <View style={styles.content}>
          {loading ? (
            <ScreenState loading title="Carregando estatísticas..." />
          ) : error ? (
            <ScreenState
              title="Não foi possível carregar"
              message={error}
              icon="cloud-offline-outline"
              actionLabel="Tentar novamente"
              onAction={() => void loadDashboard()}
            />
          ) : !hasData ? (
            <ScreenState
              title="Sem avistamentos identificados no período"
              message={`Não há avistamentos identificados em ${selectedPeriod.label.toLocaleLowerCase('pt-BR')}. Tente outro período.`}
            />
          ) : (
            <>
              <View style={styles.statsGrid}>
                <StatCard
                  icon="eye-outline"
                  iconBg={theme.colors.background}
                  value={String(dashboard!.totalSightings)}
                  label="Total de avistamentos"
                />
                <StatCard
                  icon="leaf-outline"
                  iconBg={theme.colors.primaryLight}
                  value={String(dashboard!.uniqueSpecies)}
                  label="Espécies diferentes"
                />
                {leadingCount !== undefined && (
                  <StatCard
                    icon="trophy-outline"
                    iconBg={theme.colors.infoSurface}
                    value={leadingSpeciesNames}
                    label="Espécie mais avistada"
                    detail={`${leadingCount} ${leadingCount === 1 ? 'avistamento' : 'avistamentos'}`}
                  />
                )}
              </View>

              <ChartCard
                title="Visitas por período"
                subtitle="Tendência de avistamentos identificados"
                icon="bar-chart-outline"
              >
                <ActivityChart
                  key={`trend-${period}`}
                  title="Visitas por período"
                  data={dashboard!.trend}
                  variant="bar"
                />
              </ChartCard>

              <ChartCard
                title="Avistamentos por espécie"
                subtitle={dashboard!.species.length > MAX_SPECIES_IN_CHART
                  ? `As ${MAX_SPECIES_IN_CHART} espécies mais avistadas`
                  : 'Comparação entre espécies identificadas'}
                icon="list-outline"
              >
                <ActivityChart
                  key={`species-${period}`}
                  title="Avistamentos por espécie"
                  data={chartSpecies.map((item) => ({ label: item.name, value: item.count }))}
                  valuesData={dashboard!.species.map((item) => ({ label: item.name, value: item.count }))}
                  variant="bar"
                />
              </ChartCard>

              <ChartCard
                title="Frequência por hora"
                subtitle={selectedSpecies ? selectedSpecies.name : 'Todas as espécies identificadas'}
                icon="time-outline"
              >
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Selecionar espécie para frequência por hora"
                  accessibilityValue={{ text: selectedSpecies?.name ?? 'Todas as espécies identificadas' }}
                  onPress={() => setSpeciesPickerVisible(true)}
                  style={({ pressed }) => [styles.speciesSelector, pressed && styles.pressed]}
                >
                  <Text numberOfLines={1} style={styles.speciesSelectorText}>
                    {selectedSpecies?.name ?? 'Todas as espécies identificadas'}
                  </Text>
                  <Ionicons name="chevron-down" size={20} color={theme.colors.textSecondary} />
                </Pressable>
                <ActivityChart
                  key={`hourly-${period}-${selectedSpeciesId ?? 'all'}`}
                  title="Frequência por hora"
                  data={dashboard!.hourly}
                  variant="line"
                />
              </ChartCard>
            </>
          )}
        </View>
      </ScrollView>
      <SpeciesPicker
        visible={speciesPickerVisible}
        species={dashboard?.species ?? []}
        selectedSpeciesId={selectedSpeciesId}
        onSelect={setSelectedSpeciesId}
        onClose={() => setSpeciesPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: { paddingBottom: theme.spacing.lg },
  headerFilters: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  filterChip: { minHeight: theme.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  filterChipSelected: { backgroundColor: theme.colors.primary },
  filterChipText: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, fontWeight: '600' },
  filterChipSelectedText: { color: theme.colors.textLight },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.sm },
  statCard: { flexGrow: 1, flexBasis: 144, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, gap: theme.spacing.xs, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  statIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: theme.spacing.xs },
  statValue: { fontSize: theme.fonts.sizes.xl, fontWeight: '700', color: theme.colors.textPrimary },
  statLabel: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
  statDetail: { fontSize: theme.fonts.sizes.xs, color: theme.colors.primaryDark, fontWeight: '600' },
  chartCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  chartTitles: { flex: 1, gap: theme.spacing.xs },
  chartTitle: { fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.textPrimary },
  chartSubtitle: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
  chartIcon: { width: 36, height: 36, borderRadius: theme.radius.md, backgroundColor: theme.colors.infoSurface, alignItems: 'center', justifyContent: 'center' },
  speciesSelector: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.md, paddingHorizontal: theme.spacing.md, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md },
  speciesSelectorText: { flex: 1, color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.md },
  modalContainer: { flex: 1, backgroundColor: theme.colors.background },
  optionList: { padding: theme.spacing.md, gap: theme.spacing.sm },
  option: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, padding: theme.spacing.md, borderRadius: theme.radius.md, backgroundColor: theme.colors.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  optionTextContainer: { flex: 1, gap: theme.spacing.xs },
  optionText: { flex: 1, color: theme.colors.textPrimary, fontSize: theme.fonts.sizes.md },
  optionCount: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm },
  pressed: { opacity: 0.65 },
});
