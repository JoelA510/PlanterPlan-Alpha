import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '@shared/ui/dialog';
import { Button } from '@shared/ui/button';
import { Input } from '@shared/ui/input';
import { Label } from '@shared/ui/label';
import { RadioGroup, RadioGroupItem } from '@shared/ui/radio-group';
import { Loader2, ArrowRight, Calendar as CalendarIcon, X } from 'lucide-react';
import { Calendar } from '@shared/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@shared/ui/popover';
import { format } from 'date-fns';
import { cn } from '@shared/lib/utils';

export default function OnboardingWizard({ open, onCreateProject, onDismiss }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        launchDate: null,
        template: 'launch_large'
    });

    const handleNext = () => {
        setStep(step + 1);
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        setLoading(true);
        try {
            await onCreateProject({
                title: formData.name, // Changed to match standard prop name
                launch_date: formData.launchDate,
                template: formData.template, // Correctly passing the ID
                status: 'planning'
            });
            // Dialog will be closed by parent usually, but we can ensure state reset
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onDismiss && onDismiss()}>
            <DialogContent className="sm:max-w-lg">
                {/* Close Button manually added if standard one is hidden or to ensure visibility */}
                <button
                    onClick={onDismiss}
                    className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                </button>

                <DialogHeader>
                    <div className="flex items-center justify-between mb-4">
                        <DialogTitle className="text-xl">
                            {step === 1 && "Welcome to PlanterPlan"}
                            {step === 2 && "When is the big day?"}
                            {step === 3 && "Choose your path"}
                        </DialogTitle>
                        <span className="text-sm text-slate-400 font-medium">Step {step} of 3</span>
                    </div>
                    <DialogDescription>
                        {step === 1 && "Let's get your first church planting project set up in seconds."}
                        {step === 2 && "We'll build your timeline backwards from your launch date."}
                        {step === 3 && "Select a template based on your church model."}
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 min-h-[200px]">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>What is the name of your new church?</Label>
                                <Input
                                    placeholder="e.g., Grace Community Church"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    autoFocus
                                    className="h-11"
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Projected Launch Date</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={cn(
                                                "w-full justify-start text-left font-normal h-11",
                                                !formData.launchDate && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {formData.launchDate ? format(formData.launchDate, "PPP") : "Pick a date"}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={formData.launchDate}
                                            onSelect={(date) => setFormData({ ...formData, launchDate: date })}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <p className="text-xs text-slate-500">Don&apos;t worry, you can change this later.</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <RadioGroup value={formData.template} onValueChange={(val) => setFormData({ ...formData, template: val })}>
                                <div className={cn(
                                    "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all",
                                    formData.template === 'launch_large'
                                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40 ring-1 ring-brand-500/20"
                                        : "border-border hover:border-brand-300 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                )}>
                                    <RadioGroupItem value="launch_large" id="t1" className="mt-1" />
                                    <div className="flex-1">
                                        <Label htmlFor="t1" className="font-semibold cursor-pointer text-slate-900 dark:text-slate-100">Launch Large</Label>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Standard ARC/CMN model. 6 phases, ~200 tasks focusing on a strong day-one launch.</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all",
                                    formData.template === 'multiplication'
                                        ? "border-brand-500 bg-brand-50 dark:bg-brand-900/40 ring-1 ring-brand-500/20"
                                        : "border-border hover:border-brand-300 hover:bg-slate-50 dark:hover:bg-slate-900/50"
                                )}>
                                    <RadioGroupItem value="multiplication" id="t2" className="mt-1" />
                                    <div className="flex-1">
                                        <Label htmlFor="t2" className="font-semibold cursor-pointer text-slate-900 dark:text-slate-100">Simple / House Church</Label>
                                        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Simplified flow for smaller, gathering-based plants.</p>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between items-center w-full">
                    {step > 1 ? (
                        <Button type="button" variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                    ) : (
                        <Button type="button" variant="ghost" onClick={onDismiss} className="text-muted-foreground hover:text-foreground">Skip</Button>
                    )}

                    {step < 3 ? (
                        <Button type="button" onClick={handleNext} disabled={!formData.name && step === 1}>
                            Next <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button type="button" onClick={handleSubmit} disabled={loading} className="bg-orange-500 hover:bg-orange-600 text-white">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Project
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
