import { useNavigate } from 'react-router-dom';
import { Card } from '@/shared/ui/card';
import { Button } from '@/shared/ui/button';
import { Progress } from '@/shared/ui/progress';
import {
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Layout,
  Plus,
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { TaskRow } from '@/shared/db/app.types';

interface InstanceListProps {
  instances: TaskRow[];
  onNewProject: () => void;
}

export default function InstanceList({ instances, onNewProject }: InstanceListProps) {
  const navigate = useNavigate();

  if (instances.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border-2 border-dashed border-slate-200">
        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mb-4">
          <Layout className="w-8 h-8 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2">No Active Projects</h3>
        <p className="text-slate-500 mb-8 max-w-sm text-center">
          You haven't created any projects yet. Start by using one of our proven templates or create
          from scratch.
        </p>
        <Button
          onClick={onNewProject}
          className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-6 rounded-xl text-lg font-semibold shadow-lg shadow-brand-200 transition-all hover:scale-105"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Your First Project
        </Button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {instances.map((instance, index) => {
        // Mock progress for now, in a real app this would be calculated
        const progress = Math.floor(Math.random() * 60) + 20;

        return (
          <motion.div
            key={instance.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card
              className="group cursor-pointer overflow-hidden border-2 border-slate-100 hover:border-brand-300 bg-white shadow-sm hover:shadow-xl transition-all duration-300 rounded-2xl"
              onClick={() => navigate(`/Project/${instance.id}`)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-brand-50 flex items-center justify-center group-hover:bg-brand-600 transition-colors">
                    <Layout className="w-6 h-6 text-brand-600 group-hover:text-white transition-colors" />
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 rounded-full text-xs font-semibold text-slate-600">
                    <Clock className="w-3 h-3" />
                    Updated 2h ago
                  </div>
                </div>

                <h3 className="text-xl font-bold text-slate-900 mb-2 group-hover:text-brand-600 transition-colors">
                  {instance.title}
                </h3>

                <div className="space-y-4 mb-6">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Calendar className="w-4 h-4" />
                    <span>Started Jan 12, 2024</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span className="text-slate-500">Overall Progress</span>
                    <span className="text-brand-600">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-slate-100" />
                </div>
              </div>

              <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between group-hover:bg-brand-50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div
                        key={i}
                        className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600"
                      >
                        JD
                      </div>
                    ))}
                    <div className="w-8 h-8 rounded-full border-2 border-white bg-brand-100 flex items-center justify-center text-[10px] font-bold text-brand-600">
                      +4
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-slate-500">7 Members</span>
                </div>
                <div className="flex items-center gap-1 text-xs font-bold text-brand-600 group-hover:translate-x-1 transition-transform">
                  View Details
                  <ChevronRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </motion.div>
        );
      })}

      <Card
        onClick={onNewProject}
        className="group cursor-pointer border-2 border-dashed border-slate-200 hover:border-brand-400 hover:bg-brand-50/30 transition-all duration-300 rounded-2xl flex flex-col items-center justify-center p-8 bg-transparent min-h-[300px]"
      >
        <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 group-hover:bg-brand-100 transition-colors">
          <Plus className="w-8 h-8 text-slate-400 group-hover:text-brand-600" />
        </div>
        <span className="text-lg font-bold text-slate-500 group-hover:text-brand-700 transition-colors">
          Start New Project
        </span>
      </Card>
    </div>
  );
}
