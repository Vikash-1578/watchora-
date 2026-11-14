import { useSearchParams } from 'react-router-dom';
import { useTitle } from '../hooks.js';
import { Empty } from '../components/Cards.jsx';
import Browse from './Browse.jsx';

export default function Search() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();
  useTitle(q ? `Search: ${q}` : 'Search');

  return (
    <div className="page">
      <header className="page-head">
        <h1>{q ? `Results for “${q}”` : 'Search'}</h1>
      </header>
      {q ? (
        <Browse q={q} emptyText="Check the spelling, or try a shorter name." />
      ) : (
        <Empty title="Type a name in the search box">Search by movie, series, anime or drama name.</Empty>
      )}
    </div>
  );
}
