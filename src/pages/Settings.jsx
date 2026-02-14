import { useState, useEffect } from 'react';
import { useAuth } from '@app/contexts/AuthContext';
import { supabase } from '@app/supabaseClient';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { useToast } from '@shared/ui/use-toast';
import { Switch } from '@shared/ui/switch';
import {
  User,
  Lock,
  Bell,
  Loader2,
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
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Settings</h1>
          <p className="text-muted-foreground mt-2">Manage your account and app preferences</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Settings Navigation */}
          <div className="md:col-span-1 space-y-1">
            {[
              { label: 'Profile', icon: User, active: true },
              { label: 'Notifications', icon: Bell, comingSoon: true },
              { label: 'Security', icon: Lock, comingSoon: true },
            ].map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                disabled={item.comingSoon}
                className={`w-full justify-start ${item.active
                  ? 'text-brand-600 bg-brand-50 dark:bg-brand-950/20 dark:text-brand-400 font-semibold'
                  : 'text-muted-foreground'
                  } ${item.comingSoon ? 'cursor-not-allowed opacity-70' : 'hover:text-foreground hover:bg-muted'}`}
              >
                <item.icon className="w-4 h-4 mr-2" />
                {item.label}
                {item.comingSoon && (
                  <span className="ml-auto text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Soon</span>
                )}
              </Button>
            ))}
          </div>

          {/* Content Area */}
          <div className="md:col-span-3">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <div className="bg-card rounded-xl border border-border shadow-sm p-6">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-secondary rounded-2xl flex items-center justify-center border-2 border-background shadow-md overflow-hidden">
                      {profile.avatar_url ? (
                        <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Personal Info</h2>
                    <p className="text-sm text-slate-500">Update your photo and personal details.</p>
                    <h2 className="text-xl font-bold text-foreground">Personal Info</h2>
                    <p className="text-sm text-muted-foreground">Update your photo and personal details.</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name" className="text-foreground">Full Name</Label>
                      <Input
                        id="full_name"
                        value={profile.full_name}
                        onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                        className="mt-1 bg-background border-border"
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

                  <div className="pt-6 border-t border-border">
                    <h3 className="text-sm font-medium text-foreground mb-4">Email Preferences</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">Weekly Digest</p>
                        <p className="text-sm text-muted-foreground">Get a summary of your tasks every Monday</p>
                      </div>
                      <Switch
                        checked={profile.email_frequency === 'weekly'}
                        onCheckedChange={(checked) =>
                          setProfile({ ...profile, email_frequency: checked ? 'weekly' : 'never' })
                        }
                      />
                    </div>
                  </div>

                  <div className="pt-6 border-t border-border flex justify-end">
                    <Button
                      onClick={handleSave}
                      disabled={loading}
                      className="bg-brand-600 hover:bg-brand-700 text-white"
                    >
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Save Changes
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
