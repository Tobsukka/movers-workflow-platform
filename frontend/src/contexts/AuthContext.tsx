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

  const logout = useCallback(async () => {
    console.log('Logging out user');
    try {
      // Call the logout endpoint to clear HttpOnly cookies
      await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/logout`, {}, {
        withCredentials: true
      });
    } catch (error) {
      console.error('Error during logout:', error);
    }
    
    // For backwards compatibility, also clear localStorage
    localStorage.removeItem('token');
    
    // Clear the auth state
    setToken(null);
    setUser(null);
    
    // Clear any cached queries
    queryClient.clear();
    
    // Remove authorization header from axios defaults
    delete axios.defaults.headers.common['Authorization'];
    
    // Navigate to home page
    navigate('/');
  }, [navigate, queryClient]);

  // Set up axios interceptor for authentication
  useEffect(() => {
    console.log('Setting up axios interceptors');
    const getToken = () => localStorage.getItem('token');

    const requestInterceptor = axios.interceptors.request.use(
      (config) => {
        // Don't overwrite Authorization if it's already set in defaults
        if (!config.headers.Authorization) {
          const currentToken = getToken();
          if (currentToken) {
            config.headers.Authorization = `Bearer ${currentToken}`;
          }
        }
        
        // Always set withCredentials for CSRF cookies
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
        // Only logout on 401 errors that aren't from initial page load requests
        if (error.response?.status === 401 && error.config?.url !== `${import.meta.env.VITE_API_URL}/api/users/me`) {
          console.log('Unauthorized request detected - logging out');
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
          
          // Set token in axios default headers first to avoid race conditions
          axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
          
          const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/users/me`, {
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
        // Clear the Authorization header
        delete axios.defaults.headers.common['Authorization'];
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
      
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/api/auth/login`, {
        email,
        password,
      }, {
        withCredentials: true, // Important for receiving cookies
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

      console.log('Login successful, setting user data');
      
      // For backwards compatibility, still store token in localStorage
      // but primarily rely on HttpOnly cookies
      if (newToken) {
        localStorage.setItem('token', newToken);
      }
      
      // Set auth state
      setToken(newToken);
      setUser(userData);
      
      // Set the token in axios defaults for immediate use
      if (newToken) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      }

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