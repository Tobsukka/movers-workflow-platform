import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAuth } from '../../contexts/AuthContext';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().min(10, 'Phone number must be at least 10 characters'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function Profile() {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/users/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data.user;
    },
    retry: 1,
    enabled: !!token,
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: profile?.name || '',
      phone: profile?.phone || '',
      address: profile?.address || '',
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/users/${user?.id}`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setIsEditing(false);
      setError(null);
    },
    onError: (error: any) => {
      setError(
        error.response?.data?.message ||
          'An error occurred while updating your profile'
      );
    },
  });

  const onSubmit = async (data: ProfileFormData) => {
    await updateProfileMutation.mutateAsync(data);
  };

  const handleEdit = () => {
    reset({
      name: profile?.name,
      phone: profile?.phone,
      address: profile?.address,
    });
    setIsEditing(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">View and update your profile information</p>
      </div>

      <div className="border rounded-lg p-6 space-y-6">
        {isEditing ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" {...register('name')} />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input id="phone" {...register('phone')} />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input id="address" {...register('address')} />
              {errors.address && (
                <p className="text-sm text-destructive">
                  {errors.address.message}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditing(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="font-medium">Email</div>
              <div className="col-span-2 text-muted-foreground">
                {profile?.email}
              </div>

              <div className="font-medium">Full Name</div>
              <div className="col-span-2 text-muted-foreground">
                {profile?.name}
              </div>

              <div className="font-medium">Phone Number</div>
              <div className="col-span-2 text-muted-foreground">
                {profile?.phone || 'Not provided'}
              </div>

              <div className="font-medium">Address</div>
              <div className="col-span-2 text-muted-foreground">
                {profile?.address || 'Not provided'}
              </div>

              <div className="font-medium">Account Status</div>
              <div className="col-span-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                    profile?.verified
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {profile?.verified ? 'Verified' : 'Pending Verification'}
                </span>
              </div>

              <div className="font-medium">Member Since</div>
              <div className="col-span-2 text-muted-foreground">
                {new Date(profile?.createdAt).toLocaleDateString()}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleEdit}>Edit Profile</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 