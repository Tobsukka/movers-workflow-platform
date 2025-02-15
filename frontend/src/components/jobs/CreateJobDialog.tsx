import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';

const jobSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  pickupLocation: z.string().min(1, 'Pickup location is required'),
  deliveryLocation: z.string().min(1, 'Delivery location is required'),
  date: z.string().min(1, 'Date is required'),
  estimatedHours: z.number().min(1, 'Estimated hours must be at least 1'),
  numberOfMovers: z.number().min(1, 'Number of movers must be at least 1'),
  items: z.string().min(1, 'List of items is required'),
  specialRequirements: z.string().optional(),
  customerName: z.string().min(1, 'Customer name is required'),
  customerPhone: z.string().min(10, 'Valid phone number is required'),
  customerEmail: z.string().email().optional().or(z.literal('')),
  floorNumber: z.number().optional(),
  hasElevator: z.boolean().default(false),
  price: z.number().min(1, 'Price must be greater than 0'),
});

type JobFormData = z.infer<typeof jobSchema>;

interface CreateJobDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateJobDialog({
  open,
  onOpenChange,
}: CreateJobDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobSchema),
    defaultValues: {
      hasElevator: false,
    },
  });

  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/jobs`,
        {
          ...data,
          items: data.items.split('\n').map(item => item.trim()).filter(Boolean),
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      reset();
      onOpenChange(false);
    },
  });

  const onSubmit = async (data: JobFormData) => {
    setIsSubmitting(true);
    try {
      await createJobMutation.mutateAsync(data);
    } catch (error) {
      console.error('Failed to create job:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Moving Job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {/* Job Details */}
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                {...register('title')}
                placeholder="e.g., 2-Bedroom Apartment Move"
              />
              {errors.title && (
                <p className="text-sm text-destructive">{errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Moving Date</Label>
              <Input
                id="date"
                type="datetime-local"
                {...register('date')}
              />
              {errors.date && (
                <p className="text-sm text-destructive">{errors.date.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickupLocation">Pickup Location</Label>
              <Input
                id="pickupLocation"
                {...register('pickupLocation')}
                placeholder="Full pickup address"
              />
              {errors.pickupLocation && (
                <p className="text-sm text-destructive">{errors.pickupLocation.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="deliveryLocation">Delivery Location</Label>
              <Input
                id="deliveryLocation"
                {...register('deliveryLocation')}
                placeholder="Full delivery address"
              />
              {errors.deliveryLocation && (
                <p className="text-sm text-destructive">{errors.deliveryLocation.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedHours">Estimated Hours</Label>
              <Input
                id="estimatedHours"
                type="number"
                min="1"
                {...register('estimatedHours', { valueAsNumber: true })}
              />
              {errors.estimatedHours && (
                <p className="text-sm text-destructive">{errors.estimatedHours.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="numberOfMovers">Number of Movers</Label>
              <Input
                id="numberOfMovers"
                type="number"
                min="1"
                {...register('numberOfMovers', { valueAsNumber: true })}
              />
              {errors.numberOfMovers && (
                <p className="text-sm text-destructive">{errors.numberOfMovers.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                min="0"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="items">Items to Move (one per line)</Label>
            <Textarea
              id="items"
              {...register('items')}
              placeholder="List all items to be moved..."
              rows={4}
            />
            {errors.items && (
              <p className="text-sm text-destructive">{errors.items.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional Details</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Any additional details about the move..."
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="specialRequirements">Special Requirements</Label>
            <Textarea
              id="specialRequirements"
              {...register('specialRequirements')}
              placeholder="Any special handling instructions or requirements..."
            />
          </div>

          {/* Customer Information */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                {...register('customerName')}
                placeholder="Full name"
              />
              {errors.customerName && (
                <p className="text-sm text-destructive">{errors.customerName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="customerPhone">Customer Phone</Label>
              <Input
                id="customerPhone"
                {...register('customerPhone')}
                placeholder="Phone number"
              />
              {errors.customerPhone && (
                <p className="text-sm text-destructive">{errors.customerPhone.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customerEmail">Customer Email (Optional)</Label>
              <Input
                id="customerEmail"
                type="email"
                {...register('customerEmail')}
                placeholder="Email address"
              />
              {errors.customerEmail && (
                <p className="text-sm text-destructive">{errors.customerEmail.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="floorNumber">Floor Number (Optional)</Label>
              <Input
                id="floorNumber"
                type="number"
                {...register('floorNumber', { valueAsNumber: true })}
                placeholder="Floor number"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="hasElevator"
              {...register('hasElevator')}
            />
            <Label htmlFor="hasElevator">Building has elevator</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Job'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 