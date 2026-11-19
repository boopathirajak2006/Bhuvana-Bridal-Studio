/** Bhuvana's Bridal Studio owner authentication client. */

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
        const value = localStorage.getItem(USER_KEY);
        return value ? JSON.parse(value) : null;
      } catch {
        return null;
      }
    },

    isAuthenticated: function () {
      return Boolean(this.getToken());
    },

    login: async function (username, password) {
      if (!window.BBS_CONFIG) throw new Error('Backend configuration missing');
      const result = await window.BBS_CONFIG.apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      if (!result?.success || !result.token) {
        throw new Error(result?.error || result?.message || 'Authentication failed');
      }
      localStorage.setItem(TOKEN_KEY, result.token);
      if (result.owner) localStorage.setItem(USER_KEY, JSON.stringify(result.owner));
      return result;
    },

    logout: async function () {
      try {
        if (window.BBS_CONFIG && this.isAuthenticated()) {
          await window.BBS_CONFIG.apiFetch('/api/auth/logout', { method: 'POST' });
        }
      } catch (err) {
        console.warn('Logout API error:', err);
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
