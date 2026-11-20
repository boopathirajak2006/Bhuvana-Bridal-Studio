/**
 * Request Validation Middleware for Bhuvana's Bridal Studio Cloudflare Worker
 */

import { sanitizeInput } from '../utils/security.js';

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

  const whatsapp = typeof body.customer_whatsapp === 'string' ? body.customer_whatsapp.trim() : '';
  const whatsappDigits = whatsapp.replace(/\D/g, '');
  if (whatsapp && (whatsappDigits.length < 10 || whatsappDigits.length > 15)) {
    errors.push('Customer WhatsApp number must contain a valid 10 to 15 digit telephone number');
  }

  const eventDate = typeof body.event_date === 'string' ? body.event_date.trim() : '';
  if (!eventDate) {
    errors.push('Event date is required');
  }

  const location = typeof body.location === 'string' ? body.location.trim() : '';
  const requirements = body.additional_requirements || body.requirements || {};
  const eventAddress = typeof requirements.eventLocation === 'string' ? requirements.eventLocation.trim() : '';
  const eventMapUrl = typeof requirements.eventMapUrl === 'string' ? requirements.eventMapUrl.trim() : '';
  if (!eventAddress && !eventMapUrl) errors.push('Provide an event address or Google Maps link');
  if (eventMapUrl && !/^https:\/\/(maps\.app\.goo\.gl|www\.google\.com\/maps|maps\.google\.com)\//i.test(eventMapUrl)) errors.push('Event Google Maps link must be a valid Google Maps URL');

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
      customer_whatsapp: whatsapp,
      customer_email: typeof body.customer_email === 'string' ? sanitizeInput(body.customer_email.trim().slice(0, 254)) : '',
      customer_address: typeof body.customer_address === 'string' ? sanitizeInput(body.customer_address.trim().slice(0, 1000)) : '',
      event_date: sanitizeInput(eventDate),
      location: sanitizeInput(location || 'Salem'),
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
  if (reservationToken && typeof reservationToken !== 'string') {
    errors.push('Invalid reservation token');
  }

  const bookingRef = formData.get('booking_ref');
  if (!bookingRef || !/^BBS-\d{4}-[2-9A-HJ-NP-Z]{4,6}$/.test(bookingRef)) {
    errors.push('Valid booking reference (BBS-YYYY-XXXX) is required');
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
