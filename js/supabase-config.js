/**
 * ==============================================================================
 * Bhuvana's Bridal Studio — Supabase Client Configuration
 * ==============================================================================
 *
 * CRITICAL SECURITY NOTICE:
 * -------------------------
 * 1. ONLY paste your public `anon` (publishable) key here.
 * 2. NEVER paste your `service_role` (secret) key in this file or any frontend file.
 *    The service_role key bypasses all Row Level Security policies!
 * 3. Row Level Security (RLS) is enabled in Postgres to ensure public users can
 *    ONLY insert pending bookings, and CANNOT view or edit any customer data.
 * ==============================================================================
 */

(function (root) {
  'use strict';

  // Configuration object with placeholders.
  // Replace these with your actual Supabase Project URL and anon key once created.
  const SUPABASE_CONFIG = {
    // Example: 'https://abcdefghijklm.supabase.co'
    url: (typeof window !== 'undefined' && window.__ENV && window.__ENV.SUPABASE_URL) || 'https://YOUR_PROJECT_ID.supabase.co',
    
    // Example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    anonKey: (typeof window !== 'undefined' && window.__ENV && window.__ENV.SUPABASE_ANON_KEY) || 'YOUR_SUPABASE_ANON_KEY'
  };

  /**
   * Checks whether actual project credentials have been configured.
   * Returns false if placeholder tokens are still present.
   */
  function isSupabaseConfigured() {
    return Boolean(
      SUPABASE_CONFIG.url &&
      SUPABASE_CONFIG.anonKey &&
      !SUPABASE_CONFIG.url.includes('YOUR_PROJECT_ID') &&
      !SUPABASE_CONFIG.anonKey.includes('YOUR_SUPABASE_ANON_KEY')
    );
  }

  /**
   * Initializes and returns the Supabase client instance safely.
   * Returns null if unconfigured or if the Supabase SDK is not yet loaded.
   */
  let _client = null;

  function getSupabaseClient() {
    if (_client) return _client;

    if (!isSupabaseConfigured()) {
      return null;
    }

    if (typeof root.supabase === 'undefined' || typeof root.supabase.createClient !== 'function') {
      console.warn('[Supabase] Supabase JS SDK not detected on window. Ensure CDN script is included before initializing.');
      return null;
    }

    _client = root.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true
      }
    });

    return _client;
  }

  // Export to global window object
  root.BBS_SUPABASE = {
    config: SUPABASE_CONFIG,
    isConfigured: isSupabaseConfigured,
    getClient: getSupabaseClient
  };

})(typeof window !== 'undefined' ? window : this);
