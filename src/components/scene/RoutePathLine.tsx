import React, { useMemo } from 'react';
import * as THREE from 'three';
import { createVoyageCurve } from '../../constants/islandLayout';

interface RoutePathLineProps {
  currentT: number;
}

export const RoutePathLine: React.FC<RoutePathLineProps> = ({ currentT }) => {
  const { travelledLine, aheadPoints } = useMemo(() => {
    const curve = createVoyageCurve();
    const totalSamples = 200;
    const tPts: THREE.Vector3[] = [];
    const aPts: THREE.Vector3[] = [];

    for (let i = 0; i <= totalSamples; i++) {
      const t = i / totalSamples;
      const pt = curve.getPointAt(t);
      pt.y = 0.05; // Slightly above water plane
      if (t <= currentT + 0.01) {
        tPts.push(pt);
      }
      if (t >= currentT - 0.01 && i % 2 === 0) {
        aPts.push(pt);
      }
    }

    const tGeo = new THREE.BufferGeometry().setFromPoints(tPts);
    const tMat = new THREE.LineBasicMaterial({
      color: 0x4cc9c0,
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    const tLine = new THREE.Line(tGeo, tMat);

    const aGeo = new THREE.BufferGeometry().setFromPoints(aPts);
    const aMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.45,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const aPtsObj = new THREE.Points(aGeo, aMat);

    return { travelledLine: tLine, aheadPoints: aPtsObj };
  }, [currentT]);

  return (
    <group>
      {/* Travelled Route */}
      <primitive object={travelledLine} />
      {/* Untravelled Route Ahead */}
      <primitive object={aheadPoints} />
    </group>
  );
};
