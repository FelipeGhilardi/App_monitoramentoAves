import { apiFetch, ApiError } from './api';
import { SpeciesResponse } from './species';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type { SpeciesResponse };

export interface SightingResponse {
  id: string;
  species: SpeciesResponse[];
  date: string;
  time: string;
  imageUrl: string | null;
  imageUrls?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export type SightingsSort = 'newest' | 'oldest' | 'species_asc' | 'species_desc';

export interface SightingsPageOptions {
  cursor?: string | null;
  date?: string;
  speciesId?: string | null;
  includeUnidentified?: boolean;
  sort?: SightingsSort;
  limit?: number;
}

export interface SightingsResult {
  success: boolean;
  data?: SightingResponse[];
  message?: string;
}

export interface SightingsPageResult {
  success: boolean;
  data?: CursorPage<SightingResponse>;
  message?: string;
}

export interface SightingDetailResult {
  success: boolean;
  data?: SightingResponse;
  status?: number;
  message?: string;
}

export interface SightingDeletionResult {
  success: boolean;
  status?: number;
  message?: string;
}

export async function fetchSightingById(id: string): Promise<SightingDetailResult> {
  if (!id.trim()) {
    return { success: false, status: 400, message: 'Avistamento inválido.' };
  }

  try {
    const data = await apiFetch<SightingResponse>(
      `/api/sightings/${encodeURIComponent(id)}`,
      { method: 'GET' }
    );
    return { success: true, data };
  } catch (err) {
    const apiErr = err as ApiError;
    return {
      success: false,
      status: apiErr.status,
      message: apiErr.message ?? 'Erro ao carregar avistamento.',
    };
  }
}

export async function deleteSighting(id: string): Promise<SightingDeletionResult> {
  if (!id.trim()) {
    return { success: false, status: 400, message: 'Avistamento inválido.' };
  }

  try {
    await apiFetch<void>(`/api/sightings/${encodeURIComponent(id)}`, { method: 'DELETE' });
    return { success: true };
  } catch (err) {
    const apiErr = err as ApiError;
    return {
      success: false,
      status: apiErr.status,
      message: apiErr.message ?? 'Não foi possível excluir o avistamento.',
    };
  }
}

/**
 * Busca uma página de avistamentos. O cursor retornado só pode ser reutilizado
 * com a mesma combinação de filtros e ordenação.
 */
export async function fetchSightingsPage({
  cursor,
  date,
  speciesId,
  includeUnidentified = false,
  sort = 'newest',
  limit = 50,
}: SightingsPageOptions = {}): Promise<SightingsPageResult> {
  try {
    const safeLimit = Number.isFinite(limit) ? Math.min(Math.max(Math.trunc(limit), 1), 50) : 50;
    const query = new URLSearchParams({ limit: String(safeLimit), sort });
    if (cursor) query.set('cursor', cursor);
    if (date) {
      query.set('from', date);
      query.set('to', date);
    }
    if (speciesId) query.set('speciesId', speciesId);
    if (includeUnidentified) query.set('includeUnidentified', 'true');

    const data = await apiFetch<CursorPage<SightingResponse>>(
      `/api/sightings?${query.toString()}`,
      { method: 'GET' }
    );
    return { success: true, data };
  } catch (err) {
    const apiErr = err as ApiError;
    return {
      success: false,
      message: apiErr.message ?? 'Erro ao carregar avistamentos.',
    };
  }
}

/** Busca somente a prévia cronológica usada na Home. */
export async function fetchSightings(): Promise<SightingsResult> {
  const result = await fetchSightingsPage({ limit: 5, includeUnidentified: true });
  if (!result.success || !result.data) {
    return { success: false, message: result.message };
  }
  return { success: true, data: result.data.items };
}

export function getSightingImageUrls(sighting: SightingResponse): string[] {
  if (sighting.imageUrls !== undefined) return sighting.imageUrls;
  const legacyImage = sighting.imageUrl?.trim();
  return legacyImage ? [legacyImage] : [];
}

/**
 * Monta um título exibível a partir das espécies presentes no avistamento.
 * Ex.: "Beija-flor-de-topete" ou "Cardeal e mais 2".
 */
export function getSightingTitle(sighting: SightingResponse): string {
  const names = sighting.species
    .map((s) => s.name)
    .filter((n): n is string => !!n);

  if (names.length === 0) return 'Avistamento';
  if (names.length === 1) return names[0];
  return `${names[0]} e mais ${names.length - 1}`;
}

export function formatSightingDate(sighting: SightingResponse): string {
  try {
    const safeTime = sighting.time && sighting.time.length >= 5
      ? (sighting.time.length === 5 ? `${sighting.time}:00` : sighting.time)
      : '00:00:00';
    return format(parseISO(`${sighting.date}T${safeTime}`), "d 'de' MMM, HH:mm", { locale: ptBR });
  } catch {
    return sighting.date ?? '';
  }
}
