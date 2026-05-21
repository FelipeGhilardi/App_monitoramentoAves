import AsyncStorage from '@react-native-async-storage/async-storage';
import { sha256 } from '../utils/sha256';
import { apiFetch, clearToken, getToken, setToken, ApiError } from './api';

function hashPassword(plain: string): string {
  return sha256(plain);
}

export interface UserResponse {
  id: number;
  name: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

interface LoginResponse {
  token: string;
  user?: UserResponse;
}

const USER_NAME_KEY = 'userName';
const USER_EMAIL_KEY = 'userEmail';
const USER_ID_KEY = 'userId';
const USER_CREATED_AT_KEY = 'userCreatedAt';

export interface AuthResult {
  success: boolean;
  message?: string;
}

export async function register(
  name: string,
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    const hashedPassword = hashPassword(password);
    await apiFetch<UserResponse>('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name, email, password: hashedPassword }),
    });
    return { success: true };
  } catch (err) {
    const apiErr = err as ApiError;
    return { success: false, message: apiErr.message ?? 'Erro ao criar conta.' };
  }
}

export async function login(email: string, password: string): Promise<AuthResult> {
  try {
    const hashedPassword = hashPassword(password);
    const data = await apiFetch<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password: hashedPassword }),
    });

    await setToken(data.token);

    if (data.user) {
      await storeUser(data.user);
    } else {
      await AsyncStorage.setItem(USER_EMAIL_KEY, email);
    }

    return { success: true };
  } catch (err) {
    const apiErr = err as ApiError;
    return { success: false, message: apiErr.message ?? 'E-mail ou senha incorretos.' };
  }
}

export async function logout(): Promise<void> {
  await clearToken();
  await AsyncStorage.multiRemove([
    USER_NAME_KEY,
    USER_EMAIL_KEY,
    USER_ID_KEY,
    USER_CREATED_AT_KEY,
  ]);
}

/**
 * Atualiza nome e e-mail do usuário atual no backend e no storage local.
 */
export async function updateProfile(
  name: string,
  email: string
): Promise<AuthResult & { user?: UserResponse }> {
  const storedId = await AsyncStorage.getItem(USER_ID_KEY);
  if (!storedId) {
    return { success: false, message: 'Sessão expirada. Faça login novamente.' };
  }

  try {
    const updated = await apiFetch<UserResponse>(`/api/users/${storedId}`, {
      method: 'PUT',
      body: JSON.stringify({ name, email }),
    });
    await storeUser(updated);
    return { success: true, user: updated };
  } catch (err) {
    const apiErr = err as ApiError;
    return { success: false, message: apiErr.message ?? 'Erro ao atualizar perfil.' };
  }
}

/**
 * Decodifica o JWT (sem validar assinatura, isso é feito pelo backend) e checa
 * o claim `exp`. Retorna true apenas se o token está presente e não expirou.
 */
function isJwtUnexpired(token: string | null): boolean {
  if (!token) return false;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (payload.length % 4) payload += '=';

    const decoded = JSON.parse(globalThis.atob(payload));
    if (typeof decoded.exp !== 'number') return true;
    return Date.now() < decoded.exp * 1000;
  } catch {
    return false;
  }
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  if (isJwtUnexpired(token)) return true;

  // Token presente mas expirado/inválido -> limpa para evitar tentativas autenticadas inúteis.
  await logout();
  return false;
}

export async function getUserName(): Promise<string> {
  const name = await AsyncStorage.getItem(USER_NAME_KEY);
  return name ?? 'Usuário';
}

export async function getUserEmail(): Promise<string | null> {
  return AsyncStorage.getItem(USER_EMAIL_KEY);
}

/**
 * Retorna os dados do usuário atualmente autenticado a partir do storage local.
 * Retorna null se não houver usuário logado.
 */
export async function getCurrentUser(): Promise<UserResponse | null> {
  const [id, name, email, createdAt] = await Promise.all([
    AsyncStorage.getItem(USER_ID_KEY),
    AsyncStorage.getItem(USER_NAME_KEY),
    AsyncStorage.getItem(USER_EMAIL_KEY),
    AsyncStorage.getItem(USER_CREATED_AT_KEY),
  ]);

  if (!id || !email) return null;

  return {
    id: Number(id),
    name: name ?? 'Usuário',
    email,
    createdAt: createdAt ?? '',
    updatedAt: '',
  };
}

async function storeUser(user: UserResponse): Promise<void> {
  await AsyncStorage.multiSet([
    [USER_ID_KEY, String(user.id)],
    [USER_NAME_KEY, user.name],
    [USER_EMAIL_KEY, user.email],
    [USER_CREATED_AT_KEY, user.createdAt ?? ''],
  ]);
}
