import React, { useState } from 'react';
import { planter } from '@/api/planterClient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  User,

  Shield,
  Bell,
  Palette,
  Loader2,
  Check
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  // NOTE: planter.auth.me() needs to exist. Assuming yes based on planterClient structure.
  const { data: user, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => planter.auth.me()
  });

  const [formData, setFormData] = useState({
    full_name: user?.full_name || '',
    email: user?.email || ''
  });

  React.useEffect(() => {
    if (user) {
      setFormData({
        full_name: user.full_name || '',
        email: user.email || ''
      });
    }
  }, [user]);

  const updateUserMutation = useMutation({
    mutationFn: (data) => planter.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentUser'] });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    }
  });

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    await updateUserMutation.mutateAsync({ full_name: formData.full_name });
    setSaving(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  const sections = [
    {
      id: 'profile',
      title: 'Profile Information',
      description: 'Update your account details',
      icon: User
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Manage your notification preferences',
      icon: Bell
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize how the app looks',
      icon: Palette
    },
    {
      id: 'security',
      title: 'Security',
      description: 'Password and authentication settings',
      icon: Shield
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>
          <p className="text-slate-600 mt-1">Manage your account and preferences</p>
        </motion.div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-1"
          >
            <Card className="p-4 border border-slate-200 bg-white shadow-sm">
              <nav className="space-y-1">
                {sections.map((section) => {
                  const Icon = section.icon;
                  return (
                    <button
                      key={section.id}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg transition-colors hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </Card>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="lg:col-span-3"
          >
            <Card className="p-6 border border-slate-200 bg-white shadow-sm">
              <div className="space-y-6">
                {/* Profile Section */}
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                      <User className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Profile Information</h2>
                      <p className="text-sm text-slate-500">Update your account details</p>
                    </div>
                  </div>

                  <form onSubmit={handleSave} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">Full Name</Label>
                      <Input
                        id="full_name"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        placeholder="Your name"
                        className="max-w-md"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        disabled
                        className="max-w-md bg-slate-50"
                      />
                      <p className="text-xs text-slate-500">Email cannot be changed</p>
                    </div>

                    {user?.role && (
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium text-slate-700 capitalize">
                            {user.role}
                          </span>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-4">
                      <Button
                        type="submit"
                        disabled={saving}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          'Save Changes'
                        )}
                      </Button>
                      {saved && (
                        <div className="flex items-center gap-2 text-green-600">
                          <Check className="w-4 h-4" />
                          <span className="text-sm">Saved!</span>
                        </div>
                      )}
                    </div>
                  </form>
                </div>

                <Separator />

                {/* Notifications Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Bell className="w-5 h-5 text-indigo-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Notifications</h2>
                      <p className="text-sm text-slate-500">Manage notification preferences</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">Notification settings coming soon...</p>
                </div>

                <Separator />

                {/* Appearance Section */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Palette className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-slate-900">Appearance</h2>
                      <p className="text-sm text-slate-500">Customize the look and feel</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-600">Theme options coming soon...</p>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
