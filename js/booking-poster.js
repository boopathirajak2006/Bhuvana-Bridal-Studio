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

  /**
   * Escape HTML special characters to prevent HTML & script injection
   * while completely preserving Tamil, English, and Unicode text.
   */
  function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * Escape HTML while converting newlines into <br> tags
   * to preserve line breaks and multi-line formatting.
   */
  function escapeHtmlWithBreaks(str) {
    if (str === null || str === undefined) return '';
    return escapeHtml(str).replace(/\r?\n/g, '<br>');
  }

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

    const rawCustomerName = contact.name || contact.fullName || 'Valued Client';
    const rawCustomerMobile = contact.mobile || contact.phone || 'Not provided';
    const rawEventDate = formatDate(contact.eventDate || contact.preferredDate);
    const rawLocation = contact.location || 'Salem / Nearby Venue';
    const rawRef = data.ref || 'BBS-2026-ENQ';

    const customerName = escapeHtml(rawCustomerName);
    const customerMobile = escapeHtml(rawCustomerMobile);
    const eventDate = escapeHtml(rawEventDate);
    const location = escapeHtmlWithBreaks(rawLocation);
    const ref = escapeHtml(rawRef);

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
            <span class="service-title">${escapeHtml(s.title)}</span>
            <span class="service-price-tag ${s.pricingType === 'quote' ? 'quote' : ''}">${escapeHtml(getPriceDisplay(s))}</span>
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
            <span class="service-title">${escapeHtml(s.title)}</span>
            <span class="service-price-tag ${s.pricingType === 'quote' ? 'quote' : ''}">${escapeHtml(getPriceDisplay(s))}</span>
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
        reqEntries.push({
          label: escapeHtml(REQ_LABELS[key]),
          value: escapeHtmlWithBreaks(String(val).trim())
        });
      }
    });

    // Also include client message if present and not already shown
    if (contact.message && String(contact.message).trim().length > 0 && !requirements.specificNotes) {
      reqEntries.push({
        label: 'Client Special Note',
        value: escapeHtmlWithBreaks(String(contact.message).trim())
      });
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
   * Pre-checks and waits for all images inside target element to finish loading.
   * Logs the exact image path if any image fails to load.
   */
  async function waitForImages(element) {
    const images = Array.from(element.querySelectorAll('img'));
    const results = await Promise.all(images.map(img => {
      return new Promise(resolve => {
        const srcPath = img.getAttribute('src') || img.src || '(no src)';
        if (img.complete) {
          if (img.naturalHeight === 0 || img.naturalWidth === 0) {
            console.error(`[BBS Poster] Image failed to load or has 0 dimensions: ${srcPath}`);
            resolve({ img, src: srcPath, ok: false });
          } else {
            resolve({ img, src: srcPath, ok: true });
          }
          return;
        }
        img.addEventListener('load', () => {
          if (img.naturalHeight === 0 || img.naturalWidth === 0) {
            console.error(`[BBS Poster] Image loaded but has 0 dimensions: ${srcPath}`);
            resolve({ img, src: srcPath, ok: false });
          } else {
            resolve({ img, src: srcPath, ok: true });
          }
        }, { once: true });
        img.addEventListener('error', () => {
          console.error(`[BBS Poster] Failed to load poster image: ${srcPath}`);
          resolve({ img, src: srcPath, ok: false });
        }, { once: true });
      });
    }));

    const failed = results.filter(r => !r.ok);
    if (failed.length > 0) {
      console.warn(`[BBS Poster] Warning: ${failed.length} image(s) failed to load properly:`, failed.map(f => f.src));
    }
    return results;
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

    // Pre-check and wait for images, logging any failed paths
    await waitForImages(targetElement);

    // Give DOM a micro-tick to compute layout
    await new Promise(r => setTimeout(r, 60));

    const canvas = await html2canvas(targetElement, {
      scale: 2, // 2x retina sharpness (2160px rendered)
      useCORS: true,
      allowTaint: false,
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
   * Checks whether the current browser supports sharing files via Web Share API
   */
  function canShareFiles() {
    if (typeof navigator === 'undefined' || !navigator.canShare) return false;
    try {
      const testFile = new File([''], 'test.png', { type: 'image/png' });
      return navigator.canShare({ files: [testFile] });
    } catch (e) {
      return false;
    }
  }

  /**
   * Helper to share generated booking poster PNG directly via Web Share API.
   * Accepts an optional custom captionText for rich WhatsApp messaging.
   * Returns:
   *  { supported: true, shared: true } if user completed the share sheet
   *  { supported: true, shared: false, cancelled: true } if user cancelled/dismissed share sheet
   *  { supported: false, shared: false } if direct file sharing is unsupported on this browser
   */
  async function sharePosterFile(canvas, ref, customerName, captionText) {
    const blob = await canvasToBlob(canvas);
    if (!blob) {
      throw new Error('Unable to create image blob from poster canvas');
    }

    const filename = `Bhuvana-Booking-${ref || 'Details'}.png`;
    const file = new File([blob], filename, { type: 'image/png' });

    const shareText = captionText || `Booking Enquiry for ${customerName || 'Client'} (Ref: ${ref || 'BBS'}) - Bhuvana's Bridal & Tailoring Studio, Salem`;

    if (typeof navigator !== 'undefined' && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: "Bhuvana's Bridal & Tailoring Studio Booking",
          text: shareText
        });
        return { supported: true, shared: true };
      } catch (err) {
        if (err.name === 'AbortError') {
          return { supported: true, shared: false, cancelled: true };
        }
        throw err;
      }
    }

    return { supported: false, shared: false };
  }

  // Export to global scope
  root.BBS_POSTER = {
    generateHTML: generatePosterHTML,
    renderToCanvas: renderPosterToCanvas,
    downloadPNG: downloadCanvasAsPNG,
    toBlob: canvasToBlob,
    canShare: canShareFiles,
    shareFile: sharePosterFile
  };

})(typeof window !== 'undefined' ? window : this);
