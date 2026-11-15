import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// A simple photo editor shown before an upload: drag to move, zoom with the slider or mouse wheel,
// and pick a shape. "Use this photo" returns the cropped picture as a new file.
const SHAPES = [
  { id: 'original', label: 'Original', ratio: null },
  { id: 'square', label: 'Square', ratio: 1 },
  { id: 'portrait', label: 'Portrait', ratio: 4 / 5 },
  { id: 'wide', label: 'Wide', ratio: 3 / 2 },
];
const MAX_OUTPUT = 2000;

// offerCutout: show the "Remove the background" switch (off by default). The homepage showcase
// candles always have their background removed, so they don't show it.
export default function ImageCropper({ file, defaultShape = 'original', offerCutout = false, onDone, onCancel }) {
  const [img, setImg] = useState(null);
  const [cutout, setCutout] = useState(false);
  const [shape, setShape] = useState(defaultShape);
  const [zoom, setZoom] = useState(1);
  const [pos, setPos] = useState(null); // null: centred
  const drag = useRef(null);
  const frameW = Math.min(560, window.innerWidth - 64);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setImg(image);
    image.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  if (!img) return null;
  const ratio = SHAPES.find((s) => s.id === shape).ratio || img.width / img.height;
  const frameH = Math.round(Math.min(frameW / ratio, window.innerHeight * 0.55));
  const fw = Math.round(frameH * ratio);
  // The photo always covers the frame; zoom makes it bigger.
  const scale = Math.max(fw / img.width, frameH / img.height) * zoom;
  const w = img.width * scale;
  const h = img.height * scale;
  const clamp = (p) => ({ x: Math.min(0, Math.max(fw - w, p.x)), y: Math.min(0, Math.max(frameH - h, p.y)) });
  const at = clamp(pos || { x: (fw - w) / 2, y: (frameH - h) / 2 });

  const start = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, from: at };
  };
  const move = (e) => {
    if (!drag.current?.from) return;
    setPos(clamp({ x: drag.current.from.x + e.clientX - drag.current.x, y: drag.current.from.y + e.clientY - drag.current.y }));
  };
  const end = () => { if (drag.current) drag.current.from = null; };
  const setZoomKeepCentre = (z) => {
    const next = Math.min(4, Math.max(1, z));
    const k = next / zoom;
    const cx = fw / 2;
    const cy = frameH / 2;
    setPos({ x: cx - (cx - at.x) * k, y: cy - (cy - at.y) * k });
    setZoom(next);
  };

  const save = () => {
    const sx = -at.x / scale;
    const sy = -at.y / scale;
    const sw = fw / scale;
    const sh = frameH / scale;
    const out = Math.min(1, MAX_OUTPUT / Math.max(sw, sh));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * out);
    canvas.height = Math.round(sh * out);
    canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    // Keep transparency for PNG/WebP pictures; photos become JPEG to stay small.
    const type = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png';
    canvas.toBlob((blob) => onDone(new File([blob], file.name.replace(/\.[^.]+$/, type === 'image/png' ? '.png' : '.jpg'), { type }), { removeBackground: cutout }), type, 0.9);
  };

  return createPortal(
    <div className="cropper-backdrop" role="dialog" aria-modal="true" aria-label="Adjust photo">
      <div className="cropper">
        <header>
          <h3>Adjust your photo</h3>
          <p>Drag the photo to move it. Use the slider to zoom in.</p>
        </header>
        <div className="cropper-shapes" role="group" aria-label="Shape">
          {SHAPES.map((s) => (
            <button key={s.id} type="button" aria-pressed={shape === s.id} onClick={() => { setShape(s.id); setZoom(1); setPos(null); }}>{s.label}</button>
          ))}
        </div>
        <div
          className="cropper-frame"
          style={{ width: fw, height: frameH }}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerCancel={end}
          onWheel={(e) => setZoomKeepCentre(zoom - e.deltaY / 500)}
        >
          <img src={img.src} alt="" draggable={false} style={{ width: w, height: h, transform: `translate(${at.x}px, ${at.y}px)` }} />
          <span className="cropper-grid" aria-hidden="true" />
        </div>
        <label className="cropper-zoom">
          <span>Zoom</span>
          <input type="range" min="1" max="4" step="0.01" value={zoom} onChange={(e) => setZoomKeepCentre(Number(e.target.value))} />
        </label>
        {offerCutout && (
          <label className="admin-switch cropper-cutout">
            <input type="checkbox" checked={cutout} onChange={(e) => setCutout(e.target.checked)} />
            <span>Remove the background <small>(good for product or ingredient photos; leave off for scenes and lifestyle photos)</small></span>
          </label>
        )}
        <div className="admin-actions">
          <button type="button" className="button button-primary button-small" onClick={save}>Use this photo</button>
          <button type="button" className="link-button" onClick={onCancel}>Cancel</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

// For upload buttons: opens the editor for a file and resolves with { file, removeBackground } (or null if cancelled).
export function useCropper() {
  const [job, setJob] = useState(null);
  const edit = (file, defaultShape, { offerCutout = false } = {}) => new Promise((resolve) => setJob({ file, defaultShape, offerCutout, resolve }));
  const modal = job && (
    <ImageCropper
      file={job.file}
      defaultShape={job.defaultShape}
      offerCutout={job.offerCutout}
      onDone={(f, opts) => { job.resolve({ file: f, ...opts }); setJob(null); }}
      onCancel={() => { job.resolve(null); setJob(null); }}
    />
  );
  return { edit, modal };
}
