/**
 * Authentication Middleware for Bhuvana's Bridal Studio Cloudflare Worker
 * Validates owner session cookies and Bearer tokens via Cloudflare D1.
 */

import { AuthService } from '../services/auth.js';
import { errorResponse } from '../utils/response.js';

export async function requireOwnerAuth(request, env) {
  if (!env.DB) {
    return {
      errorResponse: errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE')
    };
  }

  try {
    const auth = await AuthService.authenticateRequest(request, env);
    if (!auth) {
      return {
        errorResponse: errorResponse(request, env, 'Unauthorized. Please log in to Bhuvana Bridal Studio owner portal.', 401, 'UNAUTHORIZED')
      };
    }
    return { auth };
  } catch (err) {
    console.error('[AuthMiddleware] D1 session check failed:', err);
    return {
      errorResponse: errorResponse(request, env, 'Authentication verification error', 401, 'AUTH_ERROR')
    };
  }
}
