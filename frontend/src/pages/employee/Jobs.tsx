import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { Search, MapPin, Calendar, DollarSign, Package, Clock, Users } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import JobDetailsDialog from '../../components/jobs/JobDetailsDialog';
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
  createdAt: string;
}

export default function EmployeeJobs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const { token } = useAuth();

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.data.jobs;
    },
    enabled: !!token,
  });

  const filteredJobs = jobs?.filter((job: Job) => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.deliveryLocation.toLowerCase().includes(searchQuery.toLowerCase());

    // Only show available jobs
    return matchesSearch && job.status === 'AVAILABLE';
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
        <h1 className="text-3xl font-bold">Available Jobs</h1>
        <p className="text-muted-foreground">
          Browse and apply for available moving jobs
        </p>
      </div>

      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm pl-9"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading jobs...</p>
        </div>
      ) : filteredJobs?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No jobs found</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs?.map((job: Job) => (
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
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <p>{job.numberOfMovers} movers needed</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    <p>{formatCurrency(job.price)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                      job.status === 'AVAILABLE'
                        ? 'bg-green-100 text-green-700'
                        : job.status === 'ASSIGNED'
                        ? 'bg-blue-100 text-blue-700'
                        : job.status === 'IN_PROGRESS'
                        ? 'bg-yellow-100 text-yellow-700'
                        : job.status === 'COMPLETED'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-red-100 text-red-700'
                    }`}
                  >
                    {job.status}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedJob(job.id)}
                  >
                    View Details
                  </Button>
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
    </div>
  );
} 