/**
 * Public Booking Routes for Bhuvana's Bridal Studio
 * Handles reservation (Step 1), poster submission (Step 2), and public status lookup.
 */

import { jsonResponse, errorResponse } from '../utils/response.js';
import { validateBookingReservation, validateBookingSubmission } from '../middleware/validation.js';
import { D1Service } from '../services/d1.js';
import { CloudinaryService } from '../services/cloudinary.js';
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

    const reservation = await D1Service.reserveBooking(env, {
      customerName: validation.sanitized.customer_name,
      customerMobile: validation.sanitized.customer_phone,
      eventDate: validation.sanitized.event_date,
      eventLocation: validation.sanitized.location,
      selectedServices: validation.sanitized.service_ids,
      requirements: validation.sanitized.additional_requirements,
      specialNotes: validation.sanitized.notes,
      idempotencyKey: body.idempotency_key || null
    });

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

    // Check if booking exists in D1; if not, auto-create draft record
    let existing = await D1Service.getBookingByRef(env, bookingRef);
    if (!existing) {
      await D1Service.reserveBooking(env, {
        bookingRef: bookingRef,
        customerName: (customerData && customerData.customer_name) || 'Valued Client',
        customerMobile: (customerData && customerData.customer_phone) || '',
        customerEmail: (customerData && customerData.customer_email) || '',
        eventDate: (customerData && customerData.event_date) || '',
        eventLocation: (customerData && customerData.location) || 'Salem',
        selectedServices: (customerData && customerData.service_ids) || [],
        requirements: (customerData && customerData.additional_requirements) || {},
        specialNotes: (customerData && customerData.notes) || ''
      });
      existing = await D1Service.getBookingByRef(env, bookingRef);
    }

    if (existing.booking_status !== 'draft' && existing.booking_status !== 'pending') {
      return errorResponse(request, env, `Booking ${bookingRef} has already reached status '${existing.booking_status}'`, 409, 'CONFLICT');
    }

    // Convert file to ArrayBuffer and upload to Cloudinary (private/authenticated asset)
    const arrayBuffer = await posterFile.arrayBuffer();
    const customerDisplayName = (customerData && customerData.customer_name) || existing.customer_name;

    const cloudinaryResult = await CloudinaryService.uploadPoster(env, bookingRef, arrayBuffer, {
      customerName: customerDisplayName,
      eventDate: (customerData && customerData.event_date) || existing.event_date
    });

    // Update D1 database with Cloudinary identifiers
    const submitPayload = {
      bookingRef,
      posterPublicId: cloudinaryResult.public_id,
      posterSecureUrl: cloudinaryResult.secure_url,
      posterVersion: cloudinaryResult.version,
      posterAssetId: cloudinaryResult.asset_id,
      posterFileSize: cloudinaryResult.bytes || arrayBuffer.byteLength,
      customerName: customerDisplayName,
      customerMobile: (customerData && customerData.customer_phone) || existing.customer_mobile,
      customerEmail: (customerData && customerData.customer_email) || existing.customer_email,
      eventDate: (customerData && customerData.event_date) || existing.event_date,
      eventLocation: (customerData && customerData.location) || existing.event_location,
      selectedServicesJson: (customerData && customerData.service_ids) ? JSON.stringify(customerData.service_ids) : existing.selected_services_json,
      requirementsJson: (customerData && customerData.additional_requirements) ? JSON.stringify(customerData.additional_requirements) : existing.requirements_json,
      specialNotes: (customerData && customerData.notes) ? customerData.notes : existing.special_notes,
      whatsappConsent: customerData ? (customerData.whatsapp_consent === 1 || customerData.whatsapp_consent === true) : (existing.whatsapp_consent === 1),
      consentTimestamp: new Date().toISOString(),
      consentVersion: 'v1'
    };

    const finalizedBooking = await D1Service.submitBooking(env, submitPayload);

    // Asynchronously dispatch FCM push notification to owner devices (does not block client response)
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
        status: finalizedBooking.booking_status,
        customer_name: finalizedBooking.customer_name,
        customer_mobile: finalizedBooking.customer_mobile,
        event_date: finalizedBooking.event_date,
        event_location: finalizedBooking.event_location,
        submitted_at: finalizedBooking.submitted_at
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

    const booking = await D1Service.getBookingByRef(env, bookingRef);
    if (!booking) {
      return errorResponse(request, env, `Booking ${bookingRef} not found`, 404, 'NOT_FOUND');
    }

    return jsonResponse(request, env, {
      success: true,
      booking: {
        booking_ref: booking.booking_ref,
        status: booking.booking_status,
        customer_name: booking.customer_name,
        event_date: booking.event_date,
        event_location: booking.event_location,
        created_at: booking.created_at,
        submitted_at: booking.submitted_at,
        updated_at: booking.updated_at
      }
    }, 200);
  } catch (err) {
    console.error('[Route: BookingStatus] Error:', err);
    return errorResponse(request, env, 'Failed to fetch booking status', 500, 'INTERNAL_ERROR');
  }
}
