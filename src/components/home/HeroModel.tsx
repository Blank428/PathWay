import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { ARTERIES, GROUPS, STILL_VIEWS, type Vec3 } from '../../content/procedures/ufe-views';

const Stage = lazy(() => import('../guide/Stage'));

// Every filament colour means one thing. Pointing at a colour lights up those parts.
const COLOURS = [
  { id: 'white', name: 'White', means: 'Uterus', hex: '#eeeae1', parts: GROUPS.uterus },
  { id: 'purple', name: 'Purple', means: 'Fibroids', hex: '#7a4bb5', parts: GROUPS.fibroids },
  { id: 'red', name: 'Red', means: 'Arteries', hex: '#c0252d', parts: ARTERIES },
  { id: 'pink', name: 'Pink', means: 'Ovaries and tubes', hex: '#e89bb9', parts: GROUPS.adnexa },
  { id: 'orange', name: 'Orange', means: 'Risks', hex: '#ee8a2a', parts: GROUPS.discs },
  { id: 'blue', name: 'Blue', means: 'Display base', hex: '#3d6db5', parts: GROUPS.base },
];

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}

type Props = { root: string; catheterPath: Vec3[]; poster: string; alt: string };

export default function HeroModel({ root, catheterPath, poster, alt }: Props) {
  const [client, setClient] = useState<{ gl: boolean; reduced: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [hover, setHover] = useState<string | null>(null);
  const [pinned, setPinned] = useState<string | null>(null);
  const active = hover ?? pinned;
  const focusParts = COLOURS.find((c) => c.id === active)?.parts ?? [];

  useEffect(() => {
    // let the text paint first, then bring in the 3D
    const start = () => setClient({ gl: hasWebGL(), reduced: window.matchMedia('(prefers-reduced-motion: reduce)').matches });
    const w = window as any;
    const id = w.requestIdleCallback ? w.requestIdleCallback(start, { timeout: 900 }) : setTimeout(start, 200);
    return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  return (
    <div className={'hero-model' + (ready ? ' is-ready' : '')}>
      <div className="hero-stage">
        <img className="hero-poster" src={poster} alt={alt} fetchPriority="high" />
        {client?.gl && (
          <Boundary fallback={null}>
            <Suspense fallback={null}>
              <div className="hero-canvas" aria-hidden="true">
                <Stage
                  modelUrl={`${root}models/ufe-v2.glb`}
                  view={STILL_VIEWS.home}
                  chapterKey="home"
                  resetKey={0}
                  mode="printed"
                  explode={0}
                  after={false}
                  focusParts={focusParts}
                  catheterPath={catheterPath}
                  anchors={[]}
                  onOverlay={() => {}}
                  reducedMotion={client.reduced}
                  sway
                  dimTo={0.12}
                  enableZoom={false}
                  onLoaded={() => setTimeout(() => setReady(true), 250)}
                />
              </div>
            </Suspense>
          </Boundary>
        )}
        {ready && <p className="hero-hint mono" aria-hidden="true">Drag to turn</p>}
      </div>

      <div className="legend" role="group" aria-labelledby="legend-h">
        <p id="legend-h" className="legend-h">Every colour means one thing</p>
        <ul>
          {COLOURS.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                className={'legend-item' + (active === c.id ? ' is-on' : '')}
                aria-pressed={pinned === c.id}
                onPointerEnter={(e) => { if (e.pointerType === 'mouse') setHover(c.id); }}
                onPointerLeave={() => setHover(null)}
                onFocus={() => setHover(c.id)}
                onBlur={() => setHover(null)}
                onClick={() => setPinned((p) => (p === c.id ? null : c.id))}
              >
                <span className="legend-dot" style={{ background: c.hex }} aria-hidden="true" />
                <span className="legend-text"><span className="legend-name">{c.name}</span> <span className="legend-means">{c.means}</span></span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
