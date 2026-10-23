import { memo, useEffect, useMemo } from 'react';
import { useGLTF } from '@react-three/drei/native';
import { Platform } from 'react-native';
import * as THREE from 'three';

const BOARD_ROTATION = [Math.PI / 2, 0, 0];
const BOARD_SCALE = 0.38;
const PREVIEW_SCALE = 1.45;

const buildTeamMaterials = (color) => ({
  paint: new THREE.MeshStandardMaterial({
    color,
    roughness: 0.42,
    metalness: 0.18,
  }),
  black: new THREE.MeshStandardMaterial({
    color: 0x070707,
    roughness: 0.72,
    metalness: 0.1,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x8fd8ff,
    roughness: 0.16,
    metalness: 0,
    clearcoat: 0.8,
    clearcoatRoughness: 0.08,
  }),
  light: new THREE.MeshStandardMaterial({
    color: 0xf5f1dc,
    roughness: 0.25,
    metalness: 0.05,
  }),
});

const getTeamMaterial = (mesh, materials) => {
  const name = mesh.name.toLowerCase();

  if (
    name.includes('wheel') ||
    name.includes('bullbar') ||
    name.includes('rollbar') ||
    name.includes('skid') ||
    name.includes('ariel')
  ) {
    return materials.black;
  }

  if (name.includes('spot') || name.includes('decal')) {
    return materials.light;
  }

  return materials.paint;
};

const cloneTexturedMaterial = (material) => {
  if (!material) return material;

  if (Platform.OS !== 'web') {
    const sharedMap = material.map;
    if (sharedMap) {
      sharedMap.colorSpace = THREE.SRGBColorSpace;
      sharedMap.flipY = false;
      sharedMap.needsUpdate = true;
    }

    return new THREE.MeshBasicMaterial({
      color: sharedMap ? 0xffffff : material.color,
      map: sharedMap || null,
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }

  const clonedMaterial = material.clone();
  if (clonedMaterial.map) {
    clonedMaterial.map = clonedMaterial.map.clone();
    clonedMaterial.map.colorSpace = THREE.SRGBColorSpace;
    clonedMaterial.map.flipY = false;
    clonedMaterial.map.needsUpdate = true;
  }
  clonedMaterial.side = THREE.DoubleSide;
  clonedMaterial.needsUpdate = true;
  return clonedMaterial;
};

const prepareVehicleScene = (scene, color, preserveMaterials) => {
  const clone = scene.clone(true);
  const teamMaterials = preserveMaterials ? null : buildTeamMaterials(color);

  clone.traverse((child) => {
    if (!child.isMesh) return;

    child.frustumCulled = false;

    if (preserveMaterials) {
      child.material = Array.isArray(child.material)
        ? child.material.map(cloneTexturedMaterial)
        : cloneTexturedMaterial(child.material);
      return;
    }

    if (Array.isArray(child.material)) {
      child.material = child.material.map((material) => {
        const materialName = material?.name?.toLowerCase?.() || '';
        if (materialName.includes('glass')) return teamMaterials.glass;
        if (materialName.includes('emmisive') || materialName.includes('emissive')) {
          return teamMaterials.light;
        }
        return teamMaterials.paint;
      });
      return;
    }

    child.material = getTeamMaterial(child, teamMaterials);
  });

  clone.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(clone);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const footprint = Math.max(size.x, size.z, 0.001);
  const normalizedScale = 1 / footprint;

  clone.scale.multiplyScalar(normalizedScale);
  clone.position.set(
    -center.x * normalizedScale,
    -bounds.min.y * normalizedScale,
    -center.z * normalizedScale
  );

  return clone;
};

const VehicleModel = memo(({ color = '#d71920', mode = 'board', model }) => {
  const { scene } = useGLTF(model.source);
  const preparedScene = useMemo(
    () => prepareVehicleScene(scene, color, model.preserveMaterials),
    [color, model.preserveMaterials, scene]
  );
  const isPreview = mode === 'preview';

  // Materials are created per prepared clone. Native textures are shared with the cached GLTF,
  // so only the web path (which clones its maps) disposes textures.
  useEffect(() => () => {
    preparedScene.traverse((child) => {
      if (!child.isMesh) return;

      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (Platform.OS === 'web') material?.map?.dispose?.();
        material?.dispose?.();
      });
    });
  }, [preparedScene]);

  return (
    <group
      rotation={isPreview ? [0, 0, 0] : BOARD_ROTATION}
      scale={isPreview ? PREVIEW_SCALE : BOARD_SCALE}
    >
      <primitive
        object={preparedScene}
        rotation={[0, model.yaw || 0, 0]}
      />
    </group>
  );
});

export default VehicleModel;
