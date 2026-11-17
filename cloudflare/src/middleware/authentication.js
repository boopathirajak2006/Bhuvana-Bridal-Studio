/**
 * Authentication Middleware for Bhuvana's Bridal Studio Cloudflare Worker
 * Validates owner session cookies and Bearer tokens via Supabase Auth exclusively.
 */

import { AuthService } from '../services/auth.js';
import { SupabaseService } from '../services/supabase.js';
import { errorResponse } from '../utils/response.js';

/**
 * Ensures request is made by an authenticated owner.
 * If valid, returns the owner record and token.
 * If invalid, returns a Response object with 401 Unauthorized or 503 if unconfigured.
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<{ auth?: object, errorResponse?: Response }>}
 */
export async function requireOwnerAuth(request, env) {
  try {
    if (!SupabaseService.isConfigured(env)) {
      return {
        errorResponse: errorResponse(request, env, 'Supabase Auth is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE')
      };
    }

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
