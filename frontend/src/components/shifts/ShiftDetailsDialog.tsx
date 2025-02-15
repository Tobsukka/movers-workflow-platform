import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Calendar, Clock, MapPin, User, Briefcase, Package, AlertCircle, DollarSign } from 'lucide-react';

interface ShiftDetailsDialogProps {
  shiftId: string | null;
  onClose: () => void;
}

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

export default function ShiftDetailsDialog({ shiftId, onClose }: ShiftDetailsDialogProps) {
  const { token } = useAuth();

  const { data: shift, isLoading } = useQuery({
    queryKey: ['shift', shiftId],
    queryFn: async () => {
      if (!shiftId) return null;
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/shifts/${shiftId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data.shift;
    },
    enabled: !!shiftId && !!token,
  });

  const { data: job, isLoading: isLoadingJob } = useQuery({
    queryKey: ['job', shift?.job?.id],
    queryFn: async () => {
      if (!shift?.job?.id) return null;
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/jobs/${shift.job.id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data.job;
    },
    enabled: !!shift?.job?.id && !!token,
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <Dialog open={!!shiftId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Job Details</DialogTitle>
        </DialogHeader>

        {isLoading || isLoadingJob ? (
          <div className="flex items-center justify-center h-32">
            <p>Loading job details...</p>
          </div>
        ) : !job ? (
          <div className="flex items-center justify-center h-32">
            <p>Job not found</p>
          </div>
        ) : (
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
                  <h3 className="font-semibold">Schedule Details</h3>
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

                <div className="space-y-2">
                  <h3 className="font-semibold">Customer Information</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Name</p>
                        <p className="text-muted-foreground">{job.customerName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Contact</p>
                        <p className="text-muted-foreground">{job.customerPhone}</p>
                        {job.customerEmail && (
                          <p className="text-muted-foreground">{job.customerEmail}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 