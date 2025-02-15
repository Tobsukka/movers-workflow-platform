import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Calendar, Briefcase, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';

interface DashboardStats {
  todayShifts: number;
  assignedJobs: number;
  hoursThisWeek: number;
  upcomingShifts: Array<{
    id: string;
    startTime: string;
    endTime: string;
    job: {
      title: string;
      location: string;
    };
  }>;
  availableJobs: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
    price: number;
  }>;
}

export default function EmployeeDashboard() {
  const { user, token } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/analytics/dashboard`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      return response.data.data as DashboardStats;
    },
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
        <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">
          View your schedule and manage your jobs
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link to="/employee/shifts" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Today's Shifts</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : stats?.todayShifts}</p>
        </Link>

        <Link to="/employee/jobs" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Assigned Jobs</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : stats?.assignedJobs}</p>
        </Link>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Hours This Week</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : stats?.hoursThisWeek}</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">Upcoming Shifts</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading shifts...</p>
            ) : stats?.upcomingShifts.length === 0 ? (
              <p className="text-muted-foreground">No upcoming shifts</p>
            ) : (
              <div className="space-y-4">
                {stats?.upcomingShifts.map((shift) => (
                  <div key={shift.id} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{shift.job.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(shift.startTime)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{shift.job.location}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">Available Jobs</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading jobs...</p>
            ) : stats?.availableJobs.length === 0 ? (
              <p className="text-muted-foreground">No available jobs</p>
            ) : (
              <div className="space-y-4">
                {stats?.availableJobs.map((job) => (
                  <div key={job.id} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{job.title}</h3>
                      <span className="text-sm font-medium text-green-600">
                        {formatCurrency(job.price)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm text-muted-foreground">
                      <span>{job.location}</span>
                      <span>{formatDate(job.date)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
} 