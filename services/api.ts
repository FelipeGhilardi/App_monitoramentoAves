import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Endereço do backend Spring Boot.
// - Produção/homologação: defina EXPO_PUBLIC_API_BASE_URL (ex.: https://api.exemplo.com)
//   para apontar a um domínio real via HTTPS.
// - Desenvolvimento local:
//   - Android Emulator: 10.0.2.2 mapeia para o localhost da máquina host.
//   - iOS Simulator e Web: localhost funciona normalmente.
//   - Dispositivo físico: configure o IP em .env (EXPO_PUBLIC_API_IP)
const DEV_HOST = Platform.select({
  android: process.env.EXPO_PUBLIC_API_IP || '10.0.2.2',
  ios: 'localhost',
  default: 'localhost',
});

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL || `http://${DEV_HOST}:8080`;

const TOKEN_KEY = 'userToken';

export async function getToken(): Promise<string | null> {
  return AsyncStorage.getItem(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await AsyncStorage.setItem(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export interface ApiError {
  status: number;
  message: string;
}

/**
 * Faz uma requisição autenticada à API.
 * Em caso de erro, lança um objeto ApiError com a mensagem retornada pelo backend.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch {
    throw {
      status: 0,
      message: 'Não foi possível conectar ao servidor. Verifique sua conexão.',
    } as ApiError;
  }

  const text = await response.text();
  const data = text ? safeJsonParse(text) : null;

  if (!response.ok) {
    throw {
      status: response.status,
      message: extractErrorMessage(data) ?? `Erro ${response.status}`,
    } as ApiError;
  }

  return data as T;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function extractErrorMessage(data: unknown): string | null {
  if (!data) return null;
  if (typeof data === 'string') return data;
  if (typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (typeof obj.message === 'string') return obj.message;
    if (typeof obj.error === 'string') return obj.error;
    const firstString = Object.values(obj).find((v) => typeof v === 'string');
    if (typeof firstString === 'string') return firstString;
  }
  return null;
}
