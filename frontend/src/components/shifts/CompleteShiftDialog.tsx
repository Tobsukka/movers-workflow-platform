import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, X, Upload, RefreshCw } from 'lucide-react';
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
import { Textarea } from '../ui/textarea';
import SignaturePad from 'react-signature-canvas';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const completeShiftSchema = z.object({
  endTime: z.string().min(1, 'End time is required'),
  notes: z.string().optional(),
  challenges: z.string().optional(),
  customerSignature: z.string().min(1, 'Customer signature is required'),
  breakMinutes: z.number().min(0, 'Break minutes must be 0 or greater'),
  additionalExpenses: z.array(z.object({
    description: z.string().min(1, 'Description is required'),
    amount: z.number().positive('Amount must be greater than 0'),
  })).default([]),
});

type CompleteShiftFormData = z.infer<typeof completeShiftSchema>;



interface Expense {
  description: string;
  amount: number;
}

interface CompleteShiftDialogProps {
  shiftId: string | null;
  onOpenChange: (open: boolean) => void;
}

export default function CompleteShiftDialog({
  shiftId,
  onOpenChange,
}: CompleteShiftDialogProps) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const signaturePadRef = useRef<SignaturePad>(null);
  const [signatureError, setSignatureError] = useState<string | null>(null);

  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CompleteShiftFormData>({
    resolver: zodResolver(completeShiftSchema),
    defaultValues: {
      breakMinutes: 0,
      additionalExpenses: [],
    },
  });

  const completeShiftMutation = useMutation({
    mutationFn: async (data: CompleteShiftFormData & { photos: string[], additionalExpenses: Expense[] }) => {
      console.log('Mutation starting with data:', data);
      
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/shifts/${shiftId}/complete`,
        data,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      
      console.log('Mutation response:', response.data);
      return response.data;
    },
    onSuccess: () => {
      console.log('Mutation succeeded, invalidating queries');
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['jobs', 'history'] });
      
      reset();
      setPhotos([]);
      setExpenses([]);
      if (signaturePadRef.current) {
        signaturePadRef.current.clear();
      }
      
      onOpenChange(false);
  
      if (user?.role === 'EMPLOYEE') {
        navigate('/employee/history');
      } else if (user?.role === 'EMPLOYER') {
        navigate('/employer/history');
      }
      
    },
    onError: (error: any) => {
      console.error('Mutation error:', error);
      setError(
        error.response?.data?.message ||
        'An error occurred while completing the shift. Please try again.'
      );
    },
  });

  const handlePhotoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      setPhotos(prev => [...prev, ...Array.from(files)]);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const addExpense = () => {
    setExpenses(prev => [...prev, { description: '', amount: 0 }]);
  };

  const updateExpense = (index: number, field: keyof Expense, value: string | number) => {
    setExpenses(prev => prev.map((expense, i) => {
      if (i === index) {
        return { ...expense, [field]: value };
      }
      return expense;
    }));
  };

  const removeExpense = (index: number) => {
    setExpenses(prev => prev.filter((_, i) => i !== index));
  };

  const clearSignature = () => {
    if (signaturePadRef.current) {
      signaturePadRef.current.clear();
    }
  };

  // Add a debug function to log form errors
  const onError = (errors: any) => {
    console.error('Form validation errors:', errors);
  };

  const onSubmit = async (data: CompleteShiftFormData) => {
    console.log('Form submission started - onSubmit function called');
    try {
      console.log('Form data received:', data);
      console.log('Current state:', { expenses, photos });
      setError(null);
      setSignatureError(null);

      // Prepare the complete data object
      const completeData = {
        ...data,
        additionalExpenses: expenses.map(expense => ({
          description: expense.description,
          amount: Number(expense.amount)
        })),
        photos: photos.map(photo => photo.name),
      };

      console.log('Complete data prepared:', completeData);

      // Call the mutation
      console.log('Calling mutation...');
      await completeShiftMutation.mutateAsync(completeData);
      
      console.log('Mutation completed successfully');
    } catch (err) {
      console.error('Error in onSubmit:', err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || 'Failed to complete shift. Please try again.';
        console.error('Axios error:', errorMessage);
        setError(errorMessage);
      } else {
        console.error('Unknown error:', err);
        setError('An unexpected error occurred. Please try again.');
      }
    }
  };

  const handleSubmitWithSignature = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Handle submit with signature called');
    
    // Check if signature pad is empty
    if (!signaturePadRef.current || signaturePadRef.current.isEmpty()) {
      console.error('No signature found');
      setSignatureError('Customer signature is required');
      return;
    }

    // Get signature data directly using toDataURL
    const signatureData = signaturePadRef.current.toDataURL();
    console.log('Signature data retrieved:', !!signatureData);
    
    // Set the signature value in the form
    setValue('customerSignature', signatureData);
    
    // Trigger form submission
    handleSubmit(onSubmit)(e);
  };

  return (
    <Dialog open={!!shiftId} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="flex-shrink-0 border-b pb-4">
          <DialogTitle>Complete Shift</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmitWithSignature} className="flex-1 flex flex-col min-h-0">
          <input type="hidden" {...register('customerSignature')} />
          <div className="flex-1 overflow-y-auto py-4 space-y-6 px-1">
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="datetime-local"
                {...register('endTime')}
              />
              {errors.endTime && (
                <p className="text-sm text-destructive">{errors.endTime.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="breakMinutes">Break Minutes *</Label>
              <Input
                id="breakMinutes"
                type="number"
                min="0"
                {...register('breakMinutes', { valueAsNumber: true })}
              />
              {errors.breakMinutes && (
                <p className="text-sm text-destructive">
                  {errors.breakMinutes.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Any general notes about the job completion..."
                {...register('notes')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="challenges">Challenges Encountered</Label>
              <Textarea
                id="challenges"
                placeholder="Any difficulties or challenges during the job..."
                {...register('challenges')}
              />
            </div>

            <div className="space-y-2">
              <Label>Photos</Label>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('photo-upload')?.click()}
                    className="w-full"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Photos
                  </Button>
                  <input
                    id="photo-upload"
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handlePhotoUpload}
                  />
                </div>
                {photos.map((photo, index) => (
                  <div key={index} className="flex items-center justify-between border p-2 rounded">
                    <span className="truncate">{photo.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removePhoto(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Additional Expenses</Label>
              <div className="space-y-4">
                {expenses.map((expense, index) => (
                  <div key={index} className="flex gap-4">
                    <Input
                      placeholder="Description"
                      value={expense.description}
                      onChange={(e) => updateExpense(index, 'description', e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Amount"
                      value={expense.amount}
                      onChange={(e) => updateExpense(index, 'amount', parseFloat(e.target.value))}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpense(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addExpense}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Expense
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Customer Signature *</Label>
              <div className="border rounded-md p-2 space-y-2">
                <div className="border rounded bg-white" style={{ touchAction: 'none' }}>
                  <SignaturePad
                    ref={signaturePadRef}
                    canvasProps={{
                      className: 'w-full h-48',
                      style: { 
                        width: '100%', 
                        height: '192px',
                      }
                    }}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearSignature}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Clear Signature
                  </Button>
                </div>
              </div>
              {signatureError && (
                <p className="text-sm text-destructive">{signatureError}</p>
              )}
            </div>

            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
          </div>

          <DialogFooter className="flex-shrink-0 border-t pt-4 mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                console.log('Cancel button clicked');
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={completeShiftMutation.isPending}
            >
              {completeShiftMutation.isPending ? 'Completing...' : 'Complete Shift'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
} 