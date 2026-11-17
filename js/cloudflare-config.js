/**
 * Bhuvana's Bridal & Tailoring Studio
 * Central Cloudflare Backend Configuration
 * Seamlessly manages API base URLs between local development and Cloudflare Workers production.
 */

(function () {
  'use strict';

  // Environment detection
  const isLocalhost = window.location.hostname === 'localhost' ||
                      window.location.hostname === '127.0.0.1' ||
                      window.location.hostname === '';

  // Cloudflare Workers Production Endpoint
  // Exact deployed Worker URL: bhuvana-booking-api
  const PRODUCTION_WORKER_URL = 'https://bhuvana-booking-api.boopathiraja-k2006.workers.dev';
  const LOCAL_WORKER_URL = 'http://localhost:8787';

  // Allow custom override via localStorage if needed
  const savedApiUrl = localStorage.getItem('bbs_api_url');

  const BBS_CONFIG = {
    // API Base URL
    apiBase: savedApiUrl || (isLocalhost ? LOCAL_WORKER_URL : PRODUCTION_WORKER_URL),
    isLocalhost: isLocalhost,

    // Helper to resolve full API URL
    url: function (endpoint) {
      const cleanPath = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
      return this.apiBase.replace(/\/+$/, '') + cleanPath;
    },

    // Standard JSON fetch helper with credentials & error parsing
    apiFetch: async function (endpoint, options = {}) {
      const fullUrl = this.url(endpoint);
      const defaultHeaders = {
        'Accept': 'application/json'
      };

      if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
      }

      // Add auth token if stored
      const token = localStorage.getItem('bbs_owner_token');
      if (token) {
        defaultHeaders['Authorization'] = 'Bearer ' + token;
      }

      const fetchOptions = {
        credentials: 'include', // Include HttpOnly cookies
        ...options,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      };

      try {
        const response = await fetch(fullUrl, fetchOptions);
        const data = await response.json().catch(() => ({
          success: false,
          error: 'Invalid response from server'
        }));

        if (!response.ok) {
          throw new Error(data.error || data.message || `Server returned error HTTP ${response.status}`);
        }

        return data;
      } catch (err) {
        // If network error while talking to worker on localhost, try fallback
        console.warn(`[BBS_CONFIG] API call to ${fullUrl} failed:`, err);
        throw err;
      }
    },

    // Firebase Web Push Configuration for Studio Owner
    // Real credentials must be provided via window.__ENV or injected upon deployment.
    // Placeholders have been removed to prevent unauthorized or failing network calls.
    firebaseConfig: (typeof window !== 'undefined' && window.__ENV && window.__ENV.FIREBASE_CONFIG) || null,

    isFirebaseConfigured: function () {
      return Boolean(
        this.firebaseConfig &&
        this.firebaseConfig.apiKey &&
        this.firebaseConfig.projectId &&
        this.firebaseConfig.vapidKey
      );
    }
  };

  // Expose globally
  window.BBS_CONFIG = BBS_CONFIG;
})();
