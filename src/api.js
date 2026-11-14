const TOKEN_KEY = 'watchora_admin_token';

export const adminToken = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
};

async function request(path, { method = 'GET', body, admin = false } = {}) {
  const headers = {};
  if (body) headers['Content-Type'] = 'application/json';
  if (admin) headers.Authorization = `Bearer ${adminToken.get() || ''}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* empty */ }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

const qs = (params) => {
  const p = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') p.set(k, v);
  });
  const s = p.toString();
  return s ? `?${s}` : '';
};

export const api = {
  home: (adult) => request(`/home${qs({ adult: adult ? 1 : '' })}`),
  titles: (params) => request(`/titles${qs(params)}`),
  title: (slug) => request(`/titles/${encodeURIComponent(slug)}`),

  login: (password) => request('/admin/login', { method: 'POST', body: { password } }),
  stats: () => request('/admin/stats', { admin: true }),
  adminTitles: (params = {}) => request(`/admin/titles${qs(params)}`, { admin: true }),
  adminTitle: (id) => request(`/admin/titles/${id}`, { admin: true }),
  saveTitle: (t) =>
    t.id
      ? request(`/admin/titles/${t.id}`, { method: 'PUT', body: t, admin: true })
      : request('/admin/titles', { method: 'POST', body: t, admin: true }),
  setFlags: (id, flags) => request(`/admin/titles/${id}/flags`, { method: 'PUT', body: flags, admin: true }),
  deleteTitle: (id) => request(`/admin/titles/${id}`, { method: 'DELETE', admin: true }),
  addEpisode: (e) => request('/admin/episodes', { method: 'POST', body: e, admin: true }),
  addEpisodes: (title_id, items) => request('/admin/episodes/bulk', { method: 'POST', body: { title_id, items }, admin: true }),
  updateEpisode: (id, e) => request(`/admin/episodes/${id}`, { method: 'PUT', body: e, admin: true }),
  deleteEpisode: (id) => request(`/admin/episodes/${id}`, { method: 'DELETE', admin: true }),
  addSource: (s) => request('/admin/sources', { method: 'POST', body: s, admin: true }),
  addSources: (b) => request('/admin/sources/bulk', { method: 'POST', body: b, admin: true }),
  updateSource: (id, s) => request(`/admin/sources/${id}`, { method: 'PUT', body: s, admin: true }),
  deleteSource: (id) => request(`/admin/sources/${id}`, { method: 'DELETE', admin: true }),
  tmdbSearch: (q) => request(`/admin/tmdb/search${qs({ q })}`, { admin: true }),
  tmdbDetails: (type, id) => request(`/admin/tmdb/details${qs({ type, id })}`, { admin: true }),
  tmdbSeason: (id, season) => request(`/admin/tmdb/season${qs({ id, season })}`, { admin: true }),
};
