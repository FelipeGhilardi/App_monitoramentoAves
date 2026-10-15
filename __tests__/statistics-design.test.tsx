import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import StatisticsScreen from '../app/(tabs)/dash';
import { DashboardResponse, fetchDashboard } from '../services/dashboard';
import { notifySightingsChanged } from '../services/sighting-events';

jest.mock('../services/dashboard', () => ({ fetchDashboard: jest.fn() }));

const response: DashboardResponse = {
  totalSightings: 3,
  uniqueSpecies: 2,
  leadingSpecies: [{ id: 'arara', name: 'Arara', count: 2 }],
  trend: [
    { label: '8/10', value: 0 }, { label: '9/10', value: 1 }, { label: '10/10', value: 1 },
    { label: '11/10', value: 0 }, { label: '12/10', value: 0 }, { label: '13/10', value: 1 },
    { label: '14/10', value: 0 },
  ],
  species: [
    { id: 'arara', name: 'Arara', count: 2 },
    { id: 'tucano', name: 'Tucano', count: 1 },
  ],
  hourly: Array.from({ length: 24 }, (_, hour) => ({
    label: `${String(hour).padStart(2, '0')}h`,
    value: hour === 9 ? 2 : hour === 15 ? 1 : 0,
  })),
};

const mockFetchDashboard = jest.mocked(fetchDashboard);

beforeEach(() => {
  jest.clearAllMocks();
  mockFetchDashboard.mockResolvedValue({ success: true, data: response });
});

test('oferece todos os períodos, remove novas espécies e mantém os cartões definidos', async () => {
  const screen = await render(<StatisticsScreen />);

  await waitFor(() => expect(mockFetchDashboard).toHaveBeenCalledWith('7', null));
  expect(screen.getByLabelText(/^Total de avistamentos: 3/)).toBeTruthy();
  expect(screen.getByLabelText(/^Espécies diferentes: 2/)).toBeTruthy();
  expect(screen.getByLabelText(/^Espécie mais avistada: Arara, 2 avistamentos/)).toBeTruthy();
  expect(screen.queryByText(/nova espécie/i)).toBeNull();

  await fireEvent.press(screen.getByLabelText('Últimos 180 dias'));
  await waitFor(() => expect(mockFetchDashboard).toHaveBeenLastCalledWith('180', null));
  expect(screen.getByLabelText('Últimos 180 dias').props.accessibilityState.selected).toBe(true);

  await fireEvent.press(screen.getByLabelText('Todo o histórico'));
  await waitFor(() => expect(mockFetchDashboard).toHaveBeenLastCalledWith('all', null));
});

test('seleciona uma espécie para a frequência por hora', async () => {
  const screen = await render(<StatisticsScreen />);
  await waitFor(() => expect(mockFetchDashboard).toHaveBeenCalledWith('7', null));

  await fireEvent.press(screen.getByLabelText('Selecionar espécie para frequência por hora'));
  await fireEvent.press(screen.getByLabelText('Tucano'));

  await waitFor(() => expect(mockFetchDashboard).toHaveBeenLastCalledWith('7', 'tucano'));
  expect(screen.getByLabelText('Selecionar espécie para frequência por hora').props.accessibilityValue.text)
    .toBe('Tucano');
});

test('atualiza as estatísticas quando avistamentos mudam', async () => {
  const screen = await render(<StatisticsScreen />);
  await waitFor(() => expect(mockFetchDashboard).toHaveBeenCalledTimes(1));

  await act(async () => { notifySightingsChanged(); });

  await waitFor(() => expect(mockFetchDashboard).toHaveBeenCalledTimes(2));
  expect(screen.getByLabelText(/^Total de avistamentos: 3/)).toBeTruthy();
});

test('explica quando o período não tem avistamentos identificados', async () => {
  mockFetchDashboard.mockResolvedValue({
    success: true,
    data: { ...response, totalSightings: 0, uniqueSpecies: 0, leadingSpecies: [], trend: [], species: [] },
  });
  const screen = await render(<StatisticsScreen />);

  await waitFor(() => expect(screen.getByText('Sem avistamentos identificados no período')).toBeTruthy());
  expect(screen.getByText(/Não há avistamentos identificados em últimos 7 dias/i)).toBeTruthy();
});

test('mantém uma ação explícita de repetição quando o carregamento falha', async () => {
  mockFetchDashboard.mockResolvedValueOnce({ success: false, message: 'Falha sintética' });
  const screen = await render(<StatisticsScreen />);

  await waitFor(() => expect(screen.getByText('Falha sintética')).toBeTruthy());
  await fireEvent.press(screen.getByText('Tentar novamente'));
  await waitFor(() => expect(screen.getByLabelText(/^Total de avistamentos: 3/)).toBeTruthy());
});
