/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Cloudinary Secure Image Storage Service
 * Handles signed uploads, private asset storage, and authenticated streaming.
 */

export class CloudinaryService {
  static isPlaceholder(value) {
    return typeof value !== 'string' || !value.trim() || /your[-_ ]|replace[-_ ]|placeholder/i.test(value);
  }

  /**
   * Helper to compute SHA-1 hex digest
   */
  static async sha1(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Generate Cloudinary API signature for upload/management requests
   * Sorts parameter keys alphabetically, joins as key=value&..., appends api_secret, hashes with SHA-1
   */
  static async generateApiSignature(params, apiSecret) {
    const sortedKeys = Object.keys(params).sort();
    const toSign = sortedKeys.map(k => `${k}=${params[k]}`).join('&') + apiSecret;
    return await this.sha1(toSign);
  }

  static async uploadGalleryPhoto(env, category, subcategory, photoId, arrayBuffer) {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env;
    if ([cloudName, apiKey, apiSecret].some(value => this.isPlaceholder(value))) {
      throw new Error('Cloudinary gallery credentials are not configured');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = 'bhuvana_gallery';
    const publicId = `${folder}/${category}/${subcategory}/${photoId}`;
    const params = { public_id: publicId, timestamp: String(timestamp) };
    const signature = await this.generateApiSignature(params, apiSecret);
    const form = new FormData();
    form.append('file', new Blob([arrayBuffer]), `${photoId}`);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('public_id', publicId);
    form.append('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || `Cloudinary upload failed (${response.status})`);
    return { public_id: result.public_id, secure_url: result.secure_url };
  }

  static async deleteGalleryPhoto(env, publicId) {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env;
    if ([cloudName, apiKey, apiSecret].some(value => this.isPlaceholder(value))) {
      throw new Error('Cloudinary gallery credentials are not configured');
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const signature = await this.generateApiSignature({ public_id: publicId, timestamp: String(timestamp) }, apiSecret);
    const form = new FormData();
    form.append('public_id', publicId);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/destroy`, { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok || (result.result !== 'ok' && result.result !== 'not found')) throw new Error(result.error?.message || 'Cloudinary photo deletion failed');
    return result;
  }

  static async uploadBookingReference(env, bookingRef, referenceId, arrayBuffer, mimeType) {
    const { CLOUDINARY_CLOUD_NAME: cloudName, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: apiSecret } = env;
    if ([cloudName, apiKey, apiSecret].some(value => this.isPlaceholder(value))) throw new Error('Cloudinary booking reference credentials are not configured');
    const folder = `bhuvana_booking_references/${bookingRef}`;
    const publicId = `${folder}/${referenceId}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const type = 'authenticated';
    const params = { folder, public_id: publicId, timestamp: String(timestamp), type };
    const signature = await this.generateApiSignature(params, apiSecret);
    const form = new FormData();
    form.append('file', new Blob([arrayBuffer], { type: mimeType }), referenceId);
    form.append('api_key', apiKey);
    form.append('timestamp', String(timestamp));
    form.append('folder', folder);
    form.append('public_id', publicId);
    form.append('type', type);
    form.append('signature', signature);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: form });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error?.message || `Cloudinary reference upload failed (${response.status})`);
    return { public_id: result.public_id, secure_url: result.secure_url, version: String(result.version), format: result.format || 'jpg' };
  }

  /**
   * Generate Cloudinary delivery signature for authenticated/private images
   * Formula: First 8 characters of Base64 URL-safe SHA-1 of `[v<version>/]<public_id><api_secret>`
   */
  static async generateDeliverySignature(publicId, version, apiSecret) {
    const versionPrefix = version ? `v${version}/` : '';
    const toSign = `${versionPrefix}${publicId}${apiSecret}`;
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-1', encoder.encode(toSign));
    const bytes = new Uint8Array(hashBuffer);

    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `s--${b64.substring(0, 8)}--`;
  }

  /**
   * Generate signed delivery URL for authenticated private image
   */
  static async generateSignedDeliveryUrl(env, publicId, version = null, format = 'png') {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiSecret = env.CLOUDINARY_API_SECRET;
    if (this.isPlaceholder(cloudName) || this.isPlaceholder(apiSecret)) return null;

    const signature = await this.generateDeliverySignature(publicId, version, apiSecret);
    const versionPart = version ? `v${version}/` : '';
    const cleanPublicId = publicId.replace(/\.[^/.]+$/, ''); // Remove extension if present

    return `https://res.cloudinary.com/${cloudName}/image/authenticated/${signature}/${versionPart}${cleanPublicId}.${format}`;
  }

  /**
   * Upload booking poster PNG image to Cloudinary (marked type: 'authenticated' for strict privacy)
   *
   * @param {object} env Cloudflare Worker environment variables
   * @param {string} bookingRef Format: BBS-2026-XXXXXX
   * @param {ArrayBuffer} arrayBuffer Binary PNG image bytes
   * @param {object} metadata Optional customer/booking metadata
   * @returns {Promise<object>} Cloudinary upload response { public_id, secure_url, version, asset_id, bytes }
   */
  static async uploadPoster(env, bookingRef, arrayBuffer, metadata = {}) {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;

    // Strict validation: Credentials MUST be present. No fake or mock success.
    if (this.isPlaceholder(cloudName) || this.isPlaceholder(apiKey) || this.isPlaceholder(apiSecret)) {
      const missing = [];
      if (this.isPlaceholder(cloudName)) missing.push('CLOUDINARY_CLOUD_NAME');
      if (this.isPlaceholder(apiKey)) missing.push('CLOUDINARY_API_KEY');
      if (this.isPlaceholder(apiSecret)) missing.push('CLOUDINARY_API_SECRET');
      throw new Error(`Cloudinary configuration error: Missing required credentials (${missing.join(', ')}). Image upload cannot proceed.`);
    }

    if (!arrayBuffer || arrayBuffer.byteLength === 0) {
      throw new Error('Poster image file buffer is empty');
    }

    const currentYear = new Date().getFullYear();
    const publicId = `bhuvana_posters/${currentYear}/${bookingRef}`;
    const timestamp = Math.floor(Date.now() / 1000);
    const type = 'authenticated'; // Assets cannot be accessed publicly without signature or owner auth
    const folder = `bhuvana_posters/${currentYear}`;
    const context = metadata.customerName
      ? `customer=${encodeURIComponent(metadata.customerName)}|ref=${bookingRef}`
      : null;

    // Cloudinary signature parameters (alphabetical)
    const signParams = {
      folder,
      public_id: publicId,
      timestamp: String(timestamp),
      type
    };
    if (context) signParams.context = context;

    const signature = await this.generateApiSignature(signParams, apiSecret);

    // Build Multipart Form Data
    const formData = new FormData();
    const fileBlob = new Blob([arrayBuffer], { type: 'image/png' });
    formData.append('file', fileBlob, `${bookingRef}.png`);
    formData.append('api_key', apiKey);
    formData.append('timestamp', String(timestamp));
    formData.append('folder', folder);
    formData.append('public_id', publicId);
    formData.append('type', type);
    formData.append('signature', signature);

    if (context) formData.append('context', context);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`;

    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      const errDetail = result.error?.message || `HTTP ${response.status}`;
      console.error('[Cloudinary] Upload failed:', errDetail);
      throw new Error(`Cloudinary upload failed: ${errDetail}`);
    }

    return {
      public_id: result.public_id,
      asset_id: result.asset_id,
      version: String(result.version),
      format: result.format || 'png',
      bytes: result.bytes || arrayBuffer.byteLength,
      secure_url: result.secure_url,
      type: result.type
    };
  }

  /**
   * Securely retrieve private booking poster image stream for authenticated studio owner
   *
   * @param {object} env Cloudflare Worker environment variables
   * @param {object} booking Booking record from Cloudflare D1
   * @returns {Promise<Response>} Response object with image stream
   */
  static async getPosterStream(env, booking) {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;

    const publicId = booking.poster_public_id;
    if (!publicId) {
      return null;
    }

    // Require credentials for retrieval
    if (this.isPlaceholder(cloudName) || this.isPlaceholder(apiKey) || this.isPlaceholder(apiSecret)) {
      throw new Error('Cloudinary credentials missing in worker environment');
    }

    // Method 1: Try signed delivery URL from Cloudinary CDN
    try {
      const signedDeliveryUrl = await this.generateSignedDeliveryUrl(
        env,
        publicId,
        booking.poster_version || null,
        'png'
      );

      if (signedDeliveryUrl) {
        const cdnRes = await fetch(signedDeliveryUrl);
        if (cdnRes.ok) {
          return cdnRes;
        }
      }
    } catch (e) {
      console.warn('[Cloudinary] Signed delivery URL fetch warning:', e);
    }

    // Method 2: Fetch via authenticated API with Basic Auth
    try {
      const basicAuth = btoa(`${apiKey}:${apiSecret}`);
      const cleanId = publicId.replace(/\.[^/.]+$/, '');
      const downloadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/download?public_id=${encodeURIComponent(cleanId)}&format=png`;

      const apiRes = await fetch(downloadUrl, {
        headers: {
          'Authorization': `Basic ${basicAuth}`
        }
      });

      if (apiRes.ok) {
        return apiRes;
      }
    } catch (apiErr) {
      console.warn('[Cloudinary] Authenticated download API warning:', apiErr);
    }

    // Method 3: If booking has secure_url, try direct fetch
    const secureUrl = booking.poster_secure_url || (booking.poster_url && booking.poster_url.startsWith('http') ? booking.poster_url : null);
    if (secureUrl && secureUrl.startsWith('http')) {
      try {
        const directRes = await fetch(secureUrl);
        if (directRes.ok) {
          return directRes;
        }
      } catch (err) {
        console.warn('[Cloudinary] Direct secure_url fetch error:', err);
      }
    }

    return null;
  }

  static async getPrivateReferenceStream(env, image) {
    const cloudName = env.CLOUDINARY_CLOUD_NAME;
    const apiKey = env.CLOUDINARY_API_KEY;
    const apiSecret = env.CLOUDINARY_API_SECRET;
    if (!image?.cloudinary_public_id || [cloudName, apiKey, apiSecret].some(value => this.isPlaceholder(value))) return null;
    const signedUrl = await this.generateSignedDeliveryUrl(env, image.cloudinary_public_id, image.asset_version, image.image_format || 'jpg');
    if (signedUrl) {
      const signedResponse = await fetch(signedUrl);
      if (signedResponse.ok) return signedResponse;
    }
    const basicAuth = btoa(`${apiKey}:${apiSecret}`);
    const cleanId = image.cloudinary_public_id.replace(/\.[^/.]+$/, '');
    const downloadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/image/download?public_id=${encodeURIComponent(cleanId)}&format=${encodeURIComponent(image.image_format || 'jpg')}`;
    const response = await fetch(downloadUrl, { headers: { Authorization: `Basic ${basicAuth}` } });
    return response.ok ? response : null;
  }
}
