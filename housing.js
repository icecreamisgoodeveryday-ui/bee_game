// ── Honeycomb Housing constants ────────────────────────────────────────────
const HOUSING_W             = 96;
const HOUSING_H             = 68;
const HOUSING_COST          = 80;
const HOUSING_BUILD_TIME    = 25;
const HOUSING_BUILDER_COUNT = 2;
const HOUSING_LIMIT         = 2;
const HOUSING_CAPACITY      = 5;

const HOUSING_EXIT_BTN  = { x: 4, y: 4, w: 36, h: 12 };
const HOUSING_RENT       = 150;

const housings    = [];
let insideHousing      = null;
let selectedHousingCell = null;

function housingCount() {
  return housings.length + buildSites.filter(s => s.type === 'housing').length;
}

function makeHousing(x, y) { return { x, y, residents: [] }; }

// ── Hex drawing (pointy-top) ───────────────────────────────────────────────
function drawHex(cx, cy, r, fillColor, strokeColor, lw) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (Math.PI / 3) * i;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  if (fillColor)  { ctx.fillStyle   = fillColor;  ctx.fill();  }
  if (strokeColor){ ctx.strokeStyle = strokeColor; ctx.lineWidth = lw || 1.5; ctx.stroke(); }
}

// ── Interior cell layout ───────────────────────────────────────────────────
const HEX_R     = 44;
const HEX_CELLS = [
  { x: 164, y: 102 },
  { x: 240, y: 102 },
  { x: 316, y: 102 },
  { x: 202, y: 168 },
  { x: 278, y: 168 },
];

// ── Top-down exterior ──────────────────────────────────────────────────────
function drawHexSmall(cx, cy, r, fill, stroke, lw) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = -Math.PI / 2 + (Math.PI / 3) * i;
    if (i === 0) ctx.moveTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
    else         ctx.lineTo(cx + r * Math.cos(a), cy + r * Math.sin(a));
  }
  ctx.closePath();
  if (fill)  { ctx.fillStyle   = fill;   ctx.fill();  }
  if (stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw || 0.8; ctx.stroke(); }
}

function drawHousing(h) {
  const { x, y } = h;

  // Ground shadow
  ctx.fillStyle = 'rgba(0,0,0,0.28)';
  ctx.fillRect(x + 3, y + HOUSING_H, HOUSING_W, 5);

  // Building body
  ctx.fillStyle = '#b86010';
  ctx.fillRect(x, y, HOUSING_W, HOUSING_H);

  // Wall surface
  ctx.fillStyle = '#d07818';
  ctx.fillRect(x + 2, y + 16, HOUSING_W - 4, HOUSING_H - 18);

  // Roof strip
  ctx.fillStyle = '#884006';
  ctx.fillRect(x, y, HOUSING_W, 16);

  // Roof hex row
  [x+14, x+30, x+48, x+66, x+82].forEach(hx => {
    drawHexSmall(hx, y + 8, 6, '#f0b820', '#4a2000', 0.7);
  });

  // Facade hex windows (4 top row, 3 bottom row — staggered honeycomb)
  [
    [x+16, y+30], [x+37, y+30], [x+58, y+30], [x+79, y+30],
                  [x+27, y+47], [x+48, y+47], [x+69, y+47],
  ].forEach(([wx, wy]) => {
    drawHexSmall(wx, wy, 8,   '#ffd840', '#7a3e00', 0.8);
    drawHexSmall(wx, wy, 8-3, null,      'rgba(255,255,180,0.25)', 0.5);
  });

  // Label
  ctx.fillStyle = '#3a1400';
  ctx.font = 'bold 5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HONEYCOMB', x + HOUSING_W / 2, y + HOUSING_H - 9);
  ctx.fillText('HOUSING',   x + HOUSING_W / 2, y + HOUSING_H - 3);

  // Outline
  ctx.strokeStyle = '#4a2000';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, HOUSING_W, HOUSING_H);
}

function drawHousings() { housings.forEach(drawHousing); }

function drawHousingGhost(x, y, valid) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = valid ? '#f0a020' : '#ff4040';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, HOUSING_W, HOUSING_H);
  ctx.setLineDash([]);
  ctx.fillStyle = valid ? 'rgba(240,160,32,0.07)' : 'rgba(255,60,60,0.14)';
  ctx.fillRect(x, y, HOUSING_W, HOUSING_H);
  ctx.restore();
}

// ── Overlap helpers ────────────────────────────────────────────────────────
function housingOverlaps(hx, hy) {
  const PAD = 8;
  if (housings.some(h =>
    !(hx + HOUSING_W + PAD < h.x || hx > h.x + HOUSING_W + PAD ||
      hy + HOUSING_H + PAD < h.y || hy > h.y + HOUSING_H + PAD)
  )) return true;
  const fw = FARM_W + BIN_GAP + BIN_W;
  if (farms.some(f =>
    !(hx + HOUSING_W + PAD < f.x || hx > f.x + fw + PAD ||
      hy + HOUSING_H + PAD < f.y || hy > f.y + FARM_H + PAD)
  )) return true;
  if (banks.some(b =>
    !(hx + HOUSING_W + PAD < b.x || hx > b.x + BANK_W + PAD ||
      hy + HOUSING_H + PAD < b.y || hy > b.y + BANK_H + PAD)
  )) return true;
  if (bathrooms.some(bth =>
    !(hx + HOUSING_W + PAD < bth.x || hx > bth.x + BATHROOM_W + PAD ||
      hy + HOUSING_H + PAD < bth.y || hy > bth.y + BATHROOM_H + PAD)
  )) return true;
  return buildSites.some(s => {
    const sw = s.type === 'farm' ? fw : s.type === 'bank' ? BANK_W :
               s.type === 'bathroom' ? BATHROOM_W : HOUSING_W;
    const sh = s.type === 'farm' ? FARM_H : s.type === 'bank' ? BANK_H :
               s.type === 'bathroom' ? BATHROOM_H : HOUSING_H;
    const sx = s.x - sw / 2, sy = s.y - sh / 2;
    return !(hx + HOUSING_W + PAD < sx || hx > sx + sw + PAD ||
             hy + HOUSING_H + PAD < sy || hy > sy + sh + PAD);
  });
}

function isBlockedByHousing(x, y, pad) {
  pad = pad || 0;
  return housings.some(h =>
    x >= h.x - pad && x <= h.x + HOUSING_W + pad &&
    y >= h.y - pad && y <= h.y + HOUSING_H + pad
  );
}

function housingAtPoint(cx, cy) {
  return housings.find(h =>
    cx >= h.x && cx <= h.x + HOUSING_W &&
    cy >= h.y && cy <= h.y + HOUSING_H
  ) || null;
}

// ── Tenant helpers ────────────────────────────────────────────────────────
function beeHasHousing(b) {
  return housings.some(h => h.residents.includes(b));
}

function eligibleTenants() {
  return npcs.filter(b => !beeHasHousing(b) && b.beebucks >= HOUSING_RENT);
}

const TENANT_PX = 362, TENANT_PY = 24, TENANT_PW = 114;

function tenantBeeRects(eligible) {
  return eligible.map((b, i) => ({
    bee: b,
    x: TENANT_PX + 4,
    y: TENANT_PY + 28 + i * 16,
    w: TENANT_PW - 8,
    h: 13,
  }));
}

function tenantCancelRect(eligible) {
  return {
    x: TENANT_PX + 4,
    y: TENANT_PY + 28 + Math.max(1, eligible.length) * 16 + 2,
    w: TENANT_PW - 8,
    h: 12,
  };
}

// ── Panel UI ───────────────────────────────────────────────────────────────
const HOUSING_PANEL_W = 114;
const HOUSING_PANEL_H = 50;

function housingEnterBtnRect(h) {
  let px = h.x + HOUSING_W + 4;
  if (px + HOUSING_PANEL_W > W - 2) px = h.x - HOUSING_PANEL_W - 4;
  const py = h.y + (HOUSING_H - HOUSING_PANEL_H) / 2;
  return { x: px + 4, y: py + 32, w: HOUSING_PANEL_W - 8, h: 14 };
}

function drawHousingPanel(h) {
  let px = h.x + HOUSING_W + 4;
  if (px + HOUSING_PANEL_W > W - 2) px = h.x - HOUSING_PANEL_W - 4;
  const py = h.y + (HOUSING_H - HOUSING_PANEL_H) / 2;

  ctx.fillStyle = 'rgba(8,4,0,0.92)';
  roundRect(px, py, HOUSING_PANEL_W, HOUSING_PANEL_H, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(240,160,32,0.6)';
  ctx.lineWidth = 1;
  roundRect(px, py, HOUSING_PANEL_W, HOUSING_PANEL_H, 4);
  ctx.stroke();

  ctx.fillStyle = '#f0a020';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('HONEYCOMB HOUSING', px + 5, py + 11);

  const occ = h.residents.filter(Boolean).length;
  ctx.fillStyle = '#c09060';
  ctx.font = '6px monospace';
  ctx.fillText(`Residents: ${occ} / ${HOUSING_CAPACITY}`, px + 5, py + 23);

  const er = housingEnterBtnRect(h);
  ctx.fillStyle = 'rgba(20,8,0,0.9)';
  roundRect(er.x, er.y, er.w, er.h, 3);
  ctx.fill();
  ctx.strokeStyle = '#f0a020';
  ctx.lineWidth = 1;
  roundRect(er.x, er.y, er.w, er.h, 3);
  ctx.stroke();
  ctx.fillStyle = '#f0a020';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ENTER', er.x + er.w / 2, er.y + 9);
}

// ── Music ──────────────────────────────────────────────────────────────────
const _musicHousing = new Audio('sounds/[no copyright music]  bara time  cute vlog music.mp3');
_musicHousing.loop = true;
_musicHousing.volume = 0.5;
function startHousingMusic() { playMusic(_musicHousing); }

// ── Scene transitions ──────────────────────────────────────────────────────
function enterHousing(h) {
  fadeToBlackThen(() => {
    startHousingMusic();
    insideHousing = h;
  });
}

function exitHousing() {
  selectedHousingCell = null;
  fadeToBlackThen(() => {
    startCorrectOutdoorMusic();
    insideHousing = null;
  });
}

// ── Interior rendering ─────────────────────────────────────────────────────
function drawHousingInterior(h, t) {
  // Dark wax background
  ctx.fillStyle = '#120700';
  ctx.fillRect(0, 0, W, H);

  // Wax grain texture
  ctx.strokeStyle = 'rgba(60,30,0,0.1)';
  ctx.lineWidth = 0.4;
  for (let xi = 0; xi < W; xi += 10) {
    ctx.beginPath();
    ctx.moveTo(xi, 0);
    ctx.lineTo(xi + 5, H);
    ctx.stroke();
  }

  // Title
  ctx.fillStyle = '#f0a020';
  ctx.font = 'bold 8px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HONEYCOMB HOUSING', W / 2, 18);

  ctx.strokeStyle = 'rgba(240,160,32,0.22)';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(28, 24); ctx.lineTo(W - 28, 24);
  ctx.stroke();

  // 5 hex cells
  HEX_CELLS.forEach((cell, i) => {
    const resident   = h.residents[i] || null;
    const isSelected = selectedHousingCell === i;

    drawHex(cell.x, cell.y, HEX_R + 5, '#3a1800', null, 0);
    drawHex(cell.x, cell.y, HEX_R + 2, null, isSelected ? '#f0e040' : '#6a3206', 2);
    drawHex(cell.x, cell.y, HEX_R, '#c06808', null, 0);
    drawHex(cell.x, cell.y, HEX_R - 7, '#d87a14', null, 0);
    drawHex(cell.x, cell.y, HEX_R, null, isSelected ? '#fff080' : '#f0a020', isSelected ? 2.5 : 1.5);
    drawHex(cell.x, cell.y, HEX_R - 10, null, 'rgba(255,200,80,0.12)', 0.7);

    ctx.textAlign = 'center';
    if (resident) {
      ctx.fillStyle = '#f0a020';
      ctx.font = 'bold 7px monospace';
      ctx.fillText(resident.name, cell.x, cell.y + 3);
      ctx.fillStyle = '#8bc34a';
      ctx.font = '5px monospace';
      ctx.fillText('RESIDENT', cell.x, cell.y + 13);
    } else {
      const signW = 48, signH = 20;
      const signX = cell.x - signW / 2;
      const signY = cell.y - 16;
      ctx.fillStyle = '#7a3e00';
      ctx.fillRect(cell.x - 1, signY + signH, 2, 12);
      ctx.fillStyle = '#f5e060';
      ctx.fillRect(signX, signY, signW, signH);
      ctx.strokeStyle = '#8a5200';
      ctx.lineWidth = 1;
      ctx.strokeRect(signX, signY, signW, signH);
      ctx.fillStyle = '#6a2000';
      ctx.font = 'bold 6px monospace';
      ctx.fillText('FOR SALE', cell.x, signY + 8.5);
      ctx.font = '5px monospace';
      ctx.fillText(`$${HOUSING_RENT}/mo`, cell.x, signY + 16);
    }
  });

  // Floor line
  ctx.strokeStyle = 'rgba(240,160,32,0.18)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(20, H - 18); ctx.lineTo(W - 20, H - 18);
  ctx.stroke();

  // EXIT button
  ctx.fillStyle = 'rgba(8,4,0,0.92)';
  roundRect(HOUSING_EXIT_BTN.x, HOUSING_EXIT_BTN.y,
            HOUSING_EXIT_BTN.w, HOUSING_EXIT_BTN.h, 3);
  ctx.fill();
  ctx.strokeStyle = '#f0a020';
  ctx.lineWidth = 1;
  roundRect(HOUSING_EXIT_BTN.x, HOUSING_EXIT_BTN.y,
            HOUSING_EXIT_BTN.w, HOUSING_EXIT_BTN.h, 3);
  ctx.stroke();
  ctx.fillStyle = '#f0a020';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT',
    HOUSING_EXIT_BTN.x + HOUSING_EXIT_BTN.w / 2,
    HOUSING_EXIT_BTN.y + 9);

  if (selectedHousingCell !== null) {
    const eligible = eligibleTenants();
    const numRows  = Math.max(1, eligible.length);
    const ph = 30 + numRows * 16 + 18;

    ctx.fillStyle = 'rgba(8,4,0,0.97)';
    roundRect(TENANT_PX, TENANT_PY, TENANT_PW, ph, 4);
    ctx.fill();
    ctx.strokeStyle = '#f0a020';
    ctx.lineWidth = 1;
    roundRect(TENANT_PX, TENANT_PY, TENANT_PW, ph, 4);
    ctx.stroke();

    ctx.fillStyle = '#f0a020';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('MOVE IN?', TENANT_PX + TENANT_PW / 2, TENANT_PY + 11);
    ctx.fillStyle = '#c09060';
    ctx.font = '5px monospace';
    ctx.fillText(`$${HOUSING_RENT}/mo rent`, TENANT_PX + TENANT_PW / 2, TENANT_PY + 21);

    if (eligible.length === 0) {
      ctx.fillStyle = '#888';
      ctx.font = '6px monospace';
      ctx.fillText('No bees available', TENANT_PX + TENANT_PW / 2, TENANT_PY + 40);
      ctx.fillText('(need $150+)', TENANT_PX + TENANT_PW / 2, TENANT_PY + 52);
    } else {
      tenantBeeRects(eligible).forEach(r => {
        ctx.fillStyle = 'rgba(20,10,0,0.8)';
        roundRect(r.x, r.y, r.w, r.h, 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(240,160,32,0.4)';
        ctx.lineWidth = 0.7;
        roundRect(r.x, r.y, r.w, r.h, 2);
        ctx.stroke();
        ctx.fillStyle = '#f0c060';
        ctx.font = '6px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(r.bee.name, r.x + 4, r.y + 9);
        ctx.fillStyle = '#f5c200';
        ctx.textAlign = 'right';
        ctx.fillText(`$${Math.floor(r.bee.beebucks)}`, r.x + r.w - 3, r.y + 9);
      });
    }

    const cr = tenantCancelRect(eligible);
    ctx.fillStyle = 'rgba(20,5,0,0.9)';
    roundRect(cr.x, cr.y, cr.w, cr.h, 2);
    ctx.fill();
    ctx.strokeStyle = '#804020';
    ctx.lineWidth = 0.7;
    roundRect(cr.x, cr.y, cr.w, cr.h, 2);
    ctx.stroke();
    ctx.fillStyle = '#c06030';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CANCEL', cr.x + cr.w / 2, cr.y + 8.5);
  }
}
