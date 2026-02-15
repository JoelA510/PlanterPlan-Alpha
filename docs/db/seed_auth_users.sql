-- Seed Test Users into auth.users for E2E testing
-- These IDs match e2e/fixtures/e2e-helpers.ts

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, aud, role, raw_user_meta_data)
VALUES 
('00000000-0000-0000-0000-000000000001', 'owner@example.com', '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash', now(), 'authenticated', 'authenticated', '{"full_name": "Test Owner"}'),
('00000000-0000-0000-0000-000000000002', 'editor@example.com', '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash', now(), 'authenticated', 'authenticated', '{"full_name": "Test Editor"}'),
('00000000-0000-0000-0000-000000000003', 'viewer@example.com', '$2a$10$dummyhashdummyhashdummyhashdummyhashdummyhashdummyhash', now(), 'authenticated', 'authenticated', '{"full_name": "Test Viewer"}')
ON CONFLICT (id) DO UPDATE 
SET email = EXCLUDED.email, 
    raw_user_meta_data = EXCLUDED.raw_user_meta_data;
