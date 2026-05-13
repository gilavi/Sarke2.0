import { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { safetyTips } from '../data/safetyTips';

/* ─── Material configs ─── */
const concrete = { color: "#b8b3ab", roughness: 0.85 };
const concreteLight = { color: '#c8c3bb', roughness: 0.8 };
const concreteDark = { color: '#9a9590', roughness: 0.9 };
const columnMat = { color: '#a39e98', roughness: 0.8 };
const rebar = { color: '#8b6239', roughness: 0.9 };
const scaffold = { color: '#c9a84c', roughness: 0.4, metalness: 0.35 };
const craneMat = { color: '#f0c040', roughness: 0.35, metalness: 0.4 };
const fenceMat = { color: '#e8892c', roughness: 0.7 };
const excavator = { color: '#f5a623', roughness: 0.5, metalness: 0.2 };
const vest = { color: '#f5c518', roughness: 0.7 };
const helmet = { color: '#f5f5f5', roughness: 0.3 };
const skin = { color: '#c8956c', roughness: 0.8 };
const pants = { color: '#2e4057', roughness: 0.85 };
const wood = { color: '#a08050', roughness: 0.9 };

/* ─── Interactive wrapper ─── */
function Zone({ id, children, pos, name }: { id: string; children: React.ReactNode; pos: [number, number, number]; name: string }) {
  const [hovered, setHovered] = useState(false);
  const ref = useRef<THREE.Group>(null);
  const { selectedPartId, setHoveredPart, setSelectedPart } = useAppStore();
  const isSel = selectedPartId === id;

  useEffect(() => {
    return () => { document.body.style.cursor = 'auto'; };
  }, []);

  useFrame(() => {
    if (ref.current) {
      const t = hovered || isSel ? 1.015 : 1;
      ref.current.scale.lerp(new THREE.Vector3(t, t, t), 0.12);
    }
  });

  return (
    <group
      ref={ref}
      position={pos}
      onClick={(e: any) => { e.stopPropagation(); setSelectedPart(id); }}
      onPointerOver={(e: any) => { e.stopPropagation(); setHovered(true); setHoveredPart(id); document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { setHovered(false); setHoveredPart(null); document.body.style.cursor = 'auto'; }}
    >
      {children}
      {(hovered || isSel) && (
        <Html position={[0, 2.5, 0]} center distanceFactor={10}>
          <div className={`sg-tooltip${isSel ? ' sg-tooltip--selected' : ''}`}>{name}{isSel && <span className="sg-tooltip__badge">Selected</span>}</div>
        </Html>
      )}
    </group>
  );
}

/* ═══ 1. FOUNDATION & GROUND ═══ */
function FoundationZone() {
  const tip = safetyTips.foundation;
  const bars = useMemo(() => {
    const arr: { p: [number,number,number]; r: [number,number,number]; len: number }[] = [];
    for (let i = 0; i < 11; i++) arr.push({ p: [-5 + i, -0.35, 0], r: [Math.PI/2,0,0], len: 10 });
    for (let i = 0; i < 9; i++) arr.push({ p: [0, -0.35, -4 + i], r: [0,0,Math.PI/2], len: 12 });
    return arr;
  }, []);

  return (
    <Zone id="foundation" name={tip.title} pos={[0, 0, 0]}>
      <mesh position={[0, -0.55, 0]} receiveShadow>
        <boxGeometry args={[14, 0.3, 12]} />
        <meshStandardMaterial color="#9e968a" roughness={0.95} />
      </mesh>
      <RoundedBox args={[12, 0.5, 10]} radius={0.06} smoothness={3} position={[0, -0.25, 0]} castShadow receiveShadow>
        <meshStandardMaterial {...concrete} />
      </RoundedBox>
      <group position={[0, 0, 0]}>
        {bars.map((b, i) => (
          <mesh key={i} position={b.p} rotation={b.r}><cylinderGeometry args={[0.02, 0.02, b.len, 6]} /><meshStandardMaterial {...rebar} /></mesh>
        ))}
      </group>
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-5 + i * 1.7, 0.02, 5.05]} rotation={[Math.PI/2, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.06, 8]} />
          <meshStandardMaterial color="#6b6864" metalness={0.5} roughness={0.5} />
        </mesh>
      ))}
    </Zone>
  );
}

/* ═══ 2. BUILDING — 4 floors ═══ */
function StructureZone() {
  const tip = safetyTips.structure;
  const floors = 4;
  const floorH = 2.2;
  const colPositions: [number, number, number][] = [
    [-4, 0, -3.5], [-1.3, 0, -3.5], [1.3, 0, -3.5], [4, 0, -3.5],
    [-4, 0, 3.5],  [-1.3, 0, 3.5],  [1.3, 0, 3.5],  [4, 0, 3.5],
  ];

  return (
    <Zone id="structure" name={tip.title} pos={[0, 0, 0]}>
      {Array.from({ length: floors }).map((_, floor) => {
        const y = floor * floorH;
        return (
          <group key={floor}>
            <RoundedBox args={[9.5, 0.25, 8]} radius={0.04} smoothness={3}
              position={[0, y + floorH - 0.12, 0]} castShadow receiveShadow>
              <meshStandardMaterial {...concreteLight} />
            </RoundedBox>
            <RoundedBox args={[9.6, 0.08, 8.1]} radius={0.02} smoothness={2}
              position={[0, y + floorH + 0.04, 0]}>
              <meshStandardMaterial {...concreteDark} />
            </RoundedBox>
            {floor < floors && colPositions.map((cp, ci) => (
              <RoundedBox key={ci} args={[0.55, floorH, 0.55]} radius={0.06} smoothness={3}
                position={[cp[0], y + floorH / 2, cp[2]]} castShadow>
                <meshStandardMaterial {...columnMat} />
              </RoundedBox>
            ))}
          </group>
        );
      })}
      {Array.from({ length: 8 }).map((_, i) => (
        <mesh key={`rebar-${i}`} position={[-3 + i * 0.9, floors * floorH + 0.4, -2.5 + (i % 3) * 2.5]} castShadow>
          <cylinderGeometry args={[0.04, 0.04, 0.9, 8]} />
          <meshStandardMaterial {...rebar} />
        </mesh>
      ))}
    </Zone>
  );
}

/* ═══ 3. SCAFFOLDING + Netting ═══ */
function ScaffoldingZone() {
  const tip = safetyTips.scaffolding;
  const { poles, braces, platforms } = useMemo(() => {
    const p: [number,number,number][] = [];
    const b: {p:[number,number,number];r:[number,number,number];len:number}[] = [];
    const pl: [number,number,number][] = [];
    const levels = [0.5, 2.7, 4.9, 7.1, 9.3];
    const spacing = 1.6;

    for (let z = -4; z <= 4; z += spacing) for (const y of levels) p.push([-5, y, z]);
    for (let z = -4; z <= 4; z += spacing) for (const y of levels) p.push([5, y, z]);
    for (let x = -3.2; x <= 3.2; x += spacing) for (const y of levels) p.push([x, y, -4.2]);

    for (const y of levels) {
      for (const z of [-4, -2.4, -0.8, 0.8, 2.4, 4]) b.push({ p: [0, y, z], r: [0, 0, Math.PI/2], len: 10 });
      for (let x = -5; x <= 5; x += spacing) b.push({ p: [x, y, -0.1], r: [Math.PI/2, 0, 0], len: 8.4 });
    }
    for (const y of [2.7, 4.9, 7.1]) {
      pl.push([0, y, -4.5]); pl.push([-5, y, 0]); pl.push([5, y, 0]);
    }
    return { poles: p, braces: b, platforms: pl };
  }, []);

  const netPanels = useMemo(() => {
    const panels: { p: [number,number,number]; s: [number,number] }[] = [];
    const zFront = 4.15;
    const yBottom = -0.3;
    const yTop = 10.3;
    const xPositions = [-4, -2.4, -0.8, 0.8, 2.4, 4];
    for (let i = 0; i < xPositions.length - 1; i++) {
      const xMid = (xPositions[i] + xPositions[i + 1]) / 2;
      const xWidth = xPositions[i + 1] - xPositions[i] - 0.05;
      panels.push({ p: [xMid, (yBottom + yTop) / 2, zFront], s: [xWidth, yTop - yBottom] });
    }
    return panels;
  }, []);

  return (
    <Zone id="scaffolding" name={tip.title} pos={[0, 0, 0]}>
      {poles.map((p, i) => (
        <mesh key={`p-${i}`} position={p} castShadow><cylinderGeometry args={[0.045, 0.045, 2.0, 10]} /><meshStandardMaterial {...scaffold} /></mesh>
      ))}
      {braces.map((b, i) => (
        <mesh key={`b-${i}`} position={b.p} rotation={b.r} castShadow><cylinderGeometry args={[0.035, 0.035, b.len, 8]} /><meshStandardMaterial {...scaffold} /></mesh>
      ))}
      {platforms.map((p, i) => (
        <RoundedBox key={`pl-${i}`}
          args={Math.abs(p[0]) > 4 ? [0.8, 0.1, 8.5] : [10.5, 0.1, 0.8]}
          radius={0.02} smoothness={2} position={p} castShadow>
          <meshStandardMaterial {...wood} />
        </RoundedBox>
      ))}
      {[
        { s: [-5, 0.5, 4.2] as [number,number,number], e: [5, 9.3, 4.2] as [number,number,number] },
        { s: [5, 0.5, 4.2] as [number,number,number], e: [-5, 9.3, 4.2] as [number,number,number] },
      ].map((d, i) => {
        const start = new THREE.Vector3(...d.s);
        const end = new THREE.Vector3(...d.e);
        const mid = start.clone().add(end).multiplyScalar(0.5);
        const dir = end.clone().sub(start);
        const len = dir.length();
        const ang = Math.atan2(dir.y, Math.abs(dir.x));
        return (
          <mesh key={`diag-${i}`} position={[mid.x, mid.y, mid.z]} rotation={[0, 0, dir.y > 0 ? ang : -ang]} castShadow>
            <cylinderGeometry args={[0.025, 0.025, len, 6]} />
            <meshStandardMaterial {...scaffold} />
          </mesh>
        );
      })}
      <group position={[0, 10.2, 0]}>
        {[-4.2, 4.2].map((z, i) => (
          <RoundedBox key={i} args={[10.5, 0.05, 0.05]} radius={0.01} smoothness={2} position={[0, 0, z - 0.1]}>
            <meshStandardMaterial color="#c0392b" roughness={0.5} />
          </RoundedBox>
        ))}
      </group>

      {/* Safety Debris Netting */}
      {netPanels.map((panel, i) => (
        <mesh key={`net-${i}`} position={panel.p}>
          <planeGeometry args={[panel.s[0], panel.s[1]]} />
          <meshStandardMaterial
            color="#5a8a7a" roughness={0.9} transparent opacity={0.3}
            side={THREE.DoubleSide} depthWrite={false}
          />
        </mesh>
      ))}
      {[{ y: 2.7 }, { y: 4.9 }, { y: 7.1 }].map((level, i) => (
        <mesh key={`netband-${i}`} position={[0, level.y, 4.18]}>
          <planeGeometry args={[10.2, 0.35]} />
          <meshStandardMaterial
            color="#4a7a6a" roughness={0.85} transparent opacity={0.25}
            side={THREE.DoubleSide} depthWrite={false}
          />
        </mesh>
      ))}
    </Zone>
  );
}

/* ═══ 4. TOWER CRANE ═══ */
function CraneZone() {
  const tip = safetyTips.crane;
  const boomRef = useRef<THREE.Group>(null);
  useFrame((s) => { if (boomRef.current) boomRef.current.rotation.y = Math.sin(s.clock.elapsedTime * 0.1) * 0.35; });

  return (
    <Zone id="crane" name={tip.title} pos={[0, 0, -7]}>
      <RoundedBox args={[2.5, 0.8, 2.5]} radius={0.05} smoothness={3} position={[0, 0.4, 0]} castShadow>
        <meshStandardMaterial {...concreteDark} />
      </RoundedBox>

      {Array.from({ length: 11 }).map((_, i) => (
        <group key={`t-${i}`} position={[0, 1.2 + i, 0]}>
          {[[-0.3,-0.3],[0.3,-0.3],[-0.3,0.3],[0.3,0.3]].map(([x,z], j) => (
            <mesh key={j} position={[x, 0, z]} castShadow><cylinderGeometry args={[0.035, 0.035, 1.0, 6]} /><meshStandardMaterial {...craneMat} /></mesh>
          ))}
          <mesh position={[0, 0, -0.3]} rotation={[0,0,0.3]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.95, 4]} /><meshStandardMaterial {...craneMat} /></mesh>
          <mesh position={[0, 0, 0.3]} rotation={[0,0,0.3]} castShadow><cylinderGeometry args={[0.02, 0.02, 0.95, 4]} /><meshStandardMaterial {...craneMat} /></mesh>
        </group>
      ))}

      <mesh position={[0, 12.4, 0]} castShadow><cylinderGeometry args={[0.55, 0.55, 0.25, 16]} /><meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} /></mesh>

      <RoundedBox args={[1, 1.1, 0.9]} radius={0.05} smoothness={3} position={[0.5, 13.1, 0.3]} castShadow>
        <meshStandardMaterial color="#e0e0e0" roughness={0.4} metalness={0.2} />
      </RoundedBox>
      <mesh position={[0.5, 13.3, 0.76]}>
        <boxGeometry args={[0.7, 0.5, 0.04]} />
        <meshStandardMaterial color="#8ecae6" roughness={0.15} metalness={0.2} transparent opacity={0.5} />
      </mesh>

      <RoundedBox args={[3.2, 0.9, 1.3]} radius={0.06} smoothness={3} position={[-1.5, 13.0, 0]} castShadow>
        <meshStandardMaterial {...craneMat} />
      </RoundedBox>

      {[-2.2, -3.0].map((x, i) => (
        <RoundedBox key={i} args={[0.55, 0.7, 0.9]} radius={0.03} smoothness={2} position={[x, 12.5, 0]} castShadow>
          <meshStandardMaterial {...concreteDark} />
        </RoundedBox>
      ))}

      <group ref={boomRef} position={[0, 12.8, 0]}>
        <RoundedBox args={[11, 0.4, 0.4]} radius={0.03} smoothness={3} position={[5, 0, 0]} castShadow>
          <meshStandardMaterial {...craneMat} />
        </RoundedBox>
        <mesh position={[5, 0.35, 0]} castShadow><cylinderGeometry args={[0.035, 0.035, 11, 6]} /><meshStandardMaterial {...craneMat} /></mesh>
        {Array.from({ length: 6 }).map((_, i) => (
          <mesh key={i} position={[1.5 + i * 1.6, 0.18, 0]} rotation={[0, 0, 0.4]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.55, 4]} /><meshStandardMaterial {...craneMat} />
          </mesh>
        ))}
        <RoundedBox args={[1.2, 0.35, 0.35]} radius={0.03} smoothness={2} position={[10.6, 0, 0]} castShadow>
          <meshStandardMaterial color="#c0392b" roughness={0.5} metalness={0.2} />
        </RoundedBox>
        <mesh position={[6, -0.25, 0]} castShadow><boxGeometry args={[0.4, 0.2, 0.35]} /><meshStandardMaterial color="#555" metalness={0.5} roughness={0.4} /></mesh>
        <mesh position={[6, -3.5, 0]} castShadow><cylinderGeometry args={[0.01, 0.01, 6.2, 4]} /><meshStandardMaterial color="#333" roughness={0.6} /></mesh>
        <RoundedBox args={[0.35, 0.4, 0.35]} radius={0.03} smoothness={2} position={[6, -6.6, 0]} castShadow>
          <meshStandardMaterial color="#f0c040" metalness={0.4} roughness={0.35} />
        </RoundedBox>
        <RoundedBox args={[0.7, 0.5, 0.5]} radius={0.04} smoothness={2} position={[6, -7.3, 0]} castShadow>
          <meshStandardMaterial {...concrete} />
        </RoundedBox>
        <mesh position={[0, 0.7, 0]} rotation={[0, 0, -0.3]} castShadow><cylinderGeometry args={[0.04, 0.04, 1.1, 6]} /><meshStandardMaterial {...craneMat} /></mesh>
        <mesh position={[-0.3, 0.7, 0]} rotation={[0, 0, 0.4]} castShadow><cylinderGeometry args={[0.04, 0.04, 0.85, 6]} /><meshStandardMaterial {...craneMat} /></mesh>
      </group>
    </Zone>
  );
}

/* ═══ 5. SAFETY BARRIERS ═══ */
function BarriersZone() {
  const tip = safetyTips.barriers;
  return (
    <Zone id="barriers" name={tip.title} pos={[0, 0, 0]}>
      {[
        ...Array.from({ length: 15 }).map((_, i) => [-6.5 + i * 0.95, 0, 6.5] as [number,number,number]),
        ...Array.from({ length: 15 }).map((_, i) => [-6.5 + i * 0.95, 0, -6.5] as [number,number,number]),
        ...Array.from({ length: 13 }).map((_, i) => [-6.5, 0, -5.5 + i * 0.95] as [number,number,number]),
        ...Array.from({ length: 13 }).map((_, i) => [6.5, 0, -5.5 + i * 0.95] as [number,number,number]),
      ].map((p, i) => (
        <group key={i} position={p}>
          <mesh castShadow><boxGeometry args={[0.9, 1.1, 0.05]} /><meshStandardMaterial {...fenceMat} /></mesh>
          <mesh position={[0, 0.2, 0.03]}><boxGeometry args={[0.9, 0.12, 0.02]} /><meshStandardMaterial color="#f0ebe3" roughness={0.5} /></mesh>
          <mesh position={[0.45, 0, 0]} castShadow><cylinderGeometry args={[0.025, 0.025, 1.2, 6]} /><meshStandardMaterial color="#555" metalness={0.4} roughness={0.5} /></mesh>
        </group>
      ))}
    </Zone>
  );
}

/* ═══ 6. WORKERS / PPE ═══ */
function WorkersZone() {
  const tip = safetyTips.ppe;
  const workers = useMemo(() => [
    { p: [3, 0.7, 4] as [number,number,number], r: 0.8 },
    { p: [-3, 0.7, 2] as [number,number,number], r: -0.5 },
    { p: [0, 2.9, 2.5] as [number,number,number], r: 1.2 },
    { p: [-3.5, 5.1, -2] as [number,number,number], r: -1.0 },
    { p: [3, 5.1, 0] as [number,number,number], r: 2.2 },
    { p: [0, 7.3, -2] as [number,number,number], r: 0.4 },
    { p: [2, 9.5, 1.5] as [number,number,number], r: -0.7 },
  ], []);

  return (
    <Zone id="ppe" name={tip.title} pos={[0, 0, 0]}>
      {workers.map((w, i) => <Worker key={i} pos={w.p} rot={w.r} />)}
    </Zone>
  );
}

function Worker({ pos, rot }: { pos: [number,number,number]; rot: number }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((s) => { if (ref.current) ref.current.position.y = pos[1] + Math.sin(s.clock.elapsedTime * 1.5 + pos[0]) * 0.012; });

  return (
    <group ref={ref} position={pos} rotation={[0, rot, 0]}>
      <RoundedBox args={[0.4, 0.5, 0.22]} radius={0.04} smoothness={2} position={[0, 0, 0]} castShadow>
        <meshStandardMaterial {...vest} />
      </RoundedBox>
      <mesh position={[0, 0.05, 0.12]}><boxGeometry args={[0.42, 0.06, 0.02]} />
        <meshStandardMaterial color="#e8e0d4" roughness={0.3} metalness={0.2} />
      </mesh>
      <RoundedBox args={[0.14, 0.35, 0.14]} radius={0.025} smoothness={2} position={[-0.1, -0.42, 0]} castShadow>
        <meshStandardMaterial {...pants} />
      </RoundedBox>
      <RoundedBox args={[0.14, 0.35, 0.14]} radius={0.025} smoothness={2} position={[0.1, -0.42, 0]} castShadow>
        <meshStandardMaterial {...pants} />
      </RoundedBox>
      <mesh position={[0, 0.48, 0]} castShadow><sphereGeometry args={[0.13, 10, 10]} /><meshStandardMaterial {...skin} /></mesh>
      <group position={[0, 0.56, 0]}>
        <mesh castShadow><sphereGeometry args={[0.15, 10, 8, 0, Math.PI*2, 0, Math.PI/2]} /><meshStandardMaterial {...helmet} /></mesh>
        <mesh position={[0, -0.02, 0]} castShadow><cylinderGeometry args={[0.16, 0.16, 0.03, 12]} /><meshStandardMaterial {...helmet} /></mesh>
      </group>
      <RoundedBox args={[0.1, 0.35, 0.1]} radius={0.02} smoothness={2} position={[-0.26, 0, 0]} rotation={[0,0,0.2]} castShadow>
        <meshStandardMaterial {...vest} />
      </RoundedBox>
      <RoundedBox args={[0.1, 0.35, 0.1]} radius={0.02} smoothness={2} position={[0.26, 0, 0]} rotation={[0,0,-0.2]} castShadow>
        <meshStandardMaterial {...vest} />
      </RoundedBox>
    </group>
  );
}

/* ═══ SITE EQUIPMENT ═══ */
function Equipment() {
  return (
    <group>
      {/* Excavator */}
      <group position={[-5.5, 0, 2]} rotation={[0, 0.6, 0]}>
        <RoundedBox args={[1.2, 0.8, 0.7]} radius={0.05} smoothness={3} position={[0, 0.55, 0]} castShadow>
          <meshStandardMaterial {...excavator} />
        </RoundedBox>
        <RoundedBox args={[0.6, 0.65, 0.5]} radius={0.04} smoothness={2} position={[-0.15, 1.25, 0]} castShadow>
          <meshStandardMaterial color="#e8e8e8" roughness={0.4} metalness={0.15} />
        </RoundedBox>
        <mesh position={[-0.15, 1.4, 0.26]}>
          <boxGeometry args={[0.45, 0.3, 0.02]} />
          <meshStandardMaterial color="#8ecae6" roughness={0.15} transparent opacity={0.5} />
        </mesh>
        {[-0.4, 0.4].map((z, i) => (
          <RoundedBox key={i} args={[1.0, 0.25, 0.2]} radius={0.05} smoothness={2} position={[0, 0.12, z]} castShadow>
            <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
          </RoundedBox>
        ))}
        <group position={[0.6, 0.8, 0]}>
          <RoundedBox args={[1.4, 0.15, 0.15]} radius={0.03} smoothness={2} position={[0.5, 0.2, 0]} rotation={[0, 0, -0.6]} castShadow>
            <meshStandardMaterial {...excavator} />
          </RoundedBox>
          <RoundedBox args={[1.0, 0.12, 0.12]} radius={0.025} smoothness={2} position={[1.2, -0.3, 0]} rotation={[0, 0, 0.8]} castShadow>
            <meshStandardMaterial {...excavator} />
          </RoundedBox>
          <mesh position={[1.5, -0.6, 0]} rotation={[0, 0, -0.3]} castShadow>
            <boxGeometry args={[0.35, 0.3, 0.3]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* Rebar bundles */}
      <group position={[5.5, 0, 3]}>
        {Array.from({ length: 5 }).map((_, i) => (
          <mesh key={i} position={[(i % 3) * 0.25, 0.15 + Math.floor(i/3) * 0.12, (i % 2) * 0.25]} rotation={[Math.PI/2, 0, i * 0.3]} castShadow>
            <cylinderGeometry args={[0.06, 0.06, 1.2, 8]} /><meshStandardMaterial {...rebar} />
          </mesh>
        ))}
      </group>

      {/* Concrete blocks */}
      <group position={[5.5, 0, -2]}>
        {[
          [0, 0.15, 0], [0.35, 0.15, 0], [0, 0.45, 0],
          [0.5, 0.15, 0.4], [0.15, 0.15, 0.4],
        ].map((p, i) => (
          <RoundedBox key={i} args={[0.3, 0.3, 0.3]} radius={0.02} smoothness={2} position={p as [number,number,number]} castShadow>
            <meshStandardMaterial {...concrete} />
          </RoundedBox>
        ))}
      </group>

      {/* Container */}
      <RoundedBox args={[1.2, 0.9, 0.8]} radius={0.04} smoothness={3} position={[-5, 0.45, -3]} castShadow>
        <meshStandardMaterial color="#6b7a5c" roughness={0.8} />
      </RoundedBox>

      {/* Wooden pallets */}
      <group position={[4, 0, 5]}>
        <RoundedBox args={[0.9, 0.06, 0.9]} radius={0.01} smoothness={2} position={[0, 0.03, 0]} castShadow>
          <meshStandardMaterial {...wood} />
        </RoundedBox>
        <RoundedBox args={[0.8, 0.4, 0.8]} radius={0.02} smoothness={2} position={[0, 0.25, 0]} castShadow>
          <meshStandardMaterial color="#a88b5a" roughness={0.85} />
        </RoundedBox>
      </group>
    </group>
  );
}

/* ═══ STREET LAMPS ═══ */
function StreetLamps() {
  const positions: [number, number, number][] = [[-5, 0, 5], [5, 0, 5], [-5, 0, -5], [5, 0, -5]];
  return (
    <group>
      {positions.map((p, i) => (
        <group key={i} position={p}>
          <mesh position={[0, 1.8, 0]} castShadow><cylinderGeometry args={[0.04, 0.05, 3.6, 8]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 3.7, 0]}><boxGeometry args={[0.25, 0.08, 0.2]} />
            <meshStandardMaterial color="#5a5a5a" roughness={0.5} metalness={0.4} />
          </mesh>
          <mesh position={[0, 3.62, 0]}><sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial color="#ffd080" emissive="#ffaa44" emissiveIntensity={2} roughness={0.3} />
          </mesh>
          <pointLight position={[0, 3.3, 0]} intensity={8} distance={8} color="#ffd080" decay={2} />
        </group>
      ))}
    </group>
  );
}

/* ═══ MAIN EXPORT ═══ */
export default function ConstructionModel() {
  return (
    <group>
      <FoundationZone />
      <StructureZone />
      <ScaffoldingZone />
      <CraneZone />
      <BarriersZone />
      <WorkersZone />
      <Equipment />
      <StreetLamps />
    </group>
  );
}
