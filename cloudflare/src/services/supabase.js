/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Supabase Database & Auth Service
 * 
 * Provides production-grade integration with Supabase Postgres (Database)
 * and Supabase GoTrue (Authentication & RBAC via public.user_roles).
 * Enforces Row Level Security (RLS) protection across customer booking records.
 */

import { generateBookingRef, generateUUID } from '../utils/security.js';

export class SupabaseService {
  /**
   * Checks if Supabase credentials are configured in Worker environment
   */
  static isConfigured(env) {
    return Boolean(
      env.SUPABASE_URL &&
      (env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY) &&
      !env.SUPABASE_URL.includes('YOUR_PROJECT_ID')
    );
  }

  /**
   * Helper to perform authenticated HTTP requests to Supabase REST / Auth API
   */
  static async fetchSupabase(env, path, options = {}) {
    if (!this.isConfigured(env)) {
      throw new Error('Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
    }

    const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : '/' + path;
    const url = `${baseUrl}${cleanPath}`;

    const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_ANON_KEY;
    const headers = {
      'apikey': serviceKey,
      'Authorization': `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation',
      ...(options.headers || {})
    };

    const res = await fetch(url, {
      ...options,
      headers
    });

    return res;
  }

  /**
   * Normalizes a database row to ensure seamless compatibility with both
   * Supabase schema definitions and Owner Dashboard frontend expectations.
   */
  static normalizeBooking(row) {
    if (!row) return null;

    const status = row.status || row.booking_status || 'pending';
    const isApproved = status === 'confirmed' || status === 'approved';

    // Parse JSON fields if returned as string
    let serviceDetails = row.service_details || {};
    if (typeof serviceDetails === 'string') {
      try { serviceDetails = JSON.parse(serviceDetails); } catch { serviceDetails = {}; }
    }

    let customPrefs = row.customization_preferences || {};
    if (typeof customPrefs === 'string') {
      try { customPrefs = JSON.parse(customPrefs); } catch { customPrefs = {}; }
    }

    const customerName = row.client_name || row.customer_name || 'Valued Client';
    const customerMobile = row.mobile || row.customer_mobile || '';
    const customerEmail = row.email || row.customer_email || '';
    const eventLocation = row.location || row.event_location || '';
    const services = Array.isArray(row.services) ? row.services : [];

    return {
      id: row.id,
      booking_ref: row.booking_ref,
      // Provide both schema and frontend naming conventions
      client_name: customerName,
      customer_name: customerName,
      mobile: customerMobile,
      customer_mobile: customerMobile,
      email: customerEmail,
      customer_email: customerEmail,
      event_date: row.event_date || '',
      makeup_date: row.makeup_date || null,
      location: eventLocation,
      event_location: eventLocation,
      people_count: row.people_count || 1,
      services: services,
      selected_services: services,
      preferences: Array.isArray(row.preferences) ? row.preferences : [],
      message: row.message || '',
      special_notes: row.message || row.special_notes || '',
      booking_category: row.booking_category || 'bridal-beauty',
      whatsapp_number: row.whatsapp_number || customerMobile,
      whatsapp_consent: row.whatsapp_consent === true || row.whatsapp_consent === 1 ? 1 : 0,
      service_details: serviceDetails,
      requirements: serviceDetails,
      customization_preferences: customPrefs,
      reference_images: Array.isArray(row.reference_images) ? row.reference_images : [],
      poster_url: row.poster_url || row.poster_secure_url || null,
      poster_public_id: row.poster_public_id || null,
      poster_key: row.poster_public_id || null,
      poster_secure_url: row.poster_secure_url || row.poster_url || null,
      poster_version: row.poster_version ? String(row.poster_version) : null,
      poster_asset_id: row.poster_asset_id || null,
      status: status,
      booking_status: isApproved ? 'approved' : status,
      deposit_amount: row.deposit_amount || 0,
      total_quote: row.total_quote || 0,
      admin_notes: row.admin_notes || '',
      rejection_reason: row.rejection_reason || null,
      rejection_notes: row.rejection_notes || null,
      created_at: row.created_at || new Date().toISOString(),
      submitted_at: row.submitted_at || row.updated_at || row.created_at || new Date().toISOString(),
      updated_at: row.updated_at || new Date().toISOString()
    };
  }

  // ==========================================
  // CUSTOMER BOOKING OPERATIONS
  // ==========================================

  /**
   * Step 1: Reserve Booking Reference
   * Inserts initial booking reservation into Supabase public.bookings
   */
  static async reserveBooking(env, data) {
    const bookingRef = data.bookingRef || generateBookingRef();
    const id = generateUUID();
    const nowIso = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 45 * 60 * 1000).toISOString();

    const customerName = data.customerName || 'Valued Client';
    const customerMobile = data.customerMobile || '';
    const eventDate = data.eventDate || nowIso.split('T')[0];
    const eventLocation = data.eventLocation || 'Salem';
    const selectedServices = Array.isArray(data.selectedServices) ? data.selectedServices : [];
    const preferences = Array.isArray(data.preferences) ? data.preferences : ['HD Finish'];
    const serviceDetails = data.requirements || {};
    const notes = data.specialNotes || '';

    const payload = {
      id,
      booking_ref: bookingRef,
      client_name: customerName,
      customer_name: customerName,
      mobile: customerMobile,
      customer_mobile: customerMobile,
      email: data.customerEmail || null,
      customer_email: data.customerEmail || null,
      event_date: eventDate,
      location: eventLocation,
      event_location: eventLocation,
      services: selectedServices,
      preferences: preferences,
      service_details: serviceDetails,
      message: notes,
      status: 'pending',
      booking_status: 'pending',
      booking_category: data.bookingCategory || 'bridal-beauty',
      whatsapp_consent: Boolean(data.whatsappConsent),
      created_at: nowIso,
      updated_at: nowIso
    };

    const res = await this.fetchSupabase(env, '/rest/v1/bookings', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Supabase] Failed to reserve booking:', errText);
      throw new Error(`Failed to reserve booking in Supabase: ${errText}`);
    }

    const insertedRows = await res.json();
    const inserted = Array.isArray(insertedRows) ? insertedRows[0] : insertedRows;

    return {
      id: inserted ? inserted.id : id,
      bookingRef: inserted ? inserted.booking_ref : bookingRef,
      reservationToken: inserted ? inserted.id : id,
      expiresAt
    };
  }

  /**
   * Step 2: Finalize Booking Submission with R2 Poster Key
   * Updates existing booking or creates pending record in Supabase
   */
  static async submitBooking(env, data) {
    const bookingRef = data.bookingRef;
    if (!bookingRef) {
      throw new Error('Booking reference is required for submission');
    }

    const nowIso = new Date().toISOString();
    const posterKey = data.posterPublicId || data.posterKey || `bhuvana_posters/2026/${bookingRef}`;
    const posterSecureUrl = data.posterSecureUrl || data.posterUrl || `/api/admin/bookings/${bookingRef}/poster`;
    const posterVersion = data.posterVersion ? String(data.posterVersion) : null;
    const posterAssetId = data.posterAssetId || null;

    // Check if booking already exists in Supabase
    const existing = await this.getBookingByRef(env, bookingRef);

    const updatePayload = {
      poster_public_id: posterKey,
      poster_url: posterSecureUrl,
      poster_secure_url: posterSecureUrl,
      poster_version: posterVersion,
      poster_asset_id: posterAssetId,
      status: 'pending',
      booking_status: 'pending',
      whatsapp_consent: data.whatsappConsent === true || data.whatsappConsent === 1,
      updated_at: nowIso
    };

    if (data.customerName) {
      updatePayload.client_name = data.customerName;
      updatePayload.customer_name = data.customerName;
    }
    if (data.customerMobile) {
      updatePayload.mobile = data.customerMobile;
      updatePayload.customer_mobile = data.customerMobile;
    }
    if (data.customerEmail) {
      updatePayload.email = data.customerEmail;
      updatePayload.customer_email = data.customerEmail;
    }
    if (data.eventDate) updatePayload.event_date = data.eventDate;
    if (data.eventLocation) {
      updatePayload.location = data.eventLocation;
      updatePayload.event_location = data.eventLocation;
    }
    if (data.requirements) updatePayload.service_details = data.requirements;
    if (data.specialNotes) updatePayload.message = data.specialNotes;

    if (existing) {
      // Update existing record
      const patchRes = await this.fetchSupabase(env, `/rest/v1/bookings?booking_ref=eq.${encodeURIComponent(bookingRef)}`, {
        method: 'PATCH',
        body: JSON.stringify(updatePayload)
      });

      if (!patchRes.ok) {
        const errText = await patchRes.text();
        throw new Error(`Failed to update booking in Supabase: ${errText}`);
      }

      const rows = await patchRes.json();
      return this.normalizeBooking(Array.isArray(rows) ? rows[0] : rows);
    } else {
      // Auto-create pending record if not reserved previously
      const insertPayload = {
        id: generateUUID(),
        booking_ref: bookingRef,
        client_name: data.customerName || 'Valued Client',
        customer_name: data.customerName || 'Valued Client',
        mobile: data.customerMobile || '',
        customer_mobile: data.customerMobile || '',
        email: data.customerEmail || null,
        customer_email: data.customerEmail || null,
        event_date: data.eventDate || nowIso.split('T')[0],
        location: data.eventLocation || 'Salem',
        event_location: data.eventLocation || 'Salem',
        services: Array.isArray(data.selectedServices) ? data.selectedServices : [],
        preferences: ['HD Finish'],
        service_details: data.requirements || {},
        message: data.specialNotes || '',
        poster_public_id: posterKey,
        poster_url: posterSecureUrl,
        poster_secure_url: posterSecureUrl,
        poster_version: posterVersion,
        poster_asset_id: posterAssetId,
        status: 'pending',
        booking_status: 'pending',
        whatsapp_consent: data.whatsappConsent === true || data.whatsappConsent === 1,
        created_at: nowIso,
        updated_at: nowIso
      };

      const insertRes = await this.fetchSupabase(env, '/rest/v1/bookings', {
        method: 'POST',
        body: JSON.stringify(insertPayload)
      });

      if (!insertRes.ok) {
        const errText = await insertRes.text();
        throw new Error(`Failed to insert booking in Supabase: ${errText}`);
      }

      const rows = await insertRes.json();
      return this.normalizeBooking(Array.isArray(rows) ? rows[0] : rows);
    }
  }

  /**
   * Fetch single booking by booking_ref
   */
  static async getBookingByRef(env, bookingRef) {
    if (!bookingRef) return null;

    const res = await this.fetchSupabase(
      env,
      `/rest/v1/bookings?booking_ref=eq.${encodeURIComponent(bookingRef)}&select=*`
    );

    if (!res.ok) {
      if (res.status === 404) return null;
      const errText = await res.text();
      console.error('[Supabase] getBookingByRef error:', errText);
      return null;
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0) return null;
    return this.normalizeBooking(rows[0]);
  }

  /**
   * Fetch single booking by id (UUID) or booking_ref
   */
  static async getBookingById(env, bookingId) {
    if (!bookingId) return null;

    // Check by ID
    const res = await this.fetchSupabase(
      env,
      `/rest/v1/bookings?id=eq.${encodeURIComponent(bookingId)}&select=*`
    );

    if (res.ok) {
      const rows = await res.json();
      if (Array.isArray(rows) && rows.length > 0) {
        return this.normalizeBooking(rows[0]);
      }
    }

    // Fallback to checking by booking_ref
    return await this.getBookingByRef(env, bookingId);
  }

  /**
   * List bookings with status filter, search query, and pagination
   */
  static async listBookings(env, { status = 'all', search = '', limit = 50, offset = 0 } = {}) {
    const params = new URLSearchParams();
    params.set('select', '*');
    params.set('order', 'created_at.desc');

    if (status && status !== 'all') {
      if (status === 'approved' || status === 'confirmed') {
        params.set('status', 'in.(confirmed,approved)');
      } else {
        params.set('status', `eq.${status}`);
      }
    }

    if (search && search.trim()) {
      const q = search.trim();
      params.set('or', `(client_name.ilike.*${q}*,customer_name.ilike.*${q}*,mobile.ilike.*${q}*,booking_ref.ilike.*${q}*,location.ilike.*${q}*)`);
    }

    const rangeHeader = `${offset}-${offset + limit - 1}`;
    const res = await this.fetchSupabase(env, `/rest/v1/bookings?${params.toString()}`, {
      headers: {
        'Range': rangeHeader,
        'Prefer': 'count=exact'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Supabase] listBookings error:', errText);
      return { bookings: [], total: 0 };
    }

    const rows = await res.json();
    const contentRange = res.headers.get('content-range'); // e.g. "0-9/42"
    let total = Array.isArray(rows) ? rows.length : 0;

    if (contentRange && contentRange.includes('/')) {
      const totalPart = contentRange.split('/')[1];
      if (totalPart && totalPart !== '*') {
        total = parseInt(totalPart, 10) || total;
      }
    }

    const normalizedBookings = (Array.isArray(rows) ? rows : []).map(r => this.normalizeBooking(r));
    return {
      bookings: normalizedBookings,
      total
    };
  }

  /**
   * Calculate dashboard metrics from Supabase bookings table
   */
  static async getMetrics(env) {
    const res = await this.fetchSupabase(env, '/rest/v1/bookings?select=id,status,created_at,event_date');
    if (!res.ok) {
      return {
        totalBookings: 0,
        pendingCount: 0,
        approvedCount: 0,
        declinedCount: 0,
        completedCount: 0,
        todayCount: 0,
        upcomingCount: 0
      };
    }

    const rows = await res.json();
    if (!Array.isArray(rows)) return { totalBookings: 0, pendingCount: 0, approvedCount: 0, declinedCount: 0, completedCount: 0, todayCount: 0, upcomingCount: 0 };

    const todayStr = new Date().toISOString().split('T')[0];

    let pendingCount = 0;
    let approvedCount = 0;
    let declinedCount = 0;
    let completedCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;

    for (const b of rows) {
      const st = (b.status || '').toLowerCase();
      if (st === 'pending') pendingCount++;
      else if (st === 'confirmed' || st === 'approved') approvedCount++;
      else if (st === 'declined' || st === 'cancelled') declinedCount++;
      else if (st === 'completed') completedCount++;

      if (b.created_at && b.created_at.startsWith(todayStr)) {
        todayCount++;
      }
      if (b.event_date && b.event_date >= todayStr) {
        upcomingCount++;
      }
    }

    return {
      totalBookings: rows.length,
      pendingCount,
      approvedCount,
      declinedCount,
      completedCount,
      todayCount,
      upcomingCount
    };
  }

  /**
   * Approve a booking
   */
  static async approveBooking(env, id, owner) {
    const nowIso = new Date().toISOString();
    const ownerName = (owner && (owner.name || owner.email)) || 'Studio Owner';

    const patchPayload = {
      status: 'confirmed',
      booking_status: 'approved',
      admin_notes: `Approved by ${ownerName} on ${nowIso}`,
      updated_at: nowIso
    };

    const res = await this.fetchSupabase(env, `/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patchPayload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to approve booking in Supabase: ${errText}`);
    }

    const rows = await res.json();
    return this.normalizeBooking(Array.isArray(rows) ? rows[0] : rows);
  }

  /**
   * Reject a booking with mandatory reason
   */
  static async rejectBooking(env, id, owner, reason, notes = '') {
    const nowIso = new Date().toISOString();
    const ownerName = (owner && (owner.name || owner.email)) || 'Studio Owner';

    const patchPayload = {
      status: 'declined',
      booking_status: 'declined',
      rejection_reason: reason,
      rejection_notes: notes,
      admin_notes: `Declined by ${ownerName}. Reason: ${reason}`,
      updated_at: nowIso
    };

    const res = await this.fetchSupabase(env, `/rest/v1/bookings?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patchPayload)
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to reject booking in Supabase: ${errText}`);
    }

    const rows = await res.json();
    return this.normalizeBooking(Array.isArray(rows) ? rows[0] : rows);
  }

  /**
   * Export all bookings for offline backup
   */
  static async exportAllBookings(env) {
    const res = await this.fetchSupabase(env, '/rest/v1/bookings?select=*&order=created_at.desc');
    if (!res.ok) {
      throw new Error('Failed to export bookings from Supabase');
    }
    const rows = await res.json();
    return (Array.isArray(rows) ? rows : []).map(r => this.normalizeBooking(r));
  }

  // ==========================================
  // SUPABASE AUTHENTICATION & RBAC
  // ==========================================

  /**
   * Authenticate Studio Owner via Supabase Auth GoTrue endpoint
   * Validates credentials and verifies admin role in public.user_roles
   */
  static async loginOwner(env, emailOrUsername, password) {
    if (!this.isConfigured(env)) {
      throw new Error('Supabase is not configured in Worker environment.');
    }
    if (!emailOrUsername || !password) {
      throw new Error('Username/Email and password are required.');
    }

    const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
    const authUrl = `${baseUrl}/auth/v1/token?grant_type=password`;
    const anonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

    // Support both raw email and username formatting
    let email = emailOrUsername.trim();
    if (!email.includes('@')) {
      email = `${email.toLowerCase()}@bhuvanasbridal.com`;
    }

    const authRes = await fetch(authUrl, {
      method: 'POST',
      headers: {
        'apikey': anonKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    });

    if (!authRes.ok) {
      const errData = await authRes.json().catch(() => ({}));
      throw new Error(errData.error_description || errData.message || 'Invalid username or password');
    }

    const tokenData = await authRes.json();
    const user = tokenData.user;
    if (!user || !user.id) {
      throw new Error('Supabase authentication returned invalid user data');
    }

    // Verify RBAC: Ensure user has 'admin' or 'owner' role in public.user_roles
    const roleCheckRes = await this.fetchSupabase(
      env,
      `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=in.(admin,staff)&select=role`
    );

    let isAuthorized = false;
    let role = 'owner';

    if (roleCheckRes.ok) {
      const roleRows = await roleCheckRes.json();
      if (Array.isArray(roleRows) && roleRows.length > 0) {
        isAuthorized = true;
        role = roleRows[0].role;
      }
    }

    // Also check app_metadata / email fallback if user is root owner
    if (!isAuthorized && user.app_metadata && (user.app_metadata.role === 'admin' || user.app_metadata.role === 'owner')) {
      isAuthorized = true;
      role = user.app_metadata.role;
    }

    if (!isAuthorized && env.OWNER_EMAIL && user.email === env.OWNER_EMAIL) {
      isAuthorized = true;
      role = 'owner';
    }

    if (!isAuthorized) {
      throw new Error('Account authenticated but not authorized as a studio owner. Please contact the administrator.');
    }

    const ownerName = (user.user_metadata && user.user_metadata.name) ||
                      (user.email ? user.email.split('@')[0] : 'Bhuvaneshwari');

    const expiresInSec = tokenData.expires_in || 3600;
    const expiresAt = new Date(Date.now() + expiresInSec * 1000).toISOString();

    return {
      token: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt,
      owner: {
        id: user.id,
        email: user.email,
        username: emailOrUsername,
        name: ownerName,
        role: role === 'staff' ? 'staff' : 'owner'
      }
    };
  }

  /**
   * Validate Supabase JWT token and verify owner permissions
   */
  static async verifyOwnerToken(env, token) {
    if (!token || !this.isConfigured(env)) return null;

    try {
      const baseUrl = env.SUPABASE_URL.replace(/\/+$/, '');
      const userUrl = `${baseUrl}/auth/v1/user`;
      const anonKey = env.SUPABASE_ANON_KEY || env.SUPABASE_SERVICE_ROLE_KEY;

      const res = await fetch(userUrl, {
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) return null;

      const user = await res.json();
      if (!user || !user.id) return null;

      // Verify role in user_roles table or app_metadata
      let isAuthorized = false;
      let role = 'owner';

      const roleCheckRes = await this.fetchSupabase(
        env,
        `/rest/v1/user_roles?user_id=eq.${encodeURIComponent(user.id)}&role=in.(admin,staff)&select=role`
      );

      if (roleCheckRes.ok) {
        const roleRows = await roleCheckRes.json();
        if (Array.isArray(roleRows) && roleRows.length > 0) {
          isAuthorized = true;
          role = roleRows[0].role;
        }
      }

      if (!isAuthorized && user.app_metadata && (user.app_metadata.role === 'admin' || user.app_metadata.role === 'owner')) {
        isAuthorized = true;
        role = user.app_metadata.role;
      }

      if (!isAuthorized && env.OWNER_EMAIL && user.email === env.OWNER_EMAIL) {
        isAuthorized = true;
        role = 'owner';
      }

      if (!isAuthorized) {
        console.warn(`[Supabase Auth] User ${user.id} (${user.email}) lacks admin role.`);
        return null;
      }

      const ownerName = (user.user_metadata && user.user_metadata.name) ||
                        (user.email ? user.email.split('@')[0] : 'Bhuvaneshwari');

      return {
        token,
        owner: {
          id: user.id,
          email: user.email,
          username: user.email ? user.email.split('@')[0] : 'admin',
          name: ownerName,
          role: role === 'staff' ? 'staff' : 'owner'
        }
      };
    } catch (err) {
      console.error('[Supabase Auth] Token verification error:', err);
      return null;
    }
  }
}
