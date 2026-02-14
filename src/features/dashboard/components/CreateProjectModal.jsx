import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@shared/ui/dialog';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Textarea } from '@shared/ui/textarea';
import { Label } from '@shared/ui/label';
import { Calendar } from '@shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import { format } from 'date-fns';
import {
  Calendar as CalendarIcon,
  Rocket,
  Building2,
  GitBranch,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@shared/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { PROJECT_STATUS } from '@app/constants/index';
import { z } from 'zod';
import { projectSchema } from '@entities/project/model';



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
  {
    id: 'blank',
    name: 'Start from scratch',
    description: 'Empty project with no predefined tasks',
    icon: Rocket, // Reusing Rocket or importing another if needed, but let's stick to existing imports or add one.
  },
];

export default function CreateProjectModal({ open, onClose, onCreate }) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    template: '',
    launch_date: null,
    location: '',
    status: PROJECT_STATUS.PLANNING,
  });

  const handleTemplateSelect = (templateId) => {
    setFormData({ ...formData, template: templateId });
    setErrors((prev) => ({ ...prev, template: null }));
    setStep(2);
  };

  const validateForm = () => {
    try {
      projectSchema.parse(formData);
      setErrors({});
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const fieldErrors = {};
        err.errors?.forEach((e) => {
          fieldErrors[e.path[0]] = e.message;
        });
        setErrors(fieldErrors);
      }
      return false;
    }
  };

  const handleCreate = async (e) => {
    if (e) e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      await onCreate({
        ...formData,
        templateId: formData.template
      });

      // Reset form
      setStep(1);
      setFormData({
        title: '',
        description: '',
        template: '',
        launch_date: null,
        location: '',
        status: PROJECT_STATUS.PLANNING,
      });
      setErrors({});
      onClose();
    } catch (error) {
      console.error('[CreateProjectModal] Failed to create project:', error);
      // We assume parent handles the toast, but we can set a general error here if needed
      setErrors({ root: error.message || 'Failed to create project.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setErrors({});
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {step === 1 ? 'Choose a Template' : 'Project Details'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {step === 1
              ? 'Select a template that fits your church planting vision'
              : 'Fill in the details for your new project'}
          </DialogDescription>
        </DialogHeader>

        {errors.root && (
          <div className="bg-red-50 text-red-600 p-3 rounded-md text-sm mb-4">
            {errors.root}
          </div>
        )}

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
                    'flex items-center gap-4 p-4 rounded-xl border-2 transition-all text-left bg-card group',
                    'hover:border-brand-300 hover:bg-brand-50/50 dark:hover:bg-brand-900/20 hover:shadow-md cursor-pointer',
                    formData.template === template.id
                      ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/40 ring-1 ring-brand-500/20'
                      : 'border-border'
                  )}
                >
                  <div
                    className={cn(
                      'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
                      formData.template === template.id
                        ? 'bg-gradient-to-br from-brand-500 to-brand-600 shadow-md shadow-brand-500/20 scale-110'
                        : 'bg-muted group-hover:bg-brand-100 dark:group-hover:bg-brand-900/50 group-hover:scale-105'
                    )}
                  >
                    <template.icon
                      className={cn(
                        'w-6 h-6',
                        formData.template === template.id
                          ? 'text-white'
                          : 'text-muted-foreground group-hover:text-brand-600 dark:group-hover:text-brand-400'
                      )}
                    />
                  </div>
                  <div>
                    <h4 className="font-semibold text-card-foreground">{template.name}</h4>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  {
                    formData.template === template.id && (
                      <CheckCircle2 className="w-5 h-5 text-orange-500 ml-auto" />
                    )
                  }
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
                <Label htmlFor="title" className={cn(errors.title && "text-red-500")}>
                  Project Name *
                </Label>
                <Input
                  id="title"
                  placeholder="e.g., Grace Community Church"
                  value={formData.title}
                  onChange={(e) => {
                    setFormData({ ...formData, title: e.target.value });
                    if (errors.title) setErrors((prev) => ({ ...prev, title: null }));
                  }}
                  className={cn("h-11", errors.title && "border-red-500 focus-visible:ring-red-500")}
                />
                {errors.title && (
                  <p className="text-xs text-red-500 mt-1">{errors.title}</p>
                )}
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

              {/* Removed Project Type Selector - Defaulting to Standard Project */}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className={cn(errors.launch_date && "text-red-500")}>Target Launch Date *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start text-left font-normal h-11',
                          !formData.launch_date && 'text-muted-foreground',
                          errors.launch_date && "border-red-500 text-red-500"
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
                        onSelect={(date) => {
                          setFormData({ ...formData, launch_date: date });
                          if (errors.launch_date) setErrors((prev) => ({ ...prev, launch_date: null }));
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  {errors.launch_date && (
                    <p className="text-xs text-red-500 mt-1">{errors.launch_date}</p>
                  )}
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
                  disabled={loading}
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
    </Dialog >
  );
}
