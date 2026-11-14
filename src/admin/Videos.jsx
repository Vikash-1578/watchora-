import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { QUALITIES } from '../config.js';
import { useToast, ConfirmButton, Field, LanguagePicker } from './ui.jsx';
import { ALL_LANGUAGES, POPULAR_LANGUAGES } from '../languages.js';

import { toEmbedUrl, pickLink, pickLinks } from '../embed.js';

export { toEmbedUrl };

const titleAudios = (t) => (t.audio ? t.audio.split(',').filter(Boolean) : t.language ? [t.language] : []);

const titleSubs = (t) => (t.subtitles ? t.subtitles.split(',').filter(Boolean) : []);
const uniq = (a) => [...new Set(a)];

// Audio and subtitle languages of one server (both multiple choice)
function ServerLanguages({ audio, setAudio, subs, setSubs, t }) {
  return (
    <div className="server-langs">
      <LanguagePicker
        label="Audio languages in this video"
        value={audio}
        onChange={setAudio}
        all={ALL_LANGUAGES}
        popular={uniq([...titleAudios(t), ...POPULAR_LANGUAGES])}
        placeholder="Not set"
        hint="Pick 2 or more for a dual / multi audio video."
      />
      <LanguagePicker
        label="Subtitles in this video"
        value={subs}
        onChange={setSubs}
        all={ALL_LANGUAGES}
        popular={uniq([...titleSubs(t), 'English', 'Hindi', ...POPULAR_LANGUAGES])}
        placeholder="Not set"
        noneLabel="No subtitles"
        hint="Subtitles already inside this video or its host player."
      />
    </div>
  );
}

export const subsText = (v) => (v === 'None' ? 'No subtitles' : v ? `Subs: ${v.split(',').join(', ')}` : '');

const hostOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

// ---------- servers for a movie or one episode ----------
export function Sources({ t, episodeId, reload, onAuthError }) {
  const toast = useToast();
  const list = t.sources.filter((s) => (s.episode_id || null) === episodeId).sort((a, b) => a.sort - b.sort || a.id - b.id);
  const [url, setUrl] = useState('');
  const [label, setLabel] = useState('');
  const [quality, setQuality] = useState('');
  const [audio, setAudio] = useState(() => titleAudios(t).join(','));
  const [subs, setSubs] = useState('');
  const [downloadUrl, setDownloadUrl] = useState('');
  const [size, setSize] = useState('');
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);

  const links = pickLinks(url).map(toEmbedUrl);
  const have = new Set(list.map((s) => s.url));
  const fresh = links.filter((l) => !have.has(l));
  const many = links.length > 1;

  const add = async (e) => {
    e.preventDefault();
    if (!links.length) { toast('Paste a link that starts with https://', 'error'); return; }
    if (!fresh.length) { toast('This link is already added', 'error'); return; }
    setBusy(true);
    try {
      for (let i = 0; i < fresh.length; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await api.addSource({
          title_id: t.id, episode_id: episodeId, url: fresh[i],
          label: (!many && label) || undefined,
          quality, audio, subtitles: subs,
          download_url: !many && downloadUrl ? pickLink(downloadUrl) : '',
          size: many ? '' : size,
        });
      }
      setUrl(''); setLabel(''); setDownloadUrl(''); setSize('');
      toast(fresh.length > 1 ? `${fresh.length} servers added` : 'Server added');
      reload();
    } catch (err) { toast(err.message, 'error'); onAuthError(err); } finally { setBusy(false); }
  };

  const move = async (i, dir) => {
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    const a = list[i];
    const b = list[j];
    try {
      await Promise.all([api.updateSource(a.id, { sort: j }), api.updateSource(b.id, { sort: i })]);
      // normalise the rest
      await Promise.all(list.map((s, n) => (s.id !== a.id && s.id !== b.id && s.sort !== n ? api.updateSource(s.id, { sort: n }) : null)));
      reload();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <div className="sources">
      {list.length === 0 && <p className="warn small">No video yet. Add at least one server.</p>}
      {list.length > 0 && (
        <ol className="source-list">
          {list.map((s, i) => (
            <SourceRow
              key={s.id}
              s={s}
              t={t}
              first={i === 0}
              last={i === list.length - 1}
              onUp={() => move(i, -1)}
              onDown={() => move(i, 1)}
              onPreview={() => setPreview(preview === s.id ? null : s.id)}
              previewing={preview === s.id}
              reload={reload}
            />
          ))}
        </ol>
      )}
      <form className="source-form" onSubmit={add}>
        <div className="inline-form">
          <Field
            label="Video link or embed code"
            grow
            hint={!url.trim()
              ? 'Paste the embed link / embed code from your host, or a .mp4 / .m3u8 link. Paste 2 or more (one per line) to add many servers at once.'
              : !links.length
                ? 'No link found. It must start with https://'
                : many
                  ? `${fresh.length} new server${fresh.length === 1 ? '' : 's'} will be added${links.length > fresh.length ? ` (${links.length - fresh.length} already added)` : ''}: ${fresh.map(hostOf).join(', ')}`
                  : !fresh.length
                    ? 'This link is already added.'
                    : `Will be saved as: ${links[0]}`}
          >
            <textarea className="a-input mono" rows={many ? Math.min(links.length + 1, 8) : 2} value={url} onChange={(e) => setUrl(e.target.value)} placeholder={'https://vidara.to/e/…  or  <iframe src="…"></iframe>\nMore links on new lines = more servers'} required />
          </Field>
        </div>
        <ServerLanguages audio={audio} setAudio={setAudio} subs={subs} setSubs={setSubs} t={t} />
        <div className="inline-form">
          <Field label="Quality">
            <select value={quality} onChange={(e) => setQuality(e.target.value)}>
              <option value="">Not set</option>
              {QUALITIES.map((q) => <option key={q}>{q}</option>)}
            </select>
          </Field>
          {!many && <Field label="Server name"><input className="a-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={`Server ${list.length + 1}`} /></Field>}
        </div>
        <div className="inline-form">
          {many ? (
            <p className="muted small grow-note">Servers are named Server 1, 2, 3… Add each one's download link later with <strong>Edit</strong>.</p>
          ) : (
            <>
              <Field label="Download link (optional)" grow hint="The host's download link. Leave empty for .mp4 links (the video link is used).">
                <input className="a-input" type="text" value={downloadUrl} onChange={(e) => setDownloadUrl(e.target.value)} placeholder="https://…" />
              </Field>
              <Field label="File size (optional)"><input className="a-input" value={size} onChange={(e) => setSize(e.target.value)} placeholder="1.2 GB" /></Field>
            </>
          )}
          <button type="submit" className="btn btn-primary" disabled={busy || !fresh.length}>{busy ? 'Adding…' : many ? `Add ${fresh.length} servers` : 'Add server'}</button>
        </div>
      </form>
      <Subtitles t={t} episodeId={episodeId} reload={reload} />
    </div>
  );
}

function SourceRow({ s, t, first, last, onUp, onDown, onPreview, previewing, reload }) {
  const toast = useToast();
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({ label: s.label, url: s.url, quality: s.quality || '', audio: s.audio || '', subtitles: s.subtitles || '', download_url: s.download_url || '', size: s.size || '' });

  const save = async () => {
    try {
      await api.updateSource(s.id, { ...form, url: toEmbedUrl(form.url), download_url: form.download_url ? pickLink(form.download_url) : '' });
      setEdit(false);
      toast('Server saved');
      reload();
    } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <li className="source">
      {!edit ? (
        <div className="source-line">
          <div className="source-order">
            <button type="button" onClick={onUp} disabled={first} aria-label="Move up">▲</button>
            <button type="button" onClick={onDown} disabled={last} aria-label="Move down">▼</button>
          </div>
          <div className="source-info">
            <strong>{s.label}</strong>
            {s.audio && <span className="pill">{s.audio.split(',').join(' + ')}</span>}
            {s.subtitles && <span className="pill">{subsText(s.subtitles)}</span>}
            {s.quality && <span className="pill">{s.quality}</span>}
            {(s.download_url || s.kind === 'file') && <span className="pill">Download{s.size ? ` ${s.size}` : ''}</span>}
            <span className="source-host">{hostOf(s.url)}</span>
            <span className="source-url">{s.url}</span>
          </div>
          <div className="source-actions">
            <button type="button" className="link-btn" onClick={onPreview}>{previewing ? 'Close test' : 'Test'}</button>
            <button type="button" className="link-btn" onClick={() => setEdit(true)}>Edit</button>
            <ConfirmButton label="Remove" onConfirm={async () => { await api.deleteSource(s.id); toast('Server removed'); reload(); }} />
          </div>
        </div>
      ) : (
        <div className="source-form">
          <div className="inline-form">
            <Field label="Video link" grow><input className="a-input" type="text" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></Field>
          </div>
          <ServerLanguages
            audio={form.audio}
            setAudio={(v) => setForm((f) => ({ ...f, audio: v }))}
            subs={form.subtitles}
            setSubs={(v) => setForm((f) => ({ ...f, subtitles: v }))}
            t={t}
          />
          <div className="inline-form">
            <Field label="Quality">
              <select value={form.quality} onChange={(e) => setForm({ ...form, quality: e.target.value })}>
                <option value="">Not set</option>{QUALITIES.map((q) => <option key={q}>{q}</option>)}
              </select>
            </Field>
            <Field label="Server name"><input className="a-input" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} /></Field>
          </div>
          <div className="inline-form">
            <Field label="Download link" grow><input className="a-input" type="text" value={form.download_url} onChange={(e) => setForm({ ...form, download_url: e.target.value })} placeholder="Optional" /></Field>
            <Field label="File size"><input className="a-input" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })} /></Field>
            <button type="button" className="btn btn-primary" onClick={save}>Save</button>
            <button type="button" className="link-btn" onClick={() => setEdit(false)}>Cancel</button>
          </div>
        </div>
      )}
      {previewing && (
        <div className="source-preview">
          {s.kind === 'file' ? <video src={s.url} controls playsInline /> : <iframe src={s.url} title={`Test ${s.label}`} allowFullScreen allow="autoplay; fullscreen" />}
          <p className="small muted">If the video plays here, it will play on the site.</p>
        </div>
      )}
    </li>
  );
}

// ---------- episodes for a series ----------
export function Episodes({ t, reload, onAuthError, tmdbEnabled }) {
  const toast = useToast();
  const seasons = useMemo(() => {
    const s = [...new Set(t.episodes.map((e) => e.season))].sort((a, b) => a - b);
    return s.length ? s : [1];
  }, [t.episodes]);
  const [season, setSeason] = useState(seasons[seasons.length - 1]);
  const [extraSeasons, setExtraSeasons] = useState([]);
  const [tool, setTool] = useState(t.episodes.length ? null : 'range');
  const [open, setOpen] = useState(null);

  const allSeasons = [...new Set([...seasons, ...extraSeasons])].sort((a, b) => a - b);
  const eps = t.episodes.filter((e) => e.season === season);
  const lastEp = eps.length ? Math.max(...eps.map((e) => e.episode)) : 0;
  const missing = eps.filter((e) => !t.sources.some((s) => s.episode_id === e.id)).length;

  useEffect(() => { if (!allSeasons.includes(season)) setSeason(allSeasons[allSeasons.length - 1]); }, [allSeasons.join()]); // eslint-disable-line

  const newSeason = () => {
    const n = Math.max(...allSeasons) + 1;
    setExtraSeasons((x) => [...x, n]);
    setSeason(n);
    setTool('range');
  };

  return (
    <div className="episodes-admin">
      <div className="season-bar" role="tablist" aria-label="Seasons">
        {allSeasons.map((s) => {
          const count = t.episodes.filter((e) => e.season === s).length;
          return (
            <button key={s} type="button" role="tab" aria-selected={s === season} className={`chip ${s === season ? 'on' : ''}`} onClick={() => setSeason(s)}>
              Season {s} <span className="muted">({count})</span>
            </button>
          );
        })}
        <button type="button" className="chip chip-add" onClick={newSeason}>+ New season</button>
      </div>

      <div className="tool-bar">
        <button type="button" className={`btn ${tool === 'range' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool(tool === 'range' ? null : 'range')}>Add episodes</button>
        <button type="button" className={`btn ${tool === 'paste' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool(tool === 'paste' ? null : 'paste')}>Paste video links</button>
        {tmdbEnabled && t.tmdb_id && (
          <button type="button" className={`btn ${tool === 'tmdb' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTool(tool === 'tmdb' ? null : 'tmdb')}>Import episode names</button>
        )}
      </div>

      {tool === 'range' && <AddRange t={t} season={season} next={lastEp + 1} done={() => { setTool(null); reload(); }} toast={toast} onAuthError={onAuthError} />}
      {tool === 'paste' && <PasteLinks t={t} season={season} eps={eps} done={() => { setTool(null); reload(); }} toast={toast} onAuthError={onAuthError} />}
      {tool === 'tmdb' && <ImportTmdb t={t} season={season} done={() => { setTool(null); reload(); }} toast={toast} />}

      {eps.length === 0 ? (
        <p className="muted">Season {season} has no episodes yet. Use “Add episodes” to create them, or “Paste video links” to create them with videos in one go.</p>
      ) : (
        <>
          {missing > 0 && <p className="note-warn">{missing} episode{missing > 1 ? 's' : ''} in season {season} {missing > 1 ? 'have' : 'has'} no video.</p>}
          <ul className="ep-admin-list">
            {eps.map((ep) => (
              <EpisodeRow key={ep.id} ep={ep} t={t} open={open === ep.id} toggle={() => setOpen(open === ep.id ? null : ep.id)} reload={reload} onAuthError={onAuthError} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function AddRange({ t, season, next, done, toast, onAuthError }) {
  const [from, setFrom] = useState(next);
  const [to, setTo] = useState(next);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setFrom(next); setTo(next); }, [next, season]);

  const add = async (e) => {
    e.preventDefault();
    const a = parseInt(from, 10);
    const b = Math.max(a, parseInt(to, 10) || a);
    if (b - a > 300) { toast('Add at most 300 episodes at once', 'error'); return; }
    setBusy(true);
    try {
      const items = Array.from({ length: b - a + 1 }, (_, i) => ({ season, episode: a + i }));
      const r = await api.addEpisodes(t.id, items);
      toast(r.skipped ? `Added ${r.added}. ${r.skipped} already existed.` : `Added ${r.added} episode${r.added > 1 ? 's' : ''}`);
      done();
    } catch (err) { toast(err.message, 'error'); onAuthError(err); } finally { setBusy(false); }
  };

  return (
    <form className="tool-panel inline-form" onSubmit={add}>
      <p className="tool-title">Create empty episodes in season {season}</p>
      <Field label="From episode"><input className="a-input" type="number" min="1" value={from} onChange={(e) => setFrom(e.target.value)} required /></Field>
      <Field label="To episode"><input className="a-input" type="number" min="1" value={to} onChange={(e) => setTo(e.target.value)} required /></Field>
      <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Create episodes'}</button>
    </form>
  );
}

function PasteLinks({ t, season, eps, done, toast, onAuthError }) {
  const firstEmpty = eps.find((e) => !t.sources.some((s) => s.episode_id === e.id))?.episode
    || (eps.length ? Math.max(...eps.map((e) => e.episode)) + 1 : 1);
  const [start, setStart] = useState(firstEmpty);
  const [text, setText] = useState('');
  const [label, setLabel] = useState('');
  const [quality, setQuality] = useState('');
  const [audio, setAudio] = useState(() => titleAudios(t).join(','));
  const [subs, setSubs] = useState('');
  const [busy, setBusy] = useState(false);
  const urls = text.split(/\s+/).map((x) => x.trim()).filter(Boolean);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await api.addSources({ title_id: t.id, season, start_episode: start, urls: urls.map(toEmbedUrl), label: label || undefined, quality, audio, subtitles: subs });
      toast(`Added ${r.added} link${r.added > 1 ? 's' : ''} to episodes ${r.from}–${r.to}`);
      done();
    } catch (err) { toast(err.message, 'error'); onAuthError(err); } finally { setBusy(false); }
  };

  const s = parseInt(start, 10) || 1;
  return (
    <form className="tool-panel" onSubmit={submit}>
      <p className="tool-title">Paste one link per line. The first link goes to the start episode, the next link to the next episode, and so on. Missing episodes are created.</p>
      <Field label={`Links${urls.length ? ` (${urls.length}: episodes ${s} to ${s + urls.length - 1})` : ''}`} grow>
        <textarea className="a-input mono" rows="6" value={text} onChange={(e) => setText(e.target.value)} placeholder={'https://streamtape.com/v/aaa\nhttps://streamtape.com/v/bbb\nhttps://streamtape.com/v/ccc'} required />
      </Field>
      <ServerLanguages audio={audio} setAudio={setAudio} subs={subs} setSubs={setSubs} t={t} />
      <div className="inline-form">
        <Field label="Season"><input className="a-input" value={season} disabled /></Field>
        <Field label="Start at episode"><input className="a-input" type="number" min="1" value={start} onChange={(e) => setStart(e.target.value)} /></Field>
        <Field label="Server name"><input className="a-input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Auto: Server 1, 2…" /></Field>
        <Field label="Quality">
          <select value={quality} onChange={(e) => setQuality(e.target.value)}>
            <option value="">Any</option>{QUALITIES.map((q) => <option key={q}>{q}</option>)}
          </select>
        </Field>
        <button type="submit" className="btn btn-primary" disabled={busy || !urls.length}>{busy ? 'Adding…' : `Add ${urls.length || ''} link${urls.length === 1 ? '' : 's'}`}</button>
      </div>
    </form>
  );
}

function ImportTmdb({ t, season, done, toast }) {
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState(season);
  const run = async () => {
    setBusy(true);
    try {
      const { items } = await api.tmdbSeason(t.tmdb_id, s);
      if (!items.length) { toast(`TMDB has no episodes for season ${s}`, 'error'); return; }
      const r = await api.addEpisodes(t.id, items);
      // fill names for episodes that already existed
      const existing = t.episodes.filter((e) => e.season === Number(s));
      await Promise.all(existing.map((e) => {
        const m = items.find((x) => x.episode === e.episode);
        return m && !e.name ? api.updateEpisode(e.id, { ...e, ...m }) : null;
      }));
      toast(`Season ${s}: added ${r.added} new, updated details for ${existing.length}`);
      done();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };
  return (
    <div className="tool-panel inline-form">
      <p className="tool-title">Bring episode names, stories, thumbnails and dates from TMDB.</p>
      <Field label="Season"><input className="a-input" type="number" min="1" value={s} onChange={(e) => setS(e.target.value)} /></Field>
      <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{busy ? 'Importing…' : 'Import season'}</button>
    </div>
  );
}

function EpisodeRow({ ep, t, open, toggle, reload, onAuthError }) {
  const toast = useToast();
  const count = t.sources.filter((s) => s.episode_id === ep.id).length;
  const [form, setForm] = useState(ep);
  useEffect(() => setForm(ep), [ep]);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async () => {
    try { await api.updateEpisode(ep.id, form); toast(`Episode ${ep.episode} saved`); reload(); } catch (err) { toast(err.message, 'error'); }
  };

  return (
    <li className={`ep-admin ${open ? 'open' : ''}`}>
      <button type="button" className="ep-admin-head" aria-expanded={open} onClick={toggle}>
        <span className="ep-admin-no">{ep.episode}</span>
        <span className="ep-admin-name">{ep.name || `Episode ${ep.episode}`}</span>
        <span className={count ? 'pill' : 'pill pill-warn'}>{count ? `${count} server${count > 1 ? 's' : ''}` : 'No video'}</span>
        <span className="chev" aria-hidden="true">{open ? '−' : '+'}</span>
      </button>
      {open && (
        <div className="ep-admin-body">
          <div className="form-grid">
            <Field label="Episode name" span={2}><input className="a-input" value={form.name || ''} onChange={set('name')} placeholder={`Episode ${ep.episode}`} /></Field>
            <Field label="Length (minutes)"><input className="a-input" type="number" min="1" value={form.runtime || ''} onChange={set('runtime')} /></Field>
            <Field label="Air date"><input className="a-input" type="date" value={form.air_date || ''} onChange={set('air_date')} /></Field>
            <Field label="Story (optional)" span={2}><textarea className="a-input" rows="2" value={form.overview || ''} onChange={set('overview')} /></Field>
            <Field label="Thumbnail image link (optional)" span={2}><input className="a-input" type="url" value={form.thumbnail || ''} onChange={set('thumbnail')} placeholder="https://…" /></Field>
          </div>
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={save}>Save episode details</button>
            <ConfirmButton label="Delete episode" onConfirm={async () => { await api.deleteEpisode(ep.id); toast(`Episode ${ep.episode} deleted`); reload(); }} />
          </div>
          <h3 className="sub-head">Video servers for episode {ep.episode}</h3>
          <Sources t={t} episodeId={ep.id} reload={reload} onAuthError={onAuthError} />
        </div>
      )}
    </li>
  );
}

// ---------- subtitle files for a movie or one episode ----------
function Subtitles({ t, episodeId, reload }) {
  const toast = useToast();
  const list = (t.subtitle_files || []).filter((x) => (x.episode_id || null) === episodeId);
  const [language, setLanguage] = useState('English');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.addSubtitle({ title_id: t.id, episode_id: episodeId, language, url });
      setUrl('');
      toast(`${language} subtitles added`);
      reload();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  };

  return (
    <div className="subs-admin">
      <h3 className="sub-head">Subtitle files</h3>
      <p className="small muted">Paste a link to a .srt or .vtt file. Subtitles show on servers with .mp4 or .m3u8 links.</p>
      {list.length > 0 && (
        <ul>
          {list.map((x) => (
            <li key={x.id}>
              <strong>{x.language}</strong>
              <span className="source-url">{x.url}</span>
              <ConfirmButton label="Remove" onConfirm={async () => { await api.deleteSubtitle(x.id); toast('Subtitle removed'); reload(); }} />
            </li>
          ))}
        </ul>
      )}
      <form className="inline-form" onSubmit={add}>
        <Field label="Language">
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            {ALL_LANGUAGES.filter((l) => l !== 'No dialogue (silent)').map((l) => <option key={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Subtitle file link (.srt or .vtt)" grow>
          <input className="a-input" type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…/english.srt" required />
        </Field>
        <button type="submit" className="btn btn-ghost" disabled={busy}>Add subtitles</button>
      </form>
    </div>
  );
}
