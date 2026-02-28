import { useEffect } from 'react';
import { supabase } from '@/shared/db/client';
import { useAuth } from '@/app/contexts/AuthContext';

interface SeedAuthEventDetail {
    session: {
        access_token: string;
        refresh_token: string;
        user: { id: string };
    };
}

/**
 * AuthSeeder is a utility component for E2E tests.
 * It listens for a 'SEED_AUTH' event on the window and calls supabase.auth.setSession().
 * This is more reliable than localStorage because it interacts directly with the client instance.
 */
export function AuthSeeder(): JSX.Element {
    useEffect(() => {
        const handleSeed = async (event: Event): Promise<void> => {
            const { session } = (event as CustomEvent<SeedAuthEventDetail>).detail;
            console.log('[AuthSeeder] Seeding session...', session.user.id);
            const { error } = await supabase.auth.setSession(session);
            if (error) {
                console.error('[AuthSeeder] Failed to set session:', error);
            } else {
                console.log('[AuthSeeder] Session set successfully');
                window.dispatchEvent(new CustomEvent('AUTH_SEEDED'));
            }
        };

        window.addEventListener('SEED_AUTH', handleSeed);
        return () => window.removeEventListener('SEED_AUTH', handleSeed);
    }, []);

    const { user } = useAuth();

    return (
        <>
            <div id="auth-seeder" style={{ visibility: 'hidden' }} data-testid="auth-seeder-active" />
            {user && <div id="auth-user-seeded" style={{ visibility: 'hidden' }} data-testid="auth-user-seeded" />}
        </>
    );
}
