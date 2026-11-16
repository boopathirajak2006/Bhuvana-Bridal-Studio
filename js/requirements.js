/**
 * Bhuvana's Bridal Studio — Requirements Controller
 * Dynamically displays requirement input sections matching selected services.
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.BBS_STORE || !window.BBS_CATALOG) return;

    const store = window.BBS_STORE;
    const services = store.getPopulated();

    // Render Progress Bar (Step 3 of 5)
    store.renderProgressBar('progress-bar-container', 3);

    // If no services selected, redirect to select-service.html
    if (services.length === 0) {
      window.location.href = 'select-service.html';
      return;
    }

    // Determine which requirement blocks are needed
    const hasMakeup = services.some(s => s.requirementsType === 'makeup');
    const hasHair = services.some(s => s.requirementsType === 'hair');
    const hasMehndi = services.some(s => s.requirementsType === 'mehndi');
    const hasBlouseDesign = services.some(s => s.requirementsType === 'blouse-design');
    const hasBlouseStitch = services.some(s => s.requirementsType === 'blouse-stitch');
    const hasAari = services.some(s => s.requirementsType === 'aari');

    const secMakeup = document.getElementById('sec-req-makeup');
    const secHair = document.getElementById('sec-req-hair');
    const secMehndi = document.getElementById('sec-req-mehndi');
    const secBlouseDesign = document.getElementById('sec-req-blouse-design');
    const secBlouseStitch = document.getElementById('sec-req-blouse-stitch');
    const secAari = document.getElementById('sec-req-aari');

    if (secMakeup) secMakeup.style.display = hasMakeup ? 'block' : 'none';
    if (secHair) secHair.style.display = hasHair ? 'block' : 'none';
    if (secMehndi) secMehndi.style.display = hasMehndi ? 'block' : 'none';
    if (secBlouseDesign) secBlouseDesign.style.display = hasBlouseDesign ? 'block' : 'none';
    if (secBlouseStitch) secBlouseStitch.style.display = hasBlouseStitch ? 'block' : 'none';
    if (secAari) secAari.style.display = hasAari ? 'block' : 'none';

    // Populate previously saved requirements if any
    const savedReq = store.getRequirements();
    const form = document.getElementById('requirements-form');
    if (form && savedReq) {
      Object.keys(savedReq).forEach(k => {
        if (form.elements[k]) {
          form.elements[k].value = savedReq[k];
        }
      });
    }

    // Submit handler
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        const data = {};
        const fd = new FormData(form);
        for (const [k, v] of fd.entries()) {
          data[k] = v;
        }
        store.setRequirements(data);
        window.location.href = 'enquiry.html';
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
