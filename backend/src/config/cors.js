/**
 * CORS Configuration Fix
 * 
 * This file provides additional CORS troubleshooting for development
 */

// If you're still getting CORS errors, add this to your .env:
// VITE_API_URL=http://localhost:5001

// Common CORS Issues:
// 1. Frontend running on different port than backend
// 2. Missing CORS headers
// 3. Preflight OPTIONS requests failing
// 4. Credentials mismatch

// Development URLs to verify:
// - Frontend: http://localhost:5173
// - Backend: http://localhost:5001
// - API Endpoint: http://localhost:5001/api/analyze

// Test your backend is running:
// curl http://localhost:5001/api/diagnostic/health

// Test CORS:
// curl -H "Origin: http://localhost:5173" \
//      -H "Access-Control-Request-Method: POST" \
//      -H "Access-Control-Request-Headers: Content-Type" \
//      -X OPTIONS \
//      http://localhost:5001/api/analyze

export const CORS_CONFIG = {
  development: {
    origin: ['http://localhost:5173', 'http://localhost:5001'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
  },
  production: {
    origin: true, // Allow same origin
    credentials: false
  }
};

export default CORS_CONFIG;
