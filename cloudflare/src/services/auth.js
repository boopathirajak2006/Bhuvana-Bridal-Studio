/**
 * D1-backed studio owner authentication.
 * Password hashes and hashed session tokens are stored in D1.
 */

import { D1Service } from './d1.js';
import { generateRandomHex, verifyPassword } from '../utils/security.js';

export class AuthService {
  static async login(env, username, password, ip, userAgent) {
    if (!env.DB) throw new Error('D1 database is unavailable');
    if (!username || !password) throw new Error('Username and password are required');

    const normalizedUsername = String(username).trim().toLowerCase();
    let owner = await D1Service.findOwnerByUsername(env, normalizedUsername);
    if (!owner && normalizedUsername.includes('@')) {
      owner = await D1Service.findOwnerByUsername(env, normalizedUsername.split('@')[0]);
    }

    // Optional first-owner setup is allowed only when an explicit password secret is set.
    if (!owner) {
      await D1Service.seedInitialOwnerIfEmpty(env);
      owner = await D1Service.findOwnerByUsername(env, normalizedUsername);
    }

    if (!owner || !await verifyPassword(password, owner.password_hash, owner.salt)) {
      throw new Error('Invalid username or password');
    }

    const token = generateRandomHex(32);
    const session = await D1Service.createOwnerSession(env, owner.id, token, ip, userAgent);
    if (!session) throw new Error('Could not create owner session');

    return {
      token,
      expiresAt: session.expiresAt,
      owner: {
        id: owner.id,
        username: owner.username,
        name: owner.name,
        role: owner.role
      }
    };
  }

  static async logout(env, token) {
    if (token) await D1Service.deleteOwnerSession(env, token);
  }

  static async authenticateRequest(request, env) {
    if (!env.DB) return null;

    let token = null;
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7).trim();
    }

    if (!token) {
      const cookieHeader = request.headers.get('Cookie') || '';
      const sessionCookie = cookieHeader.split(';').map(value => value.trim())
        .find(value => value.startsWith('bbs_session='));
      if (sessionCookie) {
        token = decodeURIComponent(sessionCookie.slice('bbs_session='.length));
      }
    }
    if (!token) return null;

    const session = await D1Service.getOwnerBySessionToken(env, token);
    if (!session) return null;

    return {
      token,
      expiresAt: session.expires_at,
      owner: {
        id: session.owner_id,
        username: session.username,
        name: session.name,
        role: session.role
      }
    };
  }
}
