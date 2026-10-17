import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import SightingsScreen from '../app/sightings';
import { fetchSpecies } from '../services/species';
import { fetchSightingsPage, SightingResponse } from '../services/sightings';
import { notifySightingsChanged } from '../services/sighting-events';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('@react-native-community/datetimepicker', () => {
  const { View } = require('react-native');
  return (props: object) => <View testID="date-picker" {...props} />;
});
jest.mock('../services/species', () => ({ fetchSpecies: jest.fn() }));
jest.mock('../services/sightings', () => ({
  ...jest.requireActual('../services/sightings'),
  fetchSightingsPage: jest.fn(),
}));

const push = jest.fn();
const mockFetchSpecies = jest.mocked(fetchSpecies);
const mockFetchSightingsPage = jest.mocked(fetchSightingsPage);

const sighting = (id: string, name: string): SightingResponse => ({
  id,
  species: [{
    id: `species-${id}`, name, scientificName: 'Avis exemplaris',
    description: null, tips: null, imageUrl: null, createdAt: '', updatedAt: '',
  }],
  date: '2026-09-20', time: '10:30:00', imageUrl: null, createdAt: '', updatedAt: '',
});

const renderScreen = () => render(
  <SafeAreaProvider initialMetrics={{
    frame: { x: 0, y: 0, width: 360, height: 800 },
    insets: { top: 24, right: 0, bottom: 16, left: 0 },
  }}>
    <SightingsScreen />
  </SafeAreaProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push, back: jest.fn(), canGoBack: () => true, replace: jest.fn(),
    navigate: jest.fn(), dismiss: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn(),
    canDismiss: () => false, setParams: jest.fn(), reload: jest.fn(), prefetch: jest.fn(),
  });
  mockFetchSpecies.mockResolvedValue({
    success: true,
    data: [
      { id: 'arara', name: 'Arara', scientificName: 'Ara ararauna', description: null, tips: null, imageUrl: null, createdAt: '', updatedAt: '' },
      { id: 'outros', name: 'Ave não identificada', scientificName: 'Avis incognita', description: null, tips: null, imageUrl: null, createdAt: '', updatedAt: '' },
    ],
  });
});

test('inicia sem Outros e aplica a espécie escolhida', async () => {
  mockFetchSightingsPage.mockResolvedValue({ success: true, data: { items: [sighting('1', 'Arara')], nextCursor: null, hasMore: false } });
  const screen = await renderScreen();

  await waitFor(() => expect(mockFetchSightingsPage).toHaveBeenCalledWith({
    cursor: null, date: undefined, speciesId: null, includeUnidentified: false, sort: 'newest', limit: 50,
  }));

  expect(screen.queryByLabelText('Filtrar por espécie')).toBeNull();
  const filtersButton = screen.getByLabelText('Mostrar filtros');
  expect(filtersButton.props.accessibilityState.expanded).toBe(false);
  await fireEvent.press(filtersButton);
  expect(screen.getByLabelText('Ocultar filtros').props.accessibilityState.expanded).toBe(true);
  await fireEvent.press(screen.getByLabelText('Filtrar por espécie'));
  await waitFor(() => expect(screen.getAllByText('Arara').length).toBeGreaterThan(1));
  expect(screen.queryByText('Ave não identificada')).toBeNull();
  await fireEvent.press(screen.getAllByText('Arara').at(-1)!);
  await fireEvent.press(screen.getByText('Aplicar filtros'));

  await waitFor(() => expect(mockFetchSightingsPage).toHaveBeenLastCalledWith({
    cursor: null, date: undefined, speciesId: 'arara', includeUnidentified: false, sort: 'newest', limit: 50,
  }));
});

test('seleciona, cancela e limpa o filtro de dia nativo', async () => {
  mockFetchSightingsPage.mockResolvedValue({
    success: true,
    data: { items: [sighting('1', 'Arara')], nextCursor: null, hasMore: false },
  });
  const screen = await renderScreen();
  await waitFor(() => expect(mockFetchSightingsPage).toHaveBeenCalledTimes(1));

  await fireEvent.press(screen.getByLabelText('Mostrar filtros'));
  await fireEvent.press(screen.getByLabelText('Filtrar por dia'));
  const picker = screen.getByTestId('date-picker');
  await fireEvent(picker, 'onChange', { type: 'set' }, new Date(2026, 8, 20));
  expect(screen.getByText('20/09/2026')).toBeTruthy();

  await fireEvent(picker, 'onChange', { type: 'dismissed' }, undefined);
  expect(screen.getByText('20/09/2026')).toBeTruthy();

  await fireEvent.press(screen.getByText('Aplicar filtros'));
  await waitFor(() => expect(mockFetchSightingsPage).toHaveBeenLastCalledWith({
    cursor: null, date: '2026-09-20', speciesId: null, includeUnidentified: false, sort: 'newest', limit: 50,
  }));

  await fireEvent.press(screen.getByText('Limpar'));
  await waitFor(() => expect(mockFetchSightingsPage).toHaveBeenLastCalledWith({
    cursor: null, date: undefined, speciesId: null, includeUnidentified: false, sort: 'newest', limit: 50,
  }));
  expect(screen.getByText('Selecionar dia')).toBeTruthy();
});

test('carrega a próxima página usando o cursor retornado', async () => {
  mockFetchSightingsPage
    .mockResolvedValueOnce({ success: true, data: { items: [sighting('1', 'Arara')], nextCursor: 'next-page', hasMore: true } })
    .mockResolvedValueOnce({ success: true, data: { items: [sighting('2', 'Tucano')], nextCursor: null, hasMore: false } });
  const screen = await renderScreen();

  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Arara')).toBeTruthy());
  await fireEvent.press(screen.getByText('Carregar mais'));
  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Tucano')).toBeTruthy());
  expect(mockFetchSightingsPage).toHaveBeenLastCalledWith({
    cursor: 'next-page', date: undefined, speciesId: null, includeUnidentified: false, sort: 'newest', limit: 50,
  });
});

test('atualiza a primeira página sem alterar os filtros aplicados', async () => {
  mockFetchSightingsPage.mockResolvedValue({
    success: true,
    data: { items: [sighting('1', 'Arara')], nextCursor: null, hasMore: false },
  });
  const screen = await renderScreen();
  await waitFor(() => expect(mockFetchSightingsPage).toHaveBeenCalledTimes(1));

  await fireEvent.press(screen.getByLabelText('Atualizar avistamentos'));

  await waitFor(() => expect(mockFetchSightingsPage).toHaveBeenCalledTimes(2));
  expect(mockFetchSightingsPage).toHaveBeenLastCalledWith({
    cursor: null, date: undefined, speciesId: null, includeUnidentified: false, sort: 'newest', limit: 50,
  });
});

test('atualiza a lista automaticamente após remover um avistamento', async () => {
  mockFetchSightingsPage
    .mockResolvedValueOnce({ success: true, data: { items: [sighting('1', 'Arara')], nextCursor: null, hasMore: false } })
    .mockResolvedValueOnce({ success: true, data: { items: [sighting('2', 'Tucano')], nextCursor: null, hasMore: false } });
  const screen = await renderScreen();
  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Arara')).toBeTruthy());

  await act(async () => { notifySightingsChanged(); });

  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Tucano')).toBeTruthy());
  expect(mockFetchSightingsPage).toHaveBeenLastCalledWith({
    cursor: null, date: undefined, speciesId: null, includeUnidentified: false, sort: 'newest', limit: 50,
  });
});
