import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Briefcase, Calendar, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/button';

interface DashboardStats {
  activeEmployees: number;
  activeJobs: number;
  todayShifts: number;
  pendingApprovals: number;
  recentActivity: Array<{
    id: string;
    type: 'JOB_CREATED' | 'SHIFT_COMPLETED' | 'EMPLOYEE_JOINED';
    message: string;
    timestamp: string;
  }>;
  upcomingJobs: Array<{
    id: string;
    title: string;
    date: string;
    location: string;
  }>;
}

export default function EmployerDashboard() {
  const { user } = useAuth();
  const { token } = useAuth();

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Welcome, {user?.name}</h1>
        <p className="text-muted-foreground">
          Manage your employees, jobs, and shifts from your dashboard
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/employer/employees" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Active Employees</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : stats?.activeEmployees}</p>
        </Link>

        <Link to="/employer/jobs" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Active Jobs</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : stats?.activeJobs}</p>
        </Link>

        <Link to="/employer/shifts" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Today's Shifts</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : stats?.todayShifts}</p>
        </Link>

        <Link to="/employer/employees" className="rounded-lg border bg-card p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Pending Approvals</h3>
          </div>
          <p className="mt-2 text-3xl font-bold">{isLoading ? '...' : stats?.pendingApprovals}</p>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading activity...</p>
            ) : stats?.recentActivity.length === 0 ? (
              <p className="text-muted-foreground">No recent activity</p>
            ) : (
              <div className="space-y-4">
                {stats?.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex justify-between items-center">
                    <p>{activity.message}</p>
                    <span className="text-sm text-muted-foreground">
                      {formatDate(activity.timestamp)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border">
          <div className="border-b p-4">
            <h2 className="text-xl font-semibold">Upcoming Jobs</h2>
          </div>
          <div className="p-4">
            {isLoading ? (
              <p className="text-muted-foreground">Loading jobs...</p>
            ) : stats?.upcomingJobs.length === 0 ? (
              <p className="text-muted-foreground">No upcoming jobs</p>
            ) : (
              <div className="space-y-4">
                {stats?.upcomingJobs.map((job) => (
                  <div key={job.id} className="flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <h3 className="font-medium">{job.title}</h3>
                      <span className="text-sm text-muted-foreground">
                        {formatDate(job.date)}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">{job.location}</p>
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