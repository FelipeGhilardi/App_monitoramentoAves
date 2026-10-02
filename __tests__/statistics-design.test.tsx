import { fireEvent, render, waitFor } from '@testing-library/react-native';
import StatisticsScreen from '../app/(tabs)/dash';
import { fetchSightings, SightingResponse } from '../services/sightings';

jest.mock('../services/sightings', () => ({
  ...jest.requireActual('../services/sightings'),
  fetchSightings: jest.fn(),
}));

const sightings: SightingResponse[] = ['2026-10-02', '2026-09-12', '2026-08-01'].map((date, index) => ({
  id: `sighting-${index}`, date, time: '09:30:00', imageUrl: null, createdAt: '', updatedAt: '',
  species: [{ id: 'bird-a', name: 'Ave sintética', scientificName: 'Avis exemplaris', description: null, tips: null, imageUrl: null, createdAt: '', updatedAt: '' }],
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-10-02T12:00:00'));
  jest.mocked(fetchSightings).mockResolvedValue({ success: true, data: sightings });
});

afterEach(() => jest.useRealTimers());

test('seleciona diretamente 7, 30 e 90 dias sem alterar as métricas', async () => {
  const screen = await render(<StatisticsScreen />);
  await waitFor(() => expect(screen.getByLabelText(/^Total de Avistamentos: 1/)).toBeTruthy());
  expect(screen.getByLabelText('Últimos 7 dias').props.accessibilityState.selected).toBe(true);
  await fireEvent.press(screen.getByLabelText('Últimos 90 dias'));
  expect(screen.getByLabelText('Últimos 90 dias').props.accessibilityState.selected).toBe(true);
  expect(screen.getByLabelText(/^Total de Avistamentos: 3/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Últimos 30 dias'));
  expect(screen.getByLabelText(/^Total de Avistamentos: 2/)).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Últimos 7 dias'));
  expect(screen.getByLabelText(/^Total de Avistamentos: 1/)).toBeTruthy();
  expect(fetchSightings).toHaveBeenCalledTimes(1);
});

test('o estado vazio usa o período escolhido e a atualização continua disponível', async () => {
  jest.mocked(fetchSightings).mockResolvedValue({ success: true, data: [] });
  const screen = await render(<StatisticsScreen />);
  await waitFor(() => expect(screen.getByText('Sem avistamentos no período')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Últimos 30 dias'));
  expect(screen.getByText('Não há avistamentos registrados nos 30 dias selecionados. Tente outro período.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Atualizar estatísticas'));
  await waitFor(() => expect(fetchSightings).toHaveBeenCalledTimes(2));
});

test('erros de carregamento mantêm uma ação explícita de repetição', async () => {
  jest.mocked(fetchSightings).mockResolvedValueOnce({ success: false, message: 'Falha sintética' });
  const screen = await render(<StatisticsScreen />);
  await waitFor(() => expect(screen.getByText('Falha sintética')).toBeTruthy());
  await fireEvent.press(screen.getByText('Tentar novamente'));
  await waitFor(() => expect(screen.getByLabelText(/^Total de Avistamentos: 1/)).toBeTruthy());
});
