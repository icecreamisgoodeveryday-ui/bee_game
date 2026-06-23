// ── Day / Night cycle ─────────────────────────────────────────────────────
const DAY_DURATION   = 360;  // 6 minutes
const NIGHT_DURATION = 240;  // 4 minutes
const CYCLE_DURATION = DAY_DURATION + NIGHT_DURATION;
const NIGHT_TRANS    = 30;   // seconds for dusk / dawn transition

const stars = Array.from({ length: 60 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: 0.4 + Math.random() * 1.4,
  twinkle: Math.random() * Math.PI * 2,
}));

let dayTimer = 0;

const _musicNight = new Audio('sounds/Lofi & Calm Music (Copyright Free) - Your Little Wings by Tokyo Music Walker.mp3');
_musicNight.loop   = true;
_musicNight.volume = 0.5;
function startNightMusic() { playMusic(_musicNight); }

let _lastDayPhase = 'day';

function startCorrectOutdoorMusic() {
  const isNight = dayTimer >= DAY_DURATION - NIGHT_TRANS && dayTimer < CYCLE_DURATION - NIGHT_TRANS;
  _lastDayPhase = isNight ? 'night' : 'day';
  if (isNight) startNightMusic(); else startOutdoorMusic();
}

function updateDayNightMusic() {
  if (insideBank || insideHousing) return;
  const isNight = dayTimer >= DAY_DURATION - NIGHT_TRANS && dayTimer < CYCLE_DURATION - NIGHT_TRANS;
  const phase   = isNight ? 'night' : 'day';
  if (phase === _lastDayPhase) return;
  _lastDayPhase = phase;
  if (isNight) startNightMusic(); else startOutdoorMusic();
}

function getNightAlpha() {
  const MAX = 0.68, TR = NIGHT_TRANS, t = dayTimer;
  if (t < DAY_DURATION - TR)      return 0;
  if (t < DAY_DURATION)           return MAX * (t - (DAY_DURATION - TR)) / TR;
  if (t < CYCLE_DURATION - TR)    return MAX;
  return MAX * (1 - (t - (CYCLE_DURATION - TR)) / TR);
}

function drawNightOverlay(t) {
  const alpha = getNightAlpha();
  if (alpha <= 0) return;
  ctx.fillStyle = `rgba(5,10,55,${alpha})`;
  ctx.fillRect(0, 0, W, H);
  stars.forEach(s => {
    const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + s.twinkle);
    ctx.fillStyle = `rgba(255,255,240,${alpha * tw * 0.9})`;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawDayNightHUD() {
  const isDay     = dayTimer < DAY_DURATION;
  const remaining = isDay ? DAY_DURATION - dayTimer : CYCLE_DURATION - dayTimer;
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const label = `${isDay ? 'DAY' : 'NIGHT'} ${mins}:${secs.toString().padStart(2, '0')}`;

  ctx.font = 'bold 8px monospace';
  const tw = ctx.measureText(label).width;
  const bw = tw + 22, bh = 13, bx = 4, by = 4;

  ctx.fillStyle = 'rgba(10,7,0,0.85)';
  roundRect(bx, by, bw, bh, 3);
  ctx.fill();
  ctx.strokeStyle = isDay ? 'rgba(245,194,0,0.55)' : 'rgba(130,150,230,0.6)';
  ctx.lineWidth = 1;
  roundRect(bx, by, bw, bh, 3);
  ctx.stroke();

  const ix = bx + 10, iy = by + 6.5;
  if (isDay) {
    ctx.fillStyle = '#f5c200';
    ctx.beginPath();
    ctx.arc(ix, iy, 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#f5c200';
    ctx.lineWidth = 0.8;
    for (let r = 0; r < 6; r++) {
      const a = (r / 6) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(ix + Math.cos(a) * 5, iy + Math.sin(a) * 5);
      ctx.lineTo(ix + Math.cos(a) * 7, iy + Math.sin(a) * 7);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#b0bce0';
    ctx.beginPath();
    ctx.arc(ix, iy, 3.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0a0700';
    ctx.beginPath();
    ctx.arc(ix + 2.2, iy - 1.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = isDay ? '#f5c200' : '#a0b0d8';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, bx + 18, by + 9.5);
}

// ── Dirt background (generated once, stable) ──────────────────────────────
const dirtPatches = Array.from({ length: 140 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: 3 + Math.random() * 20,
  h: 18 + Math.random() * 16,   // hue (earthy browns ~18–34)
  s: 28 + Math.random() * 22,
  l: 16 + Math.random() * 14,
}));

const pebbles = Array.from({ length: 30 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: 1 + Math.random() * 2.5,
  l: 28 + Math.random() * 20,
}));

function drawDirt() {
  ctx.fillStyle = 'hsl(24,38%,20%)';
  ctx.fillRect(0, 0, W, H);

  dirtPatches.forEach(p => {
    ctx.fillStyle = `hsl(${p.h},${p.s}%,${p.l}%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });

  pebbles.forEach(p => {
    ctx.fillStyle = `hsl(22,12%,${p.l}%)`;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  });
}

// ── NPC bees ───────────────────────────────────────────────────────────────
const BEE_NAMES = [
  'Phoebee', 'Beeyonce', 'Buzzer', 'Bee-atrice', 'Abee Lincoln',
  'Bee-njamin', 'Beenadette', 'Waxley', 'Pollena', 'Stingston',
  'Nectar Cage', 'Bee-ll Murray', 'Beevis', 'Droney', 'Hivebert',
  'Fuzz Aldrin', 'Comb Vader', 'Bee-toven', 'Lady Buzzaga', 'Waggle',
  'Bumblee', 'Stingerella', 'Buzzwick', 'Honeycomb', 'Bee-bop',
  'Buzz Killington', 'Pollenator', 'Bee-atrix', 'Sir Stings-a-Lot', 
  'Tabeetha', 'Beenie', 'Nectar Jr.'
];

const _usedNames = new Set();
function pickName() {
  const unused = BEE_NAMES.filter(n => !_usedNames.has(n));
  const pool = unused.length > 0 ? unused : BEE_NAMES;
  const name = pool[Math.floor(Math.random() * pool.length)];
  _usedNames.add(name);
  return name;
}

const MARGIN = 24;
let _nextBeeId = 0;

function makeNPC() {
  return {
    id: _nextBeeId++,
    relationships: {},
    x: MARGIN + Math.random() * (W - MARGIN * 2),
    y: MARGIN + Math.random() * (H - MARGIN * 2),
    vx: 0,
    vy: 0,
    tx: 0,
    ty: 0,
    speed: 22 + Math.random() * 22,
    jx: 0,
    jy: 0,
    name: pickName(),
    health: 80 + Math.random() * 20,
    needs: {
      hunger:   35 + Math.random() * 65,
      thirst:   30 + Math.random() * 70,
      bathroom: Math.random() * 35,
      energy:   25 + Math.random() * 75,
      boredom:  Math.random() * 88,
    },
    beebucks: 100,
    job: null,
    assignedFarm: null,
    farmerState: 'idle',
    actionTimer: 0,
    _ftarget: null,
    builderState: 'idle',
    builderTarget: null,
    buildTimer: 0,
    speech: null,
    passiveTimer: 8 + Math.random() * 20,
    bathroomRate: 0.12 + Math.random() * 0.15,
    bathroomState: null,
    bathroomTimer: 0,
    _targetBath: null,
    _assignedBath: null,
    cleanupState: null,
    cleanupTarget: null,
    _talkingTo:    null,
    _listenTarget: null,
    _listenTimer:  0,
  };
}

const npcs = Array.from({ length: 5 }, makeNPC);
npcs.forEach(pickTarget);

function pickTarget(b) {
  let tx, ty, tries = 0;
  do {
    tx = MARGIN + Math.random() * (W - MARGIN * 2);
    ty = MARGIN + Math.random() * (H - MARGIN * 2);
    tries++;
  } while ((isBlockedByFarm(tx, ty, 10) || isBlockedByBank(tx, ty, 10) || isBlockedByBathroom(tx, ty, 10) || isBlockedByHousing(tx, ty, 10)) && tries < 15);
  b.tx = tx;
  b.ty = ty;
}

function updateNPCs(dt, t) {
  npcs.forEach(b => {
    if (b.job || b.honeyState || b.bathroomState || b.cleanupState) return;
    // Listening bees stop and face the speaker
    if (b._listenTimer > 0) {
      b.vx *= Math.pow(0.05, dt);
      b.vy *= Math.pow(0.05, dt);
      return;
    }
    if (b.speech) { b.vx *= Math.pow(0.05, dt); b.vy *= Math.pow(0.05, dt); return; }
    const dx = b.tx - b.x;
    const dy = b.ty - b.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 10) {
      pickTarget(b);
      return;
    }

    // Slow jitter so movement looks organic, not laser-straight
    b.jx += (Math.random() - 0.5) * 40 * dt;
    b.jy += (Math.random() - 0.5) * 40 * dt;
    b.jx *= 0.92;
    b.jy *= 0.92;

    const nx = dx / dist;
    const ny = dy / dist;

    const targetVx = (nx * b.speed) + b.jx;
    const targetVy = (ny * b.speed) + b.jy;

    // Smooth steer
    b.vx += (targetVx - b.vx) * 6 * dt;
    b.vy += (targetVy - b.vy) * 6 * dt;

    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Farm avoidance
    farms.forEach(f => {
      const fw = FARM_W + BIN_GAP + BIN_W;
      const inside = b.x >= f.x && b.x <= f.x + fw && b.y >= f.y && b.y <= f.y + FARM_H;
      if (inside) {
        // Eject to nearest edge
        const toLeft  = b.x - f.x;
        const toRight = f.x + fw - b.x;
        const toTop   = b.y - f.y;
        const toBot   = f.y + FARM_H - b.y;
        const m = Math.min(toLeft, toRight, toTop, toBot);
        if (m === toLeft)  { b.x = f.x - 2;          b.vx = -Math.abs(b.vx); }
        else if (m === toRight) { b.x = f.x + fw + 2; b.vx =  Math.abs(b.vx); }
        else if (m === toTop)   { b.y = f.y - 2;      b.vy = -Math.abs(b.vy); }
        else                    { b.y = f.y + FARM_H + 2; b.vy = Math.abs(b.vy); }
        pickTarget(b);
      } else {
        // Repel when close to farm edge
        const cpx = Math.max(f.x, Math.min(f.x + fw, b.x));
        const cpy = Math.max(f.y, Math.min(f.y + FARM_H, b.y));
        const ex = b.x - cpx, ey = b.y - cpy;
        const dist = Math.sqrt(ex * ex + ey * ey);
        const avoidR = 14;
        if (dist < avoidR && dist > 0) {
          const s = (avoidR - dist) / avoidR;
          b.vx += (ex / dist) * s * 100 * dt;
          b.vy += (ey / dist) * s * 100 * dt;
        }
      }
    });

    // Bank avoidance (same logic as farms)
    banks.forEach(bk => {
      const inside = b.x >= bk.x && b.x <= bk.x + BANK_W &&
                     b.y >= bk.y && b.y <= bk.y + BANK_H;
      if (inside) {
        const toL = b.x - bk.x, toR = bk.x + BANK_W - b.x;
        const toT = b.y - bk.y, toB = bk.y + BANK_H - b.y;
        const m = Math.min(toL, toR, toT, toB);
        if (m === toL)  { b.x = bk.x - 2;          b.vx = -Math.abs(b.vx); }
        else if (m === toR) { b.x = bk.x + BANK_W + 2; b.vx =  Math.abs(b.vx); }
        else if (m === toT) { b.y = bk.y - 2;          b.vy = -Math.abs(b.vy); }
        else                { b.y = bk.y + BANK_H + 2; b.vy =  Math.abs(b.vy); }
        pickTarget(b);
      } else {
        const cpx = Math.max(bk.x, Math.min(bk.x + BANK_W, b.x));
        const cpy = Math.max(bk.y, Math.min(bk.y + BANK_H, b.y));
        const ex = b.x - cpx, ey = b.y - cpy;
        const dd = Math.sqrt(ex * ex + ey * ey);
        if (dd < 14 && dd > 0) {
          const s = (14 - dd) / 14;
          b.vx += (ex / dd) * s * 100 * dt;
          b.vy += (ey / dd) * s * 100 * dt;
        }
      }
    });

    // Bathroom avoidance
    bathrooms.forEach(bth => {
      const inside = b.x >= bth.x && b.x <= bth.x + BATHROOM_W &&
                     b.y >= bth.y && b.y <= bth.y + BATHROOM_H;
      if (inside) {
        const toL = b.x - bth.x, toR = bth.x + BATHROOM_W - b.x;
        const toT = b.y - bth.y, toB = bth.y + BATHROOM_H - b.y;
        const m = Math.min(toL, toR, toT, toB);
        if (m === toL)  { b.x = bth.x - 2;              b.vx = -Math.abs(b.vx); }
        else if (m === toR) { b.x = bth.x + BATHROOM_W + 2; b.vx =  Math.abs(b.vx); }
        else if (m === toT) { b.y = bth.y - 2;              b.vy = -Math.abs(b.vy); }
        else                { b.y = bth.y + BATHROOM_H + 2; b.vy =  Math.abs(b.vy); }
        pickTarget(b);
      } else {
        const cpx = Math.max(bth.x, Math.min(bth.x + BATHROOM_W, b.x));
        const cpy = Math.max(bth.y, Math.min(bth.y + BATHROOM_H, b.y));
        const ex = b.x - cpx, ey = b.y - cpy;
        const dd = Math.sqrt(ex * ex + ey * ey);
        if (dd < 14 && dd > 0) {
          const s = (14 - dd) / 14;
          b.vx += (ex / dd) * s * 100 * dt;
          b.vy += (ey / dd) * s * 100 * dt;
        }
      }
    });

    // Housing avoidance
    housings.forEach(h => {
      const inside = b.x >= h.x && b.x <= h.x + HOUSING_W &&
                     b.y >= h.y && b.y <= h.y + HOUSING_H;
      if (inside) {
        const toL = b.x - h.x, toR = h.x + HOUSING_W - b.x;
        const toT = b.y - h.y, toB = h.y + HOUSING_H - b.y;
        const m = Math.min(toL, toR, toT, toB);
        if (m === toL)  { b.x = h.x - 2;              b.vx = -Math.abs(b.vx); }
        else if (m === toR) { b.x = h.x + HOUSING_W + 2; b.vx =  Math.abs(b.vx); }
        else if (m === toT) { b.y = h.y - 2;              b.vy = -Math.abs(b.vy); }
        else                { b.y = h.y + HOUSING_H + 2;  b.vy =  Math.abs(b.vy); }
        pickTarget(b);
      } else {
        const cpx = Math.max(h.x, Math.min(h.x + HOUSING_W, b.x));
        const cpy = Math.max(h.y, Math.min(h.y + HOUSING_H, b.y));
        const ex = b.x - cpx, ey = b.y - cpy;
        const dd = Math.sqrt(ex * ex + ey * ey);
        if (dd < 14 && dd > 0) {
          const s = (14 - dd) / 14;
          b.vx += (ex / dd) * s * 100 * dt;
          b.vy += (ey / dd) * s * 100 * dt;
        }
      }
    });

    // Soft boundary bounce
    if (b.x < MARGIN)       { b.x = MARGIN;       b.vx = Math.abs(b.vx); pickTarget(b); }
    if (b.x > W - MARGIN)   { b.x = W - MARGIN;   b.vx = -Math.abs(b.vx); pickTarget(b); }
    if (b.y < MARGIN)       { b.y = MARGIN;       b.vy = Math.abs(b.vy); pickTarget(b); }
    if (b.y > H - MARGIN)   { b.y = H - MARGIN;   b.vy = -Math.abs(b.vy); pickTarget(b); }
  });
}

// Shortest-path angle lerp (handles wrap-around)
function lerpAngle(a, b, t) {
  let d = b - a;
  while (d >  Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

let playerBucks = 1000;

const FARMER_PAY_INTERVAL = 900; // 15 minutes
const FARMER_PAY = 200;
let farmerPayTimer = 0;

const TAX_INTERVAL = 1200; // 20 minutes
let taxTimer = TAX_INTERVAL;

const TAX_COLLECTED_LINES = [
  "Ouch! That stung!",
  "There go my beebucks...",
  "The taxman strikes again!",
  "Every. Single. Time.",
  "I needed that money...",
  "At least the hive benefits?",
  "I'm going broke out here!",
  "Fine. FINE. Take it.",
];

function collectTaxes() {
  let total = 0;
  npcs.forEach(b => {
    const tax = Math.floor(b.beebucks * 0.1);
    b.beebucks -= tax;
    total += tax;
    if (Math.random() < 0.55) {
      b.speech = { text: pick(TAX_COLLECTED_LINES), timer: 3.2, dur: 3.2 };
    }
  });
  playerBucks += total;
}

function drawTaxTimer(t) {
  const mins = Math.floor(taxTimer / 60);
  const secs = Math.floor(taxTimer % 60);
  const label = `TAX: ${mins}:${secs.toString().padStart(2, '0')}`;

  const urgent  = taxTimer <= 60;
  const warning = taxTimer <= 300;
  const flash   = urgent && Math.sin(t * 10) > 0;

  ctx.font = 'bold 8px monospace';
  const tw = ctx.measureText(label).width;
  const bw = tw + 8, bh = 13;
  const bx = W / 2 - bw / 2, by = 4;

  ctx.fillStyle = flash ? 'rgba(180,0,0,0.92)' : 'rgba(10,7,0,0.85)';
  roundRect(bx, by, bw, bh, 3);
  ctx.fill();
  ctx.strokeStyle = urgent ? '#ff4040' : warning ? '#e0a030' : 'rgba(245,194,0,0.45)';
  ctx.lineWidth = 1;
  roundRect(bx, by, bw, bh, 3);
  ctx.stroke();

  ctx.fillStyle = flash ? '#ffaaaa' : urgent ? '#ff6060' : warning ? '#f5c200' : '#f5c200';
  ctx.textAlign = 'left';
  ctx.fillText(label, bx + 4, by + 9.5);
}

function drawBudget() {
  const label = `BUDGET: $${playerBucks}`;
  ctx.font = 'bold 8px monospace';
  const tw = ctx.measureText(label).width;
  const bx = W - tw - 10, by = 4, bw = tw + 8, bh = 13;

  ctx.fillStyle = 'rgba(10,7,0,0.85)';
  roundRect(bx - 2, by, bw, bh, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,194,0,0.5)';
  ctx.lineWidth = 1;
  roundRect(bx - 2, by, bw, bh, 3);
  ctx.stroke();

  ctx.fillStyle = '#f5c200';
  ctx.textAlign = 'left';
  ctx.fillText(label, bx + 2, by + 9.5);
}

// ── World scene entry point ────────────────────────────────────────────────
function startWorld() {
  startOutdoorMusic();
  canvas.addEventListener('pointerdown', handleWorldClick);
  let last = null;

  function loop(ts) {
    const t = ts / 1000;
    const dt = last !== null ? Math.min((ts - last) / 1000, 0.05) : 0;
    last = ts;
    dayTimer = (dayTimer + dt) % CYCLE_DURATION;

    // ── Housing interior scene ──
    if (insideHousing) {
      taxTimer -= dt;
      if (taxTimer <= 0) { taxTimer = TAX_INTERVAL; collectTaxes(); }
      drawHousingInterior(insideHousing, t);
      drawTaxTimer(t);
      updateFade(dt);
      drawFadeOverlay();
      requestAnimationFrame(loop);
      return;
    }

    // ── Bank interior scene ──
    if (insideBank) {
      taxTimer -= dt;
      if (taxTimer <= 0) { taxTimer = TAX_INTERVAL; collectTaxes(); }
      drawBankInterior(t);
      drawTaxTimer(t);
      updateFade(dt);
      drawFadeOverlay();
      requestAnimationFrame(loop);
      return;
    }

    drawDirt();
    updateDayNightMusic();
    // Farmer payday every 15 minutes
    farmerPayTimer += dt;
    if (farmerPayTimer >= FARMER_PAY_INTERVAL) {
      farmerPayTimer -= FARMER_PAY_INTERVAL;
      npcs.forEach(b => { if (b.job === 'farmer') b.beebucks += FARMER_PAY; });
    }
    // Tax season every 20 minutes
    taxTimer -= dt;
    if (taxTimer <= 0) {
      taxTimer = TAX_INTERVAL;
      collectTaxes();
    }

    updateFarms(dt);
    updateBuildSites(dt);
    drawFarms();
    drawBanks();
    drawBuildSites(t);
    if (buildMode && pendingBuild === 'farm') {
      const fx = Math.max(2, Math.min(W - FARM_W - BIN_W - BIN_GAP - 4, mouse.x - FARM_W / 2));
      const fy = Math.max(2, Math.min(H - FARM_H - 2, mouse.y - FARM_H / 2));
      drawFarmGhost(fx, fy, !farmOverlaps(fx, fy) && !bankOverlaps(fx, fy) && farmCount() < FARM_LIMIT);
    }
    if (buildMode && pendingBuild === 'bank') {
      const bx = Math.max(2, Math.min(W - BANK_W - 4, mouse.x - BANK_W / 2));
      const by = Math.max(2, Math.min(H - BANK_H - 2, mouse.y - BANK_H / 2));
      drawBankGhost(bx, by, !bankOverlaps(bx, by) && bankCount() < BANK_LIMIT);
    }
    if (buildMode && pendingBuild === 'bathroom') {
      const bx = Math.max(2, Math.min(W - BATHROOM_W - 4, mouse.x - BATHROOM_W / 2));
      const by = Math.max(2, Math.min(H - BATHROOM_H - 2, mouse.y - BATHROOM_H / 2));
      drawBathroomGhost(bx, by, !bathroomOverlaps(bx, by) && bathroomCount() < BATHROOM_LIMIT);
    }
    drawBathrooms();
    drawHousings();
    drawPoops();
    if (buildMode && pendingBuild === 'housing') {
      const hx = Math.max(2, Math.min(W - HOUSING_W - 4, mouse.x - HOUSING_W / 2));
      const hy = Math.max(2, Math.min(H - HOUSING_H - 2, mouse.y - HOUSING_H / 2));
      drawHousingGhost(hx, hy, !housingOverlaps(hx, hy) && housingCount() < HOUSING_LIMIT);
    }
    updateNPCs(dt, t);

    npcs.forEach(b => {
      // Bathroom need increases over time (bankers are more disciplined)
      if (b.bankerState === 'at_counter') {
        b.needs.bathroom = Math.min(99, b.needs.bathroom + b.bathroomRate * 0.25 * dt);
      } else if (b.honeyState !== 'offscreen') {
        b.needs.bathroom = Math.min(100, b.needs.bathroom + b.bathroomRate * dt);
      }

      // Poop if need hits 100 (bathroom full, or no bathroom found)
      if (b.needs.bathroom >= 100) {
        b.needs.bathroom = 5;
        b.bathroomState = null;
        b._targetBath   = null;
        poops.push({ x: b.x, y: b.y, leftBy: b });
        npcs.forEach(other => {
          if (other !== b && Math.hypot(other.x - b.x, other.y - b.y) < 45 && !other.speech) {
            other.speech = { text: pick(DISGUST_LINES), timer: 3.5, dur: 3.5 };
          }
        });
      }

      // Start seeking bathroom at threshold
      if (!b.bathroomState && !b.cleanupState &&
          b.needs.bathroom >= BATHROOM_SEEK_THRESHOLD &&
          b.bankerState !== 'at_counter' &&
          bathrooms.length > 0) {
        b.bathroomState = 'seeking';
        b._targetBath   = null;
      }

      // State machine priority: cleanup > bathroom > honey > job > wander
      if (b.cleanupState) {
        updateCleanupBee(b, dt);
      } else if (b.bathroomState) {
        updateBathroomBee(b, dt);
      } else if (b.honeyState) {
        updateHoneyBee(b, dt);
      } else {
        if (b.job === 'farmer')  updateFarmer(b, dt);
        if (b.job === 'builder') updateBuilder(b, dt);
        if (b.job === 'banker')  updateBanker(b, dt);
      }

      if (b.bankerState === 'at_counter') return;
      if (b.honeyState === 'offscreen') return;
      if (b.bathroomState === 'in_bathroom') return;

      const isTalking = !!(b.speech);

      // Smooth engaged blend (active when talking OR listening)
      if (b._engaged === undefined) b._engaged = 0;
      const isEngaged = isTalking || b._listenTimer > 0;
      b._engaged += ((isEngaged ? 1 : 0) - b._engaged) * 10 * dt;
      b._engaged  = Math.max(0, Math.min(1, b._engaged));

      if (isTalking) {
        b.vx *= Math.pow(0.05, dt);
        b.vy *= Math.pow(0.05, dt);
        // Face conversation partner; face camera only for player-triggered speech
        if (b._talkingTo && npcs.includes(b._talkingTo)) {
          const dx = b._talkingTo.x - b.x, dy = b._talkingTo.y - b.y;
          b._angle = lerpAngle(b._angle || 0, Math.atan2(dy, dx) + Math.PI / 2, 10 * dt);
        } else {
          b._angle = lerpAngle(b._angle || 0, Math.PI, 10 * dt);
        }
      } else if (b._listenTimer > 0 && b._listenTarget && npcs.includes(b._listenTarget)) {
        // Listener faces the speaker
        const dx = b._listenTarget.x - b.x, dy = b._listenTarget.y - b.y;
        b._angle = lerpAngle(b._angle || 0, Math.atan2(dy, dx) + Math.PI / 2, 10 * dt);
      } else {
        const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        if (speed > 1) b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      }

      drawBeeTop(b.x, b.y, b._angle || 0, t, b._engaged, b.job);

      if (b.hasHoney) {
        const jx = b.x + 6, jy = b.y - 16;
        ctx.fillStyle = '#7a3800';
        ctx.fillRect(jx - 3, jy - 3, 6, 3);       // lid
        ctx.fillStyle = '#f0a020';
        ctx.fillRect(jx - 4, jy, 8, 9);            // jar body
        ctx.fillStyle = '#c87800';
        ctx.fillRect(jx - 4, jy + 7, 8, 2);        // base
        ctx.fillStyle = 'rgba(255,240,180,0.5)';
        ctx.fillRect(jx - 2, jy + 1, 2, 5);        // shine
      }
    });

    drawNightOverlay(t);
    tickDialogue(dt);
    drawRelationshipBadges();
    drawAllSpeechBubbles();

    drawBuildButton();
    drawCheatButton();
    drawStarRating();
    drawBuildMenu();
    drawBudget();
    drawTaxTimer(t);
    drawDayNightHUD();
    drawJobUI();
    if (selectedBank)    drawBankPanel(selectedBank);
    if (selectedHousing) drawHousingPanel(selectedHousing);
    drawPoopPanel();

    // Hover tooltip (suppress in build mode or on selected bee to avoid overlap)
    const hovered = buildMode ? null : getHoveredNpc(npcs);
    if (hovered && hovered !== selectedBee) drawHoverPanel(hovered);

    if (buildMode) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = (hovered || selectedBee || selectedBank || selectedPoop || selectedHousing) ? 'pointer' : 'default';
    }

    updateFade(dt);
    drawFadeOverlay();

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
