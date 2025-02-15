import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useQueryClient } from '@tanstack/react-query';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'EMPLOYER' | 'EMPLOYEE';
  phone?: string;
  address?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string, userType: 'employee' | 'employer') => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Set up axios interceptor for authentication
  useEffect(() => {
    const interceptor = axios.interceptors.request.use(
      (config) => {
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [token]);

  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`
            }
          });
          setUser(response.data.data.user);
          setToken(storedToken);
        } catch (error) {
          console.error('Auth initialization error:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const login = async (email: string, password: string, userType: 'employee' | 'employer') => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password,
      });

      const { token: newToken, user: userData } = response.data.data;

      // Verify user type matches
      if (
        (userType === 'employee' && userData.role !== 'EMPLOYEE') ||
        (userType === 'employer' && !['EMPLOYER', 'ADMIN'].includes(userData.role))
      ) {
        throw new Error('Invalid user type');
      }

      localStorage.setItem('token', newToken);
      setToken(newToken);
      setUser(userData);

      // Redirect based on role
      if (userData.role === 'EMPLOYEE') {
        navigate('/employee');
      } else {
        navigate('/employer');
      }
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    // Clear all React Query cache
    queryClient.clear();
    navigate('/');
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 