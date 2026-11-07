import { useEffect, useRef, useState } from 'react';
import { MonitorIcon, PhoneIcon, RefreshIcon } from '../Icons.jsx';

const WIDTHS = { computer: 1280, phone: 390 };

// The real shop in a frame, scaled to fit. Unsaved edits are sent to it as `content`.
export default function StorePreview({ title, path, content, refreshKey }) {
  const [device, setDevice] = useState('computer');
  const [reloads, setReloads] = useState(0);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const stage = useRef(null);
  const frame = useRef(null);
  const latest = useRef(content);
  latest.current = content;

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => setBox({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);

  const send = (value) => {
    if (value) frame.current?.contentWindow?.postMessage({ type: 'ptc-preview-content', content: value }, window.location.origin);
  };

  useEffect(() => send(content), [content]);

  // A freshly loaded frame asks for the current edits.
  useEffect(() => {
    const onMessage = (e) => {
      if (e.origin === window.location.origin && e.source === frame.current?.contentWindow && e.data?.type === 'ptc-preview-ready') send(latest.current);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const width = WIDTHS[device];
  const scale = box.width ? Math.min(1, box.width / width) : 1;

  return (
    <section className="store-preview" aria-label="Store preview">
      <header className="store-preview-head">
        <div>
          <p>Store preview</p>
          <strong>{title}</strong>
        </div>
        <div className="store-preview-tools">
          <div className="store-preview-devices" role="group" aria-label="Preview size">
            <button type="button" aria-pressed={device === 'computer'} onClick={() => setDevice('computer')}><MonitorIcon size={15} /> Computer</button>
            <button type="button" aria-pressed={device === 'phone'} onClick={() => setDevice('phone')}><PhoneIcon size={15} /> Phone</button>
          </div>
          <button type="button" className="store-preview-refresh" onClick={() => setReloads((n) => n + 1)}><RefreshIcon size={15} /> Refresh</button>
        </div>
      </header>
      <div className="store-preview-stage" ref={stage}>
        <iframe
          key={`${path}-${refreshKey}-${reloads}`}
          ref={frame}
          src={path}
          title="Store preview"
          style={{ width, height: box.height / scale || '100%', transform: `translateX(-50%) scale(${scale})` }}
        />
      </div>
    </section>
  );
}
