export interface User {
    id: string;
    email: string;
    role?: string;
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
    aud?: string;
    created_at?: string;
}
