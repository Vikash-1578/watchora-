import { Link } from 'react-router-dom';
import { CATEGORIES } from '../config.js';

export default function Footer({ adult }) {
  return (
    <footer className="footer">
      <div className="footer-in">
        <div>
          <p className="footer-brand">Watchora</p>
          <p className="muted small">Movies, web series, anime, drama and serials. No sign-up needed.</p>
        </div>
        <nav aria-label="Browse">
          <p className="footer-head">Browse</p>
          {CATEGORIES.map((c) => <Link key={c.slug} to={`/c/${c.slug}`}>{c.name}</Link>)}
        </nav>
        <nav aria-label="Watchora">
          <p className="footer-head">Watchora</p>
          <Link to="/about">About</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy policy</Link>
          <Link to="/dmca">DMCA &amp; copyright</Link>
          {!adult && <Link to="/18plus" className="footer-adult">18+ section</Link>}
        </nav>
      </div>
      <p className="footer-legal small muted">
        © {new Date().getFullYear()} Watchora. Videos are embedded from third-party hosts. See our <Link to="/dmca">DMCA policy</Link> to report content.
      </p>
    </footer>
  );
}
