import { fireEvent, render } from '@testing-library/react-native';
import ActivityChart from '../components/ActivityChart';

const data = [{ label: '06h', value: 0 }, { label: '09h', value: 2 }, { label: '12h', value: 1 }];

test.each(['bar', 'line'] as const)('gráfico %s usa a área medida para selecionar um valor', async (variant) => {
  const screen = await render(<ActivityChart title="Visitas sintéticas" data={data} variant={variant} />);
  expect(screen.getByLabelText('Selecionar valor em Visitas sintéticas').props.accessibilityState.disabled).toBe(true);
  await fireEvent(screen.getByTestId('chart-plot-container'), 'layout', { nativeEvent: { layout: { width: 210, height: 180 } } });
  expect(screen.getByLabelText('Selecionar valor em Visitas sintéticas').props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(screen.getByLabelText('Selecionar valor em Visitas sintéticas'), { nativeEvent: { locationX: 100 } });
  expect(screen.getByText('09h: 2 avistamentos')).toBeTruthy();
  await fireEvent(screen.getByTestId('chart-plot-container'), 'layout', { nativeEvent: { layout: { width: 360, height: 180 } } });
  await fireEvent.press(screen.getByLabelText('Selecionar valor em Visitas sintéticas'), { nativeEvent: { locationX: 100 } });
  expect(screen.getByText('06h: 0 avistamentos')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Selecionar valor em Visitas sintéticas'), { nativeEvent: { locationX: 360 } });
  expect(screen.getByText('12h: 1 avistamento')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Selecionar valor em Visitas sintéticas'), { nativeEvent: { locationX: Number.NaN } });
  expect(screen.getByText('06h: 0 avistamentos')).toBeTruthy();
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
});
