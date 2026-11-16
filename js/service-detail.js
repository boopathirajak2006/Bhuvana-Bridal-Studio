/**
 * Bhuvana's Bridal Studio — Service Detail Controller
 * Handles dynamic service rendering, pricing display, and the multi-service selection prompt
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    const params = new URLSearchParams(window.location.search);
    const serviceId = params.get('id') || 'bridal-makeup';
    const service = window.BBS_CATALOG ? window.BBS_CATALOG.getById(serviceId) : null;

    if (!service) {
      console.warn('Service not found for ID:', serviceId);
      return;
    }

    // Populate Page Elements
    const titleEl = document.getElementById('srv-title');
    const divisionEl = document.getElementById('srv-division');
    const categoryEl = document.getElementById('srv-category');
    const categoryLinkEl = document.getElementById('srv-category-link');
    const taglineEl = document.getElementById('srv-tagline');
    const descEl = document.getElementById('srv-desc');
    const pricingDisplayEl = document.getElementById('srv-pricing-display');
    const pricingNoteEl = document.getElementById('srv-pricing-note');
    const imgEl = document.getElementById('srv-img');

    if (titleEl) titleEl.textContent = service.title;
    if (divisionEl) divisionEl.textContent = service.division;
    if (categoryEl) categoryEl.textContent = service.category;
    if (categoryLinkEl) {
      categoryLinkEl.textContent = service.category;
      categoryLinkEl.href = service.categoryPage;
    }
    if (taglineEl) taglineEl.textContent = service.tagline;
    if (descEl) descEl.textContent = service.description;
    if (pricingDisplayEl) pricingDisplayEl.textContent = service.pricingDisplay;
    if (pricingNoteEl) pricingNoteEl.textContent = service.pricingNote;
    if (imgEl) {
      imgEl.src = service.image;
      imgEl.alt = service.title + ' — Bhuvana Bridal Studio Salem';
    }

    // Modal elements
    const modal = document.getElementById('more-services-modal');
    const btnSelect = document.getElementById('btn-select-service');
    const btnYes = document.getElementById('btn-modal-yes');
    const btnNo = document.getElementById('btn-modal-no');

    if (btnSelect) {
      btnSelect.addEventListener('click', function () {
        if (window.BBS_STORE) {
          window.BBS_STORE.setFirstId(service.id);
        }
        if (modal) {
          modal.classList.add('is-open');
          document.body.style.overflow = 'hidden';
        } else {
          window.location.href = 'additional-services.html';
        }
      });
    }

    if (btnYes) {
      btnYes.addEventListener('click', function () {
        window.location.href = 'additional-services.html';
      });
    }

    if (btnNo) {
      btnNo.addEventListener('click', function () {
        window.location.href = 'requirements.html';
      });
    }
  });

})();
