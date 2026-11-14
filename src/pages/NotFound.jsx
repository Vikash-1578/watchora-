import { Link } from 'react-router-dom';
import { useTitle } from '../hooks.js';

export default function NotFound() {
  useTitle('Page not found');
  return (
    <div className="page">
      <div className="empty">
        <p className="empty-title">This page doesn't exist</p>
        <p className="muted">The link may be old, or the title was removed.</p>
        <Link to="/" className="btn btn-primary">Go to home</Link>
      </div>
    </div>
  );
}
