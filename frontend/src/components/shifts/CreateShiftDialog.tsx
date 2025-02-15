import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const shiftSchema = z.object({
  employeeId: z.string().min(1, 'Employee is required'),
  startTime: z.string().min(1, 'Start time is required'),
  endTime: z.string().min(1, 'End time is required'),
  location: z.string().min(1, 'Location is required'),
});

type ShiftFormData = z.infer<typeof shiftSchema>;

interface CreateShiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateShiftDialog({
  open,
  onOpenChange,
}: CreateShiftDialogProps) {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftSchema),
  });

  const { data: employees } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users`);
      return response.data.data.users.filter(
        (user: any) => user.role === 'EMPLOYEE' && user.verified
      );
    },
  });

  const createShiftMutation = useMutation({
    mutationFn: async (data: ShiftFormData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/shifts`,
        data
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      reset();
      onOpenChange(false);
    },
    onError: (error: any) => {
      setError(
        error.response?.data?.message ||
          'An error occurred while creating the shift'
      );
    },
  });

  const onSubmit = async (data: ShiftFormData) => {
    setError(null);
    await createShiftMutation.mutateAsync(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Shift</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="employeeId">Employee</Label>
            <Select
              onValueChange={(value: string) => setValue('employeeId', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees?.map((employee: any) => (
                  <SelectItem key={employee.id} value={employee.id}>
                    {employee.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.employeeId && (
              <p className="text-sm text-destructive">
                {errors.employeeId.message}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time</Label>
              <Input
                id="startTime"
                type="datetime-local"
                {...register('startTime')}
              />
              {errors.startTime && (
                <p className="text-sm text-destructive">
                  {errors.startTime.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="endTime">End Time</Label>
              <Input
                id="endTime"
                type="datetime-local"
                {...register('endTime')}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">
                  {errors.endTime.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              placeholder="Enter shift location"
              {...register('location')}
            />
            {errors.location && (
              <p className="text-sm text-destructive">
                {errors.location.message}
              </p>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createShiftMutation.isPending}
            >
              {createShiftMutation.isPending ? 'Creating...' : 'Create Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 