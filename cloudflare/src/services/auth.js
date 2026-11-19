/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Studio Owner Authentication Service
 * 
 * Authentication Mechanism: Cloudflare D1 Database + PBKDF2 (SHA-256, 100,000 iterations)
 * Session Management: Secure Server-Side Sessions with SHA-256 Token Hashes in D1.
 */

import { D1Service } from './d1.js';
import { verifyPassword, generateRandomHex, generateSalt, hashPassword } from '../utils/security.js';

export class AuthService {
  /**
   * Authenticate studio owner with username and password via Cloudflare D1
   */
  static async login(env, username, password, ip, userAgent) {
    if (!username || !password) {
      throw new Error('Username and password are required');
    }

    if (!env.DB) {
      throw new Error('Database service is not configured or unavailable');
    }

    const cleanUsername = String(username).toLowerCase().trim();

    // Check if initial owner setup is needed (only seeds if owners table is empty)
    await D1Service.seedInitialOwnerIfEmpty(env);

    const owner = await D1Service.findOwnerByUsername(env, cleanUsername);
    if (!owner || !owner.password_hash || !owner.salt) {
      throw new Error('Invalid username or password');
    }

    const isValid = await verifyPassword(password, owner.password_hash, owner.salt);
    if (!isValid) {
      throw new Error('Invalid username or password');
    }

    // Update last login timestamp in D1
    const nowIso = new Date().toISOString();
    try {
      await env.DB.prepare('UPDATE owners SET last_login_at = ?, updated_at = ? WHERE id = ?')
        .bind(nowIso, nowIso, owner.id)
        .run();
    } catch (e) {
      // Non-blocking
    }

    // Generate secure 64-character session token
    const token = generateRandomHex(32);
    const session = await D1Service.createOwnerSession(env, owner.id, token, ip, userAgent);

    return {
      token: session.token,
      expiresAt: session.expiresAt,
      owner: {
        id: owner.id,
        username: owner.username,
        name: owner.name,
        role: owner.role || 'owner'
      }
    };
  }

  /**
   * Log out owner by revoking session in D1
   */
  static async logout(env, token) {
    if (!env.DB || !token) return;
    await D1Service.deleteOwnerSession(env, token);
  }

  /**
   * Securely update owner password using PBKDF2 with a fresh salt
   */
  static async changePassword(env, ownerId, currentPassword, newPassword) {
    if (!env.DB) {
      throw new Error('Database service is not configured or unavailable');
    }
    if (!currentPassword || !newPassword) {
      throw new Error('Current password and new password are required');
    }
    if (newPassword.length < 8) {
      throw new Error('New password must be at least 8 characters long');
    }

    const owner = await env.DB.prepare('SELECT * FROM owners WHERE id = ?').bind(ownerId).first();
    if (!owner || !owner.password_hash || !owner.salt) {
      throw new Error('Owner account not found');
    }

    const isValid = await verifyPassword(currentPassword, owner.password_hash, owner.salt);
    if (!isValid) {
      throw new Error('Current password does not match');
    }

    const newSalt = generateSalt();
    const newHash = await hashPassword(newPassword, newSalt);
    const nowIso = new Date().toISOString();

    await env.DB.prepare('UPDATE owners SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?')
      .bind(newHash, newSalt, nowIso, ownerId)
      .run();

    return true;
  }

  /**
   * Extract and verify session token from Request via Cloudflare D1
   */
  static async authenticateRequest(request, env) {
    if (!env.DB) {
      return null;
    }

    let token = null;

    // 1. Check Authorization header (Bearer <token>)
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 2. Check Cookie header (bbs_session=<token>)
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

    // Verify session token against D1 owner_sessions
    const session = await D1Service.getOwnerBySessionToken(env, token);
    if (!session) return null;

    return {
      token,
      owner: {
        id: session.owner_id,
        username: session.username,
        name: session.name,
        role: session.role || 'owner'
      },
      expiresAt: session.expires_at
    };
  }
}
