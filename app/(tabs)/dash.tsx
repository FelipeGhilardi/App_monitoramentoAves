import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Dimensions, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { fetchSightings, SightingResponse } from '../../services/sightings';

const { width } = Dimensions.get('window');
const chartWidth = width - 64;

type PeriodDays = 7 | 30 | 90;

interface ChartPoint {
  label: string;
  value: number;
}

interface DashboardStats {
  totalBirds: number;
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

const PERIOD_CYCLE: PeriodDays[] = [7, 30, 90];

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

/** Soma a quantidade de aves de um avistamento. */
function sumBirds(sighting: SightingResponse): number {
  return sighting.species.reduce(
    (acc, entry) => acc + (Number(entry.quantity) || 0),
    0
  );
}

/** Retorna o índice (0..5) do balde de horário mais próximo. */
function bucketIndexForHour(hour: number): number {
  // baldes a cada 3h começando em 06h
  const idx = Math.round((hour - 6) / 3);
  if (idx < 0) return 0;
  if (idx > HOUR_BUCKETS.length - 1) return HOUR_BUCKETS.length - 1;
  return idx;
}

/** Arredonda um valor máximo para um "nice number" próximo. */
function niceCeil(value: number): number {
  if (value <= 0) return 5;
  const exp = Math.floor(Math.log10(value));
  const pow = Math.pow(10, exp);
  const norm = value / pow;
  let nice: number;
  if (norm <= 1) nice = 1;
  else if (norm <= 2) nice = 2;
  else if (norm <= 5) nice = 5;
  else nice = 10;
  return nice * pow;
}

/** Gera 5 labels do eixo Y a partir do valor máximo (0..maxNice). */
function buildYAxis(maxValue: number): number[] {
  const top = Math.max(niceCeil(maxValue), 4);
  return [0, 1, 2, 3, 4].map((i) => Math.round((top * i) / 4));
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

  const totalBirds = currentRange.reduce((acc, s) => acc + sumBirds(s), 0);
  const previousTotal = previousRange.reduce((acc, s) => acc + sumBirds(s), 0);

  const currentSpeciesIds = new Set<number>();
  currentRange.forEach((s) =>
    s.species.forEach((entry) => {
      if (entry.species?.id != null) currentSpeciesIds.add(entry.species.id);
    })
  );

  const previousSpeciesIds = new Set<number>();
  previousRange.forEach((s) =>
    s.species.forEach((entry) => {
      if (entry.species?.id != null) previousSpeciesIds.add(entry.species.id);
    })
  );

  const newSpecies = Array.from(currentSpeciesIds).filter(
    (id) => !previousSpeciesIds.has(id)
  ).length;

  const totalDelta =
    previousTotal > 0
      ? Math.round(((totalBirds - previousTotal) / previousTotal) * 100)
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
    const value = slice.reduce((acc, s) => acc + sumBirds(s), 0);
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
    hourTotals[idx].value += sumBirds(s);
  });

  return {
    totalBirds,
    uniqueSpecies: currentSpeciesIds.size,
    totalDelta,
    newSpecies,
    weekData,
    hourData: hourTotals,
    hasData: currentRange.length > 0,
  };
}

function BarChart({ data }: { data: ChartPoint[] }) {
  const [tooltip, setTooltip] = useState<number | null>(null);
  const chartHeight = 180;
  const yLabels = buildYAxis(Math.max(...data.map((d) => d.value), 0));
  const topValue = yLabels[yLabels.length - 1];
  const yReversed = [...yLabels].reverse();

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 28, height: chartHeight, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4 }}>
          {yReversed.map((l, i) => (
            <Text key={`${l}-${i}`} style={chart.axisLabel}>{l}</Text>
          ))}
        </View>

        <View style={{ flex: 1, height: chartHeight, position: 'relative' }}>
          {yReversed.map((_, i) => (
            <View key={i} style={[chart.gridLine, { top: (i / (yReversed.length - 1)) * chartHeight }]} />
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, gap: 4 }}>
            {data.map((item, i) => {
              const ratio = topValue > 0 ? item.value / topValue : 0;
              const barH = Math.max(ratio * (chartHeight - 20), item.value > 0 ? 4 : 0);
              const isSelected = tooltip === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartHeight }}
                  onPress={() => setTooltip(isSelected ? null : i)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    chart.bar,
                    { height: barH, backgroundColor: isSelected ? '#6b7280' : '#1f2937' },
                  ]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {tooltip !== null && (
            <View style={[chart.tooltip, {
              left: Math.min(Math.max((tooltip / data.length) * (chartWidth - 28) - 30, 0), chartWidth - 150),
              top: 10,
            }]}>
              <Text style={chart.tooltipTitle}>{data[tooltip].label}</Text>
              <Text style={chart.tooltipValue}>
                {data[tooltip].value} {data[tooltip].value === 1 ? 'ave' : 'aves'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingLeft: 28, marginTop: 6 }}>
        {data.map((item, i) => (
          <Text key={i} style={[chart.axisLabel, { flex: 1, textAlign: 'center' }]}>{item.label}</Text>
        ))}
      </View>
    </View>
  );
}

function LineChart({ data }: { data: ChartPoint[] }) {
  const [tooltip, setTooltip] = useState<number | null>(null);
  const chartHeight = 140;
  const pointSpacing = (chartWidth - 28) / Math.max(data.length - 1, 1);

  const maxValue = Math.max(...data.map((d) => d.value), 0);
  const yLabels = buildYAxis(maxValue);
  const topValue = yLabels[yLabels.length - 1];
  const yReversed = [...yLabels].reverse();

  const getY = (value: number) => {
    if (topValue <= 0) return chartHeight - 10;
    const ratio = value / topValue;
    return chartHeight - ratio * (chartHeight - 20) - 10;
  };

  const points = data.map((d, i) => ({
    x: i * pointSpacing,
    y: getY(d.value),
    label: d.label,
    value: d.value,
  }));

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        <View style={{ width: 28, height: chartHeight, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4 }}>
          {yReversed.map((l, i) => (
            <Text key={`${l}-${i}`} style={chart.axisLabel}>{l}</Text>
          ))}
        </View>

        <View style={{ flex: 1, height: chartHeight, position: 'relative' }}>
          {yReversed.map((_, i) => (
            <View key={i} style={[chart.gridLine, { top: (i / (yReversed.length - 1)) * chartHeight }]} />
          ))}

          {points.slice(0, -1).map((point, i) => {
            const next = points[i + 1];
            const dx = next.x - point.x;
            const dy = next.y - point.y;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View key={i} style={[chart.line, {
                width: length,
                left: point.x,
                top: point.y,
                transform: [{ rotate: `${angle}deg` }],
              }]} />
            );
          })}

          {points.map((point, i) => (
            <TouchableOpacity
              key={i}
              style={[chart.point, { left: point.x - 6, top: point.y - 6 }]}
              onPress={() => setTooltip(tooltip === i ? null : i)}
              activeOpacity={0.7}
            />
          ))}

          {tooltip !== null && (
            <View style={[chart.tooltip, {
              left: Math.min(Math.max(points[tooltip].x - 40, 0), chartWidth - 150),
              top: Math.max(points[tooltip].y - 50, 0),
            }]}>
              <Text style={chart.tooltipTitle}>{points[tooltip].label}</Text>
              <Text style={chart.tooltipValue}>
                {points[tooltip].value} {points[tooltip].value === 1 ? 'ave' : 'aves'}
              </Text>
            </View>
          )}
        </View>
      </View>

      <View style={{ flexDirection: 'row', paddingLeft: 28, marginTop: 6 }}>
        {data.map((item, i) => (
          <Text key={i} style={[chart.axisLabel, { flex: 1, textAlign: 'center' }]}>{item.label}</Text>
        ))}
      </View>
    </View>
  );
}

function StatCard({
  icon,
  iconBg,
  value,
  label,
  badge,
  badgeTone = 'positive',
}: {
  icon: string;
  iconBg: string;
  value: string;
  label: string;
  badge?: string;
  badgeTone?: 'positive' | 'negative' | 'neutral';
}) {
  const badgePalette = {
    positive: { bg: '#eff6ff', color: '#2563eb', icon: 'trending-up' as const },
    negative: { bg: '#fef2f2', color: '#dc2626', icon: 'trending-down' as const },
    neutral: { bg: '#f3f4f6', color: '#4b5563', icon: 'remove-outline' as const },
  }[badgeTone];

  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color="#000" />
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

export default function TVScreen() {
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

  const cyclePeriod = () => {
    const idx = PERIOD_CYCLE.indexOf(period);
    setPeriod(PERIOD_CYCLE[(idx + 1) % PERIOD_CYCLE.length]);
  };

  const renderTotalBadge = () => {
    if (stats.totalBirds === 0) return undefined;
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
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={() => loadSightings(true)}
              disabled={loading || refreshing}
            >
              {refreshing ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Ionicons name="refresh" size={20} color="white" />
              )}
            </TouchableOpacity>
          </View>
          <View style={styles.headerFilters}>
            <TouchableOpacity
              style={styles.filterChip}
              onPress={cyclePeriod}
              activeOpacity={0.8}
            >
              <Ionicons name="calendar-outline" size={14} color="white" />
              <Text style={styles.filterChipText}>{PERIOD_LABELS[period]}</Text>
              <Ionicons name="chevron-down" size={12} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.content}>

          {loading ? (
            <View style={styles.statusBox}>
              <ActivityIndicator color="#2563eb" />
              <Text style={styles.statusText}>Carregando dashboard...</Text>
            </View>
          ) : error ? (
            <View style={styles.statusBox}>
              <Ionicons name="cloud-offline-outline" size={32} color="rgba(0,0,0,0.4)" />
              <Text style={styles.statusText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={() => loadSightings()}>
                <Text style={styles.retryBtnText}>Tentar novamente</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.statsGrid}>
                <StatCard
                  icon="egg-outline"
                  iconBg="#f3f4f6"
                  value={String(stats.totalBirds)}
                  label="Total de Pássaros"
                  badge={renderTotalBadge()}
                  badgeTone={totalBadgeTone}
                />
                <StatCard
                  icon="pulse-outline"
                  iconBg="#dbeafe"
                  value={String(stats.uniqueSpecies)}
                  label="Espécies Diferentes"
                  badge={renderSpeciesBadge()}
                  badgeTone={speciesBadgeTone}
                />
              </View>

              {!stats.hasData ? (
                <View style={styles.emptyCard}>
                  <Ionicons name="leaf-outline" size={36} color="rgba(0,0,0,0.3)" />
                  <Text style={styles.emptyTitle}>Sem avistamentos no período</Text>
                  <Text style={styles.emptyText}>
                    Não há avistamentos registrados nos {period} dias selecionados.
                    Tente outro período ou registre novos avistamentos.
                  </Text>
                </View>
              ) : (
                <>
                  <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                      <View>
                        <Text style={styles.chartTitle}>Visitas por período</Text>
                        <Text style={styles.chartSubtitle}>
                          {period === 7
                            ? 'Distribuição diária (últimos 7 dias)'
                            : `Distribuição em 7 janelas (últimos ${period} dias)`}
                        </Text>
                      </View>
                      <View style={styles.chartIconBtn}>
                        <Ionicons name="bar-chart-outline" size={16} color="#000" />
                      </View>
                    </View>
                    <BarChart data={stats.weekData} />
                  </View>

                  <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                      <View>
                        <Text style={styles.chartTitle}>Horários de pico</Text>
                        <Text style={styles.chartSubtitle}>
                          Aves avistadas por faixa horária
                        </Text>
                      </View>
                      <View style={[styles.chartIconBtn, { backgroundColor: '#dbeafe' }]}>
                        <Ionicons name="time-outline" size={16} color="#000" />
                      </View>
                    </View>
                    <LineChart data={stats.hourData} />
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
  container: { flex: 1, backgroundColor: '#f3f4f6' },

  header: {
    backgroundColor: '#000',
    paddingTop: 56, paddingBottom: 28,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold', color: 'white' },
  refreshBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerFilters: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#1f2937',
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  filterChipText: { color: 'white', fontSize: 13, fontWeight: '500' },

  content: { padding: 16, gap: 16, marginTop: -8 },

  statsGrid: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, backgroundColor: 'white', borderRadius: 20,
    padding: 18, shadowColor: '#000', shadowOpacity: 0.06,
    shadowRadius: 6, elevation: 3, gap: 4,
  },
  statIcon: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  statValue: { fontSize: 30, fontWeight: 'bold', color: '#000' },
  statLabel: { fontSize: 12, color: 'rgba(0,0,0,0.5)', fontWeight: '500' },
  statBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    alignSelf: 'flex-start', marginTop: 6,
  },
  statBadgeText: { fontSize: 11, fontWeight: 'bold' },

  chartCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  chartSubtitle: { fontSize: 11, color: 'rgba(0,0,0,0.5)', marginTop: 2 },
  chartIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
  },

  statusBox: {
    backgroundColor: 'white', borderRadius: 20, padding: 28,
    alignItems: 'center', justifyContent: 'center', gap: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  statusText: { fontSize: 13, color: 'rgba(0,0,0,0.6)', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 20, marginTop: 4,
  },
  retryBtnText: { color: 'white', fontWeight: 'bold', fontSize: 13 },

  emptyCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 28,
    alignItems: 'center', justifyContent: 'center', gap: 8,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  emptyTitle: { fontSize: 15, fontWeight: 'bold', color: '#000', marginTop: 6 },
  emptyText: {
    fontSize: 12, color: 'rgba(0,0,0,0.5)',
    textAlign: 'center', lineHeight: 18,
  },
});

const chart = StyleSheet.create({
  axisLabel: { fontSize: 10, color: 'rgba(0,0,0,0.4)' },
  gridLine: {
    position: 'absolute', left: 0, right: 0,
    height: 1, backgroundColor: '#f0f0f0',
  },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  line: {
    position: 'absolute', height: 3,
    backgroundColor: '#3b82f6', borderRadius: 2,
    transformOrigin: 'left center',
  },
  point: {
    position: 'absolute', width: 12, height: 12,
    borderRadius: 6, backgroundColor: '#3b82f6',
    borderWidth: 2, borderColor: 'white',
  },
  tooltip: {
    position: 'absolute', backgroundColor: 'white',
    borderRadius: 10, padding: 10,
    shadowColor: '#000', shadowOpacity: 0.15,
    shadowRadius: 8, elevation: 5,
    minWidth: 110, zIndex: 10,
  },
  tooltipTitle: { fontSize: 13, fontWeight: 'bold', color: '#000' },
  tooltipValue: { fontSize: 13, color: '#3b82f6', fontWeight: '600', marginTop: 2 },
});
