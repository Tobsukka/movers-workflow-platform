import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { FileText, DollarSign, Clock } from 'lucide-react';

interface ShiftReportDialogProps {
  shiftId: string | null;
  onClose: () => void;
}

interface ShiftReport {
  id: string;
  endTime: string;
  notes: string | null;
  challenges: string | null;
  customerSignature: string;
  photos: string[];
  breakMinutes: number;
  additionalExpenses: Array<{
    description: string;
    amount: number;
  }>;
  job: {
    title: string;
    description: string;
  };
}

export default function ShiftReportDialog({
  shiftId,
  onClose,
}: ShiftReportDialogProps) {
  const { data: shift, isLoading } = useQuery({
    queryKey: ['shift', shiftId],
    queryFn: async () => {
      if (!shiftId) return null;
      const response = await axios.get(
        `${import.meta.env.VITE_API_URL}/api/shifts/${shiftId}`
      );
      return response.data.data.shift;
    },
    enabled: !!shiftId,
  });

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
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
    <Dialog open={!!shiftId} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Shift Report</DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <p>Loading shift report...</p>
          </div>
        ) : shift ? (
          <div className="space-y-6">
            {/* Job Information */}
            <div className="space-y-2">
              <h3 className="font-semibold">Job Details</h3>
              <div className="bg-muted/50 p-3 rounded-lg">
                <h4 className="font-medium">{shift.job?.title}</h4>
                <p className="text-sm text-muted-foreground">{shift.job?.description}</p>
              </div>
            </div>

            {/* Time Information */}
            <div className="space-y-2">
              <h3 className="font-semibold">Time Details</h3>
              <div className="bg-muted/50 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span>Completed at {formatTime(shift.endTime)}</span>
                </div>
                {shift.breakMinutes > 0 && (
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span>Break Duration: {shift.breakMinutes} minutes</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes and Challenges */}
            {(shift.notes || shift.challenges) && (
              <div className="space-y-2">
                <h3 className="font-semibold">Notes & Challenges</h3>
                <div className="bg-muted/50 p-3 rounded-lg space-y-4">
                  {shift.notes && (
                    <div>
                      <h4 className="font-medium mb-1">Notes</h4>
                      <p className="text-sm text-muted-foreground">{shift.notes}</p>
                    </div>
                  )}
                  {shift.challenges && (
                    <div>
                      <h4 className="font-medium mb-1">Challenges</h4>
                      <p className="text-sm text-muted-foreground">{shift.challenges}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Additional Expenses */}
            {shift.additionalExpenses?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Additional Expenses</h3>
                <div className="bg-muted/50 p-3 rounded-lg space-y-3">
                  {shift.additionalExpenses.map((expense, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{expense.description}</span>
                      <span className="font-medium">{formatCurrency(expense.amount)}</span>
                    </div>
                  ))}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total Additional Expenses</span>
                    <span>
                      {formatCurrency(
                        shift.additionalExpenses.reduce(
                          (sum, exp) => sum + exp.amount,
                          0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Photos */}
            {shift.photos?.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-semibold">Photos</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {shift.photos.map((photo, index) => (
                    <img
                      key={index}
                      src={photo}
                      alt={`Job photo ${index + 1}`}
                      className="rounded-lg object-cover aspect-square"
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Customer Signature */}
            <div className="space-y-2">
              <h3 className="font-semibold">Customer Signature</h3>
              <div className="bg-white border rounded-lg p-4">
                <img
                  src={shift.customerSignature}
                  alt="Customer signature"
                  className="max-h-32 object-contain w-full"
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <p>Shift report not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 