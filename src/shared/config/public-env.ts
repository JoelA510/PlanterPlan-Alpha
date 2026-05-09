const REQUIRED_PUBLIC_ENV_KEYS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const;

export type RequiredPublicEnvKey = typeof REQUIRED_PUBLIC_ENV_KEYS[number];

type PublicEnvSource = Partial<Record<RequiredPublicEnvKey, string | undefined>>;

export interface PublicEnvValidation {
    supabaseUrl: string | null;
    supabaseAnonKey: string | null;
    missingKeys: RequiredPublicEnvKey[];
    isValid: boolean;
}

const FALLBACK_SUPABASE_URL = 'http://127.0.0.1:54321';
const FALLBACK_SUPABASE_ANON_KEY = 'missing-vite-supabase-anon-key';

function readEnvValue(source: PublicEnvSource, key: RequiredPublicEnvKey): string | null {
    const value = source[key]?.trim();
    return value ? value : null;
}

export function validatePublicEnv(source: PublicEnvSource = import.meta.env): PublicEnvValidation {
    const supabaseUrl = readEnvValue(source, 'VITE_SUPABASE_URL');
    const supabaseAnonKey = readEnvValue(source, 'VITE_SUPABASE_ANON_KEY');
    const missingKeys = REQUIRED_PUBLIC_ENV_KEYS.filter((key) => !readEnvValue(source, key));

    return {
        supabaseUrl,
        supabaseAnonKey,
        missingKeys,
        isValid: missingKeys.length === 0,
    };
}

export const publicEnvValidation = validatePublicEnv();

export function getSupabaseClientEnv(validation: PublicEnvValidation = publicEnvValidation) {
    return {
        supabaseUrl: validation.supabaseUrl ?? FALLBACK_SUPABASE_URL,
        supabaseAnonKey: validation.supabaseAnonKey ?? FALLBACK_SUPABASE_ANON_KEY,
    };
}
