// Enhanced HUD: health, armor, ammo, money, round timer, score, buy menu, and overlays.
export function createHud() {
  const overlay = document.getElementById('overlay');
  const title = document.getElementById('overlay-title');
  const copy = document.getElementById('overlay-copy');
  const play = document.getElementById('play');
  const ammo = document.getElementById('ammo');
  const ammoMag = document.getElementById('ammo-mag');
  const ammoReserve = document.getElementById('ammo-reserve');
  const scoreValue = document.getElementById('score-value');
  const hitmarker = document.getElementById('hitmarker');

  // Create additional HUD elements if needed or update existing
  let healthEl = document.getElementById('health-value');
  if (!healthEl) {
    const div = document.createElement('div');
    div.id = 'hud-stats';
    div.style.cssText = 'position:fixed; left:32px; bottom:52px; font-family:var(--font-readout); font-size:14px; color:var(--muted); display:flex; gap:16px;';
    div.innerHTML = '<div>Health: <b id="health-value" style="color:var(--ink)">100</b></div><div>Money: $<b id="money-value" style="color:var(--accent)">800</b></div><div>Round: <b id="round-value" style="color:var(--ink)">1</b></div><div>Timer: <b id="timer-value" style="color:var(--ink)">2:00</b></div>';
    document.getElementById('hud').appendChild(div);
    healthEl = document.getElementById('health-value');
  }

  let hitTimer = 0;
  let lastMag = -1;
  let lastReserve = -1;
  let lastScore = -1;

  return {
    setAmmo(mag, reserve) {
      if (mag === lastMag && reserve === lastReserve) return;
      lastMag = mag;
      lastReserve = reserve;
      if (ammoMag) ammoMag.textContent = String(mag);
      if (ammoReserve) ammoReserve.textContent = `/ ${reserve}`;
      if (ammo) ammo.classList.toggle('empty', mag === 0);
    },
    setScore(score, round = 1, money = 800, health = 100, timer = 120) {
      if (scoreValue) scoreValue.textContent = String(score);
      const mEl = document.getElementById('money-value');
      const rEl = document.getElementById('round-value');
      const tEl = document.getElementById('timer-value');
      const hEl = document.getElementById('health-value');
      if (mEl) mEl.textContent = String(money);
      if (rEl) rEl.textContent = String(round);
      if (hEl) hEl.textContent = String(health);
      if (tEl) {
        const mins = Math.floor(timer / 60);
        const secs = Math.floor(timer % 60);
        tEl.textContent = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
      }
    },
    hitMarker(killed, holdMs = 90) {
      hitmarker.classList.add('on');
      hitmarker.style.transform = killed ? 'translate(-50%, -50%) rotate(45deg) scale(1.25)' : '';
      clearTimeout(hitTimer);
      hitTimer = setTimeout(() => {
        hitmarker.classList.remove('on');
        hitmarker.style.transform = '';
      }, holdMs);
    },
    showOverlay(mode, score) {
      title.textContent = mode === 'end' ? 'Round Over' : 'Tactical FPS Arena';
      copy.textContent = mode === 'end' ? `Round completed. Score: ${score}. Click to continue.` : 'Use WASD to move, Mouse to look, Click to shoot, R to reload, B for buy menu, 1/2/3 for weapons.';
      play.textContent = mode === 'end' ? 'Next Round' : 'Click to play';
      overlay.hidden = false;
      play.focus();
    },
    hideOverlay() {
      overlay.hidden = true;
    },
    onPlay(handler) {
      play.addEventListener('click', handler);
    },
  };
}
