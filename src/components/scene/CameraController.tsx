import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { SectionId } from '../../types/portfolio';
import { ISLAND_LAYOUT } from '../../constants/islandLayout';

// exponential smoothing that behaves the same at 30, 60 or 120 fps
const damp = (lambda: number, dt: number) => 1 - Math.exp(-lambda * Math.min(dt, 0.1));

interface CameraControllerProps {
  activeSection: SectionId;
  boatPosRef: React.MutableRefObject<THREE.Vector3>;
  boatForwardRef: React.MutableRefObject<THREE.Vector3>;
  isSailing: boolean;
  reducedMotion?: boolean;
  isAnyModalOpen?: boolean;
  onIntroDone?: () => void;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  activeSection,
  boatPosRef,
  boatForwardRef,
  isSailing,
  reducedMotion = false,
  isAnyModalOpen = false,
  onIntroDone,
}) => {
  const { camera, size } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const config = ISLAND_LAYOUT[activeSection];

  const targetCamPosRef = useRef(new THREE.Vector3(...config.cameraPos));
  const targetLookAtRef = useRef(new THREE.Vector3(...config.targetPos));
  const currentLookAtRef = useRef(new THREE.Vector3(...config.targetPos));

  // Opening shot: start high above the whole archipelago and swoop down to Home
  const intro = useRef({ t: reducedMotion ? 1 : 0, done: false });
  const introPts = useRef({
    start: new THREE.Vector3(55, 125, 95),
    bend: new THREE.Vector3(-70, 36, 72),
    lookFrom: new THREE.Vector3(15, 0, -120), // middle of the island chain
    pos: new THREE.Vector3(),
    look: new THREE.Vector3(),
  });

  // Compute responsive camera framing based on screen aspect ratio
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height);
    const isPhone = size.width < 640;
    const isPortrait = aspect < 1.0;

    const baseCam = new THREE.Vector3(...config.cameraPos);
    const baseTarget = new THREE.Vector3(...config.targetPos);

    // On portrait and small devices, offset target and back up camera so island is never cut off or covered
    if (isPhone) {
      // Shift target slightly down in world space so island appears higher up (unobstructed by bottom card)
      baseTarget.y -= 1.6;
      const offset = baseCam.clone().sub(baseTarget);
      // Scale distance so whole island fits in narrow width
      const scale = Math.min(1.8, 1.35 / Math.max(0.45, aspect));
      offset.multiplyScalar(scale);
      targetCamPosRef.current.copy(baseTarget.clone().add(offset));
      targetLookAtRef.current.copy(baseTarget);
    } else if (isPortrait) {
      baseTarget.y -= 0.8;
      const offset = baseCam.clone().sub(baseTarget);
      const scale = Math.min(1.5, 1.2 / Math.max(0.65, aspect));
      offset.multiplyScalar(scale);
      targetCamPosRef.current.copy(baseTarget.clone().add(offset));
      targetLookAtRef.current.copy(baseTarget);
    } else {
      // Desktop / Landscape standard layout
      targetCamPosRef.current.copy(baseCam);
      targetLookAtRef.current.copy(baseTarget);
    }
  }, [config, size.width, size.height]);

  useFrame((_, delta) => {
    const persp0 = camera as THREE.PerspectiveCamera;
    const it = intro.current;
    if (!it.done) {
      if (isSailing) it.t = 1; // visitor jumped ahead: hand over immediately
      it.t = Math.min(1, it.t + Math.min(delta, 0.05) / 3.6);
      const k = it.t < 0.5 ? 4 * it.t ** 3 : 1 - (-2 * it.t + 2) ** 3 / 2; // easeInOutCubic
      const P = introPts.current;
      const end = targetCamPosRef.current;
      // quadratic bezier start -> bend -> final framing
      const a = 1 - k;
      P.pos.set(0, 0, 0)
        .addScaledVector(P.start, a * a)
        .addScaledVector(P.bend, 2 * a * k)
        .addScaledVector(end, k * k);
      const lk = Math.min(1, k * 1.15);
      P.look.copy(P.lookFrom).lerp(targetLookAtRef.current, lk * lk * (3 - 2 * lk));
      camera.position.copy(P.pos);
      camera.lookAt(P.look);
      currentLookAtRef.current.copy(P.look);
      if (persp0.isPerspectiveCamera) {
        persp0.fov = 60 - 16 * k;
        persp0.updateProjectionMatrix();
      }
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
        controlsRef.current.target.copy(P.look);
      }
      if (it.t >= 1) {
        it.done = true;
        onIntroDone?.();
      }
      return;
    }

    // widen the lens while sailing for a sense of speed, settle back when docked
    const persp = camera as THREE.PerspectiveCamera;
    if (!reducedMotion && persp.isPerspectiveCamera) {
      const targetFov = isSailing ? 52 : 44;
      if (Math.abs(persp.fov - targetFov) > 0.05) {
        persp.fov += (targetFov - persp.fov) * damp(1.6, delta);
        persp.updateProjectionMatrix();
      }
    }

    if (reducedMotion) {
      if (!isSailing && controlsRef.current) {
        controlsRef.current.target.copy(targetLookAtRef.current);
      }
      return;
    }

    if (isSailing) {
      // 1. SAILING MODE: follow boat from behind and above
      if (controlsRef.current) {
        controlsRef.current.enabled = false;
      }
      const aspect = size.width / Math.max(1, size.height);
      const isNarrow = aspect < 1.0;
      const backDist = isNarrow ? 22.0 : 17.0;
      const heightOffset = isNarrow ? 13.5 : 10.5;
      const lookAheadDist = 7.0;

      const boatPos = boatPosRef.current;
      const boatForward = boatForwardRef.current;
      const desiredPos = boatPos
        .clone()
        .sub(boatForward.clone().multiplyScalar(backDist))
        .add(new THREE.Vector3(0, heightOffset, 0));

      const desiredLookAt = boatPos
        .clone()
        .add(boatForward.clone().multiplyScalar(lookAheadDist))
        .add(new THREE.Vector3(0, 1.2, 0));

      camera.position.lerp(desiredPos, damp(2.6, delta));
      currentLookAtRef.current.lerp(desiredLookAt, damp(3.2, delta));
      camera.lookAt(currentLookAtRef.current);
    } else {
      // 2. DOCKED MODE: ease to island framing and enable gentle OrbitControls
      const lerpSpeed = damp(2.2, delta);
      if (controlsRef.current) {
        controlsRef.current.enabled = !isAnyModalOpen;
        controlsRef.current.target.lerp(targetLookAtRef.current, lerpSpeed);
        if (camera.position.distanceTo(targetCamPosRef.current) > 0.4) {
          camera.position.lerp(targetCamPosRef.current, lerpSpeed);
        }
        controlsRef.current.update();
      }
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableZoom={true}
      enableRotate={!isSailing && !isAnyModalOpen}
      minDistance={12}
      maxDistance={75}
      minPolarAngle={Math.PI / 6}
      maxPolarAngle={Math.PI / 2.15}
      dampingFactor={0.05}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
    />
  );
};
