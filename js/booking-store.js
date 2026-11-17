/**
 * Bhuvana's Bridal Studio — Booking State Manager & Multi-Service Store
 * Manages persistent multi-service selections, dynamic requirements, and WhatsApp handoff
 */

(function (root) {
  'use strict';

  const STORAGE_KEY_SERVICES = 'bbs_selected_services';
  const STORAGE_KEY_FIRST = 'bbs_first_service';
  const STORAGE_KEY_REQ = 'bbs_booking_requirements';
  const STORAGE_KEY_CONTACT = 'bbs_contact_details';
  const STORAGE_KEY_REF = 'bbs_booking_ref';
  const STORAGE_KEY_PACKAGE = 'bbs_package_type';
  const STORAGE_KEY_EVENT = 'bbs_event_details';
  const STORAGE_KEY_CUSTOMIZATION = 'bbs_customization_details';
  const ARTIST_WHATSAPP_NUMBER = '916374036629';

  // Safe Storage access with in-memory fallback
  const memStore = {};
  const storage = {
    get: function (k) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          return sessionStorage.getItem(k);
        }
      } catch (e) {}
      return memStore[k] || null;
    },
    set: function (k, v) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem(k, v);
          return;
        }
      } catch (e) {}
      memStore[k] = v;
    },
    remove: function (k) {
      try {
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(k);
          return;
        }
      } catch (e) {}
      delete memStore[k];
    }
  };

  // --- Services Management ---
  function getSelectedServiceIds() {
    const raw = storage.get(STORAGE_KEY_SERVICES);
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function setSelectedServiceIds(ids) {
    const unique = [...new Set(ids)];
    storage.set(STORAGE_KEY_SERVICES, JSON.stringify(unique));
    updateGlobalBadges();
  }

  function getFirstServiceId() {
    return storage.get(STORAGE_KEY_FIRST) || '';
  }

  function setFirstServiceId(id) {
    storage.set(STORAGE_KEY_FIRST, id);
    addServiceId(id);
  }

  function addServiceId(id) {
    if (!id) return;
    const current = getSelectedServiceIds();
    if (!current.includes(id)) {
      current.push(id);
      setSelectedServiceIds(current);
    }
  }

  function removeServiceId(id) {
    let current = getSelectedServiceIds();
    current = current.filter(item => item !== id);
    setSelectedServiceIds(current);
    if (getFirstServiceId() === id) {
      storage.set(STORAGE_KEY_FIRST, current[0] || '');
    }
  }

  function hasServiceId(id) {
    return getSelectedServiceIds().includes(id);
  }

  function clearAll() {
    storage.remove(STORAGE_KEY_SERVICES);
    storage.remove(STORAGE_KEY_FIRST);
    storage.remove(STORAGE_KEY_REQ);
    storage.remove(STORAGE_KEY_CONTACT);
    storage.remove(STORAGE_KEY_REF);
    storage.remove(STORAGE_KEY_PACKAGE);
    storage.remove(STORAGE_KEY_EVENT);
    storage.remove(STORAGE_KEY_CUSTOMIZATION);
    updateGlobalBadges();
  }

  function getBookingRef() {
    let ref = storage.get(STORAGE_KEY_REF);
    if (!ref) {
      const year = new Date().getFullYear();
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 4; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      ref = 'BBS-' + year + '-' + code;
      storage.set(STORAGE_KEY_REF, ref);
    }
    return ref;
  }

  function setBookingRef(ref) {
    if (ref) storage.set(STORAGE_KEY_REF, ref);
  }

  function clearBookingRef() {
    storage.remove(STORAGE_KEY_REF);
  }

  function getPopulatedServices() {
    const catalog = root.BBS_CATALOG ? root.BBS_CATALOG.services : {};
    const ids = getSelectedServiceIds();
    return ids.map(id => catalog[id]).filter(Boolean);
  }

  // --- Package Type Management ---
  function getPackageType() {
    return storage.get(STORAGE_KEY_PACKAGE) || 'bridal-beauty';
  }

  function setPackageType(pkg) {
    storage.set(STORAGE_KEY_PACKAGE, pkg);
  }

  // --- Event Details Management ---
  function getEventDetails() {
    const raw = storage.get(STORAGE_KEY_EVENT);
    if (!raw) return {};
    try {
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  function setEventDetails(data) {
    storage.set(STORAGE_KEY_EVENT, JSON.stringify(data || {}));
  }

  // --- Customization Management ---
  function getCustomization() {
    const raw = storage.get(STORAGE_KEY_CUSTOMIZATION);
    if (!raw) return {};
    try {
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  function setCustomization(data) {
    storage.set(STORAGE_KEY_CUSTOMIZATION, JSON.stringify(data || {}));
  }

  // --- Requirements Management ---
  function getRequirements() {
    const raw = storage.get(STORAGE_KEY_REQ);
    if (!raw) return {};
    try {
      return JSON.parse(raw) || {};
    } catch (e) {
      return {};
    }
  }

  function setRequirements(data) {
    storage.set(STORAGE_KEY_REQ, JSON.stringify(data || {}));
  }

  // --- Contact Details Management ---
  function getContactDetails() {
    const raw = storage.get(STORAGE_KEY_CONTACT);
    let contact = {};
    if (raw) {
      try {
        contact = JSON.parse(raw) || {};
      } catch (e) {
        contact = {};
      }
    }
    const event = getEventDetails();
    return Object.assign({}, event, contact);
  }

  function setContactDetails(data) {
    storage.set(STORAGE_KEY_CONTACT, JSON.stringify(data || {}));
  }

  // --- Badge updates across header ---
  function updateGlobalBadges() {
    if (typeof document === 'undefined') return;
    const count = getSelectedServiceIds().length;
    document.querySelectorAll('.selection-count-badge').forEach(el => {
      el.textContent = count;
      el.style.display = count > 0 ? 'inline-flex' : 'none';
    });
  }

  // --- Progress Bar Component ---
  function renderProgressBar(containerId, currentStep) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const steps = [
      { step: 1, label: 'Personal Details' },
      { step: 2, label: 'Event Details' },
      { step: 3, label: 'Service Details' },
      { step: 4, label: 'Customization' },
      { step: 5, label: 'Review & Confirm' }
    ];

    let html = '<div class="booking-progress"><div class="booking-steps">';
    steps.forEach(s => {
      const isCompleted = s.step < currentStep;
      const isActive = s.step === currentStep;
      const stateClass = isCompleted ? 'completed' : isActive ? 'active' : '';
      html += `
        <div class="step-item ${stateClass}">
          <div class="step-bubble">${isCompleted ? '✓' : s.step}</div>
          <span class="step-text">${s.label}</span>
        </div>
      `;
    });
    html += '</div></div>';
    container.innerHTML = html;
  }

  // --- WhatsApp Message Generator ---
  function formatDate(isoStr) {
    if (!isoStr) return 'Not specified';
    const parts = isoStr.split('-').map(Number);
    if (parts.length !== 3) return isoStr;
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function buildWhatsAppMessage() {
    const contact = getContactDetails();
    const services = getPopulatedServices();
    const req = getRequirements();

    const divisions = [...new Set(services.map(s => s.division))];
    const divisionStr = divisions.length > 0 ? divisions.join(' & ') : 'Bridal Studio';

    let servicesBlock = '';
    if (services.length === 0) {
      servicesBlock = '• General Studio Consultation';
    } else {
      servicesBlock = services.map(s => {
        let priceStr = s.pricingDisplay || 'Request a Quote';
        return `• ${s.title} (${s.category})\n  [Pricing: ${priceStr}]`;
      }).join('\n');
    }

    let reqBlock = [];
    if (req.makeupStyle) reqBlock.push(`• Makeup Style: ${req.makeupStyle}`);
    if (req.eventType) reqBlock.push(`• Event Type: ${req.eventType}`);
    if (req.makeupPeople) reqBlock.push(`• Persons for Makeup: ${req.makeupPeople}`);
    if (req.hairStyle) reqBlock.push(`• Hairstyle Preference: ${req.hairStyle}`);
    if (req.drapingType) reqBlock.push(`• Saree Draping Style: ${req.drapingType}`);
    if (req.mehndiStyle) reqBlock.push(`• Mehndi Style: ${req.mehndiStyle}`);
    if (req.blouseDesignType) reqBlock.push(`• Blouse Cut: ${req.blouseDesignType}`);
    if (req.blouseStitchType) reqBlock.push(`• Stitching Preference: ${req.blouseStitchType}`);
    if (req.aariWorkType) reqBlock.push(`• Aari Embroidery Preference: ${req.aariWorkType}`);
    if (req.specificNotes) reqBlock.push(`• Specific Instructions: ${req.specificNotes}`);

    const reqDisplay = reqBlock.length > 0 ? reqBlock.join('\n') : '• To be finalized during personal consultation';

    return [
      '✦ ───── 𓆩♡𓆪 ───── ✦',
      "୨୧BHUVANA'S BRIDAL STUDIO୨୧",
      '✦ ───── 𓆩♡𓆪 ───── ✦',
      `❀ DIVISION : ${divisionStr.toUpperCase()} ❀`,
      '❀ Multi-Service Customer Enquiry ❀',
      '',
      '══════❀══════',
      '  CLIENT DETAILS ',
      '══════❀══════',
      `• Booking Ref: ${getBookingRef()}`,
      `• Name: ${contact.name || contact.fullName || 'Not provided'}`,
      `• Mobile: ${contact.mobile || contact.phone || 'Not provided'}`,
      `• Email: ${contact.email || 'Not provided'}`,
      `• Event / Delivery Date: ${formatDate(contact.eventDate || contact.preferredDate)}`,
      `• Venue / City: ${contact.location || 'Salem / Nearby'}`,
      '',
      '══════❀══════',
      `  SELECTED SERVICES (${services.length}) `,
      '══════❀══════',
      servicesBlock,
      '',
      '══════❀══════',
      '  SERVICE REQUIREMENTS ',
      '══════❀══════',
      reqDisplay,
      '',
      '══════❀══════',
      "  CLIENT'S SPECIAL NOTE ",
      '══════❀══════',
      `“${contact.message ? contact.message.trim() : 'None'}”`,
      '',
      '━━━━━━━━━━━━━━',
      ' 𓆩♡𓆪 STATUS: AWAITING STUDIO CONFIRMATION',
      '━━━━━━━━━━━━━━',
      '_Thank you for contacting Bhuvana’s Bridal Studio, Salem._'
    ].join('\n');
  }

  function getWhatsAppUrl() {
    const text = buildWhatsAppMessage();
    return 'https://wa.me/' + ARTIST_WHATSAPP_NUMBER + '?text=' + encodeURIComponent(text);
  }

  // Update badges on script load
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', updateGlobalBadges);
  }

  // Export Store
  root.BBS_STORE = {
    getSelectedIds: getSelectedServiceIds,
    setSelectedIds: setSelectedServiceIds,
    setSelectedServiceIds: setSelectedServiceIds,
    getFirstId: getFirstServiceId,
    setFirstId: setFirstServiceId,
    addService: addServiceId,
    removeService: removeServiceId,
    hasService: hasServiceId,
    getPopulated: getPopulatedServices,
    clear: clearAll,
    getPackageType: getPackageType,
    setPackageType: setPackageType,
    getEventDetails: getEventDetails,
    setEventDetails: setEventDetails,
    getCustomization: getCustomization,
    setCustomization: setCustomization,
    getRequirements: getRequirements,
    setRequirements: setRequirements,
    getContact: getContactDetails,
    setContact: setContactDetails,
    updateBadges: updateGlobalBadges,
    renderProgressBar: renderProgressBar,
    buildMessage: buildWhatsAppMessage,
    getWhatsAppUrl: getWhatsAppUrl,
    getRef: getBookingRef,
    setRef: setBookingRef,
    clearRef: clearBookingRef,
    whatsappNumber: ARTIST_WHATSAPP_NUMBER
  };

})(typeof window !== 'undefined' ? window : this);
