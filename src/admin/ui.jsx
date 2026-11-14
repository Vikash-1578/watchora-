import { useState, useEffect, createContext, useContext, useCallback } from 'react';

// ---------- toast messages ----------
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((text, kind = 'ok') => {
    const id = Math.random();
    setItems((x) => [...x, { id, text, kind }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3500);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => <div key={t.id} className={`toast toast-${t.kind}`}>{t.text}</div>)}
      </div>
    </ToastCtx.Provider>
  );
}

// ---------- form pieces ----------
export function Field({ label, hint, span, grow, children, count }) {
  return (
    <label className={`field ${span ? `span-${span}` : ''} ${grow ? 'grow' : ''}`}>
      <span className="field-label">
        {label}
        {count !== undefined && <em className="count">{count}</em>}
      </span>
      {children}
      {hint && <small className="hint">{hint}</small>}
    </label>
  );
}

const toList = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : []);

// Pick any number of fixed options as chips
export function MultiChips({ label, options, value, onChange, hint, span = 2 }) {
  const list = toList(value);
  const toggle = (o) => onChange((list.includes(o) ? list.filter((x) => x !== o) : [...list, o]).join(','));
  return (
    <fieldset className={`field span-${span}`}>
      <legend className="field-label">{label}{list.length > 0 && <em className="count">{list.length} picked</em>}</legend>
      <div className="chips">
        {options.map((o) => (
          <button key={o} type="button" className={`chip ${list.includes(o) ? 'on' : ''}`} aria-pressed={list.includes(o)} onClick={() => toggle(o)}>
            {o}
          </button>
        ))}
      </div>
      {hint && <small className="hint">{hint}</small>}
    </fieldset>
  );
}

// Free text tags: type and press Enter or comma
export function TagInput({ label, value, onChange, placeholder, hint, span = 2, suggestions }) {
  const [text, setText] = useState('');
  const list = toList(value);
  const add = (raw) => {
    const parts = raw.split(',').map((x) => x.trim()).filter(Boolean);
    if (!parts.length) return;
    const next = [...list];
    parts.forEach((p) => { if (!next.includes(p)) next.push(p); });
    onChange(next.join(','));
    setText('');
  };
  const remove = (t) => onChange(list.filter((x) => x !== t).join(','));
  const listId = suggestions ? `sug-${label.replace(/\W/g, '')}` : undefined;
  return (
    <div className={`field span-${span}`}>
      <span className="field-label">{label}{list.length > 0 && <em className="count">{list.length}</em>}</span>
      <div className="tags">
        {list.map((t) => (
          <span key={t} className="tag">
            {t}
            <button type="button" onClick={() => remove(t)} aria-label={`Remove ${t}`}>×</button>
          </span>
        ))}
        <input
          value={text}
          list={listId}
          onChange={(e) => (e.target.value.endsWith(',') ? add(e.target.value) : setText(e.target.value))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { e.preventDefault(); add(text); }
            if (e.key === 'Backspace' && !text && list.length) remove(list[list.length - 1]);
          }}
          onBlur={() => text && add(text)}
          placeholder={list.length ? '' : placeholder}
          aria-label={label}
        />
        {suggestions && <datalist id={listId}>{suggestions.map((s) => <option key={s} value={s} />)}</datalist>}
      </div>
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="toggle">
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="toggle-track" aria-hidden="true"><span /></span>
      <span>
        <span className="toggle-label">{label}</span>
        {hint && <small className="hint">{hint}</small>}
      </span>
    </label>
  );
}

export function ImagePreview({ src, ratio = '2 / 3', label }) {
  const [state, setState] = useState('idle');
  useEffect(() => setState(src ? 'loading' : 'idle'), [src]);
  return (
    <div className="img-preview" style={{ aspectRatio: ratio }}>
      {src && (
        <img
          src={src}
          alt={label}
          onLoad={() => setState('ok')}
          onError={() => setState('error')}
          style={{ display: state === 'error' ? 'none' : 'block' }}
        />
      )}
      {state === 'idle' && <span>No image yet</span>}
      {state === 'error' && <span className="warn">This link doesn't open as an image</span>}
    </div>
  );
}

export function youTubeId(url) {
  const m = String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}

export function ConfirmButton({ label, confirmLabel = 'Press again to confirm', onConfirm, className = 'link-btn danger' }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => { if (!armed) { setArmed(true); return; } setArmed(false); await onConfirm(); }}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : label}
    </button>
  );
}

export function Section({ title, desc, children, actions, id }) {
  return (
    <section className="a-card" id={id}>
      <header className="a-card-head">
        <div>
          <h2>{title}</h2>
          {desc && <p className="muted small">{desc}</p>}
        </div>
        {actions && <div className="a-card-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
