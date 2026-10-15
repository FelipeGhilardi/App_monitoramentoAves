import { apiFetch, ApiError } from './api';

export type DashboardPeriod = '7' | '30' | '90' | '180' | '365' | 'all';

export interface DashboardChartPoint {
  label: string;
  value: number;
}

export interface DashboardSpeciesCount {
  id: string;
  name: string;
  count: number;
}

export interface DashboardResponse {
  totalSightings: number;
  uniqueSpecies: number;
  leadingSpecies: DashboardSpeciesCount[];
  trend: DashboardChartPoint[];
  species: DashboardSpeciesCount[];
  hourly: DashboardChartPoint[];
}

export interface DashboardResult {
  success: boolean;
  data?: DashboardResponse;
  message?: string;
}

export async function fetchDashboard(
  period: DashboardPeriod,
  speciesId: string | null
): Promise<DashboardResult> {
  try {
    const query = new URLSearchParams({ period });
    if (speciesId) query.set('speciesId', speciesId);
    const data = await apiFetch<DashboardResponse>(`/api/dashboard?${query.toString()}`, { method: 'GET' });
    return { success: true, data };
  } catch (err) {
    const apiErr = err as ApiError;
    return {
      success: false,
      message: apiErr.message ?? 'Erro ao carregar estatísticas.',
    };
  }
}
