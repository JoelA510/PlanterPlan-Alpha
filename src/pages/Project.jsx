import React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { planter } from 'api/planterClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

export default function Project() {
  const { id } = useParams();

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => planter.entities.Project.get(id),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    );
  }

  if (!project) {
    return <div>Project not found</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">{project.name}</h1>
            <p className="text-slate-600 mt-2">{project.description}</p>
          </div>
          <Badge className="bg-orange-100 text-orange-700 hover:bg-orange-200">
            {project.status}
          </Badge>
        </div>

        {/* Details Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Launch Date</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {project.launch_date ? format(new Date(project.launch_date), 'PPP') : 'Not set'}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Location</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{project.location || 'TBD'}</div>
            </CardContent>
          </Card>
          {/* Add more cards for stats */}
        </div>

        {/* Content Area - Milestones/Tasks would go here */}
        <Card>
          <CardHeader>
            <CardTitle>Project Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-500">Milestone timeline implementation coming soon...</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
