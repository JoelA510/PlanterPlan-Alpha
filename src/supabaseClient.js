import { createClient } from '@supabase/supabase-js';
import logger from './utils/logger';

const log = logger.withNamespace('Supabase');

const requiredEnvKeys = {
  url: 'REACT_APP_SUPABASE_URL',
  anonKey: 'REACT_APP_SUPABASE_ANON_KEY'
};

const supabaseUrl = process.env[requiredEnvKeys.url];
const supabaseAnonKey = process.env[requiredEnvKeys.anonKey];

const missingKeys = Object.entries({
  [requiredEnvKeys.url]: supabaseUrl,
  [requiredEnvKeys.anonKey]: supabaseAnonKey
})
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  log.error(
    `Missing required Supabase environment variable${missingKeys.length > 1 ? 's' : ''}:`,
    missingKeys.join(', ')
  );
  throw new Error('Supabase environment variables are not configured.');
}

log.info('Initializing Supabase client');

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
