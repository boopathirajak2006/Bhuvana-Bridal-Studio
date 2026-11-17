/**
 * Public Booking Routes for Bhuvana's Bridal Studio
 * Handles reservation (Step 1), poster submission (Step 2), and public status lookup.
 * 
 * Storage: Cloudflare R2 (Private bucket)
 * Database: Supabase Postgres (Public & Service Role Access)
 */

import { jsonResponse, errorResponse } from '../utils/response.js';
import { validateBookingReservation, validateBookingSubmission } from '../middleware/validation.js';
import { SupabaseService } from '../services/supabase.js';
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

    let reservation;
    if (SupabaseService.isConfigured(env)) {
      reservation = await SupabaseService.reserveBooking(env, reservationPayload);
    } else if (env.DB) {
      reservation = await D1Service.reserveBooking(env, reservationPayload);
    } else {
      throw new Error('No database backend (Supabase or D1) is configured.');
    }

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

    const { bookingRef, posterFile, customerData } = validation.data;
    const customerDisplayName = (customerData && customerData.customer_name) || 'Valued Client';
    const eventDate = (customerData && customerData.event_date) || '';

    // 1. Upload poster PNG image to private Cloudflare R2 bucket
    const arrayBuffer = await posterFile.arrayBuffer();
    const r2Result = await R2Service.uploadPoster(env, bookingRef, arrayBuffer, {
      customerName: customerDisplayName,
      eventDate: eventDate
    });

    // 2. Persist booking enquiry in Supabase database
    const submitPayload = {
      bookingRef,
      posterKey: r2Result.key,
      posterPublicId: r2Result.key,
      posterSecureUrl: `/api/admin/bookings/${bookingRef}/poster`,
      posterFileSize: r2Result.size || arrayBuffer.byteLength,
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

    let finalizedBooking;
    if (SupabaseService.isConfigured(env)) {
      finalizedBooking = await SupabaseService.submitBooking(env, submitPayload);
      // Safely mirror to D1 if present for zero data loss / migration continuity
      if (env.DB) {
        try {
          const d1Payload = {
            ...submitPayload,
            posterPublicId: r2Result.key,
            posterSecureUrl: `/api/admin/bookings/${bookingRef}/poster`,
            selectedServicesJson: JSON.stringify(submitPayload.selectedServices),
            requirementsJson: JSON.stringify(submitPayload.requirements),
            consentTimestamp: new Date().toISOString(),
            consentVersion: 'v1'
          };
          await D1Service.submitBooking(env, d1Payload).catch(e => console.warn('[D1 Mirror Warning]', e));
        } catch (mirrorErr) {
          console.warn('[D1 Mirror non-blocking error]', mirrorErr);
        }
      }
    } else if (env.DB) {
      const d1Payload = {
        ...submitPayload,
        posterPublicId: r2Result.key,
        posterSecureUrl: `/api/admin/bookings/${bookingRef}/poster`,
        selectedServicesJson: JSON.stringify(submitPayload.selectedServices),
        requirementsJson: JSON.stringify(submitPayload.requirements),
        consentTimestamp: new Date().toISOString(),
        consentVersion: 'v1'
      };
      finalizedBooking = await D1Service.submitBooking(env, d1Payload);
    } else {
      throw new Error('Database backend is not configured.');
    }

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

    let booking;
    if (SupabaseService.isConfigured(env)) {
      booking = await SupabaseService.getBookingByRef(env, bookingRef);
    } else if (env.DB) {
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
