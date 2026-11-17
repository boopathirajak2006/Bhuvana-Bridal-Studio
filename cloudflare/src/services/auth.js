/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Studio Owner Authentication Service
 * 
 * Primary Authentication: Supabase Auth (GoTrue) + RBAC via public.user_roles
 * Secondary / Fallback: D1 Session Storage (if Supabase unconfigured)
 */

import { SupabaseService } from './supabase.js';
import { D1Service } from './d1.js';
import { verifyPassword, generateRandomHex } from '../utils/security.js';

export class AuthService {
  /**
   * Authenticate studio owner with username/email and password
   */
  static async login(env, username, password, ip, userAgent) {
    if (!username || !password) {
      throw new Error('Username or email and password are required');
    }

    // 1. Primary: Authenticate via Supabase Auth if configured
    if (SupabaseService.isConfigured(env)) {
      try {
        const result = await SupabaseService.loginOwner(env, username, password);
        return result;
      } catch (supaErr) {
        // If Supabase rejected the credentials or RBAC, bubble up error
        throw supaErr;
      }
    }

    // 2. Fallback: Authenticate via Cloudflare D1 if configured
    if (env.DB) {
      await D1Service.seedInitialOwnerIfEmpty(env);

      const owner = await D1Service.findOwnerByUsername(env, username);
      if (!owner) {
        throw new Error('Invalid username or password');
      }

      const isValid = await verifyPassword(password, owner.password_hash, owner.salt);
      if (!isValid) {
        throw new Error('Invalid username or password');
      }

      const sessionToken = generateRandomHex(32);
      const session = await D1Service.createOwnerSession(env, owner.id, sessionToken, ip, userAgent);

      return {
        token: session.token,
        expiresAt: session.expiresAt,
        owner: {
          id: owner.id,
          username: owner.username,
          name: owner.name,
          role: owner.role
        }
      };
    }

    throw new Error('Authentication service is not configured. Please configure Supabase Auth.');
  }

  /**
   * Log out owner by revoking session
   */
  static async logout(env, token) {
    if (!token) return;
    if (env.DB) {
      try {
        await D1Service.deleteOwnerSession(env, token);
      } catch (e) {
        console.warn('[AuthService] D1 logout warning:', e);
      }
    }
  }

  /**
   * Extract and verify session token from Request
   * Validates Supabase JWT Bearer token or legacy session cookie
   */
  static async authenticateRequest(request, env) {
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

    // Primary: Verify via Supabase Auth
    if (SupabaseService.isConfigured(env)) {
      const supaAuth = await SupabaseService.verifyOwnerToken(env, token);
      if (supaAuth) {
        return supaAuth;
      }
    }

    // Secondary / Fallback: Verify via D1 session
    if (env.DB) {
      const ownerRecord = await D1Service.getOwnerBySessionToken(env, token);
      if (ownerRecord) {
        return {
          token,
          owner: {
            id: ownerRecord.owner_id,
            username: ownerRecord.username,
            name: ownerRecord.name,
            role: ownerRecord.role
          },
          sessionId: ownerRecord.session_id,
          expiresAt: ownerRecord.expires_at
        };
      }
    }

    return null;
  }
}
