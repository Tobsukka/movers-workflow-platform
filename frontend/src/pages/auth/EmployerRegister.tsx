import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { useAuth } from '../../contexts/AuthContext';

const registerSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  address: z.string().min(5, 'Business address must be at least 5 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function EmployerRegister() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if not admin
  if (user?.role !== 'ADMIN') {
    return (
      <div className="mx-auto max-w-md space-y-6">
        <div className="rounded-md bg-destructive/15 p-4 text-center">
          <p className="text-destructive">
            Only administrators can register new employers.
          </p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => navigate('/login/employer')}
          >
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    try {
      setError(null);
      setIsLoading(true);
      await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/employer/register`,
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );
      navigate('/employer/employees', {
        state: { message: 'Employer account created successfully.' },
      });
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('An error occurred during registration. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-3xl font-bold">Register New Employer</h1>
        <p className="text-muted-foreground">
          Create a new employer account
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="name" className="text-sm font-medium">
            Company Name
          </label>
          <Input
            id="name"
            placeholder="Moving Company Inc."
            {...register('name')}
          />
          {errors.name && (
            <p className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="email" className="text-sm font-medium">
            Business Email
          </label>
          <Input
            id="email"
            type="email"
            placeholder="contact@company.com"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            {...register('password')}
          />
          {errors.password && (
            <p className="text-sm text-destructive">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="phone" className="text-sm font-medium">
            Business Phone
          </label>
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (555) 000-0000"
            {...register('phone')}
          />
          {errors.phone && (
            <p className="text-sm text-destructive">{errors.phone.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="address" className="text-sm font-medium">
            Business Address
          </label>
          <Input
            id="address"
            placeholder="123 Business St, City, State, ZIP"
            {...register('address')}
          />
          {errors.address && (
            <p className="text-sm text-destructive">{errors.address.message}</p>
          )}
        </div>

        {error && (
          <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? 'Creating account...' : 'Create Employer Account'}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/employer/employees" className="text-primary hover:underline">
            Back to Employees
          </Link>
        </p>
      </form>
    </div>
  );
} 