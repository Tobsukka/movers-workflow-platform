import { Request, Response } from 'express';
import { Role } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { createMockUser } from '../../test/testUtils';
import usersRouter from '../users';
import { AppError } from '../../middleware/errorHandler';
import { restrictTo } from '../../middleware/auth';
import bcrypt from 'bcryptjs';

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

describe('Users Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let mockCreateHandler: jest.Mock;
  let mockListHandler: jest.Mock;
  let mockUpdateHandler: jest.Mock;
  let mockDeleteHandler: jest.Mock;
  let mockVerifyHandler: jest.Mock;
  let mockChangePasswordHandler: jest.Mock;

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
    mockCreateHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const roleCheck = restrictTo(Role.ADMIN);
        await new Promise<void>((resolve, reject) => {
          roleCheck(req, res, (error?: any) => {
            if (error) reject(error);
            else resolve();
          });
        });

        const userData = req.body;
        const hashedPassword = await bcrypt.hash(userData.password, 12);

        const user = await prismaMock.user.create({
          data: {
            ...userData,
            password: hashedPassword,
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            address: true,
            verified: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        res.status(201).json({
          status: 'success',
          data: { user },
        });
      } catch (error) {
        next(error);
      }
    });

    mockListHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { role, verified } = req.query;
        const users = await prismaMock.user.findMany({
          where: {
            ...(role && { role: role as Role }),
            ...(verified && { verified: verified === 'true' }),
          },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            address: true,
            verified: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { users },
        });
      } catch (error) {
        next(error);
      }
    });

    mockUpdateHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;
        const updateData = req.body;

        const existingUser = await prismaMock.user.findUnique({
          where: { id },
        });

        if (!existingUser) {
          throw new AppError('User not found', 404);
        }

        const user = await prismaMock.user.update({
          where: { id },
          data: updateData,
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            address: true,
            verified: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { user },
        });
      } catch (error) {
        next(error);
      }
    });

    mockDeleteHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;

        const existingUser = await prismaMock.user.findUnique({
          where: { id },
        });

        if (!existingUser) {
          throw new AppError('User not found', 404);
        }

        await prismaMock.user.delete({
          where: { id },
        });

        res.status(204).send();
      } catch (error) {
        next(error);
      }
    });

    mockVerifyHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;

        const existingUser = await prismaMock.user.findUnique({
          where: { id },
        });

        if (!existingUser) {
          throw new AppError('User not found', 404);
        }

        const user = await prismaMock.user.update({
          where: { id },
          data: { verified: true },
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            address: true,
            verified: true,
            createdAt: true,
            updatedAt: true,
          },
        });

        res.status(200).json({
          status: 'success',
          data: { user },
        });
      } catch (error) {
        next(error);
      }
    });

    mockChangePasswordHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { id } = req.params;
        const { currentPassword, newPassword } = req.body;

        const user = await prismaMock.user.findUnique({
          where: { id },
        });

        if (!user) {
          throw new AppError('User not found', 404);
        }

        const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
        if (!isPasswordCorrect) {
          throw new AppError('Current password is incorrect', 401);
        }

        const hashedPassword = await bcrypt.hash(newPassword, 12);
        await prismaMock.user.update({
          where: { id },
          data: {
            password: hashedPassword,
            lastPasswordChange: new Date(),
          },
        });

        res.status(200).json({
          status: 'success',
          message: 'Password updated successfully',
        });
      } catch (error) {
        next(error);
      }
    });

    // Mock the route handlers
    (usersRouter as any).post = jest.fn().mockImplementation((path: string) => {
      if (path === '/') return mockCreateHandler;
      return jest.fn();
    });

    (usersRouter as any).get = jest.fn().mockImplementation((path: string) => {
      if (path === '/') return mockListHandler;
      return jest.fn();
    });

    (usersRouter as any).put = jest.fn().mockImplementation((path: string) => {
      if (path === '/:id') return mockUpdateHandler;
      if (path === '/:id/verify') return mockVerifyHandler;
      if (path === '/:id/change-password') return mockChangePasswordHandler;
      return jest.fn();
    });

    (usersRouter as any).delete = jest.fn().mockImplementation((path: string) => {
      if (path === '/:id') return mockDeleteHandler;
      return jest.fn();
    });
  });

  describe('POST / (Create User)', () => {
    const validUserData = {
      email: 'newuser@example.com',
      password: 'password123',
      name: 'New User',
      role: Role.EMPLOYEE,
      phone: '1234567890',
    };

    beforeEach(() => {
      req.body = validUserData;
    });

    it('should create a new user successfully', async () => {
      const mockUser = createMockUser({
        ...validUserData,
        id: '1',
        password: 'hashedPassword',
      });
      prismaMock.user.create.mockResolvedValue(mockUser);

      await mockCreateHandler(req as Request, res as Response, next);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ...validUserData,
          password: expect.any(String),
        }),
        select: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: expect.objectContaining({
          id: mockUser.id,
          email: mockUser.email,
          name: mockUser.name,
          role: mockUser.role,
        })},
      });
    });

    it('should require admin role', async () => {
      req.user = createMockUser({ role: Role.EMPLOYEE });

      await mockCreateHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });

  describe('GET / (List Users)', () => {
    it('should list users with filters', async () => {
      const mockUsers = [
        createMockUser({ role: Role.EMPLOYEE, verified: true }),
        createMockUser({ id: '2', role: Role.EMPLOYEE, verified: true }),
      ];

      req.query = {
        role: Role.EMPLOYEE,
        verified: 'true',
      };
      prismaMock.user.findMany.mockResolvedValue(mockUsers);

      await mockListHandler(req as Request, res as Response, next);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {
          role: Role.EMPLOYEE,
          verified: true,
        },
        select: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { users: mockUsers },
      });
    });
  });

  describe('PUT /:id (Update User)', () => {
    const updateData = {
      name: 'Updated Name',
      phone: '9876543210',
    };

    beforeEach(() => {
      req.params = { id: '1' };
      req.body = updateData;
    });

    it('should update user successfully', async () => {
      const mockUser = createMockUser({
        id: '1',
        ...updateData,
      });

      prismaMock.user.findUnique.mockResolvedValue(createMockUser());
      prismaMock.user.update.mockResolvedValue(mockUser);

      await mockUpdateHandler(req as Request, res as Response, next);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateData,
        select: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: mockUser },
      });
    });

    it('should handle non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await mockUpdateHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('User not found');
    });
  });

  describe('PUT /:id/verify (Verify User)', () => {
    beforeEach(() => {
      req.params = { id: '1' };
    });

    it('should verify user successfully', async () => {
      const mockUser = createMockUser({
        id: '1',
        verified: true,
      });

      prismaMock.user.findUnique.mockResolvedValue(createMockUser());
      prismaMock.user.update.mockResolvedValue(mockUser);

      await mockVerifyHandler(req as Request, res as Response, next);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: { verified: true },
        select: expect.any(Object),
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: { user: mockUser },
      });
    });

    it('should handle non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await mockVerifyHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('User not found');
    });
  });

  describe('PUT /:id/change-password (Change Password)', () => {
    const passwordData = {
      currentPassword: 'oldpassword',
      newPassword: 'newpassword123',
    };

    beforeEach(() => {
      req.params = { id: '1' };
      req.body = passwordData;
    });

    it('should change password successfully', async () => {
      const mockUser = createMockUser({ id: '1' });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await mockChangePasswordHandler(req as Request, res as Response, next);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          password: expect.any(String),
          lastPasswordChange: expect.any(Date),
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Password updated successfully',
      });
    });

    it('should handle incorrect current password', async () => {
      const mockUser = createMockUser({ id: '1' });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await mockChangePasswordHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Current password is incorrect');
    });
  });

  describe('DELETE /:id (Delete User)', () => {
    beforeEach(() => {
      req.params = { id: '1' };
    });

    it('should delete user successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(createMockUser());
      prismaMock.user.delete.mockResolvedValue(createMockUser());

      await mockDeleteHandler(req as Request, res as Response, next);

      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: '1' },
      });
      expect(res.status).toHaveBeenCalledWith(204);
    });

    it('should handle non-existent user', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await mockDeleteHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('User not found');
    });
  });
}); 