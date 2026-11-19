/**
 * Gallery Routes for Bhuvana's Bridal Studio
 * Cloudflare Worker Gallery API (Public viewing & Owner management)
 * 
 * Storage: Cloudinary exclusively (public CDN delivery)
 * Database: Cloudflare D1 exclusively
 */

import { jsonResponse, errorResponse } from '../utils/response.js';
import { CloudinaryService } from '../services/cloudinary.js';
import { D1Service } from '../services/d1.js';
import { GALLERY_CATEGORIES, DEFAULT_GALLERY_ITEMS } from '../data/gallery-seed.js';

/**
 * GET /api/gallery
 * Public endpoint to fetch active gallery photos across all 8 categories
 */
export async function handleGetPublicGallery(request, env) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;
    const studioOnly = url.searchParams.get('studioOnly') === 'true';
    const sampleOnly = url.searchParams.get('sampleOnly') === 'true';

    // 1. If D1 is configured, fetch authoritative items from D1
    if (env.DB) {
      try {
        const items = await D1Service.listGalleryItems(env, { category, studioOnly, sampleOnly });
        const stats = await D1Service.getGalleryCategoryStats(env);

        return jsonResponse(request, env, {
          success: true,
          categories: GALLERY_CATEGORIES,
          stats,
          total: items.length,
          items
        });
      } catch (dbErr) {
        console.warn('[Route: PublicGallery] D1 query warning, falling back to static seed:', dbErr);
      }
    }

    // 2. Graceful fallback to static master seed if D1 is offline or uninitialized
    let fallbackItems = [...DEFAULT_GALLERY_ITEMS];
    if (category && category !== 'all') {
      fallbackItems = fallbackItems.filter(i => i.category === category);
    }
    if (studioOnly) {
      fallbackItems = fallbackItems.filter(i => !i.isSample);
    } else if (sampleOnly) {
      fallbackItems = fallbackItems.filter(i => i.isSample);
    }

    return jsonResponse(request, env, {
      success: true,
      fallback: true,
      categories: GALLERY_CATEGORIES,
      total: fallbackItems.length,
      items: fallbackItems
    });
  } catch (err) {
    console.error('[Route: PublicGallery] Error:', err);
    return errorResponse(request, env, 'Failed to fetch gallery items', 500, 'INTERNAL_ERROR');
  }
}

/**
 * GET /api/admin/gallery
 * Protected endpoint for studio owner to view all photos, category stats & metadata
 */
export async function handleListAdminGallery(request, env, auth) {
  try {
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const url = new URL(request.url);
    const category = url.searchParams.get('category') || undefined;

    const items = await D1Service.listGalleryItems(env, { category });
    const stats = await D1Service.getGalleryCategoryStats(env);

    return jsonResponse(request, env, {
      success: true,
      categories: GALLERY_CATEGORIES,
      stats,
      total: items.length,
      items
    });
  } catch (err) {
    console.error('[Route: AdminListGallery] Error:', err);
    return errorResponse(request, env, 'Failed to list gallery items for admin', 500, 'INTERNAL_ERROR');
  }
}

/**
 * POST /api/admin/gallery
 * Protected endpoint for owner to add a new photo to any category (multipart/form-data or JSON)
 */
export async function handleAddGalleryPhoto(request, env, auth) {
  try {
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const contentType = request.headers.get('content-type') || '';
    let category, title, description, isSample = false, imageUrl, publicId;

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      category = (formData.get('category') || '').toString().trim();
      title = (formData.get('title') || '').toString().trim();
      description = (formData.get('description') || '').toString().trim();
      const isSampleStr = formData.get('isSample') || formData.get('is_sample');
      isSample = isSampleStr === 'true' || isSampleStr === '1';

      const file = formData.get('file') || formData.get('image');
      if (file && typeof file.arrayBuffer === 'function') {
        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength > 10 * 1024 * 1024) {
          return errorResponse(request, env, 'Image exceeds maximum permitted file size of 10MB', 400, 'FILE_TOO_LARGE');
        }

        const uploadRes = await CloudinaryService.uploadGalleryPhoto(
          env,
          category || 'bridal-makeup',
          arrayBuffer,
          file.name || 'gallery-photo.jpg',
          { title }
        );

        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
      } else {
        const providedUrl = formData.get('imageUrl') || formData.get('image_url');
        if (providedUrl) {
          imageUrl = providedUrl.toString().trim();
          publicId = (formData.get('publicId') || formData.get('public_id') || '').toString().trim() || null;
        }
      }
    } else if (contentType.includes('application/json')) {
      let body;
      try {
        body = await request.json();
      } catch {
        return errorResponse(request, env, 'Malformed JSON body', 400, 'INVALID_JSON');
      }

      category = (body.category || '').toString().trim();
      title = (body.title || '').toString().trim();
      description = (body.description || '').toString().trim();
      isSample = Boolean(body.isSample);

      if (body.base64Image) {
        const base64Data = body.base64Image.replace(/^data:image\/\w+;base64,/, '');
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const uploadRes = await CloudinaryService.uploadGalleryPhoto(
          env,
          category || 'bridal-makeup',
          bytes.buffer,
          body.fileName || 'gallery-photo.jpg',
          { title }
        );

        imageUrl = uploadRes.secure_url;
        publicId = uploadRes.public_id;
      } else if (body.imageUrl) {
        imageUrl = body.imageUrl;
        publicId = body.publicId || null;
      }
    } else {
      return errorResponse(request, env, 'Unsupported Content-Type. Use multipart/form-data or application/json', 415, 'UNSUPPORTED_MEDIA_TYPE');
    }

    if (!category) {
      return errorResponse(request, env, 'Category is required', 400, 'MISSING_CATEGORY');
    }

    const validCategory = GALLERY_CATEGORIES.some(c => c.id === category);
    if (!validCategory) {
      return errorResponse(request, env, `Invalid category: ${category}. Must be one of the 8 studio categories.`, 400, 'INVALID_CATEGORY');
    }

    if (!imageUrl) {
      return errorResponse(request, env, 'Valid photo file or imageUrl is required', 400, 'MISSING_IMAGE');
    }

    if (!title) {
      title = 'Studio Portfolio Look';
    }

    const newItem = await D1Service.createGalleryItem(env, {
      category,
      title,
      description,
      imageUrl,
      publicId,
      isSample
    });

    return jsonResponse(request, env, {
      success: true,
      message: 'Photo added to gallery portfolio successfully',
      item: newItem
    }, 201);
  } catch (err) {
    console.error('[Route: AddGalleryPhoto] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to add gallery photo', 500, 'INTERNAL_ERROR');
  }
}

/**
 * PUT /api/admin/gallery/:id
 * Protected endpoint for owner to replace an existing photo, update title/description or category
 */
export async function handleUpdateGalleryPhoto(request, env, auth, id) {
  try {
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const existing = await D1Service.getGalleryItemById(env, id);
    if (!existing) {
      return errorResponse(request, env, `Gallery item ${id} not found`, 404, 'NOT_FOUND');
    }

    const contentType = request.headers.get('content-type') || '';
    let category = existing.category;
    let title = existing.title;
    let description = existing.description;
    let imageUrl = existing.imageUrl;
    let publicId = existing.publicId;
    let isSample = existing.isSample;

    let hasNewImage = false;
    let newArrayBuffer = null;
    let newFileName = 'replaced-photo.jpg';

    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      if (formData.has('category')) category = formData.get('category').toString().trim();
      if (formData.has('title')) title = formData.get('title').toString().trim();
      if (formData.has('description')) description = formData.get('description').toString().trim();
      if (formData.has('isSample') || formData.has('is_sample')) {
        const sVal = formData.get('isSample') || formData.get('is_sample');
        isSample = sVal === 'true' || sVal === '1';
      }

      const file = formData.get('file') || formData.get('image');
      if (file && typeof file.arrayBuffer === 'function' && file.size > 0) {
        hasNewImage = true;
        newArrayBuffer = await file.arrayBuffer();
        newFileName = file.name || newFileName;
      } else if (formData.has('imageUrl') && formData.get('imageUrl')) {
        imageUrl = formData.get('imageUrl').toString().trim();
        if (formData.has('publicId')) publicId = formData.get('publicId').toString().trim();
        isSample = false;
      }
    } else if (contentType.includes('application/json')) {
      let body;
      try {
        body = await request.json();
      } catch {
        return errorResponse(request, env, 'Malformed JSON body', 400, 'INVALID_JSON');
      }

      if (body.category !== undefined) category = body.category.toString().trim();
      if (body.title !== undefined) title = body.title.toString().trim();
      if (body.description !== undefined) description = body.description.toString().trim();
      if (body.isSample !== undefined) isSample = Boolean(body.isSample);

      if (body.base64Image) {
        hasNewImage = true;
        const base64Data = body.base64Image.replace(/^data:image\/\w+;base64,/, '');
        const binaryString = atob(base64Data);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        newArrayBuffer = bytes.buffer;
        newFileName = body.fileName || newFileName;
      } else if (body.imageUrl) {
        imageUrl = body.imageUrl;
        if (body.publicId !== undefined) publicId = body.publicId;
        isSample = false;
      }
    }

    // If a new image binary was uploaded, upload to Cloudinary and clean up old Cloudinary asset
    if (hasNewImage && newArrayBuffer) {
      if (newArrayBuffer.byteLength > 10 * 1024 * 1024) {
        return errorResponse(request, env, 'Image exceeds maximum permitted file size of 10MB', 400, 'FILE_TOO_LARGE');
      }

      const uploadRes = await CloudinaryService.uploadGalleryPhoto(
        env,
        category,
        newArrayBuffer,
        newFileName,
        { title }
      );

      const oldPublicId = existing.publicId;
      // If previous photo was a Cloudinary asset, delete it to keep storage clean
      if (oldPublicId && oldPublicId !== uploadRes.public_id) {
        CloudinaryService.deleteGalleryPhoto(env, oldPublicId).catch(err => {
          console.warn('[Route: UpdateGalleryPhoto] Cleanup old image warning:', err);
        });
      }

      imageUrl = uploadRes.secure_url;
      publicId = uploadRes.public_id;
      isSample = false; // Replaced photo is now an authentic studio photo
    }

    const updated = await D1Service.updateGalleryItem(env, id, {
      category,
      title,
      description,
      imageUrl,
      publicId,
      isSample
    });

    return jsonResponse(request, env, {
      success: true,
      message: 'Gallery photo updated successfully',
      item: updated
    });
  } catch (err) {
    console.error('[Route: UpdateGalleryPhoto] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to update gallery photo', 500, 'INTERNAL_ERROR');
  }
}

/**
 * DELETE /api/admin/gallery/:id
 * Protected endpoint for owner to remove a photo from the portfolio
 */
export async function handleDeleteGalleryPhoto(request, env, auth, id) {
  try {
    if (!env.DB) {
      return errorResponse(request, env, 'D1 database service is not configured or unavailable', 503, 'SERVICE_UNAVAILABLE');
    }

    const existing = await D1Service.getGalleryItemById(env, id);
    if (!existing) {
      return errorResponse(request, env, `Gallery item ${id} not found`, 404, 'NOT_FOUND');
    }

    // Clean up from Cloudinary if stored there
    if (existing.publicId) {
      CloudinaryService.deleteGalleryPhoto(env, existing.publicId).catch(err => {
        console.warn('[Route: DeleteGalleryPhoto] Cloudinary cleanup warning:', err);
      });
    }

    await D1Service.deleteGalleryItem(env, id);

    return jsonResponse(request, env, {
      success: true,
      message: `Gallery photo "${existing.title}" removed successfully`,
      deletedId: id
    });
  } catch (err) {
    console.error('[Route: DeleteGalleryPhoto] Error:', err);
    return errorResponse(request, env, err.message || 'Failed to delete gallery photo', 500, 'INTERNAL_ERROR');
  }
}
