import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { Session } from 'express-session';

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

// Extend Express Session type to include our custom properties
declare module 'express-session' {
  interface Session {
    csrfTokenHash?: string;
    csrfTokenCreatedAt?: number;
  }
}

// Rate limit CSRF token requests to prevent token harvesting
const csrfTokenLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 50 : 100, // Stricter limit in production
  message: {
    status: 'error',
    message: 'Too many CSRF token requests',
    details: 'Please try again later'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skipSuccessfulRequests: false, // Count all requests
  keyGenerator: (req) => {
    return req.ip + (req.session?.id || ''); // Rate limit by IP + session
  }
});

// Validate production environment configuration
const validateProductionConfig = () => {
  if (process.env.NODE_ENV === 'production') {
    const requiredVars = ['COOKIE_DOMAIN', 'SESSION_SECRET'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables for production: ${missingVars.join(', ')}`);
    }

    if (!process.env.COOKIE_DOMAIN?.includes('.')) {
      throw new Error('COOKIE_DOMAIN must be a valid domain name');
    }
  }
};

// Configure CSRF protection middleware with enhanced security
export const csrfProtection = csrf({
  cookie: {
    key: 'XSRF-TOKEN',
    httpOnly: false, // Must be false so frontend JS can read it
    secure: process.env.NODE_ENV === 'production', // Always use HTTPS in production
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: process.env.NODE_ENV === 'production' ? 3600 : 7200, // 1 hour in production
    path: '/',
    domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined
  },
  sessionKey: 'sessionId',
  ignoreMethods: ['GET', 'HEAD', 'OPTIONS'],
  value: (req: Request) => {
    // Check both headers for the token
    const headerToken = req.headers['x-csrf-token'] || req.headers['xsrf-token'];
    
    debug.info('Token Validation', {
      method: req.method,
      path: req.path,
      tokenExists: !!headerToken,
      headerNames: Object.keys(req.headers)
        .filter(key => key.toLowerCase().includes('csrf') || key.toLowerCase().includes('xsrf'))
    });
    
    // Add additional security checks
    if (typeof headerToken !== 'string' || headerToken.length < 32) {
      debug.warning('Invalid Token Format', {
        tokenLength: typeof headerToken === 'string' ? headerToken.length : 0,
        method: req.method,
        path: req.path
      });
      return '';
    }

    // Validate token format (should be URL-safe base64)
    if (!/^[A-Za-z0-9_-]+$/.test(headerToken)) {
      debug.warning('Invalid Token Characters', {
        method: req.method,
        path: req.path
      });
      return '';
    }

    // Check if token age is within limits
    const tokenCreatedAt = req.session?.csrfTokenCreatedAt;
    if (tokenCreatedAt && Date.now() - tokenCreatedAt > 7200000) { // 2 hours max
      debug.warning('Token Expired', {
        age: Date.now() - tokenCreatedAt,
        method: req.method,
        path: req.path
      });
      return '';
    }

    return headerToken;
  }
});

// Helper middleware to handle CSRF errors with detailed messages
export const handleCSRFError = (err: any, req: Request, res: Response, next: NextFunction) => {
  if (err.code === 'EBADCSRFTOKEN') {
    const sanitizedHeaders = { ...req.headers };
    delete sanitizedHeaders.authorization;
    delete sanitizedHeaders.cookie;
    
    // Log CSRF-related headers to help debug
    const csrfHeaders = Object.keys(req.headers)
      .filter(key => key.toLowerCase().includes('csrf') || key.toLowerCase().includes('xsrf'))
      .reduce((obj, key) => {
        obj[key] = req.headers[key];
        return obj;
      }, {} as Record<string, any>);
    
    const cookieHeader = req.headers.cookie;
    const csrfCookie = cookieHeader && cookieHeader.split(';')
      .find(cookie => cookie.trim().startsWith('XSRF-TOKEN='));
    
    const errorData = {
      path: req.path,
      method: req.method,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
      sessionPresent: !!req.session,
      environment: process.env.NODE_ENV,
      requestId: (req as any).id || 'unknown',
      csrfHeaders,
      csrfCookiePresent: !!csrfCookie,
      sessionToken: req.session?.csrfTokenHash ? 'present' : 'missing'
    };

    debug.error('CSRF Validation Failed', errorData);

    // TODO: In production, integrate with your error logging service
    if (process.env.NODE_ENV === 'production') {
      // Example: errorLoggingService.log('CSRF_ERROR', errorData);
    }

    return res.status(403).json({
      status: 'error',
      message: 'Invalid CSRF token',
      code: 'CSRF_ERROR',
      requestId: errorData.requestId // Allow tracking issues in production
    });
  }
  return next(err);
};

// Track config validation state
let isConfigValidated = false;

// Enhanced token setting with double submit verification
export const setCSRFToken = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate production configuration on first request
    if (!isConfigValidated) {
      validateProductionConfig();
      isConfigValidated = true;
    }

    // Validate request origin in production
    if (process.env.NODE_ENV === 'production') {
      const origin = req.get('origin');
      const host = req.get('host');
      
      if (origin && !origin.includes(process.env.COOKIE_DOMAIN || '')) {
        debug.error('Invalid Origin', {
          origin,
          host,
          expectedDomain: process.env.COOKIE_DOMAIN
        });
        return res.status(403).json({
          status: 'error',
          message: 'Invalid request origin',
          code: 'ORIGIN_ERROR'
        });
      }
    }

    debug.info('Token Generation', {
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });

    // Generate token with more entropy
    const tokenBuffer = crypto.randomBytes(32);
    const token = tokenBuffer.toString('base64url');
    req.csrfToken = () => token;
    
    // Store the raw token in session for verification
    const hashedToken = crypto.createHash('sha256')
      .update(token + (req.session?.id || '')) // Add session ID to the hash
      .digest('hex');
    
    // Enhanced security headers with stricter CSP
    const headers = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'X-CSRF-Token': token, // Send the actual token, not the hash
      'Content-Security-Policy': `default-src 'self'; frame-ancestors 'none'; script-src 'self' 'nonce-${token}'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self';`,
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
      'X-Permitted-Cross-Domain-Policies': 'none',
      'Referrer-Policy': 'strict-origin-when-cross-origin'
    };

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    debug.info('Security Headers', headers);
    
    // Enhanced cookie options
    const cookieOptions = {
      secure: process.env.NODE_ENV === 'production',
      sameSite: (process.env.NODE_ENV === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
      maxAge: process.env.NODE_ENV === 'production' ? 3600000 : 7200000, // 1 hour in production
      path: '/',
      domain: process.env.NODE_ENV === 'production' ? process.env.COOKIE_DOMAIN : undefined,
      httpOnly: false
    };

    res.cookie('XSRF-TOKEN', token, cookieOptions);
    debug.success('Cookie Set', {
      name: 'XSRF-TOKEN',
      options: cookieOptions
    });

    if (req.session) {
      req.session.csrfTokenHash = hashedToken;
      req.session.csrfTokenCreatedAt = Date.now();
      debug.success('Session Updated', {
        sessionId: req.sessionID,
        tokenCreatedAt: new Date(req.session.csrfTokenCreatedAt).toISOString()
      });
    } else {
      debug.warning('No Session', {
        path: req.path,
        method: req.method
      });
    }

    next();
  } catch (error) {
    debug.error('Token Generation Failed', {
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.path,
      method: req.method
    });
    next(error);
  }
};

// Export rate limiter for use in routes
export const csrfTokenEndpointProtection = [csrfTokenLimiter, csrfProtection, setCSRFToken]; 