// Removes a photo's background in the browser, then trims the empty space around the subject.
// Uses @imgly/background-removal (AGPL-3.0), loaded only when an admin uploads a hero photo (its own
// chunk of the admin; the store's pages never load it). The first use downloads its model (about 40 MB)
// from IMG.LY's servers, then the browser caches it.
let lib = null;

async function load() {
  if (!lib) lib = import('@imgly/background-removal');
  return lib;
}

// Crop to the visible pixels and limit the size, so the file is small and the candle sits neatly.
async function trim(blob, max = 1000) {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0);
  const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let top = height, left = width, right = 0, bottom = 0;
  for (let y = 0; y < height; y += 2) {
    for (let x = 0; x < width; x += 2) {
      if (data[(y * width + x) * 4 + 3] > 12) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }
  if (right <= left || bottom <= top) throw new Error('Nothing was left after removing the background. Try a photo where the product stands out more.');
  const w = right - left + 1;
  const h = bottom - top + 1;
  const scale = Math.min(1, max / Math.max(w, h));
  const out = document.createElement('canvas');
  out.width = Math.round(w * scale);
  out.height = Math.round(h * scale);
  out.getContext('2d').drawImage(canvas, left, top, w, h, 0, 0, out.width, out.height);
  return new Promise((resolve) => out.toBlob(resolve, 'image/webp', 0.88));
}

// file: a photo the admin picked. onStep: short status messages for the button.
export async function cutOut(file, onStep = () => {}) {
  onStep('Loading the background remover…');
  const { removeBackground } = await load();
  onStep('Removing the background…');
  const blob = await removeBackground(file, {
    model: 'medium',
    output: { format: 'image/png' },
    progress: (key, current, total) => {
      if (String(key).startsWith('fetch') && total) onStep(`Downloading the remover (first time only) ${Math.round((current / total) * 100)}%`);
    },
  });
  onStep('Tidying the edges…');
  const trimmed = await trim(blob);
  return new File([trimmed], `${file.name.replace(/\.[^.]+$/, '')}-cutout.webp`, { type: 'image/webp' });
}
