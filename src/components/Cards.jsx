import { useRef, useState } from 'react';

// Hides an image that fails to load instead of showing a broken icon
export function SafeImg(props) {
  const [ok, setOk] = useState(true);
  if (!ok || !props.src) return null;
  return <img {...props} onError={() => setOk(false)} />;
}
import { Link } from 'react-router-dom';
import { titlePath, catBySlug } from '../config.js';

export function Poster({ t, size = 'md' }) {
  return (
    <div className={`poster poster-${size}`}>
      <span className="poster-fallback" aria-hidden="true">{t.name?.slice(0, 1)}</span>
      <SafeImg src={t.poster} alt="" loading="lazy" decoding="async" />
    </div>
  );
}

export function TitleCard({ t, note }) {
  return (
    <Link to={titlePath(t)} className="card">
      <Poster t={t} />
      <span className="card-name">{t.name}</span>
      <span className="card-meta">
        {note || [t.year, t.language || catBySlug(t.category)?.name].filter(Boolean).join(', ')}
      </span>
    </Link>
  );
}

export function Row({ title, items, to, toLabel = 'See all' }) {
  const ref = useRef(null);
  if (!items?.length) return null;
  const scroll = (dir) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <section className="row">
      <div className="row-head">
        <h2>{title}</h2>
        <div className="row-tools">
          {to && <Link to={to} className="row-all">{toLabel}</Link>}
          <button type="button" className="row-btn" onClick={() => scroll(-1)} aria-label={`Scroll ${title} left`}>‹</button>
          <button type="button" className="row-btn" onClick={() => scroll(1)} aria-label={`Scroll ${title} right`}>›</button>
        </div>
      </div>
      <div className="row-track" ref={ref}>
        {items.map((t) => <TitleCard key={t.slug} t={t} />)}
      </div>
    </section>
  );
}

export function Grid({ items }) {
  return (
    <div className="grid">
      {items.map((t) => <TitleCard key={t.slug} t={t} />)}
    </div>
  );
}

export function GridSkeleton({ n = 12 }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: n }).map((_, i) => <div key={i} className="card"><div className="poster skeleton" /></div>)}
    </div>
  );
}

export function Empty({ title, children }) {
  return (
    <div className="empty">
      <p className="empty-title">{title}</p>
      {children && <div className="muted">{children}</div>}
    </div>
  );
}
