/**
 * Notifications & Device Registration Routes
 */

import { jsonResponse, errorResponse } from '../utils/response.js';
import { D1Service } from '../services/d1.js';

/**
 * POST /api/admin/devices/register
 * Registers an owner browser FCM push token
 */
export async function handleRegisterDevice(request, env, auth) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(request, env, 'Invalid JSON body', 400, 'INVALID_JSON');
    }

    const { fcmToken, deviceName } = body || {};
    if (!fcmToken || typeof fcmToken !== 'string') {
      return errorResponse(request, env, 'FCM token is required', 400, 'MISSING_TOKEN');
    }

    await D1Service.registerOwnerDevice(env, auth.owner.id, fcmToken.trim(), deviceName || 'Owner Browser');

    return jsonResponse(request, env, {
      success: true,
      message: 'Owner device successfully registered for push notifications'
    });
  } catch (err) {
    console.error('[Route: RegisterDevice] Error:', err);
    return errorResponse(request, env, 'Failed to register device', 500, 'INTERNAL_ERROR');
  }
}
