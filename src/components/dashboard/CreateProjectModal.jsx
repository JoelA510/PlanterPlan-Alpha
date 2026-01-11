import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from 'components/ui/dialog';
import { Button } from 'components/ui/button';
import { Input } from 'components/ui/input';
import { Textarea } from 'components/ui/textarea';
import { Label } from 'components/ui/label';
import { Calendar } from 'components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from 'components/ui/popover';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Rocket,
  Building2,
  GitBranch,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from 'lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const templates = [
  {
    id: 'launch_large',
    name: 'Launch Large',
    description: 'Traditional church plant with significant launch day',
    icon: Rocket,
  },
  {
    id: 'multisite',
    name: 'Multisite',
    description: 'New campus location expansion',
    icon: Building2,
  },
  {
    id: 'multiplication',
    name: 'Multiplication',
    description: 'Reproducing and multiplying congregations',
    icon: GitBranch,
  },
];

export default function CreateProjectModal({ open, onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    template: '',
    launch_date: null,
    location: '',
    status: 'planning',
  });

  const handleTemplateSelect = (templateId) => {
    setFormData({ ...formData, template: templateId });
    setStep(2);
  };

  const handleCreate = async () => {
    setLoading(true);
    await onCreate(formData);
    setLoading(false);
    setStep(1);
    setFormData({
      name: '',
      description: '',
      template: '',
      launch_date: null,
      location: '',
      status: 'planning',
    });
    onClose();
  };

  const handleClose = () => {
    setStep(1);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 1 ? 'Choose a Template' : 'Project Details'}
          </DialogTitle>
          <DialogDescription>
            {step === 1
              ? 'Select a template that fits your church planting vision'
              : 'Fill in the details for your new project'}
          </DialogDescription>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {step === 1 ? (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="grid gap-3 py-4"
            >
              {templates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template.id)}
                  className={cn(
                    'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left bg-white',
                    'hover:border-orange-300 hover:bg-orange-50 hover:shadow-md',
                    formData.template === template.id
                      ? 'border-orange-500 bg-orange-50'
                      : 'border-slate-200'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center transition-colors',
                      formData.template === template.id ? 'bg-orange-500' : 'bg-slate-100'
                    )}
                  >
                    <template.icon
                      className={cn(
                        'w-6 h-6',
                        formData.template === template.id ? 'text-white' : 'text-slate-600'
                      )}
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-slate-900">{template.name}</h4>
                    <p className="text-sm text-slate-500">{template.description}</p>
                  </div>
                  {formData.template === template.id && (
                    <CheckCircle2 className="w-5 h-5 text-orange-500 ml-auto" />
                  )}
                </button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="grid gap-5 py-4"
            >
              <div className="space-y-2">
                <Label htmlFor="name">Project Name *</Label>
                <Input
                  id="name"
                  placeholder="e.g., Grace Community Church"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Brief description of your church plant..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="resize-none h-20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Target Launch Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-11',
                          !formData.launch_date && 'text-muted-foreground'
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {formData.launch_date ? format(formData.launch_date, 'PPP') : 'Pick a date'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={formData.launch_date}
                        onSelect={(date) => setFormData({ ...formData, launch_date: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="City, State"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="h-11"
                  />
                </div>
              </div>

              <div className="flex justify-between pt-4">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={handleCreate}
                  disabled={!formData.name || loading}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Project'
                  )}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
