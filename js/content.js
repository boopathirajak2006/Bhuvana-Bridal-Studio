/* Owner published text overrides for explicitly managed site copy. */
(function () {
  'use strict';
  const applyOverrides = () => {
    const fields = document.querySelectorAll('[data-content-key]');
    if (!fields.length || !window.BBS_CONFIG) return;
    fetch(window.BBS_CONFIG.url('/api/content'), { headers: { Accept: 'application/json' } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Content unavailable')))
      .then(data => fields.forEach(field => {
        const value = data.content?.[field.dataset.contentKey];
        if (typeof value === 'string') {
          field.textContent = value;
          field.classList.add('cms-managed');
        }
      }))
      .catch(() => {});
  };
  if (window.BBS_CONFIG) applyOverrides();
  else document.addEventListener('DOMContentLoaded', applyOverrides, { once: true });
})();
