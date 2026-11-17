/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Studio Owner Authentication Service
 * 
 * Authentication Mechanism: Supabase Auth (GoTrue) + RBAC via public.user_roles ONLY.
 * No D1 session fallback is permitted.
 */

import { SupabaseService } from './supabase.js';

export class AuthService {
  /**
   * Authenticate studio owner with username/email and password via Supabase Auth
   */
  static async login(env, username, password, ip, userAgent) {
    if (!username || !password) {
      throw new Error('Username or email and password are required');
    }

    if (!SupabaseService.isConfigured(env)) {
      throw new Error('Supabase Auth is not configured. Please configure SUPABASE_URL and SUPABASE_ANON_KEY.');
    }

    // Authenticate exclusively via Supabase Auth
    return await SupabaseService.loginOwner(env, username, password);
  }

  /**
   * Log out owner by revoking session
   */
  static async logout(env, token) {
    // Supabase tokens are stateless JWTs on the backend; client clears local token
  }

  /**
   * Extract and verify session token from Request
   * Validates Supabase JWT Bearer token or cookie via Supabase Auth exclusively
   */
  static async authenticateRequest(request, env) {
    if (!SupabaseService.isConfigured(env)) {
      return null;
    }

    let token = null;

    // 1. Check Authorization header
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check Cookie header
    if (!token) {
      const cookieHeader = request.headers.get('Cookie');
      if (cookieHeader) {
        const cookies = cookieHeader.split(';').map(c => c.trim());
        const sessionCookie = cookies.find(c => c.startsWith('bbs_session='));
        if (sessionCookie) {
          token = sessionCookie.split('=')[1];
        }
      }
    }

    if (!token) return null;

    // Verify exclusively via Supabase Auth
    return await SupabaseService.verifyOwnerToken(env, token);
  }
}
