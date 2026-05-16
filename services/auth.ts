import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  name: string;
  email: string;
  password: string;
}

export async function register(name: string, email: string, password: string): Promise<boolean> {
  try {
    const existing = await AsyncStorage.getItem('user');
    if (existing) {
      const user: User = JSON.parse(existing);
      if (user.email === email) return false; // email já cadastrado
    }
    const newUser: User = { name, email, password };
    await AsyncStorage.setItem('user', JSON.stringify(newUser));
    return true;
  } catch {
    return false;
  }
}

export async function login(email: string, password: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem('user');
    if (!stored) return false;
    const user: User = JSON.parse(stored);
    if (user.email === email && user.password === password) {
      await AsyncStorage.setItem('userToken', 'logged');
      await AsyncStorage.setItem('userName', user.name);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function logout(): Promise<void> {
  await AsyncStorage.removeItem('userToken');
  await AsyncStorage.removeItem('userName');
}

export async function isLoggedIn(): Promise<boolean> {
  const token = await AsyncStorage.getItem('userToken');
  return token !== null;
}

export async function getUserName(): Promise<string> {
  const name = await AsyncStorage.getItem('userName');
  return name ?? 'Usuário';
}