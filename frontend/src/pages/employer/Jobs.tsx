import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { Plus, Search, ArrowUpDown, MoreHorizontal, Calendar, Clock, Users, DollarSign } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import CreateJobDialog from '../../components/jobs/CreateJobDialog';
import JobDetailsDialog from '../../components/jobs/JobDetailsDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

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
  price: number;
  createdAt: string;
  updatedAt: string;
  employees: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

type SortField = 'title' | 'price' | 'date' | 'status';
type SortOrder = 'asc' | 'desc';

export default function Jobs() {
  const queryClient = useQueryClient();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<Job['status'] | 'ALL'>('ALL');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [jobToMarkAvailable, setJobToMarkAvailable] = useState<string | null>(null);

  const { data: jobs, isLoading } = useQuery({
    queryKey: ['jobs'],
    queryFn: async () => {
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/jobs`);
      return response.data.data.jobs;
    },
  });

  const updateJobStatusMutation = useMutation({
    mutationFn: async ({ 
      jobId, 
      status, 
      removeShifts = false 
    }: { 
      jobId: string; 
      status: Job['status'];
      removeShifts?: boolean;
    }) => {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/jobs/${jobId}/status`,
        { status, removeShifts }
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
  });

  const handleStatusUpdate = async (jobId: string, status: Job['status']) => {
    try {
      if (status === 'AVAILABLE') {
        setJobToMarkAvailable(jobId);
      } else {
        await updateJobStatusMutation.mutateAsync({ jobId, status });
      }
    } catch (error) {
      console.error('Failed to update job status:', error);
    }
  };

  const handleConfirmMarkAvailable = async (removeShifts: boolean) => {
    if (jobToMarkAvailable) {
      try {
        await updateJobStatusMutation.mutateAsync({ 
          jobId: jobToMarkAvailable, 
          status: 'AVAILABLE',
          removeShifts 
        });
      } catch (error) {
        console.error('Failed to update job status:', error);
      }
      setJobToMarkAvailable(null);
    }
  };

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

  const sortJobs = (a: Job, b: Job) => {
    const multiplier = sortOrder === 'asc' ? 1 : -1;
    
    switch (sortField) {
      case 'title':
        return multiplier * a.title.localeCompare(b.title);
      case 'price':
        return multiplier * (a.price - b.price);
      case 'date':
        return multiplier * (new Date(a.date).getTime() - new Date(b.date).getTime());
      case 'status':
        return multiplier * a.status.localeCompare(b.status);
      default:
        return 0;
    }
  };

  const filteredJobs = jobs
    ?.filter((job: Job) => {
      const matchesSearch =
        job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.pickupLocation.toLowerCase().includes(searchQuery.toLowerCase()) ||
        job.deliveryLocation.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'ALL' || job.status === statusFilter;

      return matchesSearch && matchesStatus;
    })
    .sort(sortJobs);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Jobs</h1>
          <p className="text-muted-foreground">
            Create and manage job listings for your company
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Job
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search jobs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: Job['status'] | 'ALL') => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Jobs</SelectItem>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="ASSIGNED">Assigned</SelectItem>
            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
            <SelectItem value="COMPLETED">Completed</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading jobs...</p>
        </div>
      ) : !filteredJobs || filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <p className="text-muted-foreground">No jobs found</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            Create your first job
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="flex items-center gap-4 px-4 py-2 bg-muted/50 rounded-lg">
            <Button
              variant="ghost"
              className="flex-1 justify-start font-medium"
              onClick={() => handleSort('title')}
            >
              Title
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleSort('price')}
            >
              Price
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleSort('date')}
            >
              Date
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              onClick={() => handleSort('status')}
            >
              Status
              <ArrowUpDown className="ml-2 h-4 w-4" />
            </Button>
            <div className="w-24" /> {/* Space for actions */}
          </div>

          {filteredJobs.map((job: Job) => (
            <div
              key={job.id}
              className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg hover:border-primary transition-colors"
            >
              <div className="space-y-2">
                <h3 className="font-semibold">{job.title}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {job.description}
                </p>
                <div className="flex items-center gap-2 text-sm">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{job.numberOfMovers} movers required</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>{formatDate(job.date)}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>{job.estimatedHours} hours estimated</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{formatCurrency(job.price)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Pickup Location</p>
                <p className="text-sm text-muted-foreground">{job.pickupLocation}</p>
                <p className="text-sm font-medium mt-2">Delivery Location</p>
                <p className="text-sm text-muted-foreground">{job.deliveryLocation}</p>
                {job.status !== 'AVAILABLE' && job.employees && job.employees.length > 0 && (
                  <>
                    <p className="text-sm font-medium mt-2">Assigned Employees</p>
                    <div className="space-y-1">
                      {job.employees.map(employee => (
                        <p key={employee.id} className="text-sm text-muted-foreground">
                          {employee.name}
                        </p>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-col md:items-end justify-between gap-2">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                    job.status === 'AVAILABLE'
                      ? 'bg-green-100 text-green-700'
                      : job.status === 'IN_PROGRESS'
                      ? 'bg-blue-100 text-blue-700'
                      : job.status === 'COMPLETED'
                      ? 'bg-gray-100 text-gray-700'
                      : job.status === 'CANCELLED'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {job.status}
                </span>

                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedJob(job.id)}
                  >
                    View Details
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {job.status !== 'AVAILABLE' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(job.id, 'AVAILABLE')}
                        >
                          Mark as Available
                        </DropdownMenuItem>
                      )}
                      {job.status !== 'IN_PROGRESS' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(job.id, 'IN_PROGRESS')}
                        >
                          Mark as In Progress
                        </DropdownMenuItem>
                      )}
                      {job.status !== 'COMPLETED' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(job.id, 'COMPLETED')}
                        >
                          Mark as Completed
                        </DropdownMenuItem>
                      )}
                      {job.status !== 'CANCELLED' && (
                        <DropdownMenuItem
                          onClick={() => handleStatusUpdate(job.id, 'CANCELLED')}
                        >
                          Mark as Cancelled
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AlertDialog open={!!jobToMarkAvailable} onOpenChange={() => setJobToMarkAvailable(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Job as Available</AlertDialogTitle>
            <AlertDialogDescription>
              Do you want to remove the associated shifts for the assigned employees?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-blue-500 hover:bg-blue-600"
              onClick={() => handleConfirmMarkAvailable(false)}
            >
              Keep Shifts
            </AlertDialogAction>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => handleConfirmMarkAvailable(true)}
            >
              Remove Shifts
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CreateJobDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      <JobDetailsDialog
        jobId={selectedJob}
        onClose={() => setSelectedJob(null)}
      />
    </div>
  );
} 