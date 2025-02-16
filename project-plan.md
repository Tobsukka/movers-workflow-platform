# Moving Company Management System Development Prompt


## Tech Stack
- Frontend: React with TypeScript
- Backend: Node.js with Express
- Database: PostgreSQL with Prisma ORM
- Authentication: JWT
- Styling: Tailwind CSS with shadcn/ui components

## Core Features

### Authentication System
- Separate authentication flows for employees and employers
- Employee self-registration at '/register/employee'
- Employer registration only through admin at '/register/employer'
- Separate login pages:
  - Employee login at '/login/employee'
  - Employer login at '/login/employer'
- JWT token management with refresh tokens
- Role-based route protection

### Employer Dashboard
- View all employees and their current status
- Create and manage moving jobs
- Track employee locations
- View analytics and statistics
- Manage employee shifts

### Employee Portal
- View available jobs
- Accept/reject job assignments
- Update availability
- Track work hours
- View personal statistics

## Database Schema

```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  password      String
  name          String
  role          Role      @default(EMPLOYEE)
  phone         String?
  address       String?
  jobs          Job[]    
  shifts        Shift[]
  verified      Boolean   @default(false)  // For employee verification by employer
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Job {
  id            String    @id @default(cuid())
  title         String
  description   String
  status        JobStatus
  location      String
  date          DateTime
  employees     User[]    
  requirements  String[]
  price         Float
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}

model Shift {
  id            String    @id @default(cuid())
  employee      User      @relation(fields: [employeeId], references: [id])
  employeeId    String
  startTime     DateTime
  endTime       DateTime
  status        ShiftStatus
  location      String?
}

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

## API Endpoints

### Authentication
- POST /api/auth/employee/register
- POST /api/auth/employer/register (admin only)
- POST /api/auth/employee/login
- POST /api/auth/employer/login
- POST /api/auth/refresh-token
- POST /api/auth/logout

### Users
- GET /api/users
- GET /api/users/:id
- PUT /api/users/:id
- DELETE /api/users/:id
- POST /api/users/verify/:id (employer only)

### Jobs
- GET /api/jobs
- POST /api/jobs
- GET /api/jobs/:id
- PUT /api/jobs/:id
- DELETE /api/jobs/:id
- POST /api/jobs/:id/assign
- POST /api/jobs/:id/status

### Shifts
- GET /api/shifts
- POST /api/shifts
- PUT /api/shifts/:id
- DELETE /api/shifts/:id

## Frontend Requirements

### Authentication Components
1. Employee Registration:
   - Route: /register/employee
   - Form fields:
     - Name
     - Email
     - Password
     - Phone
     - Address
   - Success message indicating pending employer verification

2. Employer Registration (Admin only):
   - Route: /register/employer
   - Protected by admin authentication
   - Form fields:
     - Company Name
     - Admin Name
     - Email
     - Password
     - Phone
     - Business Address

3. Employee Login:
   - Route: /login/employee
   - Form fields:
     - Email
     - Password
   - Verification check before login

4. Employer Login:
   - Route: /login/employer
   - Form fields:
     - Email
     - Password

### Layout Components
1. Public Layout:
   - Simple navbar with login/register options
   - Footer

2. Authenticated Layout:
   - Role-specific navigation
   - Sidebar
   - User profile dropdown

### Dashboard Components
1. Employer Dashboard:
   - Employee List with verification controls
   - Job Management
   - Analytics Dashboard
   - Shift Calendar

2. Employee Portal:
   - Available Jobs
   - My Schedule
   - Profile Settings

### State Management
- Use React Query for server state
- Implement Context API for auth state
- Use local storage for persistent auth

### UI/UX Requirements
- Responsive design for all screen sizes
- Loading states for async operations
- Error handling and user feedback
- Form validation
- Dark/light mode support

## Additional Requirements

1. Security:
   - Input validation
   - XSS protection
   - CSRF protection
   - Rate limiting
   - Password hashing
   - Role-based route protection

2. Performance:
   - Implement caching where appropriate
   - Optimize database queries
   - Lazy loading for routes

3. Error Handling:
   - Global error boundary
   - API error handling
   - Form validation errors
   - Network error handling
   - Unauthorized access handling

4. Authentication Flow:
   - Employee registration requires employer verification
   - Failed verification message on login attempt
   - Role-specific redirects after login
   - Protected route middleware for role checking

Please generate the code following best practices, including:
- TypeScript types for all components and functions
- Error handling
- Loading states
- Form validation
- Protected routes
- Responsive design
- Clean code architecture
- Comments for complex logic