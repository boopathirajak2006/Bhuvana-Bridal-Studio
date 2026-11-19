/* Public, view-only customer portfolio. Only owner-published photos are shown. */
(function () {
  'use strict';
  const grids = document.querySelectorAll('.gallery-live[data-category]');
  if (!grids.length || !window.BBS_CONFIG) return;

  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));

  grids.forEach(async grid => {
    const category = grid.dataset.category;
    try {
      const response = await fetch(window.BBS_CONFIG.url(`/api/gallery?category=${encodeURIComponent(category)}`), {
        headers: { Accept: 'application/json' }
      });
      if (!response.ok) throw new Error('Gallery unavailable');
      const data = await response.json();
      const photos = (data.photos || []).filter(photo => photo.image_url);
      grid.innerHTML = photos.map(photo => `
        <figure class="gallery-item">
          <img class="gallery-item-img" src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.title || 'Completed studio customer work')}" loading="lazy">
          ${photo.title ? `<figcaption class="gallery-caption"><h4>${escapeHtml(photo.title)}</h4></figcaption>` : ''}
        </figure>`).join('') || '<p class="gallery-empty">Completed customer work will appear here when published by the studio.</p>';
    } catch {
      grid.innerHTML = '<p class="gallery-empty">Gallery photos are temporarily unavailable.</p>';
    }
  });
})();
