
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowRight, CheckCircle, Shield, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Section */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <h1 className="text-5xl md:text-6xl font-extrabold text-slate-900 tracking-tight leading-tight mb-6">
              Plant Your Church <br />
              <span className="text-brand-600">With Confidence</span>
            </h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
              The all-in-one platform for church planters to plan, launch, and grow healthy
              churches. Streamline your journey from calling to launch day.
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <Link to="/dashboard">
                <Button
                  size="lg"
                  className="bg-brand-500 hover:bg-brand-600 h-14 px-8 text-lg shadow-xl shadow-brand-500/20"
                >
                  Get Started
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/about">
                <Button
                  variant="outline"
                  size="lg"
                  className="h-14 px-8 text-lg border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Learn More
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900">Everything you need to launch</h2>
            <p className="text-slate-600 mt-4 text-lg">
              Comprehensive tools designed specifically for church planting teams.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={Zap}
              title="Strategic Planning"
              description="Proven templates and timelines to guide you through every phase of the planting process."
            />
            <FeatureCard
              icon={CheckCircle}
              title="Task Management"
              description="Keep your team aligned with integrated task tracking linked to your launch goals."
            />
            <FeatureCard
              icon={Shield}
              title="Team Coordination"
              description="Manage roles, assign responsibilities, and keep everyone on the same page."
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-brand-200 transition-all"
    >
      <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center mb-6">
        <Icon className="w-6 h-6 text-brand-600" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </motion.div>
  );
}
