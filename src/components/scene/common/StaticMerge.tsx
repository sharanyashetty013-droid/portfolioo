import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Bakes every static mesh inside it into one mesh per look (material settings),
 * turning hundreds of tiny draw calls into a few dozen. Skipped automatically:
 *  - anything under an object with pointer handlers (clickable things)
 *  - anything under an object with userData.noMerge (animated things)
 * Originals stay in the tree but are hidden, so React keeps owning them.
 */
export const StaticMerge: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const root = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const group = root.current;
    if (!group) return;
    group.updateWorldMatrix(true, true);
    const toLocal = new THREE.Matrix4().copy(group.matrixWorld).invert();

    type Bucket = { material: THREE.Material; geos: THREE.BufferGeometry[]; meshes: THREE.Mesh[]; cast: boolean };
    const buckets = new Map<string, Bucket>();

    const isPinned = (o: THREE.Object3D) => {
      // walk up to the merge root looking for interactive/animated ancestors
      let cur: THREE.Object3D | null = o;
      while (cur && cur !== group) {
        if (cur.userData?.noMerge) return true;
        const inst = (cur as unknown as { __r3f?: { eventCount?: number } }).__r3f;
        if (inst?.eventCount) return true;
        cur = cur.parent;
      }
      return false;
    };

    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (!mesh.isMesh || (mesh as unknown as THREE.InstancedMesh).isInstancedMesh || Array.isArray(mesh.material)) return;
      if (!mesh.visible || isPinned(mesh)) return;
      const m = mesh.material as THREE.MeshStandardMaterial & THREE.MeshBasicMaterial;
      if (m.transparent || m.map) return; // keep blending/texture cases as-is

      const key = [
        m.type,
        m.color?.getHexString(),
        m.emissive?.getHexString(),
        m.emissiveIntensity,
        m.roughness,
        m.metalness,
        m.flatShading,
        m.vertexColors,
        m.side,
        mesh.castShadow,
      ].join('|');

      let g = mesh.geometry.index ? mesh.geometry.toNonIndexed() : mesh.geometry.clone();
      for (const name of Object.keys(g.attributes)) {
        if (name !== 'position' && name !== 'normal' && !(name === 'color' && m.vertexColors)) g.deleteAttribute(name);
      }
      if (!g.attributes.normal) g.computeVertexNormals();
      g.morphAttributes = {};
      g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toLocal, mesh.matrixWorld));

      let b = buckets.get(key);
      if (!b) {
        b = { material: m, geos: [], meshes: [], cast: mesh.castShadow };
        buckets.set(key, b);
      }
      b.geos.push(g);
      b.meshes.push(mesh);
    });

    const merged: THREE.Mesh[] = [];
    buckets.forEach((b) => {
      if (b.meshes.length < 2) return; // nothing to gain
      const geo = mergeGeometries(b.geos, false);
      b.geos.forEach((g) => g.dispose());
      if (!geo) return;
      const mesh = new THREE.Mesh(geo, b.material);
      mesh.castShadow = b.cast;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      group.add(mesh);
      merged.push(mesh);
      b.meshes.forEach((m) => (m.visible = false));
    });

    return () => {
      merged.forEach((m) => {
        group.remove(m);
        m.geometry.dispose();
      });
      buckets.forEach((b) => b.meshes.forEach((m) => (m.visible = true)));
    };
  }, []);

  return <group ref={root}>{children}</group>;
};
