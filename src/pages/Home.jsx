import { useMemo } from 'react';
import { api } from '../api.js';
import { useLoad, useTitle } from '../hooks.js';
import { CATEGORIES } from '../config.js';
import { history } from '../local.js';
import Hero from '../components/Hero.jsx';
import { Row, Empty, TitleCard } from '../components/Cards.jsx';

export default function Home() {
  useTitle('');
  const { data, error, loading } = useLoad(() => api.home(false), []);
  const recent = useMemo(() => history.list().filter((h) => !h.is_adult).slice(0, 18), []);

  if (loading) return <div className="page"><div className="hero skeleton" /></div>;
  if (error) return <div className="page"><Empty title="Couldn't load Watchora">{error.message}</Empty></div>;

  const nothing = !data.latest.length;

  return (
    <>
      <Hero items={data.featured} />
      <div className="page rows">
        {nothing && (
          <Empty title="Nothing to watch yet">
            New movies and shows are on the way. Check back soon.
          </Empty>
        )}
        {recent.length > 0 && (
          <section className="row">
            <div className="row-head"><h2>Continue watching</h2></div>
            <div className="row-track">
              {recent.map((t) => <TitleCard key={t.slug} t={t} note={t.episodeLabel || 'Resume'} />)}
            </div>
          </section>
        )}
        <Row title="Just added" items={data.latest} />
        <Row title="Most watched" items={data.popular} />
        {CATEGORIES.map((c) => (
          <Row key={c.slug} title={c.name} items={data.categories[c.slug]} to={`/c/${c.slug}`} />
        ))}
      </div>
    </>
  );
}
