import { fireEvent, render } from '@testing-library/react-native';
import SightingCard from '../components/SightingCard';
import { SightingResponse } from '../services/sightings';

jest.mock('expo-image', () => ({ Image: require('react-native').Image }));

const record: SightingResponse = {
  id: 'record-1',
  species: [{
    id: 'bird-1', name: 'Sabiá', scientificName: 'Turdus rufiventris',
    description: null, tips: null, imageUrl: 'https://example.test/species.jpg',
    createdAt: '', updatedAt: '',
  }],
  date: '2026-09-20', time: '10:30:00', imageUrl: 'https://example.test/legacy.jpg',
  createdAt: '', updatedAt: '',
};

test('registro legado mantém capa e navegação sem indicação de múltiplas fotos', async () => {
  const onPress = jest.fn();
  const screen = await render(<SightingCard sighting={record} onPress={onPress} />);
  expect(screen.getByTestId('sighting-cover').props.source).toEqual({ uri: record.imageUrl });
  expect(screen.queryByText(/\d+ fotos/)).toBeNull();
  await fireEvent.press(screen.getByLabelText('Ver avistamento: Sabiá'));
  expect(onPress).toHaveBeenCalledTimes(1);
});

test.each([1, 4])('usa a primeira foto real da galeria de %i, sem usar capa antiga', async (count) => {
  const photos = Array.from({ length: count }, (_, index) => `https://example.test/photo-${index}.jpg`);
  const screen = await render(<SightingCard sighting={{ ...record, imageUrls: photos }} onPress={jest.fn()} />);
  expect(screen.getByTestId('sighting-cover').props.source).toEqual({ uri: photos[0] });
  if (count === 4) {
    expect(screen.getByText('4 fotos')).toBeTruthy();
    expect(screen.getByLabelText('Ver avistamento: Sabiá, 4 fotos')).toBeTruthy();
  } else {
    expect(screen.queryByText(/\d+ fotos/)).toBeNull();
  }
});

test('galeria explicitamente vazia usa ilustração, mas não a conta como foto real', async () => {
  const screen = await render(<SightingCard sighting={{ ...record, imageUrls: [] }} onPress={jest.fn()} />);
  expect(screen.getByTestId('sighting-cover').props.source).toEqual({ uri: record.species[0].imageUrl });
  expect(screen.queryByText(/\d+ fotos/)).toBeNull();
});

test('sem fotos reais nem ilustração mantém placeholder e ação de abrir o detalhe', async () => {
  const onPress = jest.fn();
  const screen = await render(<SightingCard sighting={{ ...record, imageUrls: [], species: [] }} onPress={onPress} />);
  expect(screen.queryByTestId('sighting-cover')).toBeNull();
  await fireEvent.press(screen.getByLabelText('Ver avistamento: Avistamento'));
  expect(onPress).toHaveBeenCalledTimes(1);
});
