/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Meta WhatsApp Business Cloud API Integration Service
 */

import { D1Service } from './d1.js';

export class WhatsAppService {
  /**
   * Format customer phone number to international E.164 without leading '+'
   * Defaults to India (91) if 10-digit number is provided
   */
  static formatPhoneNumber(mobile) {
    if (!mobile) return '';
    let digits = String(mobile).replace(/\D/g, '');
    if (digits.length === 10) {
      digits = '91' + digits;
    } else if (digits.length === 11 && digits.startsWith('0')) {
      digits = '91' + digits.substring(1);
    }
    return digits;
  }

  /**
   * Dispatch Approved Booking WhatsApp Template to Customer
   */
  static async sendBookingApproved(env, booking) {
    // 1. Check customer consent
    if (booking.whatsapp_consent !== 1) {
      console.log(`[WhatsApp] Customer ${booking.booking_ref} did not opt in for WhatsApp updates. Skipping notification.`);
      return { success: false, skipped: true, reason: 'NO_CONSENT' };
    }

    const recipient = this.formatPhoneNumber(booking.customer_mobile);
    if (!recipient) {
      throw new Error('Invalid customer mobile number for WhatsApp notification');
    }

    const templateName = 'booking_approved';
    const languageCode = 'en';

    // Parameters: {{1}} Name, {{2}} Ref, {{3}} Event Date
    const parameters = [
      { type: 'text', text: booking.customer_name || 'Valued Client' },
      { type: 'text', text: booking.booking_ref },
      { type: 'text', text: booking.event_date || 'Your Event Date' }
    ];

    return await this.sendTemplateMessage(env, booking.id, recipient, 'wa_approved', templateName, languageCode, parameters);
  }

  /**
   * Dispatch Rejected Booking WhatsApp Template to Customer
   */
  static async sendBookingRejected(env, booking, reason) {
    // 1. Check customer consent
    if (booking.whatsapp_consent !== 1) {
      console.log(`[WhatsApp] Customer ${booking.booking_ref} did not opt in for WhatsApp updates. Skipping notification.`);
      return { success: false, skipped: true, reason: 'NO_CONSENT' };
    }

    const recipient = this.formatPhoneNumber(booking.customer_mobile);
    if (!recipient) {
      throw new Error('Invalid customer mobile number for WhatsApp notification');
    }

    const templateName = 'booking_rejected';
    const languageCode = 'en';

    // Parameters: {{1}} Name, {{2}} Ref, {{3}} Event Date, {{4}} Reason
    const parameters = [
      { type: 'text', text: booking.customer_name || 'Valued Client' },
      { type: 'text', text: booking.booking_ref },
      { type: 'text', text: booking.event_date || 'Your Event Date' },
      { type: 'text', text: reason || booking.rejection_reason || 'Requested date is currently unavailable' }
    ];

    return await this.sendTemplateMessage(env, booking.id, recipient, 'wa_rejected', templateName, languageCode, parameters);
  }

  /**
   * Core Helper: Send WhatsApp Template via Meta Graph API v21.0
   */
  static async sendTemplateMessage(env, bookingId, recipient, notificationType, templateName, languageCode, parameters) {
    const jobId = await D1Service.createNotificationJob(env, {
      bookingId,
      type: notificationType,
      recipient,
      status: 'pending',
      payload: { templateName, languageCode, parameters }
    });

    const phoneNumberId = env.WHATSAPP_PHONE_NUMBER_ID;
    const accessToken = env.WHATSAPP_ACCESS_TOKEN;
    const apiVersion = env.WHATSAPP_API_VERSION || 'v21.0';

    // Verify credentials are genuinely configured and not placeholder values
    const isConfigured = Boolean(
      phoneNumberId &&
      accessToken &&
      phoneNumberId !== 'REPLACE_WITH_YOUR_PHONE_NUMBER_ID' &&
      !phoneNumberId.includes('your_meta_') &&
      !accessToken.includes('your_meta_') &&
      !accessToken.includes('replace_')
    );

    if (!isConfigured) {
      const reason = 'Meta WhatsApp Cloud API credentials not configured in Worker environment';
      console.warn(`[WhatsApp] ${reason}. Notification skipped for recipient ${recipient}.`);
      await D1Service.updateNotificationJob(env, jobId, {
        status: 'failed',
        error: reason
      });
      return {
        success: false,
        jobId,
        dispatched: false,
        status: 'unconfigured',
        message: 'WhatsApp notification skipped: Meta credentials not configured'
      };
    }

    try {
      const url = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;
      const body = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: recipient,
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          components: [
            {
              type: 'body',
              parameters: parameters
            }
          ]
        }
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();

      if (res.ok && data.messages && data.messages.length > 0) {
        const messageId = data.messages[0].id;
        await D1Service.updateNotificationJob(env, jobId, {
          status: 'sent',
          externalMessageId: messageId
        });
        return { jobId, messageId, status: 'sent' };
      } else {
        const errMsg = data.error?.message || `WhatsApp API error HTTP ${res.status}`;
        await D1Service.updateNotificationJob(env, jobId, {
          status: 'failed',
          error: errMsg,
          incrementRetry: true
        });
        throw new Error(errMsg);
      }
    } catch (err) {
      console.error('[WhatsApp] Send error:', err);
      await D1Service.updateNotificationJob(env, jobId, {
        status: 'failed',
        error: err.message,
        incrementRetry: true
      });
      throw err;
    }
  }

  /**
   * Handle Inbound Meta Webhook Status Updates
   */
  static async handleWebhookEvent(env, payload) {
    if (!payload || !payload.entry) return;

    for (const entry of payload.entry) {
      for (const change of entry.changes || []) {
        if (change.field === 'messages') {
          const value = change.value;
          if (value && value.statuses) {
            for (const statusObj of value.statuses) {
              const messageId = statusObj.id;
              const status = statusObj.status; // 'sent', 'delivered', 'read', 'failed'
              let errorMsg = null;
              if (statusObj.errors && statusObj.errors.length > 0) {
                errorMsg = statusObj.errors.map(e => e.title || e.message).join('; ');
              }

              console.log(`[WhatsApp Webhook] Message ${messageId} status: ${status}`);
              await D1Service.updateNotificationByExternalId(env, messageId, {
                status: status,
                error: errorMsg
              });
            }
          }
        }
      }
    }
  }
}
