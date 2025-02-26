import crypto from 'crypto-js';

// Constants for request signing - MUST MATCH BACKEND EXACTLY
const SIGNATURE_HEADER = 'X-Signature';
const TIMESTAMP_HEADER = 'X-Timestamp';

/**
 * Generates a signature for request data
 * @param payload The data to sign
 * @param secret The secret key for signing
 * @returns The generated signature
 */
const generateSignature = (payload: string, secret: string): string => {
  // Use HMAC-SHA256 for signing with crypto-js (browser-compatible)
  // Important: This must generate the exact same signature as the backend
  // crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.HmacSHA256(payload, secret).toString(crypto.enc.Hex);
};

/**
 * Generates headers with signature for sensitive API requests
 * 
 * @param method HTTP method (GET, POST, PUT, DELETE)
 * @param path Request path including query parameters
 * @param body Request body (for non-GET requests)
 * @returns Object with necessary headers for a signed request
 */
export const signRequest = (method: string, path: string, body?: any): Record<string, string> => {
  // IMPORTANT: This must match the backend's secret exactly
  // In production, this would be injected through environment variables
  // For this development example, we're using a hardcoded value that matches the backend
  const secret = 'your-signing-secret';
  
  const timestamp = Date.now().toString();
  
  let payload = `${method}:${path}:${timestamp}`;
  
  if (method !== 'GET') {
    // For non-GET requests, always include body section even if empty
    // This must match the backend implementation exactly
    if (!body || Object.keys(body).length === 0) {
      // Empty body, add empty object string
      payload += `:{}`;
      console.log('Empty body request, using "{}" for payload signature');
    } else {
      // Sort keys to ensure consistent JSON stringification regardless of property order
      const sortedBody = JSON.stringify(body, Object.keys(body).sort());
      payload += `:${sortedBody}`;
      console.log('Request body found:', { bodyKeys: Object.keys(body) });
    }
  }
  
  const signature = generateSignature(payload, secret);
  
  // Debug logging
  console.log('Generated signature:', {
    payload,
    timestamp,
    signatureStart: signature.substring(0, 10) + '...',
    headers: {
      [SIGNATURE_HEADER]: signature,
      [TIMESTAMP_HEADER]: timestamp
    }
  });
  
  return {
    [SIGNATURE_HEADER]: signature,
    [TIMESTAMP_HEADER]: timestamp
  };
};

/**
 * Adds signing headers to axios request config
 * Use this for sensitive operations like account verification, role changes, etc.
 * 
 * @param config Axios request config
 * @returns Modified config with signing headers
 */
export const addSigningHeaders = (
  config: any,  // This should match your axios config type
): any => {
  const { method = 'GET', url = '', data } = config;
  
  // Extract path from URL without base URL
  // We need to ensure the path matches what the backend will see as req.originalUrl
  let path;
  
  // First check for API_URL and remove it if present
  const API_URL = import.meta.env.VITE_API_URL || '';
  if (url.startsWith(API_URL)) {
    path = url.substring(API_URL.length);
  }
  // Then try to process as a full URL if it still has protocol
  else if (url.includes('://')) {
    try {
      const urlObj = new URL(url);
      // Extract just the path and query parts
      path = urlObj.pathname + (urlObj.search || '');
    } catch (e) {
      // If URL parsing fails, use the URL as is
      path = url;
    }
  } else {
    // For relative URLs, use as is
    path = url;
  }
  
  // If path doesn't start with /, add it to match the backend's req.originalUrl format
  if (!path.startsWith('/') && !path.startsWith('http')) {
    path = '/' + path;
  }
  
  // Log the path for debugging purposes
  console.log('Request signing path:', {
    originalUrl: url,
    extractedPath: path,
    method: method.toUpperCase()
  });
  
  const signingHeaders = signRequest(method.toUpperCase(), path, data);
  
  // Create a custom headers config to ensure case sensitivity
  // Include existing headers if they exist
  const existingHeaders = config.headers || {};
  
  // Create a new headers object with the signing headers using exact case
  // This ensures axios will send the headers with the exact case we want
  const headers = {
    ...existingHeaders,
    'X-Signature': signingHeaders['X-Signature'],
    'X-Timestamp': signingHeaders['X-Timestamp']
  };
  
  console.log('Final request headers:', headers);
  
  return {
    ...config,
    headers
  };
};