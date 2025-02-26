const express = require('express');
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
// Import express-session with require to avoid TypeScript errors
const session = require('express-session');
import { errorHandler } from './middleware/errorHandler';
import { csrfProtection, handleCSRFError, setCSRFToken } from './middleware/csrf';
import authRoutes from './routes/auth';
import userRoutes from './routes/users';
import jobRoutes from './routes/jobs';
import shiftRoutes from './routes/shifts';
import analyticsRoutes from './routes/analytics';
import { Request, Response, NextFunction } from 'express';

// Add custom properties to session for TypeScript
declare module 'express-session' {
  interface SessionData {
    csrfToken?: string;
    csrfTokenCreatedAt?: number;
  }
}

dotenv.config();

const app = express();

// Middleware
app.use(cookieParser()); // Add cookie-parser before other middleware

// Session configuration - Add before CSRF middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict',
    maxAge: 7200000 // 2 hours to match CSRF token
  }
}));

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],  // Required for some UI frameworks
        styleSrc: ["'self'", "'unsafe-inline'"],   // Required for styled-components
        imgSrc: ["'self'", "data:", "blob:"],      // Allow data URIs for images
        connectSrc: ["'self'"],                    // API and WebSocket connections
        fontSrc: ["'self'", "data:"],             // Allow loading fonts
        objectSrc: ["'none'"],                    // Restrict <object>, <embed>, and <applet> elements
        mediaSrc: ["'self'"],                     // Restrict media file sources
        frameSrc: ["'none'"],                     // Restrict iframes
        workerSrc: ["'self'"],                    // Restrict worker scripts
        manifestSrc: ["'self'"],                  // Restrict manifest files
        formAction: ["'self'"],                   // Restrict form targets
        baseUri: ["'self'"],                      // Restrict base URIs
      },
    },
    crossOriginEmbedderPolicy: true,              // Require CORS for loading cross-origin resources
    crossOriginOpenerPolicy: { policy: "same-origin" }, // Isolate cross-origin windows
    crossOriginResourcePolicy: { policy: "same-site" }, // Restrict resource sharing
    dnsPrefetchControl: { allow: false },         // Disable DNS prefetching
    frameguard: { action: "deny" },               // Prevent clickjacking
    hidePoweredBy: true,                          // Remove X-Powered-By header
    hsts: {                                       // HTTP Strict Transport Security
      maxAge: 31536000,                          // 1 year in seconds
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,                              // Prevent IE from executing downloads
    noSniff: true,                               // Prevent MIME type sniffing
    originAgentCluster: true,                    // Enable Origin isolation
    permittedCrossDomainPolicies: { permittedPolicies: "none" }, // Restrict Adobe Flash and PDF
    referrerPolicy: { policy: "strict-origin-when-cross-origin" }, // Control the Referer header
    xssFilter: true                              // Enable XSS protection
  })
);

// Add comprehensive Permissions-Policy header
app.use((req: Request, res: Response, next: NextFunction) => {
  // Define a strict permissions policy to limit browser features
  res.setHeader('Permissions-Policy', 
    'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=(), autoplay=(), encrypted-media=self, picture-in-picture=(), fullscreen=(self)'
  );
  next();
});

// Validate required environment variables
if (!process.env.FRONTEND_URL) {
  console.warn('Warning: FRONTEND_URL not set in environment variables. Using default: http://localhost:5173');
}

// CORS configuration with specific origin
const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000']; // Common development ports

app.use(cors({
  origin: function(origin: string | undefined, callback: (err: Error | null, allow?: boolean | string) => void) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (process.env.NODE_ENV === 'production') {
      // In production, only allow the specific FRONTEND_URL
      return callback(null, process.env.FRONTEND_URL);
    }
    
    // In development, allow both the specified FRONTEND_URL and common development ports
    if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'XSRF-TOKEN', 
    'X-CSRF-Token',
    // Add request signing headers
    'X-Signature',
    'X-Timestamp'
  ],
  exposedHeaders: ['XSRF-TOKEN', 'X-CSRF-Token']
}));

app.use(express.json());

// Rate limiting configurations for production use
const rateLimiters = {
  // Auth routes - Still strict but more reasonable for real-world usage
  auth: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 30, // 30 attempts per hour (1 attempt every 2 minutes)
    message: {
      status: 429,
      message: 'Too many authentication attempts. Please try again in an hour.',
      details: 'For security reasons, we limit the number of authentication attempts.'
    },
    standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
    legacyHeaders: false,
    skipSuccessfulRequests: true, // Don't count successful attempts against the rate limit
    keyGenerator: (req) => {
      // Use both IP and user identifier (if available) to prevent IP-based bypassing
      return `${req.ip}-${req.body?.email || 'anonymous'}`;
    }
  }),

  // General API endpoints - Generous limits for normal operation
  api: rateLimit({
    windowMs: 60 * 1000, // 1 minute window
    max: 60, // 60 requests per minute (1 request per second on average)
    message: {
      status: 429,
      message: 'Too many requests. Please slow down.',
      details: 'Our API is rate limited to ensure fair usage.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipFailedRequests: true, // Failed requests don't count against the limit
    keyGenerator: (req) => {
      // If user is authenticated, use their ID, otherwise use IP
      return `${req.user?.id || req.ip}-api`;
    }
  }),

  // Sensitive operations - Strict but practical for business operations
  sensitive: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 50, // 50 operations per hour
    message: {
      status: 429,
      message: 'Too many sensitive operations requested.',
      details: 'For security reasons, we limit the frequency of sensitive operations.'
    },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => {
      // Always use user ID for sensitive operations
      return `${req.user?.id || req.ip}-sensitive`;
    }
  })
};

// Apply rate limiters to specific routes
app.use('/api/auth/login', rateLimiters.auth);
app.use('/api/auth/register', rateLimiters.auth);
app.use('/api/auth/refresh-token', rateLimiters.auth);

// Apply sensitive rate limits to specific operations
app.use([
  '/api/users/verify',
  '/api/users/password',
  '/api/users/delete',
  '/api/users/role',
  '/api/analytics'
], rateLimiters.sensitive);

// Apply general API rate limit to all other routes
app.use('/api', rateLimiters.api);

// CSRF Protection
// Exclude paths that don't need CSRF protection
const csrfExcludedPaths = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/refresh-token'
];

// Create a simpler CSRF implementation
app.use(cookieParser(process.env.SESSION_SECRET || 'your-secret-key'));

// CSRF token endpoint
app.get('/api/csrf-token', (req: Request, res: Response) => {
  // Generate a random token
  const token = require('crypto').randomBytes(32).toString('hex');
  
  // Set it as a cookie
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // Must be false so frontend JS can read it
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
    maxAge: 7200000, // 2 hours
    path: '/'
  });
  
  // Also send it in the response header
  res.setHeader('X-CSRF-Token', token);
  
  // Store the token in the session if it exists
  if (req.session) {
    req.session.csrfToken = token;
    req.session.csrfTokenCreatedAt = Date.now();
  }
  
  res.json({ status: 'success' });
});

// Simpler CSRF validation middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  // Skip for excluded paths and non-mutating methods
  if (csrfExcludedPaths.includes(req.path) || ['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return next();
  }
  
  // Get token from request headers
  const headerToken = req.headers['x-csrf-token'] || req.headers['xsrf-token'];
  
  // Get token from cookies
  const cookieToken = req.cookies['XSRF-TOKEN'];
  
  // Get token from session
  const sessionToken = req.session ? req.session.csrfToken : undefined;
  
  console.log('CSRF Check:', {
    headerToken: headerToken ? 'present' : 'missing',
    cookieToken: cookieToken ? 'present' : 'missing',
    sessionToken: sessionToken ? 'present' : 'missing',
    headerMatch: headerToken === cookieToken ? 'match' : 'mismatch',
    path: req.path,
    method: req.method
  });
  
  // Safely get substring for logging (handling potential array type)
  const safeSubstring = (value: string | string[] | undefined): string => {
    if (!value) return 'missing';
    if (Array.isArray(value)) {
      return value.length > 0 ? `${value[0].substring(0, 4)}...` : 'empty-array';
    }
    return `${value.substring(0, 4)}...`;
  };
  
  // Validate token
  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    console.error('CSRF Validation Failed', {
      headerToken: safeSubstring(headerToken as string),
      cookieToken: safeSubstring(cookieToken),
      path: req.path,
      method: req.method,
      headers: Object.keys(req.headers)
    });
    
    return res.status(403).json({
      status: 'error',
      message: 'Invalid CSRF token',
      code: 'CSRF_ERROR'
    });
  }
  
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/shifts', shiftRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use(errorHandler);

// Export the app for testing
export { app };

const PORT = process.env.PORT || 3000;

// Only start the server if this file is run directly
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
} 