/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Cloudflare R2 Private Image Storage Service
 * Handles secure, private storage and streaming of booking poster PNGs,
 * customer reference uploads, and studio media assets.
 * 
 * ZERO CREDENTIALS EXPOSED TO FRONTEND:
 * All access to booking posters and private references is routed through
 * authenticated Cloudflare Worker streaming endpoints.
 */

export class R2Service {
  /**
   * Resolves the R2 bucket binding from Worker environment
   * Supports both env.BUCKET and env.POSTERS
   */
  static getBucket(env) {
    const bucket = env.BUCKET || env.POSTERS;
    if (!bucket) {
      throw new Error('Cloudflare R2 bucket binding (BUCKET or POSTERS) is not configured in Worker environment.');
    }
    return bucket;
  }

  /**
   * Constructs the canonical R2 object key for a booking poster
   * Format: posters/2026/<bookingRef>.png
   */
  static getPosterKey(bookingRef) {
    const cleanRef = String(bookingRef || '').trim();
    return `posters/2026/${cleanRef}.png`;
  }

  /**
   * Constructs the canonical R2 object key for customer reference images
   * Format: references/<bookingRef>/<filename>
   */
  static getReferenceKey(bookingRef, filename) {
    const cleanRef = String(bookingRef || '').trim();
    const cleanName = String(filename || 'ref.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
    return `references/${cleanRef}/${cleanName}`;
  }

  /**
   * Upload poster PNG image to private R2 bucket
   *
   * @param {object} env - Cloudflare Worker environment
   * @param {string} bookingRef - Booking reference (e.g. BBS-2026-8CDMHY)
   * @param {ArrayBuffer|Uint8Array} data - PNG image binary data
   * @param {object} metadata - Optional metadata (customerName, eventDate, etc.)
   * @returns {Promise<{ key: string, size: number, etag: string, uploadedAt: string }>}
   */
  static async uploadPoster(env, bookingRef, data, metadata = {}) {
    const bucket = this.getBucket(env);
    const key = this.getPosterKey(bookingRef);
    const nowIso = new Date().toISOString();

    const options = {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'private, no-transform, max-age=86400',
        contentDisposition: `inline; filename="${bookingRef}.png"`
      },
      customMetadata: {
        bookingRef: String(bookingRef),
        customerName: String(metadata.customerName || 'Valued Client'),
        eventDate: String(metadata.eventDate || ''),
        uploadedAt: nowIso
      }
    };

    const object = await bucket.put(key, data, options);

    return {
      key: object.key || key,
      size: object.size || (data.byteLength || 0),
      etag: object.httpEtag || '',
      uploadedAt: nowIso
    };
  }

  /**
   * Upload customer reference image to private R2 bucket
   */
  static async uploadReferenceImage(env, bookingRef, filename, data, contentType = 'image/jpeg') {
    const bucket = this.getBucket(env);
    const key = this.getReferenceKey(bookingRef, filename);
    const nowIso = new Date().toISOString();

    const options = {
      httpMetadata: {
        contentType: contentType || 'image/jpeg',
        cacheControl: 'private, no-transform, max-age=86400'
      },
      customMetadata: {
        bookingRef: String(bookingRef),
        uploadedAt: nowIso
      }
    };

    const object = await bucket.put(key, data, options);

    return {
      key: object.key || key,
      size: object.size || (data.byteLength || 0),
      etag: object.httpEtag || '',
      uploadedAt: nowIso
    };
  }

  /**
   * Retrieve poster object from R2 bucket
   * Supports direct key lookup or resolution from bookingRef
   *
   * @param {object} env
   * @param {string} keyOrRef
   * @returns {Promise<R2ObjectBody|null>}
   */
  static async getPoster(env, keyOrRef) {
    const bucket = this.getBucket(env);
    if (!keyOrRef) return null;

    // 1. Try key directly if it looks like a full path
    if (keyOrRef.includes('/')) {
      const obj = await bucket.get(keyOrRef);
      if (obj) return obj;
    }

    // 2. Try standard 2026 path: posters/2026/<ref>.png
    const standardKey = this.getPosterKey(keyOrRef);
    let obj = await bucket.get(standardKey);
    if (obj) return obj;

    // 3. Try legacy / flat path: posters/<ref>.png
    const flatKey = `posters/${keyOrRef}.png`;
    obj = await bucket.get(flatKey);
    if (obj) return obj;

    // 4. Try raw key without .png
    obj = await bucket.get(keyOrRef);
    return obj;
  }

  /**
   * Check if a poster exists in R2
   */
  static async posterExists(env, keyOrRef) {
    const bucket = this.getBucket(env);
    const key = keyOrRef.includes('/') ? keyOrRef : this.getPosterKey(keyOrRef);
    const head = await bucket.head(key);
    return Boolean(head);
  }

  /**
   * Delete poster from R2
   */
  static async deletePoster(env, keyOrRef) {
    const bucket = this.getBucket(env);
    const key = keyOrRef.includes('/') ? keyOrRef : this.getPosterKey(keyOrRef);
    await bucket.delete(key);
  }

  /**
   * List posters with optional prefix
   */
  static async listPosters(env, prefix = 'posters/') {
    const bucket = this.getBucket(env);
    return await bucket.list({ prefix, limit: 100 });
  }
}
