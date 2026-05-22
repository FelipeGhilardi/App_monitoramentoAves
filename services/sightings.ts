import { apiFetch, ApiError } from './api';
import { SpeciesResponse } from './species';

export type { SpeciesResponse };

export type Gender = 'MALE' | 'FEMALE' | 'UNKNOWN';

export interface SightingSpeciesResponse {
  id: number;
  species: SpeciesResponse;
  quantity: number;
  gender: Gender;
}

export interface SightingResponse {
  id: number;
  species: SightingSpeciesResponse[];
  date: string;
  time: string;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SightingsResult {
  success: boolean;
  data?: SightingResponse[];
  message?: string;
}

/**
 * Busca todos os avistamentos do backend, já ordenados do mais
 * recente para o mais antigo (por data/hora de ocorrência).
 */
export async function fetchSightings(): Promise<SightingsResult> {
  try {
    const data = await apiFetch<SightingResponse[]>('/api/sightings', {
      method: 'GET',
    });

    const sorted = [...data].sort((a, b) => {
      const dateA = combineDateTime(a.date, a.time);
      const dateB = combineDateTime(b.date, b.time);
      return dateB - dateA;
    });

    return { success: true, data: sorted };
  } catch (err) {
    const apiErr = err as ApiError;
    return {
      success: false,
      message: apiErr.message ?? 'Erro ao carregar avistamentos.',
    };
  }
}

function combineDateTime(date: string, time: string): number {
  const safeTime = time && time.length >= 5 ? time : '00:00:00';
  const iso = `${date}T${safeTime.length === 5 ? `${safeTime}:00` : safeTime}`;
  const parsed = new Date(iso).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Monta um título exibível a partir das espécies presentes no avistamento.
 * Ex.: "Beija-flor-de-topete" ou "Cardeal e mais 2".
 */
export function getSightingTitle(sighting: SightingResponse): string {
  const names = sighting.species
    .map((s) => s.species?.name)
    .filter((n): n is string => !!n);

  if (names.length === 0) return 'Avistamento';
  if (names.length === 1) return names[0];
  return `${names[0]} e mais ${names.length - 1}`;
}
