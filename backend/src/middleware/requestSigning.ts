import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { AppError } from './errorHandler';

// Constants for request signing
const SIGNATURE_HEADER = 'X-Signature';
const TIMESTAMP_HEADER = 'X-Timestamp';
const MAX_TIMESTAMP_DIFF = 5 * 60 * 1000; // 5 minutes in milliseconds

/**
 * Generates a signature for request data
 * @param payload The data to sign
 * @param secret The secret key for signing
 * @returns The generated signature
 */
export const generateSignature = (payload: string, secret: string): string => {
  // Use HMAC-SHA256 for signing
  return crypto.createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
};

/**
 * Middleware to verify request signatures for sensitive operations
 * This adds an extra layer of security for operations that need protection
 * beyond what standard authentication provides
 */
export const verifyRequestSignature = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get signature and timestamp from headers
    // Try both the actual header name and lowercase version for flexibility
    const signature = 
      (req.headers[SIGNATURE_HEADER] || 
       req.headers[SIGNATURE_HEADER.toLowerCase()]) as string;
    
    const timestamp = 
      (req.headers[TIMESTAMP_HEADER] || 
       req.headers[TIMESTAMP_HEADER.toLowerCase()]) as string;
    
    // Ensure required headers are present
    if (!signature || !timestamp) {
      return next(new AppError('Request signature verification failed: Missing required headers', 403));
    }
    
    // Verify timestamp freshness to prevent replay attacks
    const requestTime = parseInt(timestamp, 10);
    const currentTime = Date.now();
    
    if (isNaN(requestTime) || Math.abs(currentTime - requestTime) > MAX_TIMESTAMP_DIFF) {
      return next(new AppError('Request signature verification failed: Timestamp expired or invalid', 403));
    }
    
    // Get the request secret
    const secret = process.env.REQUEST_SIGNING_SECRET || 'your-signing-secret';
    
    // Create the payload to verify
    // For GET requests, use the URL path with query parameters
    // For other methods, use the request body as well
    let payload = `${req.method}:${req.originalUrl}:${timestamp}`;
    
    if (req.method !== 'GET') {
      // For non-GET requests, always include body section even if empty
      if (!req.body || Object.keys(req.body).length === 0) {
        // Empty body, add empty object
        payload += `:{}`;
        console.log('Empty body request, using "{}" for payload signature');
      } else {
        // Sort keys to ensure consistent JSON stringification regardless of property order
        const sortedBody = JSON.stringify(req.body, Object.keys(req.body).sort());
        payload += `:${sortedBody}`;
        console.log('Request body found:', { bodyKeys: Object.keys(req.body) });
      }
    }
    
    // Debug logging
    console.log('Backend request verification:', {
      method: req.method,
      originalUrl: req.originalUrl,
      path: req.path,
      timestamp,
      payloadUsed: payload,
      headers: Object.keys(req.headers)
    });
    
    // Generate and verify signature
    const expectedSignature = generateSignature(payload, secret);
    
    if (signature !== expectedSignature) {
      console.warn('Request signature mismatch', {
        expected: expectedSignature,
        received: signature,
        method: req.method,
        path: req.path,
        headers: Object.keys(req.headers),
        payload: payload,
        timestamp: timestamp,
        bodySize: req.body ? Object.keys(req.body).length : 0,
        bodyContent: JSON.stringify(req.body || {})
      });
      
      // Check if it's a secret mismatch by looking at what would be correct with the frontend hardcoded secret
      const frontendSecret = 'your-signing-secret';
      const frontendExpectedSignature = generateSignature(payload, frontendSecret);
      
      if (signature === frontendExpectedSignature) {
        console.warn('Signature matches with frontend secret - secret mismatch between frontend and backend');
      } else {
        console.warn('Complete signature mismatch - likely payload format difference');
        
        // Try with different payload formats to find what might be matching
        const payloadWithoutBody = `${req.method}:${req.originalUrl}:${timestamp}`;
        const altSignature1 = generateSignature(payloadWithoutBody, secret);
        
        const payloadWithEmptyObj = `${req.method}:${req.originalUrl}:${timestamp}:{}`;
        const altSignature2 = generateSignature(payloadWithEmptyObj, secret);
        
        console.log('Alternative signature checks:', {
          payloadWithoutBody,
          altSignature1,
          matches1: signature === altSignature1,
          payloadWithEmptyObj,
          altSignature2,
          matches2: signature === altSignature2
        });
      }
      
      return next(new AppError('Request signature verification failed: Invalid signature', 403));
    }
    
    // Signature is valid, proceed
    next();
  } catch (error) {
    next(new AppError('Request signature verification failed: Unexpected error', 500));
  }
};

/**
 * Helper function for frontend to generate a signature for a request
 * Should be used for sensitive operations
 * 
 * @param method HTTP method
 * @param path Request path including query parameters
 * @param body Request body (for non-GET requests)
 * @returns Object with signature and timestamp headers
 */
export const signRequest = (method: string, path: string, body?: any) => {
  const timestamp = Date.now().toString();
  const secret = process.env.REQUEST_SIGNING_SECRET || 'your-signing-secret';
  
  let payload = `${method}:${path}:${timestamp}`;
  
  if (method !== 'GET' && body) {
    payload += `:${JSON.stringify(body)}`;
  }
  
  const signature = generateSignature(payload, secret);
  
  return {
    [TIMESTAMP_HEADER]: timestamp,
    [SIGNATURE_HEADER]: signature
  };
};