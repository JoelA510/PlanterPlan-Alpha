import React, { useState } from 'react';
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
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react';

export default function OnboardingWizard({ open, onCreateProject }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        launchDate: '',
        template: 'Launch Large'
    });

    const handleNext = () => {
        setStep(step + 1);
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await onCreateProject({
                name: formData.name,
                launch_date: formData.launchDate, // Note: Service expects snake_case usually, ensure compatibility
                project_type: 'primary',
                template_id: 'default' // This will trigger default template hydration in service
            });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={() => { }}>
            <DialogContent className="sm:max-w-lg" hideClose>
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

                <div className="py-6">
                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>What is the name of your new church?</Label>
                                <Input
                                    placeholder="e.g. Grace Community Church"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    autoFocus
                                />
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Projected Launch Date</Label>
                                <Input
                                    type="date"
                                    value={formData.launchDate}
                                    onChange={(e) => setFormData({ ...formData, launchDate: e.target.value })}
                                />
                                <p className="text-xs text-slate-500">Don't worry, you can change this later.</p>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-4">
                            <RadioGroup value={formData.template} onValueChange={(val) => setFormData({ ...formData, template: val })}>
                                <div className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${formData.template === 'Launch Large' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <RadioGroupItem value="Launch Large" id="t1" className="mt-1" />
                                    <div className="flex-1">
                                        <Label htmlFor="t1" className="font-semibold cursor-pointer">Launch Large</Label>
                                        <p className="text-sm text-slate-600 mt-1">Standard ARC/CMN model. 6 phases, ~200 tasks focusing on a strong day-one launch.</p>
                                    </div>
                                </div>
                                <div className={`flex items-start space-x-3 p-4 rounded-lg border cursor-pointer transition-all ${formData.template === 'Micro' ? 'border-orange-500 bg-orange-50' : 'border-slate-200 hover:border-slate-300'}`}>
                                    <RadioGroupItem value="Micro" id="t2" className="mt-1" />
                                    <div className="flex-1">
                                        <Label htmlFor="t2" className="font-semibold cursor-pointer">Simple / House Church</Label>
                                        <p className="text-sm text-slate-600 mt-1">Simplified flow for smaller, gathering-based plants.</p>
                                    </div>
                                </div>
                            </RadioGroup>
                        </div>
                    )}
                </div>

                <DialogFooter className="flex justify-between sm:justify-between">
                    {step > 1 ? (
                        <Button variant="ghost" onClick={() => setStep(step - 1)}>Back</Button>
                    ) : <div />}

                    {step < 3 ? (
                        <Button onClick={handleNext} disabled={!formData.name && step === 1}>
                            Next <ArrowRight className="w-4 h-4 ml-2" />
                        </Button>
                    ) : (
                        <Button onClick={handleSubmit} disabled={loading} className="bg-orange-500 hover:bg-orange-600">
                            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Project
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
