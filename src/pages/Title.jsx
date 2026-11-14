import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import { catBySlug, isEpisodic } from '../config.js';
import { history, watchlist } from '../local.js';
import { Poster, Empty, SafeImg, Row, TitleCard } from '../components/Cards.jsx';
import WatchPlayer from '../components/WatchPlayer.jsx';
import { TrailerPlayer } from '../components/Trailer.jsx';
import NotFound from './NotFound.jsx';

// related rows only show titles that have a poster
const withPoster = (list) => (list || []).filter((x) => x.poster);
const split = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : []);
const qNum = (q) => (q === '4K' ? 2160 : parseInt(q, 10) || 0);

export function TitleView({ slug, adult = false }) {
  const { data: t, error, loading } = useLoad(() => api.title(slug), [slug]);
  const [params, setParams] = useSearchParams();
  const [saved, setSaved] = useState(false);
  const [trailer, setTrailer] = useState(false);
  const [watching, setWatching] = useState(() => params.get('play') === '1');
  const [downloads, setDownloads] = useState(false);
  const [moreText, setMoreText] = useState(false);
  const [allCast, setAllCast] = useState(false);
  const watchRef = useRef(null);
  const wasFull = useRef(false);
  useTitle(t?.name);

  // Watch now opens the player full screen. Leaving full screen (or Esc / Close) closes the player.
  useEffect(() => {
    if (!watching) return undefined;
    const el = watchRef.current;
    const isFull = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
    const enter = el && (el.requestFullscreen || el.webkitRequestFullscreen);
    if (enter && !isFull()) {
      Promise.resolve(enter.call(el)).then(() => { wasFull.current = true; }).catch(() => {});
    }
    const onChange = () => {
      if (isFull()) { wasFull.current = true; return; }
      if (wasFull.current) { wasFull.current = false; setWatching(false); }
    };
    const onKey = (e) => { if (e.key === 'Escape' && !isFull()) setWatching(false); };
    document.addEventListener('fullscreenchange', onChange);
    document.addEventListener('webkitfullscreenchange', onChange);
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('fullscreenchange', onChange);
      document.removeEventListener('webkitfullscreenchange', onChange);
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      wasFull.current = false;
    };
  }, [watching]);

  const closePlayer = () => {
    if (document.fullscreenElement || document.webkitFullscreenElement) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else setWatching(false);
  };

  useEffect(() => { if (t) setSaved(watchlist.has(t.slug)); }, [t]);
  useEffect(() => {
    if (!trailer) return undefined;
    const onKey = (e) => { if (e.key === 'Escape') setTrailer(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [trailer]);

  const seasons = useMemo(() => (t ? [...new Set(t.episodes.map((e) => e.season))] : []), [t]);

  if (loading) return <div className="page"><div className="skeleton" style={{ height: 360, borderRadius: 10 }} /></div>;
  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="page"><Empty title="Couldn't load this title">{error.message}</Empty></div>;

  // 18+ titles only open inside the 18+ section
  if (t.is_adult && !adult) return <Navigate to={`/18plus/title/${t.slug}`} replace />;
  if (!t.is_adult && adult) return <Navigate to={`/title/${t.slug}`} replace />;

  const episodic = isEpisodic(t) && t.episodes.length > 0;
  const epId = Number(params.get('ep')) || null;
  const episode = episodic ? t.episodes.find((e) => e.id === epId) || t.episodes[0] : null;
  const season = Number(params.get('s')) || episode?.season || seasons[0];
  const itemId = episodic ? episode.id : null;
  const sources = t.sources.filter((s) => (episodic ? s.episode_id === itemId : !s.episode_id));
  const subtitles = (t.subtitle_files || []).filter((s) => (episodic ? s.episode_id === itemId : !s.episode_id));
  const dl = sources
    .filter((s) => s.download_url || s.kind === 'file')
    .map((s) => ({ ...s, href: s.download_url || s.url }))
    .sort((a, b) => a.sort - b.sort || qNum(b.quality) - qNum(a.quality));

  const cat = catBySlug(t.category);
  const genres = split(t.genres);
  const audio = split(t.audio);
  const subs = split(t.subtitles);
  const cast = split(t.cast_list);
  const directors = t.director ? t.director.split(/,\s*/).filter(Boolean) : [];
  const runtime = t.runtime ? `${t.runtime >= 60 ? `${Math.floor(t.runtime / 60)}h ` : ''}${t.runtime % 60 ? `${t.runtime % 60}m` : ''}`.trim() : '';
  const personLink = (n) => (adult ? `/18plus?q=${encodeURIComponent(n)}` : `/person/${encodeURIComponent(n)}`);
  const genreLink = (g) => (adult ? `/18plus?genre=${encodeURIComponent(g)}` : `/genre/${encodeURIComponent(g)}`);
  const epIndex = episodic ? t.episodes.findIndex((e) => e.id === episode.id) : -1;
  const nextEp = episodic ? t.episodes[epIndex + 1] : null;

  const startWatching = () => {
    setWatching(true);
    setDownloads(false);
    history.add(t, episode);
  };
  const pickEpisode = (e) => {
    setParams({ s: String(e.season), ep: String(e.id) }, { replace: true });
    setWatching(true);
    history.add(t, e);
  };

  const castShown = allCast ? cast : cast.slice(0, 6);

  return (
    <article className="detail">
      {(t.backdrop || t.poster) && (
        <div className="detail-bg" aria-hidden="true"><SafeImg src={t.backdrop || t.poster} alt="" /></div>
      )}
      <div className="page">
        <div className="d-head">
          <Poster t={t} size="lg" />
          <div className="d-info">
            <p className="crumbs">
              <Link to={adult ? '/18plus' : `/c/${t.category}`}>{cat?.name}</Link>
              {t.subcategory && <> / <Link to={`${adult ? '/18plus' : `/c/${t.category}`}?sub=${encodeURIComponent(t.subcategory)}`}>{t.subcategory}</Link></>}
            </p>
            <h1 className="detail-title">{t.name}{t.part ? <span className="part-tag">Part {t.part}</span> : null}</h1>
            <ul className="facts">
              {t.imdb_rating ? <li className="rating" aria-label={`Rated ${t.imdb_rating} out of 10`}>★ {t.imdb_rating}</li> : null}
              {t.year && <li>{t.year}</li>}
              {runtime && <li>{runtime}{episodic ? ' / ep' : ''}</li>}
              {t.certificate && <li className="cert">{t.certificate}</li>}
              {t.quality && <li className="cert">{t.quality}</li>}
              {episodic && <li>{seasons.length > 1 ? `${seasons.length} seasons, ` : ''}{t.episodes.length} episode{t.episodes.length > 1 ? 's' : ''}</li>}
              {t.status && t.status !== 'Released' && <li>{t.status}</li>}
            </ul>

            <dl className="d-meta">
              {(audio.length > 0 || t.language) && (
                <>
                  <dt>Audio</dt>
                  <dd>
                    {audio.length > 1 && <span className="audio-badge">{audio.length > 2 ? 'Multi audio' : 'Dual audio'}</span>}
                    {(audio.length ? audio : [t.language]).join(', ')}
                  </dd>
                </>
              )}
              {subs.length > 0 && <><dt>Subtitles</dt><dd>{subs.join(', ')}</dd></>}
              {genres.length > 0 && (
                <>
                  <dt>Genres</dt>
                  <dd className="links">{genres.map((g) => <Link key={g} to={genreLink(g)} className="tag-link">{g}</Link>)}</dd>
                </>
              )}
              {cast.length > 0 && (
                <>
                  <dt>Cast</dt>
                  <dd className="links">
                    {castShown.map((n) => <Link key={n} to={personLink(n)} className="tag-link">{n}</Link>)}
                    {cast.length > 6 && (
                      <button type="button" className="link-btn small" onClick={() => setAllCast(!allCast)}>
                        {allCast ? 'Show less' : `+${cast.length - 6} more`}
                      </button>
                    )}
                  </dd>
                </>
              )}
              {directors.length > 0 && (
                <>
                  <dt>{episodic ? 'Created by' : 'Director'}</dt>
                  <dd className="links">{directors.map((n) => <Link key={n} to={personLink(n)} className="tag-link">{n}</Link>)}</dd>
                </>
              )}
            </dl>

            {t.description && (
              <p className={`detail-desc ${moreText ? 'open' : ''}`}>
                {t.description}
              </p>
            )}
            {t.description && t.description.length > 220 && (
              <button type="button" className="link-btn small" onClick={() => setMoreText(!moreText)}>{moreText ? 'Show less' : 'Read more'}</button>
            )}

            <div className="d-actions">
              <button type="button" className="btn btn-primary" onClick={startWatching}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
                {episode ? `Watch S${episode.season} E${episode.episode}` : 'Watch now'}
              </button>
              <button type="button" className="btn btn-ghost" aria-expanded={downloads} onClick={() => setDownloads(!downloads)}>
                <svg viewBox="0 0 24 24" aria-hidden="true" className="stroke"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" /></svg>
                Download
              </button>
              {t.trailer && <button type="button" className="btn btn-ghost" onClick={() => setTrailer(true)}>Trailer</button>}
              <button type="button" className="btn btn-icon" aria-pressed={saved} onClick={() => setSaved(watchlist.toggle(t))} aria-label={saved ? 'Remove from my list' : 'Add to my list'} title={saved ? 'Saved' : 'Add to my list'}>
                {saved ? '✓' : '+'}
              </button>
            </div>

            {downloads && (
              <div className="dl-panel" role="region" aria-label="Downloads">
                <p className="dl-title">Download {episode ? `S${episode.season} E${episode.episode}` : t.name}</p>
                {dl.length === 0 ? (
                  <p className="muted small">No download link for this yet.</p>
                ) : (
                  <ul className="dl-list">
                    {dl.map((s) => (
                      <li key={s.id}>
                        <a href={s.href} target="_blank" rel="noopener noreferrer nofollow" download className="dl-item">
                          <span className="dl-q">{s.label}</span>
                          <span className="dl-info">{[s.quality, split(s.audio).join(' + '), s.subtitles === 'None' ? 'No subs' : s.subtitles ? `Subs: ${split(s.subtitles).join(', ')}` : '', s.size].filter(Boolean).join('  |  ') || 'Download'}</span>
                          <span className="dl-go" aria-hidden="true">↓</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>

        {watching && (
          <section id="watch" ref={watchRef} className="watch-overlay" role="dialog" aria-modal="true" aria-label={`Watching ${t.name}`}>
            <div className="watch-top">
              <span className="watch-name">{t.name}</span>
              <button type="button" className="watch-close" onClick={closePlayer} aria-label="Close player">✕ Close</button>
            </div>
            <WatchPlayer
              key={itemId || 'movie'}
              sources={sources}
              subtitles={subtitles}
              poster={t.backdrop || ''}
              heading={episode ? `S${episode.season} E${episode.episode}${episode.name ? `: ${episode.name}` : ''}` : null}
              progressKey={`${t.slug}-${itemId || 'm'}`}
              onEnded={nextEp ? () => pickEpisode(nextEp) : undefined}
            />
            {nextEp && (
              <button type="button" className="btn btn-ghost next-ep" onClick={() => pickEpisode(nextEp)}>
                Next: S{nextEp.season} E{nextEp.episode}{nextEp.name ? ` ${nextEp.name}` : ''} ›
              </button>
            )}
          </section>
        )}

        {trailer && t.trailer && (
          <div className="modal" role="dialog" aria-modal="true" aria-label={`${t.name} trailer`} onClick={() => setTrailer(false)}>
            <div className="modal-box" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="modal-close" onClick={() => setTrailer(false)} aria-label="Close trailer">×</button>
              <TrailerPlayer url={t.trailer} title={`${t.name} trailer`} autoPlay />
            </div>
          </div>
        )}

        {episodic && (
          <section className="episodes">
            <div className="block-head">
              <h2>Episodes</h2>
              {seasons.length > 1 && (
                <div className="chips" role="tablist" aria-label="Seasons">
                  {seasons.map((s) => (
                    <button
                      key={s}
                      type="button"
                      role="tab"
                      aria-selected={s === season}
                      className={`chip ${s === season ? 'on' : ''}`}
                      onClick={() => setParams({ s: String(s), ...(episode ? { ep: String(episode.id) } : {}) }, { replace: true })}
                    >
                      Season {s}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <ol className="ep-list">
              {t.episodes.filter((e) => e.season === season).map((e) => {
                const on = watching && episode?.id === e.id;
                return (
                  <li key={e.id}>
                    <button type="button" className={`ep ${on ? 'on' : ''}`} aria-current={on ? 'true' : undefined} onClick={() => pickEpisode(e)}>
                      {e.thumbnail ? <span className="ep-thumb"><SafeImg src={e.thumbnail} alt="" loading="lazy" /></span> : <span className="ep-no">{e.episode}</span>}
                      <span className="ep-text">
                        <span className="ep-name">{e.thumbnail ? `${e.episode}. ` : ''}{e.name || `Episode ${e.episode}`}</span>
                        {(e.runtime || e.air_date) && <span className="ep-meta">{[e.runtime && `${e.runtime}m`, e.air_date].filter(Boolean).join('  |  ')}</span>}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </section>
        )}

        {t.parts?.length > 0 && (
          <section className="row">
            <div className="row-head"><h2>{t.collection}: all parts</h2></div>
            <div className="row-track">
              {[t, ...t.parts]
                .sort((a, b) => (a.part || 999) - (b.part || 999) || (a.year || 0) - (b.year || 0))
                .map((x) => (x.id === t.id
                  ? <div key={x.slug} className="card card-current"><Poster t={x} /><span className="card-name">{x.name}</span><span className="card-meta">Watching now</span></div>
                  : <TitleCard key={x.slug} t={x} note={x.part ? `Part ${x.part}` : undefined} />))}
            </div>
          </section>
        )}

        {!episodic && !t.parts?.length && withPoster(t.byCast).length > 0 && (
          <Row title={`More with ${t.castShown?.join(' & ') || 'this cast'}`} items={withPoster(t.byCast)} />
        )}
        {withPoster(t.byGenre).length > 0 && <Row title="More like this" items={withPoster(t.byGenre)} />}
      </div>
    </article>
  );
}

export default function Title() {
  const { slug } = useParams();
  return <TitleView slug={slug} />;
}
