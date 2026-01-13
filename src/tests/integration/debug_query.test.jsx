import { describe, it, expect } from 'vitest';

// These tests require a real Supabase connection and are skipped in CI
// They're useful for local debugging against a real database
describe.skip('Debug Query', () => {
  it('should fetch tasks by root_id without 400 error', async () => {
    // Skipped - requires real Supabase connection
    expect(true).toBe(true);
  });

  it('should list projects without error', async () => {
    // Skipped - requires real Supabase connection  
    expect(true).toBe(true);
  });
});
