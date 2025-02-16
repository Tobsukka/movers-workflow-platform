import request from 'supertest';
import { app } from '../../../index';
import { prisma } from '../../../test/integrationSetup';
import { Role } from '@prisma/client';

describe('Auth Integration Tests', () => {
  describe('POST /api/auth/employee/register', () => {
    const validEmployeeData = {
      email: 'employee@test.com',
      password: 'password123',
      name: 'Test Employee',
      phone: '1234567890',
    };

    it('should register a new employee successfully', async () => {
      const response = await request(app)
        .post('/api/auth/employee/register')
        .send(validEmployeeData);

      console.log('Registration Response:', response.body);

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        status: 'success',
        message: 'Registration successful. Please wait for employer verification.',
      });

      // Verify user was created in database
      const user = await prisma.user.findUnique({
        where: { email: validEmployeeData.email },
      });
      expect(user).toBeTruthy();
      expect(user?.role).toBe(Role.EMPLOYEE);
      expect(user?.verified).toBe(false);
    });

    it('should not allow duplicate email registration', async () => {
      // First registration
      await request(app)
        .post('/api/auth/employee/register')
        .send(validEmployeeData);

      // Attempt duplicate registration
      const response = await request(app)
        .post('/api/auth/employee/register')
        .send(validEmployeeData);

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        status: 'fail',
        message: 'Email already exists',
      });
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Create a test user before each login test
      await request(app)
        .post('/api/auth/employee/register')
        .send({
          email: 'test@example.com',
          password: 'password123',
          name: 'Test User',
          phone: '1234567890',
        });

      // Verify the user
      await prisma.user.update({
        where: { email: 'test@example.com' },
        data: { verified: true },
      });
    });

    it('should login successfully with valid credentials', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('refreshToken');
      expect(response.body.data.user).toHaveProperty('email', 'test@example.com');
    });

    it('should not login with incorrect password', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'wrongpassword',
        });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        status: 'fail',
        message: 'Invalid email or password',
      });
    });

    it('should not login unverified employee', async () => {
      // Create an unverified user
      await request(app)
        .post('/api/auth/employee/register')
        .send({
          email: 'unverified@example.com',
          password: 'password123',
          name: 'Unverified User',
          phone: '1234567890',
        });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'unverified@example.com',
          password: 'password123',
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        status: 'fail',
        message: 'Account not verified by employer',
      });
    });
  });
}); 