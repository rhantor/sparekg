'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { geoEquirectangular, geoPath } from 'd3-geo';
import { feature } from 'topojson-client';
import type { GeometryCollection, Topology } from 'topojson-specification';
import landTopo from 'world-atlas/land-110m.json';

/*
 * A small night-side globe for the landing hero. It turns towards the pointer,
 * can be dragged, and draws the corridors SpareKG serves — the KUL → DAC route
 * in sunrise gold, with a parcel of light travelling along it.
 *
 * Everything is procedural (no textures or models to download), and the
 * render loop stops whenever the globe scrolls out of view.
 */

const DEG = Math.PI / 180;

function toVec(lat: number, lon: number, r = 1) {
  const phi = (90 - lat) * DEG;
  const theta = (lon + 180) * DEG;
  return new THREE.Vector3(
    -r * Math.sin(phi) * Math.cos(theta),
    r * Math.cos(phi),
    r * Math.sin(phi) * Math.sin(theta),
  );
}

const CITIES = {
  KUL: [2.75, 101.71],
  DAC: [23.84, 90.4],
  CGP: [22.25, 91.81],
  SIN: [1.36, 103.99],
  BKK: [13.69, 100.75],
  DXB: [25.25, 55.36],
  DOH: [25.27, 51.6],
  JED: [21.68, 39.15],
  CCU: [22.65, 88.45],
  LHR: [51.47, -0.45],
} as const;
type City = keyof typeof CITIES;
const cityVec = (c: City, r = 1) => toVec(CITIES[c][0], CITIES[c][1], r);

const MAIN: [City, City] = ['KUL', 'DAC'];
const SIDE: [City, City][] = [
  ['SIN', 'DAC'], ['KUL', 'CGP'], ['BKK', 'DAC'], ['DXB', 'DAC'],
  ['DOH', 'DAC'], ['JED', 'DAC'], ['LHR', 'DAC'], ['KUL', 'CCU'],
];

function arcCurve(a: City, b: City) {
  const va = cityVec(a);
  const vb = cityVec(b);
  const lift = 1 + Math.min(0.55, va.distanceTo(vb) * 0.42);
  const c1 = va.clone().lerp(vb, 0.25).normalize().multiplyScalar(lift);
  const c2 = va.clone().lerp(vb, 0.75).normalize().multiplyScalar(lift);
  return new THREE.CubicBezierCurve3(va, c1, c2, vb);
}

/** Soft round light, drawn once into a canvas. */
function makeGlowTexture() {
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * Dots on land only, so the continents read at a glance. The coastline is
 * drawn once into a small equirectangular canvas, then evenly spread points
 * over the sphere are kept wherever that map is filled.
 */
function makeLandDots(count: number) {
  const W = 720;
  const H = 360;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  const projection = geoEquirectangular().scale(W / (2 * Math.PI)).translate([W / 2, H / 2]);
  const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  geoPath(projection, ctx)(feature(topo, topo.objects.land));
  ctx.fill();
  const pixels = ctx.getImageData(0, 0, W, H).data;

  const out: number[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const lat = Math.asin(y) / DEG;
    const lon = ((((golden * i) / DEG) % 360) + 360) % 360 - 180;
    const px = Math.min(W - 1, Math.floor(((lon + 180) / 360) * W));
    const py = Math.min(H - 1, Math.floor(((90 - lat) / 180) * H));
    if (pixels[(py * W + px) * 4 + 3] > 128) {
      const v = toVec(lat, lon, 1.004);
      out.push(v.x, v.y, v.z);
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  return geo;
}

const ATMOSPHERE_VERT = /* glsl */ `
  varying vec3 vNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const ATMOSPHERE_FRAG = /* glsl */ `
  varying vec3 vNormal;
  uniform vec3 uColor;
  void main() {
    float i = pow(max(0.0, 0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.2);
    gl_FragColor = vec4(uColor, 1.0) * i * 0.9;
  }
`;

/** The globe body: lit from the upper left, with a bright rim towards the edge. */
const BODY_VERT = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vWorldNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
const BODY_FRAG = /* glsl */ `
  varying vec3 vNormal;
  uniform vec3 uDeep;
  uniform vec3 uLit;
  uniform vec3 uRim;
  void main() {
    vec3 light = normalize(vec3(-0.6, 0.7, 0.8));
    float diffuse = clamp(dot(vNormal, light), 0.0, 1.0);
    float rim = pow(1.0 - clamp(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0, 1.0), 2.5);
    vec3 col = mix(uDeep, uLit, diffuse * 0.85) + uRim * rim * 0.9;
    gl_FragColor = vec4(col, 1.0);
  }
`;

interface Pointer { x: number; y: number }

function Arc({ curve, color, width, period, offset, still }: {
  curve: THREE.Curve<THREE.Vector3>; color: string; width: number; period: number; offset: number; still: boolean;
}) {
  const SEG = 80;
  const RAD = 6;
  const geo = useMemo(() => new THREE.TubeGeometry(curve, SEG, width, RAD, false), [curve, width]);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  const total = SEG * RAD * 6;

  useFrame(({ clock }) => {
    if (still) return;
    // Draw in, hold, fade, repeat.
    const t = ((clock.elapsedTime + offset) % period) / period;
    const draw = Math.min(1, t / 0.45);
    geo.setDrawRange(0, Math.floor(total * draw) - (Math.floor(total * draw) % 6));
    if (mat.current) mat.current.opacity = t > 0.8 ? (1 - (t - 0.8) / 0.2) * 0.5 : 0.5;
  });

  return (
    <mesh geometry={geo}>
      <meshBasicMaterial ref={mat} color={color} transparent opacity={0.5} blending={THREE.AdditiveBlending} depthWrite={false} />
    </mesh>
  );
}

function CityMarker({ city, color, size, glow }: { city: City; color: string; size: number; glow: THREE.Texture }) {
  const p = useMemo(() => cityVec(city, 1.006), [city]);
  const ring = useRef<THREE.Mesh>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => { ring.current?.lookAt(p.clone().multiplyScalar(2)); }, [p]);

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * 0.6 + p.x * 3) % 1;
    ring.current?.scale.setScalar(1 + t * 2.4);
    if (ringMat.current) ringMat.current.opacity = (1 - t) * 0.7;
  });

  return (
    <group position={p}>
      <mesh>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <sprite scale={size * 9}>
        <spriteMaterial map={glow} color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
      </sprite>
      <mesh ref={ring}>
        <ringGeometry args={[size * 1.6, size * 2.1, 40]} />
        <meshBasicMaterial ref={ringMat} color={color} transparent side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** The parcel: a bright point flying KUL → DAC with a short comet tail. */
function Parcel({ curve, glow, still }: { curve: THREE.Curve<THREE.Vector3>; glow: THREE.Texture; still: boolean }) {
  const TAIL = 14;
  const heads = useRef<(THREE.Sprite | null)[]>([]);

  useFrame(({ clock }) => {
    const t = still ? 0.55 : (clock.elapsedTime * 0.16) % 1;
    const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    heads.current.forEach((s, i) => {
      if (!s) return;
      const k = Math.max(0, ease - i * 0.012);
      s.position.copy(curve.getPoint(k));
      const fade = (1 - i / TAIL) * (t > 0.94 ? (1 - t) / 0.06 : 1);
      (s.material as THREE.SpriteMaterial).opacity = fade;
    });
  });

  return (
    <>
      {Array.from({ length: TAIL }, (_, i) => (
        <sprite key={i} ref={(el) => { heads.current[i] = el; }} scale={i === 0 ? 0.13 : 0.09 * (1 - i / TAIL) + 0.02}>
          <spriteMaterial map={glow} color={i === 0 ? '#fff4e0' : '#ffb870'} transparent blending={THREE.AdditiveBlending} depthWrite={false} />
        </sprite>
      ))}
    </>
  );
}

function Scene({ still }: { still: boolean }) {
  const gl = useThree((s) => s.gl);
  const pointer = useRef<Pointer>({ x: 0, y: 0 });
  const drag = useRef({ yaw: 0, vel: 0, down: false, lastX: 0 });

  // The globe follows the pointer anywhere on the page, and can be dragged.
  useEffect(() => {
    const canvas = gl.domElement;
    const onDown = (e: PointerEvent) => {
      drag.current.down = true;
      drag.current.lastX = e.clientX;
      drag.current.vel = 0;
    };
    const onMove = (e: PointerEvent) => {
      pointer.current.x = (e.clientX / window.innerWidth) * 2 - 1;
      pointer.current.y = (e.clientY / window.innerHeight) * 2 - 1;
      const d = drag.current;
      if (d.down) {
        const dx = (e.clientX - d.lastX) * 0.006;
        d.yaw += dx;
        d.vel = dx;
        d.lastX = e.clientX;
      }
    };
    const onUp = () => { drag.current.down = false; };
    canvas.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [gl]);

  const glow = useMemo(() => makeGlowTexture(), []);
  const dots = useMemo(() => makeLandDots(42000), []);
  const bodyUniforms = useMemo(
    () => ({
      uDeep: { value: new THREE.Color('#06142f') },
      uLit: { value: new THREE.Color('#123a78') },
      uRim: { value: new THREE.Color('#3f86e8') },
    }),
    [],
  );
  const atmoUniforms = useMemo(() => ({ uColor: { value: new THREE.Color('#4c8ff2') } }), []);
  const main = useMemo(() => arcCurve(...MAIN), []);
  const side = useMemo(() => SIDE.map(([a, b]) => arcCurve(a, b)), []);

  // Turn the globe so the KUL–DAC corridor faces the viewer, a little from above.
  // Spin about the pole first, then pitch, so north stays up.
  const base = useMemo(() => {
    const X = new THREE.Vector3(1, 0, 0);
    const Y = new THREE.Vector3(0, 1, 0);
    const v = toVec(13.5, 94).normalize();
    const yaw = new THREE.Quaternion().setFromAxisAngle(Y, Math.atan2(-v.x, v.z));
    const v2 = v.clone().applyQuaternion(yaw);
    const pitch = new THREE.Quaternion().setFromAxisAngle(X, Math.atan2(v2.y, v2.z));
    const tilt = new THREE.Quaternion().setFromAxisAngle(X, 0.22);
    return tilt.multiply(pitch).multiply(yaw);
  }, []);

  const outer = useRef<THREE.Group>(null);
  const orbit = useRef<THREE.Group>(null);

  useFrame(({ clock }, dt) => {
    const g = outer.current;
    if (!g) return;
    const d = drag.current;
    if (!d.down) {
      d.vel *= 0.94;
      d.yaw += d.vel;
      d.yaw *= 0.985; // ease back towards the corridor
    }
    const idle = still ? 0 : Math.sin(clock.elapsedTime * 0.25) * 0.08;
    const targetY = pointer.current.x * 0.45 + d.yaw + idle;
    const targetX = -pointer.current.y * 0.25;
    const k = 1 - Math.pow(0.001, dt);
    g.rotation.y += (targetY - g.rotation.y) * k;
    g.rotation.x += (targetX - g.rotation.x) * k;
    if (orbit.current && !still) orbit.current.rotation.z += dt * 0.35;
  });

  return (
    <group ref={outer}>
      {/* The body is lit in view space, so it stays outside the rotating group. */}
      <mesh>
        <sphereGeometry args={[1, 96, 96]} />
        <shaderMaterial vertexShader={BODY_VERT} fragmentShader={BODY_FRAG} uniforms={bodyUniforms} />
      </mesh>
      <group quaternion={base}>
        <points geometry={dots}>
          <pointsMaterial color="#a9cdff" size={0.0125} sizeAttenuation transparent opacity={0.85} depthWrite={false} />
        </points>

        {side.map((c, i) => (
          <Arc key={i} curve={c} color="#7fb2ff" width={0.0035} period={7 + (i % 3)} offset={i * 1.3} still={still} />
        ))}
        <Arc curve={main} color="#ffc27a" width={0.009} period={1e9} offset={0} still />

        {(Object.keys(CITIES) as City[]).map((c) => (
          <CityMarker
            key={c}
            city={c}
            color={c === 'KUL' || c === 'DAC' ? '#ffc27a' : '#9cc3ff'}
            size={c === 'KUL' || c === 'DAC' ? 0.016 : 0.008}
            glow={glow}
          />
        ))}
        <Parcel curve={main} glow={glow} still={still} />
      </group>

      {/* Atmosphere. */}
      <mesh scale={1.12}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial
          vertexShader={ATMOSPHERE_VERT}
          fragmentShader={ATMOSPHERE_FRAG}
          uniforms={atmoUniforms}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
          transparent
          depthWrite={false}
        />
      </mesh>

      {/* A satellite on a tilted orbit, for a sense of motion around the globe. */}
      <group rotation={[1.15, 0.3, 0]}>
        <group ref={orbit}>
          <mesh rotation={[0, 0, 0]}>
            <torusGeometry args={[1.32, 0.0018, 6, 160]} />
            <meshBasicMaterial color="#9cc3ff" transparent opacity={0.25} />
          </mesh>
          <sprite position={[1.32, 0, 0]} scale={0.09}>
            <spriteMaterial map={glow} color="#cfe3ff" transparent blending={THREE.AdditiveBlending} depthWrite={false} />
          </sprite>
        </group>
      </group>
    </group>
  );
}

export default function Globe({ className = '' }: { className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  const [still] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  // Stop rendering while the globe is scrolled out of view.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    if (wrap.current) io.observe(wrap.current);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={wrap} className={`cursor-grab active:cursor-grabbing touch-pan-y ${className}`}>
      <Canvas
        frameloop={visible ? 'always' : 'never'}
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 4.1], fov: 32 }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      >
        <Scene still={still} />
      </Canvas>
    </div>
  );
}
