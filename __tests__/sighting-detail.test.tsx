import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { isLoggedIn } from '../services/auth';
import { fetchSightingById, SightingResponse } from '../services/sightings';
import SightingDetailScreen from '../app/sightings/[id]';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));
jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn(), useRouter: jest.fn() }));
jest.mock('../services/auth', () => ({ isLoggedIn: jest.fn() }));
jest.mock('../services/sightings', () => ({
  ...jest.requireActual('../services/sightings'),
  fetchSightingById: jest.fn(),
}));
jest.mock('../components/SightingImageViewer', () => {
  const { Pressable, Text } = require('react-native');
  const React = require('react');
  return {
    __esModule: true,
    default: ({ onClose }: { onClose: () => void }) =>
      React.createElement(Pressable, { onPress: onClose, accessibilityLabel: 'Fechar imagem' },
        React.createElement(Text, null, 'Visualizador aberto')),
  };
});

const record: SightingResponse = {
  id: 'record-6',
  species: [{
    id: 'bird-1', name: 'Sabiá', scientificName: 'Turdus rufiventris',
    description: null, tips: null, imageUrl: 'https://example.test/illustration.jpg',
    createdAt: '', updatedAt: '',
  }],
  date: '2026-09-20', time: '10:30:00',
  imageUrl: 'https://example.test/record-6.jpg',
  createdAt: '', updatedAt: '',
};
const mockFetch = jest.mocked(fetchSightingById);
const mockLogin = jest.mocked(isLoggedIn);
const mockParams = jest.mocked(useLocalSearchParams);
const mockRouter = jest.mocked(useRouter);
const back = jest.fn();
const replace = jest.fn();

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.mockReturnValue({ id: 'record-6' });
  mockRouter.mockReturnValue({
    back, replace, canGoBack: () => true, push: jest.fn(), navigate: jest.fn(),
    dismiss: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn(),
    canDismiss: () => false, setParams: jest.fn(), reload: jest.fn(), prefetch: jest.fn(),
  });
  mockLogin.mockResolvedValue(true);
  mockFetch.mockResolvedValue({ success: true, data: record });
});

test('busca pelo ID da rota e abre somente a foto real depois de carregar', async () => {
  const screen = await render(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getAllByText('Sabiá')).toHaveLength(2));
  expect(mockFetch).toHaveBeenCalledWith('record-6');
  expect(screen.getByText('Turdus rufiventris')).toBeTruthy();
  const open = screen.getByLabelText('Ampliar foto do avistamento');
  expect(open.props.accessibilityState?.disabled ?? open.props.disabled).toBe(true);
  await fireEvent(screen.getByTestId('sighting-photo'), 'load');
  await fireEvent.press(open);
  expect(screen.getByText('Visualizador aberto')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Fechar imagem'));
  expect(screen.queryByText('Visualizador aberto')).toBeNull();
});

test('sem imagem do registro exibe placeholder mesmo com imagem da espécie', async () => {
  mockFetch.mockResolvedValueOnce({
    success: true, data: { ...record, imageUrl: null },
  });
  const screen = await render(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getByText('Sem imagem do registro')).toBeTruthy());
  expect(screen.queryByLabelText('Ampliar foto do avistamento')).toBeNull();
});

test('falha de imagem mostra erro e ação para tentar novamente', async () => {
  const screen = await render(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getByLabelText('Ampliar foto do avistamento')).toBeTruthy());
  await fireEvent(screen.getByTestId('sighting-photo'), 'error');
  expect(screen.getByText('Não foi possível carregar a imagem do registro.')).toBeTruthy();
  expect(screen.queryByLabelText('Ampliar foto do avistamento')).toBeNull();
  await fireEvent.press(screen.getByText('Tentar novamente'));
  expect(screen.getByLabelText('Ampliar foto do avistamento')).toBeTruthy();
});

test.each([
  [401, 'Faça login para ver este avistamento.'],
  [404, 'Avistamento não encontrado.'],
  [0, 'Falha de rede'],
] as const)('apresenta o estado de erro %i', async (status, text) => {
  mockFetch.mockResolvedValueOnce({ success: false, status, message: 'Falha de rede' });
  const screen = await render(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getByText(text)).toBeTruthy());
  if (status === 0) {
    await fireEvent.press(screen.getByText('Tentar novamente'));
    await waitFor(() => expect(mockFetch).toHaveBeenCalledTimes(2));
  }
  if (status === 401) {
    await fireEvent.press(screen.getByText('Ir para login'));
    expect(replace).toHaveBeenCalledWith('/login');
  }
});

test('ID inválido não consulta a API', async () => {
  mockParams.mockReturnValue({ id: '' });
  const screen = await render(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getByText('Avistamento não encontrado.')).toBeTruthy());
  expect(mockFetch).not.toHaveBeenCalled();
});

test('sessão ausente impede consulta e oferece login', async () => {
  mockLogin.mockResolvedValueOnce(false);
  const screen = await render(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getByText('Faça login para ver este avistamento.')).toBeTruthy());
  expect(mockFetch).not.toHaveBeenCalled();
});
