import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '../constants/theme';

export interface ChartPoint {
  label: string;
  value: number;
}

function niceCeil(value: number): number {
  if (value <= 0) return 5;
  const pow = Math.pow(10, Math.floor(Math.log10(value)));
  const norm = value / pow;
  const nice = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10;
  return nice * pow;
}

interface Props {
  title: string;
  data: ChartPoint[];
  variant: 'bar' | 'line';
}

export default function ActivityChart({ title, data, variant }: Props) {
  const [plotWidth, setPlotWidth] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [showValues, setShowValues] = useState(false);
  const height = variant === 'bar' ? 180 : 140;
  const top = Math.max(niceCeil(Math.max(...data.map((point) => point.value), 0)), 4);
  const yLabels = [4, 3, 2, 1, 0].map((index) => Math.round((top * index) / 4));
  const points = data.map((point, index) => ({
    x: (index + 0.5) * plotWidth / data.length,
    y: height - (point.value / top) * (height - 20) - 10,
  }));

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={[styles.yAxis, { height }]}>
          {yLabels.map((label, index) => <Text key={index} style={styles.axisLabel}>{label}</Text>)}
        </View>
        <View
          testID="chart-plot-container"
          style={[styles.plot, { height }]}
          onLayout={(event) => setPlotWidth(event.nativeEvent.layout.width)}
        >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Selecionar valor em ${title}`}
          accessibilityHint="Os valores também estão disponíveis no botão Mostrar valores."
          accessibilityState={{ disabled: plotWidth <= 0 || data.length === 0 }}
          disabled={plotWidth <= 0 || data.length === 0}
          style={styles.plotTouch}
          onPress={(event) => {
            const location = event.nativeEvent.locationX;
            const index = Number.isFinite(location)
              ? Math.floor(location / (plotWidth / data.length))
              : (selected === null ? 0 : (selected + 1) % data.length);
            setSelected(Math.max(0, Math.min(data.length - 1, index)));
          }}
        >
          {yLabels.map((_, index) => <View key={index} style={[styles.gridLine, { top: index * height / 4 }]} />)}
          {variant === 'bar' ? (
            <View style={[styles.bars, { height }]}>
              {data.map((point, index) => (
                <View key={index} style={styles.barColumn}>
                  <View style={[styles.bar, { height: Math.max(point.value / top * (height - 20), point.value > 0 ? 4 : 0), backgroundColor: selected === index ? theme.colors.primaryDark : theme.colors.primary }]} />
                </View>
              ))}
            </View>
          ) : plotWidth > 0 && (
            <>
              {points.slice(0, -1).map((point, index) => {
                const next = points[index + 1];
                const dx = next.x - point.x;
                const dy = next.y - point.y;
                return <View key={index} style={[styles.line, { width: Math.sqrt(dx * dx + dy * dy), left: point.x, top: point.y, transform: [{ rotate: `${Math.atan2(dy, dx) * 180 / Math.PI}deg` }] }]} />;
              })}
              {points.map((point, index) => <View key={index} style={[styles.point, { left: point.x - 6, top: point.y - 6, backgroundColor: selected === index ? theme.colors.primaryDark : theme.colors.primary }]} />)}
            </>
          )}
        </Pressable>
        </View>
      </View>
      <View style={styles.xAxis}>
        {data.map((point, index) => <Text key={index} style={styles.xLabel}>{point.label}</Text>)}
      </View>
      {selected !== null && data[selected] && (
        <Text accessibilityLiveRegion="polite" style={styles.selection}>
          {data[selected].label}: {data[selected].value} {data[selected].value === 1 ? 'avistamento' : 'avistamentos'}
        </Text>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${showValues ? 'Ocultar' : 'Mostrar'} valores: ${title}`}
        accessibilityState={{ expanded: showValues }}
        onPress={() => setShowValues(!showValues)}
        style={styles.valuesButton}
      >
        <Text style={styles.valuesTitle}>{showValues ? 'Ocultar valores' : 'Mostrar valores'}</Text>
        <Ionicons name={showValues ? 'chevron-up' : 'chevron-down'} size={20} color={theme.colors.primary} />
      </Pressable>
      {showValues && data.map((point, index) => (
        <View key={index} style={styles.valueRow}>
          <Text style={styles.valueText}>{point.label}</Text>
          <Text style={styles.valueText}>{point.value} {point.value === 1 ? 'avistamento' : 'avistamentos'}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: theme.spacing.sm },
  row: { flexDirection: 'row' },
  yAxis: { width: 36, alignItems: 'flex-end', justifyContent: 'space-between', paddingRight: theme.spacing.sm },
  axisLabel: { fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary },
  plot: { flex: 1, position: 'relative' },
  plotTouch: { flex: 1, position: 'relative' },
  gridLine: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: theme.colors.background },
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: theme.spacing.sm },
  barColumn: { flex: 1, justifyContent: 'flex-end' },
  bar: { width: '100%', borderTopLeftRadius: 4, borderTopRightRadius: 4 },
  line: { position: 'absolute', height: 3, backgroundColor: theme.colors.primary, transformOrigin: 'left center' },
  point: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2, borderColor: theme.colors.surface },
  xAxis: { flexDirection: 'row', paddingLeft: 36 },
  xLabel: { flex: 1, fontSize: theme.fonts.sizes.xs, color: theme.colors.textSecondary, textAlign: 'center' },
  selection: { color: theme.colors.primaryDark, fontSize: theme.fonts.sizes.sm, fontWeight: '600', padding: theme.spacing.sm, backgroundColor: theme.colors.infoSurface, borderRadius: theme.radius.sm },
  valuesButton: { minHeight: theme.touchTarget, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: theme.spacing.sm },
  valuesTitle: { flex: 1, fontSize: theme.fonts.sizes.sm, color: theme.colors.primary, fontWeight: '600' },
  valueRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: theme.spacing.sm, paddingVertical: theme.spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.border },
  valueText: { fontSize: theme.fonts.sizes.sm, color: theme.colors.textSecondary },
});
