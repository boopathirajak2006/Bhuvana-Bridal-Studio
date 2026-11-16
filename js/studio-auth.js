/**
 * Bhuvana's Bridal & Tailoring Studio
 * Studio Owner Authentication Client
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
      if (!window.BBS_CONFIG) {
        throw new Error('Cloudflare configuration missing');
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
        throw new Error(res.error || 'Authentication failed');
      }
    },

    logout: async function () {
      try {
        if (window.BBS_CONFIG && this.isAuthenticated()) {
          await window.BBS_CONFIG.apiFetch('/api/auth/logout', {
            method: 'POST'
          });
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
