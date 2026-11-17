/**
 * Bhuvana's Bridal & Tailoring Studio
 * Unified 5-Step Customer Booking & Consultation Controller
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.BBS_STORE || !window.BBS_CATALOG) return;

    const store = window.BBS_STORE;
    const posterModule = window.BBS_POSTER;
    const config = window.BBS_CONFIG;

    let currentStep = 1;
    let uploadedImages = []; // Array of { name, dataUrl, size }
    let generatedCanvas = null;
    let generatedBlob = null;

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    const paramPackage = urlParams.get('package');
    if (paramPackage && ['bridal-beauty', 'designer-blouse', 'complete-bridal'].includes(paramPackage)) {
      store.setPackageType(paramPackage);
    }

    const paramStep = parseInt(urlParams.get('step'), 10);
    if (paramStep >= 1 && paramStep <= 5) {
      currentStep = paramStep;
    }

    // Set today as minimum date
    const today = new Date();
    const todayISO = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split('T')[0];
    const eventDateInput = document.getElementById('e-date');
    if (eventDateInput) {
      eventDateInput.min = todayISO;
    }

    // Update package display badge
    updatePackageDisplay();

    // Load saved data into form inputs
    prefillAllSteps();

    // Render active step
    showStep(currentStep);

    // Setup event listeners
    setupStep1Listeners();
    setupStep2Listeners();
    setupStep3Listeners();
    setupStep4Listeners();
    setupStep5Listeners();
    setupGlobalNavigation();

    // =========================================================================
    // STEP DISPLAY & PROGRESS BAR
    // =========================================================================
    function showStep(stepNum) {
      currentStep = stepNum;
      store.renderProgressBar('progress-bar-container', currentStep);

      document.querySelectorAll('.booking-step').forEach(el => {
        el.classList.remove('active');
      });

      const activeEl = document.getElementById(`step-${stepNum}`);
      if (activeEl) {
        activeEl.classList.add('active');
        activeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      // If Step 3, adapt service blocks based on package
      if (stepNum === 3) {
        adaptServiceStep();
      }

      // If Step 5, populate review summaries and trigger poster rendering
      if (stepNum === 5) {
        populateReviewSummary();
        renderPosterPreview();
      }

      // Update URL without reload
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.set('step', stepNum);
      window.history.replaceState({}, '', newUrl.toString());
    }

    function updatePackageDisplay() {
      const pkg = store.getPackageType();
      const titleDisplay = document.getElementById('package-title-display');
      if (titleDisplay) {
        if (pkg === 'designer-blouse') {
          titleDisplay.textContent = 'Designer Blouse Atelier';
        } else if (pkg === 'complete-bridal') {
          titleDisplay.textContent = 'Complete Bridal Experience (Both Divisions)';
        } else {
          titleDisplay.textContent = 'Bridal Beauty Experience';
        }
      }
    }

    // =========================================================================
    // PREFILL SAVED DATA
    // =========================================================================
    function prefillAllSteps() {
      const contact = store.getContact();
      const eventDetails = store.getEventDetails();
      const req = store.getRequirements();
      const custom = store.getCustomization();

      // Step 1: Personal
      const f1 = document.getElementById('form-step-1');
      if (f1 && contact) {
        if (contact.name) f1.elements.name.value = contact.name;
        if (contact.mobile) f1.elements.mobile.value = contact.mobile;
        if (contact.whatsapp) f1.elements.whatsapp.value = contact.whatsapp;
        if (contact.email) f1.elements.email.value = contact.email;
        if (contact.address) f1.elements.address.value = contact.address;
        if (contact.city) f1.elements.city.value = contact.city;
        if (contact.preferredContact) f1.elements.preferredContact.value = contact.preferredContact;
        if (contact.whatsappConsent) f1.elements.whatsappConsent.checked = true;
      }

      // Step 2: Event
      const f2 = document.getElementById('form-step-2');
      if (f2 && eventDetails) {
        if (eventDetails.eventName) f2.elements.eventName.value = eventDetails.eventName;
        if (eventDetails.eventType) f2.elements.eventType.value = eventDetails.eventType;
        if (eventDetails.eventDate) f2.elements.eventDate.value = eventDetails.eventDate;
        if (eventDetails.eventTime) f2.elements.eventTime.value = eventDetails.eventTime;
        if (eventDetails.gettingReadyTime) f2.elements.gettingReadyTime.value = eventDetails.gettingReadyTime;
        if (eventDetails.functionLocation) f2.elements.functionLocation.value = eventDetails.functionLocation;
        if (eventDetails.venueName) f2.elements.venueName.value = eventDetails.venueName;
        if (eventDetails.venueAddress) f2.elements.venueAddress.value = eventDetails.venueAddress;
      }

      // Step 3: Requirements
      const f3 = document.getElementById('form-step-3');
      if (f3 && req) {
        if (req.makeupStyle && f3.elements.makeupStyle) f3.elements.makeupStyle.value = req.makeupStyle;
        if (req.hairStyle && f3.elements.hairStyle) f3.elements.hairStyle.value = req.hairStyle;
        if (req.drapingType && f3.elements.drapingType) f3.elements.drapingType.value = req.drapingType;
        if (req.mehndiStyle && f3.elements.mehndiStyle) f3.elements.mehndiStyle.value = req.mehndiStyle;
        if (req.jewelleryAssistance && f3.elements.jewelleryAssistance) f3.elements.jewelleryAssistance.value = req.jewelleryAssistance;
        if (req.makeupPeople && f3.elements.makeupPeople) f3.elements.makeupPeople.value = req.makeupPeople;

        if (req.blouseDesignType && f3.elements.blouseDesignType) f3.elements.blouseDesignType.value = req.blouseDesignType;
        if (req.blouseStitchType && f3.elements.blouseStitchType) f3.elements.blouseStitchType.value = req.blouseStitchType;
        if (req.aariWorkType && f3.elements.aariWorkType) f3.elements.aariWorkType.value = req.aariWorkType;
        if (req.blouseCount && f3.elements.blouseCount) f3.elements.blouseCount.value = req.blouseCount;
        if (req.fabricStatus && f3.elements.fabricStatus) f3.elements.fabricStatus.value = req.fabricStatus;
        if (req.measurementPreference && f3.elements.measurementPreference) f3.elements.measurementPreference.value = req.measurementPreference;
      }

      // Step 4: Customization
      const f4 = document.getElementById('form-step-4');
      if (f4 && custom) {
        if (custom.looksAndColours) f4.elements.looksAndColours.value = custom.looksAndColours;
        if (custom.consultationPref) f4.elements.consultationPref.value = custom.consultationPref;
        if (custom.specialNotes) f4.elements.specialNotes.value = custom.specialNotes;
        if (Array.isArray(custom.referenceImages)) {
          uploadedImages = custom.referenceImages;
          renderImagePreviews();
        }
      }
    }

    // =========================================================================
    // STEP 1 SETUP & VALIDATION
    // =========================================================================
    function setupStep1Listeners() {
      const f1 = document.getElementById('form-step-1');
      if (!f1) return;

      const mobileInput = f1.elements.mobile;
      const waInput = f1.elements.whatsapp;
      const syncCheckbox = document.getElementById('sync-whatsapp');

      if (syncCheckbox && mobileInput && waInput) {
        syncCheckbox.addEventListener('change', function () {
          if (this.checked) {
            waInput.value = mobileInput.value;
          }
        });
        mobileInput.addEventListener('input', function () {
          if (syncCheckbox.checked) {
            waInput.value = this.value;
          }
        });
      }

      f1.addEventListener('submit', function (e) {
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

        const nameVal = f1.elements.name.value.trim();
        setErr(f1.elements.name, nameVal ? '' : 'Please enter your full name.');

        const mobileVal = f1.elements.mobile.value.trim();
        const digits = mobileVal.replace(/\D/g, '');
        if (!mobileVal) {
          setErr(f1.elements.mobile, 'Please enter your mobile number.');
        } else if (digits.length < 10) {
          setErr(f1.elements.mobile, 'Please enter a valid 10-digit mobile number.');
        } else {
          setErr(f1.elements.mobile, '');
        }

        const waVal = f1.elements.whatsapp.value.trim();
        const waDigits = waVal.replace(/\D/g, '');
        if (!waVal) {
          setErr(f1.elements.whatsapp, 'Please enter your WhatsApp number.');
        } else if (waDigits.length < 10) {
          setErr(f1.elements.whatsapp, 'Please enter a valid WhatsApp number.');
        } else {
          setErr(f1.elements.whatsapp, '');
        }

        const addrVal = f1.elements.address.value.trim();
        setErr(f1.elements.address, addrVal ? '' : 'Please provide your address.');

        const cityVal = f1.elements.city.value.trim();
        setErr(f1.elements.city, cityVal ? '' : 'Please enter your city/location.');

        if (!ok) {
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        // Save into store
        const existing = store.getContact();
        store.setContact(Object.assign({}, existing, {
          name: nameVal,
          fullName: nameVal,
          mobile: mobileVal,
          phone: mobileVal,
          whatsapp: waVal,
          email: f1.elements.email.value.trim(),
          address: addrVal,
          location: cityVal,
          preferredContact: f1.elements.preferredContact.value,
          whatsappConsent: f1.elements.whatsappConsent.checked
        }));

        showStep(2);
      });
    }

    // =========================================================================
    // STEP 2 SETUP & VALIDATION
    // =========================================================================
    function setupStep2Listeners() {
      const f2 = document.getElementById('form-step-2');
      if (!f2) return;

      f2.addEventListener('submit', function (e) {
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

        const eNameVal = f2.elements.eventName.value.trim();
        setErr(f2.elements.eventName, eNameVal ? '' : 'Please enter the occasion or event name.');

        const eDateVal = f2.elements.eventDate.value;
        setErr(f2.elements.eventDate, eDateVal ? '' : 'Please select your celebration date.');

        const eReadyVal = f2.elements.gettingReadyTime.value;
        setErr(f2.elements.gettingReadyTime, eReadyVal ? '' : 'Please enter the time you must be ready by.');

        const vNameVal = f2.elements.venueName.value.trim();
        setErr(f2.elements.venueName, vNameVal ? '' : 'Please provide the venue or mandapam name.');

        const vAddrVal = f2.elements.venueAddress.value.trim();
        setErr(f2.elements.venueAddress, vAddrVal ? '' : 'Please provide the venue address.');

        if (!ok) {
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        // Save event details
        store.setEventDetails({
          eventName: eNameVal,
          eventType: f2.elements.eventType.value,
          eventDate: eDateVal,
          preferredDate: eDateVal,
          eventTime: f2.elements.eventTime.value,
          gettingReadyTime: eReadyVal,
          functionLocation: f2.elements.functionLocation.value,
          venueName: vNameVal,
          venueAddress: vAddrVal
        });

        // Also update contact with eventDate & location
        const contact = store.getContact();
        contact.eventDate = eDateVal;
        contact.preferredDate = eDateVal;
        contact.location = `${vNameVal}, ${contact.city || 'Salem'}`;
        store.setContact(contact);

        showStep(3);
      });
    }

    // =========================================================================
    // STEP 3 SETUP & DYNAMIC ADAPTATION
    // =========================================================================
    function adaptServiceStep() {
      const pkg = store.getPackageType();
      const bridalBlock = document.getElementById('service-block-bridal');
      const tailoringBlock = document.getElementById('service-block-tailoring');

      if (pkg === 'bridal-beauty') {
        if (bridalBlock) bridalBlock.style.display = 'block';
        if (tailoringBlock) tailoringBlock.style.display = 'none';
      } else if (pkg === 'designer-blouse') {
        if (bridalBlock) bridalBlock.style.display = 'none';
        if (tailoringBlock) tailoringBlock.style.display = 'block';
      } else {
        // Complete Bridal: show both!
        if (bridalBlock) bridalBlock.style.display = 'block';
        if (tailoringBlock) tailoringBlock.style.display = 'block';
      }
    }

    function setupStep3Listeners() {
      const f3 = document.getElementById('form-step-3');
      if (!f3) return;

      f3.addEventListener('submit', function (e) {
        e.preventDefault();

        const reqData = Object.assign({}, store.getRequirements());
        const pkg = store.getPackageType();

        if (pkg === 'bridal-beauty' || pkg === 'complete-bridal') {
          if (f3.elements.makeupStyle) reqData.makeupStyle = f3.elements.makeupStyle.value;
          if (f3.elements.hairStyle) reqData.hairStyle = f3.elements.hairStyle.value;
          if (f3.elements.drapingType) reqData.drapingType = f3.elements.drapingType.value;
          if (f3.elements.mehndiStyle) reqData.mehndiStyle = f3.elements.mehndiStyle.value;
          if (f3.elements.jewelleryAssistance) reqData.jewelleryAssistance = f3.elements.jewelleryAssistance.value;
          if (f3.elements.makeupPeople) reqData.makeupPeople = f3.elements.makeupPeople.value;
        }

        if (pkg === 'designer-blouse' || pkg === 'complete-bridal') {
          if (f3.elements.blouseDesignType) reqData.blouseDesignType = f3.elements.blouseDesignType.value;
          if (f3.elements.blouseStitchType) reqData.blouseStitchType = f3.elements.blouseStitchType.value;
          if (f3.elements.aariWorkType) reqData.aariWorkType = f3.elements.aariWorkType.value;
          if (f3.elements.blouseCount) reqData.blouseCount = f3.elements.blouseCount.value;
          if (f3.elements.fabricStatus) reqData.fabricStatus = f3.elements.fabricStatus.value;
          if (f3.elements.measurementPreference) reqData.measurementPreference = f3.elements.measurementPreference.value;
        }

        store.setRequirements(reqData);

        // Auto-assign catalog services matching the package if none selected
        ensureDefaultServicesForPackage();

        showStep(4);
      });
    }

    function ensureDefaultServicesForPackage() {
      const pkg = store.getPackageType();
      let ids = store.getSelectedIds();
      if (ids.length === 0) {
        if (pkg === 'bridal-beauty') {
          ids = ['srv-mu-01', 'srv-hr-01', 'srv-mh-01'];
        } else if (pkg === 'designer-blouse') {
          ids = ['srv-bd-01', 'srv-bs-01', 'srv-aw-01'];
        } else {
          ids = ['srv-mu-01', 'srv-hr-01', 'srv-mh-01', 'srv-bd-01', 'srv-bs-01', 'srv-aw-01'];
        }
        store.setSelectedIds(ids);
      }
    }

    // =========================================================================
    // STEP 4 SETUP & IMAGE UPLOADS
    // =========================================================================
    function setupStep4Listeners() {
      const f4 = document.getElementById('form-step-4');
      const uploadZone = document.getElementById('upload-zone');
      const fileInput = document.getElementById('ref-image-input');
      const uploadErr = document.getElementById('upload-err-msg');

      if (uploadZone && fileInput) {
        ['dragenter', 'dragover'].forEach(eventName => {
          uploadZone.addEventListener(eventName, e => {
            e.preventDefault();
            uploadZone.classList.add('dragover');
          });
        });

        ['dragleave', 'drop'].forEach(eventName => {
          uploadZone.addEventListener(eventName, e => {
            e.preventDefault();
            uploadZone.classList.remove('dragover');
          });
        });

        uploadZone.addEventListener('drop', e => {
          const files = e.dataTransfer.files;
          handleFiles(files);
        });

        fileInput.addEventListener('change', e => {
          const files = e.target.files;
          handleFiles(files);
        });
      }

      function handleFiles(files) {
        if (!files || files.length === 0) return;
        if (uploadErr) uploadErr.textContent = '';

        const maxFiles = 6;
        const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

        for (let i = 0; i < files.length; i++) {
          const file = files[i];

          if (uploadedImages.length >= maxFiles) {
            if (uploadErr) uploadErr.textContent = `Maximum ${maxFiles} reference images allowed.`;
            break;
          }

          if (!allowedTypes.includes(file.type)) {
            if (uploadErr) uploadErr.textContent = 'Only JPG, PNG, and WebP images are supported.';
            continue;
          }

          if (file.size > maxSizeBytes) {
            if (uploadErr) uploadErr.textContent = `File "${file.name}" exceeds 5MB limit. Please choose a smaller image.`;
            continue;
          }

          const reader = new FileReader();
          reader.onload = function (e) {
            uploadedImages.push({
              name: file.name,
              dataUrl: e.target.result,
              size: file.size
            });
            renderImagePreviews();
          };
          reader.readAsDataURL(file);
        }
      }

      f4.addEventListener('submit', function (e) {
        e.preventDefault();

        store.setCustomization({
          looksAndColours: f4.elements.looksAndColours.value.trim(),
          consultationPref: f4.elements.consultationPref.value,
          specialNotes: f4.elements.specialNotes.value.trim(),
          referenceImages: uploadedImages
        });

        // Also add specialNotes to requirements for poster rendering
        const req = store.getRequirements();
        req.specificNotes = f4.elements.specialNotes.value.trim();
        store.setRequirements(req);

        showStep(5);
      });
    }

    function renderImagePreviews() {
      const grid = document.getElementById('image-preview-grid');
      if (!grid) return;

      grid.innerHTML = uploadedImages.map((img, idx) => `
        <div class="image-preview-item">
          <img src="${img.dataUrl}" alt="Reference photo ${idx + 1}">
          <button class="image-preview-remove" type="button" data-idx="${idx}" title="Remove image">&times;</button>
        </div>
      `).join('');

      grid.querySelectorAll('.image-preview-remove').forEach(btn => {
        btn.addEventListener('click', function () {
          const idx = parseInt(this.dataset.idx, 10);
          uploadedImages.splice(idx, 1);
          renderImagePreviews();
        });
      });
    }

    // =========================================================================
    // STEP 5 SETUP, POSTER RENDERING & SUBMISSION
    // =========================================================================
    function populateReviewSummary() {
      const contact = store.getContact();
      const eventDetails = store.getEventDetails();
      const req = store.getRequirements();
      const custom = store.getCustomization();
      const pkg = store.getPackageType();

      // Step 1
      const pName = document.getElementById('rev-p-name');
      const pMobile = document.getElementById('rev-p-mobile');
      const pWa = document.getElementById('rev-p-whatsapp');
      const pEmail = document.getElementById('rev-p-email');
      const pAddr = document.getElementById('rev-p-address');

      if (pName) pName.textContent = contact.name || '—';
      if (pMobile) pMobile.textContent = contact.mobile || '—';
      if (pWa) pWa.textContent = contact.whatsapp || contact.mobile || '—';
      if (pEmail) pEmail.textContent = contact.email || 'Not provided';
      if (pAddr) pAddr.textContent = `${contact.address || ''}, ${contact.city || 'Salem'}`;

      // Step 2
      const eName = document.getElementById('rev-e-name');
      const eType = document.getElementById('rev-e-type');
      const eDate = document.getElementById('rev-e-date');
      const eReady = document.getElementById('rev-e-ready');
      const eVenue = document.getElementById('rev-e-venue');

      if (eName) eName.textContent = eventDetails.eventName || '—';
      if (eType) eType.textContent = eventDetails.eventType || 'Wedding Muhurtham';
      if (eDate) eDate.textContent = eventDetails.eventDate || contact.eventDate || '—';
      if (eReady) eReady.textContent = `${eventDetails.gettingReadyTime || '06:00 AM'} (${eventDetails.eventTime || 'Morning'})`;
      if (eVenue) eVenue.textContent = `${eventDetails.venueName || ''} — ${eventDetails.venueAddress || ''} [${eventDetails.functionLocation || 'Mandapam'}]`;

      // Step 3
      const serviceList = document.getElementById('rev-service-details-list');
      if (serviceList) {
        let items = [];
        if (pkg === 'bridal-beauty' || pkg === 'complete-bridal') {
          if (req.makeupStyle) items.push(`<strong>Makeup Style:</strong> ${req.makeupStyle}`);
          if (req.hairStyle) items.push(`<strong>Hairstyle &amp; Flowers:</strong> ${req.hairStyle}`);
          if (req.drapingType) items.push(`<strong>Saree Setting:</strong> ${req.drapingType}`);
          if (req.mehndiStyle) items.push(`<strong>Mehndi Aesthetic:</strong> ${req.mehndiStyle}`);
          if (req.jewelleryAssistance) items.push(`<strong>Jewellery Assistance:</strong> ${req.jewelleryAssistance}`);
          if (req.makeupPeople) items.push(`<strong>Persons for Makeup:</strong> ${req.makeupPeople}`);
        }
        if (pkg === 'designer-blouse' || pkg === 'complete-bridal') {
          if (req.blouseDesignType) items.push(`<strong>Neckline / Pattern:</strong> ${req.blouseDesignType}`);
          if (req.blouseStitchType) items.push(`<strong>Stitching Structure:</strong> ${req.blouseStitchType}`);
          if (req.aariWorkType) items.push(`<strong>Aari Work:</strong> ${req.aariWorkType}`);
          if (req.blouseCount) items.push(`<strong>Quantity:</strong> ${req.blouseCount}`);
          if (req.fabricStatus) items.push(`<strong>Fabric:</strong> ${req.fabricStatus}`);
          if (req.measurementPreference) items.push(`<strong>Measurements:</strong> ${req.measurementPreference}`);
        }

        serviceList.innerHTML = items.map(it => `<div>• ${it}</div>`).join('');
      }

      // Step 4
      const cLooks = document.getElementById('rev-c-looks');
      const cConsult = document.getElementById('rev-c-consultation');
      const cNotes = document.getElementById('rev-c-notes');
      const cThumbs = document.getElementById('rev-ref-thumbnails');

      if (cLooks) cLooks.textContent = custom.looksAndColours || 'To be discussed during consultation';
      if (cConsult) cConsult.textContent = custom.consultationPref || 'In-person Salem Studio';
      if (cNotes) cNotes.textContent = custom.specialNotes || 'None';

      if (cThumbs) {
        if (uploadedImages.length > 0) {
          cThumbs.innerHTML = uploadedImages.map((img, i) => `
            <img src="${img.dataUrl}" alt="Ref ${i + 1}" style="width:60px; height:60px; object-fit:cover; border-radius:6px; border:1px solid var(--border);">
          `).join('');
        } else {
          cThumbs.innerHTML = '<span style="font-size:0.85rem; color:var(--muted);">No reference images attached</span>';
        }
      }
    }

    async function renderPosterPreview() {
      const renderTarget = document.getElementById('poster-render-target');
      const previewImg = document.getElementById('generated-poster-img');
      const loader = document.getElementById('poster-loader');

      if (!renderTarget || !posterModule) return;

      const contact = store.getContact();
      const services = store.getPopulated();
      const requirements = store.getRequirements();
      const ref = store.getRef();

      if (loader) loader.style.display = 'block';
      if (previewImg) previewImg.style.display = 'none';

      // Generate HTML markup
      const html = posterModule.generateHTML({
        contact: contact,
        services: services,
        requirements: requirements,
        ref: ref
      });

      renderTarget.innerHTML = html;

      try {
        const rootEl = document.getElementById('poster-root');
        generatedCanvas = await posterModule.renderToCanvas(rootEl);
        const dataUrl = generatedCanvas.toDataURL('image/png');
        generatedBlob = await posterModule.toBlob(generatedCanvas);

        if (loader) loader.style.display = 'none';
        if (previewImg) {
          previewImg.src = dataUrl;
          previewImg.style.display = 'block';
        }
      } catch (err) {
        console.error('Error generating poster canvas:', err);
        if (loader) {
          loader.innerHTML = `<p style="color:#C62828;">Error generating poster preview: ${err.message}</p>`;
        }
      }
    }

    function setupStep5Listeners() {
      const btnConfirm = document.getElementById('btn-confirm-booking');
      const btnDownload = document.getElementById('btn-download-poster');
      const alertBox = document.getElementById('share-feedback-alert');
      const successModal = document.getElementById('success-modal');
      const btnModalDownload = document.getElementById('btn-modal-download');

      function showAlert(msg, isSuccess) {
        if (!alertBox) return;
        alertBox.style.display = 'block';
        alertBox.className = 'form-status ' + (isSuccess ? 'is-ready' : 'is-error');
        alertBox.innerHTML = msg;
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      // Customer action: ONLY Download Booking PNG
      function triggerDownload() {
        if (!generatedCanvas) {
          alert('Poster is still generating. Please wait a moment.');
          return;
        }
        const dataUrl = generatedCanvas.toDataURL('image/png');
        const ref = store.getRef();
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `Bhuvana_Bridal_Studio_Booking_${ref}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }

      if (btnDownload) {
        btnDownload.addEventListener('click', triggerDownload);
      }
      if (btnModalDownload) {
        btnModalDownload.addEventListener('click', triggerDownload);
      }

      // PRIMARY CTA: CONFIRM YOUR BOOKING
      if (btnConfirm) {
        btnConfirm.addEventListener('click', async function () {
          if (!generatedBlob || !generatedCanvas) {
            showAlert('Please wait for the booking poster to finish rendering before confirming.', false);
            return;
          }

          btnConfirm.disabled = true;
          const origHtml = btnConfirm.innerHTML;
          btnConfirm.innerHTML = `<span class="btn-spinner"></span> <span>SUBMITTING ENQUIRY...</span>`;

          const contact = store.getContact();
          const eventDetails = store.getEventDetails();
          const services = store.getPopulated();
          const requirements = store.getRequirements();
          const custom = store.getCustomization();
          const ref = store.getRef();

          try {
            const customerPayload = {
              customer_name: contact.name || contact.fullName || 'Valued Client',
              customer_phone: contact.mobile || contact.phone || '',
              customer_email: contact.email || '',
              event_date: eventDetails.eventDate || contact.eventDate || '',
              location: contact.location || `${eventDetails.venueName || 'Salem'}`,
              service_ids: services.map(s => s.id),
              service_breakdown: {
                bridal: services.filter(s => s.divisionId === 'bridal-beauty').map(s => s.title),
                tailoring: services.filter(s => s.divisionId === 'designer-blouse').map(s => s.title)
              },
              additional_requirements: Object.assign({}, requirements, {
                eventName: eventDetails.eventName,
                eventType: eventDetails.eventType,
                eventTime: eventDetails.eventTime,
                gettingReadyTime: eventDetails.gettingReadyTime,
                venueName: eventDetails.venueName,
                venueAddress: eventDetails.venueAddress,
                functionLocation: eventDetails.functionLocation,
                looksAndColours: custom.looksAndColours,
                consultationPref: custom.consultationPref
              }),
              notes: custom.specialNotes || contact.message || '',
              total_price: 0,
              whatsapp_consent: Boolean(contact.whatsappConsent)
            };

            const formData = new FormData();
            formData.append('booking_data', JSON.stringify(customerPayload));
            formData.append('booking_ref', ref);
            formData.append('whatsapp_consent', contact.whatsappConsent ? 'true' : 'false');
            formData.append('poster_image', generatedBlob, `poster-${ref}.png`);

            let res = null;
            if (config && config.apiFetch) {
              res = await config.apiFetch('/api/bookings', {
                method: 'POST',
                body: formData
              });
            }

            // Populate Success Modal
            const modalRef = document.getElementById('modal-booking-ref');
            const modalName = document.getElementById('modal-customer-name');
            const modalDate = document.getElementById('modal-event-date');
            const modalLoc = document.getElementById('modal-location');

            if (modalRef) modalRef.textContent = (res && res.bookingRef) ? res.bookingRef : ref;
            if (modalName) modalName.textContent = customerPayload.customer_name;
            if (modalDate) modalDate.textContent = customerPayload.event_date;
            if (modalLoc) modalLoc.textContent = customerPayload.location;

            if (successModal) {
              successModal.style.display = 'flex';
            }

            showAlert('Your booking enquiry has been received by Bhuvana’s Bridal Studio. Status: Pending Confirmation.', true);
          } catch (err) {
            console.error('Submission error:', err);
            showAlert(`Submission error: ${err.message}. Please save your poster image or contact studio directly at +91 63740 36629.`, false);
          } finally {
            btnConfirm.disabled = false;
            btnConfirm.innerHTML = origHtml;
          }
        });
      }
    }

    // =========================================================================
    // STEP NAVIGATION (BACK & JUMP BUTTONS)
    // =========================================================================
    function setupGlobalNavigation() {
      // Step back buttons
      document.querySelectorAll('.btn-step-back').forEach(btn => {
        btn.addEventListener('click', function () {
          const target = this.dataset.target;
          if (target === 'step-1') showStep(1);
          else if (target === 'step-2') showStep(2);
          else if (target === 'step-3') showStep(3);
          else if (target === 'step-4') showStep(4);
        });
      });

      // Jump to step buttons on Review page
      document.querySelectorAll('.btn-jump-step').forEach(btn => {
        btn.addEventListener('click', function () {
          const step = parseInt(this.dataset.step, 10);
          if (step >= 1 && step <= 4) {
            showStep(step);
          }
        });
      });
    }

  });
})();
