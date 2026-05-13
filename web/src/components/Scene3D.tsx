import { useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import ConstructionModel from './ConstructionModel';

function CameraController() {
  const { camera, controls } = useThree();
  const target = useAppStore((s) => s.cameraTarget);
  const ref = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (target) {
      ref.current = new THREE.Vector3(...target);
      if (controls) (controls as any).enabled = false;
    } else {
      ref.current = null;
      if (controls) (controls as any).enabled = true;
    }
    return () => {
      if (controls) (controls as any).enabled = true;
    };
  }, [target, controls]);

  useFrame(() => {
    if (ref.current) {
      camera.position.lerp(new THREE.Vector3(ref.current.x + 12, ref.current.y + 10, ref.current.z + 12), 0.04);
      camera.lookAt(ref.current);
    }
  });
  return null;
}

function Lighting() {
  return (
    <>
      <ambientLight intensity={0.35} color="#7aacbe" />
      <hemisphereLight color="#6b9bb0" groundColor="#4a3d32" intensity={0.4} />
      <directionalLight position={[10, 18, 8]} intensity={1.4} color="#ffe8cc" castShadow
        shadow-mapSize={[2048, 2048]} shadow-camera-far={50}
        shadow-camera-left={-18} shadow-camera-right={18}
        shadow-camera-top={18} shadow-camera-bottom={-18}
        shadow-bias={-0.0005} shadow-normalBias={0.02} />
      <directionalLight position={[-8, 6, -8]} intensity={0.25} color="#88bbcc" />
      <directionalLight position={[-4, 3, 10]} intensity={0.15} color="#ffddaa" />
    </>
  );
}

export default function Scene3D() {
  return (
    <div className="sg-scene">
      <Canvas shadows dpr={[1, 2]}
        gl={{ antialias: true, alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15 }}>
        <color attach="background" args={['#3d6875']} />
        <fog attach="fog" args={['#3d6875', 25, 55]} />

        <PerspectiveCamera makeDefault position={[18, 16, 18]} fov={35} near={0.1} far={100} />

        <OrbitControls makeDefault enablePan enableZoom enableRotate
          minDistance={10} maxDistance={40}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 4, 0]} enableDamping dampingFactor={0.08} />

        <CameraController />
        <Lighting />
        <ConstructionModel />

        <ContactShadows position={[0, -0.52, 0]} opacity={0.45} scale={30} blur={2.5} far={12} color="#2a3a42" />
      </Canvas>

      <div className="sg-controls">
        <h4>Controls</h4>
        <div className="sg-control-row"><kbd>Click</kbd><span>Select part</span></div>
        <div className="sg-control-row"><kbd>Drag</kbd><span>Rotate view</span></div>
        <div className="sg-control-row"><kbd>Scroll</kbd><span>Zoom</span></div>
      </div>
    </div>
  );
}
