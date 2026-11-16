/**
 * Bhuvana's Bridal & Tailoring Studio — Dynamic Booking Poster Generator
 * Generates high-fidelity 1080px booking confirmation image matching the reference design.
 */

(function (root) {
  'use strict';

  // Label dictionary for customer requirements
  const REQ_LABELS = {
    makeupStyle: 'Makeup Style',
    eventType: 'Event Type',
    makeupPeople: 'People for Makeup',
    hairStyle: 'Hairstyle',
    drapingType: 'Saree Draping',
    mehndiStyle: 'Mehndi Design',
    blouseDesignType: 'Blouse Design',
    blouseStitchType: 'Stitching Preference',
    aariWorkType: 'Aari Embroidery',
    specificNotes: 'Special Request'
  };

  function formatDate(isoStr) {
    if (!isoStr) return 'Not specified';
    const parts = isoStr.split('-').map(Number);
    if (parts.length !== 3) return isoStr;
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  }

  /**
   * Generates the dynamic HTML markup for the 1080px poster
   */
  function generatePosterHTML(data) {
    const contact = data.contact || {};
    const services = (data.services || []).filter(Boolean);
    const requirements = data.requirements || {};
    const ref = data.ref || 'BBS-2026-ENQ';

    const customerName = contact.name || contact.fullName || 'Valued Client';
    const customerMobile = contact.mobile || contact.phone || 'Not provided';
    const eventDate = formatDate(contact.eventDate || contact.preferredDate);
    const location = contact.location || 'Salem / Nearby Venue';

    // Separate services into divisions
    const bridalServices = services.filter(s => s.divisionId === 'bridal-beauty');
    const tailoringServices = services.filter(s => s.divisionId === 'designer-blouse');

    const hasBoth = bridalServices.length > 0 && tailoringServices.length > 0;
    const gridClass = hasBoth ? 'selected-services-grid two-col' : 'selected-services-grid';

    // Helper to format service price badge
    function getPriceDisplay(s) {
      if (s.pricingType === 'range' && s.pricingTiers && s.pricingTiers.length > 0) {
        return '₹' + s.pricingTiers.map(t => t.amount.toLocaleString('en-IN')).join(' · ₹');
      }
      if (s.pricingDisplay && s.pricingDisplay !== 'Request a Quote') {
        return s.pricingDisplay;
      }
      return 'Contact for Pricing';
    }

    // Build Bridal Group HTML
    let bridalGroupHTML = '';
    if (bridalServices.length > 0) {
      const items = bridalServices.map(s => `
        <li class="service-item-row">
          <span class="check-circle">✓</span>
          <div class="service-item-details">
            <span class="service-title">${s.title}</span>
            <span class="service-price-tag ${s.pricingType === 'quote' ? 'quote' : ''}">${getPriceDisplay(s)}</span>
          </div>
        </li>
      `).join('');

      bridalGroupHTML = `
        <div class="services-group ${hasBoth ? 'with-divider' : ''}">
          <span class="services-group-pill">Bridal &amp; Beauty Services</span>
          <div class="services-group-body">
            <div class="services-group-icon">
              <img src="assets/images/poster/icon-bridal-avatar-trans.png" alt="Bridal Services Icon">
            </div>
            <ul class="services-items-list">
              ${items}
            </ul>
          </div>
        </div>
      `;
    }

    // Build Tailoring Group HTML
    let tailoringGroupHTML = '';
    if (tailoringServices.length > 0) {
      const items = tailoringServices.map(s => `
        <li class="service-item-row">
          <span class="check-circle">✓</span>
          <div class="service-item-details">
            <span class="service-title">${s.title}</span>
            <span class="service-price-tag ${s.pricingType === 'quote' ? 'quote' : ''}">${getPriceDisplay(s)}</span>
          </div>
        </li>
      `).join('');

      tailoringGroupHTML = `
        <div class="services-group">
          <span class="services-group-pill">Tailoring &amp; Blouse Services</span>
          <div class="services-group-body">
            <div class="services-group-icon">
              <img src="assets/images/poster/icon-tailoring-mannequin-trans.png" alt="Tailoring Services Icon">
            </div>
            <ul class="services-items-list">
              ${items}
            </ul>
          </div>
        </div>
      `;
    }

    // If no services in either (edge case fallback)
    if (!bridalGroupHTML && !tailoringGroupHTML) {
      bridalGroupHTML = `
        <div class="services-group">
          <span class="services-group-pill">Studio Consultation</span>
          <ul class="services-items-list" style="margin-top:10px;">
            <li class="service-item-row">
              <span class="check-circle">✓</span>
              <div class="service-item-details">
                <span class="service-title">General Bridal &amp; Tailoring Consultation</span>
                <span class="service-price-tag quote">Custom Quote Pending</span>
              </div>
            </li>
          </ul>
        </div>
      `;
    }

    // Build Requirements HTML (only non-empty fields)
    const reqEntries = [];
    Object.keys(REQ_LABELS).forEach(key => {
      const val = requirements[key];
      if (val && String(val).trim().length > 0) {
        reqEntries.push({ label: REQ_LABELS[key], value: String(val).trim() });
      }
    });

    // Also include client message if present and not already shown
    if (contact.message && String(contact.message).trim().length > 0 && !requirements.specificNotes) {
      reqEntries.push({ label: 'Client Special Note', value: String(contact.message).trim() });
    }

    let reqSectionHTML = '';
    if (reqEntries.length > 0) {
      const rows = reqEntries.map(entry => `
        <div class="req-row">
          <span class="req-label">${entry.label}</span>
          <span class="req-colon">:</span>
          <span class="req-value">${entry.value}</span>
        </div>
      `).join('');

      reqSectionHTML = `
        <!-- Section 3: Additional Requirements -->
        <section class="poster-panel" aria-label="Additional Requirements">
          <div class="poster-panel-badge">
            <span>📋</span>
            <span>ADDITIONAL REQUIREMENTS</span>
          </div>
          <div class="req-table">
            ${rows}
          </div>
        </section>
      `;
    }

    return `
      <div class="booking-poster-container" id="poster-root">
        <!-- Corner Floral Ornaments -->
        <img class="poster-floral poster-floral-tr" src="assets/images/poster/roses-top-right-trans.png" alt="" aria-hidden="true">
        <img class="poster-floral poster-floral-bl" src="assets/images/poster/roses-bottom-left-trans.png" alt="" aria-hidden="true">
        <img class="poster-floral poster-floral-br" src="assets/images/poster/roses-bottom-right-trans.png" alt="" aria-hidden="true">

        <!-- Outer Ornamental Frame -->
        <div class="poster-frame">
          <span class="poster-corner-flourish tl"></span>
          <span class="poster-corner-flourish tr"></span>
          <span class="poster-corner-flourish bl"></span>
          <span class="poster-corner-flourish br"></span>

          <!-- Header Section -->
          <header class="poster-header">
            <div class="poster-logo-wrap">
              <img class="poster-logo-img" src="assets/images/logo.png" alt="Bhuvana's Bridal Studio Logo">
            </div>
            <div class="poster-brand-wrap">
              <h1 class="poster-brand-title">Bhuvana's</h1>
              <div class="poster-brand-sub">Bridal &amp; Tailoring Studio</div>
              <div class="poster-header-divider">
                <span class="poster-header-divider-text">CUSTOMER BOOKING DETAILS</span>
                <span class="poster-header-line"></span>
              </div>
              <div class="poster-heart-center">♥</div>
            </div>
          </header>

          <!-- Section 1: Customer Information -->
          <section class="poster-panel" aria-label="Customer Information">
            <div class="poster-panel-badge">
              <span>👤</span>
              <span>CUSTOMER INFORMATION</span>
            </div>
            <div class="customer-info-layout">
              <div class="customer-info-table">
                <div class="info-row">
                  <span class="info-icon">👤</span>
                  <span class="info-label">Name</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${customerName}</span>
                </div>
                <div class="info-row">
                  <span class="info-icon">📞</span>
                  <span class="info-label">Mobile</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${customerMobile}</span>
                </div>
                <div class="info-row">
                  <span class="info-icon">📅</span>
                  <span class="info-label">Event Date</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${eventDate}</span>
                </div>
                <div class="info-row">
                  <span class="info-icon">📍</span>
                  <span class="info-label">Location</span>
                  <span class="info-colon">:</span>
                  <span class="info-value">${location}</span>
                </div>
                <div class="info-row">
                  <span class="info-icon">🔖</span>
                  <span class="info-label">Booking Ref</span>
                  <span class="info-colon">:</span>
                  <span class="info-value" style="color:#8A6230; letter-spacing:0.04em;">${ref}</span>
                </div>
              </div>

              <div class="customer-illustration-wrap">
                <span class="floating-hearts">♡ ♡</span>
                <img class="customer-illustration-img" src="assets/images/poster/bride-illustration-trans.png" alt="Bridal Illustration">
              </div>
            </div>
          </section>

          <!-- Section 2: Selected Services -->
          <section class="poster-panel" aria-label="Selected Services">
            <div class="poster-panel-badge">
              <span>💎</span>
              <span>SELECTED SERVICES</span>
            </div>
            <div class="${gridClass}">
              ${bridalGroupHTML}
              ${tailoringGroupHTML}
            </div>
          </section>

          ${reqSectionHTML}

          <!-- Section 4: Final Status Section -->
          <footer class="poster-status-wrap">
            <div class="status-banner-row">
              <span class="status-flank-line"></span>
              <div class="status-pill-banner">
                <span class="status-check-circle">✓</span>
                <span class="status-text">ENQUIRY RECEIVED – PENDING CONFIRMATION</span>
              </div>
              <span class="status-flank-line"></span>
            </div>

            <p class="poster-thankyou-script">
              Thank you for choosing Bhuvana's Bridal &amp; Tailoring Studio
              <span class="poster-thankyou-heart">♡</span>
            </p>
          </footer>
        </div>
      </div>
    `;
  }

  /**
   * Waits for all images inside target element to complete loading
   */
  function waitForImages(element) {
    const images = Array.from(element.querySelectorAll('img'));
    const promises = images.map(img => {
      if (img.complete && img.naturalHeight !== 0) {
        return Promise.resolve();
      }
      return new Promise(resolve => {
        img.addEventListener('load', resolve, { once: true });
        img.addEventListener('error', resolve, { once: true });
      });
    });
    return Promise.all(promises);
  }

  /**
   * Renders the dynamic poster DOM element to a high-resolution canvas
   */
  async function renderPosterToCanvas(targetElement) {
    if (typeof html2canvas === 'undefined') {
      throw new Error('html2canvas library is not loaded');
    }

    // Wait for fonts
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready;
    }

    // Wait for images
    await waitForImages(targetElement);

    // Give DOM a micro-tick to compute layout
    await new Promise(r => setTimeout(r, 60));

    const canvas = await html2canvas(targetElement, {
      scale: 2, // 2x retina sharpness (2160px rendered)
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#FEF6ED',
      width: 1080,
      logging: false,
      imageTimeout: 10000
    });

    return canvas;
  }

  /**
   * Helper to download canvas as PNG
   */
  function downloadCanvasAsPNG(canvas, filename) {
    const link = document.createElement('a');
    link.download = filename || 'Bhuvana-Bridal-Booking.png';
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Helper to convert canvas to Blob
   */
  function canvasToBlob(canvas) {
    return new Promise(resolve => {
      canvas.toBlob(blob => resolve(blob), 'image/png');
    });
  }

  /**
   * Helper to share via Web Share API
   */
  async function sharePosterFile(canvas, ref, customerName) {
    const blob = await canvasToBlob(canvas);
    if (!blob) return false;

    const filename = `Bhuvana-Booking-${ref || 'Details'}.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Bhuvana's Bridal & Tailoring Studio Booking",
          text: `Booking Enquiry for ${customerName || 'Client'} (Ref: ${ref || 'BBS'}) - Bhuvana's Bridal & Tailoring Studio, Salem`
        });
        return true;
      } catch (err) {
        if (err.name === 'AbortError') return false; // user cancelled
        throw err;
      }
    }
    return false;
  }

  // Export to global scope
  root.BBS_POSTER = {
    generateHTML: generatePosterHTML,
    renderToCanvas: renderPosterToCanvas,
    downloadPNG: downloadCanvasAsPNG,
    toBlob: canvasToBlob,
    shareFile: sharePosterFile
  };

})(typeof window !== 'undefined' ? window : this);
