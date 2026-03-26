import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase
const mockRpc = vi.fn();
vi.mock('@/shared/db/client', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));

import { authApi } from '@/shared/api/auth';

describe('authApi', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkIsAdmin', () => {
    it('returns true when RPC returns truthy data', async () => {
      mockRpc.mockResolvedValue({ data: true, error: null });
      const result = await authApi.checkIsAdmin('user-1');
      expect(result).toBe(true);
      expect(mockRpc).toHaveBeenCalledWith('is_admin', { p_user_id: 'user-1' });
    });

    it('returns false when RPC returns falsy data', async () => {
      mockRpc.mockResolvedValue({ data: false, error: null });
      const result = await authApi.checkIsAdmin('user-2');
      expect(result).toBe(false);
    });

    it('returns false when RPC returns null data', async () => {
      mockRpc.mockResolvedValue({ data: null, error: null });
      const result = await authApi.checkIsAdmin('user-3');
      expect(result).toBe(false);
    });

    it('returns false and logs error on RPC failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const rpcError = { message: 'Network error' };
      mockRpc.mockResolvedValue({ data: null, error: rpcError });

      const result = await authApi.checkIsAdmin('user-4');
      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('[AuthApi] is_admin RPC failed:', rpcError);
      consoleSpy.mockRestore();
    });
  });
});
