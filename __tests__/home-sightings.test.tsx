import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { useRouter } from 'expo-router';
import HomeScreen from '../app/(tabs)/index';
import { getCurrentUser } from '../services/auth';
import { fetchSightings, SightingResponse } from '../services/sightings';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('../services/auth', () => ({
  getCurrentUser: jest.fn(), updateProfile: jest.fn(), logout: jest.fn(),
}));
jest.mock('../services/sightings', () => ({
  ...jest.requireActual('../services/sightings'),
  fetchSightings: jest.fn(),
}));

const push = jest.fn();
const mockFetch = jest.mocked(fetchSightings);

const sightings: SightingResponse[] = Array.from({ length: 6 }, (_, index) => ({
  id: `id-${index + 1}`,
  species: [{
    id: `bird-${index + 1}`, name: `Ave ${index + 1}`,
    scientificName: 'Avis exemplaris', description: null, tips: null,
    imageUrl: null, createdAt: '', updatedAt: '',
  }],
  date: '2026-09-20', time: '10:30:00',
  imageUrl: null, createdAt: '', updatedAt: '',
}));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push, back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), replace: jest.fn(),
    dismiss: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn(),
    canDismiss: () => false, setParams: jest.fn(), reload: jest.fn(), prefetch: jest.fn(),
  });
  jest.mocked(getCurrentUser).mockResolvedValue(null);
  mockFetch.mockResolvedValue({ success: true, data: sightings });
});

test('o cartão da Home navega para o detalhe e o botão de vídeo não existe', async () => {
  const screen = await render(<HomeScreen />);
  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Ave 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Ver avistamento: Ave 1'));
  expect(push).toHaveBeenCalledWith({ pathname: '/sightings/[id]', params: { id: 'id-1' } });
  expect(screen.queryByText('Gravação em Tempo Real')).toBeNull();
  expect(screen.queryByText('Acessar câmera ao vivo')).toBeNull();
});

test('Ver tudo permite navegar para um avistamento além dos cinco recentes', async () => {
  const screen = await render(<HomeScreen />);
  await waitFor(() => expect(screen.getByText('Ver tudo')).toBeTruthy());
  await fireEvent.press(screen.getByText('Ver tudo'));
  await fireEvent.press(screen.getByLabelText('Ver avistamento: Ave 6'));
  expect(push).toHaveBeenCalledWith({ pathname: '/sightings/[id]', params: { id: 'id-6' } });
});
