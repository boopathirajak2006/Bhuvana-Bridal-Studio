/**
 * Bhuvana's Bridal Studio — Review Details Controller
 * Summarizes customer data, services, requirements, and handles final WhatsApp handoff
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.BBS_STORE || !window.BBS_CATALOG) return;

    const store = window.BBS_STORE;
    const services = store.getPopulated();
    const contact = store.getContact();
    const req = store.getRequirements();

    // Render Progress Bar (Step 5 of 5)
    store.renderProgressBar('progress-bar-container', 5);

    if (services.length === 0) {
      window.location.href = 'select-service.html';
      return;
    }

    // Populate Client Info
    const clientNameEl = document.getElementById('rev-client-name');
    const clientMobileEl = document.getElementById('rev-client-mobile');
    const clientEmailEl = document.getElementById('rev-client-email');
    const eventDateEl = document.getElementById('rev-event-date');
    const locationEl = document.getElementById('rev-location');

    if (clientNameEl) clientNameEl.textContent = contact.name || 'Not provided';
    if (clientMobileEl) clientMobileEl.textContent = contact.mobile || 'Not provided';
    if (clientEmailEl) clientEmailEl.textContent = contact.email || 'Not provided';
    if (eventDateEl) eventDateEl.textContent = contact.eventDate || 'Not specified';
    if (locationEl) locationEl.textContent = contact.location || 'Salem / Nearby';

    // Populate Divisions & Services
    const divisions = [...new Set(services.map(s => s.division))];
    const divisionsEl = document.getElementById('rev-divisions');
    if (divisionsEl) divisionsEl.textContent = divisions.join(' & ');

    const servicesListEl = document.getElementById('rev-services-list');
    if (servicesListEl) {
      servicesListEl.innerHTML = services.map(s => `
        <div class="selected-service-item" style="margin-bottom:0.5rem;">
          <div class="selected-service-info">
            <span class="selected-service-title">${s.title}</span>
            <span class="selected-service-meta">${s.division} &bull; ${s.category}</span>
          </div>
          <span class="selected-service-price">${s.pricingDisplay}</span>
        </div>
      `).join('');
    }

    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // Populate Requirements
    const reqListEl = document.getElementById('rev-requirements-list');
    if (reqListEl) {
      const items = [];
      if (req.makeupStyle) items.push(`<li><strong>Makeup Style:</strong> ${escapeHtml(req.makeupStyle)}</li>`);
      if (req.eventType) items.push(`<li><strong>Event Type:</strong> ${escapeHtml(req.eventType)}</li>`);
      if (req.makeupPeople) items.push(`<li><strong>Makeup Headcount:</strong> ${escapeHtml(req.makeupPeople)} person(s)</li>`);
      if (req.hairStyle) items.push(`<li><strong>Hairstyle:</strong> ${escapeHtml(req.hairStyle)}</li>`);
      if (req.drapingType) items.push(`<li><strong>Saree Draping / Setting:</strong> ${escapeHtml(req.drapingType)}</li>`);
      if (req.mehndiStyle) items.push(`<li><strong>Mehndi Style:</strong> ${escapeHtml(req.mehndiStyle)}</li>`);
      if (req.blouseDesignType) items.push(`<li><strong>Blouse Design:</strong> ${escapeHtml(req.blouseDesignType)}</li>`);
      if (req.blouseStitchType) items.push(`<li><strong>Blouse Stitching:</strong> ${escapeHtml(req.blouseStitchType)}</li>`);
      if (req.aariWorkType) items.push(`<li><strong>Aari Work:</strong> ${escapeHtml(req.aariWorkType)}</li>`);
      if (req.specificNotes) items.push(`<li><strong>Special Notes:</strong> ${escapeHtml(req.specificNotes)}</li>`);

      if (items.length === 0) {
        reqListEl.innerHTML = '<p style="color:var(--muted); font-size:0.9rem;">No custom requirements specified. To be discussed during consultation.</p>';
      } else {
        reqListEl.innerHTML = `<ul style="color:var(--ink); font-size:0.92rem; padding-left:1.2rem; display:flex; flex-direction:column; gap:0.4rem;">${items.join('')}</ul>`;
      }
    }

    // Message
    const msgEl = document.getElementById('rev-message');
    if (msgEl) {
      msgEl.textContent = contact.message ? `“${contact.message}”` : 'No additional message provided.';
    }

    // Primary Action: Generate Booking Poster & Continue
    const btnGenerateImage = document.getElementById('btn-generate-booking-image');
    if (btnGenerateImage) {
      btnGenerateImage.addEventListener('click', function () {
        window.location.href = 'booking-preview.html';
      });
    }
  });

})();
