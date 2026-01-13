import { useState } from 'react';
import { useAuth } from '@app/contexts/AuthContext';
import { Button } from '@shared/ui/button';
import { Card } from '@shared/ui/card';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { useToast } from '@shared/ui/use-toast';
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
    name: user?.user_metadata?.full_name || 'Joel Miller',
    email: user?.email || 'joel@example.com',
    role: 'Lead Church Planter',
    organization: 'Grace Community Church',
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setLoading(false);
    toast({
      title: 'Settings saved',
      description: 'Your profile has been updated successfully.',
    });
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
            <Button variant="ghost" className="w-full justify-start text-slate-600 hover:text-slate-900">
              <Palette className="w-4 h-4 mr-2" />
              Appearance
            </Button>
          </div>

          {/* Main Content */}
          <div className="md:col-span-3 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <Card className="p-6 border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center gap-6 mb-8">
                  <div className="relative">
                    <div className="w-24 h-24 bg-slate-100 rounded-2xl flex items-center justify-center border-2 border-white shadow-md">
                      <User className="w-10 h-10 text-slate-400" />
                    </div>
                    <Button
                      size="icon"
                      className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-orange-500 hover:bg-orange-600 border-2 border-white"
                    >
                      <Camera className="w-4 h-4 text-white" />
                    </Button>
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">Personal Info</h2>
                    <p className="text-sm text-slate-500">Update your photo and personal details.</p>
                  </div>
                </div>

                <form onSubmit={handleSave} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name</Label>
                      <Input
                        id="name"
                        value={profile.name}
                        onChange={(e) => setProfile({ ...profile, name: e.target.value })}
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
                    <Label htmlFor="role">Role</Label>
                    <Input
                      id="role"
                      value={profile.role}
                      onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                      className="border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="org">Organization</Label>
                    <Input
                      id="org"
                      value={profile.organization}
                      onChange={(e) => setProfile({ ...profile, organization: e.target.value })}
                      className="border-slate-200 focus:ring-orange-500/20 focus:border-orange-500"
                    />
                  </div>

                  <div className="pt-6 border-t border-slate-100 flex justify-end">
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

            {/* Other Settings Sections (Placeholders) */}
            <Card className="p-6 border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Bell className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Email Notifications</h3>
                  <p className="text-sm text-slate-500">Manage how you receive alerts.</p>
                </div>
              </div>
              <Button variant="outline" className="text-slate-600">
                Configure Notifications
              </Button>
            </Card>

            <Card className="p-6 border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Shield className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Security & Privacy</h3>
                  <p className="text-sm text-slate-500">Protect your account and data.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <Button variant="outline" className="text-slate-600">
                  Change Password
                </Button>
                <Button variant="outline" className="text-slate-600">
                  Two-Factor Auth
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
