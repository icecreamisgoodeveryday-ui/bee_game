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
    // wander jitter accumulator
    jx: 0,
    jy: 0,
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

// ── World scene entry point ────────────────────────────────────────────────
function startWorld() {
  let last = null;

  function loop(ts) {
    const t = ts / 1000;
    const dt = last !== null ? Math.min((ts - last) / 1000, 0.05) : 0;
    last = ts;

    drawDirt();
    updateNPCs(dt, t);

    npcs.forEach(b => {
      const speed = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      // Only rotate when actually moving; hold last angle otherwise
      if (speed > 1) b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      drawBeeTop(b.x, b.y, b._angle || 0, t);
    });

    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
}
