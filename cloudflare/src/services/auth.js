/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Owner Authentication & Session Management Service
 */

import { D1Service } from './d1.js';
import { verifyPassword, generateRandomHex } from '../utils/security.js';

export class AuthService {
  /**
   * Authenticate owner by username and password
   */
  static async login(env, username, password, ip, userAgent) {
    // Seed account if first time running
    await D1Service.seedInitialOwnerIfEmpty(env);

    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    const owner = await D1Service.findOwnerByUsername(env, username);
    if (!owner) {
      throw new Error('Invalid username or password');
    }

    const isValid = await verifyPassword(password, owner.password_hash, owner.salt);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Generate secure session token (32 bytes random hex)
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

  /**
   * Log out owner by revoking session
   */
  static async logout(env, token) {
    if (!token) return;
    await D1Service.deleteOwnerSession(env, token);
  }

  /**
   * Extract and verify session token from Request
   * Supports both 'bbs_session' Cookie and 'Authorization: Bearer <token>' header
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

    const ownerRecord = await D1Service.getOwnerBySessionToken(env, token);
    if (!ownerRecord) return null;

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
