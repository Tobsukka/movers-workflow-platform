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
    // Function to get the current token from localStorage
    const getToken = () => localStorage.getItem('token');

    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = getToken();
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Add response interceptor to handle 401 errors
    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Token is invalid or expired, logout the user
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, []); // Remove token dependency since we're now getting it directly from localStorage

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
      console.log('Attempting login with:', { email, userType });
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password,
      });

      console.log('Login response:', response.data);
      const { token: newToken, user: userData } = response.data.data;

      // Verify user type matches
      if (
        (userType === 'employee' && userData.role !== 'EMPLOYEE') ||
        (userType === 'employer' && !['EMPLOYER', 'ADMIN'].includes(userData.role))
      ) {
        console.error('User type mismatch:', { expected: userType, received: userData.role });
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
      console.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(error.response?.data?.message || 'An error occurred during login');
      }
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