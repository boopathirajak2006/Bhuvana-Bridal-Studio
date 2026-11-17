/**
 * Bhuvana's Bridal & Tailoring Studio
 * Studio Owner Authentication Client
 * 
 * Secure authentication with Supabase Auth (GoTrue) & Worker JWT verification.
 */

(function () {
  'use strict';

  const TOKEN_KEY = 'bbs_owner_token';
  const USER_KEY = 'bbs_owner_user';

  const BBS_AUTH = {
    getToken: function () {
      return localStorage.getItem(TOKEN_KEY);
    },

    getUser: function () {
      try {
        const u = localStorage.getItem(USER_KEY);
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    },

    isAuthenticated: function () {
      return Boolean(this.getToken());
    },

    login: async function (username, password) {
      // 1. Direct Supabase Auth Client Authentication (if client SDK configured)
      if (window.BBS_SUPABASE && window.BBS_SUPABASE.isConfigured()) {
        const supabase = window.BBS_SUPABASE.getClient();
        if (supabase) {
          let email = username.trim();
          if (!email.includes('@')) {
            email = `${email.toLowerCase()}@bhuvanasbridal.com`;
          }

          const { data, error } = await supabase.auth.signInWithPassword({
            email: email,
            password: password
          });

          if (error) {
            throw new Error(error.message || 'Supabase authentication failed');
          }

          if (data && data.session) {
            localStorage.setItem(TOKEN_KEY, data.session.access_token);
            const userObj = {
              id: data.user.id,
              email: data.user.email,
              name: (data.user.user_metadata && data.user.user_metadata.name) || data.user.email.split('@')[0],
              role: 'owner'
            };
            localStorage.setItem(USER_KEY, JSON.stringify(userObj));
            return {
              success: true,
              token: data.session.access_token,
              owner: userObj
            };
          }
        }
      }

      // 2. Cloudflare Worker Gateway Authentication (routes to Supabase Auth on server)
      if (!window.BBS_CONFIG) {
        throw new Error('Backend configuration missing');
      }

      const res = await window.BBS_CONFIG.apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      if (res && res.success && res.token) {
        localStorage.setItem(TOKEN_KEY, res.token);
        if (res.owner) {
          localStorage.setItem(USER_KEY, JSON.stringify(res.owner));
        }
        return res;
      } else {
        throw new Error(res.error || res.message || 'Authentication failed');
      }
    },

    logout: async function () {
      try {
        // Sign out of Supabase client session if active
        if (window.BBS_SUPABASE && window.BBS_SUPABASE.isConfigured()) {
          const supabase = window.BBS_SUPABASE.getClient();
          if (supabase) {
            await supabase.auth.signOut().catch(() => {});
          }
        }
        // Sign out of backend session
        if (window.BBS_CONFIG && this.isAuthenticated()) {
          await window.BBS_CONFIG.apiFetch('/api/auth/logout', {
            method: 'POST'
          }).catch(() => {});
        }
      } catch (e) {
        console.warn('Logout API error:', e);
      } finally {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        window.location.href = 'studio-login.html';
      }
    },

    requireAuth: function () {
      if (!this.isAuthenticated()) {
        window.location.href = 'studio-login.html';
        return false;
      }
      return true;
    }
  };

  window.BBS_AUTH = BBS_AUTH;
})();
