/**
 * Public Booking Routes for Bhuvana's Bridal Studio
 * Handles reservation (Step 1), poster submission (Step 2), and public status lookup.
 * 
 * Storage: Cloudflare R2 exclusively (Private bucket)
 * Database: Supabase Postgres exclusively (Zero mirrored writes to D1)
 * Historical: D1 read-only fallback strictly for status lookup of older records
 */

import { jsonResponse, errorResponse } from '../utils/response.js';
import { validateBookingReservation, validateBookingSubmission } from '../middleware/validation.js';
import { SupabaseService } from '../services/supabase.js';
import { CloudinaryService } from '../services/cloudinary.js';
import { R2Service } from '../services/r2.js';
import { D1Service } from '../services/d1.js';
import { FCMService } from '../services/fcm.js';

export async function handleReserveBooking(request, env) {
  try {
    let body;
    try {
      body = await request.json();
    } catch {
      return errorResponse(request, env, 'Malformed JSON in request body', 400, 'INVALID_JSON');
    }

    const validation = validateBookingReservation(body);
    if (!validation.valid) {
      return errorResponse(request, env, validation.errors.join('; '), 400, 'VALIDATION_FAILED');
    }

    // Require Supabase as the exclusive active booking database
    if (!SupabaseService.isConfigured(env)) {
      return errorResponse(request, env, 'Supabase database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const reservationPayload = {
      customerName: validation.sanitized.customer_name,
      customerMobile: validation.sanitized.customer_phone,
      customerEmail: validation.sanitized.customer_email,
      eventDate: validation.sanitized.event_date,
      eventLocation: validation.sanitized.location,
      selectedServices: validation.sanitized.service_ids,
      requirements: validation.sanitized.additional_requirements,
      specialNotes: validation.sanitized.notes,
      idempotencyKey: body.idempotency_key || null
    };

    const reservation = await SupabaseService.reserveBooking(env, reservationPayload);

    return jsonResponse(request, env, {
      success: true,
      message: 'Booking reference reserved successfully',
      bookingRef: reservation.bookingRef,
      reservationToken: reservation.reservationToken,
      expiresAt: reservation.expiresAt
    }, 201);
  } catch (err) {
    console.error('[Route: ReserveBooking] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to reserve booking reference', 500, 'INTERNAL_ERROR');
  }
}

export async function handleSubmitBooking(request, env) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(request, env, 'Content-Type must be multipart/form-data', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const formData = await request.formData();
    const validation = await validateBookingSubmission(formData);
    if (!validation.valid) {
      return errorResponse(request, env, validation.errors.join('; '), 400, 'VALIDATION_FAILED');
    }

    // Require Supabase as the exclusive active booking database
    if (!SupabaseService.isConfigured(env)) {
      return errorResponse(request, env, 'Supabase database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const { bookingRef, posterFile, customerData } = validation.data;
    const customerDisplayName = (customerData && customerData.customer_name) || 'Valued Client';
    const eventDate = (customerData && customerData.event_date) || '';

    // 1. Upload poster PNG image exclusively to Cloudinary (Active poster storage)
    const arrayBuffer = await posterFile.arrayBuffer();
    const cloudinaryResult = await CloudinaryService.uploadPoster(env, bookingRef, arrayBuffer, {
      customerName: customerDisplayName,
      eventDate: eventDate
    });

    // 2. Persist booking enquiry exclusively in Supabase database (Zero D1 mirrored writes)
    const submitPayload = {
      bookingRef,
      posterKey: cloudinaryResult.public_id,
      posterPublicId: cloudinaryResult.public_id,
      posterSecureUrl: cloudinaryResult.secure_url,
      posterVersion: cloudinaryResult.version,
      posterAssetId: cloudinaryResult.asset_id,
      posterFileSize: cloudinaryResult.bytes || arrayBuffer.byteLength,
      customerName: customerDisplayName,
      customerMobile: (customerData && customerData.customer_phone) || '',
      customerEmail: (customerData && customerData.customer_email) || '',
      eventDate: eventDate,
      eventLocation: (customerData && customerData.location) || 'Salem',
      selectedServices: (customerData && customerData.service_ids) || [],
      requirements: (customerData && customerData.additional_requirements) || {},
      specialNotes: (customerData && customerData.notes) || '',
      whatsappConsent: customerData ? (customerData.whatsapp_consent === 1 || customerData.whatsapp_consent === true) : false
    };

    const finalizedBooking = await SupabaseService.submitBooking(env, submitPayload);

    // 3. Asynchronously dispatch FCM push notification to owner devices (non-blocking)
    try {
      await FCMService.notifyNewBooking(env, finalizedBooking);
    } catch (fcmErr) {
      console.warn('[Route: SubmitBooking] FCM dispatch warning:', fcmErr);
    }

    return jsonResponse(request, env, {
      success: true,
      message: 'Booking enquiry submitted successfully. Awaiting studio owner review.',
      booking: {
        id: finalizedBooking.id,
        booking_ref: finalizedBooking.booking_ref,
        status: finalizedBooking.booking_status || finalizedBooking.status,
        customer_name: finalizedBooking.customer_name,
        customer_mobile: finalizedBooking.customer_mobile,
        event_date: finalizedBooking.event_date,
        event_location: finalizedBooking.event_location,
        submitted_at: finalizedBooking.submitted_at || finalizedBooking.created_at
      }
    }, 200);
  } catch (err) {
    console.error('[Route: SubmitBooking] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to submit booking', 500, 'INTERNAL_ERROR');
  }
}

export async function handleGetBookingStatus(request, env, bookingRef) {
  try {
    if (!bookingRef) {
      return errorResponse(request, env, 'Booking reference is required', 400, 'MISSING_PARAM');
    }

    let booking = null;

    // 1. Primary: Query Supabase
    if (SupabaseService.isConfigured(env)) {
      booking = await SupabaseService.getBookingByRef(env, bookingRef);
    }

    // 2. Read-only historical fallback: Query D1 only if not found in Supabase
    if (!booking && env.DB) {
      booking = await D1Service.getBookingByRef(env, bookingRef);
    }

    if (!booking) {
      return errorResponse(request, env, `Booking ${bookingRef} not found`, 404, 'NOT_FOUND');
    }

    return jsonResponse(request, env, {
      success: true,
      booking: {
        booking_ref: booking.booking_ref,
        status: booking.booking_status || booking.status,
        customer_name: booking.customer_name,
        event_date: booking.event_date,
        event_location: booking.event_location,
        created_at: booking.created_at,
        submitted_at: booking.submitted_at || booking.created_at,
        updated_at: booking.updated_at
      }
    }, 200);
  } catch (err) {
    console.error('[Route: BookingStatus] Error:', err);
    return errorResponse(request, env, 'Failed to fetch booking status', 500, 'INTERNAL_ERROR');
  }
}
