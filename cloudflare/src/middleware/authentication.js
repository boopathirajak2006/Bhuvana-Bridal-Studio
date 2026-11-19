/** Requires an authenticated owner with an unexpired D1-backed session. */

import { AuthService } from '../services/auth.js';
import { errorResponse } from '../utils/response.js';

export async function requireOwnerAuth(request, env) {
  if (!env.DB) {
    return {
      errorResponse: errorResponse(request, env, 'D1 database is unavailable', 503, 'SERVICE_UNAVAILABLE')
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
