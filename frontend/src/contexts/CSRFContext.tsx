import { createContext, useContext, useEffect, ReactNode, useRef } from 'react';
import axios from 'axios';

// Console styling for better visibility in VS Code
const consoleStyles = {
  info: [
    'background: #3498db; color: white; padding: 2px 4px; border-radius: 2px;',
    'color: #3498db;',
    'color: inherit'
  ],
  success: [
    'background: #2ecc71; color: white; padding: 2px 4px; border-radius: 2px;',
    'color: #2ecc71;',
    'color: inherit'
  ],
  warning: [
    'background: #f1c40f; color: white; padding: 2px 4px; border-radius: 2px;',
    'color: #f1c40f;',
    'color: inherit'
  ],
  error: [
    'background: #e74c3c; color: white; padding: 2px 4px; border-radius: 2px;',
    'color: #e74c3c;',
    'color: inherit'
  ]
};

// Debug logging utility
const debug = {
  info: (title: string, ...args: any[]) => {
    console.groupCollapsed(`%c CSRF %c ${title} `, consoleStyles.info[0], consoleStyles.info[1]);
    args.forEach(arg => console.log(arg));
    console.groupEnd();
  },
  success: (title: string, ...args: any[]) => {
    console.groupCollapsed(`%c CSRF %c ${title} `, consoleStyles.success[0], consoleStyles.success[1]);
    args.forEach(arg => console.log(arg));
    console.groupEnd();
  },
  warning: (title: string, ...args: any[]) => {
    console.groupCollapsed(`%c CSRF %c ${title} `, consoleStyles.warning[0], consoleStyles.warning[1]);
    args.forEach(arg => console.log(arg));
    console.groupEnd();
  },
  error: (title: string, ...args: any[]) => {
    console.group(`%c CSRF %c ${title} `, consoleStyles.error[0], consoleStyles.error[1]);
    args.forEach(arg => console.log(arg));
    console.trace('Stack trace:');
    console.groupEnd();
  }
};

interface CSRFContextType {
  refreshCSRFToken: () => Promise<void>;
}

const CSRFContext = createContext<CSRFContextType | undefined>(undefined);

export function CSRFProvider({ children }: { children: ReactNode }) {
  // Add a ref to track ongoing token refresh
  const refreshingRef = useRef<Promise<void> | null>(null);

  const refreshCSRFToken = async () => {
    try {
      // If there's an ongoing refresh, wait for it
      if (refreshingRef.current) {
        debug.info('Token Refresh', 'Waiting for ongoing refresh');
        return refreshingRef.current;
      }

      const existingToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('XSRF-TOKEN='))
        ?.split('=')[1];

      if (existingToken) {
        debug.info('Token Check', {
          status: 'Using existing token',
          tokenPresent: true,
          tokenLength: existingToken.length
        });
        return;
      }

      // Create new refresh promise with timeout
      refreshingRef.current = (async () => {
        try {
          debug.info('Token Refresh', 'Initiating token refresh request');
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);

          try {
            const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/csrf-token`, {
              withCredentials: true,
              signal: controller.signal
            });
            
            const hashedToken = response.headers['x-csrf-token'];
            if (!hashedToken) {
              debug.error('Token Error', {
                error: 'No token in response',
                headers: response.headers,
                status: response.status
              });
              throw new Error('No CSRF token received from server');
            }

            // Wait for cookie to be set
            let attempts = 0;
            while (attempts < 5) {
              const token = document.cookie
                .split('; ')
                .find(row => row.startsWith('XSRF-TOKEN='))
                ?.split('=')[1];
              
              if (token) {
                debug.success('Token Refresh', {
                  status: 'Token refresh successful',
                  hashedTokenPresent: true,
                  responseStatus: response.status,
                  cookieSet: true
                });
                break;
              }
              
              await new Promise(resolve => setTimeout(resolve, 10));
              attempts++;
            }

            if (attempts === 5) {
              debug.warning('Token Refresh', {
                status: 'Token set in headers but cookie not found',
                hashedTokenPresent: true,
                responseStatus: response.status,
                cookieSet: false
              });
            }
          } finally {
            clearTimeout(timeoutId);
          }
        } finally {
          // Clear the ref after completion (success or failure)
          refreshingRef.current = null;
        }
      })();

      return refreshingRef.current;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        debug.error('Token Refresh Failed', {
          code: error.code,
          status: error.response?.status,
          message: error.message,
          config: {
            url: error.config?.url,
            method: error.config?.method,
            timeout: error.config?.timeout
          }
        });

        if (error.code === 'ECONNABORTED') {
          throw new Error('Failed to fetch CSRF token: Request timeout');
        }
        if (error.response?.status === 429) {
          throw new Error('Too many token requests. Please try again later.');
        }
      }
      throw error;
    }
  };

  useEffect(() => {
    let mounted = true;
    let retryCount = 0;
    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000;

    debug.info('Provider Init', {
      timestamp: new Date().toISOString(),
      environment: import.meta.env.MODE
    });

    // Delay CSRF setup to avoid race conditions with auth
    const initDelayMs = 100;

    setTimeout(async () => {
      if (!mounted) return;
      
      const setupCSRF = async () => {
        try {
          const existingToken = document.cookie
            .split('; ')
            .find(row => row.startsWith('XSRF-TOKEN='))
            ?.split('=')[1];
  
          if (!existingToken && mounted) {
            debug.info('Initial Setup', {
              status: 'No token found, requesting new token',
              retryCount
            });
            await refreshCSRFToken();
          } else {
            debug.success('Initial Setup', {
              status: 'Existing token found',
              tokenLength: existingToken?.length
            });
          }
        } catch (error) {
          if (mounted && retryCount < MAX_RETRIES) {
            retryCount++;
            debug.warning('Setup Retry', {
              attempt: retryCount,
              maxRetries: MAX_RETRIES,
              nextRetryDelay: RETRY_DELAY * retryCount,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
            setTimeout(setupCSRF, RETRY_DELAY * retryCount);
          } else {
            debug.error('Setup Failed', {
              finalRetryCount: retryCount,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      };
  
      await setupCSRF();
    }, initDelayMs);

    const requestInterceptor = axios.interceptors.request.use(
      async (config) => {
        if (!mounted) return config;

        const excludedPaths = ['/api/auth/login', '/api/auth/register', '/api/auth/refresh-token', '/api/csrf-token'];
        const isExcluded = excludedPaths.some(path => config.url?.includes(path));
        
        if (!isExcluded) {
          try {
            debug.info('Request Interceptor', {
              url: config.url,
              method: config.method,
              isExcluded: false
            });

            const csrfToken = document.cookie
              .split('; ')
              .find(row => row.startsWith('XSRF-TOKEN='))
              ?.split('=')[1];

            if (csrfToken) {
              // Decode the token from the cookie and set it in the header
              const decodedToken = decodeURIComponent(csrfToken);
              config.headers['X-CSRF-Token'] = decodedToken;
              
              // Log the token we're sending (truncated for security)
              debug.success('Token Applied', {
                url: config.url,
                tokenPresent: true,
                tokenLength: decodedToken.length,
                tokenPreview: decodedToken.substring(0, 4) + '...'
              });
            } else {
              // Skip token refresh for the token endpoint and non-mutating requests
              if (config.url?.includes('/api/csrf-token') || ['GET', 'HEAD', 'OPTIONS'].includes(config.method?.toUpperCase() || '')) {
                return config;
              }
              
              debug.warning('Missing Token', {
                status: 'No token found, requesting new token',
                url: config.url
              });
              await refreshCSRFToken();
              
              // Wait a small amount of time for the cookie to be set
              await new Promise(resolve => setTimeout(resolve, 50));
              
              const newToken = document.cookie
                .split('; ')
                .find(row => row.startsWith('XSRF-TOKEN='))
                ?.split('=')[1];
              
              if (newToken) {
                // Decode the new token from the cookie and set it in the header
                const decodedToken = decodeURIComponent(newToken);
                config.headers['X-CSRF-Token'] = decodedToken;
                
                // Log the token we're sending (truncated for security)
                debug.success('New Token Applied', {
                  url: config.url,
                  tokenPresent: true,
                  tokenLength: decodedToken.length,
                  tokenPreview: decodedToken.substring(0, 4) + '...'
                });
              } else {
                debug.error('Token Application Failed', {
                  url: config.url,
                  error: 'Failed to obtain new token'
                });
                throw new Error('Failed to obtain CSRF token');
              }
            }
          } catch (error) {
            if (config.method?.toUpperCase() !== 'GET') {
              debug.error('Request Error', {
                url: config.url,
                method: config.method,
                error: error instanceof Error ? error.message : 'Unknown error'
              });
              throw error;
            }
          }
        } else {
          debug.info('Excluded Path', {
            url: config.url,
            method: config.method,
            isExcluded: true
          });
        }
        return config;
      },
      (error) => {
        debug.error('Interceptor Error', {
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        return Promise.reject(error);
      }
    );

    return () => {
      debug.info('Cleanup', {
        status: 'Removing interceptor',
        timestamp: new Date().toISOString()
      });
      mounted = false;
      axios.interceptors.request.eject(requestInterceptor);
    };
  }, []);

  return (
    <CSRFContext.Provider value={{ refreshCSRFToken }}>
      {children}
    </CSRFContext.Provider>
  );
}

export function useCSRF() {
  const context = useContext(CSRFContext);
  if (context === undefined) {
    throw new Error('useCSRF must be used within a CSRFProvider');
  }
  return context;
} 