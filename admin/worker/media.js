// Photo uploads. BigCommerce adds product photos by fetching them from a web address and copying
// them into its own storage, so the Worker only needs to hold an upload briefly and serve it.
const TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_BYTES = 5 * 1024 * 1024;
const KEEP_SECONDS = 7 * 24 * 3600;

export async function saveUpload(request, env) {
  const form = await request.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') return { error: 'Please choose a photo.' };
  if (!TYPES[file.type]) return { error: 'Please choose a JPG, PNG or WebP photo.' };
  if (file.size > MAX_BYTES) return { error: 'That photo is over 5 MB. Please choose a smaller one.' };
  const id = `${crypto.randomUUID()}.${TYPES[file.type]}`;
  await env.STORE.put(`media:${id}`, await file.arrayBuffer(), { expirationTtl: KEEP_SECONDS, metadata: { type: file.type } });
  return { url: new URL(`/media/${id}`, request.url).toString() };
}

export async function serveUpload(env, id) {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(id)) return new Response('Not found', { status: 404 });
  const { value, metadata } = await env.STORE.getWithMetadata(`media:${id}`, { type: 'arrayBuffer' });
  if (!value) return new Response('Not found', { status: 404 });
  return new Response(value, { headers: { 'Content-Type': metadata?.type || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' } });
}
