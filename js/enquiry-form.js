/**
 * Bhuvana's Bridal & Tailoring Studio
 * Unified 5-Step Customer Booking & Consultation Controller
 */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', function () {
    if (!window.BBS_STORE || !window.BBS_CATALOG) return;

    const store = window.BBS_STORE;
    const config = window.BBS_CONFIG;

    let currentStep = 1;
    let uploadedImages = []; // Array of { name, dataUrl, size }

    // Parse URL params
    const urlParams = new URLSearchParams(window.location.search);
    const paramPackage = urlParams.get('package');
    if (paramPackage && ['bridal-beauty', 'designer-blouse', 'complete-bridal'].includes(paramPackage)) {
      store.setPackageType(paramPackage);
    }
    const paramServiceId = urlParams.get('service');
    const paramServiceName = urlParams.get('serviceName');

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
    const requestedService = (paramServiceId && window.BBS_CATALOG?.services?.[paramServiceId])
      || (paramServiceName && Object.values(window.BBS_CATALOG?.services || {}).find(item => item.title.toLowerCase() === paramServiceName.toLowerCase()));
    if (requestedService) {
      const service = requestedService;
      const pkg = store.getPackageType();
      if (pkg === 'complete-bridal' || service.divisionId === pkg) store.setSelectedIds([service.id]);
    }

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

      // If Step 5, populate review summaries
      if (stepNum === 5) {
        populateReviewSummary();
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

    // Convert saved AM/PM or legacy 24-hour times for the native picker.
    function normalizeTimeForPicker(value) {
      const match = String(value || '').trim().match(/^([0-9]{1,2}):([0-9]{2})(?:[ ]*(AM|PM))?$/i);
      if (!match) return '';
      let hour = Number(match[1]);
      const minute = Number(match[2]);
      const period = match[3]?.toUpperCase();
      if (minute > 59) return '';
      if (period) {
        if (hour < 1 || hour > 12) return '';
        hour = hour % 12 + (period === 'PM' ? 12 : 0);
      } else if (hour < 0 || hour > 23) {
        return '';
      }
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }

    function formatTimeWithPeriod(value) {
      const match = String(value || '').trim().match(/^([0-9]{2}):([0-9]{2})$/);
      if (!match) return '';
      const hour24 = Number(match[1]);
      const minute = Number(match[2]);
      if (hour24 > 23 || minute > 59) return '';
      const period = hour24 >= 12 ? 'PM' : 'AM';
      const hour12 = hour24 % 12 || 12;
      return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
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
        const sameAsMobile = document.getElementById('sync-whatsapp');
        if (sameAsMobile) sameAsMobile.checked = !contact.whatsapp || contact.whatsapp === contact.mobile;
      }

      // Step 2: Event
      const f2 = document.getElementById('form-step-2');
      if (f2 && eventDetails) {
        if (eventDetails.eventType) f2.elements.eventType.value = eventDetails.eventType;
        if (eventDetails.eventDate) f2.elements.eventDate.value = eventDetails.eventDate;
        if (eventDetails.eventTime) f2.elements.eventTime.value = normalizeTimeForPicker(eventDetails.eventTime);
        if (eventDetails.eventLocation && f2.elements.eventLocation) f2.elements.eventLocation.value = eventDetails.eventLocation;
        if (eventDetails.eventMapUrl && f2.elements.eventMapUrl) f2.elements.eventMapUrl.value = eventDetails.eventMapUrl;
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

        const sameAsMobile = document.getElementById('sync-whatsapp')?.checked;
        const waVal = sameAsMobile ? mobileVal : f1.elements.whatsapp.value.trim();
        const waDigits = waVal.replace(/\D/g, '');
        if (!waVal && !document.getElementById('sync-whatsapp')?.checked) {
          setErr(f1.elements.whatsapp, 'Please enter your WhatsApp number.');
        } else if (waVal && waDigits.length < 10) {
          setErr(f1.elements.whatsapp, 'Please enter a valid WhatsApp number.');
        } else {
          setErr(f1.elements.whatsapp, '');
        }

        const addrVal = f1.elements.address.value.trim();
        setErr(f1.elements.address, addrVal ? '' : 'Please provide your address.');

        const cityVal = f1.elements.city.value.trim();

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

        const eDateVal = f2.elements.eventDate.value;
        setErr(f2.elements.eventDate, eDateVal ? '' : 'Please select your celebration date.');
        const eventTimeInput = f2.elements.eventTime;
        const timing = formatTimeWithPeriod(eventTimeInput.value);
        const timingError = eventTimeInput.closest('.form-group')?.querySelector('.err-msg');
        if (timingError) timingError.textContent = timing ? '' : 'Choose the event time, including AM or PM.';
        if (!timing) { ok = false; if (!firstInvalid) firstInvalid = eventTimeInput; }
        const address = f2.elements.eventLocation.value.trim();
        const mapUrl = f2.elements.eventMapUrl.value.trim();
        const addressError = f2.elements.eventLocation.closest('.form-group')?.querySelector('.err-msg');
        const mapError = f2.elements.eventMapUrl.closest('.form-group')?.querySelector('.err-msg');
        if (addressError) addressError.textContent = '';
        if (mapError) mapError.textContent = '';
        if (!address && !mapUrl) {
          if (addressError) addressError.textContent = 'Enter an event address or add a Google Maps link.';
          if (mapError) mapError.textContent = 'Enter an event address or add a Google Maps link.';
          ok = false;
          if (!firstInvalid) firstInvalid = f2.elements.eventLocation;
        }
        if (mapUrl && !/^https:\/\/(maps\.app\.goo\.gl|www\.google\.com\/maps|maps\.google\.com)\//i.test(mapUrl)) {
          if (mapError) mapError.textContent = 'Enter a valid Google Maps share link.';
          ok = false;
          if (!firstInvalid) firstInvalid = f2.elements.eventMapUrl;
        }

        if (!ok) {
          if (firstInvalid) firstInvalid.focus();
          return;
        }

        // Save event details
        const eventType = f2.elements.eventType.value;
        const eventLocation = address;
        const eventMapUrl = mapUrl;
        const locationField = f2.elements.eventLocation;
        const locationError = locationField.closest('.form-group')?.querySelector('.err-msg');
        if (locationError) locationError.textContent = '';
        store.setEventDetails({
          eventName: eventType,
          eventType,
          eventDate: eDateVal,
          preferredDate: eDateVal,
          eventTime: timing,
          eventLocation,
          eventMapUrl
        });

        // Also update contact with eventDate & location
        const contact = store.getContact();
        contact.eventDate = eDateVal;
        contact.preferredDate = eDateVal;
        contact.location = eventLocation || contact.city || 'Salem';
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
      const catalog = Object.values(window.BBS_CATALOG?.services || {});
      const divisions = pkg === 'bridal-beauty' ? ['bridal-beauty']
        : pkg === 'designer-blouse' ? ['designer-blouse']
        : ['bridal-beauty', 'designer-blouse'];
      const validIds = new Set(catalog.filter(service => divisions.includes(service.divisionId)).map(service => service.id));
      const savedIds = store.getSelectedIds().filter(id => validIds.has(id));
      const defaults = catalog.filter(service => divisions.includes(service.divisionId)).slice(0, pkg === 'complete-bridal' ? 6 : 3).map(service => service.id);
      const ids = savedIds.length ? savedIds : defaults;
      if (ids.length) store.setSelectedIds(ids);
    }

    // =========================================================================
    // STEP 4 SETUP & IMAGE UPLOADS
    // =========================================================================
    function setupStep4Listeners() {
      const f4 = document.getElementById('form-step-4');
      const uploadZone = document.getElementById('upload-zone');
      const fileInput = document.getElementById('ref-image-input');
      const uploadErr = document.getElementById('upload-err-msg');
      const pendingImageReads = [];

      function resizeReferenceImage(file) {
        return new Promise((resolve, reject) => {
          const image = new Image();
          const objectUrl = URL.createObjectURL(file);
          image.onload = () => {
            const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
            const canvas = document.createElement('canvas');
            canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
            canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
            URL.revokeObjectURL(objectUrl);
            canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Could not resize this reference image')), 'image/jpeg', 0.82);
          };
          image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('Could not read this reference image')); };
          image.src = objectUrl;
        });
      }

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
        const maxSizeBytes = 15 * 1024 * 1024; // Compress original photos to keep worker requests small.
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
            if (uploadErr) uploadErr.textContent = `File "${file.name}" exceeds 15MB. Please choose a smaller image.`;
            continue;
          }

          const task = resizeReferenceImage(file).then(blob => new Promise((resolve, reject) => {
            if (blob.size > maxSizeBytes) throw new Error(`File "${file.name}" is too large after compression.`);
            const reader = new FileReader();
            reader.onload = event => { uploadedImages.push({ name: file.name, blob, dataUrl: event.target.result, size: blob.size }); renderImagePreviews(); resolve(); };
            reader.onerror = () => reject(new Error(`Could not finish reading ${file.name}`));
            reader.readAsDataURL(blob);
          })).catch(err => { if (uploadErr) uploadErr.textContent = err.message; });
          pendingImageReads.push(task);
        }
      }

      f4.addEventListener('submit', async function (e) {
        e.preventDefault();
        await Promise.all(pendingImageReads);
        if (uploadErr?.textContent) return;

        store.setCustomization({
          specialNotes: f4.elements.specialNotes.value.trim(),
          referenceImages: uploadedImages
        });

        // Keep special requests available in the owner portal booking details.
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
      const eType = document.getElementById('rev-e-type');
      const eDate = document.getElementById('rev-e-date');
      const eReady = document.getElementById('rev-e-ready');
      const eVenue = document.getElementById('rev-e-venue');

      if (eType) eType.textContent = eventDetails.eventType || 'Wedding Muhurtham';
      if (eDate) eDate.textContent = eventDetails.eventDate || contact.eventDate || '—';
      if (eReady) eReady.textContent = eventDetails.eventTime || '—';
      if (eVenue) eVenue.textContent = eventDetails.eventLocation || 'Not provided';

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
      const cNotes = document.getElementById('rev-c-notes');
      const cThumbs = document.getElementById('rev-ref-thumbnails');

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

    function setupStep5Listeners() {
      const btnConfirm = document.getElementById('btn-confirm-booking');
      const btnDownload = document.getElementById('btn-download-booking-copy');
      const alertBox = document.getElementById('share-feedback-alert');
      const successModal = document.getElementById('success-modal');
      const btnModalDownload = document.getElementById('btn-modal-download');
      let bookingCopy = null;

      function showAlert(msg, isSuccess) {
        if (!alertBox) return;
        alertBox.style.display = 'block';
        alertBox.className = 'form-status ' + (isSuccess ? 'is-ready' : 'is-error');
        alertBox.innerHTML = msg;
        alertBox.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      function escapeCopy(value) {
        return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
      }

      async function loadStudioLogo() {
        const response = await fetch('assets/images/logo.png');
        if (!response.ok) throw new Error('Studio logo could not be loaded');
        const blob = await response.blob();
        return await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      async function downloadBookingCopy() {
        if (!bookingCopy) {
          showAlert('Confirm your booking enquiry first; then the booking copy will be ready to download.', false);
          return;
        }
        try {
          const logo = await loadStudioLogo();
          const c = bookingCopy.customer;
          const e = bookingCopy.event;
          const sections = [
            ['Customer', [['Name', c.customer_name], ['Mobile', c.customer_phone], ['WhatsApp', c.customer_whatsapp || 'Not provided'], ['Email', c.customer_email || 'Not provided'], ['Residential address', c.customer_address || 'Not provided'], ['Preferred contact', c.additional_requirements?.preferredContact || 'Not specified']]],
            ['Event', [['Type', e.eventType], ['Date', e.eventDate], ['Timing', e.eventTime], ['Venue / location', e.eventLocation || 'Not provided']]],
            ['Selected services', [['Experience', bookingCopy.package], ['Services', bookingCopy.services.join(', ') || 'Not specified'], ['Preferences', bookingCopy.preferenceText || 'See selected service details']]],
            ['Notes & references', [['Special requests', c.notes || 'None provided'], ['Reference images', `${c.referenceCount} attached${c.referenceCount ? ' for the studio' : ''}`]]]
          ];
          const cards = sections.map(([title, rows]) => `<section><h2>${escapeCopy(title)}</h2>${rows.map(([label, value]) => `<div class="row"><span>${escapeCopy(label)}</span><strong>${escapeCopy(value)}</strong></div>`).join('')}</section>`).join('');
          const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booking copy ${escapeCopy(bookingCopy.ref)}</title><style>*{box-sizing:border-box}body{margin:0;padding:24px;background:#f1ece4;color:#3b2f2a;font:15px Arial,sans-serif}.sheet{max-width:760px;margin:auto;padding:28px;background:#fffdfa;border:1px solid #e5d5bd;border-radius:16px}.brand{display:flex;gap:16px;align-items:center;border-bottom:1px solid #eadcc8;padding-bottom:20px}.brand img{width:58px;height:58px;object-fit:contain}.brand h1{margin:0;font:26px Georgia,serif}.brand p{margin:6px 0 0;color:#8a6b3b;font-size:11px;letter-spacing:.16em}.ref{display:flex;justify-content:space-between;background:#f8f2e8;margin:20px 0;padding:15px;border-left:3px solid #b08d57}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}section{padding:16px;border:1px solid #eee4d4;border-radius:10px}section h2{font:19px Georgia,serif;border-bottom:1px solid #eadcc8;padding-bottom:9px;margin:0 0 10px}.row{display:grid;grid-template-columns:110px 1fr;gap:8px;margin:8px 0;font-size:13px;line-height:1.4}.row span{color:#806b5b}.status{margin-top:14px;background:#f6f0e5;border:1px solid #ead9bd;padding:16px;border-radius:10px;color:#735932}.status small{display:block;color:#695d53;margin-top:8px;line-height:1.5}.foot{border-top:1px solid #eee4d4;padding-top:13px;margin-top:18px;color:#8b8077;font-size:12px}@media(max-width:560px){body{padding:10px}.sheet{padding:16px}.grid{grid-template-columns:1fr}.brand h1{font-size:21px}.row{grid-template-columns:95px 1fr}}@media print{body{padding:0;background:white}.sheet{border:0;max-width:none}}</style></head><body><main class="sheet"><header class="brand"><img src="${logo}" alt="Bhuvana Bridal Studio logo"><div><h1>Bhuvana Bridal Studio</h1><p>BOOKING ENQUIRY COPY</p></div></header><div class="ref"><div><small>BOOKING REFERENCE</small><br><strong>${escapeCopy(bookingCopy.ref)}</strong></div><div><small>SUBMITTED</small><br><strong>${escapeCopy(bookingCopy.submittedAt)}</strong></div></div><div class="grid">${cards}</div><div class="status"><strong>● ENQUIRY RECEIVED · STUDIO CONFIRMATION PENDING</strong><small>This copy records your enquiry. Your appointment is not confirmed until Bhuvaneshwari reviews availability and contacts you.</small></div><footer class="foot">+91 63740 36629 · Salem, Tamil Nadu</footer></main></body></html>`;
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Bhuvana_Bridal_Studio_Booking_${bookingCopy.ref}.html`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (err) {
          showAlert(`Booking copy could not be created: ${err.message}`, false);
        }
      }

      btnDownload?.addEventListener('click', downloadBookingCopy);
      btnModalDownload?.addEventListener('click', downloadBookingCopy);

      // PRIMARY CTA: CONFIRM YOUR BOOKING
      if (btnConfirm) {
        btnConfirm.addEventListener('click', async function () {
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
              customer_whatsapp: contact.whatsapp || '',
              customer_email: contact.email || '',
              customer_address: contact.address || '',
              event_date: eventDetails.eventDate || contact.eventDate || '',
              location: eventDetails.eventLocation || contact.city || 'Salem',
              service_ids: services.map(s => s.id),
              service_breakdown: {
                bridal: services.filter(s => s.divisionId === 'bridal-beauty').map(s => s.title),
                tailoring: services.filter(s => s.divisionId === 'designer-blouse').map(s => s.title)
              },
              additional_requirements: Object.assign({}, requirements, {
                eventName: eventDetails.eventName,
                eventType: eventDetails.eventType,
                eventTime: eventDetails.eventTime,
                eventLocation: eventDetails.eventLocation,
                eventMapUrl: eventDetails.eventMapUrl || '',
                customerAddress: contact.address,
                preferredContact: contact.preferredContact || ''
              }),
              notes: custom.specialNotes || contact.message || '',
              total_price: 0,
              whatsapp_consent: Boolean(contact.whatsappConsent)
            };

            const formData = new FormData();
            formData.append('booking_data', JSON.stringify(customerPayload));
            formData.append('booking_ref', ref);
            formData.append('whatsapp_consent', contact.whatsappConsent ? 'true' : 'false');
            uploadedImages.forEach((image, index) => formData.append('reference_images', image.blob, image.name || `reference-${index + 1}.jpg`));

            let res = null;
            if (config && config.apiFetch) {
              res = await config.apiFetch('/api/bookings', {
                method: 'POST',
                body: formData
              });
            }
            if (!res?.success) throw new Error(res?.error || 'The studio did not confirm receipt of this enquiry.');

            const bookingRef = res.bookingRef || ref;
            store.clearBookingRef?.();
            if (btnDownload) {
              btnDownload.disabled = false;
              btnDownload.style.opacity = '1';
            }
            bookingCopy = {
              ref: bookingRef,
              submittedAt: new Date().toLocaleString('en-IN'),
              package: store.getPackageType() === 'designer-blouse' ? 'Designer Blouse' : store.getPackageType() === 'complete-bridal' ? 'Bridal & Blouse' : 'Bridal & Beauty',
              services: services.map(service => service.title),
              preferenceText: Object.entries(requirements).filter(([key, value]) => value && key !== 'specificNotes').map(([key, value]) => `${key}: ${value}`).join(' · '),
              customer: { ...customerPayload, notes: custom.specialNotes || '', referenceCount: (custom.referenceImages || []).length },
              event: eventDetails
            };

            // Populate Success Modal
            const modalRef = document.getElementById('modal-booking-ref');
            const modalName = document.getElementById('modal-customer-name');
            const modalDate = document.getElementById('modal-event-date');
            const modalLoc = document.getElementById('modal-location');

            if (modalRef) modalRef.textContent = bookingRef;
            if (modalName) modalName.textContent = customerPayload.customer_name;
            if (modalDate) modalDate.textContent = customerPayload.event_date;
            if (modalLoc) modalLoc.textContent = customerPayload.location;

            if (successModal) {
              successModal.style.display = 'flex';
            }

            showAlert('Your booking enquiry has been received by Bhuvana’s Bridal Studio. Status: Pending Confirmation.', true);
          } catch (err) {
            console.error('Submission error:', err);
            showAlert(`Submission error: ${err.message}. Please try again or contact the studio at +91 63740 36629.`, false);
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
