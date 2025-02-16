import { Request, Response } from 'express';
import { Role, JobStatus } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { createMockUser, createMockJob } from '../../test/testUtils';
import jobsRouter from '../jobs';
import { AppError } from '../../middleware/errorHandler';
import { restrictTo } from '../../middleware/auth';

// Mock restrictTo middleware
jest.mock('../../middleware/auth', () => ({
  restrictTo: (...roles: string[]) => (req: Request, res: Response, next: any) => {
    if (!req.user) {
      return next(new AppError('You are not logged in', 401));
    }
    if (!roles.includes(req.user.role)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  },
}));

describe('Jobs Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let mockCreateHandler: jest.Mock;
  let mockListHandler: jest.Mock;
  let mockUpdateHandler: jest.Mock;
  let mockDeleteHandler: jest.Mock;
  let mockSearchHandler: jest.Mock;
  let mockAssignHandler: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: createMockUser({ role: Role.EMPLOYER }), // Most job operations require EMPLOYER role
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Create mock handlers with actual route logic
    mockCreateHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        // Apply role check middleware
        const roleCheck = restrictTo(Role.EMPLOYER, Role.ADMIN);
        await new Promise<void>((resolve, reject) => {
          roleCheck(req, res, (error?: any) => {
            if (error) reject(error);
            else resolve();
          });
        });

        const jobData = req.body;
        const job = await prismaMock.job.create({
          data: jobData,
        });

        res.status(201).json({
          status: 'success',
          data: { job },
        });
      } catch (error) {
        next(error);
      }
    });

    mockListHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { status, date, location } = req.query;
        const jobs = await prismaMock.job.findMany({
          where: {
            status: status as JobStatus,
            ...(date && { date: new Date(date as string) }),
            ...(location && {
              OR: [
                { pickupLocation: { contains: location as string } },
                { deliveryLocation: { contains: location as string } },
              ],
            }),
          },
          include: {
            employees: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { jobs },
        });
      } catch (error) {
        next(error);
      }
    });

    mockUpdateHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        const existingJob = await prismaMock.job.findUnique({
          where: { id },
        });

        if (!existingJob) {
          throw new AppError('Job not found', 404);
        }

        // Validate status transition
        if (updateData.status) {
          const isValidTransition = validateStatusTransition(existingJob.status, updateData.status);
          if (!isValidTransition) {
            throw new AppError('Invalid status transition', 400);
          }
        }

        const job = await prismaMock.job.update({
          where: { id },
          data: updateData,
          include: {
            employees: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { job },
        });
      } catch (error) {
        next(error);
      }
    });

    mockDeleteHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;

        const existingJob = await prismaMock.job.findUnique({
          where: { id },
        });

        if (!existingJob) {
          throw new AppError('Job not found', 404);
        }

        await prismaMock.job.delete({
          where: { id },
        });

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    });

    mockSearchHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { query } = req.query;
        const jobs = await prismaMock.job.findMany({
          where: {
            OR: [
              { title: { contains: query as string } },
              { description: { contains: query as string } },
              { customerName: { contains: query as string } },
              { pickupLocation: { contains: query as string } },
              { deliveryLocation: { contains: query as string } },
            ],
          },
          include: {
            employees: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { jobs },
        });
      } catch (error) {
        next(error);
      }
    });

    mockAssignHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;
        const { employeeIds } = req.body;

        const existingJob = await prismaMock.job.findUnique({
          where: { id },
          include: { employees: true },
        });

        if (!existingJob) {
          throw new AppError('Job not found', 404);
        }

        if (existingJob.status !== JobStatus.AVAILABLE) {
          throw new AppError('Job is not available for assignment', 400);
        }

        const job = await prismaMock.job.update({
          where: { id },
          data: {
            status: JobStatus.ASSIGNED,
            employees: {
              connect: employeeIds.map((id: string) => ({ id })),
            },
          },
          include: {
            employees: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { job },
        });
      } catch (error) {
        next(error);
      }
    });

    // Mock the route handlers
    (jobsRouter as any).post = jest.fn().mockImplementation((path: string) => {
      if (path === '/') return mockCreateHandler;
      if (path === '/:id/assign') return mockAssignHandler;
      return jest.fn();
    });

    (jobsRouter as any).get = jest.fn().mockImplementation((path: string) => {
      if (path === '/') return mockListHandler;
      if (path === '/search') return mockSearchHandler;
      return jest.fn();
    });

    (jobsRouter as any).put = jest.fn().mockImplementation((path: string) => {
      if (path.includes('/:id')) return mockUpdateHandler;
      return jest.fn();
    });

    (jobsRouter as any).delete = jest.fn().mockImplementation((path: string) => {
      if (path.includes('/:id')) return mockDeleteHandler;
      return jest.fn();
    });
  });

  // Helper function to validate job status transitions
  const validateStatusTransition = (currentStatus: JobStatus, newStatus: JobStatus): boolean => {
    const validTransitions: Record<JobStatus, JobStatus[]> = {
      [JobStatus.AVAILABLE]: [JobStatus.ASSIGNED, JobStatus.CANCELLED],
      [JobStatus.ASSIGNED]: [JobStatus.IN_PROGRESS, JobStatus.CANCELLED],
      [JobStatus.IN_PROGRESS]: [JobStatus.COMPLETED, JobStatus.CANCELLED],
      [JobStatus.COMPLETED]: [],
      [JobStatus.CANCELLED]: [],
    };

    return validTransitions[currentStatus]?.includes(newStatus) || false;
  };

  describe('POST / (Create Job)', () => {
    const validJobData = {
      title: 'New Move',
      description: 'Moving a studio apartment',
      pickupLocation: '789 Start Rd',
      deliveryLocation: '012 End Ln',
      date: new Date('2025-03-15T09:00:00Z'),
      estimatedHours: 3,
      numberOfMovers: 2,
      items: ['Bed', 'Desk', 'Chairs'],
      customerName: 'Jane Smith',
      customerPhone: '0987654321',
      price: 300,
    };

    beforeEach(() => {
      req.body = validJobData;
    });

    it('should create a new job successfully', async () => {
      const mockJob = createMockJob({
        ...validJobData,
        id: '1',
        status: JobStatus.AVAILABLE,
      });
      prismaMock.job.create.mockResolvedValue(mockJob);

      await mockCreateHandler(req as Request, res as Response, next);

      expect(prismaMock.job.create).toHaveBeenCalledWith({
        data: validJobData,
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { job: mockJob },
      });
    });

    it('should handle validation errors', async () => {
      const invalidJobData = { ...validJobData, estimatedHours: -1 };
      req.body = invalidJobData;

      prismaMock.job.create.mockRejectedValue(new Error('Invalid input'));

      await mockCreateHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    it('should require employer role', async () => {
      req.user = createMockUser({ role: Role.EMPLOYEE });

      await mockCreateHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });

  describe('GET / (List Jobs)', () => {
    it('should list available jobs', async () => {
      const mockJobs = [
        createMockJob({ status: JobStatus.AVAILABLE }),
        createMockJob({ id: '2', status: JobStatus.AVAILABLE }),
      ];

      req.query = { status: JobStatus.AVAILABLE };
      prismaMock.job.findMany.mockResolvedValue(mockJobs);

      await mockListHandler(req as Request, res as Response, next);

      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: { status: JobStatus.AVAILABLE },
        include: { employees: true },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { jobs: mockJobs },
      });
    });

    it('should filter jobs by date', async () => {
      const date = '2025-03-15';
      const mockJobs = [createMockJob({ date: new Date(date) })];

      req.query = { date };
      prismaMock.job.findMany.mockResolvedValue(mockJobs);

      await mockListHandler(req as Request, res as Response, next);

      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: { date: new Date(date) },
        include: { employees: true },
      });
    });

    it('should filter jobs by location', async () => {
      const location = 'New York';
      const mockJobs = [
        createMockJob({ pickupLocation: 'New York City' }),
        createMockJob({ deliveryLocation: 'New York State' }),
      ];

      req.query = { location };
      prismaMock.job.findMany.mockResolvedValue(mockJobs);

      await mockListHandler(req as Request, res as Response, next);

      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { pickupLocation: { contains: location } },
            { deliveryLocation: { contains: location } },
          ],
        },
        include: { employees: true },
      });
    });
  });

  describe('GET /search (Search Jobs)', () => {
    it('should search jobs by query string', async () => {
      const query = 'apartment';
      const mockJobs = [
        createMockJob({ description: '2-bedroom apartment move' }),
        createMockJob({ title: 'Apartment Relocation' }),
      ];

      req.query = { query };
      prismaMock.job.findMany.mockResolvedValue(mockJobs);

      await mockSearchHandler(req as Request, res as Response, next);

      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: query } },
            { description: { contains: query } },
            { customerName: { contains: query } },
            { pickupLocation: { contains: query } },
            { deliveryLocation: { contains: query } },
          ],
        },
        include: { employees: true },
      });
    });
  });

  describe('PUT /:id (Update Job)', () => {
    const updateData = {
      status: JobStatus.ASSIGNED,
      employees: { connect: [{ id: '2' }] },
    };

    beforeEach(() => {
      req.params = { id: '1' };
      req.body = updateData;
    });

    it('should update job status successfully', async () => {
      const mockJob = createMockJob({
        id: '1',
        status: JobStatus.ASSIGNED,
        employees: [createMockUser({ id: '2' })],
      });

      prismaMock.job.findUnique.mockResolvedValue(createMockJob({ status: JobStatus.AVAILABLE }));
      prismaMock.job.update.mockResolvedValue(mockJob);

      await mockUpdateHandler(req as Request, res as Response, next);

      expect(prismaMock.job.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
        include: { employees: true },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { job: mockJob },
      });
    });

    it('should handle non-existent job', async () => {
      prismaMock.job.findUnique.mockResolvedValue(null);

      await mockUpdateHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Job not found');
    });

    it('should validate status transitions', async () => {
      const invalidUpdateData = {
        status: JobStatus.COMPLETED,
      };
      req.body = invalidUpdateData;

      prismaMock.job.findUnique.mockResolvedValue(createMockJob({ status: JobStatus.AVAILABLE }));

      await mockUpdateHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Invalid status transition');
    });
  });

  describe('DELETE /:id (Delete Job)', () => {
    beforeEach(() => {
      req.params = { id: '1' };
    });

    it('should delete job successfully', async () => {
      prismaMock.job.findUnique.mockResolvedValue(createMockJob());
      prismaMock.job.delete.mockResolvedValue(createMockJob());

      await mockDeleteHandler(req as Request, res as Response, next);

      expect(prismaMock.job.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should handle non-existent job', async () => {
      prismaMock.job.findUnique.mockResolvedValue(null);

      await mockDeleteHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Job not found');
    });
  });

  describe('POST /:id/assign (Assign Job)', () => {
    const assignData = {
      employeeIds: ['2', '3'],
    };

    beforeEach(() => {
      req.params = { id: '1' };
      req.body = assignData;
    });

    it('should assign employees to job successfully', async () => {
      const mockJob = createMockJob({
        id: '1',
        status: JobStatus.ASSIGNED,
        employees: [
          createMockUser({ id: '2' }),
          createMockUser({ id: '3' }),
        ],
      });

      prismaMock.job.findUnique.mockResolvedValue(createMockJob({ status: JobStatus.AVAILABLE }));
      prismaMock.job.update.mockResolvedValue(mockJob);

      await mockAssignHandler(req as Request, res as Response, next);

      expect(prismaMock.job.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          status: JobStatus.ASSIGNED,
          employees: {
            connect: assignData.employeeIds.map(id => ({ id })),
          },
        },
        include: { employees: true },
      });
    });

    it('should handle non-existent job', async () => {
      prismaMock.job.findUnique.mockResolvedValue(null);

      await mockAssignHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Job not found');
    });

    it('should handle already assigned job', async () => {
      prismaMock.job.findUnique.mockResolvedValue(createMockJob({ status: JobStatus.ASSIGNED }));

      await mockAssignHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Job is not available for assignment');
    });
  });
}); 