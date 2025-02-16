import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { prismaMock } from '../../test/setup';
import { createMockUser, createMockUserSelect } from '../../test/testUtils';
import { protect, restrictTo, ensureAuth } from '../auth';
import { AppError } from '../errorHandler';

describe('Auth Middleware', () => {
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    req = {
      headers: {},
      cookies: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('protect', () => {
    it('should authenticate valid JWT token in Authorization header', async () => {
      const mockUser = createMockUser();
      const mockUserSelect = createMockUserSelect({
        id: mockUser.id,
        role: mockUser.role,
        verified: true,
      });
      const token = 'valid.jwt.token';

      req.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: mockUser.id, role: mockUser.role });
      prismaMock.user.findUnique.mockResolvedValue(mockUserSelect);

      await protect(req as Request, res as Response, next);

      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        select: {
          id: true,
          role: true,
          verified: true,
        },
      });
      expect(req.user).toEqual({
        id: mockUser.id,
        role: mockUser.role,
      });
      expect(next).toHaveBeenCalledWith();
    });

    it('should handle missing token', async () => {
      await protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('You are not logged in. Please log in to get access.');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it('should handle invalid token', async () => {
      req.headers = {
        authorization: 'Bearer invalid.token',
      };

      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Invalid token. Please log in again.');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it('should handle non-existent user', async () => {
      const token = 'valid.jwt.token';
      req.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: 'non-existent-id', role: Role.EMPLOYEE });
      prismaMock.user.findUnique.mockResolvedValue(null);

      await protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('The user belonging to this token no longer exists.');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });

    it('should handle unverified employee', async () => {
      const token = 'valid.jwt.token';
      req.headers = {
        authorization: `Bearer ${token}`,
      };

      (jwt.verify as jest.Mock).mockReturnValue({ id: '1', role: Role.EMPLOYEE });
      prismaMock.user.findUnique.mockResolvedValue(
        createMockUserSelect({
          id: '1',
          role: Role.EMPLOYEE,
          verified: false,
        })
      );

      await protect(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('Your account is not verified yet.');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });
  });

  describe('restrictTo', () => {
    const mockUser = { id: '1', role: Role.EMPLOYEE };

    beforeEach(() => {
      req.user = mockUser;
    });

    it('should allow access for matching role', () => {
      const middleware = restrictTo(Role.EMPLOYEE);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should allow access for multiple roles', () => {
      const middleware = restrictTo(Role.EMPLOYEE, Role.EMPLOYER);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should deny access for non-matching role', () => {
      const middleware = restrictTo(Role.ADMIN);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('You do not have permission to perform this action');
      expect(next.mock.calls[0][0].statusCode).toBe(403);
    });

    it('should handle missing user', () => {
      req.user = undefined;
      const middleware = restrictTo(Role.EMPLOYEE);
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      expect(next.mock.calls[0][0].message).toBe('You are not logged in');
      expect(next.mock.calls[0][0].statusCode).toBe(401);
    });
  });

  describe('ensureAuth', () => {
    it('should return user if authenticated', () => {
      const mockUser = { id: '1', role: Role.EMPLOYEE };
      req.user = mockUser;

      expect(() => ensureAuth(req as Request)).not.toThrow();
      expect(ensureAuth(req as Request)).toEqual(mockUser);
    });

    it('should throw error if not authenticated', () => {
      expect(() => ensureAuth(req as Request)).toThrow(AppError);
      expect(() => ensureAuth(req as Request)).toThrow('You are not logged in');
    });
  });
}); 