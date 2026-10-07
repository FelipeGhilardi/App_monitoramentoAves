import 'react-native-gesture-handler/jestSetup';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CollectionScreen from '../app/(tabs)/collection';
import { fetchSpecies, SpeciesResponse } from '../services/species';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));
jest.mock('../services/species', () => ({ fetchSpecies: jest.fn() }));
jest.mock('react-native-reanimated', () => require('react-native-reanimated/mock'));

const species: SpeciesResponse[] = [
  { id: 'bird-a', name: 'Ave de teste', scientificName: 'Avis syntheticus', description: 'Descrição sintética da espécie.', tips: 'Dica sintética.', imageUrl: null, createdAt: '', updatedAt: '' },
  { id: 'bird-b', name: 'Outra ave', scientificName: 'Avis exemplaris', description: null, tips: null, imageUrl: null, createdAt: '', updatedAt: '' },
];

const speciesWithImages: SpeciesResponse[] = [
  { ...species[0], imageUrl: 'https://example.test/bird-a.jpg' },
  { ...species[1], imageUrl: 'https://example.test/bird-b.jpg' },
];

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(fetchSpecies).mockResolvedValue({ success: true, data: species });
});

test('cards expandem e recolhem informações sem perder a busca', async () => {
  const screen = await render(<CollectionScreen />);
  await waitFor(() => expect(screen.getByText('Ave de teste')).toBeTruthy());
  expect(screen.queryByText('Descrição sintética da espécie.')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Buscar espécies'), 'SYNTHETICUS');
  expect(screen.queryByText('Outra ave')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Mostrar informações sobre Ave de teste'));
  expect(screen.getByText('Descrição sintética da espécie.')).toBeTruthy();
  expect(screen.getByText('Dica sintética.')).toBeTruthy();
  expect(screen.getByLabelText('Buscar espécies').props.value).toBe('SYNTHETICUS');
  expect(screen.getByLabelText('Ocultar informações sobre Ave de teste').props.accessibilityState.expanded).toBe(true);
  await fireEvent.press(screen.getByLabelText('Ocultar informações sobre Ave de teste'));
  expect(screen.queryByText('Dica sintética.')).toBeNull();
});

test('busca por nome, busca vazia e limpar busca mantêm o catálogo', async () => {
  const screen = await render(<CollectionScreen />);
  await waitFor(() => expect(screen.getByText('Outra ave')).toBeTruthy());
  expect(screen.queryByLabelText('Mostrar informações sobre Outra ave')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Buscar espécies'), ' outra ');
  expect(screen.getByText('Outra ave')).toBeTruthy();
  expect(screen.queryByText('Ave de teste')).toBeNull();
  await fireEvent.changeText(screen.getByLabelText('Buscar espécies'), 'inexistente');
  expect(screen.getByText('Nenhuma espécie encontrada')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Limpar busca'));
  expect(screen.getByText('Ave de teste')).toBeTruthy();
  expect(screen.getByText('Outra ave')).toBeTruthy();
});

test('campo de busca mantém altura própria e espaço para limpar o texto', async () => {
  const screen = await render(<CollectionScreen />);
  await waitFor(() => expect(screen.getByText('Ave de teste')).toBeTruthy());
  expect(screen.getByTestId('species-search-box')).toHaveStyle({ minHeight: 52, flexShrink: 0 });
  expect(screen.getByTestId('species-search-box').props.style.flex).toBeUndefined();
  expect(screen.getByLabelText('Buscar espécies')).toHaveStyle({ minWidth: 0, minHeight: 52 });
  await fireEvent.changeText(screen.getByLabelText('Buscar espécies'), 'Avis syntheticus');
  expect(screen.getByLabelText('Limpar busca')).toBeTruthy();
  expect(screen.getByTestId('species-search-box')).toHaveStyle({ minHeight: 52, flexShrink: 0 });
});

test('falha de rede é visível e permite repetir o carregamento', async () => {
  jest.mocked(fetchSpecies).mockResolvedValueOnce({ success: false, message: 'Falha sintética de rede' });
  const screen = await render(<CollectionScreen />);
  await waitFor(() => expect(screen.getByText('Falha sintética de rede')).toBeTruthy());
  await fireEvent.press(screen.getByText('Tentar novamente'));
  await waitFor(() => expect(screen.getByText('Ave de teste')).toBeTruthy());
  expect(fetchSpecies).toHaveBeenCalledTimes(2);
});

test('tocar na foto abre o zoom e fechar preserva a busca e as informações expandidas', async () => {
  jest.mocked(fetchSpecies).mockResolvedValueOnce({ success: true, data: speciesWithImages });
  const screen = await render(<CollectionScreen />);
  await waitFor(() => expect(screen.getByText('Ave de teste')).toBeTruthy());
  await fireEvent.changeText(screen.getByLabelText('Buscar espécies'), 'syntheticus');
  await fireEvent.press(screen.getByLabelText('Mostrar informações sobre Ave de teste'));
  await fireEvent.press(screen.getByLabelText('Ampliar foto de Ave de teste'));

  expect(screen.getByTestId('full-screen-photo').props.source).toEqual({ uri: speciesWithImages[0].imageUrl });
  expect(screen.getByLabelText('Foto de Ave de teste ampliada')).toBeTruthy();
  await fireEvent(screen.getByTestId('viewer-viewport'), 'layout', {
    nativeEvent: { layout: { width: 360, height: 800 } },
  });
  await fireEvent(screen.getByTestId('full-screen-photo'), 'load', {
    source: { width: 1200, height: 800 },
  });
  expect(screen.getByText('1.0×')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Aumentar zoom'));
  expect(screen.getByText('1.5×')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Aumentar zoom'));
  expect(screen.getByText('2.0×')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Fechar imagem'));

  expect(screen.queryByTestId('full-screen-photo')).toBeNull();
  expect(screen.getByLabelText('Buscar espécies').props.value).toBe('syntheticus');
  expect(screen.getByText('Descrição sintética da espécie.')).toBeTruthy();
  await fireEvent.press(screen.getByLabelText('Limpar busca'));
  await fireEvent.press(screen.getByLabelText('Ampliar foto de Outra ave'));
  expect(screen.getByTestId('full-screen-photo').props.source).toEqual({ uri: speciesWithImages[1].imageUrl });
  expect(screen.getByLabelText('Foto de Outra ave ampliada')).toBeTruthy();
  await fireEvent(screen.getByTestId('viewer-viewport'), 'layout', {
    nativeEvent: { layout: { width: 360, height: 800 } },
  });
  await fireEvent(screen.getByTestId('full-screen-photo'), 'load', {
    source: { width: 800, height: 1200 },
  });
  expect(screen.getByText('1.0×')).toBeTruthy();
});

test('espécies sem foto não oferecem uma ação de zoom vazia', async () => {
  jest.mocked(fetchSpecies).mockResolvedValueOnce({
    success: true, data: [species[0], { ...species[1], imageUrl: '   ' }],
  });
  const screen = await render(<CollectionScreen />);
  await waitFor(() => expect(screen.getByText('Outra ave')).toBeTruthy());
  expect(screen.queryByLabelText('Ampliar foto de Ave de teste')).toBeNull();
  expect(screen.queryByLabelText('Ampliar foto de Outra ave')).toBeNull();
  expect(screen.getByLabelText('Sem foto de Ave de teste')).toBeTruthy();
  expect(screen.getByLabelText('Sem foto de Outra ave')).toBeTruthy();
  expect(screen.queryByTestId('full-screen-photo')).toBeNull();
});

test('erro na foto ampliada permite tentar novamente ou fechar o visualizador', async () => {
  jest.mocked(fetchSpecies).mockResolvedValueOnce({ success: true, data: speciesWithImages });
  const screen = await render(<CollectionScreen />);
  await waitFor(() => expect(screen.getByText('Ave de teste')).toBeTruthy());
  await fireEvent.press(screen.getByLabelText('Ampliar foto de Ave de teste'));
  await fireEvent(screen.getByTestId('full-screen-photo'), 'error');
  expect(screen.getByText('Não foi possível carregar a imagem.')).toBeTruthy();
  await fireEvent.press(screen.getByText('Tentar novamente'));
  expect(screen.getByTestId('full-screen-photo').props.source).toEqual({ uri: speciesWithImages[0].imageUrl });
  expect(screen.queryByText('Não foi possível carregar a imagem.')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Fechar imagem'));
  expect(screen.queryByTestId('full-screen-photo')).toBeNull();
  expect(screen.getByText('Ave de teste')).toBeTruthy();
});
