import { Link } from 'react-router-dom';

export default function AgeGate({ onConfirm }) {
  return (
    <div className="gate">
      <div className="gate-box" role="dialog" aria-labelledby="gate-title" aria-modal="true">
        <p className="gate-badge" aria-hidden="true">18+</p>
        <h1 id="gate-title">Are you 18 or older?</h1>
        <p className="muted">
          This section has mature content: strong language, violence and bold scenes. You must be at least 18 years old to enter.
        </p>
        <div className="gate-actions">
          <button type="button" className="btn btn-primary" onClick={onConfirm} autoFocus>I am 18 or older</button>
          <Link to="/" className="btn btn-ghost">Take me back</Link>
        </div>
      </div>
    </div>
  );
}
