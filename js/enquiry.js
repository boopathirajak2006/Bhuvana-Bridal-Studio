/**
 * Bhuvana's Bridal Studio — WhatsApp Enquiry Handler
 * Supports:
 * 1. Bridal & Beauty Studio Enquiries
 * 2. Designer Blouse Studio Enquiries
 * Target Artist WhatsApp: +91 63740 36629 (916374036629)
 */

(function () {
  'use strict';

  const ARTIST_WHATSAPP_NUMBER = "916374036629";

  function formatDate(isoStr) {
    if (!isoStr) return '';
    const parts = isoStr.split('-').map(Number);
    if (parts.length !== 3) return isoStr;
    const [y, m, d] = parts;
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  function validateMobile(val) {
    const digits = val.replace(/\D/g, '');
    return (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) ||
           (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) ||
           (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1)));
  }

  // Helper to safely persist booking state to BBS_STORE / sessionStorage
  function saveBookingState(serviceIds, requirements, contact) {
    if (window.BBS_STORE) {
      if (typeof window.BBS_STORE.setSelectedIds === 'function') {
        window.BBS_STORE.setSelectedIds(serviceIds);
      } else if (typeof window.BBS_STORE.setSelectedServiceIds === 'function') {
        window.BBS_STORE.setSelectedServiceIds(serviceIds);
      }
      if (typeof window.BBS_STORE.setRequirements === 'function') {
        window.BBS_STORE.setRequirements(requirements);
      }
      if (typeof window.BBS_STORE.setContact === 'function') {
        window.BBS_STORE.setContact(contact);
      }
      return typeof window.BBS_STORE.getRef === 'function' ? window.BBS_STORE.getRef() : 'BBS-2026-ENQ';
    }
    try {
      sessionStorage.setItem('bbs_selected_services', JSON.stringify(serviceIds));
      sessionStorage.setItem('bbs_booking_requirements', JSON.stringify(requirements));
      sessionStorage.setItem('bbs_contact_details', JSON.stringify(contact));
      let ref = sessionStorage.getItem('bbs_booking_ref');
      if (!ref) {
        const rand = Math.floor(1000 + Math.random() * 9000);
        ref = 'BBS-2026-ENQ-' + rand;
        sessionStorage.setItem('bbs_booking_ref', ref);
      }
      return ref;
    } catch (e) {
      console.warn('Storage unavailable:', e);
      return 'BBS-2026-ENQ';
    }
  }

  const BRIDAL_SERVICE_MAP = {
    'bridal makeup': 'bridal-makeup',
    'hd bridal makeup': 'hd-makeup',
    'traditional bridal makeup': 'traditional-bridal-makeup',
    'muhurtham makeup': 'traditional-bridal-makeup',
    'guest / family makeup': 'guest-family-makeup',
    'saree draping & ironing': 'saree-draping',
    'hair styling & flowers': 'hair-styling',
    'bridal mehndi': 'bridal-mehndi'
  };

  const BLOUSE_SERVICE_MAP = {
    'bridal blouse designing': 'custom-bridal-blouse-designs',
    'custom blouse stitching': 'blouse-stitching',
    'hand-embroidered aari work': 'bridal-heavy-aari-work',
    'simple / semi-bridal aari work': 'simple-aari-embroidery',
    'designer blouse pattern': 'custom-blouse-designs',
    'express blouse stitching': 'express-blouse-stitching'
  };

  // -------------------------------------------------------------
  // 1. BRIDAL & BEAUTY STUDIO ENQUIRY FORM
  // -------------------------------------------------------------
  const bridalForm = document.getElementById('bridal-enquiry-form') || document.getElementById('enq');
  if (bridalForm) {
    const statusEl = bridalForm.querySelector('.form-status') || document.getElementById('status');
    const el = bridalForm.elements;

    // Preference "Not Sure" mutual exclusion logic
    const prefBoxes = [...bridalForm.querySelectorAll('input[name="preference"]')];
    const notSure = prefBoxes.find(b => b.value.toLowerCase().includes('not sure'));
    if (notSure) {
      prefBoxes.forEach(b => b.addEventListener('change', () => {
        if (!b.checked) return;
        if (b === notSure) {
          prefBoxes.forEach(x => { if (x !== notSure) x.checked = false; });
        } else {
          notSure.checked = false;
        }
      }));
    }

    const getCheckedValues = (name) => [...bridalForm.querySelectorAll('input[name="' + name + '"]:checked')].map(i => i.value);

    function validateBridal() {
      let ok = true;
      let firstInvalid = null;

      const setErr = (field, msg) => {
        const parent = field.closest('.form-group') || field.closest('fieldset');
        const errSpan = parent ? parent.querySelector('.err-msg, .err') : null;
        if (errSpan) {
          errSpan.textContent = msg;
        }
        if (msg) {
          ok = false;
          if (!firstInvalid) firstInvalid = field;
        }
      };

      // Client name
      const nameVal = el.clientName ? el.clientName.value.trim() : '';
      setErr(el.clientName, nameVal ? '' : 'Please enter your name.');

      // Mobile
      const mobileVal = el.mobile ? el.mobile.value.trim() : '';
      if (!mobileVal) {
        setErr(el.mobile, 'Please enter your mobile number.');
      } else if (!validateMobile(mobileVal)) {
        setErr(el.mobile, 'Please enter a valid 10-digit mobile number.');
      } else {
        setErr(el.mobile, '');
      }

      // Email (optional)
      if (el.email && el.email.value.trim()) {
        const validEmail = el.email.validity ? el.email.validity.valid : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.email.value.trim());
        setErr(el.email, validEmail ? '' : 'Please enter a valid email address.');
      } else if (el.email) {
        setErr(el.email, '');
      }

      // Event Date
      if (el.eventDate) {
        setErr(el.eventDate, el.eventDate.value ? '' : 'Please select the event date.');
      }

      // Makeup Date
      if (el.makeupDate) {
        setErr(el.makeupDate, el.makeupDate.value ? '' : 'Please select the makeup date.');
      }

      // Location / Venue
      if (el.location) {
        setErr(el.location, el.location.value.trim() ? '' : 'Please specify the event location or getting-ready venue.');
      }

      // Number of people
      if (el.people) {
        const p = parseInt(el.people.value, 10);
        if (isNaN(p) || p < 1) {
          setErr(el.people, 'Please enter at least 1 person.');
        } else if (p > 50) {
          setErr(el.people, 'For parties larger than 50, please message us directly.');
        } else {
          setErr(el.people, '');
        }
      }

      // Services Checkbox Group
      const pickedServices = getCheckedValues('services');
      const srvGrp = bridalForm.querySelector('#grp-services') || bridalForm.querySelector('.checkbox-group');
      if (srvGrp) {
        const srvErr = srvGrp.querySelector('.err-msg, .err');
        if (srvErr) srvErr.textContent = pickedServices.length ? '' : 'Please select at least one service.';
        if (!pickedServices.length) {
          ok = false;
          if (!firstInvalid) firstInvalid = srvGrp.querySelector('input');
        }
      }

      return { ok, firstInvalid };
    }

    bridalForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const { ok, firstInvalid } = validateBridal();

      if (!ok) {
        if (statusEl) {
          statusEl.className = 'form-status is-error full';
          statusEl.textContent = 'Please complete the highlighted required fields.';
        }
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const rawServices = getCheckedValues('services');
      const preferences = getCheckedValues('preference');
      const clientName = el.clientName.value.trim();
      const mobile = el.mobile.value.trim();
      const email = el.email && el.email.value.trim() ? el.email.value.trim() : '';
      const rawEventDate = el.eventDate ? el.eventDate.value : '';
      const makeupDate = el.makeupDate ? (formatDate(el.makeupDate.value) || el.makeupDate.value) : '';
      const location = el.location ? el.location.value.trim() : 'Salem / Nearby Venue';
      const people = el.people ? el.people.value : '1';
      const notes = el.message && el.message.value.trim() ? el.message.value.trim() : '';

      // Map service names to catalog IDs
      let mappedIds = rawServices.map(name => {
        const key = name.toLowerCase().trim();
        return BRIDAL_SERVICE_MAP[key] || null;
      }).filter(Boolean);

      if (mappedIds.length === 0) {
        mappedIds = ['bridal-makeup'];
      }

      // Build requirements object
      const requirements = {
        makeupStyle: preferences.length ? preferences.join(', ') : 'Traditional Bridal Makeup',
        eventType: makeupDate ? `Event Date: ${rawEventDate} (Makeup Date: ${makeupDate})` : 'Bridal Celebration',
        makeupPeople: people,
        specificNotes: notes
      };

      // Build contact details object
      const contact = {
        name: clientName,
        mobile: mobile,
        email: email,
        eventDate: rawEventDate,
        location: location,
        message: notes
      };

      // Persist to unified booking state
      saveBookingState(mappedIds, requirements, contact);

      if (statusEl) {
        statusEl.className = 'form-status is-ready full';
        statusEl.innerHTML = '<strong>Booking details saved!</strong> Taking you to review your details and generate your official booking poster...';
      }

      // Every booking route must lead to the review and poster generation flow
      setTimeout(function () {
        window.location.href = 'review.html';
      }, 350);
    });
  }

  // -------------------------------------------------------------
  // 2. DESIGNER BLOUSE STUDIO ENQUIRY FORM
  // -------------------------------------------------------------
  const blouseForm = document.getElementById('blouse-enquiry-form');
  if (blouseForm) {
    const statusEl = blouseForm.querySelector('.form-status');
    const el = blouseForm.elements;

    const getCheckedValues = (name) => [...blouseForm.querySelectorAll('input[name="' + name + '"]:checked')].map(i => i.value);

    function validateBlouse() {
      let ok = true;
      let firstInvalid = null;

      const setErr = (field, msg) => {
        const parent = field.closest('.form-group') || field.closest('fieldset');
        const errSpan = parent ? parent.querySelector('.err-msg, .err') : null;
        if (errSpan) {
          errSpan.textContent = msg;
        }
        if (msg) {
          ok = false;
          if (!firstInvalid) firstInvalid = field;
        }
      };

      // Client name
      const nameVal = el.clientName ? el.clientName.value.trim() : '';
      setErr(el.clientName, nameVal ? '' : 'Please enter your name.');

      // Mobile
      const mobileVal = el.mobile ? el.mobile.value.trim() : '';
      if (!mobileVal) {
        setErr(el.mobile, 'Please enter your mobile number.');
      } else if (!validateMobile(mobileVal)) {
        setErr(el.mobile, 'Please enter a valid 10-digit mobile number.');
      } else {
        setErr(el.mobile, '');
      }

      // Email (optional)
      if (el.email && el.email.value.trim()) {
        const validEmail = el.email.validity ? el.email.validity.valid : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(el.email.value.trim());
        setErr(el.email, validEmail ? '' : 'Please enter a valid email address.');
      } else if (el.email) {
        setErr(el.email, '');
      }

      // Required By / Delivery Date
      if (el.deliveryDate) {
        setErr(el.deliveryDate, el.deliveryDate.value ? '' : 'Please specify when you need the blouse delivered.');
      }

      // Blouse Services Checkbox Group
      const pickedServices = getCheckedValues('blouseServices');
      const srvGrp = blouseForm.querySelector('#grp-blouse-services') || blouseForm.querySelector('.checkbox-group');
      if (srvGrp) {
        const srvErr = srvGrp.querySelector('.err-msg, .err');
        if (srvErr) srvErr.textContent = pickedServices.length ? '' : 'Please select at least one blouse service.';
        if (!pickedServices.length) {
          ok = false;
          if (!firstInvalid) firstInvalid = srvGrp.querySelector('input');
        }
      }

      return { ok, firstInvalid };
    }

    blouseForm.addEventListener('submit', function (e) {
      e.preventDefault();
      const { ok, firstInvalid } = validateBlouse();

      if (!ok) {
        if (statusEl) {
          statusEl.className = 'form-status is-error full';
          statusEl.textContent = 'Please complete the highlighted required fields.';
        }
        if (firstInvalid) firstInvalid.focus();
        return;
      }

      const rawServices = getCheckedValues('blouseServices');
      const workPreferences = getCheckedValues('workType');
      const clientName = el.clientName.value.trim();
      const mobile = el.mobile.value.trim();
      const email = el.email && el.email.value.trim() ? el.email.value.trim() : '';
      const rawDeliveryDate = el.deliveryDate ? el.deliveryDate.value : '';
      const fabricDetails = el.fabricDetails && el.fabricDetails.value.trim() ? el.fabricDetails.value.trim() : '';
      const notes = el.message && el.message.value.trim() ? el.message.value.trim() : '';

      // Map service names to catalog IDs
      let mappedIds = rawServices.map(name => {
        const key = name.toLowerCase().trim();
        return BLOUSE_SERVICE_MAP[key] || null;
      }).filter(Boolean);

      if (mappedIds.length === 0) {
        mappedIds = ['custom-blouse-designs'];
      }

      // Build requirements object
      const requirements = {
        blouseDesignType: fabricDetails ? `Fabric: ${fabricDetails}` : 'Custom Designer Pattern',
        blouseStitchType: 'Custom Stitching & Fit',
        aariWorkType: workPreferences.length ? workPreferences.join(', ') : 'Custom Hand Embroidery',
        specificNotes: notes
      };

      // Build contact details object
      const contact = {
        name: clientName,
        mobile: mobile,
        email: email,
        eventDate: rawDeliveryDate,
        location: 'Salem Studio / Local Delivery',
        message: notes
      };

      // Persist to unified booking state
      saveBookingState(mappedIds, requirements, contact);

      if (statusEl) {
        statusEl.className = 'form-status is-ready full';
        statusEl.innerHTML = '<strong>Order details saved!</strong> Taking you to review your order and generate your official booking poster...';
      }

      // Every booking route must lead to the review and poster generation flow
      setTimeout(function () {
        window.location.href = 'review.html';
      }, 350);
    });
  }

})();
