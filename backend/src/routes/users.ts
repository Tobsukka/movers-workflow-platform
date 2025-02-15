import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { protect, restrictTo } from '../middleware/auth';
import { AppError } from '../middleware/errorHandler';

const router = Router();
const prisma = new PrismaClient();

// Get current user
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user?.id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        verified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Validation schemas
const updateUserSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
});

// Get all users (employer only)
router.get('/', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        verified: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        users,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Get user by ID
router.get('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Users can only access their own data unless they are employers
    if (req.user?.role === 'EMPLOYEE' && req.user.id !== id) {
      throw new AppError('You do not have permission to perform this action', 403);
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        verified: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError('User not found', 404);
    }

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.put('/:id', protect, async (req, res, next) => {
  try {
    const { id } = req.params;

    // Users can only update their own data
    if (req.user?.id !== id) {
      throw new AppError('You do not have permission to perform this action', 403);
    }

    const data = updateUserSchema.parse(req.body);

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        phone: true,
        address: true,
        verified: true,
        createdAt: true,
      },
    });

    res.status(200).json({
      status: 'success',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Verify user (employer only)
router.post('/:id/verify', protect, restrictTo('EMPLOYER', 'ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await prisma.user.update({
      where: { id },
      data: {
        verified: true,
      },
    });

    res.status(200).json({
      status: 'success',
      message: 'User verified successfully',
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (admin only)
router.delete('/:id', protect, restrictTo('ADMIN'), async (req, res, next) => {
  try {
    const { id } = req.params;

    await prisma.user.delete({
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

export default router; 