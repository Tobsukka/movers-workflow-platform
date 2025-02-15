import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Clock, MapPin } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import ShiftDetailsDialog from '../../components/shifts/ShiftDetailsDialog';
import CompleteShiftDialog from '../../components/shifts/CompleteShiftDialog';

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

export default function MyShifts() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string | null>(null);
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<string | null>(null);
  const [selectedShiftForComplete, setSelectedShiftForComplete] = useState<string | null>(null);

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', 'employer', 'my'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/shifts?myShifts=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.data.shifts;
    },
  });

  const startShiftMutation = useMutation({
    mutationFn: async (shiftId: string) => {
      const response = await axios.put(
        `${import.meta.env.VITE_API_URL}/api/shifts/${shiftId}`,
        { status: 'ACTIVE' },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shifts'] });
    },
  });

  const handleStartShift = async (shiftId: string) => {
    await startShiftMutation.mutateAsync(shiftId);
  };

  const filteredShifts = shifts?.filter((shift: Shift) => {
    const matchesSearch =
      shift.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || shift.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">My Shifts</h1>
        <p className="text-muted-foreground">
          View and manage your personal shifts
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Input
            type="search"
            placeholder="Search shifts..."
            value={searchQuery}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            <SelectItem value="SCHEDULED">Scheduled</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading shifts...</p>
        </div>
      ) : filteredShifts?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No shifts found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredShifts.map((shift: Shift) => (
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
                    <p>{new Date(shift.startTime).toLocaleDateString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p>
                      {new Date(shift.startTime).toLocaleTimeString()} -{' '}
                      {new Date(shift.endTime).toLocaleTimeString()}
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

                <div className="p-4 border-t bg-muted/50 flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      shift.status === 'SCHEDULED'
                        ? 'bg-blue-100 text-blue-700'
                        : shift.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : shift.status === 'COMPLETED'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {shift.status}
                  </span>
                  <div className="flex gap-2">
                    {shift.status === 'SCHEDULED' && (
                      <Button
                        size="sm"
                        onClick={() => handleStartShift(shift.id)}
                      >
                        Start Shift
                      </Button>
                    )}
                    {shift.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        onClick={() => setSelectedShiftForComplete(shift.id)}
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

      <ShiftDetailsDialog
        shiftId={selectedShiftForDetails}
        onClose={() => setSelectedShiftForDetails(null)}
      />
      <CompleteShiftDialog
        shiftId={selectedShiftForComplete}
        onOpenChange={(open) => !open && setSelectedShiftForComplete(null)}
      />
    </div>
  );
} 