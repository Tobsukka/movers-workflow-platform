import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import CompleteShiftDialog from '../../components/shifts/CompleteShiftDialog';
import ShiftDetailsDialog from '../../components/shifts/ShiftDetailsDialog';

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  location: string;
  job: {
    id: string;
    title: string;
    description: string;
    pickupLocation: string;
    deliveryLocation: string;
    estimatedHours: number;
  };
}

export default function EmployeeShifts() {
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', 'employee'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shifts`);
      return response.data.data.shifts;
    },
  });

  const startShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/shifts/${shiftId}`,
        { status: 'ACTIVE' }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  const handleStartShift = async (shiftId: string) => {
    await startShiftMutation.mutateAsync(shiftId);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Shifts</h1>
        <p className="text-muted-foreground">View your scheduled shifts</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading shifts...</p>
        </div>
      ) : !shifts || shifts.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No shifts scheduled</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {shifts.map((shift: Shift) => (
            <div
              key={shift.id}
              className="flex flex-col border rounded-lg overflow-hidden hover:border-primary transition-colors"
            >
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{shift.job.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {shift.job.description}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{formatDate(shift.startTime)}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p>
                      {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      <span className="ml-1 text-muted-foreground">
                        ({shift.job.estimatedHours}h estimated)
                      </span>
                    </p>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Pickup</p>
                      <p className="text-muted-foreground">{shift.job.pickupLocation}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Delivery</p>
                      <p className="text-muted-foreground">{shift.job.deliveryLocation}</p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      shift.status === 'SCHEDULED'
                        ? 'bg-blue-100 text-blue-700'
                        : shift.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : shift.status === 'COMPLETED'
                        ? 'bg-gray-100 text-gray-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {shift.status}
                  </span>

                  <div className="flex items-center gap-2">
                    {shift.status === 'SCHEDULED' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartShift(shift.id)}
                        disabled={startShiftMutation.isPending}
                      >
                        Start Shift
                      </Button>
                    )}

                    {shift.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedShift(shift.id)}
                      >
                        Complete Shift
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedShiftForDetails(shift.id)}
                    >
                      View Details
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <CompleteShiftDialog
        shiftId={selectedShift}
        onOpenChange={(open) => !open && setSelectedShift(null)}
      />

      <ShiftDetailsDialog
        shiftId={selectedShiftForDetails}
        onClose={() => setSelectedShiftForDetails(null)}
      />
    </div>
  );
} 