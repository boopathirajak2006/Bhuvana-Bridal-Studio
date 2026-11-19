import { jsonResponse, errorResponse } from '../utils/response.js';

export async function handlePublicContent(request, env) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Content database unavailable', 503, 'SERVICE_UNAVAILABLE');
    const result = await env.DB.prepare('SELECT content_key, content_value FROM studio_content').all();
    return jsonResponse(request, env, { success: true, content: Object.fromEntries((result.results || []).map(row => [row.content_key, row.content_value])) }, 200, { 'Cache-Control': 'public, max-age=60' });
  } catch (err) {
    console.error('[Content: Public]', err);
    return errorResponse(request, env, 'Site content is unavailable', 500, 'INTERNAL_ERROR');
  }
}

export async function handleOwnerContent(request, env, auth) {
  try {
    if (!env.DB) return errorResponse(request, env, 'Content database unavailable', 503, 'SERVICE_UNAVAILABLE');
    if (request.method === 'GET') {
      const result = await env.DB.prepare('SELECT content_key, content_value, updated_at FROM studio_content ORDER BY content_key').all();
      return jsonResponse(request, env, { success: true, content: result.results || [] }, 200, { 'Cache-Control': 'private, no-store' });
    }
    const { key, value } = await request.json();
    if (typeof key !== 'string' || !/^[a-z0-9][a-z0-9._-]{0,99}$/i.test(key) || typeof value !== 'string' || value.length > 2000) {
      return errorResponse(request, env, 'Content key or value is invalid', 400, 'INVALID_CONTENT');
    }
    await env.DB.prepare(`INSERT INTO studio_content(content_key, content_value, updated_at) VALUES(?, ?, datetime('now'))
      ON CONFLICT(content_key) DO UPDATE SET content_value=excluded.content_value, updated_at=datetime('now')`).bind(key, value).run();
    return jsonResponse(request, env, { success: true, key, value });
  } catch (err) {
    console.error('[Content: Owner]', err);
    return errorResponse(request, env, 'Content could not be saved', 500, 'SAVE_FAILED');
  }
}
