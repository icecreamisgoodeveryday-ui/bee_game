// ── Mouse tracking in canvas space ────────────────────────────────────────
const mouse = { x: -9999, y: -9999 };

canvas.addEventListener('mousemove', e => {
  const r = canvas.getBoundingClientRect();
  mouse.x = (e.clientX - r.left) * (W / r.width);
  mouse.y = (e.clientY - r.top)  * (H / r.height);
});
canvas.addEventListener('mouseleave', () => { mouse.x = -9999; mouse.y = -9999; });

// ── Hover detection ────────────────────────────────────────────────────────
function getHoveredNpc(npcs) {
  for (const b of npcs) {
    const dx = b.x - mouse.x;
    const dy = b.y - mouse.y;
    if (dx * dx + dy * dy < 15 * 15) return b;
  }
  return null;
}

// ── Emotion ────────────────────────────────────────────────────────────────
function getEmotion(npc) {
  const { hunger, thirst, bathroom, energy, boredom } = npc.needs;
  if (bathroom > 78)                          return 'Desperate!';
  if (energy   < 22)                          return 'Exhausted';
  if (hunger   < 28)                          return 'Starving';
  if (thirst   < 28)                          return 'Parched';
  if (boredom  > 72)                          return 'So Bored';
  if (npc.health < 40)                        return 'Unwell';
  if (hunger > 78 && energy > 72 && boredom < 35) return 'Happy!';
  return 'Content';
}

// ── Drawing helpers ────────────────────────────────────────────────────────
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y,     x + w, y + r,     r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x,     y + h, x, y + h - r,     r);
  ctx.lineTo(x,     y + r);
  ctx.arcTo(x,     y,     x + r, y,          r);
  ctx.closePath();
}

// bar: label in 40px col, then filled track
// badWhenHigh: true = full bar is red (bathroom, boredom)
function drawBar(x, y, label, value, badWhenHigh) {
  const bx = x + 40, bw = 68, bh = 5;

  ctx.fillStyle = '#b0a090';
  ctx.font = '7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(label, x, y + 5);

  // track
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(bx, y, bw, bh);

  // fill color: hue 0 (red) → 120 (green) based on "goodness"
  const goodness = badWhenHigh ? 100 - value : value;
  ctx.fillStyle = `hsl(${goodness * 1.2},72%,44%)`;
  ctx.fillRect(bx, y, bw * (value / 100), bh);
}

// ── Hover panel ────────────────────────────────────────────────────────────
const PW = 120;
const PH = 108;

const JOB_LABELS = { farmer: 'Farmer', builder: 'Builder', null: 'Jobless' };

function drawHoverPanel(npc) {
  let px = npc.x + 16;
  let py = npc.y - PH - 10;
  if (px + PW > W - 2)  px = npc.x - PW - 16;
  if (px < 2)           px = 2;
  if (py < 2)           py = npc.y + 16;
  if (py + PH > H - 2)  py = H - PH - 2;

  ctx.fillStyle = 'rgba(8,5,2,0.90)';
  roundRect(px, py, PW, PH, 5);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,194,0,0.55)';
  ctx.lineWidth = 1;
  roundRect(px, py, PW, PH, 5);
  ctx.stroke();

  const x = px + 5;
  ctx.textAlign = 'left';

  // Name
  ctx.fillStyle = '#f5c200';
  ctx.font = 'bold 9px monospace';
  ctx.fillText(npc.name, x, py + 12);

  // Relationship chip (shown when another bee is selected)
  if (typeof selectedBee !== 'undefined' && selectedBee && selectedBee !== npc &&
      typeof getRelationship !== 'undefined') {
    const rel  = getRelationship(selectedBee, npc);
    const cfg  = (typeof REL_BADGE !== 'undefined') ? REL_BADGE[rel] :
                 { label: rel === 'friend' ? 'bff' : rel === 'acquaintance' ? 'hey' : '???',
                   color: rel === 'friend' ? '#8bc34a' : rel === 'acquaintance' ? '#f5c200' : '#888',
                   bg: 'rgba(10,10,10,0.9)' };
    ctx.font = 'bold 5px monospace';
    const tw = ctx.measureText(cfg.label).width;
    const cw = tw + 6, ch = 9;
    const chipX = px + PW - cw - 3, chipY = py + 3;
    ctx.fillStyle = cfg.bg;
    roundRect(chipX, chipY, cw, ch, 3);
    ctx.fill();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 0.7;
    roundRect(chipX, chipY, cw, ch, 3);
    ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.textAlign = 'center';
    ctx.fillText(cfg.label, chipX + cw / 2, chipY + 6.5);
  }

  // Job + beebucks on same row
  const jobLabel = JOB_LABELS[npc.job] || (npc.job ? npc.job.charAt(0).toUpperCase() + npc.job.slice(1) : 'Jobless');
  ctx.font = '7px monospace';
  ctx.fillStyle = npc.job ? '#8bc34a' : '#888';
  ctx.fillText(jobLabel, x, py + 22);
  ctx.fillStyle = '#f5c200';
  ctx.textAlign = 'right';
  ctx.fillText(`$${Math.floor(npc.beebucks)}`, px + PW - 5, py + 22);
  ctx.textAlign = 'left';

  // Emotion
  const emotion = getEmotion(npc);
  ctx.fillStyle = '#c8b890';
  ctx.font = '7px monospace';
  ctx.fillText(emotion, x, py + 32);

  // Health bar
  ctx.fillStyle = '#e06060';
  ctx.fillText('Health', x, py + 42);
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(x + 40, py + 37, 68, 6);
  const hpHue = npc.health > 55 ? 120 : npc.health > 28 ? 40 : 0;
  ctx.fillStyle = `hsl(${hpHue},72%,44%)`;
  ctx.fillRect(x + 40, py + 37, 68 * (npc.health / 100), 6);

  // Need bars
  const bars = [
    { label: 'Hunger',   key: 'hunger',   bad: false },
    { label: 'Thirst',   key: 'thirst',   bad: false },
    { label: 'Bathroom', key: 'bathroom', bad: true  },
    { label: 'Energy',   key: 'energy',   bad: false },
    { label: 'Boredom',  key: 'boredom',  bad: true  },
  ];

  bars.forEach((bar, i) => {
    drawBar(x, py + 50 + i * 11, bar.label, npc.needs[bar.key], bar.bad);
  });
}

// ── Star rating ────────────────────────────────────────────────────────────
function getStarRating() {
  const total = (typeof farms !== 'undefined' ? farms.length : 0)
              + (typeof banks !== 'undefined' ? banks.length : 0)
              + (typeof bathrooms !== 'undefined' ? bathrooms.length : 0)
              + (typeof housings !== 'undefined' ? housings.length : 0);
  if (farms.length >= 1 && banks.length >= 1 && bathrooms.length >= 1 && housings.length >= 1) return 3;
  if (total >= 2) return 2;
  return 1;
}

function drawStarRating() {
  const rating  = getStarRating();
  const OUTER   = 5.5, INNER = 2.2, SPACING = 14;
  const bw = 3 * SPACING + 8, bh = 14;
  const bx = W - bw - 5, by = H - 17;

  ctx.fillStyle = 'rgba(10,7,0,0.85)';
  roundRect(bx, by, bw, bh, 3);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,194,0,0.4)';
  ctx.lineWidth = 1;
  roundRect(bx, by, bw, bh, 3);
  ctx.stroke();

  const cy = by + bh / 2;
  for (let i = 0; i < 3; i++) {
    const cx     = bx + 10 + i * SPACING;
    const filled = i < rating;
    ctx.beginPath();
    for (let p = 0; p < 10; p++) {
      const r = p % 2 === 0 ? OUTER : INNER;
      const a = -Math.PI / 2 + (p / 10) * Math.PI * 2;
      if (p === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
      else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    }
    ctx.closePath();
    ctx.fillStyle = filled ? '#f5c200' : 'rgba(80,65,20,0.5)';
    ctx.fill();
    ctx.strokeStyle = filled ? '#c89000' : '#554530';
    ctx.lineWidth = 0.6;
    ctx.stroke();
  }
}
