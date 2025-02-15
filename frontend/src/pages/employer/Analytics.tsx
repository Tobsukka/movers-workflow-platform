import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Button } from '../../components/ui/button';
import { Calendar, DollarSign, TrendingUp, Users } from 'lucide-react';

interface AnalyticsData {
  jobStatusDistribution: {
    status: string;
    count: number;
  }[];
  employeeWorkload: {
    name: string;
    hours: number;
  }[];
  weeklyShifts: {
    date: string;
    shifts: number;
    revenue: number;
  }[];
  totalStats: {
    totalEmployees: number;
    activeJobs: number;
    completedJobs: number;
    upcomingShifts: number;
    totalRevenue: number;
    averageJobPrice: number;
    employeeUtilization: number;
  };
  employeePerformance: {
    name: string;
    completedJobs: number;
    rating: number;
  }[];
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];
const TIME_RANGES = ['7D', '30D', '90D', 'ALL'] as const;
type TimeRange = typeof TIME_RANGES[number];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30D');

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['analytics', timeRange],
    queryFn: async () => {
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/analytics?timeRange=${timeRange}`
      );
      return response.data.data as AnalyticsData;
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading analytics...</p>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>No analytics data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">
            View insights about your company's performance
          </p>
        </div>
        <Select value={timeRange} onValueChange={(value: TimeRange) => setTimeRange(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent>
            {TIME_RANGES.map((range) => (
              <SelectItem key={range} value={range}>
                Last {range}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Total Employees
            </h3>
          </div>
          <p className="mt-2 text-3xl font-bold">
            {analytics.totalStats.totalEmployees}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {analytics.totalStats.employeeUtilization}% utilization
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Active Jobs
            </h3>
          </div>
          <p className="mt-2 text-3xl font-bold">
            {analytics.totalStats.activeJobs}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            {analytics.totalStats.completedJobs} completed
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </h3>
          </div>
          <p className="mt-2 text-3xl font-bold">
            ${analytics.totalStats.totalRevenue.toLocaleString()}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ${analytics.totalStats.averageJobPrice} avg. per job
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium text-muted-foreground">
              Upcoming Shifts
            </h3>
          </div>
          <p className="mt-2 text-3xl font-bold">
            {analytics.totalStats.upcomingShifts}
          </p>
          <Button variant="link" className="text-xs p-0 h-auto mt-1">
            View schedule
          </Button>
        </div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Job Status Distribution */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 text-lg font-semibold">Job Status Distribution</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analytics.jobStatusDistribution}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  label={(entry) => `${entry.status} (${entry.count})`}
                >
                  {analytics.jobStatusDistribution.map((_, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Employee Performance */}
        <div className="rounded-lg border bg-card p-4">
          <h3 className="mb-4 text-lg font-semibold">Employee Performance</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.employeePerformance}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="completedJobs" fill="#8884d8" name="Completed Jobs" />
                <Bar yAxisId="right" dataKey="rating" fill="#82ca9d" name="Rating" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue and Shifts Trend */}
        <div className="rounded-lg border bg-card p-4 md:col-span-2">
          <h3 className="mb-4 text-lg font-semibold">Revenue and Shifts Trend</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.weeklyShifts}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#8884d8"
                  name="Revenue"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="shifts"
                  stroke="#82ca9d"
                  name="Shifts"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
} 