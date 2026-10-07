import { fireEvent, render, waitFor } from '@testing-library/react-native';
import CollectionScreen from '../app/(tabs)/collection';
import { fetchSpecies, SpeciesResponse } from '../services/species';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));
jest.mock('../services/species', () => ({ fetchSpecies: jest.fn() }));

const species: SpeciesResponse[] = [
  { id: 'bird-a', name: 'Ave de teste', scientificName: 'Avis syntheticus', description: 'Descrição sintética da espécie.', tips: 'Dica sintética.', imageUrl: null, createdAt: '', updatedAt: '' },
  { id: 'bird-b', name: 'Outra ave', scientificName: 'Avis exemplaris', description: null, tips: null, imageUrl: null, createdAt: '', updatedAt: '' },
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
