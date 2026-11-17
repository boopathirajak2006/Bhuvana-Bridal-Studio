/** Owner routes backed exclusively by D1 and Cloudinary. */

import { jsonResponse, errorResponse, setCookieHeader, clearCookieHeader } from '../utils/response.js';
import { AuthService } from '../services/auth.js';
import { CloudinaryService } from '../services/cloudinary.js';
import { D1Service } from '../services/d1.js';
import { WhatsAppService } from '../services/whatsapp.js';
import { validateRejectionPayload } from '../middleware/validation.js';

export async function handleAdminLogin(request, env) {
  try {
    let body;
    try { body = await request.json(); }
    catch { return errorResponse(request, env, 'Invalid JSON body', 400, 'INVALID_JSON'); }

    const { username, password } = body || {};
    if (!username || !password) {
      return errorResponse(request, env, 'Username and password are required', 400, 'MISSING_CREDENTIALS');
    }
    if (!env.DB) return errorResponse(request, env, 'D1 database is unavailable', 503, 'SERVICE_UNAVAILABLE');

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    let result;
    try { result = await AuthService.login(env, username, password, ip, userAgent); }
    catch (err) {
      const status = /database|session/i.test(err.message) ? 503 : 401;
      return errorResponse(request, env, status === 401 ? 'Invalid username or password' : 'Owner authentication is unavailable', status, status === 401 ? 'INVALID_CREDENTIALS' : 'SERVICE_UNAVAILABLE');
    }

    return jsonResponse(request, env, {
      success: true,
      message: 'Login successful',
      token: result.token,
      expiresAt: result.expiresAt,
      owner: result.owner
    }, 200, { 'Set-Cookie': setCookieHeader('bbs_session', result.token) });
  } catch (err) {
    console.error('[Route: Login] Error:', err);
    return errorResponse(request, env, 'Login processing error', 500, 'INTERNAL_ERROR');
  }
}

export async function handleAdminLogout(request, env, auth) {
  try {
    if (auth?.token) await AuthService.logout(env, auth.token);
    return jsonResponse(request, env, { success: true, message: 'Logged out successfully' }, 200,
      { 'Set-Cookie': clearCookieHeader('bbs_session') });
  } catch (err) {
    console.error('[Route: Logout] Error:', err);
    return errorResponse(request, env, 'Logout processing error', 500, 'INTERNAL_ERROR');
  }
}

export async function handleAdminMe(request, env, auth) {
  return jsonResponse(request, env, { success: true, owner: auth.owner, expiresAt: auth.expiresAt });
}

export async function handleChangePassword(request, env, auth) {
  try {
    let body;
    try { body = await request.json(); }
    catch { return errorResponse(request, env, 'Invalid JSON body', 400, 'INVALID_JSON'); }
    if (!body?.currentPassword || !body?.newPassword) {
      return errorResponse(request, env, 'Current and new passwords are required', 400, 'MISSING_CREDENTIALS');
    }
    await D1Service.updateOwnerPassword(env, auth.owner.id, body.currentPassword, body.newPassword, auth.token);
    return jsonResponse(request, env, { success: true, message: 'Owner password updated successfully' });
  } catch (err) {
    const status = /incorrect/i.test(err.message) ? 401 : 400;
    return errorResponse(request, env, err.message || 'Failed to update password', status, 'PASSWORD_UPDATE_FAILED');
  }
}

export async function handleListBookings(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'D1 database is unavailable', 503, 'SERVICE_UNAVAILABLE');
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('search') || '';
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10) || 50, 1), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10) || 0, 0);
    const result = await D1Service.listBookings(env, { status, search, limit, offset });
    return jsonResponse(request, env, { success: true, bookings: result.bookings, total: result.total, limit, offset });
  } catch (err) {
    console.error('[Route: ListBookings] Error:', err);
    return errorResponse(request, env, 'Failed to retrieve bookings', 500, 'INTERNAL_ERROR');
  }
}

export async function handleGetStats(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'D1 database is unavailable', 503, 'SERVICE_UNAVAILABLE');
    return jsonResponse(request, env, { success: true, metrics: await D1Service.getMetrics(env) });
  } catch (err) {
    console.error('[Route: Stats] Error:', err);
    return errorResponse(request, env, 'Failed to retrieve booking statistics', 500, 'INTERNAL_ERROR');
  }
}

async function findBooking(env, idOrReference) {
  return await D1Service.getBookingById(env, idOrReference) || await D1Service.getBookingByRef(env, idOrReference);
}

export async function handleGetBookingDetails(request, env, auth, bookingId) {
  try {
    const booking = await findBooking(env, bookingId);
    if (!booking) return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    const [auditLogs, notificationJobs] = await Promise.all([
      D1Service.getAuditLogsForBooking(env, booking.id),
      D1Service.getNotificationJobsForBooking(env, booking.id)
    ]);
    return jsonResponse(request, env, { success: true, booking, auditLogs, notificationJobs });
  } catch (err) {
    console.error('[Route: BookingDetails] Error:', err);
    return errorResponse(request, env, 'Failed to fetch booking details', 500, 'INTERNAL_ERROR');
  }
}

export async function handleGetBookingPoster(request, env, auth, bookingId) {
  try {
    const booking = await findBooking(env, bookingId);
    if (!booking) return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    if (!booking.poster_public_id) return errorResponse(request, env, 'No poster image stored for this booking', 404, 'NOT_FOUND');

    const image = await CloudinaryService.getPosterStream(env, booking);
    if (!image?.body) return errorResponse(request, env, 'Poster image file missing from Cloudinary', 404, 'NOT_FOUND');
    const headers = new Headers({
      'Content-Type': image.headers.get('content-type') || 'image/png',
      'Cache-Control': 'private, no-store',
      'Content-Disposition': `inline; filename="${booking.booking_ref || 'poster'}.png"`
    });
    const contentLength = image.headers.get('content-length');
    const etag = image.headers.get('etag');
    if (contentLength) headers.set('Content-Length', contentLength);
    if (etag) headers.set('ETag', etag);
    const origin = request.headers.get('Origin');
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
      headers.set('Vary', 'Origin');
    }
    return new Response(image.body, { status: 200, headers });
  } catch (err) {
    console.error('[Route: BookingPoster] Error:', err);
    return errorResponse(request, env, 'Failed to retrieve booking poster', 500, 'INTERNAL_ERROR');
  }
}

export async function handleApproveBooking(request, env, auth, bookingId) {
  try {
    const booking = await findBooking(env, bookingId);
    if (!booking) return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    if (booking.booking_status !== 'pending') return errorResponse(request, env, `Cannot approve booking in status "${booking.booking_status}"`, 409, 'INVALID_STATUS');
    const approvedBooking = await D1Service.approveBooking(env, booking.id, auth.owner);
    let whatsappResult = { success: false, skipped: true, reason: 'MANUAL_SEND_ONLY' };
    if (env.WHATSAPP_AUTOMATIC_SEND === 'true') {
      try { whatsappResult = await WhatsAppService.sendBookingApproved(env, approvedBooking); }
      catch (err) { console.warn('[Route: Approve] WhatsApp dispatch error:', err); whatsappResult = { success: false, error: 'Notification could not be sent' }; }
    }
    return jsonResponse(request, env, { success: true, message: `Booking ${approvedBooking.booking_ref} approved successfully`, booking: approvedBooking, whatsappResult });
  } catch (err) {
    console.error('[Route: ApproveBooking] Error:', err);
    return errorResponse(request, env, 'Failed to approve booking', 500, 'INTERNAL_ERROR');
  }
}

export async function handleRejectBooking(request, env, auth, bookingId) {
  try {
    let body;
    try { body = await request.json(); }
    catch { return errorResponse(request, env, 'Rejection requires a JSON body with reason', 400, 'INVALID_JSON'); }
    const validation = validateRejectionPayload(body);
    if (!validation.valid) return errorResponse(request, env, validation.errors.join('; '), 400, 'VALIDATION_FAILED');
    const booking = await findBooking(env, bookingId);
    if (!booking) return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    if (booking.booking_status !== 'pending') return errorResponse(request, env, `Cannot reject booking in status "${booking.booking_status}"`, 409, 'INVALID_STATUS');
    const rejectedBooking = await D1Service.rejectBooking(env, booking.id, auth.owner, validation.sanitized.reason, validation.sanitized.notes);
    let whatsappResult = { success: false, skipped: true, reason: 'MANUAL_SEND_ONLY' };
    if (env.WHATSAPP_AUTOMATIC_SEND === 'true') {
      try { whatsappResult = await WhatsAppService.sendBookingRejected(env, rejectedBooking, validation.sanitized.reason); }
      catch (err) { console.warn('[Route: Reject] WhatsApp dispatch error:', err); whatsappResult = { success: false, error: 'Notification could not be sent' }; }
    }
    return jsonResponse(request, env, { success: true, message: `Booking ${rejectedBooking.booking_ref} marked as rejected`, booking: rejectedBooking, whatsappResult });
  } catch (err) {
    console.error('[Route: RejectBooking] Error:', err);
    return errorResponse(request, env, 'Failed to reject booking', 500, 'INTERNAL_ERROR');
  }
}

export async function handleExportBookings(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'D1 database is unavailable', 503, 'SERVICE_UNAVAILABLE');
    const allBookings = await D1Service.exportAllBookings(env);
    const filename = `bhuvana_bookings_backup_${new Date().toISOString().split('T')[0]}.json`;
    return new Response(JSON.stringify(allBookings, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store'
      }
    });
  } catch (err) {
    console.error('[Route: ExportBookings] Error:', err);
    return errorResponse(request, env, 'Failed to export bookings', 500, 'INTERNAL_ERROR');
  }
}

export async function handleRetryNotification(request, env, auth, jobId) {
  try {
    const job = await D1Service.getNotificationJobById(env, jobId);
    if (!job) return errorResponse(request, env, `Notification job ${jobId} not found`, 404, 'NOT_FOUND');
    await D1Service.updateNotificationJob(env, jobId, { status: 'pending', incrementRetry: true });
    return jsonResponse(request, env, { success: true, message: `Notification job ${jobId} scheduled for retry` });
  } catch (err) {
    console.error('[Route: RetryNotification] Error:', err);
    return errorResponse(request, env, 'Failed to retry notification job', 500, 'INTERNAL_ERROR');
  }
}
