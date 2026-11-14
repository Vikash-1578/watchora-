import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { CATEGORIES, ADULT } from '../config.js';

export function Logo({ adult }) {
  return (
    <Link to={adult ? '/18plus' : '/'} className="logo" aria-label="Watchora home">
      <svg viewBox="0 0 64 64" aria-hidden="true">
        <path d="M10 16l9 32 13-24 13 24 9-32" />
      </svg>
      <span>Watchora</span>
      {adult && <span className="logo-tag">18+</span>}
    </Link>
  );
}

export default function Header({ adult }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const [q, setQ] = useState('');
  const activeSub = new URLSearchParams(search).get('sub') || '';

  useEffect(() => {
    const params = new URLSearchParams(search);
    setQ(params.get('q') || '');
  }, [pathname, search]);

  const submit = (e) => {
    e.preventDefault();
    const term = q.trim();
    if (!term) return;
    navigate(adult ? `/18plus?q=${encodeURIComponent(term)}` : `/search?q=${encodeURIComponent(term)}`);
  };

  return (
    <header className="header">
      <div className="header-in">
        <Logo adult={adult} />
        <form className="search" role="search" onSubmit={submit}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="M20 20l-4-4" /></svg>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={adult ? 'Search 18+ titles' : 'Search movies, series, anime…'}
            aria-label="Search"
          />
        </form>
        <NavLink to="/my-list" className="header-link">My list</NavLink>
      </div>
      <nav className="cats" aria-label="Categories">
        {adult ? (
          <>
            <Link to="/" className="cat-link">Back to Watchora</Link>
            <Link to="/18plus" className={`cat-link ${pathname === '/18plus' && !activeSub ? 'active' : ''}`}>All</Link>
            {ADULT.subs.map((s) => (
              <Link
                key={s}
                to={`/18plus?sub=${encodeURIComponent(s)}`}
                className={`cat-link ${activeSub === s ? 'active' : ''}`}
                aria-current={activeSub === s ? 'page' : undefined}
              >
                {s}
              </Link>
            ))}
          </>
        ) : (
          <>
            <NavLink to="/" end className="cat-link">Home</NavLink>
            {CATEGORIES.map((c) => (
              <NavLink key={c.slug} to={`/c/${c.slug}`} className="cat-link">{c.name}</NavLink>
            ))}
          </>
        )}
      </nav>
    </header>
  );
}
