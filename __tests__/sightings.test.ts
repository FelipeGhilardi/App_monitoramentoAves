import { apiFetch } from '../services/api';
import {
  fetchSightingById, formatSightingDate, getSightingTitle, SightingResponse,
} from '../services/sightings';

jest.mock('../services/api', () => ({ apiFetch: jest.fn() }));

const record: SightingResponse = {
  id: 'sighting-1',
  species: [{
    id: 'species-1', name: 'Sabiá', scientificName: 'Turdus rufiventris',
    description: null, tips: null, imageUrl: null, createdAt: '', updatedAt: '',
  }],
  date: '2026-09-20',
  time: '10:30:00',
  imageUrl: 'https://example.test/photo.jpg',
  createdAt: '',
  updatedAt: '',
};

const mockApiFetch = jest.mocked(apiFetch);

beforeEach(() => jest.clearAllMocks());

test('obtém um avistamento pelo ID codificado e formata seus dados', async () => {
  mockApiFetch.mockResolvedValueOnce(record);

  expect(await fetchSightingById('sighting/1')).toEqual({ success: true, data: record });
  expect(mockApiFetch).toHaveBeenCalledWith('/api/sightings/sighting%2F1', { method: 'GET' });
  expect(getSightingTitle(record)).toBe('Sabiá');
  expect(formatSightingDate(record)).toContain('10:30');
});

test.each([401, 404, 0])('preserva o status %i e a mensagem do erro', async (status) => {
  mockApiFetch.mockRejectedValueOnce({ status, message: 'Falha na consulta' });

  expect(await fetchSightingById('sighting-1')).toEqual({
    success: false, status, message: 'Falha na consulta',
  });
});

test('não faz requisição com ID vazio', async () => {
  expect(await fetchSightingById('  ')).toEqual({
    success: false, status: 400, message: 'Avistamento inválido.',
  });
  expect(mockApiFetch).not.toHaveBeenCalled();
});
