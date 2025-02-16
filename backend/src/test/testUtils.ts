import { Role, JobStatus } from '@prisma/client';

export type MockUser = {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
  phone: string | null;
  address: string | null;
  verified: boolean;
  lastPasswordChange: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type MockUserSelect = {
  id: string;
  role: Role;
  verified: boolean;
};

export type MockJob = {
  id: string;
  title: string;
  description: string;
  status: JobStatus;
  pickupLocation: string;
  deliveryLocation: string;
  date: Date;
  estimatedHours: number;
  numberOfMovers: number;
  items: string[];
  specialRequirements: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  floorNumber: number | null;
  hasElevator: boolean;
  price: number;
  employees?: MockUser[];
  createdAt: Date;
  updatedAt: Date;
};

export type MockShift = {
  id: string;
  jobId: string;
  employeeId: string;
  startTime: Date;
  endTime: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  hoursWorked: number | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  job?: MockJob;
  employee?: MockUser;
};

export const createMockUser = (overrides: Partial<MockUser> = {}): MockUser => ({
  id: '1',
  email: 'test@example.com',
  password: 'hashedPassword',
  name: 'Test User',
  role: Role.EMPLOYEE,
  phone: null,
  address: null,
  verified: false,
  lastPasswordChange: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockUserSelect = (overrides: Partial<MockUserSelect> = {}): MockUserSelect => ({
  id: '1',
  role: Role.EMPLOYEE,
  verified: true,
  ...overrides,
});

export const createMockJob = (overrides: Partial<MockJob> = {}): MockJob => ({
  id: '1',
  title: 'Test Move',
  description: 'Moving a 2-bedroom apartment',
  status: JobStatus.AVAILABLE,
  pickupLocation: '123 Start St',
  deliveryLocation: '456 End Ave',
  date: new Date('2025-03-01T10:00:00Z'),
  estimatedHours: 4,
  numberOfMovers: 2,
  items: ['Sofa', 'Bed', 'Dining Table'],
  specialRequirements: null,
  customerName: 'John Doe',
  customerPhone: '1234567890',
  customerEmail: 'john@example.com',
  floorNumber: 2,
  hasElevator: true,
  price: 400,
  employees: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockShift = (overrides: Partial<MockShift> = {}): MockShift => ({
  id: '1',
  jobId: '1',
  employeeId: '1',
  startTime: new Date('2025-03-01T09:00:00Z'),
  endTime: new Date('2025-03-01T17:00:00Z'),
  status: 'SCHEDULED',
  hoursWorked: null,
  notes: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
}); 