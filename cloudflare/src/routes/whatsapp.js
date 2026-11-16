/**
 * Meta WhatsApp Business Webhook Route Handlers
 */

import { errorResponse } from '../utils/response.js';
import { WhatsAppService } from '../services/whatsapp.js';
import { verifyMetaWebhookSignature } from '../utils/security.js';

/**
 * GET /api/whatsapp/webhook
 * Meta Webhook Verification Handshake
 */
export async function handleWhatsAppWebhookGet(request, env) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const expectedToken = env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === expectedToken) {
    console.log('[WhatsApp Webhook] Handshake verified successfully.');
    return new Response(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  }

  console.warn('[WhatsApp Webhook] Verification failed. Invalid verify token.');
  return new Response('Forbidden', { status: 403 });
}

/**
 * POST /api/whatsapp/webhook
 * Inbound status updates (sent, delivered, read, failed)
 */
export async function handleWhatsAppWebhookPost(request, env) {
  try {
    const rawBody = await request.text();

    // Verify HMAC SHA-256 signature if app secret configured
    if (env.WHATSAPP_APP_SECRET) {
      const signature = request.headers.get('x-hub-signature-256') || '';
      const isValid = await verifyMetaWebhookSignature(env.WHATSAPP_APP_SECRET, rawBody, signature);
      if (!isValid) {
        console.warn('[WhatsApp Webhook] Invalid HMAC signature detected.');
        return new Response('Invalid Signature', { status: 401 });
      }
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return new Response('Invalid JSON', { status: 400 });
    }

    // Process status updates
    await WhatsAppService.handleWebhookEvent(env, payload);

    // Meta expects 200 OK EVENT_RECEIVED immediately
    return new Response('EVENT_RECEIVED', {
      status: 200,
      headers: { 'Content-Type': 'text/plain' }
    });
  } catch (err) {
    console.error('[WhatsApp Webhook] Processing error:', err);
    return new Response('Internal Server Error', { status: 500 });
  }
}
