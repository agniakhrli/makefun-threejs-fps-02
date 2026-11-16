// Expanded tactical map: T spawn, CT spawn, Bomb Site A, Bomb Site B, Mid Lane, and cover structures.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createWorld(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const materials = {};
  for (const name of Object.keys(PALETTE)) {
    materials[name] = new THREE.MeshStandardMaterial({
      color: new THREE.Color(PALETTE[name]),
      roughness: name === 'accent' || name === 'ink' ? 0.55 : 0.92,
      metalness: 0.03,
    });
  }

  const colliders = [];
  const shootables = [];
  const sites = {
    A: new THREE.Vector3(-8, 0, -10),
    B: new THREE.Vector3(8, 0, -10),
  };

  function box(width, height, depth, x, y, z, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), materials[material]);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    colliders.push(new THREE.Box3().setFromObject(mesh));
    shootables.push(mesh);
    return mesh;
  }

  // Floor and Outer walls (32m x 32m tactical map)
  box(32.0, 0.4, 32.0, 0, -0.2, 0, 'canvas');
  box(0.4, 5.0, 32.0, -16.0, 2.5, 0, 'surface');
  box(0.4, 5.0, 32.0, 16.0, 2.5, 0, 'surface');
  box(32.0, 5.0, 0.4, 0, 2.5, -16.0, 'surface');
  box(32.0, 5.0, 0.4, 0, 2.5, 16.0, 'surface');

  // Mid dividing wall with openings
  box(12.0, 5.0, 0.6, -6, 2.5, 0, 'hairline');
  box(12.0, 5.0, 0.6, 6, 2.5, 0, 'hairline');

  // Site A (Left) and Site B (Right) back areas
  box(8.0, 3.0, 0.6, -10, 1.5, -12, 'hairline');
  box(8.0, 3.0, 0.6, 10, 1.5, -12, 'hairline');

  // Crates and cover obstacles
  box(2.0, 1.2, 2.0, -3, 0.6, -4, 'hairline');
  box(2.0, 1.2, 2.0, 3, 0.6, -4, 'hairline');
  box(1.5, 1.8, 1.5, -8, 0.9, -8, 'hairline'); // Site A cover
  box(1.5, 1.8, 1.5, 8, 0.9, -8, 'hairline');  // Site B cover
  box(3.0, 1.0, 1.5, 0, 0.5, 4, 'hairline');    // Mid cover
  box(1.2, 2.2, 1.2, -12, 1.1, 8, 'hairline');
  box(1.2, 2.2, 1.2, 12, 1.1, 8, 'hairline');

  // Lighting
  const sky = new THREE.HemisphereLight(new THREE.Color(PALETTE.surface), new THREE.Color(PALETTE.canvas), 1.2);
  scene.add(sky);

  const key = new THREE.DirectionalLight(new THREE.Color(PALETTE.ink), 2.2);
  key.position.set(12, 18, 10);
  key.target.position.set(0, 0, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -20;
  key.shadow.camera.right = 20;
  key.shadow.camera.top = 20;
  key.shadow.camera.bottom = -20;
  key.shadow.camera.far = 60;
  key.shadow.bias = -0.0005;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(new THREE.Color(PALETTE.muted), 0.6);
  fill.position.set(-12, 12, -10);
  scene.add(fill);

  return { colliders, shootables, group, sites };
}
