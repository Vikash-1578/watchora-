import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// Watchora player.
// - Direct video files (.mp4…) and streams (.m3u8) play in our own player with
//   quality, audio, subtitles, speed and volume boost in the settings menu.
// - Embed links (Streamtape and similar) play inside the host's own player; we can
//   still switch audio language, quality and server between the links the admin added.

const qNum = (q) => (q === '4K' ? 2160 : parseInt(q, 10) || 0);
const read = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const write = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };
const fmt = (s) => {
  if (!Number.isFinite(s)) return '0:00';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
};
const BOOSTS = [1, 1.5, 2, 2.5, 3];
const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

const langs = (v) => (v ? String(v).split(',').map((x) => x.trim()).filter(Boolean) : []);
const subsLabel = (v) => (v === 'None' ? 'No subs' : v ? `Subs: ${langs(v).join(', ')}` : '');

function useSelection(sources) {
  // a server can have more than one audio language (dual / multi audio video)
  const audios = useMemo(() => [...new Set(sources.flatMap((s) => langs(s.audio)))], [sources]);
  const [audio, setAudio] = useState(() => {
    const saved = read('wc_audio', '');
    return audios.includes(saved) ? saved : audios[0] || '';
  });
  useEffect(() => {
    if (!audios.includes(audio)) {
      const saved = read('wc_audio', '');
      setAudio(audios.includes(saved) ? saved : audios[0] || '');
    }
  }, [audios]); // eslint-disable-line react-hooks/exhaustive-deps

  const byAudio = audios.length ? sources.filter((s) => langs(s.audio).includes(audio)) : sources;
  const qualities = [...new Set(byAudio.map((s) => s.quality).filter(Boolean))].sort((a, b) => qNum(b) - qNum(a));
  const [quality, setQuality] = useState(() => read('wc_quality', ''));
  const q = qualities.includes(quality) ? quality : qualities[0] || '';
  const servers = q ? byAudio.filter((s) => s.quality === q) : byAudio;
  const [serverId, setServerId] = useState(null);
  const current = servers.find((s) => s.id === serverId) || servers[0] || sources[0];

  const pick = (src) => {
    const a = langs(src.audio);
    if (a.length && !a.includes(audio)) { setAudio(a[0]); write('wc_audio', a[0]); }
    if (src.quality) { setQuality(src.quality); write('wc_quality', src.quality); }
    setServerId(src.id);
  };

  return {
    pick,
    audios, audio, setAudio: (a) => { setAudio(a); write('wc_audio', a); setServerId(null); },
    qualities, quality: q, setQuality: (x) => { setQuality(x); write('wc_quality', x); setServerId(null); },
    servers, current, setServerId,
  };
}

export default function WatchPlayer({ sources, subtitles = [], poster, heading, progressKey, onEnded }) {
  const sel = useSelection(sources || []);
  const resumeAt = useRef(null); // keeps the position when switching quality, audio or server
  const liveTime = useRef({ t: 0, play: false });
  if (!sources?.length) {
    return (
      <div className="wp wp-empty">
        <p>No video added for this yet. Check back soon.</p>
      </div>
    );
  }
  return (
    <div className="wp-wrap">
      {heading && <p className="player-heading">{heading}</p>}
      {sel.current.kind === 'file' || sel.current.kind === 'hls'
        ? <NativePlayer key={sel.current.id} resumeAt={resumeAt} liveTime={liveTime} sel={sel} subtitles={subtitles} poster={poster} progressKey={progressKey} onEnded={onEnded} />
        : <EmbedPlayer sel={sel} hasSubs={subtitles.length > 0} />}
      {sources.length > 1 && (
        <div className="wp-servers" role="radiogroup" aria-label="Servers">
          <span className="wp-group-label">Servers</span>
          {sources.map((x) => {
            const on = x.id === sel.current.id;
            return (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={on}
                className={`srv ${on ? 'on' : ''}`}
                onClick={() => {
                  if (on) return;
                  if (sel.current.kind !== 'embed') resumeAt.current = { ...liveTime.current };
                  sel.pick(x);
                }}
              >
                <span className="srv-name">{x.label}</span>
                {(x.quality || x.audio || x.subtitles) && <span className="srv-meta">{[x.quality, langs(x.audio).join(' + '), subsLabel(x.subtitles)].filter(Boolean).join(' | ')}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------- host's own player (iframe) ----------
// Host players (Vidara, Streamtape…) are shown exactly as the host gives them,
// with no sandbox, so the host's own player and ads work (needed for host monetization).
function EmbedPlayer({ sel, hasSubs }) {
  const s = sel.current;
  const boxRef = useRef(null);
  const fullscreen = () => {
    const el = boxRef.current;
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
  };
  return (
    <>
      <div className="wp wp-embed" ref={boxRef}>
        <iframe
          key={s.id}
          src={s.url}
          title="Video player"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowFullScreen
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
          referrerPolicy="origin"
        />
      </div>
      <div className="wp-bar wp-embed-bar">
        <span className="small muted">
          Video not playing? Try another server.
          {hasSubs && ' Subtitles and volume boost work on servers that use the Watchora player.'}
        </span>
        <button type="button" className="btn btn-ghost btn-sm" onClick={fullscreen}>⛶ Full screen</button>
      </div>
    </>
  );
}

// ---------- our own player ----------
function NativePlayer({ sel, subtitles, poster, progressKey, onEnded, resumeAt, liveTime }) {
  const src = sel.current;
  const boxRef = useRef(null);
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const audioCtx = useRef(null);
  const gainRef = useRef(null);
  const hideTimer = useRef(null);
  const flashTimer = useRef(null);
  const mark = () => { const v = videoRef.current; resumeAt.current = { t: v?.currentTime || 0, play: v ? !v.paused : false }; };

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(() => read('wc_volume', 1));
  const [muted, setMuted] = useState(false);
  const [boost, setBoost] = useState(1);
  const [speed, setSpeed] = useState(1);
  const [sub, setSub] = useState(() => read('wc_sub', ''));
  const [menu, setMenu] = useState(null); // null | 'main' | 'quality' | ...
  const [showUi, setShowUi] = useState(true);
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [hlsLevels, setHlsLevels] = useState([]);
  const [hlsLevel, setHlsLevel] = useState(-1);
  const [hlsAudio, setHlsAudio] = useState([]);
  const [hlsAudioId, setHlsAudioId] = useState(0);
  const [crossOrigin, setCrossOrigin] = useState(src.kind === 'hls' ? 'anonymous' : undefined);

  // load the source (and keep position when switching quality/audio/server)
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return undefined;
    setError('');
    setWaiting(true);
    const saved = progressKey ? read(`wc_pos_${progressKey}`, 0) : 0;
    if (resumeAt.current == null && saved > 30) resumeAt.current = { t: saved, play: false };

    let cancelled = false;
    if (src.kind === 'hls' && !v.canPlayType('application/vnd.apple.mpegurl')) {
      import('hls.js').then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) { setError("This browser can't play this stream."); return; }
        const hls = new Hls({ capLevelToPlayerSize: true });
        hlsRef.current = hls;
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          setHlsLevels(hls.levels.map((l, i) => ({ i, h: l.height, label: l.height ? `${l.height}p` : `${Math.round(l.bitrate / 1000)} kbps` })));
          setHlsAudio(hls.audioTracks.map((a) => ({ id: a.id, label: a.name || a.lang || `Track ${a.id + 1}` })));
          setHlsAudioId(hls.audioTrack);
        });
        hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => setHlsAudio(hls.audioTracks.map((a) => ({ id: a.id, label: a.name || a.lang || `Track ${a.id + 1}` }))));
        hls.on(Hls.Events.ERROR, (_, d) => { if (d.fatal) setError('This server is not responding. Try another server or quality.'); });
        hls.loadSource(src.url);
        hls.attachMedia(v);
      });
    } else {
      v.src = src.url;
    }
    return () => {
      cancelled = true;
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [src.url, src.kind, crossOrigin]); // eslint-disable-line react-hooks/exhaustive-deps

  // subtitles on/off
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    Array.from(v.textTracks).forEach((t) => { t.mode = t.label === sub ? 'showing' : 'disabled'; });
  }, [sub, subtitles]);

  useEffect(() => { if (videoRef.current) videoRef.current.playbackRate = speed; }, [speed]);
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = volume;
    v.muted = muted;
    write('wc_volume', volume);
  }, [volume, muted]);

  // volume boost through Web Audio
  const applyBoost = useCallback(async (level) => {
    const v = videoRef.current;
    if (level === 1 && !gainRef.current) { setBoost(1); return; }
    if (src.kind === 'file' && crossOrigin !== 'anonymous') {
      // the file must be loaded with CORS for the booster to hear it
      mark();
      setCrossOrigin('anonymous');
      setBoost(level);
      return;
    }
    try {
      if (!audioCtx.current) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        audioCtx.current = new Ctx();
        const node = audioCtx.current.createMediaElementSource(v);
        gainRef.current = audioCtx.current.createGain();
        node.connect(gainRef.current).connect(audioCtx.current.destination);
      }
      await audioCtx.current.resume();
      gainRef.current.gain.value = level;
      setBoost(level);
      flash(level > 1 ? `Volume boost ${Math.round(level * 100)}%` : 'Volume boost off');
    } catch {
      setBoost(1);
      flash('Volume boost is not available on this server');
    }
  }, [src.kind, crossOrigin]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (boost > 1 && crossOrigin === 'anonymous' && !gainRef.current) applyBoost(boost); }, [crossOrigin]); // eslint-disable-line

  function flash(msg) { setNotice(msg); clearTimeout(flashTimer.current); flashTimer.current = setTimeout(() => setNotice(''), 1800); }

  // controls auto-hide
  const poke = useCallback(() => {
    setShowUi(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => { if (videoRef.current && !videoRef.current.paused) setShowUi(false); }, 5000);
  }, []);

  const lastPointer = useRef('mouse');
  // on phones the first tap only shows the controls; on a computer a click plays / pauses
  const tapVideo = () => {
    if (lastPointer.current === 'touch' && !showUi && playing) { poke(); return; }
    toggle();
    poke();
  };
  const toggle = () => {
    const v = videoRef.current;
    if (v.paused) v.play().catch(() => {}); else v.pause();
  };
  const seek = (d) => { const v = videoRef.current; v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + d)); flash(d > 0 ? `+${d}s` : `${d}s`); };
  const fullscreen = () => {
    const el = boxRef.current;
    if (document.fullscreenElement) document.exitFullscreen();
    else (el.requestFullscreen || el.webkitRequestFullscreen)?.call(el);
    videoRef.current?.webkitEnterFullscreen && !el.requestFullscreen && videoRef.current.webkitEnterFullscreen();
  };

  const onKey = (e) => {
    if (e.target.tagName === 'INPUT' && e.target.type !== 'range') return;
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'k') { e.preventDefault(); toggle(); }
    else if (k === 'arrowright') { e.preventDefault(); seek(10); }
    else if (k === 'arrowleft') { e.preventDefault(); seek(-10); }
    else if (k === 'arrowup') { e.preventDefault(); setVolume((x) => Math.min(1, +(x + 0.1).toFixed(2))); }
    else if (k === 'arrowdown') { e.preventDefault(); setVolume((x) => Math.max(0, +(x - 0.1).toFixed(2))); }
    else if (k === 'f') fullscreen();
    else if (k === 'm') setMuted((m) => !m);
    else if (k === 'c' && subtitles.length) setSub((s) => (s ? '' : subtitles[0].language));
    else if (k === 'escape') setMenu(null);
    poke();
  };

  const pickSub = (lang) => { setSub(lang); write('wc_sub', lang); setMenu(null); };

  // events
  const ev = {
    onPlay: () => { setPlaying(true); poke(); },
    onPause: () => { setPlaying(false); setShowUi(true); },
    onWaiting: () => setWaiting(true),
    onPlaying: () => setWaiting(false),
    onCanPlay: () => setWaiting(false),
    onLoadedMetadata: (e) => {
      const v = e.currentTarget;
      setDuration(v.duration);
      if (resumeAt.current != null) {
        const r = resumeAt.current;
        resumeAt.current = null;
        const at = typeof r === 'object' ? r.t : r;
        if (at > 0) v.currentTime = at;
        if (typeof r === 'object' && r.play) v.play().catch(() => {});
      }
      v.playbackRate = speed;
      Array.from(v.textTracks).forEach((t) => { t.mode = t.label === sub ? 'showing' : 'disabled'; });
    },
    onTimeUpdate: (e) => {
      const v = e.currentTarget;
      setTime(v.currentTime);
      liveTime.current = { t: v.currentTime, play: !v.paused };
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
      if (progressKey && Math.floor(v.currentTime) % 5 === 0) {
        write(`wc_pos_${progressKey}`, v.duration - v.currentTime > 60 ? v.currentTime : 0);
      }
    },
    onEnded: () => { if (progressKey) write(`wc_pos_${progressKey}`, 0); onEnded?.(); },
    onError: () => {
      if (crossOrigin === 'anonymous' && src.kind === 'file') {
        // the host doesn't allow the booster; go back to normal playback
        mark();
        setCrossOrigin(undefined);
        setBoost(1);
        flash('Volume boost is not available on this server');
        return;
      }
      setError('This server is not responding. Try another server or quality.');
    },
  };

  // settings menu content
  const qualityItems = hlsLevels.length > 1
    ? [{ key: -1, label: 'Auto' }, ...hlsLevels.slice().sort((a, b) => b.h - a.h).map((l) => ({ key: l.i, label: l.label }))]
    : sel.qualities.map((q) => ({ key: q, label: q }));
  const qualityValue = hlsLevels.length > 1 ? hlsLevel : sel.quality;
  const setQualityItem = (k) => {
    if (hlsLevels.length > 1) { hlsRef.current.currentLevel = k; setHlsLevel(k); }
    else { mark(); sel.setQuality(k); }
    setMenu(null);
  };
  const audioItems = hlsAudio.length > 1 ? hlsAudio.map((a) => ({ key: a.id, label: a.label })) : sel.audios.map((a) => ({ key: a, label: a }));
  const audioValue = hlsAudio.length > 1 ? hlsAudioId : sel.audio;
  const setAudioItem = (k) => {
    if (hlsAudio.length > 1) { hlsRef.current.audioTrack = k; setHlsAudioId(k); }
    else { mark(); sel.setAudio(k); }
    setMenu(null);
  };
  const serverItems = sel.servers.map((x) => ({ key: x.id, label: x.label }));

  const mainItems = [
    qualityItems.length > 1 && ['quality', 'Quality', qualityItems.find((x) => x.key === qualityValue)?.label || 'Auto'],
    audioItems.length > 1 && ['audio', 'Audio', audioItems.find((x) => x.key === audioValue)?.label],
    ['subs', 'Subtitles', sub || 'Off'],
    ['speed', 'Speed', speed === 1 ? 'Normal' : `${speed}×`],
    ['boost', 'Volume boost', boost === 1 ? 'Off' : `${Math.round(boost * 100)}%`],
    serverItems.length > 1 && ['server', 'Server', sel.current.label],
  ].filter(Boolean);

  const pct = duration ? (time / duration) * 100 : 0;
  const bufPct = duration ? (buffered / duration) * 100 : 0;

  return (
    <div
      ref={boxRef}
      className={`wp wp-native ${showUi || !playing ? 'ui' : ''}`}
      tabIndex={0}
      onKeyDown={onKey}
      onMouseMove={poke}
      onTouchStart={poke}
      aria-label="Video player"
    >
      <video
        ref={videoRef}
        poster={poster || undefined}
        playsInline
        preload="metadata"
        crossOrigin={crossOrigin}
        controlsList="nodownload"
        onPointerDown={(e) => { lastPointer.current = e.pointerType; }}
        onClick={tapVideo}
        onDoubleClick={fullscreen}
        {...ev}
      >
        {subtitles.map((s) => (
          <track
            key={s.id}
            kind="subtitles"
            src={s.url}
            label={s.language}
            srcLang={s.language.slice(0, 2).toLowerCase()}
            onLoad={(e) => Array.from(e.currentTarget.track.cues || []).forEach((c) => { c.line = -3; })}
          />
        ))}
      </video>

      {waiting && !error && <div className="wp-spin" aria-hidden="true" />}
      {error && <div className="wp-error"><p>{error}</p></div>}
      {notice && <div className="wp-notice" role="status">{notice}</div>}
      {!error && (
        <div className="wp-center" onClick={(e) => e.stopPropagation()}>
          <button type="button" className="wp-cbtn" onClick={() => { seek(-10); poke(); }} aria-label="Back 10 seconds">
            <svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" /><text x="12" y="16.5" textAnchor="middle" fontSize="6.5" fontWeight="700">10</text></svg>
          </button>
          {!waiting && (
            <button type="button" className="wp-cbtn wp-cplay" onClick={() => { toggle(); poke(); }} aria-label={playing ? 'Pause' : 'Play'}>
              {playing
                ? <svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" /></svg>}
            </button>
          )}
          <button type="button" className="wp-cbtn" onClick={() => { seek(10); poke(); }} aria-label="Forward 10 seconds">
            <svg viewBox="0 0 24 24"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" /><text x="12" y="16.5" textAnchor="middle" fontSize="6.5" fontWeight="700">10</text></svg>
          </button>
        </div>
      )}

      <div className="wp-controls" onClick={(e) => e.stopPropagation()}>
        <div className="wp-progress">
          <div className="wp-buf" style={{ width: `${bufPct}%` }} />
          <div className="wp-fill" style={{ width: `${pct}%` }} />
          <input
            type="range"
            min="0"
            max={duration || 0}
            step="0.1"
            value={time}
            onChange={(e) => { videoRef.current.currentTime = Number(e.target.value); setTime(Number(e.target.value)); }}
            aria-label="Seek"
            aria-valuetext={`${fmt(time)} of ${fmt(duration)}`}
          />
        </div>
        <div className="wp-row">
          <button type="button" className="wp-btn" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
            {playing
              ? <svg viewBox="0 0 24 24"><path d="M6 4h4v16H6zM14 4h4v16h-4z" /></svg>
              : <svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" /></svg>}
          </button>
          <button type="button" className="wp-btn" onClick={() => seek(-10)} aria-label="Back 10 seconds">
            <svg viewBox="0 0 24 24"><path d="M12 5V2L7 6l5 4V7a6 6 0 1 1-6 6H4a8 8 0 1 0 8-8z" /><text x="12" y="16.5" textAnchor="middle" fontSize="6.5" fontWeight="700">10</text></svg>
          </button>
          <button type="button" className="wp-btn" onClick={() => seek(10)} aria-label="Forward 10 seconds">
            <svg viewBox="0 0 24 24"><path d="M12 5V2l5 4-5 4V7a6 6 0 1 0 6 6h2a8 8 0 1 1-8-8z" /><text x="12" y="16.5" textAnchor="middle" fontSize="6.5" fontWeight="700">10</text></svg>
          </button>
          <div className="wp-vol">
            <button type="button" className="wp-btn" onClick={() => setMuted((m) => !m)} aria-label={muted ? 'Unmute' : 'Mute'}>
              {muted || volume === 0
                ? <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6" /></svg>
                : <svg viewBox="0 0 24 24"><path d="M4 9h4l5-4v14l-5-4H4zM16 8a5 5 0 0 1 0 8M18.5 5.5a9 9 0 0 1 0 13" /></svg>}
            </button>
            <input type="range" min="0" max="1" step="0.05" value={muted ? 0 : volume} onChange={(e) => { setVolume(Number(e.target.value)); setMuted(false); }} aria-label="Volume" />
            {boost > 1 && <span className="wp-boost-tag">{Math.round(boost * 100)}%</span>}
          </div>
          <span className="wp-time">{fmt(time)} / {fmt(duration)}</span>
          <span className="wp-spacer" />
          {subtitles.length > 0 && (
            <button type="button" className={`wp-btn wp-cc ${sub ? 'on' : ''}`} onClick={() => pickSub(sub ? '' : subtitles[0].language)} aria-label={sub ? 'Turn subtitles off' : 'Turn subtitles on'} aria-pressed={!!sub}>
              CC
            </button>
          )}
          <button type="button" className={`wp-btn ${menu ? 'on' : ''}`} onClick={() => setMenu(menu ? null : 'main')} aria-label="Settings" aria-expanded={!!menu}>
            <svg viewBox="0 0 24 24"><path d="M19.4 13a7.6 7.6 0 0 0 0-2l2-1.6-2-3.4-2.4 1a7.4 7.4 0 0 0-1.7-1L15 3.5h-4L10.6 6a7.4 7.4 0 0 0-1.7 1l-2.4-1-2 3.4L6.6 11a7.6 7.6 0 0 0 0 2l-2 1.6 2 3.4 2.4-1a7.4 7.4 0 0 0 1.7 1l.4 2.5h4l.4-2.5a7.4 7.4 0 0 0 1.7-1l2.4 1 2-3.4zM13 15a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" transform="translate(-1 0)" /></svg>
          </button>
          <button type="button" className="wp-btn" onClick={fullscreen} aria-label="Full screen">
            <svg viewBox="0 0 24 24"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></svg>
          </button>
        </div>
      </div>

      {menu && (
        <div className="wp-menu" role="menu" onClick={(e) => e.stopPropagation()}>
          {menu === 'main' && mainItems.map(([k, label, val]) => (
            <button key={k} type="button" role="menuitem" className="wp-mi" onClick={() => setMenu(k)}>
              <span>{label}</span><span className="wp-mi-val">{val} ›</span>
            </button>
          ))}
          {menu !== 'main' && (
            <button type="button" className="wp-mi wp-back" onClick={() => setMenu('main')}>‹ Back</button>
          )}
          {menu === 'quality' && qualityItems.map((x) => (
            <Opt key={x.key} on={x.key === qualityValue} onClick={() => setQualityItem(x.key)}>{x.label}</Opt>
          ))}
          {menu === 'audio' && audioItems.map((x) => (
            <Opt key={x.key} on={x.key === audioValue} onClick={() => setAudioItem(x.key)}>{x.label}</Opt>
          ))}
          {menu === 'subs' && (
            <>
              <Opt on={!sub} onClick={() => pickSub('')}>Off</Opt>
              {subtitles.map((s) => <Opt key={s.id} on={sub === s.language} onClick={() => pickSub(s.language)}>{s.language}</Opt>)}
              {subtitles.length === 0 && <p className="wp-mi-note">No subtitles for this video.</p>}
            </>
          )}
          {menu === 'speed' && SPEEDS.map((x) => (
            <Opt key={x} on={x === speed} onClick={() => { setSpeed(x); setMenu(null); }}>{x === 1 ? 'Normal' : `${x}×`}</Opt>
          ))}
          {menu === 'boost' && (
            <>
              <p className="wp-mi-note">Makes the sound louder than the phone's maximum. Very high levels can sound rough.</p>
              {BOOSTS.map((x) => (
                <Opt key={x} on={x === boost} onClick={() => { applyBoost(x); setMenu(null); }}>{x === 1 ? 'Off (100%)' : `${Math.round(x * 100)}%`}</Opt>
              ))}
            </>
          )}
          {menu === 'server' && serverItems.map((x) => (
            <Opt key={x.key} on={x.key === sel.current.id} onClick={() => { mark(); sel.setServerId(x.key); setMenu(null); }}>{x.label}</Opt>
          ))}
        </div>
      )}
    </div>
  );
}

function Opt({ on, onClick, children }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={on} className={`wp-mi ${on ? 'on' : ''}`} onClick={onClick}>
      <span className="wp-tick" aria-hidden="true">{on ? '✓' : ''}</span>
      <span>{children}</span>
    </button>
  );
}
