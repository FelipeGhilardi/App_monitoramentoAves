import { apiFetch } from '../services/api';
import { fetchDashboard } from '../services/dashboard';

jest.mock('../services/api', () => ({ apiFetch: jest.fn() }));

const mockApiFetch = jest.mocked(apiFetch);

beforeEach(() => jest.clearAllMocks());

test('busca agregados do dashboard com período e espécie selecionada', async () => {
  const data = {
    totalSightings: 3,
    uniqueSpecies: 2,
    leadingSpecies: [],
    trend: [],
    species: [],
    hourly: [],
  };
  mockApiFetch.mockResolvedValueOnce(data);

  expect(await fetchDashboard('180', 'species/1')).toEqual({ success: true, data });
  expect(mockApiFetch).toHaveBeenCalledWith(
    '/api/dashboard?period=180&speciesId=species%2F1',
    { method: 'GET' }
  );
});

test('preserva a mensagem retornada pela API', async () => {
  mockApiFetch.mockRejectedValueOnce({ status: 503, message: 'Falha sintética' });

  expect(await fetchDashboard('all', null)).toEqual({
    success: false,
    message: 'Falha sintética',
  });
});
