import { createContext, useContext, useState } from 'react';

// Lets a section tell the preview which part of the page it edits, so the preview scrolls there.
export const PreviewFocus = createContext(() => {});
import { uploadImage } from '../lib/adminApi.js';
import { useCropper } from './ImageCropper.jsx';
import { cutOut } from '../lib/removeBackground.js';
import { ChevronDown, ImageIcon, PencilIcon, PlusIcon, TrashIcon } from '../Icons.jsx';

// collapsible: the section folds away to just its title (one click to open), so long pages stay short.
export function Section({ Icon, title, intro, shown, onToggle, children, collapsible = false, defaultOpen = false, previewKey }) {
  const [open, setOpen] = useState(defaultOpen || !collapsible);
  const focusPreview = useContext(PreviewFocus);
  const point = () => { if (previewKey) focusPreview(previewKey); };
  const state = onToggle && (
    <div className="content-row-tools">
      <span className={`content-state ${shown ? 'is-on' : ''}`}>{shown ? 'On the site' : 'Hidden'}</span>
      <button type="button" className="content-tool" onClick={(e) => { e.stopPropagation(); onToggle(); }}>{shown ? 'Hide from site' : 'Show on site'}</button>
    </div>
  );
  if (collapsible) {
    return (
      <section className={`content-section is-collapsible ${open ? 'is-open' : ''}`} onFocusCapture={point}>
        {/* The whole header strip opens and closes the section (not just the arrow). */}
        <header className="content-section-head" onClick={(e) => { if (e.target.closest('.content-row-tools')) return; setOpen((o) => !o); point(); }}>
          <button type="button" className="content-section-toggle" aria-expanded={open} onClick={(e) => e.stopPropagation() || (setOpen((o) => !o), point())}>
            <span className="content-section-chevron" aria-hidden="true">▸</span>
            <span>
              <h3>{Icon && <Icon size={18} />} {title}</h3>
              {intro && <p>{intro}</p>}
            </span>
          </button>
          {state}
        </header>
        {open && <div className="content-section-body">{children}</div>}
      </section>
    );
  }
  return (
    <section className="content-section" onFocusCapture={point}>
      <header>
        <div>
          <h3>{Icon && <Icon size={18} />} {title}</h3>
          {intro && <p>{intro}</p>}
        </div>
        {state}
      </header>
      {children}
    </section>
  );
}

export function Text({ label, value, onChange, rows, hint }) {
  return (
    <label className="form-field">
      <span className="form-field-title">{label}</span>
      {rows ? (
        <textarea className="form-input" rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
      ) : (
        <input className="form-input" value={value} onChange={(e) => onChange(e.target.value)} />
      )}
      {hint && <small className="content-hint">{hint}</small>}
    </label>
  );
}

const move = (list, from, to) => {
  const next = [...list];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
};

export function OrderButtons({ index, count, onMove, label }) {
  return (
    <div className="content-order">
      <button type="button" aria-label={`Move ${label} up`} disabled={index === 0} onClick={() => onMove(index, index - 1)}><ChevronDown size={16} /></button>
      <button type="button" aria-label={`Move ${label} down`} disabled={index === count - 1} onClick={() => onMove(index, index + 1)}><ChevronDown size={16} /></button>
    </div>
  );
}

// The rotating strip at the very top of every page.
export function Messages({ items, onChange }) {
  const [editing, setEditing] = useState(null);
  const [text, setText] = useState('');
  const showing = items.filter((m) => m.visible).length;

  const patch = (i, change) => onChange(items.map((m, n) => (n === i ? { ...m, ...change } : m)));
  const add = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onChange([...items, { text: text.trim(), visible: true }]);
    setText('');
  };

  return (
    <>
      <p className="content-count"><span />{showing} of {items.length} showing</p>
      <ul className="content-rows">
        {items.map((m, i) => (
          <li key={i}>
            <OrderButtons index={i} count={items.length} label={`message ${i + 1}`} onMove={(a, b) => { setEditing(null); onChange(move(items, a, b)); }} />
            <div className="content-row-main">
              {editing === i ? (
                <input
                  className="form-input"
                  aria-label={`Message ${i + 1}`}
                  autoFocus
                  value={m.text}
                  onChange={(e) => patch(i, { text: e.target.value })}
                  onBlur={() => setEditing(null)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), setEditing(null))}
                />
              ) : (
                <strong>{m.text}</strong>
              )}
              <small>Message {i + 1} of {items.length}</small>
            </div>
            <div className="content-row-tools">
              <span className={`content-state ${m.visible ? 'is-on' : ''}`}>{m.visible ? 'Showing' : 'Hidden'}</span>
              <button type="button" className="content-tool" onClick={() => patch(i, { visible: !m.visible })}>{m.visible ? 'Hide' : 'Show'}</button>
              <button type="button" className="content-tool" onClick={() => setEditing(i)}><PencilIcon size={14} /> Edit</button>
              <button type="button" className="content-tool is-danger" onClick={() => { setEditing(null); onChange(items.filter((_, n) => n !== i)); }}><TrashIcon size={14} /> Delete</button>
            </div>
          </li>
        ))}
      </ul>
      <form className="content-add" onSubmit={add}>
        <input className="form-input" aria-label="New message" placeholder="New message, e.g. Hand-poured in North Dakota" value={text} onChange={(e) => setText(e.target.value)} />
        <button className="button button-primary button-small" type="submit" disabled={!text.trim()}><PlusIcon size={16} /> Add message</button>
      </form>
    </>
  );
}

// Every photo opens the crop & zoom editor first (shape: the editor's starting shape).
export function ImageUpload({ label = 'Upload photo', multiple, onUploaded, keep = false, shape = 'original' }) {
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('');
  const [error, setError] = useState('');
  const cropper = useCropper();

  const onFiles = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    setError('');
    setBusy(true);
    try {
      for (const file of files) {
        const choice = await cropper.edit(file, shape, { offerCutout: true });
        if (!choice) continue;
        // The admin chose to remove the background: do it before uploading.
        const ready = choice.removeBackground ? await cutOut(choice.file, setStep) : choice.file;
        setStep('Uploading…');
        onUploaded(await uploadImage(ready, keep));
      }
    } catch (err) {
      setError(err.message);
    }
    setStep('');
    setBusy(false);
  };

  return (
    <>
      <label className={`content-tool content-upload ${busy ? 'is-busy' : ''}`}>
        <input className="sr-only" type="file" accept="image/jpeg,image/png,image/webp" multiple={multiple} disabled={busy} onChange={onFiles} />
        <ImageIcon size={14} /> {busy ? step || 'Adjust your photo…' : label}
      </label>
      {error && <p className="form-message error" role="alert">{error}</p>}
      {cropper.modal}
    </>
  );
}

// A fixed set of photos, such as the four tiles at the top of the homepage.
export function PhotoSlots({ images, labels, onChange }) {
  return (
    <div className="content-photos">
      {labels.map((label, i) => (
        <div key={label} className="content-photo">
          <img src={images[i]} alt="" />
          <span>{label}</span>
          <ImageUpload label="Replace" keep onUploaded={(url) => onChange(images.map((src, n) => (n === i ? url : src)))} />
        </div>
      ))}
    </div>
  );
}

// A fixed number of title-and-text blocks.
export function Cards({ items, onChange, label }) {
  const patch = (i, change) => onChange(items.map((c, n) => (n === i ? { ...c, ...change } : c)));
  return (
    <div className="content-cards">
      {items.map((c, i) => (
        <fieldset key={i}>
          <legend>{label} {i + 1}</legend>
          <Text label="Title" value={c.title} onChange={(title) => patch(i, { title })} />
          <Text label="Text" rows={2} value={c.text} onChange={(text) => patch(i, { text })} />
        </fieldset>
      ))}
    </div>
  );
}

// Headed blocks of text, such as the Shipping & Returns policy.
export function PolicySections({ sections, onChange }) {
  const patch = (i, change) => onChange(sections.map((s, n) => (n === i ? { ...s, ...change } : s)));
  return (
    <>
      <div className="content-cards is-wide">
        {sections.map((s, i) => (
          <fieldset key={i}>
            <legend>Section {i + 1}</legend>
            <Text label="Heading" value={s.heading} onChange={(heading) => patch(i, { heading })} />
            <Text label="Text" rows={8} value={s.body} onChange={(body) => patch(i, { body })} hint="Leave a blank line to start a new paragraph." />
            <button type="button" className="content-tool is-danger" onClick={() => onChange(sections.filter((_, n) => n !== i))}><TrashIcon size={14} /> Delete section</button>
          </fieldset>
        ))}
      </div>
      <button type="button" className="content-tool" onClick={() => onChange([...sections, { heading: 'New section', body: '' }])}><PlusIcon size={14} /> Add section</button>
    </>
  );
}
