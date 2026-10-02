import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable, useWindowDimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchSightings, SightingResponse } from '../../services/sightings';
import { theme } from '../../constants/theme';
import ActivityChart, { ChartPoint } from '../../components/ActivityChart';
import IconButton from '../../components/IconButton';
import ScreenHeader from '../../components/ScreenHeader';
import ScreenState from '../../components/ScreenState';

type PeriodDays = 7 | 30 | 90;

interface DashboardStats {
  totalSightings: number;
  uniqueSpecies: number;
  totalDelta: number | null;
  newSpecies: number;
  weekData: ChartPoint[];
  hourData: ChartPoint[];
  hasData: boolean;
}

const PERIOD_LABELS: Record<PeriodDays, string> = {
  7: 'Últimos 7 dias',
  30: 'Últimos 30 dias',
  90: 'Últimos 90 dias',
};

const PERIOD_OPTIONS: PeriodDays[] = [7, 30, 90];

const HOUR_BUCKETS: { label: string; hour: number }[] = [
  { label: '06h', hour: 6 },
  { label: '09h', hour: 9 },
  { label: '12h', hour: 12 },
  { label: '15h', hour: 15 },
  { label: '18h', hour: 18 },
  { label: '21h', hour: 21 },
];

/**
 * Converte uma string "YYYY-MM-DD" para um Date no fuso local
 * (evita o shift de timezone do parseISO/new Date direto).
 */
function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const parts = value.split('-').map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return null;
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

/** Diferença em dias (inteiros) entre dois Dates locais. */
function diffInDays(a: Date, b: Date): number {
  const ms = a.getTime() - b.getTime();
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

/** Retorna o índice (0..5) do balde de horário mais próximo. */
function bucketIndexForHour(hour: number): number {
  // baldes a cada 3h começando em 06h
  const idx = Math.round((hour - 6) / 3);
  if (idx < 0) return 0;
  if (idx > HOUR_BUCKETS.length - 1) return HOUR_BUCKETS.length - 1;
  return idx;
}

/**
 * Filtra os avistamentos cujos `date` caem em [from, to] (inclusivo).
 */
function filterByRange(
  sightings: SightingResponse[],
  from: Date,
  to: Date
): SightingResponse[] {
  return sightings.filter((s) => {
    const d = parseLocalDate(s.date);
    if (!d) return false;
    return d.getTime() >= from.getTime() && d.getTime() <= to.getTime();
  });
}

/**
 * Calcula o conjunto de estatísticas exibidas no dashboard a partir de
 * uma lista bruta de avistamentos vinda do backend.
 */
function computeStats(
  sightings: SightingResponse[],
  period: PeriodDays
): DashboardStats {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const periodStart = new Date(today);
  periodStart.setDate(today.getDate() - (period - 1));

  const previousEnd = new Date(periodStart);
  previousEnd.setDate(previousEnd.getDate() - 1);

  const previousStart = new Date(previousEnd);
  previousStart.setDate(previousStart.getDate() - (period - 1));

  const currentRange = filterByRange(sightings, periodStart, today);
  const previousRange = filterByRange(sightings, previousStart, previousEnd);

  const totalSightings = currentRange.length;
  const previousTotal = previousRange.length;

  const currentSpeciesIds = new Set<string>();
  currentRange.forEach((s) =>
    s.species.forEach((sp) => {
      if (sp.id != null) currentSpeciesIds.add(sp.id);
    })
  );

  const previousSpeciesIds = new Set<string>();
  previousRange.forEach((s) =>
    s.species.forEach((sp) => {
      if (sp.id != null) previousSpeciesIds.add(sp.id);
    })
  );

  const newSpecies = Array.from(currentSpeciesIds).filter(
    (id) => !previousSpeciesIds.has(id)
  ).length;

  const totalDelta =
    previousTotal > 0
      ? Math.round(((totalSightings - previousTotal) / previousTotal) * 100)
      : null;

  // Bar chart: 7 baldes sempre (um por dia em 7d, ou janelas iguais em 30/90d).
  const buckets = 7;
  const daysPerBucket = Math.ceil(period / buckets);
  const weekData: ChartPoint[] = [];
  for (let i = 0; i < buckets; i++) {
    const start = new Date(periodStart);
    start.setDate(periodStart.getDate() + i * daysPerBucket);
    let end = new Date(start);
    end.setDate(start.getDate() + daysPerBucket - 1);
    if (end.getTime() > today.getTime()) end = today;
    if (start.getTime() > today.getTime()) {
      // bucket fora do range válido (acontece em períodos curtos arredondados)
      weekData.push({
        label: format(start, period === 7 ? 'EEEEEE' : 'dd/MM', { locale: ptBR }),
        value: 0,
      });
      continue;
    }
    const slice = filterByRange(currentRange, start, end);
    const value = slice.length;
    const label =
      period === 7
        ? format(start, 'EEEEEE', { locale: ptBR })
        : format(start, 'dd/MM', { locale: ptBR });
    weekData.push({ label, value });
  }

  // Line chart: baldes de horário ao longo de todo o período.
  const hourTotals = HOUR_BUCKETS.map((b) => ({ label: b.label, value: 0 }));
  currentRange.forEach((s) => {
    if (!s.time) return;
    const hour = Number(s.time.slice(0, 2));
    if (Number.isNaN(hour)) return;
    const idx = bucketIndexForHour(hour);
    hourTotals[idx].value += 1;
  });

  return {
    totalSightings,
    uniqueSpecies: currentSpeciesIds.size,
    totalDelta,
    newSpecies,
    weekData,
    hourData: hourTotals,
    hasData: currentRange.length > 0,
  };
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
  badge,
  badgeTone = 'positive',
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  value: string;
  label: string;
  badge?: string;
  badgeTone?: 'positive' | 'negative' | 'neutral';
}) {
  const badgePalette = {
    positive: { bg: theme.colors.infoSurface, color: theme.colors.primary, icon: 'trending-up' as const },
    negative: { bg: theme.colors.dangerSurface, color: theme.colors.danger, icon: 'trending-down' as const },
    neutral: { bg: theme.colors.background, color: theme.colors.textSecondary, icon: 'remove-outline' as const },
  }[badgeTone];
  const { fontScale } = useWindowDimensions();

  return (
    <View accessible accessibilityLabel={`${label}: ${value}${badge ? `, ${badge}` : ''}`} style={[styles.statCard, { flexBasis: 144 * fontScale }]}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={24} color={theme.colors.primary} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {badge ? (
        <View style={[styles.statBadge, { backgroundColor: badgePalette.bg }]}>
          <Ionicons name={badgePalette.icon} size={11} color={badgePalette.color} />
          <Text style={[styles.statBadgeText, { color: badgePalette.color }]}>{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}

export default function StatisticsScreen() {
  const [sightings, setSightings] = useState<SightingResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<PeriodDays>(7);

  const loadSightings = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    const result = await fetchSightings();
    if (result.success && result.data) {
      setSightings(result.data);
      setError(null);
    } else {
      setSightings([]);
      setError(result.message ?? 'Erro ao carregar avistamentos.');
    }
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    loadSightings();
  }, [loadSightings]);

  const stats = useMemo(() => computeStats(sightings, period), [sightings, period]);

  const renderTotalBadge = () => {
    if (stats.totalSightings === 0) return undefined;
    if (stats.totalDelta === null) return 'Novo';
    const sign = stats.totalDelta >= 0 ? '+' : '';
    return `${sign}${stats.totalDelta}%`;
  };

  const totalBadgeTone: 'positive' | 'negative' | 'neutral' =
    stats.totalDelta === null
      ? 'neutral'
      : stats.totalDelta >= 0
      ? 'positive'
      : 'negative';

  const renderSpeciesBadge = () => {
    if (stats.uniqueSpecies === 0) return undefined;
    if (stats.newSpecies === 0) return 'Estável';
    return `+${stats.newSpecies} ${stats.newSpecies === 1 ? 'nova' : 'novas'}`;
  };

  const speciesBadgeTone: 'positive' | 'neutral' =
    stats.newSpecies > 0 ? 'positive' : 'neutral';

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing.lg }}>

        <ScreenHeader title="Estatísticas" subtitle={PERIOD_LABELS[period]}
          actions={<IconButton icon="refresh" label="Atualizar estatísticas" onPress={() => loadSightings(true)} disabled={loading} loading={refreshing} />}
        >
          <View style={styles.headerFilters}>
            {PERIOD_OPTIONS.map((days) => (
              <Pressable key={days} accessibilityRole="button" accessibilityLabel={PERIOD_LABELS[days]} accessibilityState={{ selected: period === days }}
                style={[styles.filterChip, period === days && styles.filterChipSelected]} onPress={() => setPeriod(days)}>
                <Text style={[styles.filterChipText, period === days && styles.filterChipSelectedText]}>{days} dias</Text>
              </Pressable>
            ))}
          </View>
        </ScreenHeader>

        <View style={styles.content}>

          {loading ? (
            <ScreenState loading title="Carregando estatísticas..." />
          ) : error ? (
            <ScreenState title="Não foi possível carregar" message={error} icon="cloud-offline-outline" actionLabel="Tentar novamente" onAction={() => loadSightings()} />
          ) : (
            <>
              <View style={styles.statsGrid}>
                <StatCard
                  icon="egg-outline"
                  iconBg={theme.colors.background}
                  value={String(stats.totalSightings)}
                  label="Total de Avistamentos"
                  badge={renderTotalBadge()}
                  badgeTone={totalBadgeTone}
                />
                <StatCard
                  icon="pulse-outline"
                  iconBg={theme.colors.primaryLight}
                  value={String(stats.uniqueSpecies)}
                  label="Espécies Diferentes"
                  badge={renderSpeciesBadge()}
                  badgeTone={speciesBadgeTone}
                />
              </View>

              {!stats.hasData ? (
                <ScreenState title="Sem avistamentos no período" message={`Não há avistamentos registrados nos ${period} dias selecionados. Tente outro período.`} />
              ) : (
                <>
                  <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                      <View style={styles.chartTitles}>
                        <Text style={styles.chartTitle}>Visitas por período</Text>
                        <Text style={styles.chartSubtitle}>
                          {period === 7
                            ? 'Distribuição diária (últimos 7 dias)'
                            : `Distribuição em 7 janelas (últimos ${period} dias)`}
                        </Text>
                      </View>
                      <View style={styles.chartIcon}>
                        <Ionicons name="bar-chart-outline" size={20} color={theme.colors.primary} />
                      </View>
                    </View>
                    <ActivityChart key={`period-${period}`} title="Visitas por período" data={stats.weekData} variant="bar" />
                  </View>

                  <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                      <View style={styles.chartTitles}>
                        <Text style={styles.chartTitle}>Horários de pico</Text>
                        <Text style={styles.chartSubtitle}>
                          Avistamentos por faixa horária
                        </Text>
                      </View>
                      <View style={styles.chartIcon}>
                        <Ionicons name="time-outline" size={20} color={theme.colors.primary} />
                      </View>
                    </View>
                    <ActivityChart key={`hours-${period}`} title="Horários de pico" data={stats.hourData} variant="line" />
                  </View>
                </>
              )}
            </>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  headerFilters: { flexDirection: 'row', gap: theme.spacing.sm, flexWrap: 'wrap' },
  filterChip: { minHeight: theme.touchTarget, justifyContent: 'center', paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.sm, borderRadius: theme.radius.md, backgroundColor: theme.colors.background },
  filterChipSelected: { backgroundColor: theme.colors.primary },
  filterChipText: { color: theme.colors.textSecondary, fontSize: theme.fonts.sizes.sm, fontWeight: '600' },
  filterChipSelectedText: { color: theme.colors.textLight },
  content: { padding: theme.spacing.md, gap: theme.spacing.md },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: {
    flexGrow: 1, backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg,
    padding: theme.spacing.md, gap: theme.spacing.xs,
    borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  statValue: { fontSize: theme.fonts.sizes.xxl, fontWeight: '700', color: theme.colors.textPrimary },
  statLabel: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    alignSelf: 'flex-start', marginTop: 6, flexWrap: 'wrap',
  },
  statBadgeText: { fontSize: theme.fonts.sizes.xs, fontWeight: '600', flexShrink: 1 },
  chartCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.lg, padding: theme.spacing.md, borderWidth: StyleSheet.hairlineWidth, borderColor: theme.colors.border },
  chartHeader: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.sm, marginBottom: theme.spacing.lg },
  chartTitles: { flex: 1, gap: theme.spacing.xs },
  chartTitle: { fontSize: theme.fonts.sizes.lg, fontWeight: '700', color: theme.colors.textPrimary },
  chartSubtitle: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
  chartIcon: { width: 36, height: 36, borderRadius: theme.radius.md, backgroundColor: theme.colors.infoSurface, alignItems: 'center', justifyContent: 'center' },
});
