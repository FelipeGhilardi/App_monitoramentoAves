import { apiFetch } from './api';

export interface NotificationPreferences {
  startedAt: string;
  pushEnabled: boolean;
  unreadCount: number;
}

export interface NotificationItem {
  id: string;
  sightingId: string;
  title: string;
  body: string;
  createdAt: string;
  readAt: string | null;
}

export interface NotificationPage {
  items: NotificationItem[];
  nextCursor: string | null;
}

export const subscribeNotifications = (token: string) =>
  apiFetch<NotificationPreferences>('/api/notification-subscriptions', { method: 'POST' }, token);

export const fetchNotificationPreferences = (token: string) =>
  apiFetch<NotificationPreferences>('/api/notification-preferences', {}, token);

export const saveNotificationPreference = (token: string, pushEnabled: boolean) =>
  apiFetch<NotificationPreferences>('/api/notification-preferences', {
    method: 'PUT', body: JSON.stringify({ pushEnabled }),
  }, token);

export const fetchNotifications = (token: string, cursor?: string | null) =>
  apiFetch<NotificationPage>(`/api/notifications?limit=20${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`, {}, token);

export const fetchUnreadCount = (token: string) =>
  apiFetch<{ unreadCount: number }>('/api/notifications/unread-count', {}, token);

export const readNotification = (token: string, id: string) =>
  apiFetch<NotificationItem>(`/api/notifications/${encodeURIComponent(id)}/read`, { method: 'PATCH' }, token);

export const clearNotifications = (token: string, idempotencyKey: string) =>
  apiFetch<void>('/api/notifications', {
    method: 'DELETE', headers: { 'Idempotency-Key': idempotencyKey },
  }, token);

export function notificationDestination(data: unknown): { sightingId: string; notificationId: string; userId: string } {
  if (!data || typeof data !== 'object') throw new Error('Notificação com destino inválido.');
  const record = data as Record<string, unknown>;
  const validId = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(value);
  if (!validId(record.sightingId) || !validId(record.notificationId) || !validId(record.userId)
      || record.notificationId !== record.sightingId) throw new Error('Notificação com destino inválido.');
  return { sightingId: record.sightingId, notificationId: record.notificationId, userId: record.userId };
}

export function notificationError(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return 'Não foi possível atualizar as notificações. Tente novamente.';
}
