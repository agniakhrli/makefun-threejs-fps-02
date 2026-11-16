// AI Bots: move along routes, hold angles, react to player/gunfire, shoot back.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const WAYPOINTS = [
  new THREE.Vector3(-8, 0, -6),
  new THREE.Vector3(8, 0, -6),
  new THREE.Vector3(0, 0, 2),
  new THREE.Vector3(-6, 0, 6),
  new THREE.Vector3(6, 0, 6),
];

export function createBots(scene) {
  const bodyMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.muted), roughness: 0.6, metalness: 0.05 });
  const headMaterial = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.accent), roughness: 0.45, metalness: 0.1 });
  const torsoGeometry = new THREE.BoxGeometry(0.52, 0.78, 0.3);
  const headGeometry = new THREE.SphereGeometry(0.155, 16, 12);

  const bots = [];
  const hitMeshes = [];

  const spawnPositions = [
    new THREE.Vector3(-10, 0, 10),
    new THREE.Vector3(10, 0, 10),
    new THREE.Vector3(-4, 0, 12),
    new THREE.Vector3(4, 0, 12),
  ];

  for (let i = 0; i < spawnPositions.length; i++) {
    const group = new THREE.Group();
    group.position.copy(spawnPositions[i]);

    const torso = new THREE.Mesh(torsoGeometry, bodyMaterial);
    torso.position.y = 1.0;
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 1.53;
    group.add(torso, head);

    group.traverse((mesh) => {
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    scene.add(group);

    const bot = {
      group,
      torso,
      head,
      health: 100,
      alive: true,
      wpIndex: i % WAYPOINTS.length,
      shootTimer: Math.random() * 2,
      home: spawnPositions[i].clone(),
    };
    torso.userData.bot = bot;
    head.userData.bot = bot;
    hitMeshes.push(torso, head);
    bots.push(bot);
  }

  function damage(mesh, amount) {
    const bot = mesh.userData.bot;
    if (!bot || !bot.alive) return false;
    bot.health -= amount;
    if (bot.health > 0) return false;
    bot.alive = false;
    bot.group.position.y = -0.5;
    bot.group.rotation.x = Math.PI / 2;
    return true;
  }

  function step(dt, playerPos) {
    for (const bot of bots) {
      if (!bot.alive) continue;
      const targetWp = WAYPOINTS[bot.wpIndex];
      const dir = new THREE.Vector3().subVectors(targetWp, bot.group.position);
      dir.y = 0;
      const dist = dir.length();
      if (dist < 1.5) {
        bot.wpIndex = (bot.wpIndex + 1) % WAYPOINTS.length;
      } else {
        dir.normalize();
        bot.group.position.addScaledVector(dir, 2.2 * dt);
        bot.group.lookAt(targetWp.x, bot.group.position.y, targetWp.z);
      }

      // Check distance to player for shooting
      const playerDist = bot.group.position.distanceTo(playerPos);
      if (playerDist < 16) {
        bot.shootTimer -= dt;
        if (bot.shootTimer <= 0) {
          bot.shootTimer = 1.5 + Math.random() * 1.5;
          // Returns true if bot shoots at player
          return { shooter: bot, hitPlayer: playerDist < 10 && Math.random() < 0.6 };
        }
      }
    }
    return null;
  }

  return {
    bots,
    hitMeshes,
    damage,
    step,
    remaining() {
      return bots.filter((b) => b.alive).length;
    },
    reset() {
      for (let i = 0; i < bots.length; i++) {
        const bot = bots[i];
        bot.alive = true;
        bot.health = 100;
        bot.group.position.copy(bot.home);
        bot.group.rotation.set(0, 0, 0);
      }
    },
  };
}
