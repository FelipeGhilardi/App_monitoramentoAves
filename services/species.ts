import { apiFetch, ApiError } from './api';

export interface SpeciesResponse {
  id: number;
  name: string;
  scientificName: string;
  description: string | null;
  tips: string | null;
  imageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SpeciesResult {
  success: boolean;
  data?: SpeciesResponse[];
  message?: string;
}

/**
 * Busca todas as espécies cadastradas no backend.
 * Endpoint: GET /api/species (público — não exige autenticação).
 */
export async function fetchSpecies(): Promise<SpeciesResult> {
  try {
    const data = await apiFetch<SpeciesResponse[]>('/api/species', {
      method: 'GET',
    });

    const sorted = [...data].sort((a, b) =>
      a.name.localeCompare(b.name, 'pt-BR')
    );

    return { success: true, data: sorted };
  } catch (err) {
    const apiErr = err as ApiError;
    return {
      success: false,
      message: apiErr.message ?? 'Erro ao carregar espécies.',
    };
  }
}
