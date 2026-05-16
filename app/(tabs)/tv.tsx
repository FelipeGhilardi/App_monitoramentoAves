import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const chartWidth = width - 64;

const activityData = [
  { label: 'Seg', value: 12 },
  { label: 'Ter', value: 19 },
  { label: 'Qua', value: 15 },
  { label: 'Qui', value: 28 },
  { label: 'Sex', value: 22 },
  { label: 'Sáb', value: 35 },
  { label: 'Dom', value: 42 },
];

const timeData = [
  { label: '06:00', value: 80 },
  { label: '09:00', value: 45 },
  { label: '12:00', value: 30 },
  { label: '15:00', value: 65 },
  { label: '18:00', value: 90 },
];

function BarChart({ data }: { data: { label: string; value: number }[] }) {
  const [tooltip, setTooltip] = useState<{ index: number; x: number; y: number } | null>(null);
  const maxValue = Math.max(...data.map(d => d.value));
  const chartHeight = 180;
  const barWidth = (chartWidth / data.length) - 8;
  const yLabels = [0, 15, 30, 45, 60];

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {/* Y axis */}
        <View style={{ width: 28, height: chartHeight, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4 }}>
          {yLabels.reverse().map(l => (
            <Text key={l} style={chart.axisLabel}>{l}</Text>
          ))}
        </View>

        {/* Bars */}
        <View style={{ flex: 1, height: chartHeight, position: 'relative' }}>
          {/* Grid lines */}
          {yLabels.map((l, i) => (
            <View key={i} style={[chart.gridLine, { top: (i / (yLabels.length - 1)) * chartHeight }]} />
          ))}

          <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: chartHeight, gap: 4 }}>
            {data.map((item, i) => {
              const barH = (item.value / maxValue) * (chartHeight - 20);
              const isSelected = tooltip?.index === i;
              return (
                <TouchableOpacity
                  key={i}
                  style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: chartHeight }}
                  onPress={() => setTooltip(isSelected ? null : { index: i, x: i, y: item.value })}
                  activeOpacity={0.7}
                >
                  <View style={[
                    chart.bar,
                    { height: barH, backgroundColor: isSelected ? '#6b7280' : '#1f2937' }
                  ]} />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Tooltip */}
          {tooltip !== null && (
            <View style={[chart.tooltip, {
              left: Math.min(Math.max((tooltip.index / data.length) * (chartWidth - 28) - 30, 0), chartWidth - 120),
              top: 10,
            }]}>
              <Text style={chart.tooltipTitle}>{data[tooltip.index].label}</Text>
              <Text style={chart.tooltipValue}>birds : {data[tooltip.index].value}</Text>
            </View>
          )}
        </View>
      </View>

      {/* X axis */}
      <View style={{ flexDirection: 'row', paddingLeft: 28, marginTop: 6 }}>
        {data.map((item, i) => (
          <Text key={i} style={[chart.axisLabel, { flex: 1, textAlign: 'center' }]}>{item.label}</Text>
        ))}
      </View>
    </View>
  );
}

function LineChart({ data }: { data: { label: string; value: number }[] }) {
  const [tooltip, setTooltip] = useState<number | null>(null);
  const maxValue = Math.max(...data.map(d => d.value));
  const minValue = Math.min(...data.map(d => d.value));
  const chartHeight = 140;
  const pointSpacing = (chartWidth - 28) / (data.length - 1);
  const yLabels = [100, 75, 50, 25, 0];

  const getY = (value: number) =>
    chartHeight - ((value - minValue) / (maxValue - minValue)) * (chartHeight - 20) - 10;

  const points = data.map((d, i) => ({
    x: i * pointSpacing,
    y: getY(d.value),
    label: d.label,
    value: d.value,
  }));

  return (
    <View>
      <View style={{ flexDirection: 'row' }}>
        {/* Y axis */}
        <View style={{ width: 28, height: chartHeight, justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: 4 }}>
          {yLabels.map(l => (
            <Text key={l} style={chart.axisLabel}>{l}</Text>
          ))}
        </View>

        {/* Chart area */}
        <View style={{ flex: 1, height: chartHeight, position: 'relative' }}>
          {/* Grid lines */}
          {yLabels.map((_, i) => (
            <View key={i} style={[chart.gridLine, { top: (i / (yLabels.length - 1)) * chartHeight }]} />
          ))}

          {/* Lines between points */}
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

          {/* Points */}
          {points.map((point, i) => (
            <TouchableOpacity
              key={i}
              style={[chart.point, { left: point.x - 6, top: point.y - 6 }]}
              onPress={() => setTooltip(tooltip === i ? null : i)}
              activeOpacity={0.7}
            />
          ))}

          {/* Tooltip */}
          {tooltip !== null && (
            <View style={[chart.tooltip, {
              left: Math.min(Math.max(points[tooltip].x - 40, 0), chartWidth - 150),
              top: Math.max(points[tooltip].y - 50, 0),
            }]}>
              <Text style={chart.tooltipTitle}>{points[tooltip].label}</Text>
              <Text style={chart.tooltipValue}>activity : {points[tooltip].value}</Text>
            </View>
          )}
        </View>
      </View>

      {/* X axis */}
      <View style={{ flexDirection: 'row', paddingLeft: 28, marginTop: 6 }}>
        {data.map((item, i) => (
          <Text key={i} style={[chart.axisLabel, { flex: 1, textAlign: 'center' }]}>{item.label}</Text>
        ))}
      </View>
    </View>
  );
}

function StatCard({ icon, iconBg, value, label, badge }: {
  icon: string; iconBg: string; value: string; label: string; badge: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: iconBg }]}>
        <Ionicons name={icon as any} size={20} color="#000" />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statBadge}>
        <Ionicons name="trending-up" size={11} color="#2563eb" />
        <Text style={styles.statBadgeText}>{badge}</Text>
      </View>
    </View>
  );
}

export default function TVScreen() {
  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>Dashboard</Text>
            <TouchableOpacity style={styles.refreshBtn}>
              <Ionicons name="refresh" size={20} color="white" />
            </TouchableOpacity>
          </View>
          <View style={styles.headerFilters}>
            <View style={styles.filterChip}>
              <Ionicons name="calendar-outline" size={14} color="white" />
              <Text style={styles.filterChipText}>Últimos 7 dias</Text>
            </View>
            <View style={styles.filterChip}>
              <Ionicons name="camera-outline" size={14} color="white" />
              <Text style={styles.filterChipText}>Comedouro Principal</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>

          {/* Stats */}
          <View style={styles.statsGrid}>
            <StatCard icon="egg-outline" iconBg="#f3f4f6" value="173" label="Total de Pássaros" badge="+12%" />
            <StatCard icon="pulse-outline" iconBg="#dbeafe" value="14" label="Espécies Diferentes" badge="+3 novas" />
          </View>

          {/* Bar Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Visitas na Semana</Text>
              <View style={styles.chartIconBtn}>
                <Ionicons name="egg-outline" size={16} color="#000" />
              </View>
            </View>
            <BarChart data={activityData} />
          </View>

          {/* Line Chart */}
          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Horários de Pico</Text>
              <View style={[styles.chartIconBtn, { backgroundColor: '#dbeafe' }]}>
                <Ionicons name="time-outline" size={16} color="#000" />
              </View>
            </View>
            <LineChart data={timeData} />
          </View>

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
  headerFilters: { flexDirection: 'row', gap: 10 },
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
    backgroundColor: '#eff6ff', paddingHorizontal: 8,
    paddingVertical: 4, borderRadius: 8, alignSelf: 'flex-start', marginTop: 6,
  },
  statBadgeText: { fontSize: 11, fontWeight: 'bold', color: '#2563eb' },

  chartCard: {
    backgroundColor: 'white', borderRadius: 20, padding: 16,
    shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 6, elevation: 3,
  },
  chartHeader: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 16,
  },
  chartTitle: { fontSize: 16, fontWeight: 'bold', color: '#000' },
  chartIconBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#f3f4f6', alignItems: 'center', justifyContent: 'center',
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