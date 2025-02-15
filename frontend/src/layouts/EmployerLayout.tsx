import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Users,
  Briefcase,
  Calendar,
  BarChart,
  LogOut,
  Menu,
  X,
  LayoutDashboard,
  History,
} from 'lucide-react';
import { useState } from 'react';

const navigation = [
  { name: 'Dashboard', href: '/employer', icon: LayoutDashboard },
  { name: 'Employees', href: '/employer/employees', icon: Users },
  { name: 'Jobs', href: '/employer/jobs', icon: Briefcase },
  { name: 'Job History', href: '/employer/history', icon: History },
  { name: 'All Shifts', href: '/employer/shifts', icon: Calendar },
  { name: 'My Shifts', href: '/employer/my-shifts', icon: Calendar },
  { name: 'Analytics', href: '/employer/analytics', icon: BarChart },
];

const EmployerLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile menu button */}
      <button
        className="fixed top-4 right-4 z-50 md:hidden"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform bg-card transition-transform duration-200 ease-in-out md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="border-b px-4 py-6">
            <h1 className="text-2xl font-bold">Moving Company</h1>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-2 py-4">
            {navigation.map((item) => {
              const isActive = location.pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group flex items-center rounded-md px-2 py-2 text-sm font-medium ${
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* User menu */}
          <div className="border-t p-4">
            <div className="flex items-center">
              <div className="flex-1 truncate">
                <div className="text-sm font-medium">{user?.name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </div>
              </div>
              <button
                onClick={logout}
                className="ml-2 rounded-md p-2 hover:bg-accent hover:text-accent-foreground"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="md:pl-64">
        <main className="container mx-auto px-4 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default EmployerLayout; 