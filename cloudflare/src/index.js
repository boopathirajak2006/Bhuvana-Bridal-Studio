/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Worker Entrypoint
 * Provides high-performance, serverless booking management on Cloudflare Workers,
 * Cloudflare D1, private Cloudinary image storage, FCM & WhatsApp.
 */

import { handleOptions, errorResponse, jsonResponse } from './utils/response.js';
import { requireOwnerAuth } from './middleware/authentication.js';
import {
  handleReserveBooking,
  handleSubmitBooking,
  handleGetBookingStatus
} from './routes/booking.js';
import {
  handleAdminLogin,
  handleAdminLogout,
  handleAdminMe,
  handleChangePassword,
  handleListBookings,
  handleGetStats,
  handleGetBookingDetails,
  handleGetBookingPoster,
  handleApproveBooking,
  handleRejectBooking,
  handleExportBookings,
  handleRetryNotification
} from './routes/admin.js';
import { handleRegisterDevice } from './routes/notifications.js';
import {
  handleWhatsAppWebhookGet,
  handleWhatsAppWebhookPost
} from './routes/whatsapp.js';
import { handlePublicGallery, handleOwnerGalleryList, handleOwnerGalleryUpload, handleOwnerGalleryDelete } from './routes/gallery.js';
import { handlePublicContent, handleOwnerContent } from './routes/content.js';

export default {
  /**
   * Main fetch request handler
   */
  async fetch(request, env, ctx) {
    // 1. Handle CORS Preflight OPTIONS
    if (request.method === 'OPTIONS') {
      return handleOptions(request, env);
    }

    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      // -------------------------------------------------------------
      // Health Check
      // -------------------------------------------------------------
      if (path === '/api/health' && method === 'GET') {
        return jsonResponse(request, env, {
          status: 'healthy',
          timestamp: new Date().toISOString(),
          service: "Bhuvana's Bridal Studio Cloudflare Backend",
          version: '2.0.0'
        });
      }

      if (path === '/api/gallery' && method === 'GET') return await handlePublicGallery(request, env);
      if (path === '/api/content' && method === 'GET') return await handlePublicContent(request, env);

      // -------------------------------------------------------------
      // Public Booking Endpoints (Customer Facing)
      // -------------------------------------------------------------
      if (path === '/api/bookings/reserve' && method === 'POST') {
        return await handleReserveBooking(request, env);
      }

      if (path === '/api/bookings/submit' && method === 'POST') {
        return await handleSubmitBooking(request, env);
      }

      // Backwards-compatible route used by the current website frontend.
      if (path === '/api/bookings' && method === 'POST') {
        return await handleSubmitBooking(request, env);
      }

      const statusMatch = path.match(/^\/api\/bookings\/status\/([A-Za-z0-9-]+)$/);
      if (statusMatch && method === 'GET') {
        return await handleGetBookingStatus(request, env, statusMatch[1]);
      }

      // -------------------------------------------------------------
      // Authentication Endpoints
      // -------------------------------------------------------------
      if (path === '/api/auth/login' && method === 'POST') {
        return await handleAdminLogin(request, env);
      }

      if (path === '/api/auth/logout' && method === 'POST') {
        const { auth, errorResponse: authErr } = await requireOwnerAuth(request, env);
        if (authErr) return authErr;
        return await handleAdminLogout(request, env, auth);
      }

      if (path === '/api/auth/me' && method === 'GET') {
        const { auth, errorResponse: authErr } = await requireOwnerAuth(request, env);
        if (authErr) return authErr;
        return await handleAdminMe(request, env, auth);
      }

      // -------------------------------------------------------------
      // Meta WhatsApp Webhook Endpoints
      // -------------------------------------------------------------
      if (path === '/api/whatsapp/webhook') {
        if (method === 'GET') {
          return await handleWhatsAppWebhookGet(request, env);
        }
        if (method === 'POST') {
          return await handleWhatsAppWebhookPost(request, env);
        }
      }

      // -------------------------------------------------------------
      // Protected Studio Owner Portal Endpoints
      // -------------------------------------------------------------
      if (path.startsWith('/api/admin/')) {
        const { auth, errorResponse: authErr } = await requireOwnerAuth(request, env);
        if (authErr) return authErr;

        if (path === '/api/admin/gallery' && method === 'GET') return await handleOwnerGalleryList(request, env, auth);
        if (path === '/api/admin/gallery/photo' && method === 'POST') return await handleOwnerGalleryUpload(request, env, auth);
        if (path === '/api/admin/gallery/photo' && method === 'DELETE') return await handleOwnerGalleryDelete(request, env, auth);
        if (path === '/api/admin/content' && ['GET', 'PUT'].includes(method)) return await handleOwnerContent(request, env, auth);

        if (path === '/api/admin/change-password' && method === 'POST') {
          return await handleChangePassword(request, env, auth);
        }

        // Statistics
        if (path === '/api/admin/bookings/stats' && method === 'GET') {
          return await handleGetStats(request, env, auth);
        }

        // Export data
        if (path === '/api/admin/bookings/export' && method === 'GET') {
          return await handleExportBookings(request, env, auth);
        }

        // Register FCM Push Device
        if (path === '/api/admin/devices/register' && method === 'POST') {
          return await handleRegisterDevice(request, env, auth);
        }

        // Retry notification job
        const retryMatch = path.match(/^\/api\/admin\/notifications\/retry\/([A-Za-z0-9-]+)$/);
        if (retryMatch && method === 'POST') {
          return await handleRetryNotification(request, env, auth, retryMatch[1]);
        }

        // Bookings collection
        if (path === '/api/admin/bookings' && method === 'GET') {
          return await handleListBookings(request, env, auth);
        }

        // Poster stream
        const posterMatch = path.match(/^\/api\/admin\/bookings\/([A-Za-z0-9-]+)\/poster$/);
        if (posterMatch && method === 'GET') {
          return await handleGetBookingPoster(request, env, auth, posterMatch[1]);
        }

        // Approve
        const approveMatch = path.match(/^\/api\/admin\/bookings\/([A-Za-z0-9-]+)\/approve$/);
        if (approveMatch && method === 'POST') {
          return await handleApproveBooking(request, env, auth, approveMatch[1]);
        }

        // Reject
        const rejectMatch = path.match(/^\/api\/admin\/bookings\/([A-Za-z0-9-]+)\/reject$/);
        if (rejectMatch && method === 'POST') {
          return await handleRejectBooking(request, env, auth, rejectMatch[1]);
        }

        // Single booking details
        const bookingDetailMatch = path.match(/^\/api\/admin\/bookings\/([A-Za-z0-9-]+)$/);
        if (bookingDetailMatch && method === 'GET') {
          return await handleGetBookingDetails(request, env, auth, bookingDetailMatch[1]);
        }
      }

      // 404 Route Not Found
      return errorResponse(request, env, `Endpoint not found: ${method} ${path}`, 404, 'NOT_FOUND');
    } catch (err) {
      console.error('[Cloudflare Worker Uncaught Error]', err);
      return errorResponse(request, env, 'Internal server error', 500, 'INTERNAL_SERVER_ERROR');
    }
  }
};
