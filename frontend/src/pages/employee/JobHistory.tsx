import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { MapPin, Calendar, DollarSign, Package, Clock, FileText } from 'lucide-react';
import JobDetailsDialog from '../../components/jobs/JobDetailsDialog';
import ShiftReportDialog from '../../components/shifts/ShiftReportDialog';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/button';
import { useNavigate } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  description: string;
  status: 'COMPLETED' | 'CANCELLED';
  pickupLocation: string;
  deliveryLocation: string;
  date: string;
  estimatedHours: number;
  price: number;
  createdAt: string;
  shifts: Array<{
    id: string;
    status: string;
  }>;
}

export default function JobHistory() {
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [selectedShiftReport, setSelectedShiftReport] = useState<string | null>(null);
  const { user, token } = useAuth();
  const navigate = useNavigate();

  // Redirect if not an employee
  if (user?.role !== 'EMPLOYEE') {
    navigate('/');
    return null;
  }

  const { data: jobs, isLoading, error } = useQuery({
    queryKey: ['jobs', 'history', user?.id],
    queryFn: async () => {
      try {
        const response = await axios.get(
          `${import.meta.env.VITE_API_URL}/api/jobs/history`,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
        return response.data.data.jobs;
      } catch (error) {
        console.error('Error fetching job history:', error);
        throw error;
      }
    },
    enabled: !!token && user?.role === 'EMPLOYEE'
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Job History</h1>
        <p className="text-muted-foreground">
          View your completed and cancelled jobs
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading job history...</p>
        </div>
      ) : jobs?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No job history found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {jobs?.map((job: Job) => (
            <div
              key={job.id}
              className="flex flex-col border rounded-lg overflow-hidden hover:border-primary transition-colors"
            >
              <div className="p-4 space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{job.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {job.description}
                  </p>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Pickup</p>
                      <p className="text-muted-foreground">{job.pickupLocation}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Delivery</p>
                      <p className="text-muted-foreground">
                        {job.deliveryLocation}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p>{formatDate(job.date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <p>{job.estimatedHours} hours</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <p>{formatCurrency(job.price)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      job.status === 'COMPLETED'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {job.status}
                  </span>
                  <div className="flex gap-2">
                    {job.status === 'COMPLETED' && job.shifts?.some(s => s.status === 'COMPLETED') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelectedShiftReport(job.shifts.find(s => s.status === 'COMPLETED')?.id || null)}
                        className="flex items-center gap-1"
                      >
                        <FileText className="h-4 w-4" />
                        View Report
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedJob(job.id)}
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

      <JobDetailsDialog
        jobId={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
      <ShiftReportDialog
        shiftId={selectedShiftReport}
        onClose={() => setSelectedShiftReport(null)}
      />
    </div>
  );
} 