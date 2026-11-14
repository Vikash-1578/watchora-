import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, adminToken } from '../api.js';
import { useTitle } from '../hooks.js';
import { Logo } from '../components/Header.jsx';
import { ToastProvider } from '../admin/ui.jsx';
import Dashboard from '../admin/Dashboard.jsx';
import TitleList from '../admin/TitleList.jsx';
import TitleEditor from '../admin/TitleEditor.jsx';
import '../admin/admin.css';

export default function Admin() {
  useTitle('Admin');
  const [authed, setAuthed] = useState(() => !!adminToken.get());
  if (!authed) return <Login onDone={() => setAuthed(true)} />;
  return (
    <ToastProvider>
      <Shell onLogout={() => { adminToken.clear(); setAuthed(false); }} />
    </ToastProvider>
  );
}

function Shell({ onLogout }) {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') || 'dashboard';
  const id = Number(params.get('id')) || null;
  const [tmdb, setTmdb] = useState(false);

  useEffect(() => { api.stats().then((s) => setTmdb(!!s.tmdb)).catch(() => {}); }, []);

  const onAuthError = (e) => { if (e?.status === 401) onLogout(); };

  // go('list', {filter}), go('edit', id), go('new'), go('dashboard')
  const go = (v, arg, replace) => {
    const p = new URLSearchParams({ view: v });
    if (v === 'edit' && arg) p.set('id', arg);
    if (v === 'list' && arg) Object.entries(arg).forEach(([k, val]) => val && p.set(k, val));
    setParams(p, { replace: !!replace });
    window.scrollTo(0, 0);
  };

  const tabs = [
    ['dashboard', 'Dashboard'],
    ['list', 'Titles'],
    ['new', 'Add title'],
  ];

  return (
    <div className="admin">
      <header className="admin-bar">
        <Logo />
        <nav className="admin-tabs" aria-label="Admin">
          {tabs.map(([k, label]) => (
            <button key={k} type="button" className={`admin-tab ${view === k || (k === 'list' && view === 'edit') ? 'on' : ''}`} onClick={() => go(k)}>
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-bar-right">
          <Link to="/" className="header-link" target="_blank">View site ↗</Link>
          <button type="button" className="link-btn" onClick={onLogout}>Log out</button>
        </div>
      </header>
      <div className="page admin-page">
        {view === 'dashboard' && <Dashboard go={go} onAuthError={onAuthError} />}
        {view === 'list' && (
          <TitleList
            key={params.toString()}
            initial={{ category: params.get('category') || '', filter: params.get('filter') || '' }}
            go={go}
            onAuthError={onAuthError}
          />
        )}
        {view === 'new' && <TitleEditor key="new" id={null} go={go} onAuthError={onAuthError} tmdbEnabled={tmdb} />}
        {view === 'edit' && id && <TitleEditor key={id} id={id} go={go} onAuthError={onAuthError} tmdbEnabled={tmdb} />}
      </div>
    </div>
  );
}

function Login({ onDone }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token } = await api.login(password);
      adminToken.set(token);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="gate">
      <form className="gate-box" onSubmit={submit}>
        <Logo />
        <h1>Admin login</h1>
        <label className="field">
          <span className="field-label">Password</span>
          <input className="a-input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" autoFocus required />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
      </form>
    </div>
  );
}
