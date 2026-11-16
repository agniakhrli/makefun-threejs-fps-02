// Multiple weapons: Rifle, Pistol, Knife, Grenade with ammo, reload, recoil, spread, and switching.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

const WEAPONS = {
  rifle: { name: 'Rifle', mag: 30, reserve: 90, fireGap: 0.096, reloadTime: 1.9, damage: 34, headMult: 3 },
  pistol: { name: 'Pistol', mag: 12, reserve: 36, fireGap: 0.2, reloadTime: 1.4, damage: 25, headMult: 2.5 },
  knife: { name: 'Knife', mag: 1, reserve: 0, fireGap: 0.4, reloadTime: 0, damage: 50, headMult: 1.5 },
};

export function createWeapon(camera) {
  const grip = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.hairline), roughness: 0.7, metalness: 0.2 });
  const bodyMat = new THREE.MeshStandardMaterial({ color: new THREE.Color(PALETTE.ink), roughness: 0.5, metalness: 0.35 });

  const model = new THREE.Group();
  const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.42), bodyMat);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.045, 0.4), grip);
  barrel.position.set(0, 0.025, -0.38);
  const stock = new THREE.Mesh(new THREE.BoxGeometry(0.075, 0.08, 0.22), grip);
  stock.position.set(0, -0.02, 0.3);
  model.add(receiver, barrel, stock);
  model.position.set(0.24, -0.2, -0.42);
  camera.add(model);

  const flash = new THREE.Mesh(
    new THREE.PlaneGeometry(0.24, 0.24),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(PALETTE.accent), transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
  );
  flash.position.set(0.24, -0.18, -0.95);
  flash.visible = false;
  camera.add(flash);

  const flashLight = new THREE.PointLight(new THREE.Color(PALETTE.accent), 0, 5);
  flashLight.position.set(0.24, -0.16, -0.6);
  camera.add(flashLight);

  const inventories = {
    rifle: { mag: 30, reserve: 90 },
    pistol: { mag: 12, reserve: 36 },
    knife: { mag: 1, reserve: 0 },
  };

  let currentKey = 'rifle';
  const state = {
    key: currentKey,
    mag: inventories.rifle.mag,
    reserve: inventories.rifle.reserve,
    cooldown: 0,
    reloadLeft: 0,
    flash: 0,
    kick: 0,
    damage: WEAPONS.rifle.damage,
    headMult: WEAPONS.rifle.headMult,
    fireGap: WEAPONS.rifle.fireGap,
  };

  function selectWeapon(key) {
    if (!WEAPONS[key]) return;
    currentKey = key;
    state.key = key;
    state.mag = inventories[key].mag;
    state.reserve = inventories[key].reserve;
    state.damage = WEAPONS[key].damage;
    state.headMult = WEAPONS[key].headMult;
    state.fireGap = WEAPONS[key].fireGap;
    state.reloadLeft = 0;
  }

  function step(dt) {
    state.cooldown = Math.max(0, state.cooldown - dt);
    state.flash = Math.max(0, state.flash - dt);
    state.kick += (0 - state.kick) * Math.min(1, dt * 14);
    model.position.z = -0.42 + state.kick;
    model.rotation.x = state.kick * 2.2;
    flash.visible = state.flash > 0;
    flash.rotation.z = state.flash * 30;
    flashLight.intensity = state.flash > 0 ? 18 : 0;
    
    if (state.reloadLeft > 0) {
      const cfg = WEAPONS[currentKey];
      state.reloadLeft = Math.max(0, state.reloadLeft - dt);
      model.rotation.x = -0.55 * Math.min(1, (cfg.reloadTime - state.reloadLeft) * 2);
      if (state.reloadLeft === 0) {
        const need = cfg.mag - state.mag;
        const take = Math.min(need, state.reserve);
        state.mag += take;
        state.reserve -= take;
        inventories[currentKey].mag = state.mag;
        inventories[currentKey].reserve = state.reserve;
      }
    }
  }

  return {
    state,
    step,
    selectWeapon,
    ready() {
      return (currentKey === 'knife' || state.mag > 0) && state.cooldown === 0 && state.reloadLeft === 0;
    },
    pullTrigger() {
      state.cooldown = state.fireGap;
      state.flash = currentKey === 'knife' ? 0 : 0.06;
      state.kick = currentKey === 'knife' ? 0.02 : 0.055;
    },
    takeRound() {
      if (currentKey === 'knife') return true;
      if (state.mag <= 0) return false;
      state.mag -= 1;
      inventories[currentKey].mag = state.mag;
      return true;
    },
    reload() {
      if (currentKey === 'knife') return;
      const cfg = WEAPONS[currentKey];
      if (state.reloadLeft > 0 || state.mag === cfg.mag || state.reserve === 0) return;
      state.reloadLeft = cfg.reloadTime;
    },
    spread(speed) {
      if (currentKey === 'knife') return 0;
      const base = currentKey === 'pistol' ? 0.001 : 0.0022;
      const moving = currentKey === 'pistol' ? 0.015 : 0.028;
      return base + Math.min(1, speed / 5.2) * moving;
    },
    refill() {
      for (const k of Object.keys(WEAPONS)) {
        inventories[k].mag = WEAPONS[k].mag;
        inventories[k].reserve = WEAPONS[k].reserve;
      }
      selectWeapon('rifle');
    },
  };
}
