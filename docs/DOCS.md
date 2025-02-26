# Moving Company Management System Documentation

## Table of Contents
1. [API Documentation](#api-documentation)
   - [Authentication](#authentication)
   - [Users](#users)
   - [Jobs](#jobs)
   - [Shifts](#shifts)
   - [Analytics](#analytics)
2. [Database Schema](#database-schema)
   - [Models](#models)
   - [Relationships](#relationships)
   - [Enums](#enums)
3. [Security Features](#security-features)
   - [Authentication](#authentication-security)
   - [Authorization](#authorization)
   - [Data Protection](#data-protection)
   - [CSRF Protection](#csrf-protection)
4. [Testing](#testing)
   - [Unit Tests](#unit-tests)
   - [Integration Tests](#integration-tests)
   - [E2E Tests](#e2e-tests)
5. [Development](#development)
   - [Prerequisites](#prerequisites)
   - [Setup](#setup)
   - [Available Scripts](#available-scripts)
   - [Environment Variables](#environment-variables)
6. [Deployment](#deployment)
   - [Docker Deployment](#docker-deployment)
   - [Production Considerations](#production-considerations)
7. [Architecture](#architecture)
   - [Frontend](#frontend-architecture)
   - [Backend](#backend-architecture)
   - [Database](#database-architecture)

## API Documentation

### Authentication

#### POST /api/auth/employee/register
Register a new employee account.

Request:
```json
{
  "email": "employee@example.com",
  "password": "password123",
  "name": "John Doe",
  "phone": "1234567890",
  "address": "123 Main St"
}
```

Response (201):
```json
{
  "status": "success",
  "message": "Registration successful. Please wait for employer verification."
}
```

#### POST /api/auth/employer/register
Register a new employer account (admin only).

Request:
```json
{
  "email": "employer@example.com",
  "password": "password123",
  "name": "Moving Company Inc",
  "phone": "1234567890",
  "address": "456 Business Ave"
}
```

Response (201):
```json
{
  "status": "success",
  "message": "Employer registration successful"
}
```

#### POST /api/auth/login
Authenticate a user and receive JWT tokens.

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response (200):
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbG...",
    "refreshToken": "eyJhbG...",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "EMPLOYEE"
    }
  }
}
```

#### POST /api/auth/refresh-token
Refresh an expired JWT token.

Request:
```json
{
  "refreshToken": "eyJhbG..."
}
```

Response (200):
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbG..."
  }
}
```

### Users

#### GET /api/users/me
Get current user's profile.

Response (200):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "User Name",
      "role": "EMPLOYEE",
      "phone": "1234567890",
      "address": "123 Main St",
      "verified": true,
      "createdAt": "2024-02-15T16:49:10.000Z"
    }
  }
}
```

#### PUT /api/users/:id
Update user profile.

Request:
```json
{
  "name": "Updated Name",
  "phone": "9876543210",
  "address": "789 New St"
}
```

Response (200):
```json
{
  "status": "success",
  "data": {
    "user": {
      "id": "user_id",
      "name": "Updated Name",
      "phone": "9876543210",
      "address": "789 New St"
    }
  }
}
```

### Jobs

#### GET /api/jobs
Get all jobs with optional filters.

Query Parameters:
- status: Filter by job status (AVAILABLE, ASSIGNED, IN_PROGRESS, COMPLETED, CANCELLED)
- search: Search in title and description
- fromDate: Filter jobs from date
- toDate: Filter jobs to date

Response (200):
```json
{
  "status": "success",
  "data": {
    "jobs": [
      {
        "id": "job_id",
        "title": "Office Move",
        "description": "Moving office equipment",
        "status": "AVAILABLE",
        "pickupLocation": "123 Old Office",
        "deliveryLocation": "456 New Office",
        "date": "2024-03-01T09:00:00Z",
        "estimatedHours": 4,
        "numberOfMovers": 2,
        "items": ["Desks", "Chairs", "Electronics"],
        "price": 480,
        "employees": []
      }
    ]
  }
}
```

#### POST /api/jobs
Create a new job.

Request:
```json
{
  "title": "Apartment Move",
  "description": "2 bedroom apartment move",
  "pickupLocation": "123 Old St",
  "deliveryLocation": "456 New St",
  "date": "2024-03-01T09:00:00Z",
  "estimatedHours": 4,
  "numberOfMovers": 2,
  "items": ["Furniture", "Boxes"],
  "specialRequirements": "Piano moving required",
  "customerName": "John Smith",
  "customerPhone": "1234567890",
  "customerEmail": "john@example.com",
  "floorNumber": 3,
  "hasElevator": true,
  "price": 480
}
```

Response (201):
```json
{
  "status": "success",
  "data": {
    "job": {
      "id": "job_id",
      "title": "Apartment Move",
      // ... other job details
    }
  }
}
```

### Shifts

#### GET /api/shifts
Get all shifts with optional filters.

Query Parameters:
- status: Filter by shift status (SCHEDULED, ACTIVE, COMPLETED, CANCELLED)
- fromDate: Filter shifts from date
- toDate: Filter shifts to date
- employeeId: Filter by employee

Response (200):
```json
{
  "status": "success",
  "data": {
    "shifts": [
      {
        "id": "shift_id",
        "employeeId": "employee_id",
        "jobId": "job_id",
        "startTime": "2024-03-01T09:00:00Z",
        "endTime": "2024-03-01T13:00:00Z",
        "status": "SCHEDULED",
        "location": "123 Main St",
        "breakMinutes": 30
      }
    ]
  }
}
```

### Analytics

#### GET /api/analytics/dashboard
Get dashboard statistics based on user role.

Response for Employers (200):
```json
{
  "status": "success",
  "data": {
    "activeEmployees": 5,
    "activeJobs": 3,
    "todayShifts": 2,
    "pendingApprovals": 1,
    "recentActivity": [
      {
        "id": "activity_id",
        "type": "JOB_CREATED",
        "message": "New job created: Office Move",
        "timestamp": "2024-02-15T16:49:10.000Z"
      }
    ],
    "upcomingJobs": [
      {
        "id": "job_id",
        "title": "Apartment Move",
        "date": "2024-03-01T09:00:00Z",
        "location": "123 Main St"
      }
    ]
  }
}
```

## Database Schema

### Models

#### User
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(EMPLOYEE)
  phone         String?
  address       String?
  jobs          Job[]     @relation("JobEmployees")
  shifts        Shift[]
  verified      Boolean   @default(false)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

#### Job
```prisma
model Job {
  id                String    @id @default(cuid())
  title             String
  description       String
  status            JobStatus
  pickupLocation    String
  deliveryLocation  String
  date              DateTime
  estimatedHours    Int
  numberOfMovers    Int
  items             String[]
  specialRequirements String?
  customerName      String
  customerPhone     String
  customerEmail     String?
  floorNumber       Int?
  hasElevator       Boolean   @default(false)
  employees         User[]    @relation("JobEmployees")
  shifts           Shift[]
  price             Float
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
}
```

#### Shift
```prisma
model Shift {
  id                String         @id @default(cuid())
  employee          User           @relation(fields: [employeeId], references: [id])
  employeeId        String
  job               Job            @relation(fields: [jobId], references: [id])
  jobId             String
  startTime         DateTime
  endTime           DateTime
  status            ShiftStatus    @default(SCHEDULED)
  location          String?
  notes             String?
  challenges        String?
  customerSignature String?
  photos            String[]       @default([])
  breakMinutes      Int            @default(0)
  additionalExpenses Json?
  createdAt         DateTime       @default(now())
  updatedAt         DateTime       @updatedAt

  @@index([employeeId])
  @@index([jobId])
}
```

### Enums

```prisma
enum Role {
  ADMIN
  EMPLOYER
  EMPLOYEE
}

enum JobStatus {
  AVAILABLE
  ASSIGNED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum ShiftStatus {
  SCHEDULED
  ACTIVE
  COMPLETED
  CANCELLED
}
```

## Security Features

Our application implements a multi-layered security approach with several key components:

### Authentication Security

#### HttpOnly Cookie Authentication
```typescript
// Set secure HttpOnly cookies for authentication tokens
res.cookie('access_token', token, {
  httpOnly: true,                // Inaccessible to JavaScript
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 24 * 60 * 60 * 1000,   // 1 day
  path: '/'
});

// Separate refresh token cookie
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  path: '/'
});
```

#### Token Validation
```typescript
// Get token from cookie or authorization header (for backwards compatibility)
let token = req.cookies.access_token;
    
// Fallback to Authorization header
if (!token && req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
  token = req.headers.authorization.split(' ')[1];
}

// JWT verification with proper error handling
try {
  decoded = jwt.verify(token, process.env.JWT_SECRET);
} catch (err) {
  // Clear invalid cookies
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  throw new AppError('Invalid token. Please log in again.', 401);
}
```

#### Secure Logout
```typescript
// Logout route to invalidate all tokens
router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token');
  
  res.status(200).json({
    status: 'success',
    message: 'Logged out successfully'
  });
});
```

#### Additional Features
- JWT-based authentication with access and refresh tokens
- Password hashing using bcrypt with salt rounds of 12
- Token expiration and rotation
- Rate limiting on authentication endpoints (30 attempts per hour)
- Secure password requirements

### CSRF Protection

The system implements a simplified and robust double-submit cookie pattern for CSRF protection.

#### Token Generation and Verification
```typescript
// Generate random token
const token = crypto.randomBytes(32).toString('hex');

// Set it as a cookie
res.cookie('XSRF-TOKEN', token, {
  httpOnly: false,  // Must be false so frontend JS can read it
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 7200000,  // 2 hours
  path: '/'
});

// Store in session for verification
req.session.csrfToken = token;

// Verification middleware
app.use((req, res, next) => {
  // Skip for excluded paths and non-mutating methods
  if (excludedPaths.includes(req.path) || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get tokens from header and cookie
  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies['XSRF-TOKEN'];
  
  // Validate token match
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({
      status: 'error',
      message: 'Invalid CSRF token',
      code: 'CSRF_ERROR'
    });
  }
  
  next();
});
```

#### Frontend Implementation
```typescript
// Axios interceptor to add CSRF token to requests
axios.interceptors.request.use(async (config) => {
  const csrfToken = document.cookie
    .split('; ')
    .find(row => row.startsWith('XSRF-TOKEN='))
    ?.split('=')[1];

  if (csrfToken) {
    // Decode and set the token in the header
    const decodedToken = decodeURIComponent(csrfToken);
    config.headers['X-CSRF-Token'] = decodedToken;
  }
  return config;
});
```

### Request Signing for Critical Operations

#### Server-Side Implementation
```typescript
// Generate a signature for request data
export const generateSignature = (payload: string, secret: string): string => {
  return crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

// Middleware to verify request signatures
export const verifyRequestSignature = (req, res, next) => {
  // Get signature and timestamp from headers
  const signature = req.headers['x-signature'];
  const timestamp = req.headers['x-timestamp'];
  
  // Verify timestamp freshness (prevent replay attacks)
  const requestTime = parseInt(timestamp, 10);
  const currentTime = Date.now();
  
  if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > MAX_TIMESTAMP_DIFF) {
    return next(new AppError('Request signature verification failed: Timestamp expired', 403));
  }
  
  // Create the payload string
  let payload = `${req.method}:${req.originalUrl}:${timestamp}`;
  if (req.method !== 'GET' && req.body) {
    payload += `:${JSON.stringify(req.body)}`;
  }
  
  // Verify signature
  const expectedSignature = generateSignature(payload, secret);
  if (signature !== expectedSignature) {
    return next(new AppError('Request signature verification failed: Invalid signature', 403));
  }
  
  next();
};
```

#### Client-Side Implementation
```typescript
// Generate signing headers
export const signRequest = (method, path, body) => {
  const timestamp = Date.now().toString();
  let payload = `${method}:${path}:${timestamp}`;
  
  if (method !== 'GET' && body) {
    payload += `:${JSON.stringify(body)}`;
  }
  
  const signature = generateSignature(payload, secret);
  
  return {
    'X-Timestamp': timestamp,
    'X-Signature': signature
  };
};

// Enhanced API client with automatic signing
const api = {
  post: async (url, data, config) => {
    // Apply request signing for sensitive operations
    if (needsSigning(url, 'POST')) {
      config = addSigningHeaders({
        ...config,
        method: 'POST',
        url,
        data
      });
    }
    
    return axios.post(url, data, config);
  }
  // ... similar for other methods
};
```

### Advanced Security Headers

#### Content Security Policy
```typescript
contentSecurityPolicy: {
  directives: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "blob:"],
    connectSrc: ["'self'"],
    fontSrc: ["'self'", "data:"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'"],      // Restrict worker scripts
    manifestSrc: ["'self'"],    // Restrict manifest files
    formAction: ["'self'"],     // Restrict form targets
    baseUri: ["'self'"],        // Restrict base URIs
  }
}
```

#### Permissions Policy
```typescript
// Comprehensive permissions policy
app.use((req, res, next) => {
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), ' +
    'magnetometer=(), microphone=(), payment=(), usb=(), ' +
    'interest-cohort=(), autoplay=(), encrypted-media=self, ' +
    'picture-in-picture=(), fullscreen=(self)'
  );
  next();
});
```

### Authorization
- Role-based access control (RBAC)
- Route protection middleware
- Resource ownership validation
- Employee verification workflow with cryptographic signing

### Data Protection
- CORS protection with whitelisted origins
- Helmet security headers
- Input validation using Zod
- SQL injection protection via Prisma
- XSS protection
- Rate limiting on API endpoints:
  - General API: 60 req/minute with IP-based tracking
  - Authentication: 30 req/hour with combined IP + email tracking
  - Sensitive operations: 50 req/hour with user-based tracking

## Development

### Prerequisites
- Node.js >= 18.0.0
- Docker and Docker Compose
- PostgreSQL >= 14.0
- npm or yarn
- Git

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/moving-company-management.git
cd moving-company-management
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Backend (.env):
```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/moving_company"

# Server
PORT=5000
NODE_ENV="development"

PORT=5000
JWT_SECRET="your-super-secret-jwt-key"
JWT_REFRESH_SECRET="your-super-secret-refresh-key"
NODE_ENV="development"
FRONTEND_URL="http://localhost:5173"

# Cookie Settings
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
CSRF_COOKIE_NAME=XSRF-TOKEN
SESSION_SECRET=your-session-secret-key


# Production Only
COOKIE_SECURE=true                      # Force HTTPS in production

```

Frontend (.env):
```env
VITE_API_URL=http://localhost:5000
```

4. Start development environment:
```bash
npm run dev
```

### Available Scripts

Root:
```json
{
  "docker:up": "Start Docker containers",
  "docker:down": "Stop Docker containers",
  "prisma:generate": "Generate Prisma client",
  "prisma:migrate": "Run database migrations",
  "prisma:seed": "Seed the database",
  "dev": "Start development servers",
  "build": "Build for production",
  "test": "Run tests"
}
```

Backend:
```json
{
  "dev": "Start backend development server",
  "build": "Build backend for production",
  "start": "Start production server",
  "test": "Run backend tests"
}
```

Frontend:
```json
{
  "dev": "Start frontend development server",
  "build": "Build frontend for production",
  "preview": "Preview production build",
  "test": "Run frontend tests"
}
```

## Deployment

### Docker Deployment

1. Build images:
```bash
docker-compose build
```

2. Start services:
```bash
docker-compose up -d
```

3. Initialize database:
```bash
docker-compose exec backend npm run prisma:migrate
docker-compose exec backend npm run prisma:seed
```

## Architecture

### Frontend Architecture

1. State Management:
   - React Query for server state
   - Context API for global state
   - Local state for component-specific data

2. Routing:
   - React Router v6
   - Protected routes
   - Role-based access

3. Components:
   - Reusable UI components
   - Layout components
   - Feature-specific components

4. Styling:
   - Tailwind CSS
   - shadcn/ui components
   - Responsive design

### Backend Architecture

1. API Structure:
   - Express.js routes
   - Controller layer
   - Service layer
   - Data access layer

2. Middleware:
   - Authentication
   - Error handling
   - Request validation
   - Rate limiting

3. Database:
   - Prisma ORM
   - PostgreSQL
   - Migrations
   - Seeding

4. Security:
   - JWT authentication
   - Role-based authorization
   - Input validation
   - Error handling 