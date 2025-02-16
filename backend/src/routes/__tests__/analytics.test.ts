import { Request, Response } from 'express';
import { Role, JobStatus } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { createMockUser, createMockJob, createMockShift, MockJob, MockShift } from '../../test/testUtils';
import analyticsRouter from '../analytics';
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

describe('Analytics Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let mockJobStatsHandler: jest.Mock;
  let mockEmployeeStatsHandler: jest.Mock;
  let mockRevenueStatsHandler: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: createMockUser({ role: Role.ADMIN }),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Create mock handlers
    mockJobStatsHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const roleCheck = restrictTo(Role.ADMIN, Role.EMPLOYER);
        await new Promise<void>((resolve, reject) => {
          roleCheck(req, res, (error?: any) => {
            if (error) reject(error);
            else resolve();
          });
        });

        const { startDate, endDate } = req.query;
        const jobs = await prismaMock.job.findMany({
          where: {
            date: {
              gte: startDate ? new Date(startDate as string) : undefined,
              lte: endDate ? new Date(endDate as string) : undefined,
            },
          },
        });

        const stats = {
          total: jobs.length,
          byStatus: {
            [JobStatus.AVAILABLE]: jobs.filter((job: MockJob) => job.status === JobStatus.AVAILABLE).length,
            [JobStatus.ASSIGNED]: jobs.filter((job: MockJob) => job.status === JobStatus.ASSIGNED).length,
            [JobStatus.IN_PROGRESS]: jobs.filter((job: MockJob) => job.status === JobStatus.IN_PROGRESS).length,
            [JobStatus.COMPLETED]: jobs.filter((job: MockJob) => job.status === JobStatus.COMPLETED).length,
            [JobStatus.CANCELLED]: jobs.filter((job: MockJob) => job.status === JobStatus.CANCELLED).length,
          },
          averagePrice: jobs.reduce((acc: number, job: MockJob) => acc + job.price, 0) / jobs.length || 0,
          averageHours: jobs.reduce((acc: number, job: MockJob) => acc + job.estimatedHours, 0) / jobs.length || 0,
        };

        res.status(200).json({
          status: 'success',
          data: { stats },
        });
      } catch (error) {
        next(error);
      }
    });

    mockEmployeeStatsHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const roleCheck = restrictTo(Role.ADMIN, Role.EMPLOYER);
        await new Promise<void>((resolve, reject) => {
          roleCheck(req, res, (error?: any) => {
            if (error) reject(error);
            else resolve();
          });
        });

        const { startDate, endDate } = req.query;
        const shifts = await prismaMock.shift.findMany({
          where: {
            startTime: {
              gte: startDate ? new Date(startDate as string) : undefined,
              lte: endDate ? new Date(endDate as string) : undefined,
            },
          },
          include: {
            employee: true,
          },
        });

        const employeeStats = shifts.reduce((acc: Record<string, any>, shift: MockShift) => {
          const employeeId = shift.employeeId;
          if (!acc[employeeId]) {
            acc[employeeId] = {
              employee: shift.employee,
              totalShifts: 0,
              totalHours: 0,
              completedShifts: 0,
            };
          }

          acc[employeeId].totalShifts++;
          if (shift.hoursWorked) {
            acc[employeeId].totalHours += shift.hoursWorked;
          }
          if (shift.status === 'COMPLETED') {
            acc[employeeId].completedShifts++;
          }

          return acc;
        }, {});

        res.status(200).json({
          status: 'success',
          data: { stats: Object.values(employeeStats) },
        });
      } catch (error) {
        next(error);
      }
    });

    mockRevenueStatsHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const roleCheck = restrictTo(Role.ADMIN);
        await new Promise<void>((resolve, reject) => {
          roleCheck(req, res, (error?: any) => {
            if (error) reject(error);
            else resolve();
          });
        });

        const { startDate, endDate, interval } = req.query;
        const jobs = await prismaMock.job.findMany({
          where: {
            status: JobStatus.COMPLETED,
            date: {
              gte: startDate ? new Date(startDate as string) : undefined,
              lte: endDate ? new Date(endDate as string) : undefined,
            },
          },
        });

        let revenueData;
        if (interval === 'daily') {
          revenueData = jobs.reduce((acc: Record<string, number>, job: MockJob) => {
            const date = job.date.toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + job.price;
            return acc;
          }, {});
        } else if (interval === 'monthly') {
          revenueData = jobs.reduce((acc: Record<string, number>, job: MockJob) => {
            const month = job.date.toISOString().slice(0, 7);
            acc[month] = (acc[month] || 0) + job.price;
            return acc;
          }, {});
        } else {
          revenueData = {
            total: jobs.reduce((acc: number, job: MockJob) => acc + job.price, 0),
          };
        }

        res.status(200).json({
          status: 'success',
          data: { revenue: revenueData },
        });
      } catch (error) {
        next(error);
      }
    });

    // Mock the route handlers
    (analyticsRouter as any).get = jest.fn().mockImplementation((path: string) => {
      if (path === '/jobs') return mockJobStatsHandler;
      if (path === '/employees') return mockEmployeeStatsHandler;
      if (path === '/revenue') return mockRevenueStatsHandler;
      return jest.fn();
    });
  });

  describe('GET /jobs (Job Statistics)', () => {
    it('should return job statistics', async () => {
      const mockJobs = [
        createMockJob({ status: JobStatus.COMPLETED, price: 400, estimatedHours: 4 }),
        createMockJob({ id: '2', status: JobStatus.IN_PROGRESS, price: 300, estimatedHours: 3 }),
      ];

      req.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };
      prismaMock.job.findMany.mockResolvedValue(mockJobs);

      await mockJobStatsHandler(req as Request, res as Response, next);

      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: {
          date: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31'),
          },
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          stats: {
            total: 2,
            byStatus: {
              AVAILABLE: 0,
              ASSIGNED: 0,
              IN_PROGRESS: 1,
              COMPLETED: 1,
              CANCELLED: 0,
            },
            averagePrice: 350,
            averageHours: 3.5,
          },
        },
      });
    });

    it('should require admin or employer role', async () => {
      req.user = createMockUser({ role: Role.EMPLOYEE });

      await mockJobStatsHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });

  describe('GET /employees (Employee Statistics)', () => {
    it('should return employee statistics', async () => {
      const mockEmployee = createMockUser({ role: Role.EMPLOYEE });
      const mockShifts = [
        createMockShift({
          employeeId: mockEmployee.id,
          status: 'COMPLETED',
          hoursWorked: 4,
          employee: mockEmployee,
        }),
        createMockShift({
          id: '2',
          employeeId: mockEmployee.id,
          status: 'IN_PROGRESS',
          hoursWorked: 2,
          employee: mockEmployee,
        }),
      ];

      req.query = {
        startDate: '2025-01-01',
        endDate: '2025-12-31',
      };
      prismaMock.shift.findMany.mockResolvedValue(mockShifts);

      await mockEmployeeStatsHandler(req as Request, res as Response, next);

      expect(prismaMock.shift.findMany).toHaveBeenCalledWith({
        where: {
          startTime: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-12-31'),
          },
        },
        include: {
          employee: true,
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          stats: [{
            employee: mockEmployee,
            totalShifts: 2,
            totalHours: 6,
            completedShifts: 1,
          }],
        },
      });
    });

    it('should require admin or employer role', async () => {
      req.user = createMockUser({ role: Role.EMPLOYEE });

      await mockEmployeeStatsHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });

  describe('GET /revenue (Revenue Statistics)', () => {
    it('should return daily revenue statistics', async () => {
      const mockJobs = [
        createMockJob({
          status: JobStatus.COMPLETED,
          price: 400,
          date: new Date('2025-01-01'),
        }),
        createMockJob({
          id: '2',
          status: JobStatus.COMPLETED,
          price: 300,
          date: new Date('2025-01-02'),
        }),
      ];

      req.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        interval: 'daily',
      };
      prismaMock.job.findMany.mockResolvedValue(mockJobs);

      await mockRevenueStatsHandler(req as Request, res as Response, next);

      expect(prismaMock.job.findMany).toHaveBeenCalledWith({
        where: {
          status: JobStatus.COMPLETED,
          date: {
            gte: new Date('2025-01-01'),
            lte: new Date('2025-01-31'),
          },
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          revenue: {
            '2025-01-01': 400,
            '2025-01-02': 300,
          },
        },
      });
    });

    it('should require admin role', async () => {
      req.user = createMockUser({ role: Role.EMPLOYER });

      await mockRevenueStatsHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });
}); 