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
  // suggestions: names already used on other titles (shown while typing)
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
        <button type="button" className="tag-add" onClick={() => add(text)} disabled={!text.trim()}>+ Add</button>
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

// ---------- language picker: search + tick boxes ----------
export function LanguagePicker({ label, value, onChange, all, popular, multiple = true, hint, placeholder = 'Choose languages' }) {
  const selected = multiple ? toList(value) : (value ? [value] : []);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const id = `lp-${label.replace(/\W/g, '')}`;

  const pick = (lang) => {
    if (!multiple) { onChange(lang); setOpen(false); setQ(''); return; }
    const next = selected.includes(lang) ? selected.filter((x) => x !== lang) : [...selected, lang];
    onChange(next.join(','));
  };
  const remove = (lang) => onChange(multiple ? selected.filter((x) => x !== lang).join(',') : '');

  const term = q.trim().toLowerCase();
  const matches = term ? all.filter((l) => l.toLowerCase().includes(term)) : all;
  const quick = popular.slice(0, 12);

  return (
    <div className="field span-4 lp">
      <span className="field-label" id={`${id}-label`}>
        {label}
        {multiple && selected.length > 0 && <em className="count">{selected.length} selected</em>}
      </span>

      <div className="lp-box">
        {selected.length === 0 && <span className="muted">{placeholder}</span>}
        {selected.map((l) => (
          <span key={l} className="tag">
            {l}
            <button type="button" onClick={() => remove(l)} aria-label={`Remove ${l}`}>×</button>
          </span>
        ))}
        <button type="button" className="lp-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => setOpen(!open)}>
          {open ? 'Done' : selected.length ? (multiple ? '+ Add more' : 'Change') : '+ Choose'}
        </button>
      </div>

      {multiple && (
        <div className="lp-quick" aria-label="Common languages">
          {quick.map((l) => (
            <button key={l} type="button" className={`chip chip-sm ${selected.includes(l) ? 'on' : ''}`} aria-pressed={selected.includes(l)} onClick={() => pick(l)}>
              {selected.includes(l) ? '✓ ' : ''}{l}
            </button>
          ))}
        </div>
      )}

      {open && (
        <div className="lp-panel" id={`${id}-panel`} role="group" aria-labelledby={`${id}-label`}>
          <div className="lp-search">
            <input
              className="a-input"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${all.length} languages`}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); if (matches[0]) pick(matches[0]); }
                if (e.key === 'Escape') setOpen(false);
              }}
            />
            {multiple && selected.length > 0 && (
              <button type="button" className="link-btn" onClick={() => onChange('')}>Clear all</button>
            )}
          </div>
          {matches.length === 0 && <p className="muted small">No language called “{q}”. Check the spelling.</p>}
          <ul className="lp-list">
            {matches.map((l) => {
              const on = selected.includes(l);
              return (
                <li key={l}>
                  <button type="button" className={`lp-item ${on ? 'on' : ''}`} aria-pressed={on} onClick={() => pick(l)}>
                    <span className={multiple ? 'lp-check' : 'lp-radio'} aria-hidden="true">{on ? '✓' : ''}</span>
                    {l}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}
