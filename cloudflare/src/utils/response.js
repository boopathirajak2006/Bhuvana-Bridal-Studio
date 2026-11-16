/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Standard HTTP & CORS Response Utilities
 */

/**
 * Returns allowed origin if matching whitelist, or default
 */
export function getCorsHeaders(request, env) {
  const origin = (request && request.headers) ? request.headers.get('Origin') || '' : '';
  const configured = ((env && env.CORS_ORIGINS) || 'https://boopathirajak2006.github.io,http://localhost:3000,http://127.0.0.1:3000,http://localhost:8787')
    .split(',')
    .map(o => o.trim().toLowerCase());

  let allowedOrigin = 'https://boopathirajak2006.github.io';
  if (origin) {
    const originLower = origin.toLowerCase();
    if (configured.includes(originLower) ||
        originLower.endsWith('.github.io') ||
        originLower.includes('localhost') ||
        originLower.includes('127.0.0.1')) {
      allowedOrigin = origin;
    }
  }

  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Idempotency-Key',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

/**
 * Handles CORS preflight OPTIONS request
 */
export function handleOptions(request, env) {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(request, env)
  });
}

/**
 * Standard JSON Response with automatic CORS headers
 */
export function jsonResponse(request, env, data, status = 200, extraHeaders = {}) {
  const cors = getCorsHeaders(request, env);
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...cors,
      ...extraHeaders
    }
  });
}

/**
 * Standard Error Response with automatic CORS headers
 */
export function errorResponse(request, env, message, status = 400, code = 'BAD_REQUEST', details = null, extraHeaders = {}) {
  const cors = getCorsHeaders(request, env);
  return new Response(JSON.stringify({
    success: false,
    error: message,
    code,
    details,
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...cors,
      ...extraHeaders
    }
  });
}

export const jsonSuccess = (data, status, request, env, extraHeaders) => jsonResponse(request, env, { success: true, data, timestamp: new Date().toISOString() }, status, extraHeaders);
export const jsonError = (message, status, code, details, request, env, extraHeaders) => errorResponse(request, env, message, status, code, details, extraHeaders);

/**
 * Generates Set-Cookie header string for session token
 */
export function setCookieHeader(name, value, maxAgeSeconds = 7 * 24 * 60 * 60) {
  return `${name}=${encodeURIComponent(value)}; Max-Age=${maxAgeSeconds}; Path=/; HttpOnly; Secure; SameSite=Lax`;
}

/**
 * Generates Set-Cookie header string to clear cookie
 */
export function clearCookieHeader(name) {
  return `${name}=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax`;
}
