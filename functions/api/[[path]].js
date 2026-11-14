// Watchora API — Cloudflare Pages Function, database: D1 (binding name: DB)
// Admin password: environment secret ADMIN_PASSWORD

const CATEGORIES = ['movies', 'web-series', 'anime', 'drama', 'serials', 'adult'];
const TOKEN_HOURS = 12;
const PAGE_SIZE = 24;

const json = (data, status = 200, extra = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
const fail = (msg, status = 400) => json({ error: msg }, status);
const cached = (data, seconds = 60) =>
  json(data, 200, { 'Cache-Control': `public, max-age=${seconds}` });

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

const LIST_COLS = 'id, slug, name, category, subcategory, language, year, certificate, is_adult, poster, backdrop, description, genres';

// ---------- public ----------
async function home(env, url) {
  const adult = url.searchParams.get('adult') === '1' ? 1 : 0;
  const featured = await env.DB.prepare(
    `SELECT ${LIST_COLS} FROM titles WHERE published = 1 AND is_adult = ? AND featured = 1 ORDER BY updated_at DESC LIMIT 6`
  ).bind(adult).all();

  const latest = await env.DB.prepare(
    `SELECT ${LIST_COLS} FROM titles WHERE published = 1 AND is_adult = ? ORDER BY created_at DESC LIMIT 18`
  ).bind(adult).all();

  const cats = adult ? ['adult'] : CATEGORIES.filter((c) => c !== 'adult');
  const rows = await env.DB.batch(
    cats.map((c) =>
      env.DB.prepare(
        `SELECT ${LIST_COLS} FROM titles WHERE published = 1 AND category = ? AND is_adult = ? ORDER BY created_at DESC LIMIT 18`
      ).bind(c, adult)
    )
  );
  const popular = await env.DB.prepare(
    `SELECT ${LIST_COLS} FROM titles WHERE published = 1 AND is_adult = ? ORDER BY views DESC LIMIT 18`
  ).bind(adult).all();

  return cached({
    featured: featured.results.length ? featured.results : latest.results.slice(0, 5),
    latest: latest.results,
    popular: popular.results,
    categories: Object.fromEntries(cats.map((c, i) => [c, rows[i].results])),
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
  if (lang) { where.push('language = ?'); args.push(lang); }
  const genre = p.get('genre');
  if (genre) { where.push("(',' || genres || ',') LIKE ?"); args.push(`%,${genre},%`); }
  const q = (p.get('q') || '').trim().slice(0, 80);
  if (q) {
    where.push('(name LIKE ? OR description LIKE ? OR genres LIKE ?)');
    args.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }

  const sort = p.get('sort') === 'popular' ? 'views DESC' : p.get('sort') === 'year' ? 'year DESC' : 'created_at DESC';
  const page = Math.max(1, parseInt(p.get('page') || '1', 10) || 1);
  const sql = `SELECT ${LIST_COLS} FROM titles WHERE ${where.join(' AND ')} ORDER BY ${sort} LIMIT ? OFFSET ?`;
  const { results } = await env.DB.prepare(sql).bind(...args, PAGE_SIZE + 1, (page - 1) * PAGE_SIZE).all();

  return cached({ items: results.slice(0, PAGE_SIZE), page, hasMore: results.length > PAGE_SIZE }, 30);
}

async function getTitle(env, slug, { admin = false } = {}) {
  const title = await env.DB.prepare(
    `SELECT * FROM titles WHERE ${admin ? 'id' : 'slug'} = ? ${admin ? '' : 'AND published = 1'}`
  ).bind(slug).first();
  if (!title) return null;
  const [eps, srcs] = await env.DB.batch([
    env.DB.prepare('SELECT * FROM episodes WHERE title_id = ? ORDER BY season, episode').bind(title.id),
    env.DB.prepare('SELECT id, episode_id, label, url, quality FROM sources WHERE title_id = ? ORDER BY sort, id').bind(title.id),
  ]);
  return { ...title, episodes: eps.results, sources: srcs.results };
}

async function publicTitle(env, slug, ctx) {
  const t = await getTitle(env, slug);
  if (!t) return fail('Title not found', 404);
  // count the view without delaying the response
  ctx.waitUntil(env.DB.prepare('UPDATE titles SET views = views + 1 WHERE id = ?').bind(t.id).run());
  return cached(t, 30);
}

// ---------- admin ----------
function cleanTitle(b) {
  const name = String(b.name || '').trim();
  if (!name) return { error: 'Name is required' };
  const category = String(b.category || '');
  if (!CATEGORIES.includes(category)) return { error: 'Invalid category' };
  for (const f of ['poster', 'backdrop']) {
    if (b[f] && !isHttpUrl(b[f])) return { error: `${f} must be an http(s) link` };
  }
  const year = b.year ? parseInt(b.year, 10) : null;
  return {
    data: {
      name: name.slice(0, 200),
      slug: slugify(b.slug || `${name}${year ? `-${year}` : ''}`) || `title-${Date.now()}`,
      category,
      subcategory: String(b.subcategory || '').slice(0, 60),
      language: String(b.language || '').slice(0, 40),
      genres: String(b.genres || '').split(',').map((g) => g.trim()).filter(Boolean).join(','),
      year: Number.isFinite(year) ? year : null,
      certificate: String(b.certificate || '').slice(0, 10),
      is_adult: category === 'adult' ? 1 : 0,
      description: String(b.description || '').slice(0, 4000),
      poster: String(b.poster || ''),
      backdrop: String(b.backdrop || ''),
      featured: b.featured ? 1 : 0,
      published: b.published === false || b.published === 0 ? 0 : 1,
    },
  };
}

async function saveTitle(env, request, id) {
  const body = await request.json().catch(() => ({}));
  const { data, error } = cleanTitle(body);
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
    if (String(e).includes('UNIQUE')) return fail('A title with this slug already exists. Change the slug.');
    throw e;
  }
}

async function admin(env, request, parts, url) {
  const method = request.method;
  const [resource, id] = parts;

  if (resource === 'titles') {
    if (!id && method === 'GET') {
      const q = (url.searchParams.get('q') || '').trim();
      const stmt = q
        ? env.DB.prepare(`SELECT ${LIST_COLS}, featured, published, views FROM titles WHERE name LIKE ? ORDER BY updated_at DESC LIMIT 200`).bind(`%${q}%`)
        : env.DB.prepare(`SELECT ${LIST_COLS}, featured, published, views FROM titles ORDER BY updated_at DESC LIMIT 200`);
      return json({ items: (await stmt.all()).results });
    }
    if (!id && method === 'POST') return saveTitle(env, request);
    if (id && method === 'GET') {
      const t = await getTitle(env, Number(id), { admin: true });
      return t ? json(t) : fail('Title not found', 404);
    }
    if (id && method === 'PUT') return saveTitle(env, request, Number(id));
    if (id && method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sources WHERE title_id = ?').bind(Number(id)),
        env.DB.prepare('DELETE FROM episodes WHERE title_id = ?').bind(Number(id)),
        env.DB.prepare('DELETE FROM titles WHERE id = ?').bind(Number(id)),
      ]);
      return json({ ok: true });
    }
  }

  if (resource === 'episodes') {
    if (!id && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const titleId = Number(b.title_id);
      const season = parseInt(b.season, 10) || 1;
      const episode = parseInt(b.episode, 10);
      if (!titleId || !episode) return fail('Title and episode number are required');
      try {
        const r = await env.DB.prepare('INSERT INTO episodes (title_id, season, episode, name) VALUES (?, ?, ?, ?)')
          .bind(titleId, season, episode, String(b.name || '').slice(0, 200)).run();
        await env.DB.prepare("UPDATE titles SET updated_at = datetime('now') WHERE id = ?").bind(titleId).run();
        return json({ id: r.meta.last_row_id }, 201);
      } catch (e) {
        if (String(e).includes('UNIQUE')) return fail(`Season ${season} Episode ${episode} already exists`);
        throw e;
      }
    }
    if (id && method === 'DELETE') {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM sources WHERE episode_id = ?').bind(Number(id)),
        env.DB.prepare('DELETE FROM episodes WHERE id = ?').bind(Number(id)),
      ]);
      return json({ ok: true });
    }
  }

  if (resource === 'sources') {
    if (!id && method === 'POST') {
      const b = await request.json().catch(() => ({}));
      const titleId = Number(b.title_id);
      if (!titleId) return fail('Title is required');
      if (!isHttpUrl(b.url)) return fail('Video embed link must start with http(s)');
      const count = await env.DB.prepare('SELECT COUNT(*) AS n FROM sources WHERE title_id = ? AND episode_id IS ?')
        .bind(titleId, b.episode_id ? Number(b.episode_id) : null).first();
      const r = await env.DB.prepare('INSERT INTO sources (title_id, episode_id, label, url, quality, sort) VALUES (?, ?, ?, ?, ?, ?)')
        .bind(
          titleId,
          b.episode_id ? Number(b.episode_id) : null,
          String(b.label || `Server ${count.n + 1}`).slice(0, 40),
          String(b.url),
          String(b.quality || '').slice(0, 20),
          count.n
        ).run();
      return json({ id: r.meta.last_row_id }, 201);
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
        // slow down wrong guesses
        if (!safeEqual(String(password || ''), env.ADMIN_PASSWORD)) {
          await new Promise((r) => setTimeout(r, 800));
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
    return fail('Not found', 404);
  } catch (e) {
    console.error(e);
    return fail('Server error. Try again in a moment.', 500);
  }
}
