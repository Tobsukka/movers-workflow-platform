import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Button } from '../ui/button';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  DollarSign,
  Package,
  AlertCircle,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface Job {
  id: string;
  title: string;
  description: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  pickupLocation: string;
  deliveryLocation: string;
  date: string;
  estimatedHours: number;
  numberOfMovers: number;
  items: string[];
  specialRequirements?: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  floorNumber?: number;
  hasElevator: boolean;
  price: number;
  employees: Array<{
    id: string;
    name: string;
    email: string;
  }>;
  createdAt: string;
}

interface JobDetailsDialogProps {
  jobId: string | null;
  onClose: () => void;
}

export default function JobDetailsDialog({
  jobId,
  onClose,
}: JobDetailsDialogProps) {
  const { user, token } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const { data: job, isLoading } = useQuery({
    queryKey: ['job', jobId],
    queryFn: async () => {
      if (!jobId) return null;
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/jobs/${jobId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data.job;
    },
    enabled: !!jobId && !!token,
  });

  const applyMutation = useMutation({
    mutationFn: async () => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/apply`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
      onClose();
      if (user?.role === 'EMPLOYEE') {
        navigate('/employee/shifts');
      }
      else if (user?.role === 'EMPLOYER') {
        navigate('/employer/my-shifts');
      }
    },
    onError: (error: any) => {
      setError(
        error.response?.data?.message ||
          'An error occurred while applying for the job'
      );
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/status`,
        { status },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
      queryClient.invalidateQueries({ queryKey: ['job', jobId] });
    },
    onError: (error: any) => {
      setError(
        error.response?.data?.message ||
          'An error occurred while updating the job status'
      );
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const handleApply = async () => {
    setError(null);
    setShowConfirmation(true);
  };

  const handleConfirmApply = async () => {
    setShowConfirmation(false);
    await applyMutation.mutateAsync();
  };

  const handleStatusUpdate = async (status: string) => {
    setError(null);
    await updateStatusMutation.mutateAsync(status);
  };

  const renderStatusBadge = (status: string) => {
    const statusConfig = {
      AVAILABLE: { color: 'bg-green-100 text-green-700', icon: Clock },
      ASSIGNED: { color: 'bg-blue-100 text-blue-700', icon: Check },
      IN_PROGRESS: { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
      COMPLETED: { color: 'bg-purple-100 text-purple-700', icon: Check },
      CANCELLED: { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    }[status] || { color: 'bg-gray-100 text-gray-700', icon: Clock };

    const Icon = statusConfig.icon;

    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${statusConfig.color}`}
      >
        <Icon className="h-3 w-3" />
        {status}
      </span>
    );
  };

  const isAssigned = job?.employees.some(
    (employee: { id: string }) => employee.id === user?.id
  );

  return (
    <>
      <Dialog open={!!jobId} onOpenChange={() => onClose()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Job Details</DialogTitle>
              {job && renderStatusBadge(job.status)}
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p>Loading job details...</p>
            </div>
          ) : job ? (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold">{job.title}</h2>
                <p className="text-muted-foreground mt-1">{job.description}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Location Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Pickup Location</p>
                          <p className="text-muted-foreground">
                            {job.pickupLocation}
                            {job.floorNumber && ` (Floor ${job.floorNumber})`}
                            {job.hasElevator && ' - Has Elevator'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Delivery Location</p>
                          <p className="text-muted-foreground">
                            {job.deliveryLocation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-semibold">Job Details</h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Date</p>
                          <p className="text-muted-foreground">
                            {formatDate(job.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Estimated Duration</p>
                          <p className="text-muted-foreground">
                            {job.estimatedHours} hours
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Required Movers</p>
                          <p className="text-muted-foreground">
                            {job.numberOfMovers} people
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">Payment</p>
                          <p className="text-muted-foreground">
                            {formatCurrency(job.price)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <h3 className="font-semibold">Items to Move</h3>
                    <div className="border rounded-lg p-3 space-y-2">
                      {job.items.map((item: string, index: number) => (
                        <div key={index} className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {job.specialRequirements && (
                    <div className="space-y-2">
                      <h3 className="font-semibold">Special Requirements</h3>
                      <div className="flex items-start gap-2 border rounded-lg p-3">
                        <AlertCircle className="h-4 w-4 mt-1 text-muted-foreground" />
                        <p className="text-muted-foreground">
                          {job.specialRequirements}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                  {error}
                </div>
              )}

              <DialogFooter className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {job?.status === 'ASSIGNED' && isAssigned && (
                    <Button
                      variant="default"
                      onClick={() => handleStatusUpdate('IN_PROGRESS')}
                      disabled={updateStatusMutation.isPending}
                    >
                      Start Job
                    </Button>
                  )}
                  {job?.status === 'IN_PROGRESS' && isAssigned && (
                    <Button
                      variant="default"
                      onClick={() => handleStatusUpdate('COMPLETED')}
                      disabled={updateStatusMutation.isPending}
                    >
                      Complete Job
                    </Button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={onClose}>
                    Close
                  </Button>
                  {job?.status === 'AVAILABLE' && !isAssigned && (
                    <Button
                      onClick={handleApply}
                      disabled={applyMutation.isPending}
                    >
                      {applyMutation.isPending ? 'Applying...' : 'Apply for Job'}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <p>Job not found</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Job Application</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to apply for this job? By applying, you commit to being available at the specified date and time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmApply}>
              {applyMutation.isPending ? 'Applying...' : 'Confirm Application'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
} 