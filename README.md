# Moving Company Management System

A full-stack web application for managing moving company operations, including employee management, job assignments, shift scheduling, and real-time analytics. Built with modern technologies and best practices for security and scalability.

![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)
![PostgreSQL](https://img.shields.io/badge/postgresql-%3E%3D14.0-blue)

## 🚀 Features

### Authentication & Authorization
- Role-based access control (Admin, Employer, Employee)
- JWT authentication with refresh tokens
- Secure password hashing with bcrypt
- Employee verification workflow

### Employer Dashboard
- Real-time analytics and statistics
- Employee management and verification
- Job creation and assignment
- Shift scheduling and tracking
- Financial reporting
- Job history and completion tracking

### Employee Portal
- Job browsing and application
- Shift management
- Work hour tracking
- Performance metrics
- Profile management
- Job history

### Core Functionality
- Real-time job status updates
- Shift tracking with break management
- Photo upload for job documentation
- Customer signature capture
- Expense tracking
- Location tracking
- Automated notifications

## 🛠️ Tech Stack

### Frontend
- React 18 with TypeScript
- TanStack Query (React Query) for data fetching
- Tailwind CSS with shadcn/ui components
- Zod for form validation
- React Router for navigation
- Axios for API requests

### Backend
- Node.js with Express
- TypeScript for type safety
- PostgreSQL database
- Prisma ORM
- JWT for authentication
- Zod for request validation

### DevOps & Tools
- Docker for containerization
- Docker Compose for local development
- pgAdmin for database management
- ESLint for code quality
- Jest for testing

## 📋 Prerequisites

- Node.js >= 18.0.0
- Docker and Docker Compose
- npm or yarn
- Git

## 🚀 Quick Start

1. **Clone and Install**
   ```bash
   git clone https://github.com/yourusername/moving-company-management.git
   cd moving-company-management
   npm install
   ```

2. **Start Development Environment**
   ```bash
   npm run dev
   ```

3. **Access the Application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - pgAdmin: http://localhost:5050

For detailed setup instructions, API documentation, and deployment guides, see [DOCS.md](DOCS.md).
