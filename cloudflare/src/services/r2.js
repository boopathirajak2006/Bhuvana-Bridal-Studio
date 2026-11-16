/**
 * Bhuvana's Bridal & Tailoring Studio — Cloudflare Backend
 * Cloudflare R2 Private Image Storage Service
 */

export class R2Service {
  /**
   * Upload poster PNG image to private R2 bucket
   */
  static async uploadPoster(env, key, data, metadata = {}) {
    if (!env.POSTERS) {
      throw new Error('R2 bucket binding (POSTERS) is not configured');
    }

    const options = {
      httpMetadata: {
        contentType: 'image/png',
        cacheControl: 'private, max-age=86400'
      },
      customMetadata: {
        uploadedAt: new Date().toISOString(),
        ...metadata
      }
    };

    const object = await env.POSTERS.put(key, data, options);
    return object;
  }

  /**
   * Get poster object stream from private R2 bucket
   */
  static async getPoster(env, key) {
    if (!env.POSTERS) {
      throw new Error('R2 bucket binding (POSTERS) is not configured');
    }
    const object = await env.POSTERS.get(key);
    return object;
  }

  /**
   * Check if poster exists in R2
   */
  static async posterExists(env, key) {
    if (!env.POSTERS) return false;
    const head = await env.POSTERS.head(key);
    return Boolean(head);
  }

  /**
   * Delete poster from R2
   */
  static async deletePoster(env, key) {
    if (!env.POSTERS) return;
    await env.POSTERS.delete(key);
  }
}
