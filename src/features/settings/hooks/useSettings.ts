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

 // Load initial data from User Metadata
 useEffect(() => {
 if (user) {
 setProfile({
 full_name: String(user.user_metadata?.full_name || ''),
 email: user.email || '',
 role: String(user.user_metadata?.role || ''),
 organization: String(user.user_metadata?.organization || ''),
 avatar_url: String(user.user_metadata?.avatar_url || ''),
 email_frequency: (user.user_metadata?.email_frequency as string) || 'daily',
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
 },
 actions: {
 setProfile,
 setAvatarError,
 validateAvatarUrl,
 handleSave,
 }
 };
}
