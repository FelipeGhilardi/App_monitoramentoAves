import { fireEvent, render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import ActivityChart from '../components/ActivityChart';

const data = [{ label: '06h', value: 0 }, { label: '09h', value: 2 }, { label: '12h', value: 1 }];

test('barras de 50 e 52 avistamentos respeitam a marca de 50 e a mesma escala', async () => {
  const screen = await render(
    <ActivityChart
      title="Escala de avistamentos"
      data={[100, 50, 52, 1, 0].map((value, index) => ({ label: `Dia ${index}`, value }))}
      variant="bar"
    />
  );
  const grid = screen.getAllByTestId('chart-grid-line').map((line) => StyleSheet.flatten(line.props.style));
  const bars = screen.getAllByTestId('chart-bar').map((bar) => StyleSheet.flatten(bar.props.style));
  const barArea = StyleSheet.flatten(screen.getByTestId('chart-bars').props.style);
  const baseline = grid[4].top;
  const fullHeight = baseline - grid[0].top;

  expect(barArea.marginTop).toBeCloseTo(grid[0].top);
  expect(barArea.marginTop + barArea.height).toBeCloseTo(baseline);
  expect(bars[1].height).toBeCloseTo(baseline - grid[2].top);
  expect(baseline - bars[2].height).toBeLessThan(grid[2].top);
  expect(bars[0].height).toBeCloseTo(fullHeight);
  expect(bars[3].height).toBeCloseTo(fullHeight / 100);
  expect(bars[4].height).toBe(0);
});

test('pontos da linha usam a mesma escala da grade, incluindo zero e o máximo', async () => {
  const screen = await render(
    <ActivityChart
      title="Escala por hora"
      data={[100, 50, 52, 0].map((value, index) => ({ label: `${index}h`, value }))}
      variant="line"
    />
  );
  await fireEvent(screen.getByTestId('chart-plot-container'), 'layout', { nativeEvent: { layout: { width: 300, height: 140 } } });
  const grid = screen.getAllByTestId('chart-grid-line').map((line) => StyleSheet.flatten(line.props.style));
  const pointCenters = screen.getAllByTestId('chart-point').map((point) => {
    const style = StyleSheet.flatten(point.props.style);
    return style.top + style.height / 2;
  });

  expect(pointCenters[0]).toBeCloseTo(grid[0].top);
  expect(pointCenters[1]).toBeCloseTo(grid[2].top);
  expect(pointCenters[2]).toBeLessThan(grid[2].top);
  expect(pointCenters[3]).toBeCloseTo(grid[4].top);
});

test.each([
  { maximum: 5, labels: [5, 4, 3, 2, 1, 0] },
  { maximum: 10, labels: [10, 8, 6, 4, 2, 0] },
  { maximum: 50, labels: [50, 40, 30, 20, 10, 0] },
  { maximum: 100, labels: [100, 75, 50, 25, 0] },
])('eixo com máximo $maximum mantém números inteiros e alinhados à grade', async ({ maximum, labels }) => {
  const screen = await render(
    <ActivityChart title="Escala inteira" data={[{ label: 'Total', value: maximum }]} variant="bar" />
  );

  expect(screen.getAllByTestId('chart-y-label').map((label) => label.props.children)).toEqual(labels);
  const ticks = screen.getAllByTestId('chart-y-tick');
  const grid = screen.getAllByTestId('chart-grid-line');
  ticks.forEach((tick, index) => {
    const style = StyleSheet.flatten(tick.props.style);
    const gridY = StyleSheet.flatten(grid[index].props.style).top;
    expect(style.top + style.height / 2).toBeCloseTo(gridY);
  });
});

test.each(['bar', 'line'] as const)('gráfico %s seleciona o item tocado sem depender de coordenadas', async (variant) => {
  const screen = await render(<ActivityChart title="Visitas sintéticas" data={data} variant={variant} />);
  await fireEvent(screen.getByTestId('chart-plot-container'), 'layout', { nativeEvent: { layout: { width: 210, height: 180 } } });

  await fireEvent.press(screen.getByLabelText('Selecionar 09h em Visitas sintéticas'), { nativeEvent: { locationX: 5 } });
  expect(screen.getByText('09h: 2 avistamentos')).toBeTruthy();
  expect(screen.getByLabelText('Selecionar 09h em Visitas sintéticas').props.accessibilityState.selected).toBe(true);

  await fireEvent.press(screen.getByLabelText('Selecionar 12h em Visitas sintéticas'));
  expect(screen.getByText('12h: 1 avistamento')).toBeTruthy();
  expect(screen.queryByText('09h: 2 avistamentos')).toBeNull();

  await fireEvent.press(screen.getByLabelText('Selecionar 06h em Visitas sintéticas'));
  expect(screen.getByText('06h: 0 avistamentos')).toBeTruthy();
});

test.each(['bar', 'line'] as const)('gráfico %s mantém a seleção correta depois de redimensionado', async (variant) => {
  const screen = await render(<ActivityChart title="Visitas sintéticas" data={data} variant={variant} />);
  await fireEvent(screen.getByTestId('chart-plot-container'), 'layout', { nativeEvent: { layout: { width: 210, height: 180 } } });
  await fireEvent.press(screen.getByLabelText('Selecionar 09h em Visitas sintéticas'));
  await fireEvent(screen.getByTestId('chart-plot-container'), 'layout', { nativeEvent: { layout: { width: 360, height: 180 } } });

  await fireEvent.press(screen.getByLabelText('Selecionar 12h em Visitas sintéticas'), { nativeEvent: { locationX: 1 } });
  expect(screen.getByText('12h: 1 avistamento')).toBeTruthy();
});

test('gráfico vazio não oferece pontos para seleção', async () => {
  const screen = await render(<ActivityChart title="Visitas sintéticas" data={[]} variant="bar" />);

  expect(screen.queryByRole('button', { name: /Selecionar/ })).toBeNull();
});

test('gráfico de linha pode ocultar os marcadores', async () => {
  const screen = await render(<ActivityChart title="Frequência por hora" data={data} variant="line" showPoints={false} />);
  await fireEvent(screen.getByTestId('chart-plot-container'), 'layout', { nativeEvent: { layout: { width: 210, height: 140 } } });

  expect(screen.queryByTestId('chart-point')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Selecionar 09h em Frequência por hora'));
  expect(screen.getByText('09h: 2 avistamentos')).toBeTruthy();
});

test('valores completos podem ser consultados sem tocar em pontos do gráfico', async () => {
  const screen = await render(<ActivityChart title="Visitas sintéticas" data={data} variant="line" />);
  expect(screen.queryByText('2 avistamentos')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Mostrar valores: Visitas sintéticas'));
  expect(screen.getByText('0 avistamentos')).toBeTruthy();
  expect(screen.getByText('2 avistamentos')).toBeTruthy();
  expect(screen.getByText('1 avistamento')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Ocultar valores: Visitas sintéticas'));
  expect(screen.queryByText('2 avistamentos')).toBeNull();
});

test('lista todos os valores quando o gráfico mostra apenas um recorte', async () => {
  const screen = await render(
    <ActivityChart
      title="Espécies sintéticas"
      data={[{ label: 'Arara', value: 4 }]}
      valuesData={[{ label: 'Arara', value: 4 }, { label: 'Tucano', value: 2 }]}
      variant="bar"
    />
  );

  await fireEvent.press(screen.getByLabelText('Mostrar valores: Espécies sintéticas'));

  expect(screen.getByText('Tucano')).toBeTruthy();
  expect(screen.getByText('2 avistamentos')).toBeTruthy();
});

test('permite rolar rótulos de intervalos de data sem sobreposição', async () => {
  const screen = await render(
    <ActivityChart
      title="Visitas por período"
      data={[
        { label: '15/09–20/09', value: 1 },
        { label: '21/09–26/09', value: 2 },
      ]}
      variant="bar"
      scrollable
    />
  );

  expect(screen.getByTestId('chart-scroll-container')).toBeTruthy();
  expect(screen.getByText('15/09–20/09')).toBeTruthy();
  await fireEvent(screen.getByTestId('chart-plot-container'), 'layout', { nativeEvent: { layout: { width: 420, height: 180 } } });
  await fireEvent.press(screen.getByLabelText('Selecionar 21/09–26/09 em Visitas por período'), { nativeEvent: { locationX: 3 } });
  expect(screen.getByText('21/09–26/09: 2 avistamentos')).toBeTruthy();
});
