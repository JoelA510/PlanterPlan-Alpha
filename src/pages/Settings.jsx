import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import DashboardLayout from '@layouts/DashboardLayout';
import SideNav from '@features/navigation/components/SideNav';
import { useNavigate } from 'react-router-dom';
import { useTaskOperations } from '@features/tasks/hooks/useTaskOperations';

export default function Settings() {
  const navigate = useNavigate();

  // Navigation Data
  const {
    instanceTasks,
    templateTasks,
    joinedProjects,
    loading: navLoading
  } = useTaskOperations();

  // Handlers for SideNav
  const handleSelectProject = (project) => navigate(`/project/${project.id}`);
  const handleNewProjectClick = () => navigate('/dashboard');
  const handleNewTemplateClick = () => { };


  return (
    <DashboardLayout sidebar={<SideNav
      instanceTasks={instanceTasks}
      templateTasks={templateTasks}
      joinedProjects={joinedProjects}
      handleSelectProject={handleSelectProject}
      onNewProjectClick={handleNewProjectClick}
      onNewTemplateClick={handleNewTemplateClick}
      loading={navLoading}
    />}>
      <div className="min-h-screen bg-slate-50 p-8">
        <div className="max-w-3xl mx-auto space-y-8">
          <h1 className="text-3xl font-bold text-slate-900">Settings</h1>

          <Card>
            <CardHeader>
              <CardTitle>Profile Settings</CardTitle>
              <CardDescription>Manage your account settings and preferences.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="Your name" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="Your email" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="bg-brand-500 hover:bg-brand-600">Save Changes</Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notifications</CardTitle>
              <CardDescription>Configure how you want to be notified.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Notification settings coming soon.</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
