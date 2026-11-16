// Tactical FPS Main Loop: rounds, bots, audio, weapons, buy menu, and gameplay.
import * as THREE from 'three';
import { PALETTE } from './palette.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapon } from './weapon.js';
import { createBots } from './bots.js';
import { createRounds } from './rounds.js';
import { createObjective } from './objective.js';
import { createAudio } from './audio.js';
import { createHud } from './hud.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(PALETTE.canvas);
scene.fog = new THREE.Fog(new THREE.Color(PALETTE.canvas), 18, 46);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 140);
scene.add(camera);

const world = createWorld(scene);
const bots = createBots(scene);
const weapon = createWeapon(camera);
const rounds = createRounds();
const objective = createObjective();
const audio = createAudio();
const hud = createHud();
const player = createPlayer(world.colliders);
const input = createInput(renderer.domElement, onLockChange);

const raycaster = new THREE.Raycaster();
raycaster.far = 80;
const shootables = world.shootables.concat(bots.hitMeshes);
const direction = new THREE.Vector3();

const body = player.state;
const markerHoldMs = shot ? 4000 : 90;
let playerHealth = 100;
let elapsed = 0;
let roundOver = false;
let frozen = false;
let started = false;
let buyMenuOpen = false;
let accumulator = 0;
let lastTime = performance.now();

const overlay = document.getElementById('overlay');
const buyOverlay = document.getElementById('buy-overlay');
const buyMoney = document.getElementById('buy-money');

hud.setAmmo(weapon.state.mag, weapon.state.reserve);
hud.setScore(rounds.state.scorePlayer, rounds.state.round, rounds.state.money, playerHealth, rounds.state.timer);

hud.onPlay(() => {
  if (shot) return;
  if (roundOver) nextRound();
  input.requestLock();
});

document.getElementById('close-buy').addEventListener('click', () => {
  toggleBuyMenu(false);
  input.requestLock();
});

document.querySelectorAll('.buy-item').forEach((btn) => {
  btn.addEventListener('click', (e) => {
    const item = btn.getAttribute('data-item');
    const cost = Number(btn.getAttribute('data-cost'));
    if (rounds.buy(item, cost)) {
      audio.playBeep(800, 0.08);
      if (item === 'rifle') weapon.selectWeapon('rifle');
      if (item === 'pistol') weapon.selectWeapon('pistol');
      if (item === 'armor') playerHealth = Math.min(100, playerHealth + 50);
      buyMoney.textContent = String(rounds.state.money);
      hud.setScore(rounds.state.scorePlayer, rounds.state.round, rounds.state.money, playerHealth, rounds.state.timer);
    } else {
      audio.playBeep(300, 0.1);
    }
  });
});

function toggleBuyMenu(open) {
  buyMenuOpen = open;
  buyOverlay.hidden = !open;
  buyMoney.textContent = String(rounds.state.money);
  if (open && document.pointerLockElement) {
    document.exitPointerLock();
  }
}

function nextRound() {
  roundOver = false;
  playerHealth = 100;
  bots.reset();
  rounds.resetRound();
  weapon.refill();
  objective.reset();
  body.position.set(0, 0, 9.5);
  hud.setScore(rounds.state.scorePlayer, rounds.state.round, rounds.state.money, playerHealth, rounds.state.timer);
  hud.setAmmo(weapon.state.mag, weapon.state.reserve);
  hud.hideOverlay();
}

function onLockChange(locked) {
  if (shot) return;
  if (locked) {
    started = true;
    hud.hideOverlay();
    buyOverlay.hidden = true;
  } else if (!roundOver && !buyMenuOpen) {
    hud.showOverlay(started ? 'paused' : 'start', rounds.state.scorePlayer);
  }
}

function syncCamera() {
  camera.position.set(body.position.x, body.position.y + body.eye, body.position.z);
  camera.rotation.set(body.pitch, body.yaw, 0, 'YXZ');
}

function aimAt(point) {
  const dx = point.x - body.position.x;
  const dy = point.y - (body.position.y + body.eye);
  const dz = point.z - body.position.z;
  const length = Math.hypot(dx, dy, dz) || 1;
  body.yaw = Math.atan2(-dx, -dz);
  body.pitch = Math.asin(Math.max(-1, Math.min(1, dy / length)));
  syncCamera();
}

function shoot(spread) {
  if (!weapon.takeRound()) {
    audio.playBeep(200, 0.05);
    return false;
  }
  audio.playShot(weapon.state.key);
  camera.getWorldDirection(direction);
  direction.x += (random() * 2 - 1) * spread;
  direction.y += (random() * 2 - 1) * spread;
  direction.z += (random() * 2 - 1) * spread;
  direction.normalize();
  scene.updateMatrixWorld(true);
  raycaster.set(camera.position, direction);
  const hit = raycaster.intersectObjects(shootables, false)[0];
  if (hit && hit.object.userData.bot) {
    const isHead = hit.object === hit.object.userData.bot.head;
    const killed = bots.damage(hit.object, isHead ? 100 : weapon.state.damage);
    audio.playHit(isHead);
    hud.hitMarker(killed, markerHoldMs);
    if (bots.remaining() === 0 && !roundOver) {
      endRound('player');
    }
  }
  weapon.pullTrigger();
  player.recoil(0.009 + random() * 0.004, (random() * 2 - 1) * 0.004);
  hud.setAmmo(weapon.state.mag, weapon.state.reserve);
  return true;
}

function endRound(winner) {
  roundOver = true;
  rounds.winRound(winner);
  audio.playBeep(winner === 'player' ? 700 : 350, 0.3);
  hud.showOverlay('end', rounds.state.scorePlayer);
  if (document.pointerLockElement) document.exitPointerLock();
}

function step(dt) {
  elapsed += dt;
  rounds.step(dt);
  objective.step(dt);
  player.step(dt, input.state.keys);
  weapon.step(dt);

  // Bot action
  const botAction = bots.step(dt, body.position);
  if (botAction && botAction.hitPlayer && !roundOver) {
    playerHealth = Math.max(0, playerHealth - 12);
    audio.playHit(false);
    if (playerHealth <= 0) {
      endRound('bots');
    }
  }

  // Timer check
  if (rounds.state.phase === 'active' && rounds.state.timer <= 0 && !roundOver) {
    endRound('bots');
  }

  hud.setScore(rounds.state.scorePlayer, rounds.state.round, rounds.state.money, playerHealth, rounds.state.timer);
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;
  if (!frozen) {
    const look = input.takeLook();
    player.look(look.x, look.y);

    if (input.state.firing && weapon.ready()) {
      if (rounds.state.phase === 'buy') rounds.state.phase = 'active';
      shoot(shot ? 0 : weapon.spread(player.groundSpeed()));
    }

    if (input.state.keys.has('KeyR')) {
      weapon.reload();
      audio.playReload();
    }

    if (input.state.keys.has('KeyB') && rounds.state.phase === 'buy') {
      toggleBuyMenu(!buyMenuOpen);
      input.state.keys.delete('KeyB');
    }

    if (input.state.keys.has('Digit1')) { weapon.selectWeapon('rifle'); input.state.keys.delete('Digit1'); hud.setAmmo(weapon.state.mag, weapon.state.reserve); }
    if (input.state.keys.has('Digit2')) { weapon.selectWeapon('pistol'); input.state.keys.delete('Digit2'); hud.setAmmo(weapon.state.mag, weapon.state.reserve); }
    if (input.state.keys.has('Digit3')) { weapon.selectWeapon('knife'); input.state.keys.delete('Digit3'); hud.setAmmo(weapon.state.mag, weapon.state.reserve); }

    accumulator += dt;
    let steps = 0;
    while (accumulator >= FIXED_STEP && steps < 5) {
      step(FIXED_STEP);
      accumulator -= FIXED_STEP;
      steps += 1;
    }
    if (accumulator > FIXED_STEP * 5) accumulator = 0;
    syncCamera();
  }
  renderer.render(scene, camera);
}

function settle(steps) {
  for (let index = 0; index < steps; index += 1) step(FIXED_STEP);
}

function runShot(name) {
  hud.hideOverlay();
  buyOverlay.hidden = true;
  body.pitch = 0;
  body.yaw = 0;
  if (name === 'play') {
    body.position.set(0, 0, -2);
    rounds.state.phase = 'active';
    settle(30);
    if (bots.bots.length > 0) {
      aimAt(bots.bots[0].group.position.clone().add(new THREE.Vector3(0, 1.5, 0)));
      shoot(0);
      settle(10);
    }
  } else if (name === 'buy') {
    body.position.set(0, 0, 9.5);
    rounds.state.phase = 'buy';
    settle(10);
    toggleBuyMenu(true);
    settle(5);
  } else if (name === 'end') {
    body.position.set(0, 0, -5);
    settle(20);
    endRound('player');
    settle(30);
  } else {
    body.position.set(0, 0, 9.5);
    rounds.state.phase = 'buy';
    settle(20);
    aimAt(new THREE.Vector3(0, 1.5, -6));
    hud.showOverlay('start', rounds.state.scorePlayer);
  }
  hud.setScore(rounds.state.scorePlayer, rounds.state.round, rounds.state.money, playerHealth, rounds.state.timer);
  hud.setAmmo(weapon.state.mag, weapon.state.reserve);
  paintTwiceThenReady();
}

function paintTwiceThenReady() {
  let painted = 0;
  function paint() {
    requestAnimationFrame(paint);
    syncCamera();
    renderer.render(scene, camera);
    painted += 1;
    if (painted === 2) {
      window.__shotReady = true;
      frozen = true;
    }
  }
  requestAnimationFrame(paint);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

syncCamera();
if (shot) runShot(shot);
else requestAnimationFrame(frame);
