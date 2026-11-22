import { jsonResponse, errorResponse } from '../utils/response.js';
import { CloudinaryService } from '../services/cloudinary.js';

const GALLERY_CATEGORIES = {
  'bridal-beauty': new Set(['baby-shower', 'puberty-makeup', 'mehndi-design', 'wedding-makeup', 'party-makeup', 'engagement-makeup', 'reception-makeup', 'bridal-hairstyling', 'other-bridal']),
  'designer-blouse': new Set(['bridal-blouse', 'maggam-work', 'aari-work', 'embroidery', 'sleeve-designs', 'neck-designs', 'other-blouse'])
};
const validCategory = (category, subcategory) => GALLERY_CATEGORIES[category]?.has(subcategory);
const asPhoto = row => ({
  id: row.id,
  category: row.category,
  subcategory: row.subcategory,
  title: row.title,
  image_url: row.image_url,
  sort_order: Number(row.sort_order || 0),
  ...(row.updated_at ? { updated_at: row.updated_at } : {})
});

export async function handlePublicGallery(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const category = new URL(request.url).searchParams.get('category');
    if (category && !GALLERY_CATEGORIES[category]) return errorResponse(request, env, 'Invalid gallery category', 400, 'INVALID_CATEGORY');
    const stmt = category
      ? env.DB.prepare('SELECT id, category, subcategory, title, image_url, sort_order FROM studio_gallery WHERE category = ? ORDER BY subcategory, sort_order, created_at, id').bind(category)
      : env.DB.prepare('SELECT id, category, subcategory, title, image_url, sort_order FROM studio_gallery ORDER BY category, subcategory, sort_order, created_at, id');
    const result = await stmt.all();
    return jsonResponse(request, env, { success: true, photos: (result.results || []).map(asPhoto) }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch (err) {
    console.error('[Gallery: PublicList]', err);
    return errorResponse(request, env, 'Gallery is unavailable', 500, 'INTERNAL_ERROR');
  }
}

export async function handleOwnerGalleryList(request, env) {
  if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
  const result = await env.DB.prepare('SELECT id, category, subcategory, title, image_url, sort_order, updated_at FROM studio_gallery ORDER BY category, subcategory, sort_order, created_at, id').all();
  return jsonResponse(request, env, { success: true, photos: (result.results || []).map(asPhoto) }, 200, { 'Cache-Control': 'private, no-store' });
}

export async function handleOwnerGalleryUpload(request, env) {
  const uploadedAssets = [];
  try {
    if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const form = await request.formData();
    const category = String(form.get('category') || '');
    const subcategory = String(form.get('subcategory') || '');
    const files = form.getAll('photos').filter(file => file instanceof File && file.size > 0);
    if (!validCategory(category, subcategory) || files.length < 1 || files.length > 10) {
      return errorResponse(request, env, 'Choose a valid category and upload between 1 and 10 photos', 400, 'INVALID_PHOTOS');
    }
    const maxBytes = Number(env.MAX_GALLERY_SIZE_BYTES || 5242880);
    if (files.some(file => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > maxBytes)) {
      return errorResponse(request, env, `Each photo must be JPG, PNG, or WebP and smaller than ${maxBytes} bytes`, 400, 'INVALID_PHOTO');
    }

    const start = await env.DB.prepare('SELECT COALESCE(MAX(sort_order), 0) AS max_order FROM studio_gallery WHERE category = ? AND subcategory = ?').bind(category, subcategory).first();
    const created = [];
    for (const [index, file] of files.entries()) {
      const id = crypto.randomUUID();
      const title = String(form.get(`title-${index}`) || file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ')).trim().slice(0, 100);
      const asset = await CloudinaryService.uploadGalleryPhoto(env, category, subcategory, id, await file.arrayBuffer());
      uploadedAssets.push(asset.public_id);
      try {
        await env.DB.prepare(`INSERT INTO studio_gallery (id, category, subcategory, title, image_url, cloudinary_public_id, sort_order, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`)
          .bind(id, category, subcategory, title, asset.secure_url, asset.public_id, Number(start?.max_order || 0) + index + 1).run();
      } catch (err) {
        throw err;
      }
      created.push({ id, category, subcategory, title, image_url: asset.secure_url, sort_order: Number(start?.max_order || 0) + index + 1 });
    }
    return jsonResponse(request, env, { success: true, photos: created }, 201, { 'Cache-Control': 'private, no-store' });
  } catch (err) {
    await Promise.all(uploadedAssets.map(publicId => CloudinaryService.deleteGalleryPhoto(env, publicId).catch(cleanupError => {
      console.warn('[Gallery: Upload] Could not clean up an uploaded asset after the batch failed.', cleanupError);
    })));
    console.error('[Gallery: Upload]', err);
    return errorResponse(request, env, err.message || 'Photo upload failed', 500, 'UPLOAD_FAILED');
  }
}

export async function handleOwnerGalleryDelete(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const { photoIds } = await request.json();
    if (!Array.isArray(photoIds) || photoIds.length < 1 || photoIds.length > 10 || photoIds.some(id => typeof id !== 'string' || !/^[A-Za-z0-9-]{1,80}$/.test(id))) {
      return errorResponse(request, env, 'Select between 1 and 10 photos to delete', 400, 'INVALID_PHOTOS');
    }
    const uniqueIds = [...new Set(photoIds)];
    if (uniqueIds.length !== photoIds.length) return errorResponse(request, env, 'Duplicate photo selection', 400, 'INVALID_PHOTOS');
    const placeholders = uniqueIds.map(() => '?').join(',');
    const result = await env.DB.prepare(`SELECT id, cloudinary_public_id FROM studio_gallery WHERE id IN (${placeholders})`).bind(...uniqueIds).all();
    const found = result.results || [];
    if (found.length !== uniqueIds.length) return errorResponse(request, env, 'One or more selected photos could not be found', 404, 'NOT_FOUND');
    await env.DB.prepare(`DELETE FROM studio_gallery WHERE id IN (${placeholders})`).bind(...uniqueIds).run();
    const cloudinaryResults = await Promise.allSettled(found.map(row => row.cloudinary_public_id
      ? CloudinaryService.deleteGalleryPhoto(env, row.cloudinary_public_id)
      : Promise.resolve()));
    const failedAssets = cloudinaryResults.filter(result => result.status === 'rejected').length;
    if (failedAssets) console.warn(`[Gallery: Delete] ${failedAssets} Cloudinary asset(s) could not be cleaned up after deleting database records.`);
    return jsonResponse(request, env, { success: true, deleted: uniqueIds.length });
  } catch (err) {
    console.error('[Gallery: Delete]', err);
    return errorResponse(request, env, 'Photo could not be deleted', 500, 'DELETE_FAILED');
  }
}

export async function handleOwnerGalleryArrangement(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Gallery database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const { category, subcategory, photoIds } = await request.json();
    if (!validCategory(category, subcategory) || !Array.isArray(photoIds) || photoIds.length > 500 || photoIds.some(id => typeof id !== 'string')) {
      return errorResponse(request, env, 'Choose a valid category and photo order', 400, 'INVALID_ORDER');
    }
    const uniqueIds = [...new Set(photoIds)];
    if (uniqueIds.length !== photoIds.length) return errorResponse(request, env, 'Duplicate photos in order', 400, 'INVALID_ORDER');
    const current = await env.DB.prepare('SELECT id FROM studio_gallery WHERE category = ? AND subcategory = ? ORDER BY sort_order, created_at, id').bind(category, subcategory).all();
    const existingIds = (current.results || []).map(row => row.id);
    if (existingIds.length !== uniqueIds.length || existingIds.some(id => !uniqueIds.includes(id))) {
      return errorResponse(request, env, 'The photo list changed. Refresh and arrange again.', 409, 'STALE_ORDER');
    }
    const updates = uniqueIds.map((id, index) => env.DB.prepare('UPDATE studio_gallery SET sort_order = ?, updated_at = datetime(\'now\') WHERE id = ? AND category = ? AND subcategory = ?').bind(index + 1, id, category, subcategory));
    if (updates.length) await env.DB.batch(updates);
    return jsonResponse(request, env, { success: true, order: uniqueIds });
  } catch (err) {
    console.error('[Gallery: Arrangement]', err);
    return errorResponse(request, env, 'Photo order could not be saved', 500, 'ORDER_FAILED');
  }
}
