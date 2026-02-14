import { useEffect } from 'react';
import { supabase } from '@app/supabaseClient';
import { useAuth } from '@app/contexts/AuthContext';

/**
 * AuthSeeder is a utility component for E2E tests.
 * It listens for a 'SEED_AUTH' event on the window and calls supabase.auth.setSession().
 * This is more reliable than localStorage because it interacts directly with the client instance.
 */
export function AuthSeeder() {
    useEffect(() => {
        const handleSeed = async (event) => {
            const { session } = event.detail;
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
