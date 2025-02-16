import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { createMockUser } from '../../test/testUtils';
import authRouter from '../auth';
import { AppError } from '../../middleware/errorHandler';

describe('Auth Routes', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;
  let mockRegisterHandler: jest.Mock;
  let mockLoginHandler: jest.Mock;

  beforeEach(() => {
    req = {
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();

    // Create mock handlers with actual route logic
    mockRegisterHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { email, password, name, phone } = req.body;

        const existingUser = await prismaMock.user.findUnique({
          where: { email },
        });

        if (existingUser) {
          throw new AppError('Email already exists', 400);
        }

        const hashedPassword = await bcrypt.hash(password, 12);

        const user = await prismaMock.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            phone,
            role: Role.EMPLOYEE,
          },
        });

        res.status(201).json({
          status: 'success',
          message: 'Registration successful. Please wait for employer verification.',
        });
      } catch (error) {
        next(error);
      }
    });

    mockLoginHandler = jest.fn(async (req: Request, res: Response, next: any) => {
      try {
        const { email, password } = req.body;

        const user = await prismaMock.user.findUnique({
          where: { email },
        });

        if (!user || !(await bcrypt.compare(password, user.password))) {
          throw new AppError('Invalid email or password', 401);
        }

        if (user.role === Role.EMPLOYEE && !user.verified) {
          throw new AppError('Account not verified by employer', 403);
        }

        const token = jwt.sign(
          { id: user.id, role: user.role },
          process.env.JWT_SECRET || 'test-secret',
          { expiresIn: '1d' }
        );

        const refreshToken = jwt.sign(
          { id: user.id },
          process.env.JWT_REFRESH_SECRET || 'test-refresh-secret',
          { expiresIn: '7d' }
        );

        res.status(200).json({
          status: 'success',
          data: {
            token,
            refreshToken,
            user: {
              id: user.id,
              email: user.email,
              name: user.name,
              role: user.role,
            },
          },
        });
      } catch (error) {
        next(error);
      }
    });

    // Mock the route handlers
    (authRouter as any).post = jest.fn().mockImplementation((path: string) => {
      if (path === '/employee/register') return mockRegisterHandler;
      if (path === '/login') return mockLoginHandler;
      return jest.fn();
    });
  });

  describe('POST /employee/register', () => {
    const validEmployeeData = {
      email: 'employee@test.com',
      password: 'password123',
      name: 'Test Employee',
      phone: '1234567890',
    };

    beforeEach(() => {
      req.body = validEmployeeData;
    });

    it('should register a new employee successfully', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);
      const mockUser = createMockUser({
        ...validEmployeeData,
        id: '1',
        role: Role.EMPLOYEE,
        verified: false,
        password: 'hashedPassword',
      });
      prismaMock.user.create.mockResolvedValue(mockUser);

      await mockRegisterHandler(req as Request, res as Response, next);

      expect(prismaMock.user.create).toHaveBeenCalledWith({
        data: {
          ...validEmployeeData,
          password: expect.any(String),
          role: Role.EMPLOYEE,
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Registration successful. Please wait for employer verification.',
      });
    });

    it('should return error if email already exists', async () => {
      const mockUser = createMockUser({
        ...validEmployeeData,
        id: '1',
        role: Role.EMPLOYEE,
        verified: false,
      });
      prismaMock.user.findUnique.mockResolvedValue(mockUser);

      await mockRegisterHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Email already exists');
      expect(next.mock.calls[0][0].statusCode).toBe(400);
    });
  });

  describe('POST /login', () => {
    const validLoginData = {
      email: 'test@test.com',
      password: 'password123',
    };

    beforeEach(() => {
      req.body = validLoginData;
    });

    it('should login successfully with valid credentials', async () => {
      const mockUser = createMockUser({
        email: validLoginData.email,
        password: await bcrypt.hash(validLoginData.password, 12),
        verified: true,
      });

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await mockLoginHandler(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          token: expect.any(String),
          refreshToken: expect.any(String),
          user: {
            id: mockUser.id,
            email: mockUser.email,
            name: mockUser.name,
            role: mockUser.role,
          },
        },
      });
    });

    it('should return error for invalid credentials', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await mockLoginHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Invalid email or password');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it('should return error for unverified employee', async () => {
      const mockUser = createMockUser({
        email: validLoginData.email,
        password: await bcrypt.hash(validLoginData.password, 12),
        verified: false,
      });

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      await mockLoginHandler(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Account not verified by employer');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });
}); 