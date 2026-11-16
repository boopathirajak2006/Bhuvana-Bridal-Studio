/**
 * Bhuvana's Bridal & Tailoring Studio
 * Owner Dashboard & Management Controller
 */

(function () {
  'use strict';

  // Enforce Authentication
  if (!window.BBS_AUTH || !window.BBS_AUTH.requireAuth()) {
    return;
  }

  const config = window.BBS_CONFIG;
  let currentStatusFilter = 'all';
  let currentSearchQuery = '';
  let activeSelectedBooking = null;
  let posterObjectUrl = null;

  document.addEventListener('DOMContentLoaded', function () {
    initDashboard();
  });

  async function initDashboard() {
    setupOwnerHeader();
    setupEventListeners();
    await loadMetrics();
    await loadBookings();
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

  function setupEventListeners() {
    // Filter tabs
    const tabs = document.querySelectorAll('.filter-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function () {
        tabs.forEach(t => t.classList.remove('active'));
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

    // Refresh button
    const refreshBtn = document.getElementById('btn-refresh');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await loadMetrics();
        await loadBookings();
      });
    }

    // Export button
    const exportBtn = document.getElementById('btn-export-backup');
    if (exportBtn) {
      exportBtn.addEventListener('click', async () => {
        try {
          exportBtn.disabled = true;
          exportBtn.innerHTML = '<span>⏳</span> Exporting...';
          const res = await config.apiFetch('/api/admin/bookings/export');
          const blob = new Blob([JSON.stringify(res, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `bhuvana_bookings_backup_${new Date().toISOString().split('T')[0]}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } catch (err) {
          alert('Failed to export bookings: ' + err.message);
        } finally {
          exportBtn.disabled = false;
          exportBtn.innerHTML = '<span>💾</span> <span>Export Backup</span>';
        }
      });
    }

    // Detail modal close
    const closeDetailModalBtn = document.getElementById('btn-close-detail-modal');
    if (closeDetailModalBtn) {
      closeDetailModalBtn.addEventListener('click', closeDetailModal);
    }

    // Reject reason modal toggle & close
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

    // Approve trigger
    const triggerApproveBtn = document.getElementById('btn-trigger-approve');
    if (triggerApproveBtn) {
      triggerApproveBtn.addEventListener('click', handleApproveCurrentBooking);
    }

    // Reject trigger
    const triggerRejectBtn = document.getElementById('btn-trigger-reject');
    if (triggerRejectBtn) {
      triggerRejectBtn.addEventListener('click', () => {
        const modal = document.getElementById('reject-reason-modal');
        if (modal) modal.style.display = 'flex';
      });
    }

    // Confirm reject
    const confirmRejectBtn = document.getElementById('btn-confirm-reject');
    if (confirmRejectBtn) {
      confirmRejectBtn.addEventListener('click', handleRejectCurrentBooking);
    }

    // Push notification toggle
    const pushBtn = document.getElementById('btn-push-toggle');
    if (pushBtn) {
      pushBtn.addEventListener('click', handleEnablePushNotifications);
    }
  }

  // ==========================================
  // METRICS & DATA FETCHING
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

        const cleanPhone = (b.customer_mobile || '').replace(/\D/g, '');
        const waLink = cleanPhone ? `https://wa.me/91${cleanPhone.slice(-10)}` : '#';

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
                <a href="${waLink}" target="_blank" rel="noopener" style="color: #128C7E; text-decoration: none;">💬 WhatsApp</a>
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
  // DETAIL & DECISION MODAL
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
      if (b.whatsapp_consent === 1) {
        consentBox.style.background = 'rgba(37, 211, 102, 0.12)';
        consentBox.style.border = '1px solid #25D366';
        consentBox.style.color = '#128C7E';
        consentBox.innerHTML = `✓ Customer opted-in to receive automated WhatsApp notifications.`;
      } else {
        consentBox.style.background = '#F5EDE4';
        consentBox.style.border = '1px solid var(--border)';
        consentBox.style.color = 'var(--ink-light)';
        consentBox.innerHTML = `Customer did not opt-in for WhatsApp. Contact manually by phone call.`;
      }

      // Poster Stream
      const posterImg = document.getElementById('detail-poster-img');
      const posterDownloadBtn = document.getElementById('btn-download-detail-poster');

      // Fetch authenticated poster image
      if (posterObjectUrl) {
        URL.revokeObjectURL(posterObjectUrl);
        posterObjectUrl = null;
      }

      posterImg.src = '';
      posterImg.alt = 'Loading poster...';

      try {
        const token = localStorage.getItem('bbs_owner_token');
        const posterRes = await fetch(config.url(`/api/admin/bookings/${b.id}/poster`), {
          headers: token ? { 'Authorization': 'Bearer ' + token } : {},
          credentials: 'include'
        });

        if (posterRes.ok) {
          const blob = await posterRes.blob();
          posterObjectUrl = URL.createObjectURL(blob);
          posterImg.src = posterObjectUrl;
          posterDownloadBtn.href = posterObjectUrl;
          posterDownloadBtn.download = `Bhuvana-Booking-${b.booking_ref}.png`;
        } else {
          posterImg.alt = 'Poster image unavailable';
        }
      } catch (imgErr) {
        console.warn('Failed to stream poster image:', imgErr);
        posterImg.alt = 'Poster image preview failed';
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

      // Show modal
      const modal = document.getElementById('booking-detail-modal');
      if (modal) modal.style.display = 'flex';
    } catch (err) {
      alert('Error fetching details: ' + err.message);
    }
  };

  function closeDetailModal() {
    const modal = document.getElementById('booking-detail-modal');
    if (modal) modal.style.display = 'none';
    if (posterObjectUrl) {
      URL.revokeObjectURL(posterObjectUrl);
      posterObjectUrl = null;
    }
    activeSelectedBooking = null;
  }

  function closeRejectModal() {
    const modal = document.getElementById('reject-reason-modal');
    if (modal) modal.style.display = 'none';
  }

  // ==========================================
  // APPROVE ACTION
  // ==========================================
  async function handleApproveCurrentBooking() {
    if (!activeSelectedBooking) return;
    const b = activeSelectedBooking;

    const confirmed = confirm(
      `Approve Booking ${b.booking_ref} for ${b.customer_name}?\n\n` +
      `This will mark the booking as Approved in the studio system and send an official WhatsApp confirmation to ${b.customer_mobile} (if customer consented).`
    );

    if (!confirmed) return;

    const btn = document.getElementById('btn-trigger-approve');
    btn.disabled = true;
    btn.textContent = 'Approving...';

    try {
      const res = await config.apiFetch(`/api/admin/bookings/${b.id}/approve`, {
        method: 'POST'
      });

      alert(`✓ Booking ${b.booking_ref} approved successfully!`);
      closeDetailModal();
      await loadMetrics();
      await loadBookings();
    } catch (err) {
      alert(`Approval error: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = '✓ Approve Booking';
    }
  }

  // ==========================================
  // REJECT ACTION
  // ==========================================
  async function handleRejectCurrentBooking() {
    if (!activeSelectedBooking) return;
    const b = activeSelectedBooking;

    const select = document.getElementById('reject-reason-select');
    let reason = select.value;
    if (reason === 'Custom') {
      const customInput = document.getElementById('reject-custom-reason');
      reason = customInput ? customInput.value.trim() : '';
    }

    if (!reason) {
      alert('Please select or specify a reason for rejection.');
      return;
    }

    const internalNotes = document.getElementById('reject-internal-notes').value.trim();

    const btn = document.getElementById('btn-confirm-reject');
    btn.disabled = true;
    btn.textContent = 'Rejecting...';

    try {
      const res = await config.apiFetch(`/api/admin/bookings/${b.id}/reject`, {
        method: 'POST',
        body: JSON.stringify({
          reason: reason,
          notes: internalNotes
        })
      });

      alert(`Booking ${b.booking_ref} marked as rejected.`);
      closeRejectModal();
      closeDetailModal();
      await loadMetrics();
      await loadBookings();
    } catch (err) {
      alert(`Rejection error: ${err.message}`);
    } finally {
      btn.disabled = false;
      btn.textContent = 'Confirm Rejection';
    }
  }

  // ==========================================
  // PUSH NOTIFICATIONS (FCM)
  // ==========================================
  async function handleEnablePushNotifications() {
    if (!('Notification' in window)) {
      alert('Push notifications are not supported in this browser.');
      return;
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        const label = document.getElementById('push-status-label');
        if (label) label.textContent = 'Alerts Active ✓';
        alert('Push notifications enabled! You will be notified instantly when a customer submits a booking.');
      } else {
        alert('Notification permission was declined.');
      }
    } catch (err) {
      console.warn('Push error:', err);
    }
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

})();
