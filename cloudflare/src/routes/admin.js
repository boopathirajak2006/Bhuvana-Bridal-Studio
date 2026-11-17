/**
 * Protected Studio Owner / Admin Routes
 * Handles login, session management, booking reviews, private poster streaming from R2, and exports.
 * 
 * Storage: Cloudflare R2 exclusively (Private bucket streaming)
 * Database & Auth: Supabase Postgres & Supabase Auth exclusively (Zero D1 write mirrors)
 * Historical: D1 read-only inspection strictly for older preserved records
 */

import { jsonResponse, errorResponse, setCookieHeader, clearCookieHeader } from '../utils/response.js';
import { AuthService } from '../services/auth.js';
import { SupabaseService } from '../services/supabase.js';
import { CloudinaryService } from '../services/cloudinary.js';
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

    if (!SupabaseService.isConfigured(env)) {
      return errorResponse(request, env, 'Supabase Auth is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
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
    if (!SupabaseService.isConfigured(env)) {
      return errorResponse(request, env, 'Supabase database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('search') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

    const result = await SupabaseService.listBookings(env, { status, search, limit, offset });

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
    if (!SupabaseService.isConfigured(env)) {
      return errorResponse(request, env, 'Supabase database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const metrics = await SupabaseService.getMetrics(env);

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
    let booking = null;
    let isHistorical = false;

    // 1. Primary: Look up in Supabase
    if (SupabaseService.isConfigured(env)) {
      booking = await SupabaseService.getBookingById(env, bookingId);
    }

    // 2. Read-only fallback: Look up in D1 historical archives
    if (!booking && env.DB) {
      booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
      if (booking) {
        isHistorical = true;
      }
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
      booking: {
        ...booking,
        is_historical: isHistorical
      },
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
 * Streams the private booking poster PNG to authenticated studio owner.
 * Dynamically resolves storage provider (Cloudinary vs Cloudflare R2) from stored booking metadata.
 */
export async function handleGetBookingPoster(request, env, auth, bookingId) {
  try {
    let booking = null;
    if (SupabaseService.isConfigured(env)) {
      booking = await SupabaseService.getBookingById(env, bookingId);
    }
    if (!booking && env.DB) {
      booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
    }

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    const publicId = booking.poster_public_id || '';
    const key = booking.poster_key || booking.poster_public_id || booking.booking_ref || '';
    const secureUrl = booking.poster_secure_url || booking.poster_url || '';

    if (!publicId && !key && !secureUrl) {
      return errorResponse(request, env, 'No poster image stored for this booking', 404, 'NOT_FOUND');
    }

    let imageBody = null;
    let contentLength = null;
    let etag = null;

    // Determine storage provider from actual metadata
    const isCloudinary = Boolean(
      (publicId && publicId.includes('bhuvana_posters')) ||
      (secureUrl && secureUrl.includes('cloudinary.com')) ||
      booking.poster_version
    );

    const isR2 = Boolean(
      (publicId && publicId.startsWith('posters/')) ||
      (booking.poster_key && booking.poster_key.startsWith('posters/'))
    );

    if (isCloudinary) {
      // 1. Fetch from Cloudinary
      const cdnRes = await CloudinaryService.getPosterStream(env, booking);
      if (cdnRes && cdnRes.body) {
        imageBody = cdnRes.body;
        contentLength = cdnRes.headers.get('content-length');
        etag = cdnRes.headers.get('etag');
      }
    } else if (isR2 && (env.BUCKET || env.POSTERS)) {
      // 2. Fetch from Cloudflare R2
      const r2Object = await R2Service.getPoster(env, key);
      if (r2Object && r2Object.body) {
        imageBody = r2Object.body;
        if (r2Object.size) contentLength = String(r2Object.size);
        if (r2Object.httpEtag) etag = r2Object.httpEtag;
      }
    } else {
      // Fallback: Check Cloudinary first, then R2 if available
      if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
        try {
          const cdnRes = await CloudinaryService.getPosterStream(env, booking);
          if (cdnRes && cdnRes.body) {
            imageBody = cdnRes.body;
            contentLength = cdnRes.headers.get('content-length');
            etag = cdnRes.headers.get('etag');
          }
        } catch (e) {
          // Cloudinary fallback error ignored
        }
      }

      if (!imageBody && (env.BUCKET || env.POSTERS)) {
        try {
          const r2Object = await R2Service.getPoster(env, key);
          if (r2Object && r2Object.body) {
            imageBody = r2Object.body;
            if (r2Object.size) contentLength = String(r2Object.size);
            if (r2Object.httpEtag) etag = r2Object.httpEtag;
          }
        } catch (e) {
          // R2 fallback error ignored
        }
      }
    }

    if (!imageBody) {
      return errorResponse(request, env, 'Poster image file missing from storage', 404, 'NOT_FOUND');
    }

    const headers = new Headers();
    headers.set('Content-Type', 'image/png');
    headers.set('Cache-Control', 'private, max-age=3600');
    headers.set('Content-Disposition', `inline; filename="${booking.booking_ref || 'poster'}.png"`);

    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }
    if (etag) {
      headers.set('ETag', etag);
    }

    // CORS headers for authenticated owner requests
    const origin = request.headers.get('Origin');
    if (origin) {
      headers.set('Access-Control-Allow-Origin', origin);
      headers.set('Access-Control-Allow-Credentials', 'true');
    }

    return new Response(imageBody, { headers });
  } catch (err) {
    console.error('[Route: BookingPoster] Error:', err);
    return errorResponse(request, env, 'Failed to retrieve poster image from storage', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/admin/bookings/:id/approve
 */
export async function handleApproveBooking(request, env, auth, bookingId) {
  try {
    if (!SupabaseService.isConfigured(env)) {
      return errorResponse(request, env, 'Supabase database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    let booking = await SupabaseService.getBookingById(env, bookingId);

    // If not found in Supabase, verify if it is an older D1 record
    if (!booking && env.DB) {
      const historical = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
      if (historical) {
        return errorResponse(
          request,
          env,
          `Booking ${historical.booking_ref} is a historical D1 record and cannot be modified. It is preserved in read-only mode.`,
          409,
          'HISTORICAL_RECORD_READONLY'
        );
      }
    }

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    // Update Supabase exclusively (Zero mirrored writes to D1)
    const approvedBooking = await SupabaseService.approveBooking(env, booking.id, auth.owner);

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

    if (!SupabaseService.isConfigured(env)) {
      return errorResponse(request, env, 'Supabase database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    let booking = await SupabaseService.getBookingById(env, bookingId);

    // If not found in Supabase, verify if it is an older D1 record
    if (!booking && env.DB) {
      const historical = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
      if (historical) {
        return errorResponse(
          request,
          env,
          `Booking ${historical.booking_ref} is a historical D1 record and cannot be modified. It is preserved in read-only mode.`,
          409,
          'HISTORICAL_RECORD_READONLY'
        );
      }
    }

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    // Update Supabase exclusively (Zero mirrored writes to D1)
    const rejectedBooking = await SupabaseService.rejectBooking(
      env,
      booking.id,
      auth.owner,
      validation.sanitized.reason,
      validation.sanitized.notes
    );

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
    if (!SupabaseService.isConfigured(env)) {
      return errorResponse(request, env, 'Supabase database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const allBookings = await SupabaseService.exportAllBookings(env);
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
