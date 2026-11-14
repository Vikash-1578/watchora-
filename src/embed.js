// Share links from common hosts -> their embed links
// Pulls the link out of pasted text: iframe embed code, "file name + link", etc.
export function pickLink(raw) {
  const text = String(raw || '').trim();
  const src = text.match(/src\s*=\s*["']([^"']+)["']/i);
  if (src) return src[1].trim();
  const url = text.match(/https?:\/\/[^\s"'<>]+/i);
  return url ? url[0] : text;
}

// Every link in pasted text (several embed codes or links, one per server)
export function pickLinks(raw) {
  const out = [];
  const re = /<iframe[\s\S]*?(?:<\/iframe>|>)|https?:\/\/[^\s"'<>]+/gi;
  for (const m of String(raw || '').matchAll(re)) {
    const link = m[0].toLowerCase().startsWith('<iframe') ? (m[0].match(/src\s*=\s*["']([^"']+)["']/i) || [])[1] : m[0];
    if (link && !out.includes(link.trim())) out.push(link.trim());
  }
  return out;
}

// Only share links are changed; embed links are kept exactly as the host gives them.
export function toEmbedUrl(raw) {
  return pickLink(raw)
    .replace(/(mixdrop\.\w+)\/f\//i, '$1/e/')
    .replace(/^(https?:\/\/voe\.sx)\/(?!e\/)([\w-]+)$/i, '$1/e/$2')
    .replace(/(streamtape\.\w+)\/v\//i, '$1/e/')
    .replace(/(dood\w*\.\w+)\/d\//i, '$1/e/')
    .replace(/(filemoon\.\w+)\/d\//i, '$1/e/')
    .replace(/(dailymotion\.com)\/video\//i, '$1/embed/video/')
    .replace(/archive\.org\/details\//i, 'archive.org/embed/')
    .replace(/drive\.google\.com\/file\/d\/([\w-]+)\/view.*/i, 'drive.google.com/file/d/$1/preview')
    .replace(/(?:www\.)?youtube\.com\/watch\?v=([\w-]{11}).*/i, 'www.youtube.com/embed/$1')
    .replace(/youtu\.be\/([\w-]{11}).*/i, 'www.youtube.com/embed/$1');
}


export const youTubeId = (url) =>
  (String(url || '').match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/) || [])[1] || null;

export const isVideoFile = (url) => /\.(mp4|webm|m4v|mov|ogv)(\?.*)?$/i.test(String(url || ''));
