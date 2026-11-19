import { jsonResponse, errorResponse } from '../utils/response.js';
import { CloudinaryService } from '../services/cloudinary.js';

const VALID_CATEGORIES = new Set(['bridal-beauty', 'designer-blouse']);

export async function handlePublicGallery(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const category = new URL(request.url).searchParams.get('category');
    if (category && !VALID_CATEGORIES.has(category)) return errorResponse(request, env, 'Invalid gallery category', 400, 'INVALID_CATEGORY');
    const stmt = category
      ? env.DB.prepare('SELECT category, slot, title, image_url FROM studio_gallery WHERE category = ? ORDER BY slot').bind(category)
      : env.DB.prepare('SELECT category, slot, title, image_url FROM studio_gallery ORDER BY category, slot');
    const result = await stmt.all();
    return jsonResponse(request, env, { success: true, photos: result.results || [] }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch (err) {
    console.error('[Gallery: PublicList]', err);
    return errorResponse(request, env, 'Gallery is unavailable', 500, 'INTERNAL_ERROR');
  }
}

export async function handleOwnerGalleryList(request, env) {
  if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
  const result = await env.DB.prepare('SELECT category, slot, title, image_url, updated_at FROM studio_gallery ORDER BY category, slot').all();
  return jsonResponse(request, env, { success: true, photos: result.results || [] }, 200, { 'Cache-Control': 'private, no-store' });
}

export async function handleOwnerGalleryUpload(request, env, auth) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const form = await request.formData();
    const category = form.get('category');
    const slot = Number(form.get('slot'));
    const title = String(form.get('title') || '').trim().slice(0, 100);
    const file = form.get('photo');
    if (!VALID_CATEGORIES.has(category) || !Number.isInteger(slot) || slot < 1 || slot > 6 || !(file instanceof File)) {
      return errorResponse(request, env, 'Choose a valid category, slot, and image', 400, 'INVALID_PHOTO');
    }
    const maxBytes = Number(env.MAX_GALLERY_SIZE_BYTES || 5242880);
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size < 1 || file.size > maxBytes) {
      return errorResponse(request, env, `Photo must be an image smaller than ${maxBytes} bytes`, 400, 'INVALID_PHOTO');
    }
    const old = await env.DB.prepare('SELECT cloudinary_public_id FROM studio_gallery WHERE category = ? AND slot = ?').bind(category, slot).first();
    const asset = await CloudinaryService.uploadGalleryPhoto(env, category, slot, await file.arrayBuffer());
    await env.DB.prepare(`INSERT INTO studio_gallery (category, slot, title, image_url, cloudinary_public_id, updated_at)
      VALUES (?, ?, ?, ?, ?, datetime('now')) ON CONFLICT(category, slot) DO UPDATE SET
      title = excluded.title, image_url = excluded.image_url, cloudinary_public_id = excluded.cloudinary_public_id, updated_at = datetime('now')`)
      .bind(category, slot, title, asset.secure_url, asset.public_id).run();
    if (old?.cloudinary_public_id && old.cloudinary_public_id !== asset.public_id) {
      await CloudinaryService.deleteGalleryPhoto(env, old.cloudinary_public_id).catch(err => console.warn('[Gallery: old asset cleanup]', err));
    }
    return jsonResponse(request, env, { success: true, photo: { category, slot, title, image_url: asset.secure_url } }, 200, { 'Cache-Control': 'private, no-store' });
  } catch (err) {
    console.error('[Gallery: Upload]', err);
    return errorResponse(request, env, err.message || 'Photo upload failed', 500, 'UPLOAD_FAILED');
  }
}

export async function handleOwnerGalleryDelete(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const { category, slot } = await request.json();
    if (!VALID_CATEGORIES.has(category) || !Number.isInteger(slot) || slot < 1 || slot > 6) {
      return errorResponse(request, env, 'Choose a valid category and slot', 400, 'INVALID_SLOT');
    }
    const existing = await env.DB.prepare('SELECT cloudinary_public_id FROM studio_gallery WHERE category = ? AND slot = ?').bind(category, slot).first();
    if (existing?.cloudinary_public_id) await CloudinaryService.deleteGalleryPhoto(env, existing.cloudinary_public_id);
    await env.DB.prepare('DELETE FROM studio_gallery WHERE category = ? AND slot = ?').bind(category, slot).run();
    return jsonResponse(request, env, { success: true });
  } catch (err) {
    console.error('[Gallery: Delete]', err);
    return errorResponse(request, env, 'Photo could not be deleted', 500, 'DELETE_FAILED');
  }
}
