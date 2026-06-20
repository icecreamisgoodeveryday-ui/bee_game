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
  'Buzz Killington', 'Pollenator', 'Queen Bee-atrix', 'Sir Stings-a-Lot',
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

function makeNPC() {
  return {
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
      bathroom: Math.random() * 90,
      energy:   25 + Math.random() * 75,
      boredom:  Math.random() * 88,
    },
    beebucks: 100,
    job: null,
    farmerState: 'idle',
    actionTimer: 0,
    _ftarget: null,
  };
}

const npcs = Array.from({ length: 5 }, makeNPC);
npcs.forEach(pickTarget);

function pickTarget(b) {
  b.tx = MARGIN + Math.random() * (W - MARGIN * 2);
  b.ty = MARGIN + Math.random() * (H - MARGIN * 2);
}

function updateNPCs(dt, t) {
  npcs.forEach(b => {
    if (b.job) return; // job systems handle their own movement
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

    // Soft boundary bounce
    if (b.x < MARGIN)       { b.x = MARGIN;       b.vx = Math.abs(b.vx); pickTarget(b); }
    if (b.x > W - MARGIN)   { b.x = W - MARGIN;   b.vx = -Math.abs(b.vx); pickTarget(b); }
    if (b.y < MARGIN)       { b.y = MARGIN;       b.vy = Math.abs(b.vy); pickTarget(b); }
    if (b.y > H - MARGIN)   { b.y = H - MARGIN;   b.vy = -Math.abs(b.vy); pickTarget(b); }
  });
}

let playerBucks = 1000;

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
  canvas.addEventListener('pointerdown', handleWorldClick);
  let last = null;

  function loop(ts) {
    const t = ts / 1000;
    const dt = last !== null ? Math.min((ts - last) / 1000, 0.05) : 0;
    last = ts;

    drawDirt();
    updateFarms(dt);
    drawFarms();
    updateNPCs(dt, t);

    npcs.forEach(b => {
      if (b.job === 'farmer') updateFarmer(b, dt);
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      if (speed > 1) b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      drawBeeTop(b.x, b.y, b._angle || 0, t);
    });

    drawBuildButton();
    drawBudget();
    drawJobUI();

    // Hover tooltip (suppress in build mode or on selected bee to avoid overlap)
    const hovered = buildMode ? null : getHoveredNpc(npcs);
    if (hovered && hovered !== selectedBee) drawHoverPanel(hovered);

    if (buildMode) {
      canvas.style.cursor = 'crosshair';
    } else {
      canvas.style.cursor = (hovered || selectedBee) ? 'pointer' : 'default';
    }

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
