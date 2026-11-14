import { useParams } from 'react-router-dom';
import { CATEGORIES } from '../config.js';
import { useTitle } from '../hooks.js';
import Browse from './Browse.jsx';
import NotFound from './NotFound.jsx';

export default function Category() {
  const { cat } = useParams();
  const c = CATEGORIES.find((x) => x.slug === cat);
  useTitle(c?.name);
  if (!c) return <NotFound />;

  return (
    <div className="page">
      <header className="page-head">
        <h1>{c.name}</h1>
        <p className="muted">{c.blurb}</p>
      </header>
      <Browse key={c.slug} category={c.slug} subs={c.subs} />
    </div>
  );
}
