import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
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
jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  const gesture = () => ({
    enabled() { return this; },
    maxPointers() { return this; },
    onStart() { return this; },
    onUpdate() { return this; },
    onEnd() { return this; },
  });
  return {
    Gesture: { Pinch: gesture, Pan: gesture, Simultaneous: jest.fn() },
    GestureDetector: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children),
    GestureHandlerRootView: View,
  };
});
jest.mock('react-native-reanimated', () => ({
  __esModule: true,
  default: { View: require('react-native').View },
  useSharedValue: (value: number) => ({ value }),
  useAnimatedStyle: () => ({}),
  withTiming: (value: number) => value,
  runOnJS: (fn: (...args: number[]) => void) => fn,
}));

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
const gallery = Array.from({ length: 4 }, (_, index) => `https://example.test/photo-${index + 1}.jpg`);
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

afterEach(() => jest.useRealTimers());

test('busca pelo ID da rota e abre somente a foto real depois de carregar', async () => {
  const screen = await render(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getAllByText('Sabiá')).toHaveLength(2));
  expect(mockFetch).toHaveBeenCalledWith('record-6');
  expect(screen.getByText('Turdus rufiventris')).toBeTruthy();
  const open = screen.getByLabelText('Ampliar foto do avistamento');
  expect(open.props.accessibilityState?.disabled ?? open.props.disabled).toBe(true);
  await fireEvent(screen.getByTestId('sighting-photo'), 'load');
  await fireEvent.press(open);
  expect(screen.getByTestId('full-screen-photo').props.source).toEqual({ uri: record.imageUrl });
  await fireEvent.press(screen.getByLabelText('Fechar imagem'));
  expect(screen.queryByTestId('full-screen-photo')).toBeNull();
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

test('galeria vazia ignora capa legada e imagem ilustrativa da espécie', async () => {
  mockFetch.mockResolvedValueOnce({ success: true, data: { ...record, imageUrls: [] } });
  const screen = await render(<SightingDetailScreen />);
  expect(screen.getByText('Sem imagem do registro')).toBeTruthy();
  expect(screen.queryByTestId('sighting-photo')).toBeNull();
  expect(screen.queryByLabelText('Próxima foto')).toBeNull();
});

test('uma foto real usa a galeria, informa 1 de 1 e não oferece navegação vazia', async () => {
  mockFetch.mockResolvedValueOnce({ success: true, data: { ...record, imageUrls: [gallery[0]] } });
  const screen = await render(<SightingDetailScreen />);
  expect(screen.getByTestId('sighting-photo').props.source).toEqual({ uri: gallery[0] });
  expect(screen.getByText('1 de 1')).toBeTruthy();
  expect(screen.queryByLabelText('Foto anterior')).toBeNull();
  expect(screen.queryByLabelText('Próxima foto')).toBeNull();
});

test('navega quatro fotos em ordem e amplia a selecionada usando o visualizador real', async () => {
  mockFetch.mockResolvedValueOnce({ success: true, data: { ...record, imageUrls: gallery } });
  const screen = await render(<SightingDetailScreen />);
  expect(screen.getByText('1 de 4')).toBeTruthy();
  expect(screen.getByLabelText('Foto anterior').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  expect(screen.getByText('2 de 4')).toBeTruthy();
  expect(screen.getByTestId('sighting-photo').props.source).toEqual({ uri: gallery[1] });
  expect(screen.getByLabelText('Ampliar foto do avistamento').props.accessibilityState.disabled).toBe(true);
  await fireEvent(screen.getByTestId('sighting-photo'), 'load');
  await fireEvent.press(screen.getByLabelText('Ampliar foto do avistamento'));
  expect(screen.getByTestId('full-screen-photo').props.source).toEqual({ uri: gallery[1] });
  expect(screen.getByLabelText('Foto 2 de 4 do avistamento ampliada')).toBeTruthy();
  await fireEvent(screen.getByTestId('viewer-viewport'), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  await fireEvent(screen.getByTestId('full-screen-photo'), 'load', {
    source: { width: 1200, height: 800 },
  });
  await fireEvent.press(screen.getByLabelText('Aumentar zoom'));
  expect(screen.getByText('1.5×')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Fechar imagem'));
  expect(screen.getByText('2 de 4')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  expect(screen.getByText('4 de 4')).toBeTruthy();
  expect(screen.getByTestId('sighting-photo').props.source).toEqual({ uri: gallery[3] });
  expect(screen.getByLabelText('Próxima foto').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  expect(screen.getByText('4 de 4')).toBeTruthy();
});

test('falhas, carregamento e repetição são independentes para cada URI', async () => {
  mockFetch.mockResolvedValueOnce({ success: true, data: { ...record, imageUrls: gallery } });
  const screen = await render(<SightingDetailScreen />);
  const firstError = screen.getByTestId('sighting-photo').props.onError;
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  await fireEvent(screen.getByTestId('sighting-photo'), 'load');
  await act(async () => { firstError(); });
  expect(screen.getByLabelText('Ampliar foto do avistamento').props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  expect(screen.getByLabelText('Ampliar foto do avistamento').props.accessibilityState.disabled).toBe(true);
  await fireEvent.press(screen.getByLabelText('Foto anterior'));
  expect(screen.getByLabelText('Ampliar foto do avistamento').props.accessibilityState.disabled).toBe(false);
  await fireEvent.press(screen.getByLabelText('Foto anterior'));
  expect(screen.getByText('Não foi possível carregar a imagem do registro.')).toBeTruthy();
  expect(screen.getByText('1 de 4')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Tentar novamente foto 1'));
  expect(screen.getByTestId('sighting-photo').props.source).toEqual({ uri: gallery[0] });
  expect(screen.getByLabelText('Ampliar foto do avistamento').props.accessibilityState.disabled).toBe(true);
  await act(async () => { firstError(); });
  expect(screen.queryByText('Não foi possível carregar a imagem do registro.')).toBeNull();
  await fireEvent(screen.getByTestId('sighting-photo'), 'load');
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  expect(screen.getByLabelText('Ampliar foto do avistamento').props.accessibilityState.disabled).toBe(false);
});

test('gesto horizontal navega sem capturar movimentos verticais e respeita os limites', async () => {
  mockFetch.mockResolvedValueOnce({ success: true, data: { ...record, imageUrls: gallery } });
  const screen = await render(<SightingDetailScreen />);
  const gesture = async (dx: number, dy: number) => {
    const area = screen.getByTestId('sighting-gallery');
    const touch = (x: number, y: number, previousX: number, previousY: number, timestamp: number) => ({
      nativeEvent: { touches: [{ identifier: 0, pageX: x, pageY: y }] },
      touchHistory: {
        numberActiveTouches: 1, indexOfSingleActiveTouch: 0, mostRecentTimeStamp: timestamp,
        touchBank: [{
          touchActive: true, currentPageX: x, currentPageY: y, currentTimeStamp: timestamp,
          previousPageX: previousX, previousPageY: previousY,
        }],
      },
    });
    const start = touch(200, 200, 200, 200, 1);
    const threshold = touch(200 + dx / 4, 200 + dy / 4, 200, 200, 2);
    const end = touch(200 + dx, 200 + dy, 200 + dx / 4, 200 + dy / 4, 3);
    let claimed = false;
    await act(async () => {
      area.props.onStartShouldSetResponderCapture(start);
      area.props.onMoveShouldSetResponderCapture(threshold);
      claimed = area.props.onMoveShouldSetResponder(threshold);
      if (claimed) {
        area.props.onResponderGrant(threshold);
        area.props.onResponderMove(end);
        area.props.onResponderRelease(end);
      }
    });
    return claimed;
  };

  expect(await gesture(0, 80)).toBe(false);
  expect(screen.getByText('1 de 4')).toBeTruthy();
  expect(await gesture(-80, 4)).toBe(true);
  expect(screen.getByText('2 de 4')).toBeTruthy();
  expect(await gesture(80, 4)).toBe(true);
  expect(screen.getByText('1 de 4')).toBeTruthy();
  await gesture(80, 4);
  expect(screen.getByText('1 de 4')).toBeTruthy();
});

test('trocar a rota fecha o zoom e reinicia seleção e estados de foto, mesmo com URIs iguais', async () => {
  mockFetch.mockResolvedValue({ success: true, data: { ...record, imageUrls: gallery } });
  const screen = await render(<SightingDetailScreen />);
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  const previousLoad = screen.getByTestId('sighting-photo').props.onLoad;
  await fireEvent(screen.getByTestId('sighting-photo'), 'load');
  await fireEvent.press(screen.getByLabelText('Ampliar foto do avistamento'));
  await fireEvent(screen.getByTestId('viewer-viewport'), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  await fireEvent(screen.getByTestId('full-screen-photo'), 'load', {
    source: { width: 1200, height: 800 },
  });
  await fireEvent.press(screen.getByLabelText('Aumentar zoom'));
  expect(screen.getByText('1.5×')).toBeTruthy();

  mockParams.mockReturnValue({ id: 'record-7' });
  mockFetch.mockResolvedValueOnce({ success: true, data: { ...record, id: 'record-7', imageUrls: gallery } });
  await screen.rerender(<SightingDetailScreen />);
  expect(screen.getByText('1 de 4')).toBeTruthy();
  expect(screen.queryByTestId('full-screen-photo')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Próxima foto'));
  expect(screen.getByLabelText('Ampliar foto do avistamento').props.accessibilityState.disabled).toBe(true);
  await act(async () => { previousLoad(); });
  expect(screen.getByLabelText('Ampliar foto do avistamento').props.accessibilityState.disabled).toBe(true);
  await fireEvent(screen.getByTestId('sighting-photo'), 'load');
  await fireEvent.press(screen.getByLabelText('Ampliar foto do avistamento'));
  await fireEvent(screen.getByTestId('viewer-viewport'), 'layout', {
    nativeEvent: { layout: { width: 400, height: 800 } },
  });
  await fireEvent(screen.getByTestId('full-screen-photo'), 'load', {
    source: { width: 1200, height: 800 },
  });
  expect(screen.getByText('1.0×')).toBeTruthy();
});

test.each([
  [401, 'Faça login para ver este avistamento.'],
  [400, 'Falha de rede'],
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

test('um 404 temporário é consultado novamente sem exibir inexistência ou exigir reload', async () => {
  jest.useFakeTimers();
  mockFetch.mockResolvedValueOnce({ success: false, status: 404 });
  const screen = await render(<SightingDetailScreen />);
  expect(mockFetch).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Carregando avistamento...')).toBeTruthy();
  expect(screen.queryByText('Avistamento não encontrado.')).toBeNull();

  await act(async () => { jest.advanceTimersByTime(500); });
  expect(mockFetch).toHaveBeenCalledTimes(2);
  expect(screen.getAllByText('Sabiá')).toHaveLength(2);
});

test('404 persistente limita a nova consulta e permite tentar de novo na própria tela', async () => {
  jest.useFakeTimers();
  const notFound = { success: false, status: 404 };
  mockFetch.mockResolvedValueOnce(notFound).mockResolvedValueOnce(notFound);
  const screen = await render(<SightingDetailScreen />);
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(screen.getByText('Avistamento não encontrado.')).toBeTruthy();
  await act(async () => { jest.advanceTimersByTime(5000); });
  expect(mockFetch).toHaveBeenCalledTimes(2);

  await fireEvent.press(screen.getByText('Tentar novamente'));
  expect(mockFetch).toHaveBeenCalledTimes(3);
  expect(screen.getAllByText('Sabiá')).toHaveLength(2);
});

test('trocar de avistamento cancela a consulta agendada do registro anterior', async () => {
  jest.useFakeTimers();
  mockFetch.mockResolvedValueOnce({ success: false, status: 404 });
  const screen = await render(<SightingDetailScreen />);
  mockParams.mockReturnValue({ id: 'record-7' });
  mockFetch.mockResolvedValueOnce({ success: true, data: { ...record, id: 'record-7' } });
  await screen.rerender(<SightingDetailScreen />);
  await act(async () => { jest.advanceTimersByTime(500); });
  expect(mockFetch.mock.calls).toEqual([['record-6'], ['record-7']]);
  expect(screen.queryByText('Avistamento não encontrado.')).toBeNull();
  expect(screen.getAllByText('Sabiá')).toHaveLength(2);
});

test('aguarda o parâmetro da rota antes de decidir que o avistamento não existe', async () => {
  mockParams.mockReturnValue({});
  const screen = await render(<SightingDetailScreen />);
  expect(screen.getByText('Carregando avistamento...')).toBeTruthy();
  expect(screen.queryByText('Avistamento não encontrado.')).toBeNull();
  expect(mockFetch).not.toHaveBeenCalled();
  mockParams.mockReturnValue({ id: 'record-6' });
  await screen.rerender(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getAllByText('Sabiá')).toHaveLength(2));
  expect(mockFetch).toHaveBeenCalledWith('record-6');
});

test('aceita um único ID em array, mas não consulta IDs ambíguos', async () => {
  mockParams.mockReturnValue({ id: ['record-6'] });
  const screen = await render(<SightingDetailScreen />);
  await waitFor(() => expect(screen.getAllByText('Sabiá')).toHaveLength(2));
  expect(mockFetch).toHaveBeenCalledWith('record-6');
  mockParams.mockReturnValue({ id: ['record-6', 'record-7'] });
  await screen.rerender(<SightingDetailScreen />);
  expect(screen.getByText('Avistamento não encontrado.')).toBeTruthy();
  expect(mockFetch).toHaveBeenCalledTimes(1);
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
