/**
 * Bhuvana's Bridal Studio — Interactive Gallery Controller
 * Powers the 8-category public gallery with category filtering,
 * API synchronization with Cloudflare D1/Cloudinary, and responsive lightbox.
 */

(function () {
  'use strict';

  var currentCategory = 'all';
  var allItems = (window.BBS_GALLERY_ITEMS || []).slice();
  var categories = (window.BBS_GALLERY_CATEGORIES || []).slice();

  document.addEventListener('DOMContentLoaded', function () {
    initGallery();
  });

  async function initGallery() {
    // 1. Check for URL hash parameter to pre-filter (e.g. #aari-work)
    var hash = window.location.hash ? window.location.hash.substring(1) : '';
    if (hash && categories.some(function (c) { return c.id === hash; })) {
      currentCategory = hash;
    }

    // 2. Fetch live gallery data from Cloudflare Worker API if available
    await fetchLiveGallery();

    // 3. Render categories navigation
    renderCategoryFilter();

    // 4. Render initial gallery items
    renderGalleryGrid();

    // 5. Initialize Lightbox modal
    initLightbox();

    // 6. Listen for hash changes
    window.addEventListener('hashchange', function () {
      var newHash = window.location.hash ? window.location.hash.substring(1) : 'all';
      if (newHash === 'all' || categories.some(function (c) { return c.id === newHash; })) {
        setCategory(newHash, false);
      }
    });
  }

  async function fetchLiveGallery() {
    try {
      var apiUrl = '/api/gallery';
      if (window.BBS_CONFIG && window.BBS_CONFIG.API_BASE_URL) {
        apiUrl = window.BBS_CONFIG.API_BASE_URL.replace(/\/$/, '') + '/api/gallery';
      }

      var res = await fetch(apiUrl);
      if (res.ok) {
        var data = await res.json();
        if (data && data.items && Array.isArray(data.items) && data.items.length > 0) {
          allItems = data.items;
          if (data.categories && Array.isArray(data.categories)) {
            categories = data.categories;
          }
        }
      }
    } catch (e) {
      // Offline fallback: BBS_GALLERY_ITEMS from gallery-data.js remains authoritative
    }
  }

  function renderCategoryFilter() {
    var container = document.getElementById('gallery-category-filter');
    if (!container) return;

    var totalCount = allItems.length;

    var html = '<button type="button" class="gallery-tab ' + (currentCategory === 'all' ? 'active' : '') + '" data-cat="all">' +
               'All Photos <span class="tab-count">' + totalCount + '</span>' +
               '</button>';

    categories.forEach(function (cat) {
      var catCount = allItems.filter(function (it) { return it.category === cat.id; }).length;
      var isActive = currentCategory === cat.id;
      html += '<button type="button" class="gallery-tab ' + (isActive ? 'active' : '') + '" data-cat="' + cat.id + '">' +
              escapeHtml(cat.name) + ' <span class="tab-count">' + catCount + '</span>' +
              '</button>';
    });

    container.innerHTML = html;

    // Attach click events
    var tabs = container.querySelectorAll('.gallery-tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var catId = this.getAttribute('data-cat');
        setCategory(catId, true);
      });
    });
  }

  function setCategory(catId, updateHash) {
    currentCategory = catId;
    if (updateHash) {
      if (catId === 'all') {
        history.pushState(null, '', window.location.pathname + window.location.search);
      } else {
        window.location.hash = catId;
      }
    }

    // Update active tab styling
    var container = document.getElementById('gallery-category-filter');
    if (container) {
      var tabs = container.querySelectorAll('.gallery-tab');
      tabs.forEach(function (tab) {
        if (tab.getAttribute('data-cat') === catId) {
          tab.classList.add('active');
        } else {
          tab.classList.remove('active');
        }
      });
    }

    // Update description banner
    renderCategoryHeader();

    // Re-render photos
    renderGalleryGrid();
  }

  function renderCategoryHeader() {
    var headerEl = document.getElementById('gallery-active-category-info');
    if (!headerEl) return;

    if (currentCategory === 'all') {
      headerEl.innerHTML = '<div class="gallery-active-banner">' +
                           '<span class="badge primary">Complete Portfolio</span>' +
                           '<h3>All Studio Work &middot; 8 Categories</h3>' +
                           '<p>Browse all 48 signature bridal makeup looks, hairstyles, saree drapes, and artisan blouse embroidery.</p>' +
                           '</div>';
    } else {
      var catObj = categories.find(function (c) { return c.id === currentCategory; });
      if (catObj) {
        var count = allItems.filter(function (it) { return it.category === currentCategory; }).length;
        headerEl.innerHTML = '<div class="gallery-active-banner">' +
                             '<span class="badge primary">' + escapeHtml(catObj.name) + ' (' + count + ' Photos)</span>' +
                             '<h3>' + escapeHtml(catObj.name) + '</h3>' +
                             '<p>' + escapeHtml(catObj.description || '') + '</p>' +
                             '</div>';
      }
    }
  }

  function renderGalleryGrid() {
    var grid = document.getElementById('public-gallery-grid');
    if (!grid) return;

    var filtered = currentCategory === 'all'
      ? allItems
      : allItems.filter(function (it) { return it.category === currentCategory; });

    if (filtered.length === 0) {
      grid.innerHTML = '<div class="center" style="grid-column: 1/-1; padding: 3rem;">' +
                       '<p style="color:var(--muted); font-size:1.1rem;">No photos currently available in this category.</p>' +
                       '</div>';
      return;
    }

    var html = filtered.map(function (it, idx) {
      var sampleBadge = it.isSample
        ? '<span class="gallery-sample-tag" title="Illustrative sample. Studio client photo updates regularly.">&#9432; Sample Photo</span>'
        : '';

      return '<div class="gallery-card" data-idx="' + idx + '" data-id="' + it.id + '">' +
             '  <div class="gallery-card-thumb-wrap">' +
             '    <img class="gallery-card-img" src="' + escapeHtml(it.imageUrl) + '" alt="' + escapeHtml(it.title) + '" loading="lazy">' +
             '    <div class="gallery-card-overlay">' +
             '      <button class="btn-gallery-zoom" aria-label="Enlarge ' + escapeHtml(it.title) + '">&#128269; View</button>' +
             '    </div>' +
                  sampleBadge +
             '  </div>' +
             '  <div class="gallery-card-info">' +
             '    <span class="gallery-cat-pill">' + escapeHtml(it.categoryName || it.category) + '</span>' +
             '    <h4 class="gallery-card-title">' + escapeHtml(it.title) + '</h4>' +
             '    <p class="gallery-card-desc">' + escapeHtml(it.description || '') + '</p>' +
             '  </div>' +
             '</div>';
    }).join('');

    grid.innerHTML = html;

    // Attach click events for lightbox
    var cards = grid.querySelectorAll('.gallery-card');
    cards.forEach(function (card) {
      card.addEventListener('click', function () {
        var itemId = this.getAttribute('data-id');
        var item = allItems.find(function (it) { return it.id === itemId; });
        if (item) {
          openLightbox(item);
        }
      });
    });
  }

  // ==========================================
  // LIGHTBOX MODAL
  // ==========================================
  function initLightbox() {
    var modal = document.getElementById('gallery-lightbox');
    if (!modal) return;

    var btnClose = modal.querySelector('.lightbox-close');
    if (btnClose) {
      btnClose.addEventListener('click', closeLightbox);
    }

    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.classList.contains('lightbox-backdrop')) {
        closeLightbox();
      }
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modal.classList.contains('active')) {
        closeLightbox();
      }
    });
  }

  function openLightbox(item) {
    var modal = document.getElementById('gallery-lightbox');
    if (!modal) return;

    var img = modal.querySelector('#lightbox-img');
    var title = modal.querySelector('#lightbox-title');
    var cat = modal.querySelector('#lightbox-cat');
    var desc = modal.querySelector('#lightbox-desc');
    var sample = modal.querySelector('#lightbox-sample');

    if (img) {
      img.src = item.imageUrl;
      img.alt = item.title;
    }
    if (title) title.textContent = item.title;
    if (cat) cat.textContent = item.categoryName || item.category;
    if (desc) desc.textContent = item.description || '';
    if (sample) {
      sample.style.display = item.isSample ? 'inline-block' : 'none';
    }

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox() {
    var modal = document.getElementById('gallery-lightbox');
    if (!modal) return;

    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
