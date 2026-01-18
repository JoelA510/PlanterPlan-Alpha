import { useState, useEffect } from 'react';
import { useAuth } from '@app/contexts/AuthContext';
import { supabase } from '@app/supabaseClient';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { useToast } from '@shared/ui/use-toast';
import { Switch } from '@shared/ui/switch';
import {
  User,
  Mail,
  Lock,
  Bell,
  Palette,
  Shield,
  Loader2,
  Camera,
} from 'lucide-react';
import { motion } from 'framer-motion';
import DashboardLayout from '@layouts/DashboardLayout';

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [profile, setProfile] = useState({
    full_name: '',
    email: '',
    role: '',
    organization: '',
    avatar_url: '',
    email_frequency: 'daily', // daily, weekly, none
  });

  // Load initial data from User Metadata
  useEffect(() => {
    if (user) {
      setProfile({
        full_name: user.user_metadata?.full_name || '',
        email: user.email || '',
        role: user.user_metadata?.role || '',
        organization: user.user_metadata?.organization || '',
        avatar_url: user.user_metadata?.avatar_url || '',
        email_frequency: user.user_metadata?.email_frequency || 'daily',
      });
    }
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: profile.full_name,
          role: profile.role,
          organization: profile.organization,
          avatar_url: profile.avatar_url,
          email_frequency: profile.email_frequency,
        },
      });

      if (error) throw error;

      toast({
        title: 'Settings saved',
        description: 'Your profile has been updated successfully.',
      });
    } catch (error) {
      toast({
        title: 'Error saving settings',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Settings</h1>
          <p className="text-slate-500 mt-1">Manage your account and app preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="md:col-span-1 space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-start text-orange-600 bg-orange-50 font-semibold"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </Button>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900">
              <Mail className="w-4 h-4 mr-2" />
              Notifications
            </Button>
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900">
              <Lock className="w-4 h-4 mr-2" />
              Security
            </Button>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-md overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Personal Info</h2>
                    <p className="text-sm text-slate-500">Update your photo and personal details.</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={profile.email}
                        disabled
                        className="bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar_url">Avatar URL</Label>
                    <Input
                      id="avatar_url"
                      value={profile.avatar_url}
                      onChange={(e) => setProfile({ ...profile, avatar_url: e.target.value })}
                      placeholder="https://example.com/photo.jpg"
                      className="border-slate-200"
                    />
                    <p className="text-xs text-slate-400">Paste a link to your profile photo.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="role">Role</Label>
                      <Input
                        id="role"
                        value={profile.role}
                        onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                        placeholder="e.g. Lead Planter"
                        className="border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="org">Organization/Church</Label>
                      <Input
                        id="org"
                        value={profile.organization}
                        onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                        placeholder="e.g. Hope City Church"
                        className="border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 mt-6 md:mt-8">
                    <h3 className="text-md font-semibold text-slate-900 mb-4">Email Preferences</h3>
                    <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="bg-slate-100 p-2 rounded-lg">
                          <Bell className="w-5 h-5 text-slate-600" />
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">Email Notifications</div>
                          <div className="text-sm text-slate-500">Receive updates about project activity.</div>
                        </div>
                      </div>
                      <Switch
                        checked={profile.email_frequency !== 'none'}
                        onCheckedChange={(checked) => setProfile({ ...profile, email_frequency: checked ? 'daily' : 'none' })}
                      />
                    </div>
                  </div>

                  <div className="pt-6 flex justify-end">
                    <Button
                      type="submit"
                      disabled={loading}
                      className="bg-orange-500 hover:bg-orange-600 shadow-lg shadow-orange-500/20"
                    >
                      {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

