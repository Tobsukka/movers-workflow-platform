import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
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

  const logout = useCallback(() => {
    console.log('Logging out user');
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    queryClient.clear();
    navigate('/');
  }, [navigate, queryClient]);

  // Set up axios interceptor for authentication
  useEffect(() => {
    console.log('Setting up axios interceptors');
    const getToken = () => localStorage.getItem('token');

    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        const currentToken = getToken();
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        config.withCredentials = true;
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    const responseInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('Response interceptor error:', error);
        if (error.response?.status === 401) {
          logout();
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(requestInterceptor);
      axios.interceptors.response.eject(responseInterceptor);
    };
  }, [logout]);

  // Initialize authentication
  useEffect(() => {
    let mounted = true;
    
    const initializeAuth = async () => {
      console.log('Initializing auth...');
      const storedToken = localStorage.getItem('token');
      console.log('Stored token:', storedToken ? 'exists' : 'none');

      try {
        if (storedToken) {
          console.log('Fetching user data...');
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`
            },
            withCredentials: true
          });
          console.log('User data fetched:', response.data);
          
          if (mounted) {
            setUser(response.data.data.user);
            setToken(storedToken);
          }
        } else {
          console.log('No stored token found, proceeding without authentication');
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        localStorage.removeItem('token');
        if (mounted) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          console.log('Setting loading to false');
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = async (email: string, password: string, userType: 'employee' | 'employer') => {
    try {
      console.log('Attempting login with:', { email, userType });
      console.log('API URL:', `${import.meta.env.VITE_API_URL}/api/auth/login`);
      console.log('Request payload:', { email, password });
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password,
      }, {
        withCredentials: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      console.log('Login response:', response.data);
      const { token: newToken, user: userData } = response.data.data;

      // Verify user type matches
      console.log('Verifying user type:', { expected: userType, received: userData.role });
      if (
        (userType === 'employee' && userData.role !== 'EMPLOYEE') ||
        (userType === 'employer' && !['EMPLOYER', 'ADMIN'].includes(userData.role))
      ) {
        console.error('User type mismatch:', { expected: userType, received: userData.role });
        throw new Error('Invalid user type');
      }

      console.log('Login successful, setting token and user data');
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
        console.error('Response data:', error.response?.data);
        console.error('Response status:', error.response?.status);
        throw new Error(error.response?.data?.message || 'An error occurred during login');
      }
      throw error;
    }
  };

  const value = {
    user,
    token,
    loading,
    login,
    logout,
    isAuthenticated: !!token && !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 