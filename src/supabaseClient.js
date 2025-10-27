import { createClient } from '@supabase/supabase-js';
import { error as logError } from './utils/logger';

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !anon) {
  logError('Supabase environment configuration is missing required public variables.');
  throw new Error('Missing Supabase environment configuration.');
}

export const supabase = createClient(url, anon);
