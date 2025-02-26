import axios, { AxiosRequestConfig } from 'axios';
import { addSigningHeaders } from './requestSigning';

// Base API URL from environment
const API_URL = import.meta.env.VITE_API_URL;

// List of sensitive endpoints that require request signing
const SENSITIVE_ENDPOINTS = [
  '/api/users/*/verify',   // User verification
  '/api/users/*',          // User deletion (when using DELETE method)
  '/api/users/*/role',     // Role changes
  '/api/users/password',   // Password changes
];

/**
 * Determines if a request needs signing based on its URL and method
 */
const needsSigning = (url: string, method: string): boolean => {
  // Convert wildcards in sensitive endpoints to regex patterns
  const patterns = SENSITIVE_ENDPOINTS.map(endpoint => 
    new RegExp(`^${endpoint.replace(/\*/g, '[^/]+')}$`)
  );
  
  // Extract the path from the URL - make sure to get just the path + query part
  let path;
  
  if (url.startsWith(API_URL)) {
    // Remove just the base API URL to match backend's req.originalUrl
    path = url.replace(API_URL, '');
  } else {
    // Might be a relative path already
    path = url;
  }
  
  console.log('needsSigning path extraction:', {
    url,
    extractedPath: path
  });
  
  // Check if the path matches any sensitive endpoint pattern
  return patterns.some(pattern => pattern.test(path)) || 
    // Always sign DELETE requests as they're likely sensitive
    method.toUpperCase() === 'DELETE';
};

/**
 * Enhanced axios instance with automatic request signing for sensitive operations
 */
const api = {
  get: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    return axios.get(fullUrl, {
      withCredentials: true,
      ...config
    }).then(res => res.data);
  },
  
  post: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    let requestConfig: AxiosRequestConfig = {
      withCredentials: true,
      ...config
    };
    
    // Apply request signing for sensitive operations
    if (needsSigning(fullUrl, 'POST')) {
      console.log('Signing POST request to:', fullUrl, 'with data:', data || '{}');
      requestConfig = addSigningHeaders({
        ...requestConfig,
        method: 'POST',
        url: fullUrl,
        data: data || {} // Ensure we always have at least an empty object
      });
    }
    
    // Ensure data is at least an empty object, not undefined
    return axios.post(fullUrl, data || {}, requestConfig).then(res => res.data);
  },
  
  put: async <T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<T> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    let requestConfig: AxiosRequestConfig = {
      withCredentials: true,
      ...config
    };
    
    // Apply request signing for sensitive operations
    if (needsSigning(fullUrl, 'PUT')) {
      console.log('Signing PUT request to:', fullUrl, 'with data:', data || '{}');
      requestConfig = addSigningHeaders({
        ...requestConfig,
        method: 'PUT',
        url: fullUrl,
        data: data || {} // Ensure we always have at least an empty object
      });
    }
    
    // Ensure data is at least an empty object, not undefined
    return axios.put(fullUrl, data || {}, requestConfig).then(res => res.data);
  },
  
  delete: async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
    const fullUrl = url.startsWith('http') ? url : `${API_URL}${url}`;
    let requestConfig: AxiosRequestConfig = {
      withCredentials: true,
      ...config
    };
    
    // Apply request signing for sensitive operations (almost always for DELETE)
    if (needsSigning(fullUrl, 'DELETE')) {
      console.log('Signing DELETE request to:', fullUrl);
      requestConfig = addSigningHeaders({
        ...requestConfig,
        method: 'DELETE',
        url: fullUrl,
        data: {} // Always include empty object for consistency
      });
    }
    
    return axios.delete(fullUrl, requestConfig).then(res => res.data);
  }
};

export default api;