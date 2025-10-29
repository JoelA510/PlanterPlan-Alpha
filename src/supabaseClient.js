import { logError } from './utils/logger';
import { createClient } from '@supabase/supabase-js';

const requiredEnvKeys = {
  url: 'REACT_APP_SUPABASE_URL',
  anonKey: 'REACT_APP_SUPABASE_ANON_KEY',
};

const supabaseUrl = process.env[requiredEnvKeys.url];
const supabaseAnonKey = process.env[requiredEnvKeys.anonKey];
const missingKeys = Object.values(requiredEnvKeys).filter((k) => !process.env[k]);

function makeTestMock() {
  const noop = async () => ({ data: null, error: null });
  const sub = { unsubscribe: () => {} };
  return {
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: noop,
      signUp: noop,
      signOut: noop,
      onAuthStateChange: () => ({ data: { subscription: sub } }),
    },
    from: () => ({ select: async () => ({ data: [], error: null }) }),
  };
}

let supabase;
if (missingKeys.length) {
  const envName = process.env.NODE_ENV || 'unknown';
  if (envName === 'test') {
    // In tests, don't throw—return a harmless mock so CRA/Jest can mount components.
    supabase = makeTestMock();
  } else {
    logError(`[Supabase] Missing required env in ${envName}:`, missingKeys.join(', '));
    throw new Error(
      `Supabase environment variables are not configured. Missing: ${missingKeys.join(', ')}`
    );
  }
} else {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
}

export { supabase };
