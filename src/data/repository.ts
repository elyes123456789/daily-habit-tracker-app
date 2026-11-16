/**
 * Persistence. The whole dataset is one JSON document under one key, so every
 * save is a single write and can never leave habits and check-ins out of step.
 *
 * `KeyValueStore` is the only platform seam: AsyncStorage backs it on Android,
 * iOS (app-private storage) and web (the browser's localStorage).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

import { validateData } from '@/domain/transfer';
import { type AppData, EMPTY_DATA } from '@/domain/types';

export const STORAGE_KEY = 'daily-habit-tracker:data:v1';

export interface KeyValueStore {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const deviceStore: KeyValueStore = AsyncStorage;

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const items = new Map(Object.entries(initial));
  return {
    getItem: async (key) => items.get(key) ?? null,
    setItem: async (key, value) => void items.set(key, value),
    removeItem: async (key) => void items.delete(key),
  };
}

export interface Repository {
  /** Resolves with empty data on first run; rejects if saved data exists but cannot be read. */
  load(): Promise<AppData>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

export function createRepository(store: KeyValueStore = deviceStore): Repository {
  return {
    async load() {
      const raw = await store.getItem(STORAGE_KEY);
      if (raw === null) return EMPTY_DATA;
      // Deliberately not falling back to empty data: saving over a document we
      // failed to read would destroy it.
      return validateData(JSON.parse(raw));
    },
    save: (data) => store.setItem(STORAGE_KEY, JSON.stringify(data)),
    clear: () => store.removeItem(STORAGE_KEY),
  };
}
