import { Link } from 'react-router-dom';
import { createPageUrl } from '@shared/lib/utils';
import { Button } from '@shared/ui/button';
import { motion } from 'framer-motion';
import {
  CheckCircle2,
  Users,
  Target,
  Calendar,
  ArrowRight,
  Sparkles,
  BarChart3,
  Clock,
} from 'lucide-react';

export default function Home() {
  const features = [
    {
      icon: Target,
      title: 'Phase-Based Planning',
      description:
        'Break down your church plant into 6 manageable phases with clear milestones and actionable tasks.',
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Invite team members, delegate tasks, and keep everyone aligned on the mission.',
    },
    {
      icon: Calendar,
      title: 'Smart Scheduling',
      description:
        'Set your launch date and let the system calculate optimal timelines for each task.',
    },
    {
      icon: BarChart3,
      title: 'Progress Tracking',
      description:
        'Visual reports and dashboards help you see exactly where you stand at any moment.',
    },
  ];

  const templates = [
    {
      name: 'Launch Large',
      description: 'For traditional church plants aiming for significant launch day attendance',
      tasks: '200+ tasks',
    },
    {
      name: 'Multisite',
      description: 'Perfect for churches expanding with new campus locations',
      tasks: '150+ tasks',
    },
    {
      name: 'Multiplication',
      description: 'Focus on reproducing and multiplying new congregations',
      tasks: '180+ tasks',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Ccircle cx='40' cy='8' r='2'/%3E%3Ccircle cx='40' cy='40' r='3'/%3E%3Ccircle cx='8' cy='40' r='2'/%3E%3Ccircle cx='72' cy='40' r='2'/%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3Ccircle cx='60' cy='20' r='1.5'/%3E%3Ccircle cx='20' cy='60' r='1.5'/%3E%3Ccircle cx='60' cy='60' r='1.5'/%3E%3Cpath d='M40 40L20 20M40 40L60 20M40 40L20 60M40 40L60 60M40 40L8 40M40 40L72 40M40 40L40 8' stroke='%23ffffff' stroke-width='0.5' stroke-opacity='0.3'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative max-w-6xl mx-auto px-4 py-24 md:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="inline-flex items-center gap-2 bg-orange-500/20 text-orange-300 px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Sparkles className="w-4 h-4" />
              <span>Church Planting Made Simple</span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight">
              Manage church planting
              <span className="block text-orange-400">without going crazy</span>
            </h1>

            <p className="text-lg md:text-xl text-slate-300 max-w-2xl mx-auto mb-10 leading-relaxed">
              Focus on what matters most — people. Let PlanterPlan handle the details, timelines,
              and tasks so you can lead with clarity and purpose.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={createPageUrl('Dashboard')}>
                <Button
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-orange-500/25 transition-all hover:shadow-xl hover:shadow-orange-500/30"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Button
                size="lg"
                variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800 px-8 py-6 text-lg rounded-xl"
              >
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z"
              fill="var(--color-slate-50)"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Everything you need to plant with confidence
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Built by planters, for planters. Every feature designed to keep you focused on
              ministry.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="group p-8 bg-white rounded-2xl border border-slate-200 hover:border-orange-200 hover:shadow-xl hover:shadow-orange-500/5 transition-all duration-300"
              >
                <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-3">{feature.title}</h3>
                <p className="text-slate-600 leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Templates Section */}
      <section className="py-20 md:py-28 px-4 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
              Start with proven templates
            </h2>
            <p className="text-lg text-slate-600 max-w-2xl mx-auto">
              Choose a template that fits your vision. Each one is based on real-world church
              planting experience.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {templates.map((template, index) => (
              <motion.div
                key={template.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-card rounded-2xl p-8 border border-border hover:border-brand-200 transition-all hover:shadow-lg group"
              >
                <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-500 transition-colors">
                  <CheckCircle2 className="w-6 h-6 text-orange-500 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-slate-900 mb-2">{template.name}</h3>
                <p className="text-slate-600 mb-4 leading-relaxed">{template.description}</p>
                <span className="inline-flex items-center gap-2 text-sm text-orange-600 font-medium">
                  <Clock className="w-4 h-4" />
                  {template.tasks}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-28 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-10 md:p-16 text-center relative overflow-hidden"
          >
            <div
              className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23fff' fill-opacity='1' fill-rule='evenodd'%3E%3Cpath d='M0 40L40 0H20L0 20M40 40V20L20 40'/%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />

            <div className="relative">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to plant with clarity?
              </h2>
              <p className="text-lg text-slate-300 mb-8 max-w-xl mx-auto">
                Join hundreds of church planters who use PlanterPlan to stay organized and focused
                on people.
              </p>
              <Link to={createPageUrl('Dashboard')}>
                <Button
                  size="lg"
                  className="bg-orange-500 hover:bg-orange-600 text-white px-10 py-6 text-lg rounded-xl"
                >
                  Start Your Project
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-12 px-4">
        <div className="max-w-6xl mx-auto text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">PlanterPlan</span>
          </div>
          <p className="text-slate-500">Helping church planters focus on what matters most.</p>
        </div>
      </footer>
    </div>
  );
}
