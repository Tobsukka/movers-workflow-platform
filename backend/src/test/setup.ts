import { PrismaClient } from '@prisma/client';
import { mockDeep, mockReset, DeepMockProxy } from 'jest-mock-extended';

// Mock PrismaClient
const mockPrisma = {
  user: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  job: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  shift: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

// Create a type-safe mock
type MockPrisma = {
  [K in keyof typeof mockPrisma]: {
    [M in keyof typeof mockPrisma[K]]: jest.Mock;
  };
};

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn(() => mockPrisma),
  Role: {
    ADMIN: 'ADMIN',
    EMPLOYER: 'EMPLOYER',
    EMPLOYEE: 'EMPLOYEE',
  },
  JobStatus: {
    AVAILABLE: 'AVAILABLE',
    ASSIGNED: 'ASSIGNED',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
  },
}));

// Mock bcryptjs
jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
}));

// Mock jsonwebtoken
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn().mockReturnValue('mock-token'),
  verify: jest.fn().mockReturnValue({ id: 'mock-user-id', role: 'EMPLOYEE' }),
}));

// Mock Express Router
jest.mock('express', () => {
  const mockRouter = {
    post: jest.fn().mockReturnThis(),
    get: jest.fn().mockReturnThis(),
    put: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
  };
  const mockExpress = jest.requireActual('express');
  return {
    ...mockExpress,
    Router: jest.fn(() => mockRouter),
  };
});

// Export the mock Prisma client
export const prismaMock = mockPrisma as unknown as MockPrisma;

beforeEach(() => {
  // Reset all mocks
  jest.clearAllMocks();
  Object.values(mockPrisma).forEach(model => {
    Object.values(model).forEach(method => {
      (method as jest.Mock).mockReset();
    });
  });
});

// Global test setup
beforeAll(() => {
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
});

// Global test teardown
afterAll(() => {
  jest.clearAllMocks();
}); 