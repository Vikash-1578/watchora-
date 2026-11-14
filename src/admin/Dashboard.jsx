import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ALL_CATEGORIES, catBySlug } from '../config.js';

export default function Dashboard({ go, onAuthError }) {
  const [s, setS] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.stats().then(setS).catch((e) => { setError(e.message); onAuthError(e); });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <p className="error">{error}</p>;
  if (!s) return <div className="stat-grid">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="stat skeleton" />)}</div>;

  const t = s.totals;
  const stats = [
    { label: 'Titles', value: t.titles, go: {} },
    { label: 'Episodes', value: t.episodes },
    { label: 'Video servers', value: t.servers },
    { label: 'Total views', value: t.views },
    { label: 'Titles without video', value: t.novideo, warn: t.novideo > 0, go: { filter: 'novideo' } },
    { label: 'Hidden titles', value: t.hidden, go: { filter: 'hidden' } },
  ];

  return (
    <>
      <div className="block-head">
        <h1>Dashboard</h1>
        <button type="button" className="btn btn-primary" onClick={() => go('new')}>Add title</button>
      </div>

      <div className="stat-grid">
        {stats.map((x) => {
          const inner = (
            <>
              <span className={`stat-value ${x.warn ? 'warn' : ''}`}>{x.value.toLocaleString('en-IN')}</span>
              <span className="stat-label">{x.label}</span>
            </>
          );
          return x.go ? (
            <button key={x.label} type="button" className="stat" onClick={() => go('list', x.go)}>{inner}</button>
          ) : (
            <div key={x.label} className="stat">{inner}</div>
          );
        })}
      </div>
      {t.episodes_novideo > 0 && (
        <p className="note-warn">{t.episodes_novideo} episode{t.episodes_novideo > 1 ? 's have' : ' has'} no video yet. Open the series and use “Paste links” to fill them quickly.</p>
      )}

      <div className="dash-cols">
        <section className="a-card">
          <h2>By category</h2>
          <ul className="cat-counts">
            {ALL_CATEGORIES.map((c) => (
              <li key={c.slug}>
                <button type="button" className="link-row" onClick={() => go('list', { category: c.slug })}>
                  <span>{c.name}</span>
                  <strong>{s.byCategory[c.slug] || 0}</strong>
                </button>
              </li>
            ))}
          </ul>
        </section>
        <section className="a-card">
          <h2>Most watched</h2>
          <MiniList items={s.top} meta={(x) => `${x.views.toLocaleString('en-IN')} views`} go={go} empty="No views yet." />
        </section>
        <section className="a-card">
          <h2>Recently edited</h2>
          <MiniList items={s.recent} meta={(x) => catBySlug(x.category)?.name} go={go} empty="Nothing added yet." />
        </section>
      </div>

      <section className={`a-card tmdb-status ${s.tmdb ? 'on' : ''}`}>
        <h2>Auto-fill from TMDB: {s.tmdb ? 'on' : 'off'}</h2>
        {s.tmdb ? (
          <p className="muted">When you add a title, search it by name and the poster, story, cast, genres, trailer and episodes fill in for you.</p>
        ) : (
          <>
            <p className="muted">Turn this on to fill poster, story, cast, genres, trailer and the full episode list by just searching a title name.</p>
            <ol className="steps">
              <li>Make a free account on themoviedb.org and open Settings, then API, and request a Developer key.</li>
              <li>In Cloudflare, open Watchora, then Settings, then Variables and secrets. Add a Secret named <code>TMDB_API_KEY</code> with your key.</li>
              <li>Redeploy the site. The search box appears on “Add title”.</li>
            </ol>
            <p className="small muted">TMDB's free key is for non-commercial use. If you run ads on Watchora, TMDB asks for a commercial agreement.</p>
          </>
        )}
      </section>
    </>
  );
}

function MiniList({ items, meta, go, empty }) {
  if (!items.length) return <p className="muted small">{empty}</p>;
  return (
    <ul className="mini-list">
      {items.map((x) => (
        <li key={x.id}>
          <button type="button" className="link-row" onClick={() => go('edit', x.id)}>
            <span className="mini-thumb">{x.poster ? <img src={x.poster} alt="" /> : x.name[0]}</span>
            <span className="mini-text"><span>{x.name}</span><small className="muted">{meta(x)}</small></span>
          </button>
        </li>
      ))}
    </ul>
  );
}
