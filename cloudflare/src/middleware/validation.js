/**
 * Request Validation Middleware for Bhuvana's Bridal Studio Cloudflare Worker
 */

import { validatePngMagicBytes, sanitizeInput } from '../utils/security.js';

/**
 * Validates booking reservation payload (Step 1)
 *
 * @param {object} body
 * @returns {{ valid: boolean, errors?: string[], sanitized?: object }}
 */
export function validateBookingReservation(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a valid JSON object'] };
  }

  const name = typeof body.customer_name === 'string' ? body.customer_name.trim() : '';
  if (!name || name.length < 2 || name.length > 100) {
    errors.push('Customer name is required and must be between 2 and 100 characters');
  }

  const phone = typeof body.customer_phone === 'string' ? body.customer_phone.trim() : '';
  // Phone should have at least 10 digits
  const digitsOnly = phone.replace(/\D/g, '');
  if (!phone || digitsOnly.length < 10 || digitsOnly.length > 15) {
    errors.push('Customer mobile number must contain a valid 10 to 15 digit telephone number');
  }

  const eventDate = typeof body.event_date === 'string' ? body.event_date.trim() : '';
  if (!eventDate) {
    errors.push('Event date is required');
  }

  const location = typeof body.location === 'string' ? body.location.trim() : '';
  if (!location) {
    errors.push('Location is required');
  }

  const serviceIds = Array.isArray(body.service_ids) ? body.service_ids : [];
  if (serviceIds.length === 0) {
    errors.push('At least one service must be selected');
  }

  const totalPrice = typeof body.total_price === 'number' ? body.total_price : parseFloat(body.total_price) || 0;
  if (totalPrice < 0) {
    errors.push('Total price cannot be negative');
  }

  const whatsappConsent = body.whatsapp_consent === true || body.whatsapp_consent === 1 || body.whatsapp_consent === '1';

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    sanitized: {
      customer_name: sanitizeInput(name),
      customer_phone: phone,
      event_date: sanitizeInput(eventDate),
      location: sanitizeInput(location),
      service_ids: serviceIds,
      service_breakdown: body.service_breakdown || {},
      additional_requirements: body.additional_requirements || {},
      notes: sanitizeInput(body.notes || ''),
      total_price: totalPrice,
      whatsapp_consent: whatsappConsent ? 1 : 0
    }
  };
}

/**
 * Validates multipart/form-data for booking submission (Step 2)
 *
 * @param {FormData} formData
 * @returns {Promise<{ valid: boolean, errors?: string[], data?: object }>}
 */
export async function validateBookingSubmission(formData) {
  const errors = [];

  const reservationToken = formData.get('reservation_token');
  if (!reservationToken || typeof reservationToken !== 'string') {
    errors.push('Missing reservation token');
  }

  const bookingRef = formData.get('booking_ref');
  if (!bookingRef || !/^BBS-2026-[2-9A-HJ-NP-Z]{6}$/.test(bookingRef)) {
    errors.push('Valid booking reference (BBS-2026-XXXXXX) is required');
  }

  const posterFile = formData.get('poster');
  if (!posterFile) {
    errors.push('Generated booking poster image file is required');
  } else {
    // Check file size (max 5 MB)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (posterFile.size > MAX_SIZE) {
      errors.push(`Poster image exceeds maximum allowed size of 5MB (size: ${(posterFile.size / 1024 / 1024).toFixed(2)}MB)`);
    }

    // Validate PNG signature
    const arrayBuffer = await posterFile.arrayBuffer();
    if (!validatePngMagicBytes(arrayBuffer)) {
      errors.push('Uploaded poster is not a valid PNG image');
    }
  }

  // Optional customer payload update
  let customerData = null;
  const rawData = formData.get('booking_data');
  if (rawData) {
    try {
      customerData = JSON.parse(rawData);
    } catch {
      errors.push('Invalid JSON in booking_data field');
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      reservationToken,
      bookingRef,
      posterFile,
      customerData
    }
  };
}

/**
 * Validates rejection payload
 */
export function validateRejectionPayload(body) {
  const errors = [];
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Body must be a valid JSON object'] };
  }
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  if (!reason) {
    errors.push('Rejection reason is required');
  }
  if (reason.length > 500) {
    errors.push('Rejection reason cannot exceed 500 characters');
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }
  return {
    valid: true,
    sanitized: {
      reason: sanitizeInput(reason),
      notes: sanitizeInput(body.notes || '')
    }
  };
}
