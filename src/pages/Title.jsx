import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import { catBySlug, isEpisodic } from '../config.js';
import { history, watchlist } from '../local.js';
import { Poster, Empty, SafeImg } from '../components/Cards.jsx';
import Player from '../components/Player.jsx';
import NotFound from './NotFound.jsx';

export function TitleView({ slug, adult = false }) {
  const { data: t, error, loading } = useLoad(() => api.title(slug), [slug]);
  const [params, setParams] = useSearchParams();
  const [saved, setSaved] = useState(false);
  useTitle(t?.name);

  useEffect(() => { if (t) setSaved(watchlist.has(t.slug)); }, [t]);

  const seasons = useMemo(() => {
    if (!t) return [];
    return [...new Set(t.episodes.map((e) => e.season))];
  }, [t]);

  if (loading) return <div className="page"><div className="detail skeleton" style={{ height: 420 }} /></div>;
  if (error?.status === 404) return <NotFound />;
  if (error) return <div className="page"><Empty title="Couldn't load this title">{error.message}</Empty></div>;

  // 18+ titles only open inside the 18+ section
  if (t.is_adult && !adult) return <Navigate to={`/18plus/title/${t.slug}`} replace />;
  if (!t.is_adult && adult) return <Navigate to={`/title/${t.slug}`} replace />;

  const episodic = isEpisodic(t) && t.episodes.length > 0;
  const epId = Number(params.get('ep')) || null;
  const episode = episodic ? t.episodes.find((e) => e.id === epId) || t.episodes[0] : null;
  const season = Number(params.get('s')) || episode?.season || seasons[0];
  const sources = t.sources.filter((s) => (episodic ? s.episode_id === episode.id : !s.episode_id));
  const cat = catBySlug(t.category);
  const genres = t.genres ? t.genres.split(',') : [];

  const pickEpisode = (e) => {
    setParams({ s: String(e.season), ep: String(e.id) }, { replace: true });
    document.getElementById('watch')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <article className="detail">
      {(t.backdrop || t.poster) && (
        <div className="detail-bg" aria-hidden="true"><SafeImg src={t.backdrop || t.poster} alt="" /></div>
      )}
      <div className="page">
        <div className="detail-top">
          <Poster t={t} size="lg" />
          <div className="detail-info">
            <p className="crumbs">
              <Link to={adult ? '/18plus' : `/c/${t.category}`}>{cat?.name}</Link>
              {t.subcategory && <> / <Link to={`${adult ? '/18plus' : `/c/${t.category}`}?sub=${encodeURIComponent(t.subcategory)}`}>{t.subcategory}</Link></>}
            </p>
            <h1 className="detail-title">{t.name}</h1>
            <ul className="facts">
              {t.year && <li>{t.year}</li>}
              {t.language && <li>{t.language}</li>}
              {t.certificate && <li className="cert">{t.certificate}</li>}
              {episodic && <li>{seasons.length} season{seasons.length > 1 ? 's' : ''}, {t.episodes.length} episode{t.episodes.length > 1 ? 's' : ''}</li>}
            </ul>
            {genres.length > 0 && (
              <p className="genres">{genres.join(', ')}</p>
            )}
            {t.description && <p className="detail-desc">{t.description}</p>}
            <div className="hero-actions">
              <a href="#watch" className="btn btn-primary">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z" /></svg>
                {episode ? `Play S${episode.season} E${episode.episode}` : 'Play'}
              </a>
              <button type="button" className="btn btn-ghost" aria-pressed={saved} onClick={() => setSaved(watchlist.toggle(t))}>
                {saved ? 'Saved to my list' : 'Add to my list'}
              </button>
            </div>
          </div>
        </div>

        <section id="watch" className="watch">
          <PlayerWithHistory
            t={t}
            episode={episode}
            sources={sources}
            heading={episode ? `S${episode.season} E${episode.episode}${episode.name ? `: ${episode.name}` : ''}` : t.name}
          />
        </section>

        {episodic && (
          <section className="episodes">
            <div className="block-head">
              <h2>Episodes</h2>
              {seasons.length > 1 && (
                <label>
                  <span className="sr">Season</span>
                  <select
                    value={season}
                    onChange={(e) => setParams({ s: e.target.value, ...(episode ? { ep: String(episode.id) } : {}) }, { replace: true })}
                  >
                    {seasons.map((s) => <option key={s} value={s}>Season {s}</option>)}
                  </select>
                </label>
              )}
            </div>
            <ol className="ep-list">
              {t.episodes.filter((e) => e.season === season).map((e) => (
                <li key={e.id}>
                  <button
                    type="button"
                    className={`ep ${episode?.id === e.id ? 'on' : ''}`}
                    aria-current={episode?.id === e.id ? 'true' : undefined}
                    onClick={() => pickEpisode(e)}
                  >
                    <span className="ep-no">{e.episode}</span>
                    <span className="ep-name">{e.name || `Episode ${e.episode}`}</span>
                  </button>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </article>
  );
}

function PlayerWithHistory({ t, episode, sources, heading }) {
  useEffect(() => { history.add(t, episode); }, [t, episode]);
  return <Player sources={sources} heading={heading} />;
}

export default function Title() {
  const { slug } = useParams();
  return <TitleView slug={slug} />;
}
