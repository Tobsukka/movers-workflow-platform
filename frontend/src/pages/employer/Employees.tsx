import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, MoreHorizontal, Search } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import api from '../../utils/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import { EmployeeDetailsDialog } from '../../components/employee/EmployeeDetailsDialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';

interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  verified: boolean;
  createdAt: string;
  role: 'EMPLOYEE' | 'EMPLOYER';
}

export default function Employees() {
  const queryClient = useQueryClient();
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'verified' | 'pending'>('all');

  const { data: employees, isLoading } = useQuery({
    queryKey: ['employees'],
    queryFn: async () => {
      const response = await api.get<{data: {users: Employee[]}}>(
        '/api/users'
      );
      return response.data.users.filter(
        (user: Employee) => user.role === 'EMPLOYEE'
      );
    },
  });

  const verifyMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      // This will automatically use request signing since it's a sensitive operation
      // Always send an empty object as the body to ensure consistent signature generation
      return await api.post(
        `/api/users/${employeeId}/verify`, 
        {} // Explicitly send empty object for consistent signature generation
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['employees'] });
    },
  });

  const handleVerify = async (employeeId: string) => {
    try {
      await verifyMutation.mutateAsync(employeeId);
    } catch (error) {
      console.error('Failed to verify employee:', error);
    }
  };

  const filteredEmployees = employees?.filter((employee: Employee) => {
    const matchesSearch = 
      employee.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      employee.phone.includes(searchQuery);
    
    const matchesStatus = 
      statusFilter === 'all' ||
      (statusFilter === 'verified' && employee.verified) ||
      (statusFilter === 'pending' && !employee.verified);

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Employees</h1>
        <p className="text-muted-foreground">
          Manage and verify your employees
        </p>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value: 'all' | 'verified' | 'pending') => setStatusFilter(value)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <p>Loading employees...</p>
        </div>
      ) : filteredEmployees?.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border rounded-lg">
          <p className="text-muted-foreground">No employees found</p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="p-4 text-left font-medium">Name</th>
                <th className="p-4 text-left font-medium">Email</th>
                <th className="p-4 text-left font-medium">Phone</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Joined</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredEmployees?.map((employee: Employee) => (
                <tr key={employee.id} className="border-b">
                  <td className="p-4">{employee.name}</td>
                  <td className="p-4">{employee.email}</td>
                  <td className="p-4">{employee.phone}</td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                        employee.verified
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {employee.verified ? 'Verified' : 'Pending'}
                    </span>
                  </td>
                  <td className="p-4">
                    {new Date(employee.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {!employee.verified && (
                          <DropdownMenuItem
                            onClick={() => handleVerify(employee.id)}
                          >
                            <Check className="mr-2 h-4 w-4" />
                            Verify
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => setSelectedEmployee(employee.id)}
                        >
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <EmployeeDetailsDialog
        employeeId={selectedEmployee}
        onClose={() => setSelectedEmployee(null)}
      />
    </div>
  );
} 