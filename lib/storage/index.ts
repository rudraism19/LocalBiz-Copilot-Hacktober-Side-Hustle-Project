import { StorageAdapter } from './types';
import { LocalStorageAdapter } from './local-adapter';
import { SupabaseStorageAdapter } from './supabase-adapter';

let storageInstance: StorageAdapter | null = null;

export function getStorage(): StorageAdapter {
  if (storageInstance) {
    return storageInstance;
  }

  const supabaseAdapter = new SupabaseStorageAdapter();
  if (supabaseAdapter.isConfigured()) {
    storageInstance = supabaseAdapter;
    return storageInstance;
  }

  storageInstance = new LocalStorageAdapter();
  return storageInstance;
}

export function getStorageMode(): {
  mode: 'local_json' | 'supabase';
  isLocal: boolean;
  description: string;
} {
  const supabaseAdapter = new SupabaseStorageAdapter();
  if (supabaseAdapter.isConfigured()) {
    return {
      mode: 'supabase',
      isLocal: false,
      description: 'Connected to remote Supabase PostgreSQL. Business records are synchronized to your cloud database.',
    };
  }
  return {
    mode: 'local_json',
    isLocal: true,
    description: 'Running in zero-config local development mode. Data is stored safely on your local disk at data/local-biz-store.json.',
  };
}

export * from './types';
export * from './local-adapter';
export * from './supabase-adapter';
export * from './seed-data';
