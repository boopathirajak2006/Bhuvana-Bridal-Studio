/** Public booking endpoints backed by D1 and private Cloudinary assets. */

import { jsonResponse, errorResponse } from '../utils/response.js';
import { validateBookingReservation, validateBookingSubmission } from '../middleware/validation.js';
import { CloudinaryService } from '../services/cloudinary.js';
import { D1Service } from '../services/d1.js';
import { FCMService } from '../services/fcm.js';
import { sha256 } from '../utils/security.js';

export async function handleReserveBooking(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'D1 database is unavailable', 503, 'SERVICE_UNAVAILABLE');

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
      customerWhatsapp: validation.sanitized.customer_whatsapp,
      customerAddress: validation.sanitized.customer_address,
      customerEmail: validation.sanitized.customer_email,
      eventDate: validation.sanitized.event_date,
      eventLocation: validation.sanitized.additional_requirements?.eventLocation || '',
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
    return errorResponse(request, env, 'Failed to reserve booking reference', 500, 'INTERNAL_ERROR');
  }
}

export async function handleSubmitBooking(request, env) {
  const uploadedReferences = [];
  try {
    if (!env.DB) return errorResponse(request, env, 'D1 database is unavailable', 503, 'SERVICE_UNAVAILABLE');
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return errorResponse(request, env, 'Content-Type must be multipart/form-data', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    const formData = await request.formData();
    const validation = await validateBookingSubmission(formData);
    if (!validation.valid) {
      return errorResponse(request, env, validation.errors.join('; '), 400, 'VALIDATION_FAILED');
    }

    const { bookingRef, reservationToken, customerData } = validation.data;
    const customer = customerData || {};
    const customerValidation = validateBookingReservation({
      customer_name: customer.customer_name,
      customer_phone: customer.customer_phone || customer.customer_mobile,
      customer_whatsapp: customer.customer_whatsapp || '',
      customer_email: customer.customer_email || '',
      customer_address: customer.customer_address || customer.additional_requirements?.customerAddress || '',
      event_date: customer.event_date,
      location: customer.location || customer.event_location || 'Salem',
      service_ids: customer.service_ids || customer.selected_services,
      additional_requirements: customer.additional_requirements || customer.requirements,
      notes: customer.notes || customer.special_notes,
      whatsapp_consent: customer.whatsapp_consent
    });
    if (!customerValidation.valid) {
      return errorResponse(request, env, customerValidation.errors.join('; '), 400, 'VALIDATION_FAILED');
    }
    const safeCustomer = customerValidation.sanitized;

    const existing = await D1Service.getBookingByRef(env, bookingRef);
    if (existing) {
      if (existing.booking_status !== 'draft') {
        return errorResponse(request, env, 'This booking reference has already been submitted', 409, 'BOOKING_ALREADY_SUBMITTED');
      }
      if (!reservationToken || !existing.reservation_token_hash ||
          await sha256(reservationToken) !== existing.reservation_token_hash) {
        return errorResponse(request, env, 'Invalid reservation token', 401, 'INVALID_RESERVATION');
      }
      if (existing.reservation_expires_at && existing.reservation_expires_at <= new Date().toISOString()) {
        return errorResponse(request, env, 'Booking reservation has expired', 410, 'RESERVATION_EXPIRED');
      }
    } else if (reservationToken) {
      return errorResponse(request, env, 'Booking reservation was not found', 404, 'RESERVATION_NOT_FOUND');
    }
    const referenceFiles = formData.getAll('reference_images').filter(file => file instanceof File && file.size > 0);
    if (referenceFiles.length > 6 || referenceFiles.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      return errorResponse(request, env, 'Attach up to 6 JPG, PNG, or WebP reference images, 5 MB each maximum', 400, 'INVALID_REFERENCES');
    }
    for (const [index, file] of referenceFiles.entries()) {
      const id = crypto.randomUUID();
      try {
        const asset = await CloudinaryService.uploadBookingReference(env, bookingRef, id, await file.arrayBuffer(), file.type);
        uploadedReferences.push({ id, public_id: asset.public_id, secure_url: asset.secure_url, version: asset.version, format: asset.format, title: file.name.slice(0, 100), sort_order: index + 1 });
      } catch (err) {
        await Promise.all(uploadedReferences.map(item => CloudinaryService.deleteGalleryPhoto(env, item.public_id).catch(() => {})));
        return errorResponse(request, env, err.message || 'Reference image upload failed', 502, 'REFERENCE_UPLOAD_FAILED');
      }
    }
    const consentField = formData.get('whatsapp_consent');
    const whatsappConsent = safeCustomer.whatsapp_consent === 1 || customer.whatsapp_consent === true || customer.whatsapp_consent === 1 ||
      customer.whatsapp_consent === '1' || consentField === 'true' || consentField === '1';

    const booking = await D1Service.submitBooking(env, {
      bookingRef,
      reservationToken,
      customerName: safeCustomer.customer_name,
      customerMobile: safeCustomer.customer_phone,
      customerWhatsapp: safeCustomer.customer_whatsapp,
      customerAddress: safeCustomer.customer_address,
      customerEmail: customer.customer_email || null,
      eventDate: safeCustomer.event_date,
      eventLocation: safeCustomer.location,
      selectedServices: safeCustomer.service_ids,
      requirements: safeCustomer.additional_requirements,
      referenceImages: uploadedReferences,
      specialNotes: safeCustomer.notes,
      whatsappConsent,
      idempotencyKey: formData.get('idempotency_key') || null
    });

    try {
      await FCMService.notifyNewBooking(env, booking);
    } catch (notifyErr) {
      console.warn('[Route: SubmitBooking] FCM dispatch warning:', notifyErr);
    }

    return jsonResponse(request, env, {
      success: true,
      message: 'Booking enquiry submitted successfully. Awaiting studio owner review.',
      bookingRef: booking.booking_ref,
      booking: {
        id: booking.id,
        booking_ref: booking.booking_ref,
        status: booking.booking_status,
        customer_name: booking.customer_name,
        customer_mobile: booking.customer_mobile,
        customer_whatsapp: booking.customer_whatsapp,
        customer_address: booking.customer_address,
        event_date: booking.event_date,
        event_location: booking.event_location,
        submitted_at: booking.submitted_at || booking.created_at
      }
    }, 201);
  } catch (err) {
    await Promise.all(uploadedReferences.map(item => CloudinaryService.deleteGalleryPhoto(env, item.public_id).catch(() => {})));
    console.error('[Route: SubmitBooking] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to submit booking', 500, 'INTERNAL_ERROR');
  }
}

export async function handleGetBookingStatus(request, env, bookingRef) {
  try {
    if (!env.DB) return errorResponse(request, env, 'D1 database is unavailable', 503, 'SERVICE_UNAVAILABLE');
    if (!bookingRef) return errorResponse(request, env, 'Booking reference is required', 400, 'MISSING_PARAM');

    const booking = await D1Service.getBookingByRef(env, bookingRef);
    if (!booking || booking.booking_status === 'draft') {
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
        submitted_at: booking.submitted_at || booking.created_at,
        updated_at: booking.updated_at
      }
    });
  } catch (err) {
    console.error('[Route: BookingStatus] Error:', err);
    return errorResponse(request, env, 'Failed to fetch booking status', 500, 'INTERNAL_ERROR');
  }
}
