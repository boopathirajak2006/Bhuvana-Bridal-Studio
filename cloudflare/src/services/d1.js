/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Cloudflare D1 Database Access Layer
 */

import { generateUUID, generateBookingRef, generateSalt, hashPassword, sha256, verifyPassword } from '../utils/security.js';
import { CloudinaryService } from './cloudinary.js';

export class D1Service {
  /** Remove submitted customer records once their 60-day retention window expires. */
  static async deleteExpiredBookings(env, now = new Date()) {
    if (!env.DB) throw new Error('D1 database is unavailable');
    const cutoff = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString();
    let deleted = 0;
    while (true) {
      const { results = [] } = await env.DB.prepare(`SELECT id, booking_ref FROM bookings
        WHERE booking_status != 'draft' AND COALESCE(submitted_at, created_at) < ?
        ORDER BY COALESCE(submitted_at, created_at) LIMIT 50`).bind(cutoff).all();
      if (!results.length) break;
      const refs = results.map(row => row.booking_ref);
      const placeholders = refs.map(() => '?').join(',');
      const photos = await env.DB.prepare(`SELECT cloudinary_public_id FROM booking_reference_images WHERE booking_ref IN (${placeholders})`).bind(...refs).all();
      await env.DB.batch(results.map(row => env.DB.prepare('DELETE FROM bookings WHERE id = ?').bind(row.id)));
      const assets = (photos.results || []).map(row => row.cloudinary_public_id).filter(Boolean);
      for (const asset of assets) {
        try { await CloudinaryService.deleteGalleryPhoto(env, asset); }
        catch (err) { console.warn('[Retention] Private reference cleanup failed for an expired booking.', err); }
      }
      deleted += results.length;
    }
    return { deleted, cutoff };
  }
  /**
   * Seed initial owner account ONLY if explicit password is provided in environment variables
   * Secure: Never falls back to a hardcoded default password.
   */
  static async seedInitialOwnerIfEmpty(env) {
    if (!env.DB) return;
    try {
      const existing = await env.DB.prepare('SELECT COUNT(*) as count FROM owners').first();
      if (existing && existing.count > 0) return;

      const password = env.OWNER_INITIAL_PASSWORD;
      if (!password) {
        console.warn('[D1] No initial owner configured. OWNER_INITIAL_PASSWORD environment variable must be set explicitly.');
        return;
      }

      const username = (env.OWNER_INITIAL_USERNAME || 'admin').toLowerCase().trim();
      const name = env.OWNER_INITIAL_NAME || 'Bhuvaneshwari';

      const salt = generateSalt();
      const passwordHash = await hashPassword(password, salt);
      const now = new Date().toISOString();
      const id = generateUUID();

      await env.DB.prepare(`
        INSERT INTO owners (id, username, password_hash, salt, name, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, 'owner', ?, ?)
      `).bind(id, username, passwordHash, salt, name, now, now).run();

      console.log(`[D1] Initial studio owner seeded securely from environment variables: ${username}`);
    } catch (err) {
      console.error('[D1] Error seeding owner account:', err);
    }
  }

  // ==========================================
  // BOOKINGS RESERVATION & SUBMISSION
  // ==========================================

  /**
   * Step 1: Reserve a unique booking reference
   */
  static async reserveBooking(env, data) {
    const bookingRef = data.bookingRef || generateBookingRef();
    const id = generateUUID();
    const reservationToken = generateUUID();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 45 * 60 * 1000).toISOString(); // 45 minutes reservation window
    const nowIso = now.toISOString();

    const customerName = data.customerName || 'Valued Client';
    const customerMobile = data.customerMobile || '';
    const customerWhatsapp = data.customerWhatsapp || null;
    const eventDate = data.eventDate || '';
    const eventLocation = data.eventLocation || '';
    const selectedServicesJson = JSON.stringify(data.selectedServices || []);
    const requirementsJson = JSON.stringify(data.requirements || {});
    const specialNotes = data.specialNotes || '';
    const idempotencyKey = data.idempotencyKey || null;
    const reservationTokenHash = await sha256(reservationToken);

    // Insert draft booking reservation
    await env.DB.prepare(`
      INSERT INTO bookings (
        id, booking_ref, idempotency_key, customer_name, customer_mobile, customer_email, customer_whatsapp,
        customer_address,
        event_date, event_location, selected_services_json, requirements_json, special_notes,
        booking_status, reservation_expires_at, reservation_token_hash, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?)
    `).bind(
      id,
      bookingRef,
      idempotencyKey,
      customerName,
      customerMobile,
      data.customerEmail || null,
      customerWhatsapp,
      data.customerAddress || null,
      eventDate,
      eventLocation,
      selectedServicesJson,
      requirementsJson,
      specialNotes,
      expiresAt,
      reservationTokenHash,
      nowIso,
      nowIso
    ).run();

    await this.recordAuditLog(env, {
      bookingId: id,
      action: 'created_draft',
      previousStatus: null,
      newStatus: 'draft',
      reason: 'Customer started a booking enquiry'
    });

    return {
      id,
      bookingRef,
      reservationToken,
      expiresAt
    };
  }

  /** Finalize the customer's enquiry and persist its optional private references. */
  static async submitBooking(env, data) {
    const nowIso = new Date().toISOString();
    const {
      bookingRef,
      reservationToken,
      customerName,
      customerMobile,
      customerWhatsapp,
      customerEmail,
      eventDate,
      eventLocation,
      specialNotes,
      whatsappConsent,
      consentTimestamp,
      consentVersion,
      idempotencyKey
    } = data;


    // Check if booking already exists (from step 1 draft or idempotency)
    let booking = await this.getBookingByRef(env, bookingRef);
    const selectedServicesJson = typeof data.selectedServicesJson === 'string'
      ? data.selectedServicesJson
      : JSON.stringify(data.selectedServices || []);
    const requirementsJson = typeof data.requirementsJson === 'string'
      ? data.requirementsJson
      : JSON.stringify(data.requirements || {});
    const referenceImages = Array.isArray(data.referenceImages) ? data.referenceImages : [];

    if (booking) {
      if (booking.booking_status !== 'draft') {
        throw new Error(`Booking ${bookingRef} has already been submitted`);
      }
      if (!reservationToken || !booking.reservation_token_hash ||
          (await sha256(reservationToken)) !== booking.reservation_token_hash) {
        throw new Error('Invalid reservation token');
      }
      if (booking.reservation_expires_at && booking.reservation_expires_at <= nowIso) {
        throw new Error('Booking reservation has expired');
      }

      await env.DB.prepare(`
        UPDATE bookings SET
          customer_name = ?,
          customer_mobile = ?,
          customer_whatsapp = ?,
          customer_address = ?,
          customer_email = ?,
          event_date = ?,
          event_location = ?,
          selected_services_json = ?,
          requirements_json = ?,
          special_notes = ?,
          booking_status = 'pending',
          whatsapp_consent = ?,
          consent_timestamp = ?,
          consent_version = ?,
          submitted_at = ?,
          updated_at = ?
        WHERE booking_ref = ?
      `).bind(
        customerName,
        customerMobile,
        customerWhatsapp || null,
        data.customerAddress || null,
        customerEmail || null,
        eventDate,
        eventLocation,
        selectedServicesJson,
        requirementsJson,
        specialNotes,
        whatsappConsent ? 1 : 0,
        consentTimestamp || nowIso,
        consentVersion || 'v1',
        nowIso,
        nowIso,
        bookingRef
      ).run();
      if (referenceImages.length) {
        await env.DB.batch(referenceImages.map(image => env.DB.prepare(`INSERT INTO booking_reference_images (id, booking_ref, cloudinary_public_id, secure_url, asset_version, image_format, title, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(image.id, bookingRef, image.public_id, image.secure_url, image.version || null, image.format || 'jpg', image.title || '', image.sort_order || 0)));
      }
    } else {
      if (reservationToken) throw new Error('Booking reservation was not found');
      // Direct insertion if not pre-reserved
      const id = generateUUID();
      await env.DB.prepare(`
        INSERT INTO bookings (
          id, booking_ref, idempotency_key, customer_name, customer_mobile, customer_email,
          customer_whatsapp, customer_address,
          event_date, event_location, selected_services_json, requirements_json, special_notes,
          booking_status, whatsapp_consent, consent_timestamp,
          consent_version, submitted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        bookingRef,
        idempotencyKey || null,
        customerName,
        customerMobile,
        customerEmail || null,
        customerWhatsapp || null,
        data.customerAddress || null,
        eventDate,
        eventLocation,
        selectedServicesJson,
        requirementsJson,
        specialNotes,
        whatsappConsent ? 1 : 0,
        consentTimestamp || nowIso,
        consentVersion || 'v1',
        nowIso,
        nowIso,
        nowIso
      ).run();
      if (referenceImages.length) {
        await env.DB.batch(referenceImages.map(image => env.DB.prepare(`INSERT INTO booking_reference_images (id, booking_ref, cloudinary_public_id, secure_url, asset_version, image_format, title, sort_order)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(image.id, bookingRef, image.public_id, image.secure_url, image.version || null, image.format || 'jpg', image.title || '', image.sort_order || 0)));
      }
      booking = { id };
    }

    await this.recordAuditLog(env, {
      bookingId: booking.id,
      action: 'submitted_pending',
      previousStatus: 'draft',
      newStatus: 'pending',
      reason: 'Customer confirmed booking enquiry'
    });

    return await this.getBookingByRef(env, bookingRef);
  }

  /**
   * Retrieve booking by booking_ref
   */
  static async getBookingByRef(env, bookingRef) {
    if (!env.DB || !bookingRef) return null;
    return await env.DB.prepare('SELECT * FROM bookings WHERE booking_ref = ?').bind(bookingRef).first();
  }

  /**
   * Retrieve booking by id
   */
  static async getBookingById(env, id) {
    if (!env.DB || !id) return null;
    return await env.DB.prepare('SELECT * FROM bookings WHERE id = ?').bind(id).first();
  }

  /**
   * List bookings with search and status filtering for Owner Dashboard
   */
  static async listBookings(env, options = {}) {
    if (!env.DB) return { bookings: [], total: 0 };
    const { status, search, limit = 50, offset = 0 } = options;

    let query = "SELECT * FROM bookings WHERE booking_status != 'draft'";
    const params = [];

    if (status && status !== 'all') {
      query += ' AND booking_status = ?';
      params.push(status);
    }

    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      query += ' AND (booking_ref LIKE ? OR customer_name LIKE ? OR customer_mobile LIKE ? OR event_location LIKE ?)';
      params.push(s, s, s, s);
    }

    query += ' ORDER BY submitted_at DESC, created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const { results } = await env.DB.prepare(query).bind(...params).all();

    // Query total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM bookings WHERE booking_status != 'draft'";
    const countParams = [];
    if (status && status !== 'all') {
      countQuery += ' AND booking_status = ?';
      countParams.push(status);
    }
    if (search && search.trim()) {
      const s = `%${search.trim()}%`;
      countQuery += ' AND (booking_ref LIKE ? OR customer_name LIKE ? OR customer_mobile LIKE ? OR event_location LIKE ?)';
      countParams.push(s, s, s, s);
    }

    const countRes = await env.DB.prepare(countQuery).bind(...countParams).first();

    return {
      bookings: results || [],
      total: countRes ? countRes.total : 0
    };
  }

  /**
   * Get KPI counts for owner dashboard
   */
  static async getMetrics(env) {
    if (!env.DB) return { total: 0, pending: 0, approved: 0, rejected: 0 };
    const res = await env.DB.prepare(`
      SELECT
        COUNT(CASE WHEN booking_status != 'draft' THEN 1 END) as total,
        COUNT(CASE WHEN booking_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN booking_status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN booking_status = 'rejected' THEN 1 END) as rejected
      FROM bookings
    `).first();

    return {
      total: res?.total || 0,
      pending: res?.pending || 0,
      approved: res?.approved || 0,
      rejected: res?.rejected || 0
    };
  }

  /**
   * Owner Approve Booking
   */
  static async approveBooking(env, bookingId, owner) {
    const booking = await this.getBookingById(env, bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.booking_status !== 'pending') {
      throw new Error(`Cannot approve booking in status "${booking.booking_status}"`);
    }

    const nowIso = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE bookings SET
        booking_status = 'approved',
        reviewed_at = ?,
        reviewed_by = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(nowIso, owner.username || owner.name, nowIso, bookingId).run();

    await this.recordAuditLog(env, {
      bookingId,
      ownerId: owner.id,
      action: 'approved',
      previousStatus: 'pending',
      newStatus: 'approved',
      reason: 'Owner approved booking'
    });

    return await this.getBookingById(env, bookingId);
  }

  /**
   * Owner Reject Booking
   */
  static async rejectBooking(env, bookingId, owner, reason, notes) {
    const booking = await this.getBookingById(env, bookingId);
    if (!booking) throw new Error('Booking not found');
    if (booking.booking_status !== 'pending') {
      throw new Error(`Cannot reject booking in status "${booking.booking_status}"`);
    }

    const nowIso = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE bookings SET
        booking_status = 'rejected',
        reviewed_at = ?,
        reviewed_by = ?,
        rejection_reason = ?,
        rejection_notes = ?,
        updated_at = ?
      WHERE id = ?
    `).bind(nowIso, owner.username || owner.name, reason, notes || null, nowIso, bookingId).run();

    await this.recordAuditLog(env, {
      bookingId,
      ownerId: owner.id,
      action: 'rejected',
      previousStatus: 'pending',
      newStatus: 'rejected',
      reason: reason || 'Booking rejected by owner'
    });

    return await this.getBookingById(env, bookingId);
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================

  static async recordAuditLog(env, data) {
    if (!env.DB) return;
    try {
      const id = generateUUID();
      const nowIso = new Date().toISOString();
      await env.DB.prepare(`
        INSERT INTO booking_audit_logs (
          id, booking_id, owner_id, action, previous_status, new_status, reason, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        id,
        data.bookingId,
        data.ownerId || null,
        data.action,
        data.previousStatus || null,
        data.newStatus || null,
        data.reason || null,
        data.metadata ? JSON.stringify(data.metadata) : null,
        nowIso
      ).run();
    } catch (err) {
      console.error('[D1] Audit log write failed:', err);
    }
  }

  // ==========================================
  // NOTIFICATION JOBS (FCM & WHATSAPP)
  // ==========================================

  static async createNotificationJob(env, data) {
    if (!env.DB) return null;
    const id = generateUUID();
    const nowIso = new Date().toISOString();
    await env.DB.prepare(`
      INSERT INTO notification_jobs (
        id, booking_id, notification_type, recipient, status, external_message_id, error_message, payload_json, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      data.bookingId,
      data.type,
      data.recipient,
      data.status || 'pending',
      data.externalMessageId || null,
      data.error || null,
      data.payload ? JSON.stringify(data.payload) : null,
      nowIso,
      nowIso
    ).run();

    return id;
  }

  static async updateNotificationJob(env, id, updates) {
    if (!env.DB) return;
    const nowIso = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE notification_jobs SET
        status = COALESCE(?, status),
        external_message_id = COALESCE(?, external_message_id),
        error_message = COALESCE(?, error_message),
        retry_count = retry_count + ?,
        updated_at = ?
      WHERE id = ?
    `).bind(
      updates.status || null,
      updates.externalMessageId || null,
      updates.error || null,
      updates.incrementRetry ? 1 : 0,
      nowIso,
      id
    ).run();
  }

  static async updateNotificationByExternalId(env, externalId, updates) {
    if (!env.DB || !externalId) return;
    const nowIso = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE notification_jobs SET
        status = ?,
        error_message = COALESCE(?, error_message),
        updated_at = ?
      WHERE external_message_id = ?
    `).bind(updates.status, updates.error || null, nowIso, externalId).run();
  }

  static async getNotificationJobsForBooking(env, bookingId) {
    if (!env.DB) return [];
    const { results } = await env.DB.prepare(`
      SELECT * FROM notification_jobs WHERE booking_id = ? ORDER BY created_at DESC
    `).bind(bookingId).all();
    return results || [];
  }

  static async getAuditLogsForBooking(env, bookingId) {
    if (!env.DB) return [];
    const { results } = await env.DB.prepare(`
      SELECT * FROM booking_audit_logs WHERE booking_id = ? ORDER BY created_at DESC
    `).bind(bookingId).all();
    return results || [];
  }

  static async getNotificationJobById(env, id) {
    if (!env.DB) return null;
    return await env.DB.prepare('SELECT * FROM notification_jobs WHERE id = ?').bind(id).first();
  }

  // ==========================================
  // OWNER AUTHENTICATION & SESSIONS
  // ==========================================

  static async findOwnerByUsername(env, username) {
    if (!env.DB || !username) return null;
    return await env.DB.prepare('SELECT * FROM owners WHERE username = ?').bind(username.toLowerCase().trim()).first();
  }

  static async updateOwnerPassword(env, ownerId, currentPassword, newPassword, currentToken) {
    if (!env.DB) throw new Error('D1 database is unavailable');
    if (typeof newPassword !== 'string' || newPassword.length < 12) {
      throw new Error('New password must be at least 12 characters');
    }
    const owner = await env.DB.prepare('SELECT id, password_hash, salt FROM owners WHERE id = ?').bind(ownerId).first();
    if (!owner || !await verifyPassword(currentPassword, owner.password_hash, owner.salt)) {
      throw new Error('Current password is incorrect');
    }
    const salt = generateSalt();
    const passwordHash = await hashPassword(newPassword, salt);
    const nowIso = new Date().toISOString();
    await env.DB.prepare(`
      UPDATE owners SET password_hash = ?, salt = ?, updated_at = ? WHERE id = ?
    `).bind(passwordHash, salt, nowIso, ownerId).run();
    // Revoke sessions after a password change so old credentials stop working.
    const currentTokenHash = currentToken ? await sha256(currentToken) : null;
    await env.DB.prepare(`
      DELETE FROM owner_sessions WHERE owner_id = ? AND (? IS NULL OR token_hash != ?)
    `).bind(ownerId, currentTokenHash, currentTokenHash).run();
  }

  static async createOwnerSession(env, ownerId, token, ip, userAgent) {
    if (!env.DB) return null;
    const id = generateUUID();
    const tokenHash = await sha256(token);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    await env.DB.prepare(`
      INSERT INTO owner_sessions (id, token_hash, owner_id, ip_address, user_agent, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(id, tokenHash, ownerId, ip || null, userAgent || null, expiresAt, now.toISOString()).run();

    return { token, expiresAt };
  }

  static async getOwnerBySessionToken(env, token) {
    if (!env.DB || !token) return null;
    const tokenHash = await sha256(token);
    const nowIso = new Date().toISOString();

    const record = await env.DB.prepare(`
      SELECT s.id as session_id, s.expires_at, o.id as owner_id, o.username, o.name, o.role
      FROM owner_sessions s
      JOIN owners o ON s.owner_id = o.id
      WHERE s.token_hash = ? AND s.expires_at > ?
    `).bind(tokenHash, nowIso).first();

    return record || null;
  }

  static async deleteOwnerSession(env, token) {
    if (!env.DB || !token) return;
    const tokenHash = await sha256(token);
    await env.DB.prepare('DELETE FROM owner_sessions WHERE token_hash = ?').bind(tokenHash).run();
  }

  // ==========================================
  // OWNER FCM DEVICES
  // ==========================================

  static async registerOwnerDevice(env, ownerId, fcmToken, deviceName) {
    if (!env.DB || !fcmToken) return;
    const id = generateUUID();
    const nowIso = new Date().toISOString();

    await env.DB.prepare(`
      INSERT INTO owner_devices (id, owner_id, fcm_token, device_name, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(fcm_token) DO UPDATE SET
        owner_id = excluded.owner_id,
        device_name = excluded.device_name,
        updated_at = excluded.updated_at
    `).bind(id, ownerId, fcmToken, deviceName || 'Owner Browser', nowIso, nowIso).run();
  }

  static async listOwnerDevices(env) {
    if (!env.DB) return [];
    const { results } = await env.DB.prepare('SELECT * FROM owner_devices').all();
    return results || [];
  }

  static async removeInvalidDevice(env, fcmToken) {
    if (!env.DB || !fcmToken) return;
    await env.DB.prepare('DELETE FROM owner_devices WHERE fcm_token = ?').bind(fcmToken).run();
  }

  // ==========================================
  // EXPORT & BACKUP
  // ==========================================

  static async exportAllBookings(env) {
    if (!env.DB) return [];
    const { results } = await env.DB.prepare(`
      SELECT * FROM bookings ORDER BY created_at DESC
    `).all();
    return results || [];
  }
}
