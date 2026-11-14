import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { ALL_CATEGORIES, catBySlug, isEpisodic, bannerOn, bannerFor, bannerEnds, shortDate, DEFAULT_BANNER_DAYS } from '../config.js';
import { useToast } from './ui.jsx';

export default function TitleList({ initial = {}, go, onAuthError }) {
  const toast = useToast();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState(initial.category || '');
  const [filter, setFilter] = useState(initial.filter || '');
  const [sort, setSort] = useState('');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  const load = () =>
    api.adminTitles({ q, category, filter, sort })
      .then((r) => setItems(r.items))
      .catch((e) => { setError(e.message); onAuthError(e); });

  useEffect(() => {
    const id = setTimeout(load, 250);
    return () => clearTimeout(id);
  }, [q, category, filter, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const flip = async (t, key) => {
    const isBanner = key === 'featured';
    const next = isBanner ? !bannerOn(t.featured) : !t[key];
    const value = isBanner ? (next ? bannerFor(DEFAULT_BANNER_DAYS) : 0) : next ? 1 : 0;
    setItems((list) => list.map((x) => (x.id === t.id ? { ...x, [key]: value } : x)));
    try {
      await api.setFlags(t.id, { [key]: isBanner ? value : next });
      toast(!isBanner ? (next ? `${t.name} is live` : `${t.name} is hidden`) : (next ? `In home banner for ${DEFAULT_BANNER_DAYS} days` : 'Removed from home banner'));
    } catch (e) {
      toast(e.message, 'error');
      load();
    }
  };

  return (
    <>
      <div className="block-head">
        <h1>Titles {items && <span className="muted count-big">{items.length}</span>}</h1>
        <button type="button" className="btn btn-primary" onClick={() => go('new')}>Add title</button>
      </div>

      <div className="list-tools">
        <input type="search" className="a-input grow" placeholder="Search by name" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search titles" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Category">
          <option value="">All categories</option>
          {ALL_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Show">
          <option value="">Everything</option>
          <option value="live">Live only</option>
          <option value="hidden">Hidden only</option>
          <option value="featured">In home banner</option>
          <option value="novideo">Without video</option>
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort">
          <option value="">Recently edited</option>
          <option value="new">Recently added</option>
          <option value="views">Most watched</option>
          <option value="name">Name A–Z</option>
        </select>
      </div>

      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && (
        <div className="empty">
          <p className="empty-title">{q || category || filter ? 'No titles match these filters' : 'No titles yet'}</p>
          <p className="muted">{q || category || filter ? 'Clear the filters to see everything.' : 'Add your first movie or series.'}</p>
        </div>
      )}
      {items && items.length > 0 && (
        <div className="t-list">
          {items.map((t) => {
            const episodic = isEpisodic(t);
            const noVideo = t.source_count === 0;
            return (
              <article key={t.id} className="t-row">
                <button type="button" className="t-main" onClick={() => go('edit', t.id)}>
                  <span className="t-thumb">{t.poster ? <img src={t.poster} alt="" loading="lazy" /> : t.name[0]}</span>
                  <span className="t-text">
                    <strong>{t.name}{t.year ? ` (${t.year})` : ''}</strong>
                    <small className="muted">
                      {catBySlug(t.category)?.name}{t.subcategory ? `, ${t.subcategory}` : ''}
                      {episodic ? `  |  ${t.episode_count} episode${t.episode_count === 1 ? '' : 's'}` : ''}
                      {`  |  ${t.source_count} server${t.source_count === 1 ? '' : 's'}`}
                      {`  |  ${t.views} views`}
                    </small>
                    {noVideo && <small className="warn">No video added yet</small>}
                  </span>
                </button>
                <div className="t-flags">
                  <label className="mini-switch">
                    <input type="checkbox" checked={!!t.published} onChange={() => flip(t, 'published')} />
                    <span>Live</span>
                  </label>
                  <label className="mini-switch">
                    <input type="checkbox" checked={bannerOn(t.featured)} onChange={() => flip(t, 'featured')} />
                    <span title={bannerEnds(t.featured) ? `Leaves the banner on ${shortDate(bannerEnds(t.featured))}` : undefined}>
                      Banner{bannerOn(t.featured) && bannerEnds(t.featured) ? ` · till ${bannerEnds(t.featured).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : ''}
                    </span>
                  </label>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </>
  );
}
