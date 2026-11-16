/**
 * Bhuvana's Bridal Studio — Additional Services Selection Controller
 * Renders categorized service checkboxes across both divisions,
 * synchronizes with BBS_STORE, updates the selection summary card, and handles Continue/Back.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.BBS_STORE || !window.BBS_CATALOG) {
      console.error('Store or Catalog not loaded');
      return;
    }

    // Render Progress Bar (Step 2 of 5)
    window.BBS_STORE.renderProgressBar('progress-bar-container', 2);

    const catalog = window.BBS_CATALOG.services;
    const store = window.BBS_STORE;

    const summaryContainer = document.getElementById('selected-summary-list');
    const summaryCountEl = document.getElementById('selected-summary-count');
    const btnContinue = document.getElementById('btn-continue-req');
    const btnBack = document.getElementById('btn-back-prev');

    // Renders the summary of selected services
    function renderSummary() {
      const selectedIds = store.getSelectedIds();
      if (summaryCountEl) {
        summaryCountEl.textContent = selectedIds.length;
      }

      if (!summaryContainer) return;

      if (selectedIds.length === 0) {
        summaryContainer.innerHTML = '<p style="color:var(--muted); font-size:0.9rem; padding:0.5rem 0;">No services currently selected. Please check at least one service below.</p>';
        return;
      }

      let html = '';
      selectedIds.forEach(function (id) {
        const srv = catalog[id];
        if (!srv) return;
        html += `
          <div class="selected-service-item">
            <div class="selected-service-info">
              <span class="selected-service-title">${srv.title}</span>
              <span class="selected-service-meta">${srv.division} &bull; ${srv.category}</span>
            </div>
            <div style="display:flex; align-items:center; gap:0.75rem;">
              <span class="selected-service-price">${srv.pricingDisplay}</span>
              <button class="btn-remove" type="button" data-remove-id="${srv.id}" title="Remove this service">Remove &times;</button>
            </div>
          </div>
        `;
      });

      summaryContainer.innerHTML = html;

      // Attach remove handlers
      summaryContainer.querySelectorAll('.btn-remove').forEach(function (btn) {
        btn.addEventListener('click', function () {
          const idToRemove = this.getAttribute('data-remove-id');
          store.removeService(idToRemove);
          syncCheckboxes();
          renderSummary();
        });
      });
    }

    // Synchronizes the checkboxes on the page with the store
    function syncCheckboxes() {
      const selectedIds = store.getSelectedIds();
      document.querySelectorAll('input[type="checkbox"][data-service-id]').forEach(function (chk) {
        const id = chk.getAttribute('data-service-id');
        chk.checked = selectedIds.includes(id);
      });
    }

    // Attach change handlers to all service checkboxes
    document.querySelectorAll('input[type="checkbox"][data-service-id]').forEach(function (chk) {
      chk.addEventListener('change', function () {
        const id = this.getAttribute('data-service-id');
        if (this.checked) {
          store.addService(id);
        } else {
          store.removeService(id);
        }
        renderSummary();
      });
    });

    // Continue Button Handler
    if (btnContinue) {
      btnContinue.addEventListener('click', function () {
        const selected = store.getSelectedIds();
        if (selected.length === 0) {
          alert('Please select at least one service to continue.');
          return;
        }
        window.location.href = 'requirements.html';
      });
    }

    // Back Button Handler
    if (btnBack) {
      btnBack.addEventListener('click', function () {
        window.history.back();
      });
    }

    // Initial render
    syncCheckboxes();
    renderSummary();
  });

})();
