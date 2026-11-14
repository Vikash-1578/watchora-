// Share links from common hosts -> their embed links
export function toEmbedUrl(raw) {
  return String(raw || '').trim()
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
