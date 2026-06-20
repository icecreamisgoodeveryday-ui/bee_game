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

function hexPath(x, y, r) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    i === 0 ? ctx.moveTo(x + r * Math.cos(a), y + r * Math.sin(a))
             : ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a));
  }
  ctx.closePath();
}

const hexes = Array.from({ length: 18 }, () => ({
  x: Math.random() * W,
  y: Math.random() * H,
  r: 8 + Math.random() * 16,
  speed: 0.1 + Math.random() * 0.3,
  alpha: 0.04 + Math.random() * 0.10,
  drift: (Math.random() - 0.5) * 0.2,
}));
