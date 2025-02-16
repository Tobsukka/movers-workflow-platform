import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protect, restrictTo } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { ensureAuth } from '../middleware/auth';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createShiftSchema = z.object({
  employeeId: z.string(),
  jobId: z.string(),
  startTime: z.string().transform((str) => new Date(str)),
  endTime: z.string().transform((str) => new Date(str)),
  location: z.string().optional(),
});

const updateShiftSchema = z.object({
  startTime: z.string().transform((str) => new Date(str)).optional(),
  endTime: z.string().transform((str) => new Date(str)).optional(),
  status: z.enum(['SCHEDULED', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
  location: z.string().optional(),
});

// New schema for shift completion
const completeShiftSchema = z.object({
  endTime: z.string().transform((str) => new Date(str)),
  notes: z.string().optional(),
  challenges: z.string().optional(),
  customerSignature: z.string(),
  photos: z.array(z.string()).optional(),
  breakMinutes: z.number().min(0),
  additionalExpenses: z.array(z.object({
    description: z.string(),
    amount: z.number().positive(),
  })).optional(),
});

// Get all shifts
router.get('/', protect, async (req, res, next) => {
  try {
    const user = ensureAuth(req);
    // For employees, only return their shifts
    // For employers, check if myShifts query param is present
    const whereClause = {
      ...(user.role === 'EMPLOYEE' 
        ? { 
            employeeId: user.id,
            status: { not: 'COMPLETED' } // Exclude completed shifts for employees
          }
        : req.query.myShifts === 'true'
          ? { 
              job: { employees: { some: { id: user.id } } },
              status: { not: 'COMPLETED' } // Exclude completed shifts for myShifts
            }
          : {}),
    };

    const shifts = await prisma.shift.findMany({
      where: whereClause,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            description: true,
            pickupLocation: true,
            deliveryLocation: true,
            estimatedHours: true,
            status: true,
          },
        },
      },
      orderBy: {
        startTime: 'desc',
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        shifts,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Create shift (employer only)
router.post('/', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req, res, next) => {
  try {
    const data = createShiftSchema.parse(req.body);

    // Validate employee exists and is verified
    const employee = await prisma.user.findUnique({
      where: { id: data.employeeId },
    });

    if (!employee) {
      throw new AppError('Employee not found', 404);
    }

    if (!employee.verified) {
      throw new AppError('Employee is not verified', 400);
    }

    // Validate job exists
    const job = await prisma.job.findUnique({
      where: { id: data.jobId },
    });

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    // Validate shift times
    if (data.startTime >= data.endTime) {
      throw new AppError('Start time must be before end time', 400);
    }

    // Check for overlapping shifts
    const overlappingShift = await prisma.shift.findFirst({
      where: {
        employeeId: data.employeeId,
        OR: [
          {
            AND: [
              { startTime: { lte: data.startTime } },
              { endTime: { gt: data.startTime } },
            ],
          },
          {
            AND: [
              { startTime: { lt: data.endTime } },
              { endTime: { gte: data.endTime } },
            ],
          },
        ],
      },
    });

    if (overlappingShift) {
      throw new AppError('Employee has overlapping shift', 400);
    }

    const shift = await prisma.shift.create({
      data: {
        employeeId: data.employeeId,
        jobId: data.jobId,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        status: 'SCHEDULED',
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        shift,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get shift by ID
router.get('/:id', protect, async (req, res, next) => {
  try {
    const user = ensureAuth(req);
    const { id } = req.params;

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    if (!shift) {
      throw new AppError('Shift not found', 404);
    }

    // Employees can only view their own shifts
    if (user.role === 'EMPLOYEE' && shift.employeeId !== user.id) {
      throw new AppError('You do not have permission to view this shift', 403);
    }

    res.status(200).json({
      status: 'success',
      data: {
        shift,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update shift
router.put('/:id', protect, async (req, res, next) => {
  try {
    const user = ensureAuth(req);
    const { id } = req.params;
    const data = updateShiftSchema.parse(req.body);

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            employees: {
              select: {
                id: true,
              },
            },
          },
        },
      },
    });

    if (!shift) {
      throw new AppError('Shift not found', 404);
    }

    // Check permissions based on role
    if (user.role === 'EMPLOYEE') {
      // Employees can only update their own shifts
      if (shift.employeeId !== user.id) {
        throw new AppError('You do not have permission to update this shift', 403);
      }
      // Employees can only update status
      if (Object.keys(data).some((key) => key !== 'status')) {
        throw new AppError('You can only update the shift status', 403);
      }
    } else if (user.role === 'EMPLOYER') {
      // Employers can only update shifts for jobs they're assigned to
      const isAssignedToJob = shift.job.employees.some(emp => emp.id === user.id);
      if (!isAssignedToJob) {
        throw new AppError('You do not have permission to update this shift', 403);
      }
      // Employers can only update status
      if (Object.keys(data).some((key) => key !== 'status')) {
        throw new AppError('You can only update the shift status', 403);
      }
    }

    const updatedShift = await prisma.shift.update({
      where: { id },
      data,
      include: {
        employee: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        job: {
          select: {
            id: true,
            title: true,
            description: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        shift: updatedShift,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Delete shift (employer only)
router.delete('/:id', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.shift.delete({
      where: { id },
    });

    res.status(204).json({
      status: 'success',
      data: null,
    });
  } catch (error) {
    next(error);
  }
});

// Complete shift (employee and employer)
router.post('/:id/complete', protect, async (req, res, next) => {
  try {
    const user = ensureAuth(req);
    const { id } = req.params;
    const data = completeShiftSchema.parse(req.body);

    const shift = await prisma.shift.findUnique({
      where: { id },
      include: {
        job: {
          include: {
            shifts: true,
            employees: {
              select: {
                id: true
              }
            }
          }
        }
      }
    });

    if (!shift) {
      throw new AppError('Shift not found', 404);
    }

    // Check permissions based on role
    if (user.role === 'EMPLOYEE') {
      // Employees can only complete their own shifts
      if (shift.employeeId !== user.id) {
        throw new AppError('You do not have permission to complete this shift', 403);
      }
    } else if (user.role === 'EMPLOYER') {
      // Employers can only complete shifts for jobs they're assigned to
      const isAssignedToJob = shift.job.employees.some(emp => emp.id === user.id);
      if (!isAssignedToJob) {
        throw new AppError('You do not have permission to complete this shift', 403);
      }
    }

    // Verify the shift is in ACTIVE status
    if (shift.status !== 'ACTIVE') {
      throw new AppError('Only active shifts can be completed', 400);
    }

    // Start a transaction to update both shift and job
    const result = await prisma.$transaction(async (tx) => {
      // Update the shift with completion details
      const updatedShift = await tx.shift.update({
        where: { id },
        data: {
          endTime: data.endTime,
          status: 'COMPLETED',
          notes: data.notes,
          challenges: data.challenges,
          customerSignature: data.customerSignature,
          photos: data.photos,
          breakMinutes: data.breakMinutes,
          additionalExpenses: data.additionalExpenses,
        },
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      // Check if all shifts for this job are completed
      const allShiftsCompleted = shift.job.shifts.every(
        (s) => s.id === id || s.status === 'COMPLETED'
      );

      // If all shifts are completed, update the job status
      if (allShiftsCompleted) {
        await tx.job.update({
          where: { id: shift.job.id },
          data: { status: 'COMPLETED' },
        });
      }

      return updatedShift;
    });

    res.status(200).json({
      status: 'success',
      data: {
        shift: result,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router; 