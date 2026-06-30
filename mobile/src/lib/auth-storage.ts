import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '../config/app';
import type { Usuario } from '../types/mobile';

export async function getToken(): Promise<string> {
  return (await AsyncStorage.getItem(STORAGE_KEYS.token)) || '';
}

export async function getStoredUser(): Promise<Usuario | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as Usuario;
  } catch {
    await clearSession();
    return null;
  }
}

export async function setSession(token: string, usuario: Usuario): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.token, token);
  await AsyncStorage.setItem(STORAGE_KEYS.user, JSON.stringify(usuario));
}

export async function clearSession(): Promise<void> {
  await AsyncStorage.multiRemove([STORAGE_KEYS.token, STORAGE_KEYS.user]);
}
