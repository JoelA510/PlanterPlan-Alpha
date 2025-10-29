import { createClient } from '@supabase/supabase-js';
import { logError } from './utils/logger';

const isTest = process.env.NODE_ENV === 'test';

const url = process.env.REACT_APP_SUPABASE_URL;
const anon = process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!isTest) {
  const missing = [];
  if (!url) missing.push('REACT_APP_SUPABASE_URL');
  if (!anon) missing.push('REACT_APP_SUPABASE_ANON_KEY');
  if (missing.length) {
    const envName = process.env.NODE_ENV || 'unknown';
    logError(`[Supabase] Missing required env in ${envName}: ${missing.join(', ')}`);
    throw new Error(`Supabase environment variables are not configured. Missing: ${missing.join(', ')}`);
  }
}

// Use harmless defaults under test so imports do not fail before env is injected.
const supabase = createClient(url || 'http://localhost', anon || 'test');

export { supabase };
