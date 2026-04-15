import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const mockUpdateProfile = vi.fn();

vi.mock('@/shared/api/planterClient', () => ({
  planter: {
    auth: {
      updateProfile: (...args: unknown[]) => mockUpdateProfile(...args),
    },
  },
}));

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockUser = {
  id: 'user-1',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    role: 'Pastor',
    organization: 'First Church',
    avatar_url: 'https://img.example.com/avatar.png',
    email_frequency: 'weekly',
  },
};

vi.mock('@/shared/contexts/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

import { useSettings } from '@/features/settings/hooks/useSettings';
import { toast } from 'sonner';

describe('useSettings', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateProfile.mockResolvedValue({});
  });

  it('initializes profile from user metadata', () => {
    const { result } = renderHook(() => useSettings());

    expect(result.current.state.profile.full_name).toBe('Test User');
    expect(result.current.state.profile.email).toBe('test@example.com');
    expect(result.current.state.profile.role).toBe('Pastor');
    expect(result.current.state.profile.organization).toBe('First Church');
    expect(result.current.state.profile.avatar_url).toBe('https://img.example.com/avatar.png');
    expect(result.current.state.profile.email_frequency).toBe('weekly');
  });

  it('starts with loading false', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.state.loading).toBe(false);
  });

  it('starts with empty avatarError', () => {
    const { result } = renderHook(() => useSettings());
    expect(result.current.state.avatarError).toBe('');
  });

  describe('handleSave', () => {
    it('calls updateProfile and shows success toast', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.actions.handleSave();
      });

      expect(mockUpdateProfile).toHaveBeenCalledWith({
        full_name: 'Test User',
        role: 'Pastor',
        organization: 'First Church',
        avatar_url: 'https://img.example.com/avatar.png',
        email_frequency: 'weekly',
      });
      expect(toast.success).toHaveBeenCalledWith('Settings saved', expect.any(Object));
    });

    it('does not save when avatarError is set', async () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.actions.validateAvatarUrl('not-a-url');
      });

      await act(async () => {
        await result.current.actions.handleSave();
      });

      expect(mockUpdateProfile).not.toHaveBeenCalled();
    });

    it('shows error toast on save failure', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateProfile.mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.actions.handleSave();
      });

      expect(toast.error).toHaveBeenCalledWith('Error', expect.any(Object));
      consoleSpy.mockRestore();
    });

    it('resets loading to false after save completes', async () => {
      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.actions.handleSave();
      });

      expect(result.current.state.loading).toBe(false);
    });

    it('resets loading to false even on error', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockUpdateProfile.mockRejectedValue(new Error('fail'));

      const { result } = renderHook(() => useSettings());

      await act(async () => {
        await result.current.actions.handleSave();
      });

      expect(result.current.state.loading).toBe(false);
      consoleSpy.mockRestore();
    });
  });

  describe('validateAvatarUrl', () => {
    it('sets error for invalid URL', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.actions.validateAvatarUrl('not-a-url');
      });

      expect(result.current.state.avatarError).toBe('Please enter a valid URL (https://...)');
    });

    it('clears error for valid https URL', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.actions.validateAvatarUrl('not-a-url');
      });
      expect(result.current.state.avatarError).not.toBe('');

      act(() => {
        result.current.actions.validateAvatarUrl('https://img.example.com/photo.jpg');
      });
      expect(result.current.state.avatarError).toBe('');
    });

    it('clears error for valid http URL', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.actions.validateAvatarUrl('http://example.com/avatar.png');
      });
      expect(result.current.state.avatarError).toBe('');
    });

    it('clears error for empty string', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.actions.validateAvatarUrl('');
      });
      expect(result.current.state.avatarError).toBe('');
    });
  });

  describe('setProfile', () => {
    it('updates profile fields', () => {
      const { result } = renderHook(() => useSettings());

      act(() => {
        result.current.actions.setProfile(prev => ({ ...prev, full_name: 'New Name' }));
      });

      expect(result.current.state.profile.full_name).toBe('New Name');
    });
  });
});
