import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SectionId } from '../../types/portfolio';
import { ISLAND_LAYOUT } from '../../constants/islandLayout';

interface CameraControllerProps {
  activeSection: SectionId;
  boatPos: THREE.Vector3;
  boatForward: THREE.Vector3;
  isSailing: boolean;
  reducedMotion?: boolean;
  isAnyModalOpen?: boolean;
}

export const CameraController: React.FC<CameraControllerProps> = ({
  activeSection,
  boatPos,
  boatForward,
  isSailing,
  reducedMotion = false,
  isAnyModalOpen = false,
}) => {
  const { camera, gl, size } = useThree();
  const controlsRef = useRef<OrbitControls | null>(null);
  const initializedRef = useRef(false);
  const config = ISLAND_LAYOUT[activeSection];

  const targetCamPosRef = useRef(new THREE.Vector3(...config.cameraPos));
  const targetLookAtRef = useRef(new THREE.Vector3(...config.targetPos));
  const currentLookAtRef = useRef(new THREE.Vector3(...config.targetPos));

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

    // Instantly snap on first layout to avoid laggy drift
    if (!initializedRef.current) {
      camera.position.copy(targetCamPosRef.current);
      if (controlsRef.current) {
        controlsRef.current.target.copy(targetLookAtRef.current);
        controlsRef.current.update();
      }
      initializedRef.current = true;
    }
  }, [config, size.width, size.height, camera]);

  // Setup OrbitControls directly on canvas domElement
  useEffect(() => {
    const controls = new OrbitControls(camera, gl.domElement);
    controls.enablePan = false;
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.minDistance = 12;
    controls.maxDistance = 75;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.15;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.7;
    controls.zoomSpeed = 0.8;
    controls.target.copy(targetLookAtRef.current);
    controls.update();
    controlsRef.current = controls;

    return () => {
      controls.dispose();
      controlsRef.current = null;
    };
  }, [camera, gl.domElement]);

  useFrame((_, delta) => {
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

      const desiredPos = boatPos
        .clone()
        .sub(boatForward.clone().multiplyScalar(backDist))
        .add(new THREE.Vector3(0, heightOffset, 0));

      const desiredLookAt = boatPos
        .clone()
        .add(boatForward.clone().multiplyScalar(lookAheadDist))
        .add(new THREE.Vector3(0, 1.2, 0));

      camera.position.lerp(desiredPos, Math.min(1, delta * 3.5));
      currentLookAtRef.current.lerp(desiredLookAt, Math.min(1, delta * 4.5));
      camera.lookAt(currentLookAtRef.current);
    } else {
      // 2. DOCKED MODE: ease to island framing and enable gentle OrbitControls
      const lerpSpeed = Math.min(1, delta * 2.8);
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

  return null;
};
