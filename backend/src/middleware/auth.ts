import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { AppError } from './errorHandler';

const prisma = new PrismaClient();

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

// Utility function to ensure request has authenticated user
export const ensureAuth = (req: Request): NonNullable<Request['user']> => {
  if (!req.user) {
    throw new AppError('You are not logged in', 401);
  }
  return req.user;
};

export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 1) Get token from cookie or authorization header (for backwards compatibility)
    let token = req.cookies.access_token;
    
    // If no cookie token, try to get from Authorization header
    if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new AppError('You are not logged in. Please log in to get access.', 401);
    }

    // 2) Verify token
    let decoded;
    try {
      decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'your-secret-key'
      ) as {
        id: string;
        role: string;
      };
    } catch (err) {
      // Clear invalid cookies
      res.clearCookie('access_token');
      res.clearCookie('refresh_token');
      throw new AppError('Invalid token. Please log in again.', 401);
    }

    // 3) Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        role: true,
        verified: true,
      },
    });

    if (!user) {
      throw new AppError('The user belonging to this token no longer exists.', 401);
    }

    // 4) If user is an employee, check if verified
    if (user.role === 'EMPLOYEE' && !user.verified) {
      throw new AppError('Your account is not verified yet.', 403);
    }

    // 5) Add user to request
    req.user = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

export const restrictTo = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('You are not logged in', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };
}; 