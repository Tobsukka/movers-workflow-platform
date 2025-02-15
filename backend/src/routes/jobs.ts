import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient, Prisma, JobStatus } from '@prisma/client';
import { protect, restrictTo } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';
import { Request, Response } from 'express';

const router = Router();
const prisma = new PrismaClient();

// Validation schemas
const createJobSchema = z.object({
  title: z.string().min(2),
  description: z.string().min(10),
  pickupLocation: z.string(),
  deliveryLocation: z.string(),
  date: z.string().transform((str) => new Date(str)),
  estimatedHours: z.number().min(1),
  numberOfMovers: z.number().min(1),
  items: z.array(z.string()),
  specialRequirements: z.string().optional(),
  customerName: z.string(),
  customerPhone: z.string(),
  customerEmail: z.string().email().optional(),
  floorNumber: z.number().optional(),
  hasElevator: z.boolean().default(false),
  price: z.number().positive(),
});

const updateJobSchema = createJobSchema.partial();

const assignJobSchema = z.object({
  employeeIds: z.array(z.string()),
});

// Get all jobs
router.get('/', protect, async (req, res, next) => {
  try {
    const { status } = req.query;
    const where: Prisma.JobWhereInput = {};

    // If status is provided and not 'ALL', filter by status
    if (status && status !== 'ALL') {
      where.status = status as JobStatus;
    }

    // For employees, only show available jobs or jobs they're assigned to
    if (req.user?.role === 'EMPLOYEE') {
      where.OR = [
        { status: 'AVAILABLE' },
        {
          employees: {
            some: {
              id: req.user.id
            }
          }
        }
      ];
    }

    const jobs = await prisma.job.findMany({
      where,
      orderBy: {
        date: 'desc'
      },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    });

    res.status(200).json({
      status: 'success',
      data: {
        jobs
      }
    });
  } catch (error) {
    next(error);
  }
});

// Get job history
router.get('/history', protect, async (req, res, next) => {
  try {
    const whereClause = {
      status: {
        in: ['COMPLETED', 'CANCELLED']
      },
      ...(req.user?.role === 'EMPLOYEE' 
        ? { employees: { some: { id: req.user.id } } }
        : req.user?.role === 'EMPLOYER'
          ? { employees: { some: { id: req.user.id } } }
          : {}),
    };

    const jobs = await prisma.job.findMany({
      where: whereClause,
      orderBy: {
        date: 'desc'
      },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        shifts: {
          select: {
            id: true,
            status: true,
            employeeId: true,
            employee: {
              select: {
                id: true,
                name: true
              }
            }
          }
        }
      }
    });

    // For employees, filter shifts to only include their own
    const jobsWithFilteredData = jobs.map(job => ({
      ...job,
      shifts: req.user?.role === 'EMPLOYEE' 
        ? job.shifts.filter(shift => shift.employeeId === req.user?.id)
        : job.shifts
    }));

    res.status(200).json({
      status: 'success',
      data: {
        jobs: jobsWithFilteredData
      }
    });
  } catch (error) {
    next(error);
  }
});

// Create job (employer only)
router.post('/', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req: Request, res: Response, next) => {
  try {
    const data = createJobSchema.parse(req.body);

    const job = await prisma.job.create({
      data: {
        title: data.title,
        description: data.description,
        status: 'AVAILABLE',
        pickupLocation: data.pickupLocation,
        deliveryLocation: data.deliveryLocation,
        date: data.date,
        estimatedHours: data.estimatedHours,
        numberOfMovers: data.numberOfMovers,
        items: data.items,
        specialRequirements: data.specialRequirements,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail,
        floorNumber: data.floorNumber,
        hasElevator: data.hasElevator,
        price: data.price,
      },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get job by ID
router.get('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;

    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update job (employer only)
router.put('/:id', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const data = updateJobSchema.parse(req.body);

    const job = await prisma.job.update({
      where: { id },
      data,
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Delete job (employer only)
router.delete('/:id', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.job.delete({
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

// Assign employees to job (employer only)
router.post('/:id/assign', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { employeeIds } = assignJobSchema.parse(req.body);

    const job = await prisma.job.update({
      where: { id },
      data: {
        employees: {
          connect: employeeIds.map((id) => ({ id })),
        },
        status: 'ASSIGNED',
      },
      include: {
        employees: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update job status
router.post('/:id/status', protect, async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, removeShifts = false } = req.body;

    // Validate status
    if (!['AVAILABLE', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'].includes(status)) {
      throw new AppError('Invalid status', 400);
    }

    // Only employers can set job to AVAILABLE or ASSIGNED
    if (['AVAILABLE', 'ASSIGNED'].includes(status) && req.user?.role !== 'EMPLOYER') {
      throw new AppError('You do not have permission to perform this action', 403);
    }

    // Start a transaction to handle job and shifts updates
    const result = await prisma.$transaction(async (tx) => {
      // If marking as available and removeShifts is true, delete associated shifts
      if (status === 'AVAILABLE' && removeShifts) {
        // Delete shifts associated with this job
        await tx.shift.deleteMany({
          where: {
            jobId: id
          }
        });
      }

      // Update the job
      const job = await tx.job.update({
        where: { id },
        data: {
          status,
          // Only remove employee assignments if removeShifts is true
          ...(status === 'AVAILABLE' && removeShifts && {
            employees: {
              set: [] // Remove all employee assignments
            }
          })
        },
        include: {
          employees: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        }
      });

      return job;
    });

    res.status(200).json({
      status: 'success',
      data: {
        job: result
      }
    });
  } catch (error) {
    next(error);
  }
});

// Apply for job (employee only)
router.post('/:id/apply', protect, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if job exists and is available
    const job = await prisma.job.findUnique({
      where: { id },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!job) {
      throw new AppError('Job not found', 404);
    }

    if (job.status !== 'AVAILABLE') {
      throw new AppError('This job is no longer available', 400);
    }

    // Check if employee is already assigned
    if (job.employees.some(employee => employee.id === req.user?.id)) {
      throw new AppError('You are already assigned to this job', 400);
    }

    // Check if employee is verified
    const employee = await prisma.user.findUnique({
      where: { id: req.user?.id },
    });

    if (req.user?.role === 'EMPLOYEE' && !employee?.verified) {
      throw new AppError('Your account must be verified to apply for jobs', 403);
    }

    // Update job with new employee and mark as assigned
    const updatedJob = await prisma.job.update({
      where: { id },
      data: {
        employees: {
          connect: { id: req.user?.id },
        },
        status: 'ASSIGNED',
      },
      include: {
        employees: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Create a shift for the assigned job
    if (req.user?.id) {
      const jobDetails = await prisma.job.findUnique({
        where: { id },
        select: {
          date: true,
          pickupLocation: true
        },
      });

      if (jobDetails) {
        await prisma.shift.create({
          data: {
            employee: {
              connect: {
                id: req.user.id
              }
            },
            job: {
              connect: {
                id
              }
            },
            startTime: jobDetails.date,
            endTime: jobDetails.date,
            status: 'SCHEDULED',
            location: jobDetails.pickupLocation
          },
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        job: updatedJob,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router; 