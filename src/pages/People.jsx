import { useParams } from 'react-router-dom';
import { useTitle } from '../hooks.js';
import { CATEGORIES } from '../config.js';
import Browse from './Browse.jsx';

// All titles with one actor, director or studio
export function Person() {
  const { name } = useParams();
  const person = decodeURIComponent(name || '');
  useTitle(person);
  return (
    <div className="page">
      <header className="page-head">
        <p className="muted">Movies and shows with</p>
        <h1>{person}</h1>
      </header>
      <Browse key={person} person={person} categoryChips={CATEGORIES} emptyText="Nothing with this name yet." />
    </div>
  );
}

// All titles in one genre, from every category
export function Genre() {
  const { name } = useParams();
  const genre = decodeURIComponent(name || '');
  useTitle(`${genre} movies and shows`);
  return (
    <div className="page">
      <header className="page-head">
        <h1>{genre}</h1>
        <p className="muted">{genre} movies, web series, anime, drama and serials.</p>
      </header>
      <BrowseByCategory genre={genre} />
    </div>
  );
}

function BrowseByCategory({ genre }) {
  return <Browse key={genre} fixedGenre={genre} subs={[]} categoryChips={CATEGORIES} />;
}
