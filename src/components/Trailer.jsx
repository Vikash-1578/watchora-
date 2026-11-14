import { toEmbedUrl, youTubeId, isVideoFile } from '../embed.js';

// Plays a trailer from any link:
// - a video file (.mp4 etc.): Watchora's own player, no outside logo
// - YouTube: privacy-enhanced embed (YouTube's own logo stays, as their rules require)
// - any other host: embedded player with pop-ups blocked
export function TrailerPlayer({ url, title, autoPlay = false }) {
  if (!url) return null;
  const yt = youTubeId(url);
  if (isVideoFile(url)) {
    return (
      <div className="trailer-frame">
        <video src={url} controls playsInline autoPlay={autoPlay} preload="metadata" controlsList="nodownload" title={title} />
      </div>
    );
  }
  const src = yt
    ? `https://www.youtube-nocookie.com/embed/${yt}?rel=0&iv_load_policy=3&playsinline=1${autoPlay ? '&autoplay=1' : ''}`
    : toEmbedUrl(url);
  return (
    <div className="trailer-frame">
      <iframe
        src={src}
        title={title}
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
        {...(yt ? {} : { sandbox: 'allow-scripts allow-same-origin allow-presentation' })}
      />
    </div>
  );
}
