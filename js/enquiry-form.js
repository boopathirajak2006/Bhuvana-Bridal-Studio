/**
 * Bhuvana's Bridal Studio — Contact Enquiry Form Controller
 * Validates customer details and carries data forward to the Review step
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.BBS_STORE || !window.BBS_CATALOG) return;

    const store = window.BBS_STORE;
    const services = store.getPopulated();

    // Render Progress Bar (Step 4 of 5)
    store.renderProgressBar('progress-bar-container', 4);

    if (services.length === 0) {
      window.location.href = 'select-service.html';
      return;
    }

    // Render selected services badges
    const summaryListEl = document.getElementById('enquiry-services-summary');
    if (summaryListEl) {
      summaryListEl.innerHTML = services.map(s => `
        <span class="badge" style="margin:0.2rem; font-size:0.85rem; padding:0.4rem 0.85rem;">
          ${s.title} &middot; <strong style="color:var(--ink);">${s.pricingDisplay}</strong>
        </span>
      `).join(' ');
    }

    // Set today as min date
    const today = new Date();
    const todayISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const eventDateInput = document.getElementById('c-eventDate');
    if (eventDateInput) {
      eventDateInput.min = todayISO;
    }

    // Pre-populate saved contact details
    const savedContact = store.getContact();
    const form = document.getElementById('contact-enquiry-form');
    if (form && savedContact) {
      if (savedContact.name) form.elements.name.value = savedContact.name;
      if (savedContact.mobile) form.elements.mobile.value = savedContact.mobile;
      if (savedContact.email) form.elements.email.value = savedContact.email;
      if (savedContact.eventDate) form.elements.eventDate.value = savedContact.eventDate;
      if (savedContact.location) form.elements.location.value = savedContact.location;
      if (savedContact.message) form.elements.message.value = savedContact.message;
    }

    function validateMobile(val) {
      const digits = val.replace(/\D/g, '');
      return (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) ||
             (digits.length === 12 && digits.startsWith('91') && /^[6-9]\d{9}$/.test(digits.slice(2))) ||
             (digits.length === 11 && digits.startsWith('0') && /^[6-9]\d{9}$/.test(digits.slice(1)));
    }

    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();

        let ok = true;
        let firstInvalid = null;

        const setErr = (field, msg) => {
          const parent = field.closest('.form-group');
          const errSpan = parent ? parent.querySelector('.err-msg') : null;
          if (errSpan) errSpan.textContent = msg;
          if (msg) {
            ok = false;
            if (!firstInvalid) firstInvalid = field;
          }
        };

        const nameVal = form.elements.name.value.trim();
        setErr(form.elements.name, nameVal ? '' : 'Please enter your full name.');

        const mobileVal = form.elements.mobile.value.trim();
        if (!mobileVal) {
          setErr(form.elements.mobile, 'Please enter your mobile number.');
        } else if (!validateMobile(mobileVal)) {
          setErr(form.elements.mobile, 'Please enter a valid 10-digit mobile number.');
        } else {
          setErr(form.elements.mobile, '');
        }

        const dateVal = form.elements.eventDate.value;
        setErr(form.elements.eventDate, dateVal ? '' : 'Please select your event or delivery date.');

        const locVal = form.elements.location.value.trim();
        setErr(form.elements.location, locVal ? '' : 'Please enter your location or event venue in Salem.');

        if (!ok) {
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        store.setContact({
          name: nameVal,
          mobile: mobileVal,
          email: form.elements.email.value.trim(),
          eventDate: dateVal,
          location: locVal,
          message: form.elements.message.value.trim()
        });

        window.location.href = 'review.html';
      });
    }

    const btnBack = document.getElementById('btn-back-prev');
    if (btnBack) {
      btnBack.addEventListener('click', function () {
        window.history.back();
      });
    }
  });

})();
