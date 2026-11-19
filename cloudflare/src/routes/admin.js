/**
 * Protected Studio Owner / Admin Routes
 * Handles login, session management, booking reviews, private poster streaming from Cloudinary, and exports.
 * 
 * Storage: Cloudinary exclusively (Private authenticated streaming)
 * Database & Auth: Cloudflare D1 exclusively (PBKDF2 passwords & secure sessions)
 */

import { jsonResponse, errorResponse, setCookieHeader, clearCookieHeader } from '../utils/response.js';
import { AuthService } from '../services/auth.js';
import { CloudinaryService } from '../services/cloudinary.js';
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

    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
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
 * POST /api/admin/change-password
 */
export async function handleChangePassword(request, env, auth) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(request, env, 'Invalid JSON body', 400, 'INVALID_JSON');
    }

    const { currentPassword, newPassword } = body || {};
    if (!currentPassword || !newPassword) {
      return errorResponse(request, env, 'Current password and new password are required', 400, 'MISSING_FIELDS');
    }

    await AuthService.changePassword(env, auth.owner.id, currentPassword, newPassword);

    return jsonResponse(request, env, {
      success: true,
      message: 'Owner password updated successfully'
    });
  } catch (err) {
    console.error('[Route: ChangePassword] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to update owner password', 400, 'CHANGE_PASSWORD_FAILED');
  }
}

/**
 * GET /api/admin/bookings
 */
export async function handleListBookings(request, env, auth) {
  try {
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'all';
    const search = url.searchParams.get('search') || '';
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

    const result = await D1Service.listBookings(env, { status, search, limit, offset });

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
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const metrics = await D1Service.getMetrics(env);

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
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    let auditLogs = [];
    let notificationJobs = [];
    try {
      auditLogs = await D1Service.recordAuditLog ? await env.DB.prepare('SELECT * FROM booking_audit_logs WHERE booking_id = ? ORDER BY created_at DESC').bind(booking.id).all().then(r => r.results || []).catch(() => []) : [];
      notificationJobs = await D1Service.getNotificationJobsForBooking(env, booking.id).catch(() => []);
    } catch (e) {
      // non-blocking
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
 * Streams the private booking poster PNG from Cloudinary to authenticated studio owner.
 */
export async function handleGetBookingPoster(request, env, auth, bookingId) {
  try {
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);

    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    const publicId = booking.poster_public_id || '';
    const secureUrl = booking.poster_secure_url || '';

    if (!publicId && !secureUrl) {
      return errorResponse(request, env, 'No poster image stored for this booking', 404, 'NOT_FOUND');
    }

    let imageBody = null;
    let contentLength = null;
    let etag = null;

    // Fetch poster stream from Cloudinary
    if (env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET) {
      try {
        const cdnRes = await CloudinaryService.getPosterStream(env, booking);
        if (cdnRes && cdnRes.body) {
          imageBody = cdnRes.body;
          contentLength = cdnRes.headers.get('content-length');
          etag = cdnRes.headers.get('etag');
        }
      } catch (e) {
        console.warn('[Route: BookingPoster] Cloudinary stream fetch error:', e);
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
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    // Update D1 booking status
    const approvedBooking = await D1Service.approveBooking(env, booking.id, auth.owner);

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

    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const booking = await D1Service.getBookingById(env, bookingId) || await D1Service.getBookingByRef(env, bookingId);
    if (!booking) {
      return errorResponse(request, env, `Booking not found: ${bookingId}`, 404, 'NOT_FOUND');
    }

    // Update D1 booking status
    const rejectedBooking = await D1Service.rejectBooking(
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
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const allBookings = await D1Service.exportAllBookings(env);
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
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
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


