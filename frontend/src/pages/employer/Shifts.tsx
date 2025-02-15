import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Calendar, Clock, MapPin, Search, User } from 'lucide-react';
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
import { useAuth } from '../../contexts/AuthContext';

interface Shift {
  id: string;
  startTime: string;
  endTime: string;
  status: 'SCHEDULED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  location: string;
  employee: {
    id: string;
    name: string;
    email: string;
  };
  job: {
    id: string;
    title: string;
    description: string;
  };
}

export default function Shifts() {
  const { token } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<string | null>(null);

  const { data: shifts, isLoading } = useQuery({
    queryKey: ['shifts', 'all'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/shifts`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data.shifts;
    },
  });

  const filteredShifts = shifts?.filter((shift: Shift) => {
    const matchesSearch =
      shift.job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      shift.location.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === 'all' || shift.status.toLowerCase() === statusFilter.toLowerCase();

    return matchesSearch && matchesStatus;
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">All Shifts</h1>
        <p className="text-muted-foreground">
          View and manage all shifts in the system
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Input
            type="search"
            placeholder="Search shifts by job, employee, or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
      ) : !filteredShifts?.length ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No shifts found</p>
        </div>
      ) : (
        <div className="border rounded-lg divide-y">
          {filteredShifts.map((shift: Shift) => (
            <div key={shift.id} className="p-4 hover:bg-muted/50">
              <div className="flex items-start justify-between">
                <div className="space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{shift.job.title}</h3>
                    <p className="text-muted-foreground">{shift.job.description}</p>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">{shift.employee.name}</p>
                        <p className="text-xs text-muted-foreground">{shift.employee.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{formatDate(shift.startTime)}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">
                        {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm">{shift.location}</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      shift.status === 'SCHEDULED'
                        ? 'bg-blue-100 text-blue-800'
                        : shift.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-800'
                        : shift.status === 'COMPLETED'
                        ? 'bg-gray-100 text-gray-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {shift.status}
                  </span>
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
          ))}
        </div>
      )}

      <ShiftDetailsDialog
        shiftId={selectedShiftForDetails}
        onClose={() => setSelectedShiftForDetails(null)}
      />
    </div>
  );
} 