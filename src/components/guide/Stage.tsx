import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import { useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { EXPLODE, GROUPS, RISK_MARKERS, type View, type Vec3 } from '../../content/procedures/ufe-views';

export type Mode = 'anatomy' | 'printed';

export type OverlayItem = { id: string; x: number; y: number; visible: boolean };
export type OverlaySink = (items: OverlayItem[], w: number, h: number) => void;

type Props = {
  modelUrl: string;
  view: View;
  chapterKey: string;       // changes when the chapter changes (camera moves)
  resetKey: number;         // bump to send the camera back to the chapter view
  mode: Mode;
  explode: number;
  after: boolean;
  focusParts: string[];
  catheterPath: Vec3[];
  anchors: { id: string; at: Vec3; part?: string }[];
  onOverlay: OverlaySink;
  onPartTap?: (part: string) => void;
  reducedMotion: boolean;
};

const ANATOMY: Record<string, string> = {
  uterus: '#d9a79c', fibroid: '#ece2d2', after: '#ece2d2', artery: '#b8262f', tube: '#d98f8a', ovary: '#e8c4b4',
  disc: '#ee8a2a', base: '#2c5ca3',
};
const PRINTED: Record<string, string> = {
  uterus: '#eeeae1', fibroid: '#7a4bb5', after: '#7a4bb5', artery: '#c0252d', tube: '#e89bb9', ovary: '#e89bb9',
  disc: '#ee8a2a', base: '#3d6db5',
};
const kindOf = (name: string) =>
  name === 'uterus' ? 'uterus'
  : name.startsWith('fibroid') ? 'fibroid'
  : name.startsWith('after') ? 'after'
  : name.startsWith('tube') ? 'tube'
  : name.startsWith('ovary') ? 'ovary'
  : name.startsWith('disc') ? 'disc'
  : name === 'base' ? 'base'
  : 'artery';

const ALL_PARTS = Object.keys(EXPLODE);

function ease(t: number) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }

type PartState = { obj: THREE.Object3D; base: THREE.Vector3; mats: THREE.MeshStandardMaterial[]; opacity: number; glow: number };

function Model(p: Props & { onReady: (parts: Map<string, PartState>) => void }) {
  const { scene } = useGLTF(p.modelUrl);
  const root = useMemo(() => scene.clone(true), [scene]);

  const parts = useMemo(() => {
    const map = new Map<string, PartState>();
    root.traverse((o) => {
      if (ALL_PARTS.includes(o.name) && !map.has(o.name)) {
        map.set(o.name, { obj: o, base: o.position.clone(), mats: [], opacity: 0, glow: 0 });
      }
    });
    root.traverse((o: any) => {
      if (!o.isMesh) return;
      let q: THREE.Object3D | null = o;
      while (q && !map.has(q.name)) q = q.parent;
      if (!q) return;
      const st = map.get(q.name)!;
      const m = new THREE.MeshStandardMaterial({ roughness: 0.62, metalness: 0, transparent: true, opacity: 0 });
      m.userData.part = q.name;
      o.material = m;
      o.userData.part = q.name;
      o.castShadow = false;
      st.mats.push(m);
    });
    return map;
  }, [root]);

  useEffect(() => { p.onReady(parts); }, [parts]);

  // colours per mode
  useEffect(() => {
    const pal = p.mode === 'printed' ? PRINTED : ANATOMY;
    parts.forEach((st, name) => st.mats.forEach((m) => {
      const c = new THREE.Color(pal[kindOf(name)]);
      m.color.copy(c);
      m.emissive.copy(c);
      m.roughness = p.mode === 'printed' ? 0.86 : (kindOf(name) === 'artery' ? 0.38 : 0.55);
      m.needsUpdate = true;
    }));
  }, [p.mode, parts]);

  const explodeNow = useRef(p.explode);
  const afterNow = useRef(p.after ? 1 : 0);

  useFrame((_, dt) => {
    const k = p.reducedMotion ? 1 : 1 - Math.pow(0.0015, dt);
    explodeNow.current += (p.explode - explodeNow.current) * k;
    afterNow.current += ((p.after ? 1 : 0) - afterNow.current) * k;
    const show = new Set(p.view.show.flatMap((g) => GROUPS[g] ?? []));
    const ghost = new Set(p.view.ghost ?? []);
    const hi = new Set(p.view.highlight ?? []);
    const focus = new Set(p.focusParts);

    parts.forEach((st, name) => {
      let target = show.has(name) ? (ghost.has(name) ? 0.2 : 1) : 0;
      if (name.startsWith('fibroid')) target *= 1 - afterNow.current;
      if (name.startsWith('after')) target = (show.has(name.replace('after', 'fibroid')) || show.has(name) ? 1 : 0) * afterNow.current;
      if (focus.size && !focus.has(name) && target > 0.21 && name !== 'base') target = Math.min(target, 0.55);
      st.opacity += (target - st.opacity) * k;
      const glowT = focus.has(name) ? 0.38 : hi.has(name) ? 0.14 : 0;
      st.glow += (glowT - st.glow) * k;
      const ex = EXPLODE[name] ?? [0, 0, 0];
      st.obj.position.set(st.base.x + ex[0] * explodeNow.current, st.base.y + ex[1] * explodeNow.current, st.base.z + ex[2] * explodeNow.current);
      st.obj.visible = st.opacity > 0.01;
      st.mats.forEach((m) => {
        m.opacity = st.opacity;
        m.transparent = st.opacity < 0.995;
        m.depthWrite = st.opacity > 0.5;
        m.emissiveIntensity = st.glow;
      });
    });
  });

  return (
    <primitive
      object={root}
      onClick={(e: any) => { if (!p.onPartTap) return; e.stopPropagation(); const n = e.object?.userData?.part; if (n) p.onPartTap(n); }}
      onPointerOver={(e: any) => { e.stopPropagation(); document.body.style.cursor = p.onPartTap ? 'pointer' : ''; }}
      onPointerOut={() => { document.body.style.cursor = ''; }}
    />
  );
}

function Catheter({ path, range, mode, reducedMotion, chapterKey }: { path: Vec3[]; range?: [number, number]; mode: Mode; reducedMotion: boolean; chapterKey: string }) {
  const { geo, total, curve } = useMemo(() => {
    const curve = new THREE.CatmullRomCurve3(path.map((v) => new THREE.Vector3(...v)), false, 'centripetal');
    const geo = new THREE.TubeGeometry(curve, 420, 0.019, 10, false);
    return { geo, total: geo.index!.count, curve };
  }, [path]);
  const prog = useRef(range ? range[0] : 0);
  const mat = useRef<THREE.MeshStandardMaterial>(null!);
  const tip = useRef<THREE.Mesh>(null!);
  useEffect(() => { if (range) prog.current = range[0]; }, [chapterKey]);
  useFrame((_, dt) => {
    const to = range ? range[1] : 0;
    const speed = 0.3; // route per second
    if (reducedMotion) prog.current = to;
    else prog.current += Math.sign(to - prog.current) * Math.min(Math.abs(to - prog.current), speed * dt);
    const per = 10 * 6;
    const n = Math.floor((total / per) * prog.current) * per;
    geo.setDrawRange(0, n);
    const visible = !!range && prog.current > 0.002;
    if (mat.current) mat.current.opacity = visible ? 0.92 : 0;
    if (tip.current) { tip.current.visible = visible; tip.current.position.copy(curve.getPointAt(Math.min(0.999, Math.max(0, prog.current)))); }
  });
  const col = mode === 'printed' ? '#dfeef4' : '#f4f7f8';
  return (
    <group>
      <mesh geometry={geo} renderOrder={2}>
        <meshStandardMaterial ref={mat} color={col} roughness={0.25} metalness={0} transparent opacity={0} emissive={'#9fc7da'} emissiveIntensity={0.15} />
      </mesh>
      <mesh ref={tip} renderOrder={3}>
        <sphereGeometry args={[0.03, 16, 16]} />
        <meshStandardMaterial color={'#ffffff'} emissive={'#bfe6f5'} emissiveIntensity={0.6} />
      </mesh>
    </group>
  );
}

function Particles({ from, targets, on, reducedMotion }: { from: Vec3; targets: Vec3[]; on: boolean; reducedMotion: boolean }) {
  const N = 90;
  const ref = useRef<THREE.InstancedMesh>(null!);
  const seeds = useMemo(() => Array.from({ length: N }, (_, i) => ({ t0: Math.random(), tgt: i % targets.length, j: new THREE.Vector3((Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.12) })), [targets.length]);
  const m = useMemo(() => new THREE.Matrix4(), []);
  const a = useMemo(() => new THREE.Vector3(...from), [from]);
  const fade = useRef(0);
  useFrame(({ clock }, dt) => {
    fade.current += ((on ? 1 : 0) - fade.current) * Math.min(1, dt * 3);
    const mesh = ref.current; if (!mesh) return;
    mesh.visible = fade.current > 0.02;
    const t = reducedMotion ? 0.5 : clock.elapsedTime;
    seeds.forEach((s, i) => {
      const u = reducedMotion ? s.t0 : (t * 0.45 + s.t0) % 1;
      const b = new THREE.Vector3(...targets[s.tgt]).add(s.j);
      const pnt = a.clone().lerp(b, ease(u));
      const sc = 0.014 * fade.current * (u < 0.85 ? 1 : (1 - u) / 0.15);
      m.makeScale(sc, sc, sc).setPosition(pnt);
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={ref} args={[undefined as any, undefined as any, N]} renderOrder={4}>
      <sphereGeometry args={[1, 8, 8]} />
      <meshStandardMaterial color={'#fbf7ec'} emissive={'#fff2cf'} emissiveIntensity={0.5} />
    </instancedMesh>
  );
}

function CameraRig({ view, chapterKey, resetKey, reducedMotion }: { view: View; chapterKey: string; resetKey: number; reducedMotion: boolean }) {
  const { camera, size, controls } = useThree() as any;
  const anim = useRef<{ t: number; fromP: THREE.Vector3; fromT: THREE.Vector3; toP: THREE.Vector3; toT: THREE.Vector3 } | null>(null);
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const tgt = new THREE.Vector3(...view.target);
    const dir = new THREE.Vector3(...view.camera).sub(tgt);
    // portrait stages need more distance to fit the same view
    const fit = aspect < 1.25 ? Math.pow(1.25 / aspect, 0.72) : 1;
    const toP = tgt.clone().add(dir.multiplyScalar(fit));
    const fromT = controls ? controls.target.clone() : tgt.clone();
    if (reducedMotion || !controls) {
      camera.position.copy(toP); if (controls) { controls.target.copy(tgt); controls.update(); }
      anim.current = null; return;
    }
    anim.current = { t: 0, fromP: camera.position.clone(), fromT, toP, toT: tgt };
  }, [chapterKey, resetKey, controls, size.width, size.height]);
  useFrame((_, dt) => {
    const a = anim.current; if (!a || !controls) return;
    a.t = Math.min(1, a.t + dt / 0.95);
    const e = ease(a.t);
    camera.position.lerpVectors(a.fromP, a.toP, e);
    controls.target.lerpVectors(a.fromT, a.toT, e);
    controls.update();
    if (a.t >= 1) anim.current = null;
  });
  return null;
}

function Projector({ anchors, parts, onOverlay, explode }: { anchors: Props['anchors']; parts: React.MutableRefObject<Map<string, PartState> | null>; onOverlay: OverlaySink; explode: number }) {
  const { camera, size } = useThree();
  const v = useMemo(() => new THREE.Vector3(), []);
  const ex = useRef(explode);
  useFrame((_, dt) => {
    ex.current += (explode - ex.current) * (1 - Math.pow(0.0015, dt));
    const items: OverlayItem[] = anchors.map((a) => {
      v.set(...a.at);
      if (a.part) {
        const st = parts.current?.get(a.part);
        const e = EXPLODE[a.part];
        if (st && e) v.add(new THREE.Vector3(e[0], e[1], e[2]).multiplyScalar(ex.current));
      }
      v.project(camera);
      return { id: a.id, x: (v.x * 0.5 + 0.5) * size.width, y: (-v.y * 0.5 + 0.5) * size.height, visible: v.z < 1 };
    });
    onOverlay(items, size.width, size.height);
  });
  return null;
}

export default function Stage(p: Props) {
  const partsRef = useRef<Map<string, PartState> | null>(null);
  const tipTargets: Vec3[] = [[0.54, 0.57, 0.05], [-0.48, 0.27, 0], [0.15, 0.34, 0], [0.24, 1.2, 0.29]];
  const pathEnd = p.catheterPath[p.catheterPath.length - 1];
  return (
    <Canvas
      className="stage-canvas"
      dpr={[1, 1.75]}
      camera={{ position: p.view.camera, fov: 30, near: 0.05, far: 60 }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      aria-hidden="true"
    >
      <hemisphereLight args={['#ffffff', '#8c8f86', 1.05]} />
      <directionalLight position={[3.5, 5, 6]} intensity={2.1} />
      <directionalLight position={[-5, 1.5, 2]} intensity={0.75} color={'#dfe8ff'} />
      <directionalLight position={[0, 3, -6]} intensity={1.1} color={'#ffe9dc'} />
      <Model {...p} onReady={(m) => { partsRef.current = m; }} />
      <Catheter path={p.catheterPath} range={p.view.catheter} mode={p.mode} reducedMotion={p.reducedMotion} chapterKey={p.chapterKey} />
      <Particles from={pathEnd} targets={tipTargets} on={!!p.view.particles} reducedMotion={p.reducedMotion} />
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} enablePan={false} minDistance={1.6} maxDistance={13} rotateSpeed={0.7} />
      <CameraRig view={p.view} chapterKey={p.chapterKey} resetKey={p.resetKey} reducedMotion={p.reducedMotion} />
      <Projector anchors={p.anchors} parts={partsRef} onOverlay={p.onOverlay} explode={p.explode} />
    </Canvas>
  );
}

export { RISK_MARKERS };
