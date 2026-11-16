/**
 * Authentication Middleware for Bhuvana's Bridal Studio Cloudflare Worker
 * Validates owner session cookies and Bearer tokens.
 */

import { AuthService } from '../services/auth.js';
import { errorResponse } from '../utils/response.js';

/**
 * Ensures request is made by an authenticated owner.
 * If valid, returns the owner record and token.
 * If invalid, returns a Response object with 401 Unauthorized.
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<{ auth?: object, errorResponse?: Response }>}
 */
export async function requireOwnerAuth(request, env) {
  try {
    const auth = await AuthService.authenticateRequest(request, env);
    if (!auth) {
      return {
        errorResponse: errorResponse(request, env, 'Unauthorized. Please log in to Bhuvana Bridal Studio owner portal.', 401, 'UNAUTHORIZED')
      };
    }
    return { auth };
  } catch (err) {
    console.error('[AuthMiddleware] Auth check failed:', err);
    return {
      errorResponse: errorResponse(request, env, 'Authentication verification error', 401, 'AUTH_ERROR')
    };
  }
}
