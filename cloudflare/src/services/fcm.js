/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Firebase Cloud Messaging (FCM HTTP v1) Push Notification Service
 * Decoupled from mandatory D1 logging so dispatch works independently.
 */

import { D1Service } from './d1.js';

export class FCMService {
  static getServiceAccount(env) {
    if (!env.FIREBASE_SERVICE_ACCOUNT_JSON) return null;
    try {
      return JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch {
      console.error('[FCM] FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON.');
      return null;
    }
  }

  /**
   * Send Google OAuth2 signed JWT to obtain access token for FCM v1
   */
  static async getGoogleAccessToken(env) {
    // If explicit OAuth access token or test mock provided
    if (env.FIREBASE_ACCESS_TOKEN) {
      return env.FIREBASE_ACCESS_TOKEN;
    }

    const serviceAccount = this.getServiceAccount(env);
    const projectId = env.FIREBASE_PROJECT_ID || serviceAccount?.project_id;
    const clientEmail = env.FIREBASE_CLIENT_EMAIL || serviceAccount?.client_email;
    const privateKeyPem = env.FIREBASE_PRIVATE_KEY || serviceAccount?.private_key;

    if (!projectId || !clientEmail || !privateKeyPem) {
      console.warn('[FCM] Firebase service account credentials not fully configured in environment.');
      return null;
    }

    try {
      // Build JWT Header & Claims
      const header = { alg: 'RS256', typ: 'JWT' };
      const now = Math.floor(Date.now() / 1000);
      const claims = {
        iss: clientEmail,
        scope: 'https://www.googleapis.com/auth/firebase.messaging',
        aud: 'https://oauth2.googleapis.com/token',
        exp: now + 3600,
        iat: now
      };

      const b64Url = (obj) => {
        const str = typeof obj === 'string' ? obj : JSON.stringify(obj);
        const b64 = btoa(unescape(encodeURIComponent(str)));
        return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      };

      const unsignedToken = `${b64Url(header)}.${b64Url(claims)}`;

      // Import RS256 Private Key
      const cleanKey = privateKeyPem
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\\n/g, '')
        .replace(/\s+/g, '');

      const binaryDer = Uint8Array.from(atob(cleanKey), c => c.charCodeAt(0));
      const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryDer.buffer,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
      );

      const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(unsignedToken)
      );

      const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

      const assertion = `${unsignedToken}.${signatureB64}`;

      // Exchange JWT Assertion for Google Access Token
      const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion
        })
      });

      if (!tokenRes.ok) {
        const errText = await tokenRes.text();
        console.error('[FCM] Google OAuth token request failed:', errText);
        return null;
      }

      const tokenData = await tokenRes.json();
      return tokenData.access_token;
    } catch (err) {
      console.error('[FCM] Error generating Google OAuth token:', err);
      return null;
    }
  }

  /**
   * Dispatch New Booking Push Notification to Owner Devices
   * Decoupled: Works seamlessly with or without D1 binding
   */
  static async notifyNewBooking(env, booking) {
    let devices = [];
    if (env.DB) {
      try {
        devices = await D1Service.listOwnerDevices(env);
      } catch (e) {
        console.warn('[FCM] Non-blocking device list lookup warning:', e);
      }
    }

    if (!devices || devices.length === 0) {
      console.log('[FCM] No registered owner devices found for push notification.');
      return;
    }

    const title = 'New Booking Received!';
    const body = 'A new customer booking enquiry has arrived. Tap to view it.';
    const clickUrl = `https://boopathirajak2006.github.io/Bhuvana-Bridal-Studio/studio-inbox.html?ref=${encodeURIComponent(booking.booking_ref)}`;

    const accessToken = await this.getGoogleAccessToken(env);
    const projectId = env.FIREBASE_PROJECT_ID || this.getServiceAccount(env)?.project_id;

    for (const device of devices) {
      let jobId = null;
      if (env.DB) {
        try {
          jobId = await D1Service.createNotificationJob(env, {
            bookingId: booking.id,
            type: 'fcm_new_booking',
            recipient: device.fcm_token,
            status: 'pending',
            payload: { title, body, clickUrl }
          });
        } catch (e) {
          // Non-blocking job logging
        }
      }

      if (!accessToken || !projectId || projectId === 'your-firebase-project-id' || projectId.includes('your-')) {
        const reason = 'Firebase FCM service account credentials not configured in Worker environment';
        console.warn(`[FCM] ${reason}. Push skipped for device ${device.device_name || device.id}.`);
        if (env.DB && jobId) {
          await D1Service.updateNotificationJob(env, jobId, {
            status: 'failed',
            error: reason
          }).catch(() => {});
        }
        continue;
      }

      try {
        const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
        const payload = {
          message: {
            token: device.fcm_token,
            notification: {
              title,
              body
            },
            data: {
              booking_id: String(booking.id),
              booking_ref: String(booking.booking_ref),
              click_action: clickUrl,
              url: clickUrl
            },
            webpush: {
              fcm_options: {
                link: clickUrl
              }
            }
          }
        };

        const res = await fetch(fcmUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          const resData = await res.json();
          if (env.DB && jobId) {
            await D1Service.updateNotificationJob(env, jobId, {
              status: 'sent',
              externalMessageId: resData.name
            }).catch(() => {});
          }
        } else {
          const errData = await res.json().catch(() => ({}));
          const errMsg = errData.error?.message || `FCM HTTP ${res.status}`;
          if (env.DB && jobId) {
            await D1Service.updateNotificationJob(env, jobId, {
              status: 'failed',
              error: errMsg,
              incrementRetry: true
            }).catch(() => {});
          }

          // Unregister stale token if invalid
          if (errMsg.includes('UNREGISTERED') || errMsg.includes('INVALID_ARGUMENT')) {
            console.warn(`[FCM] Removing stale/unregistered token for device ${device.id}`);
            if (env.DB) {
              await D1Service.removeInvalidDevice(env, device.fcm_token).catch(() => {});
            }
          }
        }
      } catch (err) {
        console.error('[FCM] Error dispatching push notification:', err);
        if (env.DB && jobId) {
          await D1Service.updateNotificationJob(env, jobId, {
            status: 'failed',
            error: err.message,
            incrementRetry: true
          }).catch(() => {});
        }
      }
    }
  }
}
