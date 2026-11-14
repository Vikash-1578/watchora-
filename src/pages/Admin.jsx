import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, adminToken } from '../api.js';
import { useTitle } from '../hooks.js';
import { ALL_CATEGORIES, LANGUAGES, GENRES, catBySlug, isEpisodic, titlePath } from '../config.js';
import { Logo } from '../components/Header.jsx';

// Share links from common hosts -> their embed links
export function toEmbedUrl(raw) {
  const url = raw.trim();
  return url
    .replace(/(streamtape\.\w+)\/v\//i, '$1/e/')
    .replace(/(dood\w*\.\w+)\/d\//i, '$1/e/')
    .replace(/(dailymotion\.com)\/video\//i, '$1/embed/video/')
    .replace(/archive\.org\/details\//i, 'archive.org/embed/');
}

const EMPTY = {
  name: '', slug: '', category: 'movies', subcategory: '', language: 'Hindi', genres: '',
  year: '', certificate: '', description: '', poster: '', backdrop: '', featured: false, published: true,
};

export default function Admin() {
  useTitle('Admin');
  const [authed, setAuthed] = useState(() => !!adminToken.get());
  const [view, setView] = useState({ name: 'list' }); // list | edit(id|null)

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const logout = () => { adminToken.clear(); setAuthed(false); };
  const onAuthError = (e) => { if (e.status === 401) logout(); };

  return (
    <div className="admin">
      <header className="admin-bar">
        <Logo />
        <span className="muted">Admin</span>
        <div className="admin-bar-right">
          <Link to="/" className="header-link">View site</Link>
          <button type="button" className="link-btn" onClick={logout}>Log out</button>
        </div>
      </header>
      <div className="page">
        {view.name === 'list' && <TitleList onOpen={(id) => setView({ name: 'edit', id })} onAuthError={onAuthError} />}
        {view.name === 'edit' && (
          <TitleEditor
            id={view.id}
            onBack={() => setView({ name: 'list' })}
            onSaved={(id) => setView({ name: 'edit', id })}
            onAuthError={onAuthError}
          />
        )}
      </div>
    </div>
  );
}

function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(password);
      adminToken.set(token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <form className="gate-box" onSubmit={submit}>
        <Logo />
        <h1>Admin login</h1>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </div>
  );
}

function TitleList({ onOpen, onAuthError }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const id = setTimeout(() => {
      api.adminTitles(q).then((r) => setItems(r.items)).catch((e) => { setError(e.message); onAuthError(e); });
    }, 250);
    return () => clearTimeout(id);
  }, [q]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <>
      <div className="block-head">
        <h1>Titles</h1>
        <button type="button" className="btn btn-primary" onClick={() => onOpen(null)}>Add title</button>
      </div>
      <input className="admin-search" type="search" placeholder="Search titles" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search titles" />
      {error && <p className="error">{error}</p>}
      {items && items.length === 0 && <p className="muted">No titles yet. Press “Add title” to add your first movie or series.</p>}
      {items && items.length > 0 && (
        <table className="admin-table">
          <thead>
            <tr><th>Title</th><th>Category</th><th>Status</th><th>Views</th></tr>
          </thead>
          <tbody>
            {items.map((t) => (
              <tr key={t.id}>
                <td><button type="button" className="link-btn" onClick={() => onOpen(t.id)}>{t.name}</button>{t.year ? ` (${t.year})` : ''}</td>
                <td>{catBySlug(t.category)?.name}{t.subcategory ? `, ${t.subcategory}` : ''}</td>
                <td>{t.published ? 'Live' : 'Hidden'}{t.featured ? ', Featured' : ''}</td>
                <td>{t.views}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function TitleEditor({ id, onBack, onSaved, onAuthError }) {
  const [form, setForm] = useState(EMPTY);
  const [full, setFull] = useState(null);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = () =>
    api.adminTitle(id).then((t) => {
      setFull(t);
      setForm({ ...EMPTY, ...t, year: t.year || '', featured: !!t.featured, published: !!t.published });
    }).catch((e) => { setError(e.message); onAuthError(e); });

  useEffect(() => {
    setMsg(''); setError('');
    if (id) load(); else { setFull(null); setForm(EMPTY); }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));
  const cat = catBySlug(form.category);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setMsg('');
    try {
      const saved = await api.saveTitle({ ...form, id: id || undefined });
      setFull(saved);
      setMsg('Saved');
      if (!id) onSaved(saved.id);
    } catch (err) {
      setError(err.message); onAuthError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await api.deleteTitle(id); onBack(); } catch (err) { setError(err.message); }
  };

  const toggleGenre = (g) => {
    const list = form.genres ? form.genres.split(',').filter(Boolean) : [];
    const next = list.includes(g) ? list.filter((x) => x !== g) : [...list, g];
    setForm((f) => ({ ...f, genres: next.join(',') }));
  };
  const genreList = form.genres ? form.genres.split(',') : [];

  return (
    <>
      <div className="block-head">
        <button type="button" className="link-btn" onClick={onBack}>‹ All titles</button>
        {full && <Link to={titlePath(full)} className="header-link" target="_blank">Open on site</Link>}
      </div>
      <h1>{id ? form.name || 'Edit title' : 'Add title'}</h1>

      <form className="admin-form" onSubmit={save}>
        <div className="form-grid">
          <label className="field span-2"><span>Name *</span><input value={form.name} onChange={set('name')} required /></label>
          <label className="field">
            <span>Category *</span>
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))}>
              {ALL_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Type</span>
            <select value={form.subcategory} onChange={set('subcategory')}>
              <option value="">None</option>
              {cat?.subs.map((s) => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Language</span>
            <select value={form.language} onChange={set('language')}>
              {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
            </select>
          </label>
          <label className="field"><span>Year</span><input type="number" min="1900" max="2100" value={form.year} onChange={set('year')} /></label>
          <label className="field">
            <span>Certificate</span>
            <select value={form.certificate} onChange={set('certificate')}>
              <option value="">None</option><option>U</option><option>UA</option><option>A</option>
            </select>
          </label>
          <label className="field"><span>URL slug</span><input value={form.slug} onChange={set('slug')} placeholder="Made from the name if empty" /></label>
          <label className="field span-2"><span>Poster image link (tall, 2:3)</span><input type="url" value={form.poster} onChange={set('poster')} placeholder="https://…" /></label>
          <label className="field span-2"><span>Backdrop image link (wide, 16:9)</span><input type="url" value={form.backdrop} onChange={set('backdrop')} placeholder="https://…" /></label>
          <label className="field span-2"><span>Description</span><textarea rows="4" value={form.description} onChange={set('description')} /></label>
          <fieldset className="field span-2">
            <legend>Genres</legend>
            <div className="chips">
              {GENRES.map((g) => (
                <button key={g} type="button" className={`chip ${genreList.includes(g) ? 'on' : ''}`} aria-pressed={genreList.includes(g)} onClick={() => toggleGenre(g)}>{g}</button>
              ))}
            </div>
          </fieldset>
          <label className="check"><input type="checkbox" checked={form.featured} onChange={set('featured')} /> Show in the big banner on the home page</label>
          <label className="check"><input type="checkbox" checked={form.published} onChange={set('published')} /> Live on the site</label>
        </div>
        {form.category === 'adult' && <p className="note">This title will only appear in the 18+ section.</p>}
        {error && <p className="error" role="alert">{error}</p>}
        {msg && <p className="ok" role="status">{msg}</p>}
        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Saving…' : id ? 'Save changes' : 'Create title'}</button>
          {id && (
            <button type="button" className="btn btn-danger" onClick={remove}>
              {confirmDelete ? 'Press again to delete for good' : 'Delete title'}
            </button>
          )}
        </div>
      </form>

      {full && (isEpisodic(full) ? (
        <Episodes t={full} reload={load} onAuthError={onAuthError} />
      ) : (
        <section className="block">
          <h2>Video servers</h2>
          <Sources t={full} episodeId={null} reload={load} onAuthError={onAuthError} />
        </section>
      ))}
    </>
  );
}

function Episodes({ t, reload, onAuthError }) {
  const last = t.episodes[t.episodes.length - 1];
  const [season, setSeason] = useState(last?.season || 1);
  const [episode, setEpisode] = useState((last?.episode || 0) + 1);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [open, setOpen] = useState(null);

  useEffect(() => {
    const l = t.episodes[t.episodes.length - 1];
    if (l) { setSeason(l.season); setEpisode(l.episode + 1); }
  }, [t.episodes.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const r = await api.addEpisode({ title_id: t.id, season, episode, name });
      setName('');
      setOpen(r.id);
      reload();
    } catch (err) { setError(err.message); onAuthError(err); }
  };

  return (
    <section className="block">
      <h2>Episodes</h2>
      <form className="inline-form" onSubmit={add}>
        <label className="field"><span>Season</span><input type="number" min="1" value={season} onChange={(e) => setSeason(e.target.value)} /></label>
        <label className="field"><span>Episode</span><input type="number" min="1" value={episode} onChange={(e) => setEpisode(e.target.value)} required /></label>
        <label className="field grow"><span>Episode name (optional)</span><input value={name} onChange={(e) => setName(e.target.value)} /></label>
        <button type="submit" className="btn btn-primary">Add episode</button>
      </form>
      {error && <p className="error">{error}</p>}
      {t.episodes.length === 0 && <p className="muted">No episodes yet. Add episode 1 above, then add its video servers.</p>}
      <ul className="admin-eps">
        {t.episodes.map((ep) => {
          const count = t.sources.filter((s) => s.episode_id === ep.id).length;
          return (
            <li key={ep.id}>
              <button type="button" className="admin-ep-head" aria-expanded={open === ep.id} onClick={() => setOpen(open === ep.id ? null : ep.id)}>
                <span>S{ep.season} E{ep.episode}{ep.name ? `: ${ep.name}` : ''}</span>
                <span className={count ? 'muted' : 'warn'}>{count ? `${count} server${count > 1 ? 's' : ''}` : 'No video yet'}</span>
              </button>
              {open === ep.id && (
                <div className="admin-ep-body">
                  <Sources t={t} episodeId={ep.id} reload={reload} onAuthError={onAuthError} />
                  <DeleteButton label="Delete episode" onConfirm={async () => { await api.deleteEpisode(ep.id); setOpen(null); reload(); }} />
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Sources({ t, episodeId, reload, onAuthError }) {
  const list = t.sources.filter((s) => (s.episode_id || null) === episodeId);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [quality, setQuality] = useState('');
  const [error, setError] = useState('');

  const add = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await api.addSource({ title_id: t.id, episode_id: episodeId, url: toEmbedUrl(url), label: label || undefined, quality });
      setUrl(''); setLabel(''); setQuality('');
      reload();
    } catch (err) { setError(err.message); onAuthError(err); }
  };

  return (
    <div className="sources">
      {list.length > 0 && (
        <ul className="source-list">
          {list.map((s) => (
            <li key={s.id}>
              <strong>{s.label}</strong>{s.quality ? ` (${s.quality})` : ''}
              <span className="source-url">{s.url}</span>
              <DeleteButton label="Remove" onConfirm={async () => { await api.deleteSource(s.id); reload(); }} />
            </li>
          ))}
        </ul>
      )}
      <form className="inline-form" onSubmit={add}>
        <label className="field grow"><span>Video embed link</span><input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://streamtape.com/e/…" required /></label>
        <label className="field"><span>Server name</span><input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`Server ${list.length + 1}`} /></label>
        <label className="field">
          <span>Quality</span>
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            <option value="">Any</option><option>480p</option><option>720p</option><option>1080p</option><option>4K</option>
          </select>
        </label>
        <button type="submit" className="btn btn-ghost">Add server</button>
      </form>
      <p className="small muted">Paste the host's embed or share link. Streamtape, Dood, Dailymotion and archive.org share links are converted to embed links automatically.</p>
      {error && <p className="error">{error}</p>}
    </div>
  );
}

function DeleteButton({ label, onConfirm }) {
  const [armed, setArmed] = useState(false);
  return (
    <button
      type="button"
      className="link-btn danger"
      onClick={async () => { if (!armed) { setArmed(true); return; } await onConfirm(); setArmed(false); }}
      onBlur={() => setArmed(false)}
    >
      {armed ? 'Press again to confirm' : label}
    </button>
  );
}
