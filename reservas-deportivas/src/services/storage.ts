import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import preferencias from './preferencias';

export const storage = {
  async getItem(key: string): Promise<string | null> {
    if (key !== 'token') {
      const actual = await preferencias.getItem(key);
      if (actual || Platform.OS === 'web') return actual;
      const anterior = await SecureStore.getItemAsync(key);
      if (anterior) {
        await preferencias.setItem(key, anterior);
        await SecureStore.deleteItemAsync(key);
      }
      return anterior;
    }
    if (Platform.OS === 'web') {
      return typeof window === 'undefined' ? null : window.sessionStorage.getItem(key);
    }
    return await SecureStore.getItemAsync(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    if (key !== 'token') { await preferencias.setItem(key, value); return; }
    if (Platform.OS === 'web') {
      window.sessionStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },

  async deleteItem(key: string): Promise<void> {
    if (key !== 'token') {
      await preferencias.removeItem(key);
      if (Platform.OS !== 'web') await SecureStore.deleteItemAsync(key);
      return;
    }
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined') {
        window.sessionStorage.removeItem(key);
        window.localStorage.removeItem(key);
      }
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};
