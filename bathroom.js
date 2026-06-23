// ── Bathroom constants ─────────────────────────────────────────────────────
const BATHROOM_OW   = 20;   // single outhouse width
const BATHROOM_OH   = 32;   // single outhouse height
const BATHROOM_GAP  = 6;    // gap between the two outhouses
const BATHROOM_W    = BATHROOM_OW * 2 + BATHROOM_GAP;  // 46
const BATHROOM_H    = BATHROOM_OH;
const BATHROOM_COST = 35;
const BATHROOM_BUILD_TIME = 8;
const BATHROOM_LIMIT = 3;
const BATHROOM_SEEK_THRESHOLD = 75;

const bathrooms = [];
const poops     = [];
let selectedPoop = null;

function bathroomCount() {
  return bathrooms.length + buildSites.filter(s => s.type === 'bathroom').length;
}

function makeBathroom(x, y) { return { x, y, occupants: [] }; }

function bathroomFull(bth)      { return bth.occupants.length >= 2; }
function findAvailableBathroom() { return bathrooms.find(bth => !bathroomFull(bth)) || null; }

// ── Drawing ────────────────────────────────────────────────────────────────
function drawOuthouse(ox, oy, label) {
  const ow = BATHROOM_OW, oh = BATHROOM_OH;

  // Body
  ctx.fillStyle = '#7a4e28';
  ctx.fillRect(ox, oy + 8, ow, oh - 8);

  // Plank lines
  ctx.strokeStyle = '#5a3210';
  ctx.lineWidth = 0.6;
  for (let py = oy + 13; py < oy + oh - 5; py += 4) {
    ctx.beginPath(); ctx.moveTo(ox + 1, py); ctx.lineTo(ox + ow - 1, py); ctx.stroke();
  }

  // Roof strip
  ctx.fillStyle = '#4a2a0c';
  ctx.fillRect(ox, oy + 5, ow, 5);

  // Roof triangle peak
  ctx.fillStyle = '#5a3810';
  ctx.beginPath();
  ctx.moveTo(ox + 2, oy + 10);
  ctx.lineTo(ox + ow / 2, oy);
  ctx.lineTo(ox + ow - 2, oy + 10);
  ctx.closePath();
  ctx.fill();

  // Door
  const dw = 10, dh = 14;
  const dx = ox + ow / 2 - dw / 2;
  const dy = oy + oh - dh;
  ctx.fillStyle = '#3a1a04';
  ctx.fillRect(dx, dy, dw, dh);

  // Crescent moon on door
  const mx = dx + dw / 2, my = dy + 5;
  ctx.fillStyle = '#e8c060';
  ctx.beginPath(); ctx.arc(mx, my, 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#3a1a04';
  ctx.beginPath(); ctx.arc(mx + 1.5, my, 2.1, 0, Math.PI * 2); ctx.fill();

  // Label (F / M)
  ctx.fillStyle = '#e8c060';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(label, ox + ow / 2, oy + 18);

  // Border
  ctx.strokeStyle = '#3a1a04';
  ctx.lineWidth = 1;
  ctx.strokeRect(ox, oy + 5, ow, oh - 5);
}

function drawBathroom(bth) {
  const { x, y } = bth;

  // Ground shadow strip
  ctx.fillStyle = '#4a3218';
  ctx.fillRect(x - 2, y + BATHROOM_H - 2, BATHROOM_W + 4, 4);

  // Left outhouse (Female)
  drawOuthouse(x, y, 'F');
  // Right outhouse (Male)
  drawOuthouse(x + BATHROOM_OW + BATHROOM_GAP, y, 'M');

  // Occupancy indicator dots
  [0, 1].forEach(i => {
    const dotX = x + BATHROOM_OW / 2 + i * (BATHROOM_OW + BATHROOM_GAP);
    ctx.fillStyle = bth.occupants.length > i ? '#ff5050' : '#50d050';
    ctx.beginPath(); ctx.arc(dotX, y - 5, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 0.5;
    ctx.beginPath(); ctx.arc(dotX, y - 5, 2.5, 0, Math.PI * 2); ctx.stroke();
  });
}

function drawBathrooms() { bathrooms.forEach(drawBathroom); }

function drawBathroomGhost(x, y, valid) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = valid ? '#f5c200' : '#ff4040';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, BATHROOM_W, BATHROOM_H);
  ctx.setLineDash([]);
  ctx.fillStyle = valid ? 'rgba(245,194,0,0.07)' : 'rgba(255,60,60,0.14)';
  ctx.fillRect(x, y, BATHROOM_W, BATHROOM_H);
  ctx.restore();
}

// ── Overlap helpers ────────────────────────────────────────────────────────
function bathroomOverlaps(bx, by) {
  const PAD = 8;
  if (bathrooms.some(bth =>
    !(bx + BATHROOM_W + PAD < bth.x || bx > bth.x + BATHROOM_W + PAD ||
      by + BATHROOM_H + PAD < bth.y || by > bth.y + BATHROOM_H + PAD)
  )) return true;
  const fw = FARM_W + BIN_GAP + BIN_W;
  if (farms.some(f =>
    !(bx + BATHROOM_W + PAD < f.x || bx > f.x + fw + PAD ||
      by + BATHROOM_H + PAD < f.y || by > f.y + FARM_H + PAD)
  )) return true;
  if (banks.some(b =>
    !(bx + BATHROOM_W + PAD < b.x || bx > b.x + BANK_W + PAD ||
      by + BATHROOM_H + PAD < b.y || by > b.y + BANK_H + PAD)
  )) return true;
  if (typeof housings !== 'undefined' && housings.some(h =>
    !(bx + BATHROOM_W + PAD < h.x || bx > h.x + HOUSING_W + PAD ||
      by + BATHROOM_H + PAD < h.y || by > h.y + HOUSING_H + PAD)
  )) return true;
  return buildSites.some(s => {
    const sw = s.type === 'farm' ? (FARM_W + BIN_GAP + BIN_W) : s.type === 'bank' ? BANK_W :
               s.type === 'bathroom' ? BATHROOM_W : HOUSING_W;
    const sh = s.type === 'farm' ? FARM_H : s.type === 'bank' ? BANK_H :
               s.type === 'bathroom' ? BATHROOM_H : HOUSING_H;
    const sx = s.x - sw / 2, sy = s.y - sh / 2;
    return !(bx + BATHROOM_W + PAD < sx || bx > sx + sw + PAD ||
             by + BATHROOM_H + PAD < sy || by > sy + sh + PAD);
  });
}

function isBlockedByBathroom(x, y, pad) {
  pad = pad || 0;
  return bathrooms.some(bth =>
    x >= bth.x - pad && x <= bth.x + BATHROOM_W + pad &&
    y >= bth.y - pad && y <= bth.y + BATHROOM_H + pad
  );
}

function bathroomAtPoint(cx, cy) {
  return bathrooms.find(bth =>
    cx >= bth.x && cx <= bth.x + BATHROOM_W &&
    cy >= bth.y && cy <= bth.y + BATHROOM_H
  ) || null;
}

// ── Poop system ────────────────────────────────────────────────────────────
const DISGUST_LINES = [
  "WHO DID THIS?!",
  "Oh no... oh no no no.",
  "The SMELL!! I'm dying!!",
  "This is NOT okay!!",
  "Absolutely DISGUSTING.",
  "NOT NEAR ME!! NOT NEAR ME!!",
  "I'm going to be sick...",
  "HEALTH VIOLATION!!",
  "WHO RAISED YOU?!",
];

function drawPoops() {
  poops.forEach(p => {
    const px = p.x, py = p.y;
    // Stacked poop layers
    ctx.fillStyle = '#5a3010'; ctx.beginPath(); ctx.ellipse(px, py + 3, 6, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#6a3a14'; ctx.beginPath(); ctx.ellipse(px, py,     5, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#7a4418'; ctx.beginPath(); ctx.ellipse(px, py - 3, 4, 3.5, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a501c'; ctx.beginPath(); ctx.ellipse(px, py - 6, 3, 3,   0, 0, Math.PI * 2); ctx.fill();
    // Shine
    ctx.fillStyle = 'rgba(255,200,100,0.2)';
    ctx.beginPath(); ctx.ellipse(px - 1, py - 7, 1.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
    // Stink lines
    ctx.strokeStyle = 'rgba(100,60,20,0.35)';
    ctx.lineWidth = 0.8;
    [[-5, -9], [0, -11], [5, -9]].forEach(([ox, oy]) => {
      ctx.beginPath();
      ctx.moveTo(px + ox, py + oy);
      ctx.quadraticCurveTo(px + ox + 2, py + oy - 4, px + ox, py + oy - 7);
      ctx.stroke();
    });
    // Selection ring
    if (selectedPoop === p) {
      ctx.strokeStyle = '#f5c200';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 2]);
      ctx.beginPath(); ctx.arc(px, py - 2, 13, 0, Math.PI * 2); ctx.stroke();
      ctx.setLineDash([]);
    }
  });
}

function cleanBtnRect(poop) {
  let bx = poop.x + 16;
  if (bx + 42 > W - 2) bx = poop.x - 58;
  return { x: bx, y: poop.y - 22, w: 42, h: 13 };
}

function drawPoopPanel() {
  if (!selectedPoop) return;
  const r = cleanBtnRect(selectedPoop);
  ctx.fillStyle = 'rgba(30,10,0,0.92)';
  roundRect(r.x, r.y, r.w, r.h, 3);
  ctx.fill();
  ctx.strokeStyle = '#f5c200';
  ctx.lineWidth = 1;
  roundRect(r.x, r.y, r.w, r.h, 3);
  ctx.stroke();
  ctx.fillStyle = '#f5c200';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('CLEAN', r.x + r.w / 2, r.y + 9);
}

function poopAtPoint(cx, cy) {
  return poops.find(p => Math.hypot(p.x - cx, p.y - cy) < 12) || null;
}

// ── Bathroom bee AI ────────────────────────────────────────────────────────
function updateBathroomBee(b, dt) {
  switch (b.bathroomState) {
    case 'seeking': {
      // Re-find a bathroom if we don't have one or ours just filled up
      if (!b._targetBath || bathroomFull(b._targetBath)) {
        b._targetBath = findAvailableBathroom();
        if (!b._targetBath) {
          // All full — stand and wait (need keeps rising, may poop)
          b.vx *= 0.85; b.vy *= 0.85;
          break;
        }
        b.tx = b._targetBath.x + BATHROOM_W / 2;
        b.ty = b._targetBath.y + BATHROOM_H + 6;
      }
      const dx = b.tx - b.x, dy = b.ty - b.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d > 4) {
        b.vx += (dx / d * b.speed - b.vx) * 8 * dt;
        b.vy += (dy / d * b.speed - b.vy) * 8 * dt;
        b.x  += b.vx * dt; b.y += b.vy * dt;
        b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      } else {
        b.vx = 0; b.vy = 0;
        if (b._targetBath && !bathroomFull(b._targetBath)) {
          b._targetBath.occupants.push(b);
          b._assignedBath  = b._targetBath;
          b._targetBath    = null;
          b.bathroomState  = 'in_bathroom';
          b.bathroomTimer  = 4 + Math.random() * 8;
        } else {
          b._targetBath = null; // race condition — retry next frame
        }
      }
      break;
    }
    case 'in_bathroom': {
      b.vx = 0; b.vy = 0;
      b.bathroomTimer -= dt;
      if (b.bathroomTimer <= 0) {
        if (b._assignedBath) {
          b._assignedBath.occupants = b._assignedBath.occupants.filter(o => o !== b);
          b._assignedBath = null;
        }
        b.needs.bathroom = 4 + Math.random() * 8;
        b.bathroomState  = null;
        pickTarget(b);
      }
      break;
    }
  }
}

// ── Cleanup bee AI ─────────────────────────────────────────────────────────
function updateCleanupBee(b, dt) {
  if (!b.cleanupTarget || !poops.includes(b.cleanupTarget)) {
    b.cleanupState  = null;
    b.cleanupTarget = null;
    return;
  }
  const p  = b.cleanupTarget;
  const dx = p.x - b.x, dy = p.y - b.y;
  const d  = Math.sqrt(dx * dx + dy * dy);
  if (d > 6) {
    b.vx += (dx / d * b.speed - b.vx) * 8 * dt;
    b.vy += (dy / d * b.speed - b.vy) * 8 * dt;
    b.x  += b.vx * dt; b.y += b.vy * dt;
    b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  } else {
    b.vx = 0; b.vy = 0;
    const idx = poops.indexOf(p);
    if (idx >= 0) poops.splice(idx, 1);
    if (selectedPoop === p) selectedPoop = null;
    b.cleanupState  = null;
    b.cleanupTarget = null;
    b.speech = { text: 'All cleaned up!', timer: 2.5, dur: 2.5 };
    pickTarget(b);
  }
}
