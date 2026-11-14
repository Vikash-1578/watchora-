import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import {
  ALL_CATEGORIES, LANGUAGES, GENRES, CERTIFICATES, STATUSES, QUALITIES, COUNTRIES,
  catBySlug, isEpisodic, titlePath,
} from '../config.js';
import { Field, MultiChips, TagInput, Toggle, ImagePreview, Section, ConfirmButton, useToast, youTubeId } from './ui.jsx';
import TmdbFill from './TmdbFill.jsx';
import { Sources, Episodes } from './Videos.jsx';

const EMPTY = {
  name: '', original_name: '', slug: '', category: 'movies', subcategory: '', language: 'Hindi', audio: 'Hindi',
  subtitles: '', genres: '', tags: '', year: '', release_date: '', runtime: '', country: 'India', certificate: '',
  status: '', quality: '', imdb_rating: '', cast_list: '', director: '', studio: '', description: '',
  poster: '', backdrop: '', trailer: '', tmdb_id: '', featured: false, published: true,
};

const FIELDS = Object.keys(EMPTY);
const fromTitle = (t) => {
  const f = { ...EMPTY };
  FIELDS.forEach((k) => { if (t[k] !== null && t[k] !== undefined) f[k] = t[k]; });
  f.featured = !!t.featured;
  f.published = !!t.published;
  return f;
};

const SECTIONS = [
  ['basic', 'Basic info'],
  ['details', 'Language & genres'],
  ['people', 'Cast & crew'],
  ['media', 'Poster & trailer'],
  ['publish', 'Publishing'],
  ['videos', 'Videos'],
];

export default function TitleEditor({ id, go, onAuthError, tmdbEnabled }) {
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [saved, setSaved] = useState(EMPTY);
  const [full, setFull] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [similar, setSimilar] = useState([]);

  const load = () =>
    api.adminTitle(id).then((t) => {
      setFull(t);
      const f = fromTitle(t);
      setForm(f);
      setSaved(f);
    }).catch((e) => { setError(e.message); onAuthError(e); });

  useEffect(() => {
    setError('');
    if (id) load();
    else { setFull(null); setForm(EMPTY); setSaved(EMPTY); }
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps

  // warn about duplicates while typing a new title
  useEffect(() => {
    if (id || form.name.trim().length < 3) { setSimilar([]); return undefined; }
    const tm = setTimeout(() => api.adminTitles({ q: form.name.trim() }).then((r) => setSimilar(r.items.slice(0, 3))).catch(() => {}), 400);
    return () => clearTimeout(tm);
  }, [form.name, id]);

  const dirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(saved), [form, saved]);
  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v && v.target ? (v.target.type === 'checkbox' ? v.target.checked : v.target.value) : v }));
  const cat = catBySlug(form.category);
  const episodic = isEpisodic(form);
  const audioCount = form.audio ? form.audio.split(',').filter(Boolean).length : 0;

  const save = async (e) => {
    e?.preventDefault();
    setBusy(true); setError('');
    try {
      const t = await api.saveTitle({ ...form, id: id || undefined });
      const f = fromTitle(t);
      setFull(t); setForm(f); setSaved(f);
      toast(id ? 'Changes saved' : `${t.name} created. Now add its videos below.`);
      if (!id) go('edit', t.id, true);
    } catch (err) {
      setError(err.message); toast(err.message, 'error'); onAuthError(err);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    await api.deleteTitle(id);
    toast(`${form.name} deleted`);
    go('list');
  };

  const fill = (data) => {
    setForm((f) => {
      const next = { ...f };
      FIELDS.forEach((k) => {
        if (k in data && data[k] !== '' && data[k] !== null && data[k] !== undefined) next[k] = String(data[k]);
      });
      return next;
    });
    toast('Details filled. Check them, then save.');
  };

  const ytId = youTubeId(form.trailer);
  const descLen = form.description.length;

  return (
    <div className="editor">
      <div className="editor-top">
        <button type="button" className="link-btn" onClick={() => go('list')}>‹ All titles</button>
        <div className="editor-top-right">
          {full && full.published ? <Link to={titlePath(full)} target="_blank" className="header-link">View on site ↗</Link> : null}
        </div>
      </div>

      <div className="editor-title">
        <h1>{id ? form.name || 'Edit title' : 'Add a new title'}</h1>
        {full && (
          <p className="badges">
            <span className={`pill ${full.published ? 'pill-ok' : ''}`}>{full.published ? 'Live' : 'Hidden'}</span>
            {full.featured ? <span className="pill">In home banner</span> : null}
            {full.is_adult ? <span className="pill pill-rose">18+</span> : null}
            <span className="pill">{full.views} views</span>
          </p>
        )}
      </div>

      <nav className="editor-nav" aria-label="Sections">
        {SECTIONS.filter(([k]) => k !== 'videos' || full).map(([k, label]) => (
          <a key={k} href={`#sec-${k}`}>{label}</a>
        ))}
      </nav>

      <TmdbFill enabled={tmdbEnabled} isNew={!id} onFill={fill} />

      <form onSubmit={save} className="editor-form">
        <Section id="sec-basic" title="Basic info" desc="What viewers see first.">
          <div className="form-grid">
            <Field label="Name *" span={2}>
              <input className="a-input" value={form.name} onChange={set('name')} required placeholder="e.g. Mirzapur" />
            </Field>
            <Field label="Original name" span={2} hint="Only if different, e.g. a Korean or Hindi script name.">
              <input className="a-input" value={form.original_name} onChange={set('original_name')} />
            </Field>
            {similar.length > 0 && (
              <p className="note-warn span-4">
                Already added?{' '}
                {similar.map((s, i) => (
                  <span key={s.id}>{i > 0 && ', '}<button type="button" className="link-btn" onClick={() => go('edit', s.id)}>{s.name}{s.year ? ` (${s.year})` : ''}</button></span>
                ))}
              </p>
            )}
            <Field label="Category *">
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value, subcategory: '' }))}>
                {ALL_CATEGORIES.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Type" hint="Pick one or type your own.">
              <input className="a-input" list="sub-options" value={form.subcategory} onChange={set('subcategory')} placeholder="Choose…" />
              <datalist id="sub-options">{cat?.subs.map((s) => <option key={s} value={s} />)}</datalist>
            </Field>
            <Field label="Release year">
              <input className="a-input" type="number" min="1900" max="2100" value={form.year} onChange={set('year')} placeholder="2024" />
            </Field>
            <Field label="Release date">
              <input className="a-input" type="date" value={form.release_date} onChange={(e) => setForm((f) => ({ ...f, release_date: e.target.value, year: f.year || e.target.value.slice(0, 4) }))} />
            </Field>
            <Field label="Story / description" span={4} count={`${descLen} / 4000`} hint="2 to 4 sentences work best. No spoilers.">
              <textarea className="a-input" rows="4" maxLength={4000} value={form.description} onChange={set('description')} />
            </Field>
          </div>
          {form.category === 'adult' && <p className="note-rose">This title will only appear in the 18+ section. Explicit sexual content is not allowed.</p>}
        </Section>

        <Section id="sec-details" title="Language & genres" desc="Used for filters and search.">
          <div className="form-grid">
            <Field label="Original language">
              <select value={form.language} onChange={set('language')}>
                {LANGUAGES.map((l) => <option key={l}>{l}</option>)}
              </select>
            </Field>
            <Field label="Country">
              <input className="a-input" list="country-options" value={form.country} onChange={set('country')} />
              <datalist id="country-options">{COUNTRIES.map((c) => <option key={c} value={c} />)}</datalist>
            </Field>
            <Field label="Certificate">
              <select value={form.certificate} onChange={set('certificate')}>
                <option value="">Not set</option>
                {CERTIFICATES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Status">
              <select value={form.status} onChange={set('status')}>
                <option value="">Not set</option>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </Field>
            <MultiChips
              label="Audio languages"
              options={LANGUAGES.filter((l) => l !== 'Other')}
              value={form.audio}
              onChange={set('audio')}
              span={4}
              hint={audioCount > 1 ? `Shows a “${audioCount > 2 ? 'Multi audio' : 'Dual audio'}” badge on the site.` : 'Pick every language this video can be heard in.'}
            />
            <MultiChips label="Subtitles" options={['English', 'Hindi', 'Tamil', 'Telugu', 'Malayalam', 'Bengali']} value={form.subtitles} onChange={set('subtitles')} span={4} />
            <MultiChips label="Genres" options={GENRES} value={form.genres} onChange={set('genres')} span={4} hint="Pick 1 to 3 for the best filter results." />
            <Field label="Video quality">
              <select value={form.quality} onChange={set('quality')}>
                <option value="">Not set</option>
                {QUALITIES.map((q) => <option key={q}>{q}</option>)}
              </select>
            </Field>
            <Field label={episodic ? 'Episode length (minutes)' : 'Length (minutes)'}>
              <input className="a-input" type="number" min="1" max="1000" value={form.runtime} onChange={set('runtime')} placeholder={episodic ? '45' : '140'} />
            </Field>
            <Field label="Rating (out of 10)">
              <input className="a-input" type="number" min="0" max="10" step="0.1" value={form.imdb_rating} onChange={set('imdb_rating')} placeholder="7.8" />
            </Field>
            <Field label="URL slug" hint="Made from the name if empty.">
              <input className="a-input" value={form.slug} onChange={set('slug')} placeholder="mirzapur-2018" />
            </Field>
            <TagInput label="Search keywords" value={form.tags} onChange={set('tags')} span={4} placeholder="Type and press Enter, e.g. kaleen bhaiya, gangster" hint="Other names people search for: nicknames, Hindi names, spelling mistakes." />
          </div>
        </Section>

        <Section id="sec-people" title="Cast & crew">
          <div className="form-grid">
            <TagInput label="Cast" value={form.cast_list} onChange={set('cast_list')} span={4} placeholder="Type a name and press Enter" />
            <Field label={episodic ? 'Creator / director' : 'Director'} span={2}>
              <input className="a-input" value={form.director} onChange={set('director')} />
            </Field>
            <Field label={episodic ? 'Studio / channel' : 'Studio'} span={2}>
              <input className="a-input" value={form.studio} onChange={set('studio')} />
            </Field>
          </div>
        </Section>

        <Section id="sec-media" title="Poster & trailer" desc="Paste image links. The preview shows how it will look.">
          <div className="media-grid">
            <div>
              <Field label="Poster (tall, 2:3)" hint="Best size: 500 × 750 px.">
                <input className="a-input" type="url" value={form.poster} onChange={set('poster')} placeholder="https://…" />
              </Field>
              <ImagePreview src={form.poster} label="Poster preview" />
            </div>
            <div>
              <Field label="Banner (wide, 16:9)" hint="Used in the home banner and title page. Best size: 1280 × 720 px.">
                <input className="a-input" type="url" value={form.backdrop} onChange={set('backdrop')} placeholder="https://…" />
              </Field>
              <ImagePreview src={form.backdrop} ratio="16 / 9" label="Banner preview" />
              <Field label="Trailer (YouTube link)">
                <input className="a-input" type="url" value={form.trailer} onChange={set('trailer')} placeholder="https://www.youtube.com/watch?v=…" />
              </Field>
              {form.trailer && !ytId && <p className="warn small">This doesn't look like a YouTube link.</p>}
              {ytId && (
                <div className="img-preview" style={{ aspectRatio: '16 / 9' }}>
                  <iframe src={`https://www.youtube.com/embed/${ytId}`} title="Trailer preview" allowFullScreen />
                </div>
              )}
            </div>
          </div>
        </Section>

        <Section id="sec-publish" title="Publishing">
          <div className="toggles">
            <Toggle checked={form.published} onChange={set('published')} label="Live on the site" hint="Turn off to hide it while you add videos." />
            <Toggle checked={form.featured} onChange={set('featured')} label="Show in the home banner" hint="Needs a banner image to look good." />
          </div>
          {form.featured && !form.backdrop && <p className="note-warn">Add a banner image above for the home banner.</p>}
        </Section>

        {error && <p className="error" role="alert">{error}</p>}

        <div className={`save-bar ${dirty || !id ? 'show' : ''}`}>
          <span className="muted">{id ? (dirty ? 'You have unsaved changes' : 'All changes saved') : 'New title'}</span>
          {id && dirty && <button type="button" className="link-btn" onClick={() => setForm(saved)}>Undo changes</button>}
          <button type="submit" className="btn btn-primary" disabled={busy || (id && !dirty)}>
            {busy ? 'Saving…' : id ? 'Save changes' : 'Create title'}
          </button>
        </div>
      </form>

      {full && (
        <Section
          id="sec-videos"
          title={isEpisodic(full) ? 'Episodes & videos' : 'Video servers'}
          desc={isEpisodic(full)
            ? 'Make seasons and episodes, then add each episode’s video links.'
            : 'Add the same movie from 2 or 3 hosts so viewers can switch if one is slow.'}
        >
          {isEpisodic(full)
            ? <Episodes t={full} reload={load} onAuthError={onAuthError} tmdbEnabled={tmdbEnabled} />
            : <Sources t={full} episodeId={null} reload={load} onAuthError={onAuthError} />}
        </Section>
      )}

      {id && (
        <section className="a-card danger-zone">
          <h2>Delete this title</h2>
          <p className="muted small">Removes the title, all its episodes and all its video links. This can't be undone.</p>
          <ConfirmButton className="btn btn-danger" label="Delete title" confirmLabel="Press again to delete for good" onConfirm={remove} />
        </section>
      )}
    </div>
  );
}
