import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/shared/contexts/AuthContext';
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
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-brand-600">PlanterPlan</h2>
          <p className="mt-2 text-center text-sm text-slate-600">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <form className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                Email address
              </label>
              <input
                id="email"
                type="email"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${errors.email ? 'border-red-500' : 'border-slate-300'} placeholder-slate-400 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500`}
                placeholder="Enter your email"
                {...register('email')}
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="password"
                type="password"
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border ${errors.password ? 'border-red-500' : 'border-slate-300'} placeholder-slate-400 rounded focus:outline-none focus:ring-brand-500 focus:border-brand-500`}
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

            {String(import.meta.env.VITE_E2E_MODE) === 'true' && (
              <button
                type="button"
                className="mt-4 w-full text-sm text-slate-500 hover:text-slate-700 underline"
                onClick={(e) => {
                  e.preventDefault();
                  const email = String(import.meta.env.VITE_TEST_EMAIL || '');
                  const password = String(import.meta.env.VITE_TEST_PASSWORD || '');
                  signIn(email, password);
                }}
              >
                (Auto-Login as Test User)
              </button>
            )}

            <div className="text-center">
              <button
                type="button"
                className="text-sm text-brand-600 hover:text-brand-500 font-medium"
                onClick={() => setIsSignUp(!isSignUp)}
              >
                {isSignUp ? 'Already have an account? Sign in' : 'Need an account? Sign up'}
              </button>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginForm;
