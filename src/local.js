// No accounts: history, watchlist and the 18+ confirmation live in the viewer's browser.
const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
};

const pick = (t) => ({
  slug: t.slug, name: t.name, poster: t.poster, year: t.year, category: t.category, is_adult: t.is_adult,
});

export const history = {
  list: () => read('wc_history', []),
  add: (title, episode) => {
    const rest = history.list().filter((h) => h.slug !== title.slug);
    const entry = { ...pick(title), episodeId: episode?.id || null, episodeLabel: episode ? `S${episode.season} E${episode.episode}` : null, at: Date.now() };
    write('wc_history', [entry, ...rest].slice(0, 30));
  },
  remove: (slug) => write('wc_history', history.list().filter((h) => h.slug !== slug)),
};

export const watchlist = {
  list: () => read('wc_watchlist', []),
  has: (slug) => watchlist.list().some((w) => w.slug === slug),
  toggle: (title) => {
    const list = watchlist.list();
    if (list.some((w) => w.slug === title.slug)) {
      write('wc_watchlist', list.filter((w) => w.slug !== title.slug));
      return false;
    }
    write('wc_watchlist', [pick(title), ...list].slice(0, 200));
    return true;
  },
};

export const ageGate = {
  ok: () => read('wc_age_ok', false) === true,
  confirm: () => write('wc_age_ok', true),
};
