import { useEffect, useRef, useState } from 'react';
import { useSiteContent } from '../../context/SiteContentContext.jsx';
import { DEFAULT_CONTENT } from '../../data/siteContent.js';
import { saveContent } from '../../lib/adminApi.js';
import { EyeIcon, EyeOffIcon, FileIcon, GridIcon, ImageIcon, MegaphoneIcon, RefreshIcon, SaveIcon, TagIcon, UndoIcon } from '../Icons.jsx';
import { Cards, Messages, PhotoSlots, PolicySections, Section, Text } from './ContentFields.jsx';
import HomepageProducts from './HomepageProducts.jsx';
import ProductManager from './ProductManager.jsx';
import StorePreview from './StorePreview.jsx';
import { Filter } from './shared.jsx';

const CARDS = [
  { id: 'banners', label: 'Hero & Banners', text: 'Announcement bar, plus the heading and photos at the top of the homepage', Icon: MegaphoneIcon },
  { id: 'homepage', label: 'Homepage', text: 'Featured products and every section below the hero', Icon: GridIcon },
  { id: 'pages', label: 'Pages', text: 'Shipping & Returns, Contact Us, Blog and the footer', Icon: FileIcon },
  { id: 'products', label: 'Products', text: 'Names, descriptions, photos, sizes and prices', Icon: TagIcon },
];

const PAGES = [
  { value: 'shipping', label: 'Shipping & Returns', path: '/shipping-returns' },
  { value: 'contact', label: 'Contact Us', path: '/contact-us' },
  { value: 'blog', label: 'Blog', path: '/blog' },
  { value: 'footer', label: 'Footer', path: '/' },
];

const HERO_FIELDS = ['heroEyebrow', 'heroTitle', 'heroButton', 'heroImages'];
const HERO_PHOTOS = ['Large photo (with heading)', 'Small photo, left', 'Small photo, right', 'Wide photo'];
const pick = (source, fields) => Object.fromEntries(fields.map((f) => [f, source[f]]));
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function HeroBanners({ draft, edit }) {
  const home = draft.home;
  return (
    <>
      <Section Icon={MegaphoneIcon} title="Announcement bar" intro="Short messages that scroll along the strip at the very top of every page.">
        <Messages items={draft.announcement.items} onChange={(items) => edit('announcement', { items })} />
      </Section>
      <Section Icon={ImageIcon} title="Homepage hero" intro="The first thing shoppers see.">
        <Text label="Small heading" value={home.heroEyebrow} onChange={(heroEyebrow) => edit('home', { heroEyebrow }, 'heroEyebrow')} />
        <Text label="Main heading" value={home.heroTitle} onChange={(heroTitle) => edit('home', { heroTitle }, 'heroTitle')} />
        <Text label="Button text" value={home.heroButton} onChange={(heroButton) => edit('home', { heroButton }, 'heroButton')} />
        <PhotoSlots images={home.heroImages} labels={HERO_PHOTOS} onChange={(heroImages) => edit('home', { heroImages })} />
      </Section>
    </>
  );
}

function Homepage({ draft, edit, onProductsSaved }) {
  const home = draft.home;
  const text = (name) => (value) => edit('home', { [name]: value }, name);
  const toggle = (name) => () => edit('home', { [name]: !home[name] });
  return (
    <>
      <Section title="Featured products" intro="Shown on the homepage with a New badge, in this order. Up to 8.">
        <Text label="Small heading" value={home.productsEyebrow} onChange={text('productsEyebrow')} />
        <Text label="Heading" value={home.productsTitle} onChange={text('productsTitle')} />
        <HomepageProducts onSaved={onProductsSaved} />
      </Section>
      <Section title="Why Pink Tomato" intro="The four short facts under the hero." shown={home.showValueProps} onToggle={toggle('showValueProps')}>
        <Cards label="Fact" items={home.valueProps} onChange={(valueProps) => edit('home', { valueProps }, 'valueProps')} />
      </Section>
      <Section title="Mood finder" intro="Built from candles whose description has Mood and Scent Notes lines." shown={home.showMood} onToggle={toggle('showMood')}>
        <Text label="Small heading" value={home.moodEyebrow} onChange={text('moodEyebrow')} />
        <Text label="Heading" value={home.moodTitle} onChange={text('moodTitle')} />
      </Section>
      <Section title="How it's made" shown={home.showProcess} onToggle={toggle('showProcess')}>
        <Text label="Small heading" value={home.processEyebrow} onChange={text('processEyebrow')} />
        <Text label="Heading" value={home.processTitle} onChange={text('processTitle')} />
        <Cards label="Step" items={home.processSteps} onChange={(processSteps) => edit('home', { processSteps }, 'processSteps')} />
      </Section>
      <Section title="Journal" shown={home.showJournal} onToggle={toggle('showJournal')}>
        <Text label="Small heading" value={home.journalEyebrow} onChange={text('journalEyebrow')} />
        <Text label="Heading" value={home.journalTitle} onChange={text('journalTitle')} />
        <Text label="Text" rows={3} value={home.journalText} onChange={text('journalText')} />
        <Text label="Button text" value={home.journalButton} onChange={text('journalButton')} />
      </Section>
    </>
  );
}

function PageEditor({ page, draft, edit }) {
  const text = (key, name) => (value) => edit(key, { [name]: value }, `${key}.${name}`);
  if (page === 'shipping') {
    return (
      <Section title="Shipping & Returns" intro='The words "Contact Us" link to your contact page automatically.'>
        <Text label="Page title" value={draft.shipping.title} onChange={text('shipping', 'title')} />
        <PolicySections sections={draft.shipping.sections} onChange={(sections) => edit('shipping', { sections }, 'shipping.sections')} />
      </Section>
    );
  }
  if (page === 'contact') {
    return (
      <Section title="Contact Us">
        <Text label="Page title" value={draft.contact.title} onChange={text('contact', 'title')} />
        <Text label="Intro" rows={3} value={draft.contact.intro} onChange={text('contact', 'intro')} />
      </Section>
    );
  }
  if (page === 'blog') {
    return (
      <Section title="Blog">
        <Text label="Page title" value={draft.blog.title} onChange={text('blog', 'title')} />
        <Text label="Intro" rows={3} value={draft.blog.intro} onChange={text('blog', 'intro')} />
      </Section>
    );
  }
  return (
    <Section title="Footer" intro="Shown at the bottom of every page. Scroll down in the preview to see it.">
      <Text label="Newsletter heading" value={draft.footer.heading} onChange={text('footer', 'heading')} />
      <Text label="Newsletter text" value={draft.footer.text} onChange={text('footer', 'text')} />
      <Text label="Address" value={draft.footer.address} onChange={text('footer', 'address')} />
      <Text label="Copyright name" value={draft.footer.copyright} onChange={text('footer', 'copyright')} hint="The year is added automatically." />
    </Section>
  );
}

export default function ContentTab({ setDirty }) {
  const { content, publish } = useSiteContent();
  const [draft, setDraft] = useState(content);
  const [history, setHistory] = useState([]);
  const [card, setCard] = useState('banners');
  const [page, setPage] = useState('shipping');
  const [productPath, setProductPath] = useState('/shop-all');
  const [showPreview, setShowPreview] = useState(() => window.matchMedia('(min-width: 1180px)').matches);
  const [refreshKey, setRefreshKey] = useState(0);
  const [status, setStatus] = useState(null);
  const lastEdit = useRef({ field: null, time: 0 });

  const dirty = !same(draft, content);
  useEffect(() => {
    setDirty(dirty);
    return () => setDirty(false);
  }, [dirty, setDirty]);

  // Typing in one field counts as a single step for Undo.
  const edit = (key, patch, field = null) => {
    const now = Date.now();
    const { field: lastField, time } = lastEdit.current;
    if (!field || field !== lastField || now - time > 1000) setHistory((h) => [...h.slice(-49), draft]);
    lastEdit.current = { field, time: now };
    setStatus(null);
    setDraft((d) => ({ ...d, [key]: { ...d[key], ...patch } }));
  };

  const undo = () => {
    lastEdit.current = { field: null, time: 0 };
    setDraft(history[history.length - 1]);
    setHistory((h) => h.slice(0, -1));
    setStatus(null);
  };

  const reset = () => {
    setDraft(content);
    setHistory([]);
    setStatus(null);
  };

  const restoreOriginal = () => {
    if (!window.confirm('Put the original wording and photos back for this section? Nothing changes on the site until you save.')) return;
    setHistory((h) => [...h.slice(-49), draft]);
    setStatus(null);
    setDraft((d) => {
      if (card === 'pages') return { ...d, [page]: DEFAULT_CONTENT[page] };
      if (card === 'homepage') return { ...d, home: { ...DEFAULT_CONTENT.home, ...pick(d.home, HERO_FIELDS) } };
      return { ...d, announcement: DEFAULT_CONTENT.announcement, home: { ...d.home, ...pick(DEFAULT_CONTENT.home, HERO_FIELDS) } };
    });
  };

  const save = async () => {
    setStatus({ type: 'pending' });
    try {
      const changed = Object.keys(draft).filter((k) => !same(draft[k], content[k]));
      await saveContent(changed.map((key) => ({ key, value: draft[key] })));
      publish(draft);
      setHistory([]);
      setStatus({ type: 'success', text: 'Saved. Your changes are live.' });
    } catch (err) {
      setStatus({ type: 'error', text: err.message });
    }
  };

  const productPreview = (path, refresh) => {
    setProductPath(path);
    if (refresh) setRefreshKey((n) => n + 1);
  };

  const isProducts = card === 'products';
  const pageInfo = PAGES.find((p) => p.value === page);
  const preview = isProducts
    ? { title: 'Products', path: productPath }
    : card === 'pages'
      ? { title: pageInfo.label, path: pageInfo.path }
      : { title: 'Homepage', path: '/' };

  return (
    <section className="content-tab">
      <header className="admin-panel-head content-head">
        <div>
          <h2>Content</h2>
          <p>
            {isProducts ? 'Product changes go live as soon as you save each product.'
              : dirty ? "You have unsaved changes. The preview shows them, but shoppers won't see them until you save."
                : 'Edit your store. The preview updates as you type, and shoppers see it once you save.'}
          </p>
        </div>
        <div className="content-actions">
          {!isProducts && (
            <>
              <button type="button" className="content-action" disabled={history.length === 0} onClick={undo}><UndoIcon size={15} /> Undo</button>
              <button type="button" className="content-action" disabled={!dirty} onClick={reset}><RefreshIcon size={15} /> Reset</button>
              <button type="button" className="content-action is-primary" disabled={!dirty || status?.type === 'pending'} onClick={save}><SaveIcon size={15} /> {status?.type === 'pending' ? 'Saving…' : 'Save changes'}</button>
            </>
          )}
          <button type="button" className="content-action" onClick={() => setShowPreview((s) => !s)}>
            {showPreview ? <EyeOffIcon size={15} /> : <EyeIcon size={15} />} {showPreview ? 'Hide preview' : 'Show preview'}
          </button>
        </div>
      </header>

      {status?.text && <p className={`form-message ${status.type}`} role="status">{status.text}</p>}

      <div className="content-cards-nav">
        {CARDS.map((c) => (
          <button key={c.id} type="button" aria-pressed={card === c.id} onClick={() => setCard(c.id)}>
            <c.Icon size={18} />
            <span><strong>{c.label}</strong><small>{c.text}</small></span>
          </button>
        ))}
      </div>

      <div className={`content-split ${showPreview ? 'has-preview' : ''}`}>
        <div className="content-editor">
          {card === 'pages' && <Filter label="Choose a page" options={PAGES} value={page} onChange={setPage} />}
          {card === 'banners' && <HeroBanners draft={draft} edit={edit} />}
          {card === 'homepage' && <Homepage draft={draft} edit={edit} onProductsSaved={() => setRefreshKey((n) => n + 1)} />}
          {card === 'pages' && <PageEditor page={page} draft={draft} edit={edit} />}
          {isProducts && <ProductManager setDirty={setDirty} onPreview={productPreview} />}
          {!isProducts && <button type="button" className="link-button content-restore" onClick={restoreOriginal}>Restore original wording</button>}
        </div>
        {showPreview && <StorePreview {...preview} content={draft} refreshKey={refreshKey} />}
      </div>
    </section>
  );
}
