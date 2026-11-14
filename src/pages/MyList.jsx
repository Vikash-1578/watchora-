import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTitle } from '../hooks.js';
import { history, watchlist } from '../local.js';
import { Grid, Empty, TitleCard } from '../components/Cards.jsx';

export default function MyList() {
  useTitle('My list');
  const [list] = useState(() => watchlist.list().filter((t) => !t.is_adult));
  const [recent, setRecent] = useState(() => history.list().filter((t) => !t.is_adult));

  return (
    <div className="page">
      <header className="page-head">
        <h1>My list</h1>
        <p className="muted">Saved on this device only. Clearing your browser data removes it.</p>
      </header>

      <section className="block">
        <h2>Saved</h2>
        {list.length ? <Grid items={list} /> : (
          <Empty title="You haven't saved anything yet">
            Press <strong>Add to my list</strong> on any title to keep it here. <Link to="/">Browse titles</Link>
          </Empty>
        )}
      </section>

      <section className="block">
        <div className="block-head">
          <h2>Recently watched</h2>
          {recent.length > 0 && (
            <button type="button" className="link-btn" onClick={() => { recent.forEach((r) => history.remove(r.slug)); setRecent([]); }}>
              Clear history
            </button>
          )}
        </div>
        {recent.length ? (
          <div className="grid">
            {recent.map((t) => <TitleCard key={t.slug} t={t} note={t.episodeLabel || 'Resume'} />)}
          </div>
        ) : <Empty title="No watch history yet" />}
      </section>
    </div>
  );
}
