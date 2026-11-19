/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Cryptographic, Security & Input Sanitization Utilities
 */

const encoder = new TextEncoder();

/**
 * Generate a cryptographically secure random hex string
 */
export function generateRandomHex(bytes = 32) {
  const array = new Uint8Array(bytes);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate standard UUID v4
 */
export function generateUUID() {
  if (crypto.randomUUID) return crypto.randomUUID();
  const hex = generateRandomHex(16);
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(13, 16),
    ((parseInt(hex.substring(16, 18), 16) & 0x3f) | 0x80).toString(16) + hex.substring(18, 20),
    hex.substring(20, 32)
  ].join('-');
}

/**
 * Hash a plain string using SHA-256
 */
export async function sha256(str) {
  const data = encoder.encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a salt for PBKDF2
 */
export function generateSalt() {
  return generateRandomHex(16);
}

/**
 * Hash password using PBKDF2 with SHA-256 (100,000 iterations)
 */
export async function hashPassword(password, saltHex) {
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    256
  );

  return Array.from(new Uint8Array(derivedKey))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Constant-time comparison to prevent timing attacks
 */
export function constantTimeCompare(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify password against stored hash & salt
 */
export async function verifyPassword(password, storedHash, saltHex) {
  try {
    const computedHash = await hashPassword(password, saltHex);
    return constantTimeCompare(computedHash, storedHash);
  } catch (err) {
    console.error('Password verification error:', err);
    return false;
  }
}

/**
 * Validate PNG file header magic bytes
 * Standard PNG signature: 89 50 4E 47 0D 0A 1A 0A
 */
export function validatePngMagicBytes(arrayBuffer) {
  if (!arrayBuffer || arrayBuffer.byteLength < 8) return false;
  const header = new Uint8Array(arrayBuffer, 0, 8);
  const pngSignature = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
  for (let i = 0; i < 8; i++) {
    if (header[i] !== pngSignature[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Verify Meta WhatsApp webhook signature (x-hub-signature-256)
 */
export async function verifyMetaWebhookSignature(appSecret, payloadString, signatureHeader) {
  if (!appSecret || !signatureHeader) return false;
  try {
    const expectedPrefix = 'sha256=';
    if (!signatureHeader.startsWith(expectedPrefix)) return false;
    const providedSignature = signatureHeader.substring(expectedPrefix.length);

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(appSecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payloadString));
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return constantTimeCompare(computedSignature, providedSignature);
  } catch (e) {
    console.error('Meta webhook signature validation error:', e);
    return false;
  }
}

/**
 * Generate Unique Booking Reference
 * Format: BBS-YYYY-XXXXXX (6 alphanumeric uppercase chars, avoiding ambiguous I, O, 1, 0)
 */
export function generateBookingRef() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const array = new Uint8Array(6);
  crypto.getRandomValues(array);
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[array[i] % chars.length];
  }
  return `BBS-${new Date().getFullYear()}-${code}`;
}

/**
 * Sanitize text input to prevent HTML/XSS injection
 */
export function sanitizeInput(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
