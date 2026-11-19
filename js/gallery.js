/* Division-specific customer portfolios. Only owner-published real work is displayed. */
(function () {
  'use strict';
  const categories = {
    'bridal-beauty': [
      ['baby-shower', 'Baby Shower Makeup'],
      ['wedding-makeup', 'Wedding Makeup'],
      ['party-makeup', 'Party Makeup'],
      ['engagement-makeup', 'Engagement Makeup'],
      ['reception-makeup', 'Reception Makeup'],
      ['bridal-hairstyling', 'Bridal Hairstyling'],
      ['other-bridal', 'Other Bridal Work']
    ],
    'designer-blouse': [
      ['bridal-blouse', 'Bridal Blouse Designs'],
      ['maggam-work', 'Maggam Work'],
      ['aari-work', 'Aari Work'],
      ['embroidery', 'Embroidery Designs'],
      ['sleeve-designs', 'Sleeve Designs'],
      ['neck-designs', 'Neck Designs'],
      ['other-blouse', 'Other Blouse Work']
    ]
  };
  const escapeHtml = value => String(value || '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

  document.querySelectorAll('[data-gallery-division]').forEach(async root => {
    const division = root.dataset.galleryDivision;
    const list = categories[division];
    if (!list || !window.BBS_CONFIG) return;
    try {
      const response = await fetch(window.BBS_CONFIG.url(`/api/gallery?category=${encodeURIComponent(division)}`), { headers: { Accept: 'application/json' } });
      if (!response.ok) throw new Error('Gallery unavailable');
      const data = await response.json();
      const photos = data.photos || [];
      let active = list[0][0];
      const render = () => {
        const matches = photos.filter(photo => photo.subcategory === active && photo.image_url);
        const currentLabel = list.find(([key]) => key === active)?.[1] || '';
        root.innerHTML = `
          <nav class="gallery-category-tabs" aria-label="Gallery categories">
            ${list.map(([key, label]) => `<button type="button" class="gallery-category-tab${active === key ? ' active' : ''}" data-gallery-filter="${key}" aria-pressed="${active === key}">${escapeHtml(label)}</button>`).join('')}
          </nav>
          <section class="gallery-category-panel" aria-live="polite">
            <h2>${escapeHtml(currentLabel)}</h2>
            <div class="gallery-grid">${matches.map(photo => `
              <figure class="gallery-item">
                <img class="gallery-item-img" src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.title || currentLabel + ' completed customer work')}" loading="lazy">
                ${photo.title ? `<figcaption class="gallery-caption"><h3>${escapeHtml(photo.title)}</h3></figcaption>` : ''}
              </figure>`).join('') || '<p class="gallery-empty">Completed customer photos in this category will appear here.</p>'}</div>
          </section>`;
        root.querySelectorAll('[data-gallery-filter]').forEach(button => button.addEventListener('click', () => {
          active = button.dataset.galleryFilter;
          render();
        }));
      };
      render();
    } catch {
      root.innerHTML = '<p class="gallery-empty">Gallery photos are temporarily unavailable.</p>';
    }
  });
})();
