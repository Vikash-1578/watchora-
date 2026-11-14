import { useEffect, useState } from 'react';

// Loads data from an async function; re-runs when deps change.
export function useLoad(fn, deps) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true, error: null }));
    fn()
      .then((data) => alive && setState({ data, error: null, loading: false }))
      .catch((error) => alive && setState({ data: null, error, loading: false }));
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}

export function useTitle(text) {
  useEffect(() => {
    document.title = text ? `${text} | Watchora` : 'Watchora — Movies, Web Series, Anime, Drama & Serials';
  }, [text]);
}
