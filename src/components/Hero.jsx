import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { titlePath, catBySlug } from '../config.js';
import { SafeImg } from './Cards.jsx';

export default function Hero({ items }) {
  const [i, setI] = useState(0);
  const list = (items || []).slice(0, 5);

  useEffect(() => {
    if (list.length < 2) return undefined;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) return undefined;
    const id = setInterval(() => setI((x) => (x + 1) % list.length), 8000);
    return () => clearInterval(id);
  }, [list.length]);

  if (!list.length) return null;
  const t = list[i % list.length];
  const bg = t.backdrop || t.poster;

  return (
    <section className="hero" aria-roledescription="carousel" aria-label="Featured">
      <SafeImg key={t.slug} className="hero-bg" src={bg} alt="" />
      <div className="hero-shade" />
      <div className="hero-in">
        <p className="hero-kicker">{[catBySlug(t.category)?.name, t.language, t.year].filter(Boolean).join('  /  ')}</p>
        <h1 className="hero-title">{t.name}</h1>
        {t.description && <p className="hero-desc">{t.description}</p>}
        <div className="hero-actions">
          <Link to={titlePath(t)} className="btn btn-primary">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
            Watch now
          </Link>
          <Link to={titlePath(t)} className="btn btn-ghost">Details</Link>
        </div>
        {list.length > 1 && (
          <div className="hero-dots" role="tablist">
            {list.map((x, n) => (
              <button
                key={x.slug}
                type="button"
                role="tab"
                aria-selected={n === i}
                aria-label={`Show ${x.name}`}
                className={n === i ? 'on' : ''}
                onClick={() => setI(n)}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
