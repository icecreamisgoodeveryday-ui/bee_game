const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = 480;
const H = 270;
canvas.width = W;
canvas.height = H;

// Scale canvas to fit window while keeping 16:9
function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();

// ── Bee sprite (drawn with canvas primitives) ──────────────────────────────
function drawBee(x, y, scale, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const hover = Math.sin(t * 4) * 2;
  ctx.translate(0, hover);

  // Wing flap angle
  const flap = Math.abs(Math.sin(t * 12)) * 0.6;

  // Left wing
  ctx.save();
  ctx.rotate(-flap - 0.3);
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-10, -8, 12, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right wing
  ctx.save();
  ctx.rotate(flap + 0.3);
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(10, -8, 12, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = '#f5c200';
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stripes
  ctx.fillStyle = '#1a1a1a';
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(-9, i * 7 - 2, 18, 4);
  }
  // Clip stripes to body shape
  ctx.fillStyle = '#f5c200';
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
  // Use composite to mask — simpler: just draw coloured arcs over stripe ends
  // (small circles to round the ends off at the sides)

  // Head
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(0, -14, 7, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-3, -15, 2.2, 0, Math.PI * 2);
  ctx.arc(3, -15, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-3, -15, 1.1, 0, Math.PI * 2);
  ctx.arc(3, -15, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Antennae
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-3, -20);
  ctx.quadraticCurveTo(-10, -30, -7, -35);
  ctx.moveTo(3, -20);
  ctx.quadraticCurveTo(10, -30, 7, -35);
  ctx.stroke();
  ctx.fillStyle = '#f5c200';
  ctx.beginPath();
  ctx.arc(-7, -35, 2.5, 0, Math.PI * 2);
  ctx.arc(7, -35, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Stinger
  ctx.fillStyle = '#cc8800';
  ctx.beginPath();
  ctx.moveTo(-3, 13);
  ctx.lineTo(3, 13);
  ctx.lineTo(0, 20);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// ── Floating hexagon particles ─────────────────────────────────────────────
const hexes = Array.from({ length: 18 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: 8 + Math.random() * 16,
  speed: 0.1 + Math.random() * 0.3,
  alpha: 0.04 + Math.random() * 0.10,
  drift: (Math.random() - 0.5) * 0.2,
}));

function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
             : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}

// ── Sky gradient ───────────────────────────────────────────────────────────
function drawSky(t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.4);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `hsl(${200 + pulse * 20},60%,${18 + pulse * 4}%)`);
  sky.addColorStop(1, `hsl(${30 + pulse * 10},50%,${10 + pulse * 2}%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

// ── Title text ─────────────────────────────────────────────────────────────
function drawTitle(t) {
  const bounce = Math.sin(t * 1.8) * 3;

  ctx.save();
  ctx.textAlign = 'center';

  // Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = 'bold 52px serif';
  ctx.fillText('BEE GAME', W / 2 + 3, 80 + bounce + 3);

  // Glow
  ctx.shadowColor = '#f5c200';
  ctx.shadowBlur = 18 + Math.sin(t * 2) * 6;
  ctx.fillStyle = '#f5c200';
  ctx.fillText('BEE GAME', W / 2, 80 + bounce);

  ctx.shadowBlur = 0;

  // Subtitle
  ctx.font = '14px monospace';
  ctx.fillStyle = '#ffe88a';
  ctx.fillText('a game about bees', W / 2, 102 + bounce);

  ctx.restore();
}

// ── Press any key prompt ───────────────────────────────────────────────────
function drawPrompt(t) {
  const blink = Math.floor(t * 2) % 2 === 0;
  if (!blink) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '13px monospace';
  ctx.fillStyle = '#fff9cc';
  ctx.globalAlpha = 0.85;
  ctx.fillText('[ press any key to start ]', W / 2, H - 22);
  ctx.restore();
}

// ── Flowers along the bottom ───────────────────────────────────────────────
function drawFlower(x, y, r, hue, t, phase) {
  const spin = t * 0.3 + phase;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i + spin;
    ctx.fillStyle = `hsl(${hue},80%,65%)`;
    ctx.beginPath();
    ctx.ellipse(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9, r * 0.55, r * 0.4, a, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#f5c200';
  ctx.beginPath();
  ctx.arc(x, y, r * 0.42, 0, Math.PI * 2);
  ctx.fill();
}

const flowers = [
  { x: 30,  y: H - 18, r: 10, hue: 300, phase: 0 },
  { x: 70,  y: H - 14, r: 14, hue: 200, phase: 1.2 },
  { x: 118, y: H - 20, r: 9,  hue: 350, phase: 0.5 },
  { x: 170, y: H - 12, r: 13, hue: 130, phase: 2.1 },
  { x: 220, y: H - 18, r: 11, hue: 260, phase: 0.9 },
  { x: 270, y: H - 14, r: 10, hue: 40,  phase: 1.7 },
  { x: 320, y: H - 20, r: 12, hue: 190, phase: 0.3 },
  { x: 370, y: H - 15, r: 9,  hue: 320, phase: 2.5 },
  { x: 415, y: H - 18, r: 14, hue: 80,  phase: 0.7 },
  { x: 460, y: H - 12, r: 10, hue: 230, phase: 1.4 },
];

// ── Main loop ──────────────────────────────────────────────────────────────
let t = 0;
let started = false;

function loop(ts) {
  t = ts / 1000;

  drawSky(t);

  // Hex particles
  hexes.forEach(h => {
    h.y -= h.speed;
    h.x += h.drift;
    if (h.y + h.r < 0) { h.y = H + h.r; h.x = Math.random() * W; }
    ctx.strokeStyle = `rgba(245,194,0,${h.alpha})`;
    ctx.lineWidth = 1;
    hexPath(h.x, h.y, h.r);
    ctx.stroke();
  });

  // Flowers
  flowers.forEach(f => drawFlower(f.x, f.y, f.r, f.hue, t, f.phase));

  // Ground strip
  const grass = ctx.createLinearGradient(0, H - 8, 0, H);
  grass.addColorStop(0, '#3a7d1e');
  grass.addColorStop(1, '#1e4a0a');
  ctx.fillStyle = grass;
  ctx.fillRect(0, H - 8, W, 8);

  drawTitle(t);
  drawBee(W / 2, 165, 1.3, t);
  drawPrompt(t);

  requestAnimationFrame(loop);
}

// Any key → placeholder (future: swap to game scene)
window.addEventListener('keydown', () => { if (!started) { started = true; /* TODO: start game */ } });
window.addEventListener('pointerdown', () => { if (!started) { started = true; } });

requestAnimationFrame(loop);
