import { useState, useEffect } from 'react';
import { useAuth } from '@/shared/contexts/AuthContext';
import { planter } from '@/shared/api/planterClient';
import { toast } from 'sonner';

export interface UserProfile {
    full_name: string;
    email: string;
    role: string;
    organization: string;
    avatar_url: string;
    email_frequency: 'daily' | 'weekly' | 'never';
}

export interface PasswordForm {
    newPassword: string;
    confirmPassword: string;
}

export function useSettings() {
    const { user } = useAuth();

    const [loading, setLoading] = useState(false);
    const [avatarError, setAvatarError] = useState('');

    const [profile, setProfile] = useState<UserProfile>({
        full_name: '',
        email: '',
        role: '',
        organization: '',
        avatar_url: '',
        email_frequency: 'weekly',
    });

    const [passwordForm, setPasswordForm] = useState<PasswordForm>({
        newPassword: '',
        confirmPassword: '',
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordLoading, setPasswordLoading] = useState(false);

    // Load initial data from User Metadata
    useEffect(() => {
        if (user) {
            setProfile({
                full_name: String(user.user_metadata?.full_name || ''),
                email: user.email || '',
                role: String(user.user_metadata?.role || ''),
                organization: String(user.user_metadata?.organization || ''),
                avatar_url: String(user.user_metadata?.avatar_url || ''),
                email_frequency: String(user.user_metadata?.email_frequency || 'daily') as UserProfile['email_frequency'],
            });
        }
    }, [user]);

    const handleSave = async () => {
        if (avatarError) return;

        setLoading(true);
        try {
            await planter.auth.updateProfile({
                full_name: profile.full_name,
                role: profile.role,
                organization: profile.organization,
                avatar_url: profile.avatar_url,
                email_frequency: profile.email_frequency,
            });

            toast.success("Settings saved", {
                description: "Your profile has been updated successfully.",
            });
        } catch (error) {
            console.error('Error updating profile:', error);
            toast.error("Error", {
                description: "Failed to update settings. Please try again.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        setPasswordError('');

        if (passwordForm.newPassword.length < 8) {
            setPasswordError('Password must be at least 8 characters');
            return;
        }

        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }

        setPasswordLoading(true);
        try {
            await planter.auth.changePassword(passwordForm.newPassword);
            toast.success('Password updated', {
                description: 'Your password has been changed successfully.',
            });
            setPasswordForm({ newPassword: '', confirmPassword: '' });
        } catch (error) {
            console.error('Error changing password:', error);
            toast.error('Error', {
                description: 'Failed to change password. Please try again.',
            });
        } finally {
            setPasswordLoading(false);
        }
    };

    const validateAvatarUrl = (url: string) => {
        if (url && !url.match(/^https?:\/\/.+/)) {
            setAvatarError('Please enter a valid URL (https://...)');
        } else {
            setAvatarError('');
        }
    };

    return {
        state: {
            profile,
            loading,
            avatarError,
            passwordForm,
            passwordError,
            passwordLoading,
        },
        actions: {
            setProfile,
            setAvatarError,
            validateAvatarUrl,
            handleSave,
            setPasswordForm,
            setPasswordError,
            handlePasswordChange,
        }
    };
}
