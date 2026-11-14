import { useState } from 'react';
import { api } from '../api.js';

// Guess Watchora category/type from TMDB data
function guessPlacement(d) {
  const lang = d.language;
  const genres = d.genres ? d.genres.split(',') : [];
  const south = ['Tamil', 'Telugu', 'Malayalam', 'Kannada'];
  if (genres.includes('Animation') && lang === 'Japanese') {
    return { category: 'anime', subcategory: d.type === 'movie' ? 'Movies' : 'Series' };
  }
  if (d.type === 'movie') {
    if (lang === 'Hindi') return { category: 'movies', subcategory: 'Bollywood' };
    if (lang === 'English') return { category: 'movies', subcategory: 'Hollywood' };
    if (south.includes(lang)) return { category: 'movies', subcategory: 'South Indian' };
    return { category: 'movies', subcategory: 'Regional' };
  }
  const dramaMap = { Korean: 'Korean', 'Chinese (Mandarin)': 'Chinese', Cantonese: 'Chinese', Japanese: 'Japanese' };
  if (dramaMap[lang]) return { category: 'drama', subcategory: dramaMap[lang] };
  if (d.country === 'Turkey') return { category: 'drama', subcategory: 'Turkish' };
  if (d.country === 'Pakistan') return { category: 'drama', subcategory: 'Pakistani' };
  if (lang === 'Hindi' || south.includes(lang)) return { category: 'web-series', subcategory: 'Indian' };
  return { category: 'web-series', subcategory: 'International' };
}

const certMap = { U: 'U', UA: 'UA 13+', 'U/A': 'UA 13+', 'UA 7+': 'UA 7+', 'UA 13+': 'UA 13+', 'UA 16+': 'UA 16+', A: 'A', 'A/18+': 'A' };

export default function TmdbFill({ enabled, onFill, isNew }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(enabled ? isNew : false);

  if (!enabled) {
    if (!open) {
      return (
        <button type="button" className="btn btn-ghost tmdb-btn" onClick={() => setOpen(true)}>
          ✨ Auto-fill details from TMDB
        </button>
      );
    }
    return (
      <section className="a-card tmdb">
        <header className="a-card-head">
          <div>
            <h2>Auto-fill is not turned on yet</h2>
            <p className="muted small">It needs a free TMDB key. Do this once, then this button fills poster, story, cast, genres and trailer from a name.</p>
          </div>
          <button type="button" className="link-btn" onClick={() => setOpen(false)}>Close</button>
        </header>
        <ol className="steps">
          <li>Make a free account on <a href="https://www.themoviedb.org/signup" target="_blank" rel="noreferrer">themoviedb.org</a> and verify your email.</li>
          <li>Open <a href="https://www.themoviedb.org/settings/api" target="_blank" rel="noreferrer">Settings → API</a>, request a key (Developer) and fill the short form.</li>
          <li>Copy the long <strong>API Read Access Token</strong>.</li>
          <li>In Cloudflare: Watchora → Settings → Variables and secrets → Add. Type <strong>Secret</strong>, name <code>TMDB_API_KEY</code>, paste the token, Save.</li>
          <li>Redeploy the site. This button then opens a search box.</li>
        </ol>
      </section>
    );
  }

  const search = async (e) => {
    e.preventDefault();
    if (!q.trim()) return;
    setBusy(true); setError('');
    try { setItems((await api.tmdbSearch(q)).items); } catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  const pick = async (r) => {
    setBusy(true); setError('');
    try {
      const d = await api.tmdbDetails(r.type, r.id);
      const place = guessPlacement(d);
      onFill({
        ...d,
        ...(isNew ? place : {}),
        certificate: certMap[d.certificate] || '',
        audio: d.language,
      }, d);
      setItems(null);
      setOpen(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn btn-ghost" onClick={() => setOpen(true)}>Fill details from TMDB</button>
    );
  }

  return (
    <section className="a-card tmdb">
      <header className="a-card-head">
        <div>
          <h2>Fill details automatically</h2>
          <p className="muted small">Search the name, pick the right one, and the form fills itself. You can still change anything.</p>
        </div>
        {!isNew && <button type="button" className="link-btn" onClick={() => setOpen(false)}>Close</button>}
      </header>
      <form className="inline-form" onSubmit={search}>
        <input className="a-input grow" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Mirzapur, Pathaan, Squid Game" aria-label="Search TMDB" autoFocus={isNew} />
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Searching…' : 'Search'}</button>
      </form>
      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && <p className="muted">Nothing found. Try the English name or a shorter name.</p>}
      {items && items.length > 0 && (
        <div className="tmdb-results">
          {items.map((r) => (
            <button key={`${r.type}-${r.id}`} type="button" className="tmdb-item" onClick={() => pick(r)} disabled={busy}>
              <span className="tmdb-poster">{r.poster ? <img src={r.poster} alt="" /> : r.name[0]}</span>
              <span className="tmdb-text">
                <strong>{r.name}</strong>
                <small className="muted">{r.type === 'tv' ? 'Series' : 'Movie'}{r.year ? `, ${r.year}` : ''}{r.language ? `, ${r.language}` : ''}</small>
                {r.overview && <small className="tmdb-ov">{r.overview}</small>}
              </span>
            </button>
          ))}
        </div>
      )}
      <p className="small muted">Data and images from TMDB. This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
    </section>
  );
}
