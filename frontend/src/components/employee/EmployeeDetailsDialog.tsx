import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

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

interface EmployeeDetailsDialogProps {
  employeeId: string | null;
  onClose: () => void;
}

export function EmployeeDetailsDialog({ employeeId, onClose }: EmployeeDetailsDialogProps) {
  const { data: employee, isLoading } = useQuery({
    queryKey: ['employee', employeeId],
    queryFn: async () => {
      if (!employeeId) return null;
      const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/${employeeId}`);
      return response.data.data.user;
    },
    enabled: !!employeeId,
  });

  return (
    <Dialog open={!!employeeId} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Employee Details</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p>Loading employee details...</p>
          </div>
        ) : employee ? (
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="font-semibold">Name:</div>
              <div className="col-span-3">{employee.name}</div>
              
              <div className="font-semibold">Email:</div>
              <div className="col-span-3">{employee.email}</div>
              
              <div className="font-semibold">Phone:</div>
              <div className="col-span-3">{employee.phone}</div>
              
              <div className="font-semibold">Address:</div>
              <div className="col-span-3">{employee.address}</div>
              
              <div className="font-semibold">Status:</div>
              <div className="col-span-3">
                <span
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${
                    employee.verified
                      ? 'bg-green-100 text-green-700'
                      : 'bg-yellow-100 text-yellow-700'
                  }`}
                >
                  {employee.verified ? 'Verified' : 'Pending'}
                </span>
              </div>
              
              <div className="font-semibold">Joined:</div>
              <div className="col-span-3">
                {new Date(employee.createdAt).toLocaleDateString()}
              </div>
            </div>
            
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <p>Employee not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 