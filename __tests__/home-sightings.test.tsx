import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import HomeScreen from '../app/(tabs)/index';
import { getCurrentUser, logout, updateProfile, UserResponse } from '../services/auth';
import appConfig from '../app.json';
import { theme } from '../constants/theme';
import { fetchSightings, SightingResponse } from '../services/sightings';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));
jest.mock('expo-router', () => ({ useRouter: jest.fn() }));
jest.mock('react-native-safe-area-context', () => jest.requireActual('react-native-safe-area-context'));
jest.mock('../services/auth', () => ({
  getCurrentUser: jest.fn(), updateProfile: jest.fn(), logout: jest.fn(),
}));
jest.mock('../services/sightings', () => ({
  ...jest.requireActual('../services/sightings'),
  fetchSightings: jest.fn(),
}));

const push = jest.fn();
const navigate = jest.fn();
const replace = jest.fn();
const mockFetch = jest.mocked(fetchSightings);
const user: UserResponse = { id: 'synthetic-user', name: 'Pessoa de teste', email: 'observer@example.test', createdAt: '', updatedAt: '' };

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

const renderHome = () => render(
  <SafeAreaProvider initialMetrics={{
    frame: { x: 0, y: 0, width: 360, height: 800 },
    insets: { top: 24, right: 0, bottom: 16, left: 0 },
  }}>
    <HomeScreen />
  </SafeAreaProvider>
);

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useRouter).mockReturnValue({
    push, back: jest.fn(), canGoBack: () => true, navigate, replace,
    dismiss: jest.fn(), dismissTo: jest.fn(), dismissAll: jest.fn(),
    canDismiss: () => false, setParams: jest.fn(), reload: jest.fn(), prefetch: jest.fn(),
  });

  jest.mocked(getCurrentUser).mockResolvedValue(null);
  mockFetch.mockResolvedValue({ success: true, data: sightings });
});

test('Configurações exibe conta e versão, abre edição real e reflete os dados salvos', async () => {
  jest.mocked(getCurrentUser).mockResolvedValue(user);
  const updated = { ...user, name: 'Pessoa atualizada' };
  jest.mocked(updateProfile).mockResolvedValue({ success: true, user: updated });
  const screen = await renderHome();
  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Ave 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Abrir configurações'));
  await waitFor(() => expect(screen.getByText('Configurações')).toBeTruthy());
  expect(screen.getByText(user.email)).toBeTruthy();
  expect(screen.getByText(appConfig.expo.version)).toBeTruthy();
  await fireEvent.press(screen.getByText('Editar perfil'));
  expect(screen.getByText('Editar perfil')).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText('Nome'), updated.name);
  await fireEvent.press(screen.getByText('Salvar alterações'));
  await waitFor(() => expect(screen.getByText('Perfil atualizado')).toBeTruthy());
  expect(updateProfile).toHaveBeenCalledWith(updated.name, user.email);
  jest.mocked(getCurrentUser).mockResolvedValue(updated);
  await fireEvent.press(screen.getByText('OK'));
  await fireEvent.press(screen.getByLabelText('Abrir configurações'));
  await waitFor(() => expect(screen.getByText(updated.name)).toBeTruthy());
});

test('Configurações acessa a aba Sobre e o logout já existente', async () => {
  jest.mocked(getCurrentUser).mockResolvedValue(user);
  jest.mocked(logout).mockResolvedValue(undefined);
  const screen = await renderHome();
  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Ave 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Abrir configurações'));
  await waitFor(() => expect(screen.getByText('Sobre o Projeto')).toBeTruthy());
  await fireEvent.press(screen.getByText('Sobre o Projeto'));
  expect(navigate).toHaveBeenCalledWith('/(tabs)/camera');
  expect(screen.queryByText('Configurações')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Abrir configurações'));
  await waitFor(() => expect(screen.getByText('Sair da conta')).toBeTruthy());
  await fireEvent.press(screen.getByText('Sair da conta'));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  expect(logout).toHaveBeenCalledTimes(1);
});

test('falha ao carregar a conta não abre Configurações sem dados', async () => {
  jest.mocked(getCurrentUser).mockResolvedValueOnce(user).mockRejectedValueOnce(new Error('storage unavailable'));
  const screen = await renderHome();
  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Ave 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Abrir configurações'));
  await waitFor(() => expect(screen.getByText('Não foi possível carregar seus dados. Tente novamente.')).toBeTruthy());
  expect(screen.queryByText('Configurações')).toBeNull();
});

test('falha no logout mantém Configurações abertas e permite nova tentativa', async () => {
  jest.mocked(getCurrentUser).mockResolvedValue(user);
  jest.mocked(logout).mockRejectedValueOnce(new Error('storage unavailable')).mockResolvedValueOnce(undefined);
  const screen = await renderHome();
  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Ave 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Abrir configurações'));
  await waitFor(() => expect(screen.getByText('Sair da conta')).toBeTruthy());
  await fireEvent.press(screen.getByText('Sair da conta'));
  await waitFor(() => expect(screen.getByText('Não foi possível sair da conta. Tente novamente.')).toBeTruthy());
  expect(replace).not.toHaveBeenCalled();
  await fireEvent.press(screen.getByText('OK'));
  await fireEvent.press(screen.getByText('Sair da conta'));
  await waitFor(() => expect(replace).toHaveBeenCalledWith('/login'));
  expect(logout).toHaveBeenCalledTimes(2);
});
test('o cartão da Home navega para o detalhe e o botão de vídeo não existe', async () => {
  const screen = await renderHome();
  await waitFor(() => expect(screen.getByLabelText('Ver avistamento: Ave 1')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Ver avistamento: Ave 1'));
  expect(push).toHaveBeenCalledWith({ pathname: '/sightings/[id]', params: { id: 'id-1' } });
  expect(screen.queryByText('Gravação em Tempo Real')).toBeNull();
  expect(screen.queryByText('Acessar câmera ao vivo')).toBeNull();
});

test('Ver tudo usa a área segura do modal e navega para além dos cinco recentes', async () => {
  const screen = await renderHome();
  await waitFor(() => expect(screen.getByText('Ver tudo')).toBeTruthy());
  expect(screen.queryByText('Todos os avistamentos')).toBeNull();
  await fireEvent.press(screen.getByText('Ver tudo'));
  expect(screen.getByText('Todos os avistamentos')).toBeTruthy();
  const modalArea = screen.getByTestId('all-sightings-safe-area');
  expect(modalArea).toHaveStyle({ flex: 1 });
  await fireEvent(modalArea, 'insetsChange', {
    nativeEvent: {
      frame: { x: 0, y: 0, width: 360, height: 760 },
      insets: { top: 0, right: 0, bottom: 0, left: 0 },
    },
  });
  const modalHeader = screen.getByText('Todos os avistamentos').parent?.parent?.parent;
  expect(modalHeader).toHaveStyle({ paddingTop: theme.spacing.sm });
  await fireEvent.press(screen.getByLabelText('Ver avistamento: Ave 6'));
  expect(push).toHaveBeenCalledWith({ pathname: '/sightings/[id]', params: { id: 'id-6' } });
  expect(screen.queryByText('Todos os avistamentos')).toBeNull();
});

test('Ver tudo pode ser fechado e reaberto sem perder a lista', async () => {
  const screen = await renderHome();
  await waitFor(() => expect(screen.getByText('Ver tudo')).toBeTruthy());
  await fireEvent.press(screen.getByText('Ver tudo'));
  expect(screen.getByLabelText('Ver avistamento: Ave 6')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Voltar'));
  expect(screen.queryByText('Todos os avistamentos')).toBeNull();
  expect(screen.queryByLabelText('Ver avistamento: Ave 6')).toBeNull();
  await fireEvent.press(screen.getByText('Ver tudo'));
  expect(screen.getByText('Todos os avistamentos')).toBeTruthy();
  expect(screen.getByLabelText('Ver avistamento: Ave 6')).toBeTruthy();
  expect(mockFetch).toHaveBeenCalledTimes(1);
});
