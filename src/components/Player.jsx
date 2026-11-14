import { useEffect, useState } from 'react';

// Plays a video by embedding the host's player in an iframe.
// "Block pop-ups" sandboxes the iframe so host ads can't open new tabs.
// Some hosts refuse to play in a sandbox — then the viewer can turn it off.
export default function Player({ sources, heading }) {
  const [active, setActive] = useState(0);
  const [blockPopups, setBlockPopups] = useState(true);

  useEffect(() => { setActive(0); }, [sources]);

  if (!sources?.length) {
    return (
      <div className="player player-empty">
        <p>No video added for this yet. Check back soon.</p>
      </div>
    );
  }

  const src = sources[Math.min(active, sources.length - 1)];

  return (
    <div className="player-wrap">
      {heading && <p className="player-heading">{heading}</p>}
      <div className="player">
        <iframe
          key={`${src.id}-${blockPopups}`}
          src={src.url}
          title={heading || 'Video player'}
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          referrerPolicy="origin"
          {...(blockPopups ? { sandbox: 'allow-scripts allow-same-origin allow-presentation allow-forms' } : {})}
        />
      </div>
      <div className="player-bar">
        <div className="servers" role="tablist" aria-label="Servers">
          {sources.map((s, n) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={n === active}
              className={`server ${n === active ? 'on' : ''}`}
              onClick={() => setActive(n)}
            >
              {s.label}{s.quality ? ` (${s.quality})` : ''}
            </button>
          ))}
        </div>
        <label className="switch">
          <input type="checkbox" checked={blockPopups} onChange={(e) => setBlockPopups(e.target.checked)} />
          <span>Block pop-ups</span>
        </label>
      </div>
      <p className="small muted">Video not playing? Try another server, or turn off “Block pop-ups”.</p>
    </div>
  );
}
