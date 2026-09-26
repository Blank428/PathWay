import { Component, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { VIEWS, STILL_VIEWS, RISK_MARKERS, type Vec3 } from '../../content/procedures/ufe-views';
import type { OverlayItem, Mode } from './Stage';

const Stage = lazy(() => import('./Stage'));

type Key = { id: string; name: string; note: string; parts: string[] };
type Risk = { id: string; title: string; body: string };
type Chapter = { id: string; title: string; body: string[]; keys?: Key[]; risks?: Risk[] };
type Props = {
  title: string;
  chapters: Chapter[];
  catheterPath: Vec3[];
  root: string;
  visitHref: string;
  textHref: string;
  stills: string[];
  partAnchors: Record<string, Vec3>;
};

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

const pad = (n: number) => String(n).padStart(2, '0');

export default function GuidePlayer({ title, chapters, catheterPath, root, visitHref, textHref, stills, partAnchors }: Props) {
  const [i, setI] = useState(0);
  const mode: Mode = 'printed';
  const [stillView, setStillView] = useState<string | null>(null);
  const [explode, setExplode] = useState(0);
  const [after, setAfter] = useState(false);
  const [focus, setFocus] = useState<string | null>(null);
  const [openRisk, setOpenRisk] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [client, setClient] = useState<{ gl: boolean; reduced: boolean } | null>(null);
  const [loaded, setLoaded] = useState(false);

  const ch = chapters[i];
  const view = (stillView && STILL_VIEWS[stillView]) || VIEWS[ch.id];
  const isLast = i === chapters.length - 1;

  // start: read the chapter from the address (#take-it-apart), check the device
  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace('#', ''));
    const idx = chapters.findIndex((c) => c.id === id);
    if (idx >= 0) setI(idx);
    setClient({ gl: hasWebGL(), reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    // ?mode=printed opens in the printed look; ?still hides overlays (used to render poster images)
    try {
      const q = new URLSearchParams(location.search);
      const sv = q.get('view'); if (sv) setStillView(sv);
      if (q.has('still')) document.documentElement.classList.add('still-mode');
    } catch {}
    const onHash = () => {
      const j = chapters.findIndex((c) => c.id === decodeURIComponent(location.hash.replace('#', '')));
      if (j >= 0) setI(j);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // entering a chapter resets its interactive state
  const panelRef = useRef<HTMLDivElement>(null);
  const firstRun = useRef(true);
  useEffect(() => {
    setExplode(view.explode ?? 0);
    setFocus(null);
    setOpenRisk(null);
    setMenuOpen(false);
    if (view.after) {
      setAfter(false);
      const t = setTimeout(() => setAfter(true), client?.reduced ? 0 : 1200);
      return () => clearTimeout(t);
    } else setAfter(false);
  }, [i, stillView]);
  useEffect(() => {
    if (firstRun.current) { firstRun.current = false; return; }
    try { history.replaceState(null, '', '#' + ch.id); } catch {}
    panelRef.current?.scrollTo({ top: 0 });
    const h = document.getElementById('chapter-title');
    h?.focus({ preventScroll: true });
  }, [i]);

  const go = useCallback((d: number) => setI((n) => Math.max(0, Math.min(chapters.length - 1, n + d))), [chapters.length]);

  // keyboard: left and right arrows move between chapters
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.key === 'ArrowRight') { go(1); setPlaying(false); }
      if (e.key === 'ArrowLeft') { go(-1); setPlaying(false); }
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go]);

  // play: chapters advance on their own, timed to the reading
  const words = useMemo(() => ch.body.join(' ').split(/\s+/).length, [ch]);
  const dwell = Math.max(9, words / 2.6 + 5) * 1000 + (ch.id === 'the-catheter' ? 3000 : 0);
  useEffect(() => {
    if (!playing) return;
    if (isLast) { setPlaying(false); return; }
    const t = setTimeout(() => go(1), dwell);
    return () => clearTimeout(t);
  }, [playing, i, dwell, isLast]);

  // labels and risk markers drawn over the model
  const labels = view.markers ? [] : (view.labels ?? []);
  const markers = view.markers ? (chapters[chapters.length - 1].risks ?? []) : [];
  const vesselAt = catheterPath[Math.floor(catheterPath.length * 0.3)];
  const anchors = useMemo(() => [
    ...labels.map((l) => ({ id: l.id, at: (l.at ?? partAnchors[l.part![0]]) as Vec3, part: l.part?.[0] })),
    ...markers.map((r) => ({ id: 'risk-' + r.id, at: (r.id === 'vessel' ? vesselAt : RISK_MARKERS[r.id]?.at ?? [0, 0, 0]) as Vec3 })),
  ], [ch.id]);

  const focusParts = useMemo(() => {
    if (!focus) return [];
    const k = ch.keys?.find((x) => x.id === focus);
    if (k) return k.parts;
    const l = view.labels?.find((x) => x.id === focus);
    if (l?.part) return l.part;
    return [];
  }, [focus, ch.id]);

  const overlayRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef(new Map<string, SVGLineElement>());
  const tagRefs = useRef(new Map<string, HTMLElement>());
  const onOverlay = useCallback((items: OverlayItem[], w: number, h: number) => {
    const narrow = w < 560;
    const edge = narrow ? 10 : 20;
    const gap = narrow ? 30 : 38;
    const sides: Record<'l' | 'r', { id: string; x: number; y: number; ty: number }[]> = { l: [], r: [] };
    for (const it of items) {
      const tag = tagRefs.current.get(it.id);
      if (!tag) continue;
      if (it.id.startsWith('risk-')) {
        tag.style.transform = `translate(${it.x}px, ${it.y}px) translate(-50%, -50%)`;
        tag.style.opacity = it.visible ? '1' : '0';
        continue;
      }
      sides[it.x < w / 2 ? 'l' : 'r'].push({ id: it.id, x: it.x, y: it.y, ty: it.y });
    }
    (['l', 'r'] as const).forEach((s) => {
      const arr = sides[s].sort((a, b) => a.y - b.y);
      let prev = -Infinity;
      arr.forEach((a) => { a.ty = Math.max(a.y, prev + gap, 28); prev = a.ty; });
      const over = prev - (h - 70);
      if (over > 0) arr.forEach((a) => { a.ty -= over; });
      arr.forEach((a) => {
        const tag = tagRefs.current.get(a.id)!; const line = lineRefs.current.get(a.id);
        const tw = tag.offsetWidth; const th = tag.offsetHeight;
        const tx = s === 'l' ? edge : w - edge - tw;
        tag.style.transform = `translate(${tx}px, ${a.ty - th / 2}px)`;
        tag.style.opacity = '1';
        if (line) {
          const lx = s === 'l' ? tx + tw + 6 : tx - 6;
          line.setAttribute('x1', String(lx)); line.setAttribute('y1', String(a.ty));
          line.setAttribute('x2', String(a.x)); line.setAttribute('y2', String(a.y));
          line.style.opacity = '1';
        }
      });
    });
  }, []);

  const onPartTap = useCallback((part: string) => {
    const k = ch.keys?.find((x) => x.parts.includes(part));
    if (k) { setFocus((f) => (f === k.id ? null : k.id)); return; }
    const l = view.labels?.find((x) => x.part?.includes(part));
    if (l) setFocus((f) => (f === l.id ? null : l.id));
  }, [ch.id]);

  const still = stills.includes(ch.id) ? `${root}stills/ufe/${ch.id}.webp` : null;
  const poster = (msg?: string) => (
    <div className="stage-poster">
      {still && <img src={still} alt="" />}
      {msg && <p className="stage-msg">{msg}</p>}
    </div>
  );

  return (
    <div className="guide" data-chapter={ch.id}>
      <div className="guide-stage studio">
        <div className="stage-canvas-wrap">
          {!client || !client.gl
            ? poster(client && !client.gl ? '3D is not available on this device. The picture shows the same view.' : undefined)
            : (
              <Boundary fallback={poster('The 3D model could not load. The picture shows the same view.')}>
                {!loaded && poster('Loading the 3D model')}
                <Suspense fallback={null}>
                  <Stage
                    modelUrl={`${root}models/ufe-v2.glb`}
                    view={view}
                    chapterKey={ch.id + (stillView ?? '')}
                    resetKey={resetKey}
                    mode={mode}
                    explode={explode}
                    after={after}
                    focusParts={focusParts}
                    catheterPath={catheterPath}
                    anchors={anchors}
                    onOverlay={(items, w, h) => { if (!loaded) setLoaded(true); onOverlay(items, w, h); }}
                    onPartTap={onPartTap}
                    reducedMotion={client.reduced}
                  />
                </Suspense>
              </Boundary>
            )}
          <div className="stage-overlay" ref={overlayRef} aria-hidden={markers.length ? undefined : true}>
            <svg className="leaders" width="100%" height="100%">
              <defs><marker id="anchor-dot" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6"><circle cx="5" cy="5" r="3.4" fill="#f6f6f2" stroke="#121412" strokeWidth="1.6" /></marker></defs>
              {labels.map((l) => <line key={l.id} ref={(el) => { if (el) lineRefs.current.set(l.id, el); else lineRefs.current.delete(l.id); }} />)}
            </svg>
            {labels.map((l) => (
              <button
                key={l.id}
                type="button"
                tabIndex={-1}
                className={'callout' + (focus === l.id ? ' is-focus' : '')}
                ref={(el) => { if (el) tagRefs.current.set(l.id, el); else tagRefs.current.delete(l.id); }}
                onClick={() => setFocus((f) => (f === l.id ? null : l.id))}
              >{l.text}</button>
            ))}
            {markers.map((r) => (
              <button
                key={r.id}
                type="button"
                className={'marker' + (openRisk === r.id ? ' is-open' : '') + (RISK_MARKERS[r.id]?.printed ? '' : ' is-virtual')}
                ref={(el) => { if (el) tagRefs.current.set('risk-' + r.id, el); else tagRefs.current.delete('risk-' + r.id); }}
                onClick={() => setOpenRisk((o) => (o === r.id ? null : r.id))}
                aria-label={`Risk ${RISK_MARKERS[r.id]?.letter}: ${r.title}`}
              >{RISK_MARKERS[r.id]?.letter}</button>
            ))}
          </div>
        </div>
        <div className="stage-bar stage-bar-bottom">
          <span className="stage-hint mono">Drag to turn · pinch or scroll to zoom</span>
          <button type="button" className="chip" onClick={() => setResetKey((k) => k + 1)}>Reset view</button>
        </div>
      </div>

      <section className="guide-panel" aria-labelledby="chapter-title">
        <div className="panel-head">
          <button type="button" className="chapter-menu-btn" aria-expanded={menuOpen} aria-controls="chapter-list" onClick={() => setMenuOpen((o) => !o)}>
            <span className="mono">{pad(i + 1)} of {pad(chapters.length)}</span>
            <span className="chapter-menu-label">{title}</span>
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 5l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
          </button>
          <div className="progress" aria-hidden="true">
            {chapters.map((c, n) => <span key={c.id} className={n < i ? 'done' : n === i ? 'now' : ''} style={n === i && playing ? { ['--dwell' as any]: `${dwell}ms` } : undefined} />)}
          </div>
          {menuOpen && (
            <ol id="chapter-list" className="chapter-list">
              {chapters.map((c, n) => (
                <li key={c.id}>
                  <button type="button" aria-current={n === i ? 'step' : undefined} onClick={() => { setI(n); setPlaying(false); }}>
                    <span className="mono">{pad(n + 1)}</span>{c.title}
                  </button>
                </li>
              ))}
              <li className="chapter-list-extra"><a href={textHref}>Read the whole guide as text</a></li>
            </ol>
          )}
        </div>

        <div className="panel-body" ref={panelRef}>
          <h1 id="chapter-title" tabIndex={-1}>{ch.title}</h1>
          <div className="chapter-text">{ch.body.map((b, n) => <p key={n}>{b}</p>)}</div>

          {ch.id === 'take-it-apart' && (
            <label className="explode">
              <span>Together</span>
              <input type="range" min={0} max={1} step={0.01} value={explode} onChange={(e) => setExplode(parseFloat(e.target.value))} aria-label="Take the model apart" />
              <span>Apart</span>
            </label>
          )}

          {ch.keys && (
            <ul className="keys">
              {ch.keys.map((k) => (
                <li key={k.id}>
                  <button type="button" aria-pressed={focus === k.id} onClick={() => setFocus((f) => (f === k.id ? null : k.id))}>
                    <span className="key-name">{k.name}</span>
                    <span className="key-note">{k.note}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          {view.after && (
            <div className="seg" role="radiogroup" aria-label="When">
              <button type="button" role="radio" aria-checked={!after} onClick={() => setAfter(false)}>Today</button>
              <button type="button" role="radio" aria-checked={after} onClick={() => setAfter(true)}>6 months later</button>
            </div>
          )}

          {ch.risks && (
            <ul className="risks">
              {ch.risks.map((r) => {
                const m = RISK_MARKERS[r.id];
                const open = openRisk === r.id;
                return (
                  <li key={r.id} className={open ? 'is-open' : ''}>
                    <button type="button" aria-expanded={open} onClick={() => setOpenRisk((o) => (o === r.id ? null : r.id))}>
                      <span className={'disc' + (m?.printed ? '' : ' is-virtual')} aria-hidden="true">{m?.letter}</span>
                      <span className="risk-title">{r.title}</span>
                    </button>
                    {open && <p className="risk-body">{r.body}</p>}
                  </li>
                );
              })}
            </ul>
          )}

          {view.hint && <p className="hint">{view.hint}</p>}

          {isLast && (
            <a className="next-step" href={visitHref}>
              <span className="mono">Next</span>
              <strong>Your visit: recovery, other options and questions to bring</strong>
            </a>
          )}
        </div>

        <div className="panel-nav">
          <button type="button" className="btn btn-quiet" onClick={() => { go(-1); setPlaying(false); }} disabled={i === 0}>Back</button>
          <button type="button" className="btn btn-quiet play" aria-pressed={playing} onClick={() => setPlaying((pl) => !pl)} disabled={isLast}>
            {playing ? 'Pause' : 'Play'}
          </button>
          {isLast
            ? <a className="btn btn-primary" href={visitHref}>Your visit</a>
            : <button type="button" className="btn btn-primary" onClick={() => { go(1); setPlaying(false); }}>Next</button>}
        </div>
      </section>
    </div>
  );
}
