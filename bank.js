// ── Bank constants ─────────────────────────────────────────────────────────
const BANK_W = 84;
const BANK_H = 60;
const BANK_COST = 75;
const BANK_BUILD_TIME = 28;
const BANK_BUILDER_COUNT = 2;
const BANK_LIMIT = 1;

const banks = [];

function bankCount() {
  return banks.length + buildSites.filter(s => s.type === 'bank').length;
}

function makeBank(x, y) { return { x, y }; }

function bankHasBanker(bank) {
  return npcs.some(b => b.job === 'banker' && b.assignedBank === bank);
}

function getBanker(bank) {
  return npcs.find(b => b.job === 'banker' && b.assignedBank === bank) || null;
}

// ── Top-down bank drawing ──────────────────────────────────────────────────
function drawBank(bank) {
  const { x, y } = bank;
  const mx = x + BANK_W / 2;

  // Building body
  ctx.fillStyle = '#d8ccaa';
  ctx.fillRect(x, y, BANK_W, BANK_H);

  // Pediment (roof peak strip)
  ctx.fillStyle = '#b0a078';
  ctx.fillRect(x, y, BANK_W, 16);

  // Pediment triangle
  ctx.fillStyle = '#c0b088';
  ctx.beginPath();
  ctx.moveTo(x + 6, y + 16);
  ctx.lineTo(mx, y + 5);
  ctx.lineTo(x + BANK_W - 6, y + 16);
  ctx.closePath();
  ctx.fill();

  // Gold trim below pediment
  ctx.fillStyle = '#c8a030';
  ctx.fillRect(x + 2, y + 16, BANK_W - 4, 2);

  // Six columns (top-down rectangles)
  ctx.fillStyle = '#f0e8d0';
  [x + 7, x + 20, x + 33, x + 46, x + 59, x + 72].forEach(cx => {
    ctx.fillRect(cx, y + 18, 5, BANK_H - 20);
    ctx.fillStyle = '#e0d8c0';
    ctx.fillRect(cx - 1, y + BANK_H - 6, 7, 6);
    ctx.fillStyle = '#f0e8d0';
  });

  // Double door (center)
  ctx.fillStyle = '#5a3a10';
  ctx.fillRect(mx - 11, y + BANK_H - 20, 22, 20);
  // Door split
  ctx.strokeStyle = '#3e2408';
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(mx, y + BANK_H - 20); ctx.lineTo(mx, y + BANK_H);
  ctx.stroke();
  // Handles
  ctx.fillStyle = '#c8a030';
  ctx.beginPath(); ctx.arc(mx - 5, y + BANK_H - 10, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(mx + 5, y + BANK_H - 10, 1.8, 0, Math.PI * 2); ctx.fill();

  // Sign
  ctx.fillStyle = '#2a1800';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BEE BANK', mx, y + 12);

  // Border
  ctx.strokeStyle = '#8a7a50';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, BANK_W, BANK_H);
}

function drawBanks() { banks.forEach(drawBank); }

function drawBankGhost(x, y, valid) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = valid ? '#f5c200' : '#ff4040';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, BANK_W, BANK_H);
  ctx.setLineDash([]);
  ctx.fillStyle = valid ? 'rgba(245,194,0,0.07)' : 'rgba(255,60,60,0.14)';
  ctx.fillRect(x, y, BANK_W, BANK_H);
  ctx.restore();
}

// ── Overlap / block helpers ────────────────────────────────────────────────
function bankOverlaps(bx, by) {
  const PAD = 8;
  if (banks.some(b =>
    !(bx + BANK_W + PAD < b.x || bx > b.x + BANK_W + PAD ||
      by + BANK_H + PAD < b.y || by > b.y + BANK_H + PAD)
  )) return true;
  // vs farms
  const fw = FARM_W + BIN_GAP + BIN_W;
  if (farms.some(f =>
    !(bx + BANK_W + PAD < f.x || bx > f.x + fw + PAD ||
      by + BANK_H + PAD < f.y || by > f.y + FARM_H + PAD)
  )) return true;
  // vs bathrooms
  if (typeof bathrooms !== 'undefined' && bathrooms.some(bth =>
    !(bx + BANK_W + PAD < bth.x || bx > bth.x + BATHROOM_W + PAD ||
      by + BANK_H + PAD < bth.y || by > bth.y + BATHROOM_H + PAD)
  )) return true;
  // vs housing
  if (typeof housings !== 'undefined' && housings.some(h =>
    !(bx + BANK_W + PAD < h.x || bx > h.x + HOUSING_W + PAD ||
      by + BANK_H + PAD < h.y || by > h.y + HOUSING_H + PAD)
  )) return true;
  // vs build sites
  return buildSites.some(s => {
    const sw = s.type === 'farm' ? fw : s.type === 'bank' ? BANK_W : BATHROOM_W;
    const sh = s.type === 'farm' ? FARM_H : s.type === 'bank' ? BANK_H : BATHROOM_H;
    const sx = s.x - sw / 2, sy = s.y - sh / 2;
    return !(bx + BANK_W + PAD < sx || bx > sx + sw + PAD ||
             by + BANK_H + PAD < sy || by > sy + sh + PAD);
  });
}

function isBlockedByBank(x, y, pad) {
  pad = pad || 0;
  return banks.some(b =>
    x >= b.x - pad && x <= b.x + BANK_W + pad &&
    y >= b.y - pad && y <= b.y + BANK_H + pad
  );
}

function bankAtPoint(cx, cy) {
  return banks.find(b =>
    cx >= b.x && cx <= b.x + BANK_W && cy >= b.y && cy <= b.y + BANK_H
  ) || null;
}

// ── Bank click panel (top-down) ────────────────────────────────────────────
let selectedBank = null;

function enterBtnRect(bank) {
  let bx = bank.x + BANK_W + 5;
  if (bx + 42 > W - 2) bx = bank.x - 47;
  return { x: bx, y: bank.y + 5, w: 42, h: 13 };
}

function drawBankPanel(bank) {
  ctx.save();
  ctx.strokeStyle = '#f5c200';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.strokeRect(bank.x - 2, bank.y - 2, BANK_W + 4, BANK_H + 4);
  ctx.setLineDash([]);
  ctx.restore();

  // ENTER button
  const er = enterBtnRect(bank);
  ctx.fillStyle = 'rgba(0,10,20,0.9)';
  roundRect(er.x, er.y, er.w, er.h, 3);
  ctx.fill();
  ctx.strokeStyle = '#70c8e8';
  ctx.lineWidth = 1;
  roundRect(er.x, er.y, er.w, er.h, 3);
  ctx.stroke();
  ctx.fillStyle = '#70c8e8';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('ENTER', er.x + er.w / 2, er.y + 9);

  // Banker status (read-only)
  const banker = getBanker(bank);
  const sx = er.x, sy = er.y + er.h + 7;
  ctx.textAlign = 'left';
  if (banker) {
    ctx.fillStyle = '#5ad87a';
    ctx.font = '5.5px monospace';
    const shortName = banker.name.length > 10 ? banker.name.slice(0, 9) + '.' : banker.name;
    ctx.fillText(shortName, sx, sy + 5);
    ctx.font = 'bold 5px monospace';
    ctx.fillStyle = '#3aa858';
    ctx.fillText('BANKER', sx, sy + 12);
  } else {
    ctx.fillStyle = '#666';
    ctx.font = 'italic 6px monospace';
    ctx.fillText('no banker', sx, sy + 7);
    ctx.fillStyle = '#444';
    ctx.font = '5px monospace';
    ctx.fillText('(hire via bee)', sx, sy + 14);
  }
}

// ── Music ──────────────────────────────────────────────────────────────────
const _musicOutdoor = new Audio('sounds/[no copyright music]  coffee time  cute vlog music.mp3');
_musicOutdoor.loop = true;
_musicOutdoor.volume = 0.5;

const _musicBank = new Audio('sounds/High quality, royalty free_ elevator music..mp3');
_musicBank.loop = true;
_musicBank.volume = 0.5;

let _currentMusic = null;

function playMusic(track) {
  if (_currentMusic === track) return;
  if (_currentMusic) { _currentMusic.pause(); _currentMusic.currentTime = 0; }
  _currentMusic = track;
  if (track) track.play().catch(() => {});
}

function startOutdoorMusic() { playMusic(_musicOutdoor); }
function startBankMusic()    { playMusic(_musicBank); }

// ── Fade / scene transition ────────────────────────────────────────────────
let _fadeAlpha = 0;
let _fadeDelta = 0;
let _onFadeBlack = null;

function updateFade(dt) {
  if (_fadeDelta === 0 && _fadeAlpha === 0) return;
  _fadeAlpha += _fadeDelta * dt;
  if (_fadeAlpha >= 1) {
    _fadeAlpha = 1;
    _fadeDelta = 0;
    if (_onFadeBlack) { _onFadeBlack(); _onFadeBlack = null; }
  }
  if (_fadeAlpha <= 0) {
    _fadeAlpha = 0;
    _fadeDelta = 0;
  }
}

function drawFadeOverlay() {
  if (_fadeAlpha <= 0) return;
  ctx.fillStyle = `rgba(0,0,0,${_fadeAlpha})`;
  ctx.fillRect(0, 0, W, H);
}

function fadeToBlackThen(onBlack) {
  _fadeAlpha = 0;
  _fadeDelta = 5; // fast fade in
  _onFadeBlack = () => {
    onBlack();
    _fadeDelta = -2; // slower fade out
  };
}

// ── Interior scene state ───────────────────────────────────────────────────
let insideBank = false;
let enteredBank = null;

// EXIT button rect (interior) — positioned on the door
const EXIT_BTN = { x: 22, y: H / 2 - 8, w: 36, h: 13 };

function enterBank(bank) {
  enteredBank = bank;
  fadeToBlackThen(() => { insideBank = true; startBankMusic(); });
}

function exitBank() {
  fadeToBlackThen(() => { insideBank = false; enteredBank = null; startCorrectOutdoorMusic(); });
}

// ── Bank interior (side-view) ──────────────────────────────────────────────
function drawBankInterior(t) {
  // Wall
  ctx.fillStyle = '#f0ebe0';
  ctx.fillRect(0, 0, W, H);

  // Subtle honeycomb wallpaper
  ctx.strokeStyle = 'rgba(200,160,40,0.12)';
  ctx.lineWidth = 0.8;
  const hR = 10;
  for (let hy = -hR; hy < H; hy += hR * 1.73) {
    for (let hx = -hR; hx < W; hx += hR * 3) {
      for (let col = 0; col < 2; col++) {
        const ox = hx + col * hR * 1.5;
        const oy = hy + col * hR * 0.865;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2 - Math.PI / 6;
          const px = ox + Math.cos(a) * hR, py = oy + Math.sin(a) * hR;
          i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
  }

  // Ceiling
  ctx.fillStyle = '#ddd8cc';
  ctx.fillRect(0, 0, W, 30);

  // Crown molding
  ctx.fillStyle = '#c8a030';
  ctx.fillRect(0, 28, W, 3);

  // "BEE NATIONAL BANK" sign
  ctx.fillStyle = '#2a1800';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BEE NATIONAL BANK', W / 2, 20);
  ctx.strokeStyle = '#c8a030';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(60, 24);  ctx.lineTo(W / 2 - 105, 24);
  ctx.moveTo(W / 2 + 105, 24); ctx.lineTo(W - 60, 24);
  ctx.stroke();

  // Floor
  const floorY = H - 52;
  ctx.fillStyle = '#9a7850';
  ctx.fillRect(0, floorY, W, H - floorY);
  // Floorboards
  ctx.strokeStyle = '#7a5a30';
  ctx.lineWidth = 0.8;
  for (let x = 0; x < W; x += 28) {
    ctx.beginPath(); ctx.moveTo(x, floorY); ctx.lineTo(x, H); ctx.stroke();
  }
  ctx.strokeStyle = '#8a6a40';
  ctx.lineWidth = 0.5;
  ctx.beginPath(); ctx.moveTo(0, floorY + 26); ctx.lineTo(W, floorY + 26); ctx.stroke();

  // Base molding
  ctx.fillStyle = '#c8a030';
  ctx.fillRect(0, floorY - 3, W, 3);

  // ── ENTRANCE DOOR (left) ──
  const dX = 22, dY = 60, dW = 38;
  const dH = floorY - dY;
  // Frame
  ctx.fillStyle = '#5a3a18';
  ctx.fillRect(dX - 4, dY - 4, dW + 8, dH + 4);
  // Door panel
  ctx.fillStyle = '#8a5a28';
  ctx.fillRect(dX, dY, dW, dH);
  // Panel insets
  ctx.strokeStyle = '#5a3a18';
  ctx.lineWidth = 1;
  const panH = (dH - 16) / 2;
  ctx.strokeRect(dX + 5, dY + 5, dW - 10, panH);
  ctx.strokeRect(dX + 5, dY + 5 + panH + 6, dW - 10, panH);
  // Handle
  ctx.fillStyle = '#c8a030';
  ctx.beginPath();
  ctx.arc(dX + dW - 8, dY + dH / 2, 3.5, 0, Math.PI * 2);
  ctx.fill();

  // EXIT button (overlaid on door)
  const exitHov = hitRect(mouse.x, mouse.y, EXIT_BTN);
  ctx.fillStyle = exitHov ? 'rgba(200,162,0,0.92)' : 'rgba(10,7,0,0.88)';
  roundRect(EXIT_BTN.x, EXIT_BTN.y, EXIT_BTN.w, EXIT_BTN.h, 3);
  ctx.fill();
  ctx.strokeStyle = '#f5c200';
  ctx.lineWidth = 1;
  roundRect(EXIT_BTN.x, EXIT_BTN.y, EXIT_BTN.w, EXIT_BTN.h, 3);
  ctx.stroke();
  ctx.fillStyle = exitHov ? '#1a1000' : '#f5c200';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('EXIT', EXIT_BTN.x + EXIT_BTN.w / 2, EXIT_BTN.y + 9);

  // ── POTTED PLANT (left of counter) ──
  const pX = 96, pY = floorY;
  ctx.fillStyle = '#6a4e28';
  ctx.fillRect(pX - 9, pY - 14, 18, 14);
  ctx.fillStyle = '#4a3018';
  ctx.fillRect(pX - 7, pY, 14, 3);
  ctx.fillStyle = '#3a7a18';
  ctx.beginPath(); ctx.ellipse(pX, pY - 22, 11, 9, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(pX - 9, pY - 28, 8, 6, -0.5, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.ellipse(pX + 9, pY - 28, 8, 6, 0.5, 0, Math.PI * 2); ctx.fill();

  // ── BANKER COUNTER (center) ──
  const cL = 145, cR = 355, cTop = 70, cBot = floorY;
  const interiorBanker = enteredBank ? getBanker(enteredBank) : null;
  // Back panel
  ctx.fillStyle = '#6a4a20';
  ctx.fillRect(cL, cTop, cR - cL, cBot - cTop - 32);
  // Draw banker bee behind the bars (before bars so bars render in front)
  if (interiorBanker) {
    ctx.save();
    ctx.translate((cL + cR) / 2, cBot - 70);
    ctx.scale(1.5, 1.5);
    drawBeeTop(0, 0, Math.PI, t, 0.85);
    ctx.restore();
  }
  // Bars on window
  ctx.strokeStyle = '#c8a030';
  ctx.lineWidth = 1.5;
  for (let bx = cL + 14; bx < cR - 8; bx += 17) {
    ctx.beginPath(); ctx.moveTo(bx, cTop); ctx.lineTo(bx, cBot - 38); ctx.stroke();
  }
  // Horizontal bar
  ctx.beginPath(); ctx.moveTo(cL, cTop + 40); ctx.lineTo(cR, cTop + 40); ctx.stroke();
  // "BANKER" sign
  ctx.fillStyle = '#f5e870';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BANKER', (cL + cR) / 2, cTop + 26);
  // Banker name or VACANT status
  if (interiorBanker) {
    ctx.fillStyle = '#aef5a0';
    ctx.font = '7px monospace';
    ctx.fillText(interiorBanker.name, (cL + cR) / 2, cTop + 38);
  } else {
    ctx.fillStyle = '#888';
    ctx.font = 'italic 7px monospace';
    ctx.fillText('[ VACANT ]', (cL + cR) / 2, cTop + 38);
  }
  // Counter top surface
  ctx.fillStyle = '#c8a030';
  ctx.fillRect(cL - 6, cBot - 38, cR - cL + 12, 6);
  ctx.strokeStyle = '#8a6820';
  ctx.lineWidth = 1;
  ctx.strokeRect(cL - 6, cBot - 38, cR - cL + 12, 6);
  // Counter front face
  ctx.fillStyle = '#8a6030';
  ctx.fillRect(cL - 6, cBot - 32, cR - cL + 12, 32);

  // ── VAULT DOOR (right) ──
  const vX = W - 72, vY = 50, vW = 52, vH = floorY - 50;
  // Surround
  ctx.fillStyle = '#555';
  ctx.fillRect(vX - 5, vY - 5, vW + 10, vH + 5);
  // Face
  ctx.fillStyle = '#888';
  ctx.fillRect(vX, vY, vW, vH);
  // Raised panel ring
  ctx.strokeStyle = '#aaa';
  ctx.lineWidth = 2;
  ctx.strokeRect(vX + 5, vY + 5, vW - 10, vH - 10);
  // Wheel hub
  const whX = vX + vW / 2, whY = vY + vH / 2;
  ctx.beginPath(); ctx.arc(whX, whY, 20, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(whX, whY, 6, 0, Math.PI * 2); ctx.stroke();
  // Spokes (animated)
  const spk = t * 0.18;
  for (let i = 0; i < 4; i++) {
    const a = spk + i * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(whX + Math.cos(a) * 6, whY + Math.sin(a) * 6);
    ctx.lineTo(whX + Math.cos(a) * 20, whY + Math.sin(a) * 20);
    ctx.stroke();
  }
  ctx.fillStyle = '#999';
  ctx.font = 'bold 6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('VAULT', vX + vW / 2, vY + vH + 10);

  // ── CEILING LAMP ──
  const lX = W / 2 - 30;
  ctx.fillStyle = '#c8a030';
  ctx.fillRect(lX - 1, 28, 2, 14);
  ctx.fillStyle = '#f8f0a0';
  ctx.beginPath(); ctx.ellipse(lX, 48, 11, 6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#c8a030'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(lX, 48, 11, 6, 0, 0, Math.PI * 2); ctx.stroke();
  const grd = ctx.createRadialGradient(lX, 55, 0, lX, 55, 50);
  grd.addColorStop(0, 'rgba(248,240,160,0.14)');
  grd.addColorStop(1, 'rgba(248,240,160,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(lX - 50, 48, 100, 100);
}
