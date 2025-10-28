import { createClient } from '@supabase/supabase-js';
import { logError } from './utils/logger';

const requiredEnvKeys = {
  url: 'REACT_APP_SUPABASE_URL',
  anonKey: 'REACT_APP_SUPABASE_ANON_KEY',
};

const missingKeys = Object.values(requiredEnvKeys).filter((k) => !process.env[k]);

if (missingKeys.length) {
  const envName = process.env.NODE_ENV || 'unknown';
  logError(`[Supabase] Missing required env in ${envName}: ${missingKeys.join(', ')}`);
  throw new Error(
    `Supabase environment variables are not configured. Missing: ${missingKeys.join(', ')}`
  );
}

const url = process.env[requiredEnvKeys.url];
const anon = process.env[requiredEnvKeys.anonKey];

export const supabase = createClient(url, anon);
