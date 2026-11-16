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

  // Setup min date as today for all date inputs
  const today = new Date();
  const todayISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  document.querySelectorAll('input[type="date"]').forEach(function (inp) {
    inp.min = todayISO;
  });

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

      const services = getCheckedValues('services');
      const preferences = getCheckedValues('preference');
      const clientName = el.clientName.value.trim();
      const mobile = el.mobile.value.trim();
      const email = el.email && el.email.value.trim() ? el.email.value.trim() : 'Not provided';
      const eventDate = el.eventDate ? (formatDate(el.eventDate.value) || el.eventDate.value) : 'Not specified';
      const makeupDate = el.makeupDate ? (formatDate(el.makeupDate.value) || el.makeupDate.value) : 'Same as event date';
      const location = el.location ? el.location.value.trim() : 'Salem / Nearby';
      const people = el.people ? el.people.value : '1';
      const notes = el.message && el.message.value.trim() ? el.message.value.trim() : 'None';

      const message = [
        '✦ ───── 𓆩♡𓆪 ───── ✦',
        "୨୧ BHUVANA'S BRIDAL STUDIO ୨୧",
        '✦ ───── 𓆩♡𓆪 ───── ✦',
        '❀ DIVISION: BRIDAL & BEAUTY STUDIO ❀',
        '❀ New Service Enquiry ❀',
        '',
        '══════❀══════',
        '  CLIENT DETAILS ',
        '══════❀══════',
        '𐀔 Name: ' + clientName,
        '𐀔 Mobile: ' + mobile,
        '𐀔 Email: ' + email,
        '',
        '══════❀══════',
        '  EVENT & VENUE DETAILS ',
        '══════❀══════',
        '𐀔 Event Date: ' + eventDate,
        '𐀔 Makeup Date: ' + makeupDate,
        '𐀔 Venue / Location: ' + location,
        '𐀔 Total Persons: ' + people,
        '',
        '══════❀══════',
        '  SELECTED SERVICES ',
        '══════❀══════',
        services.map(s => '𐀔 ' + s).join('\n') || '𐀔 None selected',
        '',
        '══════❀══════',
        '  STYLING PREFERENCES ',
        '══════❀══════',
        preferences.length ? preferences.map(p => '𐀔 ' + p).join('\n') : '𐀔 Standard bridal consultation',
        '',
        '══════❀══════',
        "  CLIENT'S SPECIAL NOTE ",
        '══════❀══════',
        '“' + notes + '”',
        '',
        '━━━━━━━━━━━━━━',
        ' 𓆩♡𓆪 STATUS: AWAITING STUDIO CONFIRMATION',
        '━━━━━━━━━━━━━━',
        '_Thank you for contacting Bhuvana’s Bridal Studio, Salem._'
      ].join('\n');

      const waUrl = 'https://wa.me/' + ARTIST_WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
      window.open(waUrl, '_blank', 'noopener');

      if (statusEl) {
        statusEl.className = 'form-status is-ready full';
        statusEl.innerHTML = '<strong>Your bridal enquiry is prepared!</strong> WhatsApp has opened with your details. Please press <strong>Send</strong> in WhatsApp to complete your enquiry. <br><span style="display:block;margin-top:0.35rem">Did WhatsApp not open? <a href="' + waUrl + '" target="_blank" rel="noopener" style="text-decoration:underline;color:inherit;font-weight:600">Tap here to open WhatsApp directly</a>.</span>';
      }
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

      const services = getCheckedValues('blouseServices');
      const workPreferences = getCheckedValues('workType');
      const clientName = el.clientName.value.trim();
      const mobile = el.mobile.value.trim();
      const email = el.email && el.email.value.trim() ? el.email.value.trim() : 'Not provided';
      const deliveryDate = el.deliveryDate ? (formatDate(el.deliveryDate.value) || el.deliveryDate.value) : 'Flexible';
      const fabricDetails = el.fabricDetails && el.fabricDetails.value.trim() ? el.fabricDetails.value.trim() : 'To be discussed';
      const notes = el.message && el.message.value.trim() ? el.message.value.trim() : 'None';

      const message = [
        '✦ ───── 𓆩♡𓆪 ───── ✦',
        "୨୧ BHUVANA'S BRIDAL STUDIO ୨୧",
        '✦ ───── 𓆩♡𓆪 ───── ✦',
        '❀ DIVISION: DESIGNER BLOUSE STUDIO ❀',
        '❀ Custom Blouse & Aari Work Enquiry ❀',
        '',
        '══════❀══════',
        '  CLIENT DETAILS ',
        '══════❀══════',
        '𐀔 Name: ' + clientName,
        '𐀔 Mobile: ' + mobile,
        '𐀔 Email: ' + email,
        '',
        '══════❀══════',
        '  ORDER & TIMELINE ',
        '══════❀══════',
        '𐀔 Required By Date: ' + deliveryDate,
        '𐀔 Saree / Fabric Type: ' + fabricDetails,
        '',
        '══════❀══════',
        '  SELECTED BLOUSE SERVICES ',
        '══════❀══════',
        services.map(s => '𐀔 ' + s).join('\n') || '𐀔 None selected',
        '',
        '══════❀══════',
        '  WORK & EMBROIDERY PREFERENCE ',
        '══════❀══════',
        workPreferences.length ? workPreferences.map(w => '𐀔 ' + w).join('\n') : '𐀔 Custom design consultation',
        '',
        '══════❀══════',
        "  DESIGN NOTES / MEASUREMENTS ",
        '══════❀══════',
        '“' + notes + '”',
        '',
        '━━━━━━━━━━━━━━',
        ' 𓆩♡𓆪 STATUS: AWAITING STUDIO CONFIRMATION',
        '━━━━━━━━━━━━━━',
        '_Thank you for contacting Bhuvana’s Designer Blouse Studio, Salem._'
      ].join('\n');

      const waUrl = 'https://wa.me/' + ARTIST_WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
      window.open(waUrl, '_blank', 'noopener');

      if (statusEl) {
        statusEl.className = 'form-status is-ready full';
        statusEl.innerHTML = '<strong>Your blouse enquiry is prepared!</strong> WhatsApp has opened with your order details. Please press <strong>Send</strong> in WhatsApp to share your request with Bhuvaneshwari. <br><span style="display:block;margin-top:0.35rem">Did WhatsApp not open? <a href="' + waUrl + '" target="_blank" rel="noopener" style="text-decoration:underline;color:inherit;font-weight:600">Tap here to open WhatsApp directly</a>.</span>';
      }
    });
  }

})();
