import { useRef, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '@/store/safetyStore';
import { safetyTips } from '@/data/safetyTips';

function Box({ args, position, children, ...props }: any) {
  return (
    <mesh position={position} {...props}>
      <boxGeometry args={args} />
      {children || <meshStandardMaterial />}
    </mesh>
  );
}

function Cylinder({ args, position, rotation, children, ...props }: any) {
  return (
    <mesh position={position} rotation={rotation} {...props}>
      <cylinderGeometry args={args} />
      {children || <meshStandardMaterial />}
    </mesh>
  );
}

function Sphere({ args, position, children, ...props }: any) {
  return (
    <mesh position={position} {...props}>
      <sphereGeometry args={args} />
      {children || <meshStandardMaterial />}
    </mesh>
  );
}

function InteractivePart({
  id,
  children,
  position,
  onClick,
  name,
}: {
  id: string;
  children: React.ReactNode;
  position: [number, number, number];
  onClick: (id: string, position: [number, number, number]) => void;
  name: string;
}) {
  const [hovered, setHovered] = useState(false);
  const groupRef = useRef<THREE.Group>(null);
  const { selectedPartId, setHoveredPart } = useAppStore();
  const isSelected = selectedPartId === id;

  useFrame(() => {
    if (groupRef.current) {
      const targetScale = hovered || isSelected ? 1.03 : 1.0;
      groupRef.current.scale.lerp(
        new THREE.Vector3(targetScale, targetScale, targetScale),
        0.1
      );
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      onClick={(e: any) => {
        e.stopPropagation();
        onClick(id, position);
      }}
      onPointerOver={(e: any) => {
        e.stopPropagation();
        setHovered(true);
        setHoveredPart(id);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        setHoveredPart(null);
        document.body.style.cursor = 'auto';
      }}
    >
      {children}
      {(hovered || isSelected) && (
        <Html position={[0, 1.5, 0]} center distanceFactor={8}>
          <div className={`sg-tooltip ${isSelected ? 'sg-tooltip--selected' : ''}`}>
            {name}
            {isSelected && <span className="sg-tooltip__badge">Selected</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

function Foundation() {
  const tip = safetyTips.foundation;
  const handleClick = useAppStore((s) => s.setSelectedPart);

  return (
    <InteractivePart
      id="foundation"
      name={tip.title}
      position={[0, -0.5, 0]}
      onClick={(id, _pos) => handleClick(id)}
    >
      <Box args={[12, 1, 10]}>
        <meshStandardMaterial color="#6b7280" roughness={0.9} />
      </Box>
      <group position={[0, 0.55, 0]}>
        {Array.from({ length: 8 }).map((_, i) => (
          <Cylinder
            key={`r1-${i}`}
            args={[0.02, 0.02, 10, 8]}
            position={[-4.5 + i * 1.3, 0, 0]}
            rotation={[Math.PI / 2, 0, 0]}
          >
            <meshStandardMaterial color="#8b4513" />
          </Cylinder>
        ))}
        {Array.from({ length: 6 }).map((_, i) => (
          <Cylinder
            key={`r2-${i}`}
            args={[0.02, 0.02, 12, 8]}
            position={[0, 0, -3.5 + i * 1.4]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <meshStandardMaterial color="#8b4513" />
          </Cylinder>
        ))}
      </group>
    </InteractivePart>
  );
}

function BuildingStructure() {
  const tip = safetyTips.structure;
  const handleClick = useAppStore((s) => s.setSelectedPart);

  return (
    <InteractivePart
      id="structure"
      name={tip.title}
      position={[0, 3, 0]}
      onClick={(id, _pos) => handleClick(id)}
    >
      <Box args={[8, 0.3, 6]} position={[0, -2.5, 0]}>
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </Box>
      <Box args={[8, 0.3, 6]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </Box>
      <Box args={[8, 0.3, 6]} position={[0, 3.5, 0]}>
        <meshStandardMaterial color="#64748b" roughness={0.8} />
      </Box>

      {[
        [-3.5, 0.5, -2.5],
        [3.5, 0.5, -2.5],
        [-3.5, 0.5, 2.5],
        [3.5, 0.5, 2.5],
      ].map((pos, i) => (
        <Box key={`col-${i}`} args={[0.4, 6, 0.4]} position={pos as [number, number, number]}>
          <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.2} />
        </Box>
      ))}

      <Box args={[0.2, 6, 6]} position={[-3.8, 0.5, 0]}>
        <meshStandardMaterial color="#475569" roughness={0.8} transparent opacity={0.7} />
      </Box>
      <Box args={[0.2, 6, 6]} position={[3.8, 0.5, 0]}>
        <meshStandardMaterial color="#475569" roughness={0.8} transparent opacity={0.7} />
      </Box>

      {Array.from({ length: 4 }).map((_, i) => (
        <Cylinder
          key={`rebar-${i}`}
          args={[0.03, 0.03, 1.5, 6]}
          position={[-2 + i * 1.3, 4.2, -2]}
        >
          <meshStandardMaterial color="#8b4513" />
        </Cylinder>
      ))}
    </InteractivePart>
  );
}

function Scaffolding() {
  const tip = safetyTips.scaffolding;
  const handleClick = useAppStore((s) => s.setSelectedPart);

  const poles = useMemo(() => {
    const positions: [number, number, number][] = [];
    for (let x = -4; x <= 4; x += 2) {
      for (const z of [-4, 4]) {
        for (let y = 0; y <= 6; y += 2) {
          positions.push([x, y, z]);
        }
      }
    }
    return positions;
  }, []);

  const platforms = useMemo(
    () => [
      [-4, 1.5, 0],
      [-4, 3.5, 0],
      [-4, 5.5, 0],
    ] as [number, number, number][],
    []
  );

  return (
    <InteractivePart
      id="scaffolding"
      name={tip.title}
      position={[-4, 0, 0]}
      onClick={(id, _pos) => handleClick(id)}
    >
      {poles.map((pos, i) => (
        <Cylinder
          key={`pole-${i}`}
          args={[0.06, 0.06, 2.2, 8]}
          position={pos}
        >
          <meshStandardMaterial color="#ca8a04" metalness={0.6} roughness={0.4} />
        </Cylinder>
      ))}

      {platforms.map((pos, i) => (
        <Box key={`plat-${i}`} args={[8.5, 0.15, 1.2]} position={pos}>
          <meshStandardMaterial color="#a16207" roughness={0.9} />
        </Box>
      ))}

      {[
        [-4, 2.5, -4],
        [-4, 2.5, 4],
        [-4, 4.5, -4],
        [-4, 4.5, 4],
      ].map((pos, i) => (
        <Box
          key={`brace-${i}`}
          args={[8.5, 0.08, 0.08]}
          position={pos as [number, number, number]}
          rotation={[0, 0, i % 2 === 0 ? 0.15 : -0.15]}
        >
          <meshStandardMaterial color="#ca8a04" metalness={0.5} />
        </Box>
      ))}

      <group position={[-4, 6.5, 0]}>
        <Box args={[8.5, 0.08, 0.08]} position={[0, 0, -0.55]}>
          <meshStandardMaterial color="#dc2626" />
        </Box>
        <Box args={[8.5, 0.08, 0.08]} position={[0, 0, 0.55]}>
          <meshStandardMaterial color="#dc2626" />
        </Box>
        <Box args={[0.08, 1.0, 0.08]} position={[-4.2, -0.5, -0.55]}>
          <meshStandardMaterial color="#dc2626" />
        </Box>
        <Box args={[0.08, 1.0, 0.08]} position={[4.2, -0.5, -0.55]}>
          <meshStandardMaterial color="#dc2626" />
        </Box>
        <Box args={[0.08, 1.0, 0.08]} position={[-4.2, -0.5, 0.55]}>
          <meshStandardMaterial color="#dc2626" />
        </Box>
        <Box args={[0.08, 1.0, 0.08]} position={[4.2, -0.5, 0.55]}>
          <meshStandardMaterial color="#dc2626" />
        </Box>
      </group>
    </InteractivePart>
  );
}

function Crane() {
  const tip = safetyTips.crane;
  const handleClick = useAppStore((s) => s.setSelectedPart);
  const boomRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (boomRef.current) {
      boomRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.15) * 0.3;
    }
  });

  return (
    <InteractivePart
      id="crane"
      name={tip.title}
      position={[6, 0, -3]}
      onClick={(id, _pos) => handleClick(id)}
    >
      <Box args={[1.2, 1, 1.2]} position={[0, 0.5, 0]}>
        <meshStandardMaterial color="#7c2d12" roughness={0.8} />
      </Box>

      {Array.from({ length: 8 }).map((_, i) => (
        <Box key={`tower-${i}`} args={[0.8, 1.2, 0.8]} position={[0, 1.8 + i * 1.2, 0]}>
          <meshStandardMaterial color="#ea580c" metalness={0.3} roughness={0.6} />
        </Box>
      ))}

      <Box args={[2.5, 0.8, 1.2]} position={[-1.5, 10.5, 0]}>
        <meshStandardMaterial color="#7c2d12" roughness={0.8} />
      </Box>

      <Box args={[1, 1.2, 1]} position={[0.5, 10.5, 0]}>
        <meshStandardMaterial color="#fbbf24" roughness={0.5} />
      </Box>

      <group ref={boomRef} position={[0.5, 11, 0]}>
        <Box args={[8, 0.5, 0.5]} position={[3.5, 0, 0]}>
          <meshStandardMaterial color="#ea580c" metalness={0.3} roughness={0.6} />
        </Box>
        <Cylinder args={[0.02, 0.02, 6, 8]} position={[6, -3, 0]}>
          <meshStandardMaterial color="#1e293b" />
        </Cylinder>
        <Box args={[0.4, 0.6, 0.4]} position={[6, -6.2, 0]}>
          <meshStandardMaterial color="#fbbf24" metalness={0.6} roughness={0.3} />
        </Box>
      </group>

      {[
        [1, 0.2, 1],
        [-1, 0.2, 1],
        [1, 0.2, -1],
        [-1, 0.2, -1],
      ].map((pos, i) => (
        <Cylinder
          key={`outrigger-${i}`}
          args={[0.15, 0.15, 0.4, 8]}
          position={pos as [number, number, number]}
        >
          <meshStandardMaterial color="#1e293b" />
        </Cylinder>
      ))}
    </InteractivePart>
  );
}

function SafetyBarriers() {
  const tip = safetyTips.barriers;
  const handleClick = useAppStore((s) => s.setSelectedPart);

  return (
    <InteractivePart
      id="barriers"
      name={tip.title}
      position={[0, 0, 6]}
      onClick={(id, _pos) => handleClick(id)}
    >
      {[
        [-5, 0.5, 0],
        [5, 0.5, 0],
        [0, 0.5, -2],
        [0, 0.5, 2],
      ].map((pos, i) => (
        <group key={`fence-${i}`} position={pos as [number, number, number]}>
          <Box args={i < 2 ? [0.15, 1.2, 4.5] : [10, 1.2, 0.15]}>
            <meshStandardMaterial color="#15803d" roughness={0.8} />
          </Box>
          <Box
            args={i < 2 ? [0.16, 0.15, 4.5] : [10, 0.15, 0.16]}
            position={[0, 0.3, 0]}
          >
            <meshStandardMaterial color="#fbbf24" emissive="#fbbf24" emissiveIntensity={0.2} />
          </Box>
        </group>
      ))}

      {[
        [-4.5, 1.8, 1.5],
        [4.5, 1.8, -1.5],
        [2, 1.8, -1.8],
      ].map((pos, i) => (
        <group key={`sign-${i}`} position={pos as [number, number, number]}>
          <Cylinder args={[0.03, 0.03, 2, 8]}>
            <meshStandardMaterial color="#94a3b8" />
          </Cylinder>
          <Box args={[0.6, 0.5, 0.03]} position={[0, 0.8, 0]}>
            <meshStandardMaterial
              color={i === 0 ? '#dc2626' : i === 1 ? '#fbbf24' : '#16a34a'}
            />
          </Box>
        </group>
      ))}

      {[
        [-3, 0.35, 3],
        [-1, 0.35, 3],
        [1, 0.35, 3],
        [3, 0.35, 3],
      ].map((pos, i) => (
        <group key={`cone-${i}`} position={pos as [number, number, number]}>
          <Cylinder args={[0.12, 0.04, 0.7, 12]}>
            <meshStandardMaterial color="#ea580c" />
          </Cylinder>
          <Cylinder args={[0.13, 0.13, 0.05, 12]} position={[0, -0.35, 0]}>
            <meshStandardMaterial color="#1e293b" />
          </Cylinder>
          <Cylinder args={[0.09, 0.07, 0.12, 12]} position={[0, -0.05, 0]}>
            <meshStandardMaterial color="#f8fafc" />
          </Cylinder>
        </group>
      ))}
    </InteractivePart>
  );
}

function Workers() {
  const tip = safetyTips.ppe;
  const handleClick = useAppStore((s) => s.setSelectedPart);

  const workers = useMemo(
    () => [
      { pos: [2, 0.9, 2] as [number, number, number], rot: 0.5 },
      { pos: [-2, 0.9, -1] as [number, number, number], rot: -0.8 },
      { pos: [0, 4.1, 0] as [number, number, number], rot: 1.2 },
      { pos: [5, 0.9, 2] as [number, number, number], rot: 2.0 },
    ],
    []
  );

  return (
    <InteractivePart
      id="ppe"
      name={tip.title}
      position={[0, 0, 0]}
      onClick={(id, _pos) => handleClick(id)}
    >
      {workers.map((worker, i) => (
        <group
          key={`worker-${i}`}
          position={worker.pos}
          rotation={[0, worker.rot, 0]}
        >
          <Box args={[0.35, 0.55, 0.25]}>
            <meshStandardMaterial color="#facc15" roughness={0.8} />
          </Box>
          <Box args={[0.36, 0.08, 0.26]} position={[0, 0.1, 0]}>
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </Box>
          <Box args={[0.36, 0.08, 0.26]} position={[0, -0.1, 0]}>
            <meshStandardMaterial color="#cbd5e1" metalness={0.8} roughness={0.2} />
          </Box>
          <group position={[0, 0.45, 0]}>
            <Sphere args={[0.14, 12, 12]}>
              <meshStandardMaterial color="#f8fafc" roughness={0.5} />
            </Sphere>
            <Cylinder args={[0.16, 0.16, 0.04, 16]} position={[0, -0.05, 0]}>
              <meshStandardMaterial color="#f8fafc" roughness={0.5} />
            </Cylinder>
          </group>
          <Box args={[0.12, 0.5, 0.15]} position={[-0.08, -0.55, 0]}>
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </Box>
          <Box args={[0.12, 0.5, 0.15]} position={[0.08, -0.55, 0]}>
            <meshStandardMaterial color="#1e293b" roughness={0.9} />
          </Box>
          <Box args={[0.1, 0.4, 0.1]} position={[-0.25, 0, 0]} rotation={[0, 0, 0.2]}>
            <meshStandardMaterial color="#facc15" roughness={0.8} />
          </Box>
          <Box args={[0.1, 0.4, 0.1]} position={[0.25, 0, 0]} rotation={[0, 0, -0.2]}>
            <meshStandardMaterial color="#facc15" roughness={0.8} />
          </Box>
        </group>
      ))}
    </InteractivePart>
  );
}

function Ground() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.01, 0]} receiveShadow>
      <planeGeometry args={[50, 50]} />
      <meshStandardMaterial color="#57534e" roughness={1} />
    </mesh>
  );
}

export default function ConstructionModel() {
  return (
    <group>
      <Ground />
      <gridHelper args={[40, 40, '#78716c', '#a8a29e']} position={[0, -1, 0]} />
      <Foundation />
      <BuildingStructure />
      <Scaffolding />
      <Crane />
      <SafetyBarriers />
      <Workers />

      <group position={[8, 0, 5]}>
        <Box args={[2, 0.8, 1.5]} position={[0, 0.4, 0]}>
          <meshStandardMaterial color="#92400e" roughness={0.9} />
        </Box>
        <Box args={[1.8, 0.6, 1.3]} position={[0.1, 1.1, 0.1]}>
          <meshStandardMaterial color="#b45309" roughness={0.9} />
        </Box>
      </group>

      <group position={[-7, 0, 4]}>
        <Box args={[2, 1.5, 1.2]} position={[0, 0.75, 0]}>
          <meshStandardMaterial color="#166534" roughness={0.8} />
        </Box>
        <Box args={[1.8, 0.05, 1]} position={[0, 1.55, 0]}>
          <meshStandardMaterial color="#14532d" roughness={0.8} />
        </Box>
      </group>
    </group>
  );
}
