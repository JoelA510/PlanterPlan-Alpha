import { createClient } from '@supabase/supabase-js';
import logger from './utils/logger';

const supabaseLogger = logger.withNamespace('Supabase');

const requiredEnvs = {
  REACT_APP_SUPABASE_URL: process.env.REACT_APP_SUPABASE_URL,
  REACT_APP_SUPABASE_ANON_KEY: process.env.REACT_APP_SUPABASE_ANON_KEY
};

const missingEnvKeys = Object.entries(requiredEnvs)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingEnvKeys.length > 0) {
  const missingList = missingEnvKeys.join(', ');
  supabaseLogger.error(
    `Missing Supabase environment ${missingEnvKeys.length > 1 ? 'variables' : 'variable'}:`,
    missingList
  );
  throw new Error(`Supabase environment misconfigured: ${missingList}`);
}

supabaseLogger.info('Initializing Supabase client');

export const supabase = createClient(
  requiredEnvs.REACT_APP_SUPABASE_URL,
  requiredEnvs.REACT_APP_SUPABASE_ANON_KEY
);
