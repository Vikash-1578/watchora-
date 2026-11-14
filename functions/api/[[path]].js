// Watchora API — Cloudflare Pages Function, database: D1 (binding name: DB)
// Secrets: ADMIN_PASSWORD (required), TMDB_API_KEY (optional, for auto-fill in admin)

const CATEGORIES = ['movies', 'web-series', 'anime', 'drama', 'serials', 'adult'];
const TOKEN_HOURS = 12;
const PAGE_SIZE = 24;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
const fail = (msg, status = 400) => json({ error: msg }, status);
const cached = (data, seconds = 60) => json(data, 200, { 'Cache-Control': `public, max-age=${seconds}` });

// ---------- helpers ----------
const enc = new TextEncoder();
const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(await crypto.subtle.sign('HMAC', key, enc.encode(msg)));
}

function safeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function makeToken(env) {
  const exp = Date.now() + TOKEN_HOURS * 3600 * 1000;
  return `${exp}.${await hmac(env.ADMIN_PASSWORD, `admin:${exp}`)}`;
}

async function isAdmin(request, env) {
  if (!env.ADMIN_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, await hmac(env.ADMIN_PASSWORD, `admin:${exp}`));
}

const slugify = (s) =>
  String(s || '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);

const isHttpUrl = (u) => {
  try {
    const x = new URL(u);
    return x.protocol === 'https:' || x.protocol === 'http:';
  } catch {
    return false;
  }
};

const str = (v, max = 200) => String(v ?? '').trim().slice(0, max);
const csv = (v, max = 600) =>
  (Array.isArray(v) ? v : String(v ?? '').split(','))
    .map((x) => String(x).trim())
    .filter(Boolean)
    .filter((x, i, a) => a.indexOf(x) === i)
    .join(',')
    .slice(0, max);
const int = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : null;
};
const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.round(n * 10) / 10 : null;
};

const LIST_COLS =
  'id, slug, name, category, subcategory, language, audio, year, certificate, quality, imdb_rating, status, is_adult, poster, backdrop, description, genres';


// Banner (featured) value: 0 = off, 1 = until turned off, any bigger number = unix time (seconds) when it leaves the banner.
function bannerValue(v) {
  if (v === true) return 1;
  const n = Math.floor(Number(v) || 0);
  if (n === 1) return 1;
  return n > Date.now() / 1000 ? n : 0;
}

// ---------- public ----------
async function home(env, url) {
  const adult = url.searchParams.get('adult') === '1' ? 1 : 0;
  const cats = adult ? ['adult'] : CATEGORIES.filter((c) => c !== 'adult');
  const base = `SELECT ${LIST_COLS} FROM titles WHERE published = 1 AND is_adult = ?`;
  const res = await env.DB.batch([
    env.DB.prepare(`${base} AND (featured = 1 OR featured > CAST(strftime('%s','now') AS INTEGER)) ORDER BY updated_at DESC LIMIT 6`).bind(adult),
    env.DB.prepare(`${base} ORDER BY created_at DESC LIMIT 18`).bind(adult),
    env.DB.prepare(`${base} ORDER BY views DESC LIMIT 18`).bind(adult),
    ...cats.map((c) => env.DB.prepare(`${base} AND category = ? ORDER BY created_at DESC LIMIT 18`).bind(adult, c)),
  ]);
  const [featured, latest, popular, ...rows] = res.map((r) => r.results);
  return cached({
    featured: featured.length ? featured : latest.slice(0, 5),
    latest,
    popular,
    categories: Object.fromEntries(cats.map((c, i) => [c, rows[i]])),
  });
}

async function listTitles(env, url) {
  const p = url.searchParams;
  const adult = p.get('adult') === '1' ? 1 : 0;
  const where = ['published = 1', 'is_adult = ?'];
  const args = [adult];

  const category = p.get('category');
  if (category) { where.push('category = ?'); args.push(category); }
  const sub = p.get('sub');
  if (sub) { where.push('subcategory = ?'); args.push(sub); }
  const lang = p.get('lang');
  if (lang) {
    where.push("(language = ? OR (',' || audio || ',') LIKE ?)");
    args.push(lang, `%,${lang},%`);
  }
  const genre = p.get('genre');
  if (genre) { where.push("(',' || genres || ',') LIKE ?"); args.push(`%,${genre},%`); }
  const person = (p.get('person') || '').trim().slice(0, 100);
  if (person) {
    where.push("((',' || cast_list || ',') LIKE ? OR (',' || REPLACE(director, ', ', ',') || ',') LIKE ? OR studio = ?)");
    args.push(`%,${person},%`, `%,${person},%`, person);
  }
  const q = (p.get('q') || '').trim().slice(0, 80);
  if (q) {
    where.push('(name LIKE ? OR original_name LIKE ? OR tags LIKE ? OR genres LIKE ? OR cast_list LIKE ? OR collection LIKE ?)');
    const like = `%${q}%`;
    args.push(like, like, like, like, like, like);
  }

  const sorts = { popular: 'views DESC', year: 'year DESC', rating: 'imdb_rating DESC', name: 'name COLLATE NOCASE ASC' };
  const sort = sorts[p.get('sort')] || 'created_at DESC';
  const page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1);
  const sql = `SELECT ${LIST_COLS} FROM titles WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT ? OFFSET ?`;
  const { results } = await env.DB.prepare(sql).bind(...args, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE).all();

  return cached({ items: results.slice(0, PAGE_SIZE), page, hasMore: results.length > PAGE_SIZE }, 30);
}

async function getTitle(env, key, { admin = false } = {}) {
  const title = await env.DB.prepare(
    `SELECT * FROM titles WHERE ${admin ? 'id' : 'slug'} = ? ${admin ? '' : 'AND published = 1'}`
  ).bind(key).first();
  if (!title) return null;
  const [eps, srcs, subs] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM episodes WHERE title_id = ? ORDER BY season, episode').bind(title.id),
    env.DB.prepare('SELECT id, episode_id, label, url, quality, kind, audio, download_url, size, sort FROM sources WHERE title_id = ? ORDER BY sort, id').bind(title.id),
    env.DB.prepare('SELECT id, episode_id, language, url, sort FROM subtitles WHERE title_id = ? ORDER BY sort, id').bind(title.id),
  ]);
  const out = { ...title, episodes: eps.results, sources: srcs.results, subtitle_files: subs.results };
  if (!admin) {
    out.subtitle_files = subs.results.map((x) => ({ id: x.id, episode_id: x.episode_id, language: x.language, url: `/api/subtitle/${x.id}` }));
    Object.assign(out, await related(env, title));
  }
  return out;
}

// Parts of the same movie series, titles with the same actors, and titles with matching genres
async function related(env, t) {
  const base = `SELECT ${LIST_COLS}, part, collection FROM titles WHERE published = 1 AND is_adult = ? AND id != ?`;
  const parts = t.collection
    ? (await env.DB.prepare(`${base} AND collection = ? ORDER BY COALESCE(part, 999), year`).bind(t.is_adult, t.id, t.collection).all()).results
    : [];
  const skip = new Set(parts.map((x) => x.id));

  const castNames = (t.cast_list || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 5);
  let byCast = [];
  if (castNames.length) {
    const score = castNames.map(() => "(CASE WHEN (',' || cast_list || ',') LIKE ? THEN 1 ELSE 0 END)").join(' + ');
    const likes = castNames.map((n) => `%,${n},%`);
    byCast = (await env.DB.prepare(
      `SELECT * FROM (SELECT ${LIST_COLS}, views, cast_list, (${score}) AS score FROM titles WHERE published = 1 AND is_adult = ? AND id != ?) WHERE score > 0 ORDER BY score DESC, views DESC LIMIT 18`
    ).bind(...likes, t.is_adult, t.id).all()).results.filter((x) => !skip.has(x.id));
  }

  const genres = (t.genres || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 4);
  const gScore = genres.length
    ? genres.map(() => "(CASE WHEN (',' || genres || ',') LIKE ? THEN 2 ELSE 0 END)").join(' + ')
    : '0';
  const byGenre = (await env.DB.prepare(
    `SELECT * FROM (SELECT ${LIST_COLS}, views, (${gScore}) + (CASE WHEN category = ? THEN 1 ELSE 0 END) AS score FROM titles WHERE published = 1 AND is_adult = ? AND id != ?) WHERE score > 0 ORDER BY score DESC, views DESC LIMIT 24`
  ).bind(...genres.map((g) => `%,${g},%`), t.category, t.is_adult, t.id).all()).results
    .filter((x) => !skip.has(x.id))
    .slice(0, 18);

  // which of this title's actors appear in each cast match (for the row heading)
  const castShown = castNames.filter((n) => byCast.some((x) => `,${x.cast_list},`.includes(`,${n},`))).slice(0, 2);
  return {
    parts,
    byCast: byCast.map(({ cast_list: _c, score: _s, views: _v, ...x }) => x),
    castShown,
    byGenre: byGenre.map(({ score: _s, views: _v, ...x }) => x),
  };
}

async function publicTitle(env, slug, ctx) {
  const t = await getTitle(env, slug);
  if (!t) return fail('Title not found', 404);
  ctx.waitUntil(env.DB.prepare('UPDATE titles SET views = views + 1 WHERE id = ?').bind(t.id).run());
  return cached(t, 30);
}

// Subtitle files are fetched here (so any host works) and SRT is turned into WebVTT for the player
function srtToVtt(text) {
  const body = text.replace(/\r/g, '').replace(/^\uFEFF/, '').trim()
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, '$1.$2');
  return body.startsWith('WEBVTT') ? body : `WEBVTT\n\n${body}`;
}

async function subtitleFile(env, id) {
  const row = id ? await env.DB.prepare('SELECT url FROM subtitles WHERE id = ?').bind(id).first() : null;
  if (!row) return fail('Subtitle not found', 404);
  const r = await fetch(row.url, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!r.ok) return fail('Subtitle file could not be loaded', 502);
  const buf = await r.arrayBuffer();
  if (buf.byteLength > 2_000_000) return fail('Subtitle file is too big', 413);
  const text = new TextDecoder('utf-8').decode(buf);
  return new Response(srtToVtt(text), {
    headers: { 'Content-Type': 'text/vtt; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
  });
}

// ---------- admin: titles ----------
function cleanTitle(b) {
  const name = str(b.name);
  if (!name) return { error: 'Name is required' };
  const category = String(b.category || '');
  if (!CATEGORIES.includes(category)) return { error: 'Invalid category' };
  for (const f of ['poster', 'backdrop', 'trailer']) {
    if (b[f] && !isHttpUrl(b[f])) return { error: `${f} must be an http(s) link` };
  }
  const year = int(b.year);
  return {
    data: {
      name,
      original_name: str(b.original_name),
      slug: slugify(b.slug || `${name}${year ? `-${year}` : ''}`) || `title-${Date.now()}`,
      category,
      subcategory: str(b.subcategory, 60),
      language: str(b.language, 40),
      audio: csv(b.audio, 200),
      subtitles: csv(b.subtitles, 200),
      genres: csv(b.genres, 300),
      tags: csv(b.tags, 600),
      year,
      release_date: str(b.release_date, 10),
      runtime: int(b.runtime),
      country: str(b.country, 60),
      certificate: str(b.certificate, 10),
      status: str(b.status, 20),
      quality: str(b.quality, 10),
      imdb_rating: num(b.imdb_rating),
      cast_list: csv(b.cast_list, 1000),
      director: str(b.director, 200),
      studio: str(b.studio, 200),
      is_adult: category === 'adult' ? 1 : 0,
      description: str(b.description, 4000),
      poster: str(b.poster, 500),
      backdrop: str(b.backdrop, 500),
      trailer: str(b.trailer, 300),
      tmdb_id: int(b.tmdb_id),
      collection: str(b.collection, 120),
      part: int(b.part),
      featured: bannerValue(b.featured),
      published: b.published === false || b.published === 0 ? 0 : 1,
    },
  };
}

async function saveTitle(env, body, id) {
  const { data, error } = cleanTitle(body || {});
  if (error) return fail(error);
  const cols = Object.keys(data);
  try {
    if (id) {
      await env.DB.prepare(
        `UPDATE titles SET ${cols.map((c) => `${c} = ?`).join(', ')}, updated_at = datetime('now') WHERE id = ?`
      ).bind(...cols.map((c) => data[c]), id).run();
      return json(await getTitle(env, id, { admin: true }));
    }
    const res = await env.DB.prepare(
      `INSERT INTO titles (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`
    ).bind(...cols.map((c) => data[c])).run();
    return json(await getTitle(env, res.meta.last_row_id, { admin: true }), 201);
  } catch (e) {
    if (String(e).includes('UNIQUE')) return fail('A title with this URL slug already exists. Change the slug.');
    throw e;
  }
}

async function adminList(env, url) {
  const p = url.searchParams;
  const where = [];
  const args = [];
  const q = (p.get('q') || '').trim();
  if (q) { where.push('(t.name LIKE ? OR t.original_name LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  const category = p.get('category');
  if (category) { where.push('t.category = ?'); args.push(category); }
  const filter = p.get('filter');
  if (filter === 'live') where.push('t.published = 1');
  if (filter === 'hidden') where.push('t.published = 0');
  if (filter === 'featured') where.push("(t.featured = 1 OR t.featured > CAST(strftime('%s','now') AS INTEGER))");
  if (filter === 'novideo') where.push('NOT EXISTS (SELECT 1 FROM sources s WHERE s.title_id = t.id)');
  const sorts = { views: 't.views DESC', name: 't.name COLLATE NOCASE ASC', new: 't.created_at DESC' };
  const sort = sorts[p.get('sort')] || 't.updated_at DESC';
  const sql = `SELECT t.id, t.slug, t.name, t.category, t.subcategory, t.year, t.poster, t.featured, t.published, t.views, t.is_adult,
      (SELECT COUNT(*) FROM episodes e WHERE e.title_id = t.id) AS episode_count,
      (SELECT COUNT(*) FROM sources s WHERE s.title_id = t.id) AS source_count
    FROM titles t ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${sort} LIMIT 300`;
  return json({ items: (await env.DB.prepare(sql).bind(...args).all()).results });
}

async function adminStats(env) {
  const [byCat, totals, top, recent] = await env.DB.batch([
    env.DB.prepare('SELECT category, COUNT(*) AS n FROM titles GROUP BY category'),
    env.DB.prepare(`SELECT
        (SELECT COUNT(*) FROM titles) AS titles,
        (SELECT COUNT(*) FROM titles WHERE published = 0) AS hidden,
        (SELECT COUNT(*) FROM titles WHERE (featured = 1 OR featured > CAST(strftime('%s','now') AS INTEGER))) AS featured,
        (SELECT COUNT(*) FROM episodes) AS episodes,
        (SELECT COUNT(*) FROM sources) AS servers,
        (SELECT COALESCE(SUM(views), 0) FROM titles) AS views,
        (SELECT COUNT(*) FROM titles t WHERE NOT EXISTS (SELECT 1 FROM sources s WHERE s.title_id = t.id)) AS novideo,
        (SELECT COUNT(*) FROM episodes e WHERE NOT EXISTS (SELECT 1 FROM sources s WHERE s.episode_id = e.id)) AS episodes_novideo`),
    env.DB.prepare('SELECT id, name, category, views, poster FROM titles ORDER BY views DESC LIMIT 5'),
    env.DB.prepare('SELECT id, name, category, updated_at, poster FROM titles ORDER BY updated_at DESC LIMIT 5'),
  ]);
  return {
    byCategory: Object.fromEntries(byCat.results.map((r) => [r.category, r.n])),
    totals: totals.results[0],
    top: top.results,
    recent: recent.results,
    tmdb: !!env.TMDB_API_KEY,
  };
}

// ---------- admin: episodes ----------
function cleanEpisode(b) {
  return {
    season: int(b.season) || 1,
    episode: int(b.episode),
    name: str(b.name),
    overview: str(b.overview, 2000),
    thumbnail: b.thumbnail && isHttpUrl(b.thumbnail) ? str(b.thumbnail, 500) : '',
    runtime: int(b.runtime),
    air_date: str(b.air_date, 10),
  };
}

const touch = (env, titleId) =>
  env.DB.prepare("UPDATE titles SET updated_at = datetime('now') WHERE id = ?").bind(titleId).run();

async function addEpisodes(env, titleId, items) {
  const clean = items.map(cleanEpisode).filter((e) => e.episode && e.episode > 0).slice(0, 500);
  if (!clean.length) return { added: 0, skipped: items.length };
  const res = await env.DB.batch(
    clean.map((e) =>
      env.DB.prepare(
        'INSERT OR IGNORE INTO episodes (title_id, season, episode, name, overview, thumbnail, runtime, air_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).bind(titleId, e.season, e.episode, e.name, e.overview, e.thumbnail, e.runtime, e.air_date)
    )
  );
  const added = res.reduce((n, r) => n + (r.meta.changes || 0), 0);
  await touch(env, titleId);
  return { added, skipped: items.length - added };
}

// ---------- admin: sources ----------
const sourceKind = (url, given) => {
  if (['embed', 'file', 'hls'].includes(given)) return given;
  const u = String(url || '').split('?')[0].toLowerCase();
  if (u.endsWith('.m3u8')) return 'hls';
  if (/\.(mp4|webm|m4v|mov|ogv|mkv)$/.test(u)) return 'file';
  return 'embed';
};
const sourceExtras = (b) => ({
  audio: str(b.audio, 40),
  download_url: b.download_url && isHttpUrl(b.download_url) ? str(b.download_url, 1000) : '',
  size: str(b.size, 20),
});
async function addSource(env, b) {
  const titleId = Number(b.title_id);
  if (!titleId) return fail('Title is required');
  if (!isHttpUrl(b.url)) return fail('Video embed link must start with http(s)');
  const episodeId = b.episode_id ? Number(b.episode_id) : null;
  const { n } = await env.DB.prepare('SELECT COUNT(*) AS n FROM sources WHERE title_id = ? AND episode_id IS ?')
    .bind(titleId, episodeId).first();
  const x = sourceExtras(b);
  const r = await env.DB.prepare('INSERT INTO sources (title_id, episode_id, label, url, quality, kind, audio, download_url, size, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(titleId, episodeId, str(b.label, 40) || `Server ${n + 1}`, str(b.url, 1000), str(b.quality, 20), sourceKind(b.url, b.kind), x.audio, x.download_url, x.size, n).run();
  await touch(env, titleId);
  return json({ id: r.meta.last_row_id }, 201);
}

// Paste many links at once: link 1 -> start episode, link 2 -> next episode...
async function bulkSources(env, b) {
  const titleId = Number(b.title_id);
  if (!titleId) return fail('Title is required');
  const urls = (Array.isArray(b.urls) ? b.urls : []).map((u) => String(u).trim()).filter(Boolean).slice(0, 300);
  if (!urls.length) return fail('Paste at least one link');
  const bad = urls.find((u) => !isHttpUrl(u));
  if (bad) return fail(`Not a valid link: ${bad.slice(0, 60)}`);
  const season = int(b.season) || 1;
  const start = int(b.start_episode) || 1;
  const end = start + urls.length - 1;

  await addEpisodes(env, titleId, urls.map((_, i) => ({ season, episode: start + i })));
  const [epRes, countRes] = await env.DB.batch([
    env.DB.prepare('SELECT id, episode FROM episodes WHERE title_id = ? AND season = ? AND episode BETWEEN ? AND ?')
      .bind(titleId, season, start, end),
    env.DB.prepare('SELECT episode_id, COUNT(*) AS n FROM sources WHERE title_id = ? AND episode_id IS NOT NULL GROUP BY episode_id')
      .bind(titleId),
  ]);
  const byNo = Object.fromEntries(epRes.results.map((e) => [e.episode, e.id]));
  const have = Object.fromEntries(countRes.results.map((c) => [c.episode_id, c.n]));

  await env.DB.batch(
    urls.map((url, i) => {
      const epId = byNo[start + i];
      const n = have[epId] || 0;
      return env.DB.prepare('INSERT INTO sources (title_id, episode_id, label, url, quality, kind, audio, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(titleId, epId, str(b.label, 40) || `Server ${n + 1}`, url, str(b.quality, 20), sourceKind(url), str(b.audio, 40), n);
    })
  );
  await touch(env, titleId);
  return json({ added: urls.length, from: start, to: end, season });
}

// ---------- admin: TMDB auto-fill (optional) ----------
const TMDB_IMG = 'https://image.tmdb.org/t/p/';
const LANG_NAMES = {
  hi: 'Hindi', en: 'English', ta: 'Tamil', te: 'Telugu', ml: 'Malayalam', kn: 'Kannada', bn: 'Bengali',
  mr: 'Marathi', pa: 'Punjabi', gu: 'Gujarati', ur: 'Urdu', or: 'Odia', as: 'Assamese', ne: 'Nepali',
  si: 'Sinhala', sa: 'Sanskrit', ko: 'Korean', ja: 'Japanese', zh: 'Chinese (Mandarin)', cn: 'Cantonese',
  es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', pt: 'Portuguese', ru: 'Russian', ar: 'Arabic',
  tr: 'Turkish', fa: 'Persian (Farsi)', th: 'Thai', id: 'Indonesian', ms: 'Malay', vi: 'Vietnamese',
  tl: 'Filipino (Tagalog)', he: 'Hebrew', el: 'Greek', nl: 'Dutch', sv: 'Swedish', no: 'Norwegian',
  nb: 'Norwegian', da: 'Danish', fi: 'Finnish', is: 'Icelandic', pl: 'Polish', cs: 'Czech', sk: 'Slovak',
  hu: 'Hungarian', ro: 'Romanian', bg: 'Bulgarian', sr: 'Serbian', hr: 'Croatian', bs: 'Bosnian',
  sl: 'Slovenian', uk: 'Ukrainian', lt: 'Lithuanian', lv: 'Latvian', et: 'Estonian', ka: 'Georgian',
  hy: 'Armenian', az: 'Azerbaijani', kk: 'Kazakh', uz: 'Uzbek', ps: 'Pashto', ku: 'Kurdish',
  my: 'Burmese', km: 'Khmer', lo: 'Lao', mn: 'Mongolian', bo: 'Tibetan', sw: 'Swahili', am: 'Amharic',
  yo: 'Yoruba', ig: 'Igbo', ha: 'Hausa', zu: 'Zulu', xh: 'Xhosa', af: 'Afrikaans', so: 'Somali',
  ga: 'Irish', cy: 'Welsh', eu: 'Basque', ca: 'Catalan', gl: 'Galician', la: 'Latin', mi: 'Maori',
};
const GENRE_MAP = {
  'Science Fiction': ['Sci-Fi'], 'Sci-Fi & Fantasy': ['Sci-Fi', 'Fantasy'], 'Action & Adventure': ['Action', 'Adventure'],
  Kids: ['Family'], Family: ['Family'], Action: ['Action'], Adventure: ['Adventure'], Animation: ['Animation'],
  Comedy: ['Comedy'], Crime: ['Crime'], Documentary: ['Documentary'], Drama: ['Drama'], Fantasy: ['Fantasy'],
  Horror: ['Horror'], Mystery: ['Mystery'], Romance: ['Romance'], Thriller: ['Thriller'],
};
const STATUS_MAP = {
  'Returning Series': 'Ongoing', Ended: 'Completed', Canceled: 'Completed', Released: 'Released',
  'In Production': 'Upcoming', Planned: 'Upcoming', 'Post Production': 'Upcoming',
};

async function tmdb(env, path, params = {}) {
  const key = env.TMDB_API_KEY;
  const u = new URL(`https://api.themoviedb.org/3${path}`);
  Object.entries({ language: 'en-US', ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
  const headers = { Accept: 'application/json' };
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  else u.searchParams.set('api_key', key);
  const r = await fetch(u, { headers });
  if (!r.ok) throw new Error(r.status === 401 ? 'TMDB key is not valid' : `TMDB error ${r.status}`);
  return r.json();
}

async function tmdbRoute(env, parts, url) {
  if (!env.TMDB_API_KEY) return fail('Auto-fill is off. Add a TMDB_API_KEY secret in Cloudflare to turn it on.', 501);
  const p = url.searchParams;
  const action = parts[0];

  if (action === 'search') {
    const q = (p.get('q') || '').trim();
    if (!q) return json({ items: [] });
    const data = await tmdb(env, '/search/multi', { query: q, include_adult: 'false' });
    return json({
      items: data.results
        .filter((r) => r.media_type === 'movie' || r.media_type === 'tv')
        .slice(0, 12)
        .map((r) => ({
          id: r.id,
          type: r.media_type,
          name: r.title || r.name,
          year: (r.release_date || r.first_air_date || '').slice(0, 4),
          language: LANG_NAMES[r.original_language] || r.original_language,
          poster: r.poster_path ? `${TMDB_IMG}w185${r.poster_path}` : '',
          overview: (r.overview || '').slice(0, 160),
        })),
    });
  }

  if (action === 'details') {
    const type = p.get('type') === 'tv' ? 'tv' : 'movie';
    const id = int(p.get('id'));
    if (!id) return fail('Missing TMDB id');
    const d = await tmdb(env, `/${type}/${id}`, {
      append_to_response: type === 'tv' ? 'credits,videos,content_ratings' : 'credits,videos,release_dates',
    });
    const genres = [...new Set((d.genres || []).flatMap((g) => GENRE_MAP[g.name] || []))];
    const vids = d.videos?.results || [];
    const trailer = vids.find((v) => v.site === 'YouTube' && v.type === 'Trailer') || vids.find((v) => v.site === 'YouTube');
    const date = d.release_date || d.first_air_date || '';
    let certificate = '';
    if (type === 'movie') {
      const rel = (d.release_dates?.results || []).find((r) => r.iso_3166_1 === 'IN');
      certificate = rel?.release_dates?.find((x) => x.certification)?.certification || '';
    } else {
      certificate = (d.content_ratings?.results || []).find((r) => r.iso_3166_1 === 'IN')?.rating || '';
    }
    const director = type === 'movie'
      ? (d.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name).join(', ')
      : (d.created_by || []).map((c) => c.name).join(', ');
    const name = d.title || d.name;
    const original = d.original_title || d.original_name || '';
    return json({
      tmdb_id: d.id,
      type,
      name,
      original_name: original !== name ? original : '',
      year: date.slice(0, 4),
      release_date: date,
      runtime: d.runtime || d.episode_run_time?.[0] || '',
      language: LANG_NAMES[d.original_language] || 'Other',
      country: d.production_countries?.[0]?.name || d.origin_country?.[0] || '',
      genres: genres.join(','),
      description: d.overview || '',
      poster: d.poster_path ? `${TMDB_IMG}w500${d.poster_path}` : '',
      backdrop: d.backdrop_path ? `${TMDB_IMG}w1280${d.backdrop_path}` : '',
      trailer: trailer ? `https://www.youtube.com/watch?v=${trailer.key}` : '',
      imdb_rating: d.vote_average ? Math.round(d.vote_average * 10) / 10 : '',
      cast_list: (d.credits?.cast || []).slice(0, 10).map((c) => c.name).join(','),
      director,
      studio: d.production_companies?.[0]?.name || d.networks?.[0]?.name || '',
      status: STATUS_MAP[d.status] || '',
      certificate,
      collection: d.belongs_to_collection?.name ? d.belongs_to_collection.name.replace(/\s*Collection$/i, '') : '',
      seasons: type === 'tv'
        ? (d.seasons || []).filter((s) => s.season_number > 0).map((s) => ({ season: s.season_number, name: s.name, episodes: s.episode_count }))
        : [],
    });
  }

  if (action === 'season') {
    const id = int(p.get('id'));
    const season = int(p.get('season'));
    if (!id || !season) return fail('Missing TMDB id or season');
    const d = await tmdb(env, `/tv/${id}/season/${season}`);
    return json({
      items: (d.episodes || []).map((e) => ({
        season,
        episode: e.episode_number,
        name: e.name || '',
        overview: e.overview || '',
        thumbnail: e.still_path ? `${TMDB_IMG}w300${e.still_path}` : '',
        runtime: e.runtime || '',
        air_date: e.air_date || '',
      })),
    });
  }
  return fail('Not found', 404);
}

// ---------- admin router ----------
async function admin(env, request, parts, url) {
  const method = request.method;
  const [resource, id, sub] = parts;
  const body = method === 'POST' || method === 'PUT' ? await request.json().catch(() => ({})) : {};

  if (resource === 'stats' && method === 'GET') return json(await adminStats(env));
  if (resource === 'tmdb' && method === 'GET') return tmdbRoute(env, parts.slice(1), url);

  if (resource === 'titles') {
    if (!id && method === 'GET') return adminList(env, url);
    if (!id && method === 'POST') return saveTitle(env, body);
    if (id && sub === 'flags' && method === 'PUT') {
      const sets = [];
      const args = [];
      if ('featured' in body) { sets.push('featured = ?'); args.push(bannerValue(body.featured)); }
      if ('published' in body) { sets.push('published = ?'); args.push(body.published ? 1 : 0); }
      if (!sets.length) return fail('Nothing to change');
      await env.DB.prepare(`UPDATE titles SET ${sets.join(', ')}, updated_at = datetime('now') WHERE id = ?`).bind(...args, Number(id)).run();
      return json({ ok: true });
    }
    if (id && method === 'GET') {
      const t = await getTitle(env, Number(id), { admin: true });
      return t ? json(t) : fail('Title not found', 404);
    }
    if (id && method === 'PUT') return saveTitle(env, body, Number(id));
    if (id && method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sources WHERE title_id = ?').bind(Number(id)),
        env.DB.prepare('DELETE FROM subtitles WHERE title_id = ?').bind(Number(id)),
        env.DB.prepare('DELETE FROM episodes WHERE title_id = ?').bind(Number(id)),
        env.DB.prepare('DELETE FROM titles WHERE id = ?').bind(Number(id)),
      ]);
      return json({ ok: true });
    }
  }

  if (resource === 'episodes') {
    if (id === 'bulk' && method === 'POST') {
      const titleId = Number(body.title_id);
      if (!titleId) return fail('Title is required');
      return json(await addEpisodes(env, titleId, Array.isArray(body.items) ? body.items : []));
    }
    if (!id && method === 'POST') {
      const titleId = Number(body.title_id);
      const e = cleanEpisode(body);
      if (!titleId || !e.episode) return fail('Title and episode number are required');
      try {
        const r = await env.DB.prepare(
          'INSERT INTO episodes (title_id, season, episode, name, overview, thumbnail, runtime, air_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        ).bind(titleId, e.season, e.episode, e.name, e.overview, e.thumbnail, e.runtime, e.air_date).run();
        await touch(env, titleId);
        return json({ id: r.meta.last_row_id }, 201);
      } catch (err) {
        if (String(err).includes('UNIQUE')) return fail(`Season ${e.season} Episode ${e.episode} already exists`);
        throw err;
      }
    }
    if (id && method === 'PUT') {
      const e = cleanEpisode({ ...body, episode: 1 });
      await env.DB.prepare('UPDATE episodes SET name = ?, overview = ?, thumbnail = ?, runtime = ?, air_date = ? WHERE id = ?')
        .bind(e.name, e.overview, e.thumbnail, e.runtime, e.air_date, Number(id)).run();
      return json({ ok: true });
    }
    if (id && method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sources WHERE episode_id = ?').bind(Number(id)),
        env.DB.prepare('DELETE FROM subtitles WHERE episode_id = ?').bind(Number(id)),
        env.DB.prepare('DELETE FROM episodes WHERE id = ?').bind(Number(id)),
      ]);
      return json({ ok: true });
    }
  }

  if (resource === 'subtitles') {
    if (!id && method === 'POST') {
      const titleId = Number(body.title_id);
      if (!titleId) return fail('Title is required');
      if (!isHttpUrl(body.url)) return fail('Subtitle link must start with http(s)');
      const language = str(body.language, 40);
      if (!language) return fail('Choose the subtitle language');
      const r = await env.DB.prepare('INSERT INTO subtitles (title_id, episode_id, language, url) VALUES (?, ?, ?, ?)')
        .bind(titleId, body.episode_id ? Number(body.episode_id) : null, language, str(body.url, 1000)).run();
      return json({ id: r.meta.last_row_id }, 201);
    }
    if (id && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM subtitles WHERE id = ?').bind(Number(id)).run();
      return json({ ok: true });
    }
  }

  if (resource === 'suggest' && method === 'GET') {
    const { results } = await env.DB.prepare("SELECT cast_list, director, studio, collection FROM titles").all();
    const people = new Set();
    const studios = new Set();
    const collections = new Set();
    results.forEach((r) => {
      (r.cast_list || '').split(',').forEach((n) => n.trim() && people.add(n.trim()));
      (r.director || '').split(',').forEach((n) => n.trim() && people.add(n.trim()));
      if (r.studio) studios.add(r.studio);
      if (r.collection) collections.add(r.collection);
    });
    const sort = (x) => [...x].sort((a, b) => a.localeCompare(b));
    return json({ people: sort(people), studios: sort(studios), collections: sort(collections) });
  }

  if (resource === 'sources') {
    if (id === 'bulk' && method === 'POST') return bulkSources(env, body);
    if (!id && method === 'POST') return addSource(env, body);
    if (id && method === 'PUT') {
      if (body.url !== undefined && !isHttpUrl(body.url)) return fail('Video embed link must start with http(s)');
      const sets = [];
      const args = [];
      if (body.label !== undefined) { sets.push('label = ?'); args.push(str(body.label, 40) || 'Server'); }
      if (body.url !== undefined) { sets.push('url = ?', 'kind = ?'); args.push(str(body.url, 1000), sourceKind(body.url, body.kind)); }
      if (body.audio !== undefined) { sets.push('audio = ?'); args.push(str(body.audio, 40)); }
      if (body.size !== undefined) { sets.push('size = ?'); args.push(str(body.size, 20)); }
      if (body.download_url !== undefined) {
        if (body.download_url && !isHttpUrl(body.download_url)) return fail('Download link must start with http(s)');
        sets.push('download_url = ?'); args.push(str(body.download_url, 1000));
      }
      if (body.quality !== undefined) { sets.push('quality = ?'); args.push(str(body.quality, 20)); }
      if (body.sort !== undefined) { sets.push('sort = ?'); args.push(int(body.sort) || 0); }
      if (!sets.length) return fail('Nothing to change');
      await env.DB.prepare(`UPDATE sources SET ${sets.join(', ')} WHERE id = ?`).bind(...args, Number(id)).run();
      return json({ ok: true });
    }
    if (id && method === 'DELETE') {
      await env.DB.prepare('DELETE FROM sources WHERE id = ?').bind(Number(id)).run();
      return json({ ok: true });
    }
  }

  return fail('Not found', 404);
}

// ---------- router ----------
export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean);

  if (!env.DB) return fail('Database binding (DB) is not configured', 500);

  try {
    if (parts[0] === 'admin') {
      if (parts[1] === 'login' && request.method === 'POST') {
        if (!env.ADMIN_PASSWORD) return fail('ADMIN_PASSWORD is not configured', 500);
        const { password } = await request.json().catch(() => ({}));
        if (!safeEqual(String(password || ''), env.ADMIN_PASSWORD)) {
          await new Promise((r) => setTimeout(r, 800)); // slow down wrong guesses
          return fail('Wrong password', 401);
        }
        return json({ token: await makeToken(env) });
      }
      if (!(await isAdmin(request, env))) return fail('Please log in', 401);
      return await admin(env, request, parts.slice(1), url);
    }

    if (request.method !== 'GET') return fail('Method not allowed', 405);
    if (parts[0] === 'home') return await home(env, url);
    if (parts[0] === 'titles' && !parts[1]) return await listTitles(env, url);
    if (parts[0] === 'titles' && parts[1]) return await publicTitle(env, decodeURIComponent(parts[1]), context);
    if (parts[0] === 'subtitle' && parts[1]) return await subtitleFile(env, Number(parts[1]));
    return fail('Not found', 404);
  } catch (e) {
    console.error(e);
    const msg = String(e?.message || '');
    if (msg.includes('no such column')) return fail('Database needs an update. Run the newest file in the migrations folder in the D1 console.', 500);
    if (msg.startsWith('TMDB')) return fail(msg, 502);
    return fail('Server error. Try again in a moment.', 500);
  }
}
