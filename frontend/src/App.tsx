import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { AuthProvider } from './contexts/AuthContext';
import PublicLayout from './layouts/PublicLayout';
import EmployerLayout from './layouts/EmployerLayout';
import EmployeeLayout from './layouts/EmployeeLayout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Login from './pages/auth/Login';
import EmployeeRegister from './pages/auth/EmployeeRegister';
import EmployerRegister from './pages/auth/EmployerRegister';
import EmployerDashboard from './pages/employer/Dashboard';
import EmployeeDashboard from './pages/employee/Dashboard';
import NotFound from './pages/NotFound';
import Jobs from './pages/employer/Jobs';
import EmployeeJobs from './pages/employee/Jobs';
import JobHistory from './pages/employee/JobHistory';
import Employees from './pages/employer/Employees';
import Shifts from './pages/employer/Shifts';
import MyShifts from './pages/employer/MyShifts';
import Analytics from './pages/employer/Analytics';
import EmployeeShifts from './pages/employee/Shifts';
import Profile from './pages/employee/Profile';
import EmployerJobHistory from './pages/employer/JobHistory';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AuthProvider>
          <Routes>
            {/* Public Routes */}
            <Route element={<PublicLayout />}>
              <Route path="/login/employee" element={<Login userType="employee" />} />
              <Route path="/login/employer" element={<Login userType="employer" />} />
              <Route path="/register/employee" element={<EmployeeRegister />} />
              <Route path="/register/employer" element={<EmployerRegister />} />
            </Route>

            {/* Employer Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['EMPLOYER', 'ADMIN']}>
                  <EmployerLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/employer" element={<EmployerDashboard />} />
              <Route path="/employer/employees" element={<Employees />} />
              <Route path="/employer/jobs" element={<Jobs />} />
              <Route path="/employer/history" element={<EmployerJobHistory />} />
              <Route path="/employer/shifts" element={<Shifts />} />
              <Route path="/employer/my-shifts" element={<MyShifts />} />
              <Route path="/employer/analytics" element={<Analytics />} />
            </Route>

            {/* Employee Routes */}
            <Route
              element={
                <ProtectedRoute allowedRoles={['EMPLOYEE']}>
                  <EmployeeLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/employee" element={<EmployeeDashboard />} />
              <Route path="/employee/jobs" element={<EmployeeJobs />} />
              <Route path="/employee/history" element={<JobHistory />} />
              <Route path="/employee/shifts" element={<EmployeeShifts />} />
              <Route path="/employee/profile" element={<Profile />} />
            </Route>

            {/* Redirect root to appropriate dashboard */}
            <Route path="/" element={<Navigate to="/login/employee" />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
      <ReactQueryDevtools />
    </QueryClientProvider>
  );
}

export default App;
