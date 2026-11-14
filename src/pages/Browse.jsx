import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { GENRES } from '../config.js';
import { ALL_LANGUAGES, POPULAR_LANGUAGES } from '../languages.js';
import { Grid, GridSkeleton, Empty } from '../components/Cards.jsx';

// Filterable, paged grid. Used by category pages, search and the 18+ section.
export default function Browse({ category, subs, adult = false, q = '', emptyText, person = '', fixedGenre = '', categoryChips }) {
  const [params, setParams] = useSearchParams();
  const sub = params.get('sub') || '';
  const lang = params.get('lang') || '';
  const genre = fixedGenre || params.get('genre') || '';
  const sort = params.get('sort') || 'new';
  const cat = category || params.get('cat') || '';

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const key = [cat, sub, lang, genre, sort, q, adult, person].join('|');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    api.titles({ category: cat, sub, lang, genre, sort, q, person, adult: adult ? 1 : '', page: 1 })
      .then((r) => { if (alive) { setItems(r.items); setHasMore(r.hasMore); setPage(1); } })
      .catch((e) => alive && setError(e))
      .finally(() => alive && setLoading(false));
    return () => { alive = false; };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps

  const more = async () => {
    setLoading(true);
    try {
      const r = await api.titles({ category: cat, sub, lang, genre, sort, q, person, adult: adult ? 1 : '', page: page + 1 });
      setItems((x) => [...x, ...r.items]);
      setHasMore(r.hasMore);
      setPage(page + 1);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  };

  const set = (k, v) => {
    const p = new URLSearchParams(params);
    if (v) p.set(k, v); else p.delete(k);
    setParams(p, { replace: true });
  };

  return (
    <>
      <div className="filters">
        {categoryChips && (
          <div className="chips" role="group" aria-label="Category">
            <button type="button" className={`chip ${!cat ? 'on' : ''}`} onClick={() => set('cat', '')}>All</button>
            {categoryChips.map((c) => (
              <button key={c.slug} type="button" className={`chip ${cat === c.slug ? 'on' : ''}`} onClick={() => set('cat', c.slug)}>{c.name}</button>
            ))}
          </div>
        )}
        {subs?.length > 0 && (
          <div className="chips" role="group" aria-label="Type">
            <button type="button" className={`chip ${!sub ? 'on' : ''}`} onClick={() => set('sub', '')}>All</button>
            {subs.map((s) => (
              <button key={s} type="button" className={`chip ${sub === s ? 'on' : ''}`} onClick={() => set('sub', s)}>{s}</button>
            ))}
          </div>
        )}
        <div className="selects">
          <label>
            <span className="sr">Language</span>
            <select value={lang} onChange={(e) => set('lang', e.target.value)}>
              <option value="">All languages</option>
              <optgroup label="Popular">
                {POPULAR_LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </optgroup>
              <optgroup label="All languages">
                {ALL_LANGUAGES.filter((l) => !POPULAR_LANGUAGES.includes(l)).map((l) => <option key={l}>{l}</option>)}
              </optgroup>
            </select>
          </label>
          {!fixedGenre && <label>
            <span className="sr">Genre</span>
            <select value={genre} onChange={(e) => set('genre', e.target.value)}>
              <option value="">All genres</option>
              {GENRES.map((g) => <option key={g}>{g}</option>)}
            </select>
          </label>}
          <label>
            <span className="sr">Sort</span>
            <select value={sort} onChange={(e) => set('sort', e.target.value === 'new' ? '' : e.target.value)}>
              <option value="new">Newest</option>
              <option value="popular">Most watched</option>
              <option value="year">Release year</option>
              <option value="rating">Top rated</option>
              <option value="name">Name A–Z</option>
            </select>
          </label>
        </div>
      </div>

      {error && <Empty title="Couldn't load titles">{error.message}</Empty>}
      {!error && loading && items.length === 0 && <GridSkeleton />}
      {!error && !loading && items.length === 0 && (
        <Empty title="No titles found">{emptyText || 'Try another filter, or clear the filters to see everything.'}</Empty>
      )}
      {items.length > 0 && <Grid items={items} />}
      {hasMore && (
        <div className="more">
          <button type="button" className="btn btn-ghost" onClick={more} disabled={loading}>
            {loading ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </>
  );
}
