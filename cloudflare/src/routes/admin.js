/**
 * Protected Studio Owner / Admin Routes
 * Handles login, session management, booking reviews, private poster streaming from R2, and exports.
 * 
 * Storage: Cloudflare R2 (Private bucket streaming)
 * Database & Auth: Supabase Postgres & Supabase Auth
 */

import { jsonResponse, errorResponse, setCookieHeader, clearCookieHeader } from '../utils/response.js';
import { AuthService } from '../services/auth.js';
import { SupabaseService } from '../services/supabase.js';
import { R2Service } from '../services/r2.js';
import { D1Service } from '../services/d1.js';
import { WhatsAppService } from '../services/whatsapp.js';
import { validateRejectionPayload } from '../middleware/validation.js';

/**
 * POST /api/auth/login
 */
export async function handleAdminLogin(request, env) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(request, env, 'Invalid JSON body', 400, 'INVALID_JSON');
    }

    const { username, password } = body || {};
    if (!username || !password) {
      return errorResponse(request, env, 'Username/Email and password are required', 400, 'MISSING_CREDENTIALS');
    }

    const ip = request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || '127.0.0.1';
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    let result;
    try {
      result = await AuthService.login(env, username, password, ip, userAgent);
    } catch (authErr) {
      return errorResponse(request, env, authErr.message || 'Invalid username or password', 401, 'INVALID_CREDENTIALS');
    }

    const cookieHeader = setCookieHeader('bbs_session', result.token, 7 * 24 * 60 * 60);

    return jsonResponse(request, env, {
      success: true,
      message: 'Login successful',
      token: result.token,
      refreshToken: result.refreshToken,
      expiresAt: result.expiresAt,
      owner: result.owner
    }, 200, {
      'Set-Cookie': cookieHeader
    });
  } catch (err) {
    console.error('[Route: Login] Error:', err);
    return errorResponse(request, env, 'Login processing error', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/auth/logout
 */
export async function handleAdminLogout(request, env, auth) {
  try {
    if (auth && auth.token) {
      await AuthService.logout(env, auth.token);
    }

    const cookieHeader = clearCookieHeader('bbs_session');
    return jsonResponse(request, env, {
      success: true,
      message: 'Logged out successfully'
    }, 200, {
      'Set-Cookie': cookieHeader
    });
  } catch (err) {
    console.error('[Route: Logout] Error:', err);
    return errorResponse(request, env, 'Logout processing error', 500, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/auth/me
 */
export async function handleAdminMe(request, env, auth) {
  return jsonResponse(request, env, {
    success: true,
    owner: auth.owner,
    expiresAt: auth.expiresAt
  });
}

/**
 * GET /api/admin/bookings
 */
export async function handleListBookings(request, env, auth) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('search') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

    let result;
    if (SupabaseService.isConfigured(env)) {
      result = await SupabaseService.listBookings(env, { status, search, limit, offset });
    } else if (env.DB) {
      result = await D1Service.listBookings(env, { status, search, limit, offset });
    } else {
      throw new Error('Database backend is not configured');
    }

    return jsonResponse(request, env, {
      success: true,
      bookings: result.bookings,
      total: result.total,
      limit,
      offset
    });
  } catch (err) {
    console.error('[Route: ListBookings] Error:', err);
    return errorResponse(request, env, 'Failed to retrieve bookings', 500, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/admin/bookings/stats
 */
export async function handleGetStats(request, env, auth) {
  try {
    let metrics;
    if (SupabaseService.isConfigured(env)) {
      metrics = await SupabaseService.getMetrics(env);
    } else if (env.DB) {
      metrics = await D1Service.getMetrics(env);
    } else {
      throw new Error('Database backend is not configured');
    }

    return jsonResponse(request, env, {
      success: true,
      metrics
    });
  } catch (err) {
    console.error('[Route: Stats] Error:', err);
    return errorResponse(request, env, 'Failed to retrieve booking statistics', 500, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/admin/bookings/:id
 */
export async function handleGetBookingDetails(request, env, auth, bookingId) {
  try {
    let booking;
    if (SupabaseService.isConfigured(env)) {
      booking = await SupabaseService.getBookingById(env, bookingId);
    } else if (env.DB) {
      booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
    }

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    let auditLogs = [];
    let notificationJobs = [];
    if (env.DB) {
      try {
        auditLogs = await D1Service.getAuditLogsForBooking(env, booking.id).catch(() => []);
        notificationJobs = await D1Service.listNotificationJobsForBooking(env, booking.id).catch(() => []);
      } catch (e) {
        // non-blocking
      }
    }

    return jsonResponse(request, env, {
      success: true,
      booking,
      auditLogs,
      notificationJobs
    });
  } catch (err) {
    console.error('[Route: BookingDetails] Error:', err);
    return errorResponse(request, env, 'Failed to fetch booking details', 500, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/admin/bookings/:id/poster
 * Streams the private booking poster PNG from Cloudflare R2 storage to authenticated owner only.
 * Private bucket, zero direct public exposure.
 */
export async function handleGetBookingPoster(request, env, auth, bookingId) {
  try {
    let booking;
    if (SupabaseService.isConfigured(env)) {
      booking = await SupabaseService.getBookingById(env, bookingId);
    }
    if (!booking && env.DB) {
      booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
    }

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    const key = booking.poster_public_id || booking.poster_key || booking.booking_ref;
    if (!key) {
      return errorResponse(request, env, 'No poster image stored for this booking', 404, 'NOT_FOUND');
    }

    const r2Object = await R2Service.getPoster(env, key);
    if (!r2Object || !r2Object.body) {
      return errorResponse(request, env, 'Poster image file missing from R2 storage', 404, 'NOT_FOUND');
    }

    const headers = new Headers();
    headers.set('Content-Type', 'image/png');
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('Content-Disposition', `inline; filename="${booking.booking_ref}.png"`);

    if (r2Object.size) {
      headers.set('Content-Length', String(r2Object.size));
    }
    if (r2Object.httpEtag) {
      headers.set('ETag', r2Object.httpEtag);
    }

    // CORS headers for authenticated owner requests
    const origin = request.headers.get('Origin');
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return new Response(r2Object.body, { headers });
  } catch (err) {
    console.error('[Route: BookingPoster] Error:', err);
    return errorResponse(request, env, 'Failed to retrieve poster image from R2', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/admin/bookings/:id/approve
 */
export async function handleApproveBooking(request, env, auth, bookingId) {
  try {
    let booking;
    if (SupabaseService.isConfigured(env)) {
      booking = await SupabaseService.getBookingById(env, bookingId);
    }
    if (!booking && env.DB) {
      booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
    }

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    let approvedBooking;
    if (SupabaseService.isConfigured(env)) {
      approvedBooking = await SupabaseService.approveBooking(env, booking.id, auth.owner);
      // Safe mirror to D1 if present
      if (env.DB) {
        await D1Service.approveBooking(env, booking.id, auth.owner).catch(e => console.warn('[D1 Approve mirror]', e));
      }
    } else if (env.DB) {
      approvedBooking = await D1Service.approveBooking(env, booking.id, auth.owner);
    } else {
      throw new Error('Database backend is not configured');
    }

    // Trigger WhatsApp notification if customer opted in
    let whatsappResult = null;
    try {
      whatsappResult = await WhatsAppService.sendBookingApproved(env, approvedBooking);
    } catch (waErr) {
      console.warn('[Route: Approve] WhatsApp dispatch error:', waErr);
      whatsappResult = { success: false, error: waErr.message };
    }

    return jsonResponse(request, env, {
      success: true,
      message: `Booking ${approvedBooking.booking_ref} approved successfully`,
      booking: approvedBooking,
      whatsappResult
    });
  } catch (err) {
    console.error('[Route: ApproveBooking] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to approve booking', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/admin/bookings/:id/reject
 */
export async function handleRejectBooking(request, env, auth, bookingId) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(request, env, 'Rejection requires a JSON body with reason', 400, 'INVALID_JSON');
    }

    const validation = validateRejectionPayload(body);
    if (!validation.valid) {
      return errorResponse(request, env, validation.errors.join('; '), 400, 'VALIDATION_FAILED');
    }

    let booking;
    if (SupabaseService.isConfigured(env)) {
      booking = await SupabaseService.getBookingById(env, bookingId);
    }
    if (!booking && env.DB) {
      booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
    }

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    let rejectedBooking;
    if (SupabaseService.isConfigured(env)) {
      rejectedBooking = await SupabaseService.rejectBooking(
        env,
        booking.id,
        auth.owner,
        validation.sanitized.reason,
        validation.sanitized.notes
      );
      if (env.DB) {
        await D1Service.rejectBooking(
          env,
          booking.id,
          auth.owner,
          validation.sanitized.reason,
          validation.sanitized.notes
        ).catch(e => console.warn('[D1 Reject mirror]', e));
      }
    } else if (env.DB) {
      rejectedBooking = await D1Service.rejectBooking(
        env,
        booking.id,
        auth.owner,
        validation.sanitized.reason,
        validation.sanitized.notes
      );
    } else {
      throw new Error('Database backend is not configured');
    }

    // Trigger WhatsApp notification if customer opted in
    let whatsappResult = null;
    try {
      whatsappResult = await WhatsAppService.sendBookingRejected(env, rejectedBooking, validation.sanitized.reason);
    } catch (waErr) {
      console.warn('[Route: Reject] WhatsApp dispatch error:', waErr);
      whatsappResult = { success: false, error: waErr.message };
    }

    return jsonResponse(request, env, {
      success: true,
      message: `Booking ${rejectedBooking.booking_ref} marked as rejected`,
      booking: rejectedBooking,
      whatsappResult
    });
  } catch (err) {
    console.error('[Route: RejectBooking] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to reject booking', 500, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/admin/bookings/export
 */
export async function handleExportBookings(request, env, auth) {
  try {
    let allBookings;
    if (SupabaseService.isConfigured(env)) {
      allBookings = await SupabaseService.exportAllBookings(env);
    } else if (env.DB) {
      allBookings = await D1Service.exportAllBookings(env);
    } else {
      throw new Error('Database backend is not configured');
    }

    const filename = `bhuvana_bookings_backup_${new Date().toISOString().split('T')[0]}.json`;

    return new Response(JSON.stringify(allBookings, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    });
  } catch (err) {
    console.error('[Route: ExportBookings] Error:', err);
    return errorResponse(request, env, 'Failed to export bookings', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/admin/notifications/retry/:id
 */
export async function handleRetryNotification(request, env, auth, jobId) {
  try {
    if (!env.DB) {
      return errorResponse(request, env, 'Notification jobs are currently stored in D1', 400, 'UNSUPPORTED');
    }
    const job = await D1Service.getNotificationJobById(env, jobId);
    if (!job) {
      return errorResponse(request, env, `Notification job ${jobId} not found`, 404, 'NOT_FOUND');
    }

    await D1Service.updateNotificationJob(env, jobId, {
      status: 'pending',
      retry_count: (job.retry_count || 0) + 1
    });

    return jsonResponse(request, env, {
      success: true,
      message: `Notification job ${jobId} scheduled for retry`
    });
  } catch (err) {
    console.error('[Route: RetryNotification] Error:', err);
    return errorResponse(request, env, 'Failed to retry notification job', 500, 'INTERNAL_ERROR');
  }
}
