import { useEffect, useState } from 'react';
import { getAdminProducts, uploadImage } from '../lib/adminApi.js';
import { cutOut } from '../lib/removeBackground.js';
import { useCropper } from './ImageCropper.jsx';
// The theme's own ingredient drawings and label notes, so the preview here matches the homepage.
import { artFor, noteKind } from '../../../theme/assets/js/theme/global/pinktomato-notes.js';
import CUTOUTS, { LABEL_NOTES } from '../../../theme/assets/js/theme/global/pinktomato-cutouts.js';
import { ChevronDown, ImageIcon, PlusIcon, TrashIcon } from '../Icons.jsx';

const MAX = 5;
// Warm shades that suit the site, plus "Automatic" (the site picks).
const SWATCHES = [
  ['Automatic', ''], ['Amber', '#e89650'], ['Tomato rose', '#c8474f'], ['Caramel', '#d6966e'], ['Honey', '#ecba78'],
  ['Blush', '#f0aaa0'], ['Lavender', '#a98bd0'], ['Sage', '#8fae7a'], ['Ocean', '#6fa3c4'],
];

function ColorPick({ value, onChange }) {
  return (
    <div className="form-field">
      <span className="form-field-title">Background colour</span>
      <div className="hero-swatches">
        {SWATCHES.map(([name, hex]) => (
          <button key={name} type="button" title={name} aria-label={name} aria-pressed={(value || '') === hex}
            className={`hero-swatch ${hex ? '' : 'is-auto'}`} style={hex ? { background: hex } : undefined} onClick={() => onChange(hex)}>
            {hex ? '' : 'Auto'}
          </button>
        ))}
        <label className="hero-swatch is-custom" title="Pick any colour">
          <input type="color" value={value || '#e89650'} onChange={(e) => onChange(e.target.value)} aria-label="Pick any colour" />
          <span>Custom</span>
        </label>
      </div>
      <small className="content-hint">The glow behind this candle on the homepage. "Auto" uses the site's warm shades in turn.</small>
    </div>
  );
}
const splitNotes = (text) => text.split(',').map((n) => n.trim()).filter(Boolean);

// Uploads a photo with its background removed (used for the candle and for ingredient pictures).
function CutoutUpload({ label, onDone }) {
  const [step, setStep] = useState('');
  const [error, setError] = useState('');
  const cropper = useCropper();
  const pick = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    setError('');
    try {
      // Crop and zoom first, then remove the background from the adjusted photo.
      // Showcase candles always have their background removed (no switch here).
      const choice = await cropper.edit(file, 'original');
      if (!choice) return;
      const cut = await cutOut(choice.file, setStep);
      setStep('Uploading…');
      onDone(await uploadImage(cut, true));
    } catch (err) {
      setError(err.message || 'The background could not be removed. Please try another photo.');
    }
    setStep('');
  };
  return (
    <>
      <label className={`content-tool content-upload ${step ? 'is-busy' : ''}`}>
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" disabled={Boolean(step)} onChange={pick} />
        <ImageIcon size={14} /> {step || label}
      </label>
      {error && <p className="form-message error" role="alert">{error}</p>}
      {cropper.modal}
    </>
  );
}

function NotesPreview({ notes }) {
  const art = notes.length ? artFor(notes) : [];
  const unknown = notes.filter((n) => !noteKind(n));
  return (
    <div className="hero-notes-preview">
      {/* Drawings come from the theme's own library (trusted markup, not user input). */}
      {art.map((svg, i) => <span key={i} className="hero-note-art" dangerouslySetInnerHTML={{ __html: svg }} />)}
      {unknown.length > 0 && <small>No drawing yet for: {unknown.join(', ')}. Upload a picture below if you want one.</small>}
    </div>
  );
}

function CandleRow({ slide, index, count, products, onChange, onRemove, onMove }) {
  const last = count === 1;
  const product = products.find((p) => p.id === slide.id);
  const [notesText, setNotesText] = useState((slide.notes || []).join(', '));
  const set = (patch) => onChange({ ...slide, ...patch });
  const builtIn = CUTOUTS.includes(slide.id);
  return (
    <li className="hero-candle">
      <div className="content-order">
        <button type="button" aria-label="Move up" disabled={index === 0} onClick={() => onMove(index, index - 1)}><ChevronDown size={16} /></button>
        <button type="button" aria-label="Move down" disabled={index === count - 1} onClick={() => onMove(index, index + 1)}><ChevronDown size={16} /></button>
      </div>
      <div className="hero-candle-photo">
        {slide.cutout ? <img src={slide.cutout} alt="" /> : product?.images?.[0] ? <img src={product.images[0]} alt="" className="is-photo" /> : <span />}
        <small>{slide.cutout ? 'Your cut-out photo' : builtIn ? 'Built-in cut-out' : 'Photo shown in an arch'}</small>
        <CutoutUpload label={slide.cutout || builtIn ? 'Replace photo' : 'Upload photo'} onDone={(cutout) => set({ cutout })} />
        {slide.cutout && <button type="button" className="link-button" onClick={() => set({ cutout: '' })}>Use the {builtIn ? 'built-in cut-out' : 'product photo'}</button>}
      </div>
      <div className="hero-candle-main">
        <label className="form-field">
          <span className="form-field-title">Candle</span>
          <select className="form-input form-select" value={slide.id || ''} onChange={(e) => {
            const id = Number(e.target.value);
            const notes = LABEL_NOTES[id] || [];
            setNotesText(notes.join(', '));
            set({ id, cutout: '', notes, images: [] });
          }}
          >
            <option value="">Choose a candle…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}{p.is_visible ? '' : ' (hidden)'}</option>)}
          </select>
        </label>
        <label className="form-field">
          <span className="form-field-title">Scent notes (separate with commas)</span>
          <input
            className="form-input"
            placeholder="e.g. Taro, Black Tea, Heavy Milk"
            value={notesText}
            onChange={(e) => { setNotesText(e.target.value); set({ notes: splitNotes(e.target.value) }); }}
          />
          <small className="content-hint">Each note becomes a floating ingredient, like taro, rose, apple or bergamot. They also show as little tags under the candle's name.</small>
        </label>
        <NotesPreview notes={slide.notes || []} />
        <ColorPick value={slide.color || ''} onChange={(color) => set({ color })} />
        <div className="form-field">
          <span className="form-field-title">Your own ingredient pictures (optional, up to 4)</span>
          <div className="hero-ingredients">
            {(slide.images || []).map((src) => (
              <span key={src} className="hero-ingredient">
                <img src={src} alt="" />
                <button type="button" aria-label="Remove picture" onClick={() => set({ images: slide.images.filter((x) => x !== src) })}>×</button>
              </span>
            ))}
            {(slide.images || []).length < 4 && <CutoutUpload label="Add ingredient picture" onDone={(src) => set({ images: [...(slide.images || []), src] })} />}
          </div>
          <small className="content-hint">The background is removed automatically. These float alongside the drawn ingredients.</small>
        </div>
      </div>
      <button type="button" className="content-tool is-danger hero-candle-remove" disabled={last} title={last ? 'The hero needs at least one candle' : undefined} onClick={onRemove}><TrashIcon size={14} /> Remove</button>
    </li>
  );
}

// The candles shown in the homepage hero, in order.
export default function HeroCandles({ slides, onChange }) {
  const [products, setProducts] = useState(null);
  useEffect(() => { getAdminProducts().then(setProducts).catch(() => setProducts([])); }, []);
  if (!products) return <p className="content-hint">Loading candles…</p>;

  const visible = products.filter((p) => p.is_visible);
  const startList = () => onChange(visible.slice(0, MAX).map((p) => ({ id: p.id, cutout: '', notes: LABEL_NOTES[p.id] || [], images: [] })));
  const move = (from, to) => { const next = [...slides]; next.splice(to, 0, next.splice(from, 1)[0]); onChange(next); };

  if (!slides.length) {
    return (
      <div className="hero-candles-empty">
        <p>The hero shows your newest five candles. Choose your own to set their photos, scent notes and ingredients.</p>
        <button type="button" className="button button-primary button-small" onClick={startList}>Choose the hero candles</button>
      </div>
    );
  }
  return (
    <>
      <ul className="hero-candles">
        {slides.map((s, i) => (
          <CandleRow
            key={`${i}-${s.id}`}
            slide={s}
            index={i}
            count={slides.length}
            products={products}
            onMove={move}
            onRemove={() => onChange(slides.filter((_, n) => n !== i))}
            onChange={(next) => onChange(slides.map((x, n) => (n === i ? next : x)))}
          />
        ))}
      </ul>
      <div className="hero-candles-foot">
        <span className="content-count"><span />{slides.length} of {MAX} candles (at least 1)</span>
        <button type="button" className="content-tool" disabled={slides.length >= MAX} onClick={() => onChange([...slides, { id: 0, cutout: '', notes: [], images: [] }])}>
          <PlusIcon size={14} /> {slides.length >= MAX ? 'Five is the most' : 'Add a candle'}
        </button>
      </div>
      <button type="button" className="link-button" onClick={() => onChange([])}>Go back to the newest five automatically</button>
    </>
  );
}
