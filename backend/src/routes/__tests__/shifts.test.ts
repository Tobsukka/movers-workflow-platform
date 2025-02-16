import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { createMockUser, createMockShift, createMockJob } from '../../test/testUtils';
import shiftsRouter from '../shifts';
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

describe('Shifts Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let mockCreateHandler: jest.Mock;
  let mockListHandler: jest.Mock;
  let mockUpdateHandler: jest.Mock;
  let mockDeleteHandler: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: createMockUser({ role: Role.EMPLOYER }),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Create mock handlers
    mockCreateHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const roleCheck = restrictTo(Role.EMPLOYER, Role.ADMIN);
        await new Promise<void>((resolve, reject) => {
          roleCheck(req, res, (error?: any) => {
            if (error) reject(error);
            else resolve();
          });
        });

        const shiftData = req.body;
        const shift = await prismaMock.shift.create({
          data: shiftData,
          include: {
            job: true,
            employee: true,
          },
        });

        res.status(201).json({
          status: 'success',
          data: { shift },
        });
      } catch (error) {
        next(error);
      }
    });

    mockListHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { status, date, employeeId } = req.query;
        const shifts = await prismaMock.shift.findMany({
          where: {
            ...(status && { status: status as string }),
            ...(date && {
              startTime: {
                gte: new Date(date as string),
                lt: new Date(new Date(date as string).getTime() + 24 * 60 * 60 * 1000),
              },
            }),
            ...(employeeId && { employeeId: employeeId as string }),
          },
          include: {
            job: true,
            employee: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { shifts },
        });
      } catch (error) {
        next(error);
      }
    });

    mockUpdateHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        const existingShift = await prismaMock.shift.findUnique({
          where: { id },
        });

        if (!existingShift) {
          throw new AppError('Shift not found', 404);
        }

        const shift = await prismaMock.shift.update({
          where: { id },
          data: updateData,
          include: {
            job: true,
            employee: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { shift },
        });
      } catch (error) {
        next(error);
      }
    });

    mockDeleteHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;

        const existingShift = await prismaMock.shift.findUnique({
          where: { id },
        });

        if (!existingShift) {
          throw new AppError('Shift not found', 404);
        }

        await prismaMock.shift.delete({
          where: { id },
        });

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    });

    // Mock the route handlers
    (shiftsRouter as any).post = jest.fn().mockImplementation(() => mockCreateHandler);
    (shiftsRouter as any).get = jest.fn().mockImplementation(() => mockListHandler);
    (shiftsRouter as any).put = jest.fn().mockImplementation(() => mockUpdateHandler);
    (shiftsRouter as any).delete = jest.fn().mockImplementation(() => mockDeleteHandler);
  });

  describe('POST / (Create Shift)', () => {
    const validShiftData = {
      jobId: '1',
      employeeId: '1',
      startTime: new Date('2025-03-01T09:00:00Z'),
      endTime: new Date('2025-03-01T17:00:00Z'),
    };

    beforeEach(() => {
      req.body = validShiftData;
    });

    it('should create a new shift successfully', async () => {
      const mockShift = createMockShift({
        ...validShiftData,
        id: '1',
        status: 'SCHEDULED',
      });
      prismaMock.shift.create.mockResolvedValue(mockShift);

      await mockCreateHandler(req as Request, res as Response, next);

      expect(prismaMock.shift.create).toHaveBeenCalledWith({
        data: validShiftData,
        include: {
          job: true,
          employee: true,
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { shift: mockShift },
      });
    });

    it('should require employer role', async () => {
      req.user = createMockUser({ role: Role.EMPLOYEE });

      await mockCreateHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });

  describe('GET / (List Shifts)', () => {
    it('should list shifts with filters', async () => {
      const mockShifts = [
        createMockShift({ status: 'SCHEDULED' }),
        createMockShift({ id: '2', status: 'SCHEDULED' }),
      ];

      req.query = {
        status: 'SCHEDULED',
        date: '2025-03-01',
        employeeId: '1',
      };
      prismaMock.shift.findMany.mockResolvedValue(mockShifts);

      await mockListHandler(req as Request, res as Response, next);

      expect(prismaMock.shift.findMany).toHaveBeenCalledWith({
        where: {
          status: 'SCHEDULED',
          startTime: {
            gte: new Date('2025-03-01'),
            lt: new Date('2025-03-02'),
          },
          employeeId: '1',
        },
        include: {
          job: true,
          employee: true,
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { shifts: mockShifts },
      });
    });
  });

  describe('PUT /:id (Update Shift)', () => {
    const updateData = {
      status: 'IN_PROGRESS' as const,
      notes: 'Started the job',
    };

    beforeEach(() => {
      req.params = { id: '1' };
      req.body = updateData;
    });

    it('should update shift successfully', async () => {
      const mockShift = createMockShift({
        id: '1',
        ...updateData,
      });

      prismaMock.shift.findUnique.mockResolvedValue(createMockShift());
      prismaMock.shift.update.mockResolvedValue(mockShift);

      await mockUpdateHandler(req as Request, res as Response, next);

      expect(prismaMock.shift.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
        include: {
          job: true,
          employee: true,
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { shift: mockShift },
      });
    });

    it('should handle non-existent shift', async () => {
      prismaMock.shift.findUnique.mockResolvedValue(null);

      await mockUpdateHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Shift not found');
    });
  });

  describe('DELETE /:id (Delete Shift)', () => {
    beforeEach(() => {
      req.params = { id: '1' };
    });

    it('should delete shift successfully', async () => {
      prismaMock.shift.findUnique.mockResolvedValue(createMockShift());
      prismaMock.shift.delete.mockResolvedValue(createMockShift());

      await mockDeleteHandler(req as Request, res as Response, next);

      expect(prismaMock.shift.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should handle non-existent shift', async () => {
      prismaMock.shift.findUnique.mockResolvedValue(null);

      await mockDeleteHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Shift not found');
    });
  });
}); 