import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from 'components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const data = [
  { name: 'Jan', tasks: 12 },
  { name: 'Feb', tasks: 19 },
  { name: 'Mar', tasks: 3 },
  { name: 'Apr', tasks: 5 },
  { name: 'May', tasks: 2 },
  { name: 'Jun', tasks: 3 },
];

import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../layouts/DashboardLayout';
import SideNav from '../features/navigation/components/SideNav';

export default function Reports() {
  const navigate = useNavigate();

  const reportsContent = (
    <div className="max-w-7xl mx-auto grid gap-8 p-8">
      <h1 className="text-3xl font-bold text-slate-900">Reports</h1>

      <div className="grid md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Task Completion Velocity</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="var(--color-primary)" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Team Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Core Team</span>
                <span className="text-sm text-slate-500">85% tasks completed</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-500 w-[85%]" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <DashboardLayout
      sidebar={
        <SideNav
          joinedProjects={[]}
          instanceTasks={[]}
          templateTasks={[]}
          handleSelectProject={(p) => navigate(`/project/${p.id}`)}
          onNewProjectClick={() => navigate('/dashboard')}
          onNewTemplateClick={() => { }}
        />
      }
    >
      {reportsContent}
    </DashboardLayout>
  );
}
