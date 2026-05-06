import { Suspense, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Html, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import ConstructionModel from './ConstructionModel';

function CameraController() {
  const { camera } = useThree();
  const cameraTarget = useAppStore((s) => s.cameraTarget);
  const targetRef = useRef<THREE.Vector3 | null>(null);

  useEffect(() => {
    if (cameraTarget) {
      targetRef.current = new THREE.Vector3(...cameraTarget);
    }
  }, [cameraTarget]);

  useFrame(() => {
    if (targetRef.current) {
      camera.position.lerp(
        new THREE.Vector3(
          targetRef.current.x + 8,
          targetRef.current.y + 6,
          targetRef.current.z + 8
        ),
        0.03
      );
      camera.lookAt(targetRef.current);
    }
  });

  return null;
}

function LoadingFallback() {
  return (
    <Html center>
      <div className="sg-loading">
        <div className="sg-spinner" />
        <span>Loading 3D Scene...</span>
      </div>
    </Html>
  );
}

export default function Scene3D() {
  return (
    <div className="sg-scene">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <color attach="background" args={['#f1f5f9']} />
        <fog attach="fog" args={['#f1f5f9', 20, 50]} />

        <PerspectiveCamera makeDefault position={[12, 10, 12]} fov={50} />
        <OrbitControls
          makeDefault
          enablePan
          enableZoom
          enableRotate
          minDistance={5}
          maxDistance={30}
          maxPolarAngle={Math.PI / 2 - 0.05}
          target={[0, 2, 0]}
        />

        <CameraController />

        <ambientLight intensity={0.4} />
        <directionalLight
          position={[10, 15, 8]}
          intensity={1.2}
          castShadow
          shadow-mapSize={[2048, 2048]}
          shadow-camera-far={50}
          shadow-camera-left={-15}
          shadow-camera-right={15}
          shadow-camera-top={15}
          shadow-camera-bottom={-15}
        />
        <directionalLight position={[-5, 8, -5]} intensity={0.3} />

        <Suspense fallback={<LoadingFallback />}>
          <ConstructionModel />
          <ContactShadows
            position={[0, -1, 0]}
            opacity={0.4}
            scale={30}
            blur={2}
            far={10}
          />
        </Suspense>
      </Canvas>

      <div className="sg-controls">
        <h4>Controls</h4>
        <div className="sg-control-row">
          <kbd>Click</kbd>
          <span>Select construction part</span>
        </div>
        <div className="sg-control-row">
          <kbd>Drag</kbd>
          <span>Rotate camera</span>
        </div>
        <div className="sg-control-row">
          <kbd>Scroll</kbd>
          <span>Zoom in/out</span>
        </div>
      </div>
    </div>
  );
}
