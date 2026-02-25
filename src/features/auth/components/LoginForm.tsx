import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/app/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const LoginForm = () => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof loginSchema>) => {
    setLoading(true);

    try {
      let result;
      if (isSignUp) {
        result = await signUp(data.email, data.password);
      } else {
        result = await signIn(data.email, data.password);
      }

      if (result.error) {
        throw result.error;
      } else {
        navigate('/dashboard');
      }
    } catch (err: unknown) {
      toast.error(isSignUp ? 'Sign up failed' : 'Login failed', {
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-background">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-600">PlanterPlan</h2>
          <p className="mt-2 text-center text-sm text-slate-600 dark:text-muted-foreground">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <form className="bg-white dark:bg-card py-8 px-4 shadow sm:rounded-lg sm:px-10" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-foreground">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-slate-300 dark:border-input'} placeholder-slate-400 dark:bg-background dark:text-foreground rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500`}
                placeholder="Enter your email"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-foreground">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-slate-300 dark:border-input'} placeholder-slate-400 dark:bg-background dark:text-foreground rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500`}
                placeholder="Enter your password"
                {...register('password')}
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500/20 disabled:opacity-50 transition-colors shadow-sm"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isSignUp ? 'Sign Up' : 'Sign In')}
              </button>
            </div>

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-brand-600 hover:text-brand-500 font-medium"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </div>

            {import.meta.env.DEV && (
              <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-4 text-center">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">Dev Mode Shortcut:</p>
                {import.meta.env.VITE_TEST_EMAIL && import.meta.env.VITE_TEST_PASSWORD ? (
                  <button
                    type="button"
                    onClick={async () => {
                      setLoading(true);
                      try {
                        const result = await signIn(
                          import.meta.env.VITE_TEST_EMAIL as string,
                          import.meta.env.VITE_TEST_PASSWORD as string
                        );
                        if (result.error) throw result.error;
                        navigate('/dashboard');
                      } catch (err: unknown) {
                        toast.error('Dev Login Failed', {
                          description: err instanceof Error ? err.message : 'An unexpected error occurred',
                        });
                      } finally {
                        setLoading(false);
                      }
                    }}
                    className="text-xs text-brand-600 underline hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300"
                  >
                    (Auto-Login as Test User)
                  </button>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500">(Configure .env for Dev Login)</span>
                )}
              </div>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
