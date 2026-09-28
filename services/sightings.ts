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
  createdAt: string;
  updatedAt: string;
}

interface CursorPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SightingsResult {
  success: boolean;
  data?: SightingResponse[];
  message?: string;
}

export interface SightingDetailResult {
  success: boolean;
  data?: SightingResponse;
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

// Limite máximo de itens por página aceito pelo backend (app.sightings.max-page-size).
const PAGE_LIMIT = 50;
// Número máximo de páginas percorridas em uma única chamada, para evitar
// requisições ilimitadas caso o backend acumule muito histórico.
const MAX_PAGES = 20;

/**
 * Busca avistamentos do backend (percorrendo páginas via cursor até o limite
 * de segurança definido acima) e retorna já ordenados do mais recente para
 * o mais antigo (por data/hora de ocorrência).
 */
export async function fetchSightings(): Promise<SightingsResult> {
  try {
    const all: SightingResponse[] = [];
    let cursor: string | null = null;
    let hasMore = true;
    let pages = 0;

    while (hasMore && pages < MAX_PAGES) {
      const query = new URLSearchParams({ limit: String(PAGE_LIMIT) });
      if (cursor) query.set('cursor', cursor);

      const page = await apiFetch<CursorPage<SightingResponse>>(
        `/api/sightings?${query.toString()}`,
        { method: 'GET' }
      );

      all.push(...page.items);
      cursor = page.nextCursor;
      hasMore = page.hasMore && !!cursor;
      pages += 1;
    }

    const sorted = [...all].sort((a, b) => {
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
