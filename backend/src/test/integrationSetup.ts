import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

// Create a new instance of PrismaClient for integration tests
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5433/management_test'
    }
  }
});

beforeAll(async () => {
  // Set up test environment variables
  process.env.JWT_SECRET = 'test-jwt-secret';
  process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret';
  
  try {
    // Run migrations
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: 'postgresql://postgres:postgres@localhost:5433/management_test'
      }
    });
  } catch (error) {
    console.error('Error setting up test database:', error);
    throw error;
  }
});

beforeEach(async () => {
  // Clean all tables before each test
  try {
    // Delete in correct order due to foreign key constraints
    await prisma.shift.deleteMany();
    await prisma.job.deleteMany();
    await prisma.user.deleteMany();
  } catch (error) {
    console.warn('Warning: Error during table cleanup:', error);
  }
});

afterAll(async () => {
  // Clean up and disconnect from the database
  await prisma.$disconnect();
});

export { prisma }; 