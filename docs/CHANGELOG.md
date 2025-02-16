# Changelog

All notable changes to the Moving Company Management System will be documented in this file.

## 17.02.2025

### Security & Type Safety
- Improved type safety in authentication middleware with `ensureAuth` utility
- Fixed TypeScript errors in request user handling
- Added proper typing for raw SQL queries in analytics
- Enhanced shift creation with required job ID validation

### Code Quality
- Refactored route handlers to use type-safe authentication checks
- Improved error handling in user authentication
- Added validation for shift-job relationships
- Enhanced code documentation and type definitions


## 16.02.2025

### Added
- Role-based access control with three user types: Admin, Employer, and Employee
- JWT authentication with refresh tokens
- Employee verification workflow
- Real-time job status updates
- Shift tracking with break management
- Photo upload for job documentation
- Customer signature capture
- Expense tracking
- Location tracking
- Automated notifications
- Dashboard analytics for employers and employees
- Job management system
- Shift scheduling and tracking
- Financial reporting
- Employee management system

### Security
- Password hashing with bcrypt
- JWT-based authentication
- Rate limiting on sensitive endpoints
- Protected routes with role-based access
- Secure password storage
- Input validation with Zod

### Technical
- React 18 with TypeScript frontend
- Node.js with Express backend
- PostgreSQL database with Prisma ORM
- Docker containerization
- TanStack Query for data fetching
- Tailwind CSS with shadcn/ui components
- Comprehensive API documentation
- End-to-end type safety
- Automated database migrations
- Seed data for development
