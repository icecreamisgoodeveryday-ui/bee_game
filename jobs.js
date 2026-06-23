let selectedBee     = null;
let showHireMenu    = false;
let showBuildMenu   = false;
let buildMode       = false;
let pendingBuild    = null;
let pickingFarm     = false;
let beeToAssign     = null;
let selectedHousing = null;
let cheatsEnabled   = false;

const BUILD_BTN  = { x: 4, y: H - 17, w: 40, h: 14 };
const CHEAT_BTN  = { x: 48, y: H - 17, w: 50, h: 14 };
const FARM_LIMIT = 2;
const FARM_COST  = 25;
const FARM_BUILD_TIME = 8;

// buildSites: { x, y, type, maxBuilders, buildTimer, totalBuildTime, assignedBuilders[] }
const buildSites = [];

function idleBuilderCount() {
  return npcs.filter(b => b.job === 'builder' && b.builderState === 'idle').length;
}

function farmCount() {
  return farms.length + buildSites.filter(s => s.type === 'farm').length;
}

// ── Helpers ────────────────────────────────────────────────────────────────
function farmHasFarmer(farm) {
  return npcs.some(b => b.job === 'farmer' && b.assignedFarm === farm);
}

function idleBuilder() {
  return npcs.find(b => b.job === 'builder' && b.builderState === 'idle') || null;
}

function assignFarmer(bee, farm) {
  bee.job = 'farmer';
  bee.assignedFarm = farm;
  bee.farmerState  = 'idle';
  bee.actionTimer  = 0;
  bee._ftarget     = null;
  bee.tx = bee.x;
  bee.ty = bee.y;
}

function assignBanker(bee, bank) {
  bee.job = 'banker';
  bee.assignedBank = bank;
  bee.bankerState = 'walking_to_bank';
  bee.actionTimer = 0;
  bee.tx = bank.x + BANK_W / 2;
  bee.ty = bank.y + BANK_H + 4;
}

function hitRect(cx, cy, r) {
  return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
}

// ── Farmer AI ──────────────────────────────────────────────────────────────
function updateFarmer(b, dt) {
  if (b.speech) { b.vx *= Math.pow(0.05, dt); b.vy *= Math.pow(0.05, dt); return; }
  const dx = b.tx - b.x, dy = b.ty - b.y;
  const d  = Math.sqrt(dx * dx + dy * dy);
  if (d > 3) {
    b.vx += (dx / d * b.speed - b.vx) * 8 * dt;
    b.vy += (dy / d * b.speed - b.vy) * 8 * dt;
    b.x  += b.vx * dt;
    b.y  += b.vy * dt;
    b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  } else { b.vx *= 0.7; b.vy *= 0.7; }

  if (b.actionTimer > 0) { b.actionTimer -= dt; return; }

  const farm = b.assignedFarm;
  if (!farm) return;

  switch (b.farmerState) {
    case 'idle': {
      const rp = readyPlot(farm);
      if (rp) {
        rp.claimed = true;
        b._ftarget = { farm, crop: rp };
        b.farmerState = 'going_harvest';
        const p = cropWorldPos(farm, rp);
        b.tx = p.x; b.ty = p.y;
        break;
      }
      const fp = freePlot(farm);
      if (fp) {
        fp.claimed = true;
        b._ftarget = { farm, crop: fp };
        b.farmerState = 'going_plant';
        const p = cropWorldPos(farm, fp);
        b.tx = p.x; b.ty = p.y;
        break;
      }
      b.tx = farm.x + FARM_W / 2 + (Math.random() - 0.5) * 24;
      b.ty = farm.y + FARM_H + 12 + Math.random() * 10;
      b.actionTimer = 1.5;
      break;
    }
    case 'going_plant': {
      const p = cropWorldPos(b._ftarget.farm, b._ftarget.crop);
      if (Math.hypot(b.x - p.x, b.y - p.y) < 7) {
        b._ftarget.crop.stage = 1;
        b._ftarget.crop.timer = 10;
        b._ftarget.crop.claimed = false;
        b._ftarget = null;
        b.farmerState = 'idle';
        b.actionTimer = 0.5;
      }
      break;
    }
    case 'going_harvest': {
      const p = cropWorldPos(b._ftarget.farm, b._ftarget.crop);
      if (Math.hypot(b.x - p.x, b.y - p.y) < 7) {
        b._ftarget.crop.stage = 0;
        b._ftarget.crop.claimed = false;
        b._ftarget.farm.bin.amount++;
        b.beebucks += 5;
        b._ftarget = null;
        b.farmerState = 'idle';
        b.actionTimer = 0.3;
      }
      break;
    }
  }
}

// ── Builder AI ─────────────────────────────────────────────────────────────
function updateBuilder(b, dt) {
  if (b.speech) { b.vx *= Math.pow(0.05, dt); b.vy *= Math.pow(0.05, dt); return; }

  const dx = b.tx - b.x, dy = b.ty - b.y;
  const d  = Math.sqrt(dx * dx + dy * dy);
  if (d > 3 && b.builderState !== 'at_site' && b.builderState !== 'building') {
    b.vx += (dx / d * b.speed - b.vx) * 8 * dt;
    b.vy += (dy / d * b.speed - b.vy) * 8 * dt;
    b.x  += b.vx * dt;
    b.y  += b.vy * dt;
    b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  } else { b.vx *= 0.75; b.vy *= 0.75; }

  if (b.actionTimer > 0) { b.actionTimer -= dt; return; }

  switch (b.builderState) {
    case 'idle': {
      const site = buildSites.find(s =>
        s.assignedBuilders.length < s.maxBuilders && !s.assignedBuilders.includes(b)
      );
      if (site) {
        site.assignedBuilders.push(b);
        b.builderTarget = site;
        b.builderState  = 'going_to_site';
        const idx    = site.assignedBuilders.length - 1;
        const offset = site.maxBuilders > 1 ? (idx - 0.5) * 10 : 0;
        b.tx = site.x + offset; b.ty = site.y;
      } else {
        pickTarget(b);
        b.actionTimer = 2;
      }
      break;
    }
    case 'going_to_site': {
      const site = b.builderTarget;
      if (!site || !buildSites.includes(site)) {
        b.builderState = 'idle'; b.builderTarget = null; break;
      }
      if (Math.hypot(b.x - b.tx, b.y - b.ty) < 8) {
        b.builderState = 'at_site';
      }
      break;
    }
    case 'at_site':
    case 'building': {
      b.vx *= 0.8; b.vy *= 0.8;
      if (!b.builderTarget || !buildSites.includes(b.builderTarget)) {
        b.builderState = 'idle'; b.builderTarget = null;
      }
      break;
    }
  }
}

// ── Banker AI ──────────────────────────────────────────────────────────────
function updateBanker(b, dt) {
  if (b.bankerState === 'at_counter') return;
  if (b.speech) { b.vx *= Math.pow(0.05, dt); b.vy *= Math.pow(0.05, dt); return; }

  const bank = b.assignedBank;
  if (!bank) return;

  const dx = b.tx - b.x, dy = b.ty - b.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 4) {
    b.vx += (dx / d * b.speed - b.vx) * 8 * dt;
    b.vy += (dy / d * b.speed - b.vy) * 8 * dt;
    b.x += b.vx * dt; b.y += b.vy * dt;
    b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  } else {
    b.vx = 0; b.vy = 0;
    b.bankerState = 'at_counter';
  }
}

// ── Honey harvesting AI ───────────────────────────────────────────────────
function updateHoneyBee(b, dt) {
  const dx = b.tx - b.x, dy = b.ty - b.y;
  const d  = Math.sqrt(dx * dx + dy * dy);

  switch (b.honeyState) {
    case 'going_out': {
      if (d > 3) {
        b.vx += (dx / d * b.speed - b.vx) * 8 * dt;
        b.vy += (dy / d * b.speed - b.vy) * 8 * dt;
        b.x  += b.vx * dt; b.y += b.vy * dt;
        b._angle = Math.PI; // face south (toward bottom)
      } else {
        b.vx = 0; b.vy = 0;
        b.honeyState = 'offscreen';
        b.honeyTimer = 60;
      }
      break;
    }
    case 'offscreen': {
      b.honeyTimer -= dt;
      if (b.honeyTimer <= 0) {
        b.hasHoney = true;
        b.x = b._honeyExitX;
        b.y = H + 20;
        b.vx = 0; b.vy = 0;
        const bank = banks.find(bk => bankHasBanker(bk));
        if (bank) {
          b.honeyState = 'going_to_bank';
          b.tx = bank.x + BANK_W / 2;
          b.ty = bank.y + BANK_H + 8;
        } else {
          b.honeyState = null;
          b.hasHoney = false;
        }
      }
      break;
    }
    case 'going_to_bank': {
      if (d > 4) {
        b.vx += (dx / d * b.speed - b.vx) * 8 * dt;
        b.vy += (dy / d * b.speed - b.vy) * 8 * dt;
        b.x  += b.vx * dt; b.y += b.vy * dt;
        b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      } else {
        b.vx = 0; b.vy = 0;
        b.honeyState = 'exchanging';
        b.actionTimer = 1.5;
        b.beebucks += 50;
        b.hasHoney = false;
        b.speech = { text: '+50 beebucks!', timer: 2.5, dur: 2.5 };
      }
      break;
    }
    case 'exchanging': {
      b.vx *= 0.7; b.vy *= 0.7;
      if (b.actionTimer > 0) b.actionTimer -= dt;
      else b.honeyState = null;
      break;
    }
  }
}

// ── Build site completion (one call per frame) ─────────────────────────────
function updateBuildSites(dt) {
  for (let i = buildSites.length - 1; i >= 0; i--) {
    const site = buildSites[i];
    const present = site.assignedBuilders.filter(b =>
      b.builderState === 'at_site' || b.builderState === 'building'
    ).length;

    if (present >= site.maxBuilders) {
      site.assignedBuilders.forEach(b => {
        if (b.builderState === 'at_site') b.builderState = 'building';
      });
      site.buildTimer -= dt;
    }

    if (site.buildTimer <= 0) {
      if (site.type === 'farm') {
        farms.push(makeFarm(site.x - FARM_W / 2, site.y - FARM_H / 2));
      } else if (site.type === 'bank') {
        banks.push(makeBank(site.x - BANK_W / 2, site.y - BANK_H / 2));
      } else if (site.type === 'bathroom') {
        bathrooms.push(makeBathroom(site.x - BATHROOM_W / 2, site.y - BATHROOM_H / 2));
      } else if (site.type === 'housing') {
        housings.push(makeHousing(site.x - HOUSING_W / 2, site.y - HOUSING_H / 2));
      }
      const _costMap = { farm: FARM_COST, bank: BANK_COST, bathroom: BATHROOM_COST, housing: HOUSING_COST };
      const _bldCost = _costMap[site.type] || 0;
      const _nBldrs  = site.assignedBuilders.length;
      const _pay     = _nBldrs > 1 ? Math.floor(_bldCost / _nBldrs) + 10 : _bldCost + 20;
      site.assignedBuilders.forEach(b => {
        b.beebucks     += _pay;
        b.builderTarget = null;
        b.builderState  = 'idle';
        b.actionTimer   = 0.5;
      });
      buildSites.splice(i, 1);
    }
  }
}

// ── UI position helpers ────────────────────────────────────────────────────
// Returns { hire, interact } rect objects (hire is null if bee is employed).
// Buttons stack vertically above bee; flip below if near top of canvas.
function getActionRects(bee) {
  const hasHire  = !bee.job && !bee.honeyState;
  const hasHoney = !bee.honeyState && banks.some(bk => bankHasBanker(bk));
  const panelW   = hasHoney ? 80 : 48;

  let bx = bee.x + 15;
  if (bx + panelW > W - 2) bx = bee.x - (panelW + 5);
  bx = Math.max(2, bx);

  const btns = [];
  if (hasHire)  btns.push({ key: 'hire',     w: 36 });
  btns.push(              { key: 'interact', w: 48 });
  if (hasHoney) btns.push({ key: 'honey',    w: 80 });

  const totalH = btns.length * 13 + (btns.length - 1) * 4;
  const aboveY = bee.y - totalH - 8;
  const base   = aboveY >= 2 ? aboveY : bee.y + 15;

  const result = { hire: null, interact: null, honey: null };
  let yOff = 0;
  for (const { key, w } of btns) {
    result[key] = { x: bx, y: base + yOff, w, h: 13 };
    yOff += 17;
  }
  return result;
}

function hireButtonRect(bee)     { return getActionRects(bee).hire; }
function interactButtonRect(bee) { return getActionRects(bee).interact; }
function honeyButtonRect(bee)    { return getActionRects(bee).honey; }

function jobButtonRects(bee) {
  let bx = bee.x + 15;
  if (bx + 56 > W - 2) bx = bee.x - 71;

  const jobs = [
    { job: 'farmer',  label: 'FARMER'  },
    { job: 'builder', label: 'BUILDER' },
  ];
  if (banks.some(bk => !bankHasBanker(bk))) jobs.push({ job: 'banker', label: 'BANKER' });

  const totalH = jobs.length * 13 + (jobs.length - 1) * 4;
  let by = bee.y - totalH - 8;
  if (by < 2) by = bee.y + 15;

  return jobs.map((j, i) => ({ ...j, x: bx, y: by + i * 17, w: 56, h: 13 }));
}

// ── Drawing ────────────────────────────────────────────────────────────────
function drawBuildButton() {
  const active = showBuildMenu || buildMode;
  const hov    = hitRect(mouse.x, mouse.y, BUILD_BTN);
  ctx.fillStyle  = active ? '#f5c200' : hov ? '#c8a200' : 'rgba(20,14,0,0.88)';
  roundRect(BUILD_BTN.x, BUILD_BTN.y, BUILD_BTN.w, BUILD_BTN.h, 3);
  ctx.fill();
  ctx.strokeStyle = '#f5c200';
  ctx.lineWidth = 1;
  roundRect(BUILD_BTN.x, BUILD_BTN.y, BUILD_BTN.w, BUILD_BTN.h, 3);
  ctx.stroke();
  ctx.fillStyle = active ? '#1a1000' : '#f5c200';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  const label = buildMode ? 'CANCEL' : 'BUILD';
  ctx.fillText(label, BUILD_BTN.x + BUILD_BTN.w / 2, BUILD_BTN.y + 9.5);
}

function drawCheatButton() {
  const hov = hitRect(mouse.x, mouse.y, CHEAT_BTN);
  ctx.fillStyle = cheatsEnabled ? '#00c060' : hov ? 'rgba(0,100,50,0.7)' : 'rgba(10,14,10,0.88)';
  roundRect(CHEAT_BTN.x, CHEAT_BTN.y, CHEAT_BTN.w, CHEAT_BTN.h, 3);
  ctx.fill();
  ctx.strokeStyle = cheatsEnabled ? '#00ff88' : '#446644';
  ctx.lineWidth = 1;
  roundRect(CHEAT_BTN.x, CHEAT_BTN.y, CHEAT_BTN.w, CHEAT_BTN.h, 3);
  ctx.stroke();
  ctx.fillStyle = cheatsEnabled ? '#001a00' : '#669966';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(cheatsEnabled ? 'CHEATS ON' : 'CHEATS', CHEAT_BTN.x + CHEAT_BTN.w / 2, CHEAT_BTN.y + 9.5);
}

// Build menu — shows above the BUILD button
const BM_W = 120, BM_H = 128;
const BM_X = BUILD_BTN.x;
const BM_Y = BUILD_BTN.y - BM_H - 4;

function drawBuildMenu() {
  if (!showBuildMenu) return;

  ctx.fillStyle = 'rgba(8,5,2,0.92)';
  roundRect(BM_X, BM_Y, BM_W, BM_H, 4);
  ctx.fill();
  ctx.strokeStyle = 'rgba(245,194,0,0.6)';
  ctx.lineWidth = 1;
  roundRect(BM_X, BM_Y, BM_W, BM_H, 4);
  ctx.stroke();

  ctx.fillStyle = '#f5c200';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('BUILDINGS', BM_X + 6, BM_Y + 9);
  if (cheatsEnabled) {
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 6px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('CHEAT ON', BM_X + BM_W - 5, BM_Y + 9);
  }

  ctx.strokeStyle = 'rgba(245,194,0,0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(BM_X + 4, BM_Y + 13);
  ctx.lineTo(BM_X + BM_W - 4, BM_Y + 13);
  ctx.stroke();

  const idleBldCt  = idleBuilderCount();
  const hovered    = { farm: false, bank: false, bath: false, hous: false };

  // ── FARM item ──
  const farmAtLim  = farmCount() >= FARM_LIMIT;
  const farmBld    = idleBldCt >= 1;
  const farmBudget = playerBucks >= FARM_COST;
  const farmOk     = !farmAtLim && (cheatsEnabled || (farmBld && farmBudget));
  const farmR      = { x: BM_X + 5, y: BM_Y + 17, w: BM_W - 10, h: 14 };
  hovered.farm     = hitRect(mouse.x, mouse.y, farmR);

  ctx.fillStyle = farmOk  ? 'rgba(60,40,0,0.9)' : 'rgba(30,20,10,0.9)';
  roundRect(farmR.x, farmR.y, farmR.w, farmR.h, 3);
  ctx.fill();
  ctx.strokeStyle = farmOk ? '#8bc34a' : '#555';
  ctx.lineWidth = 1;
  roundRect(farmR.x, farmR.y, farmR.w, farmR.h, 3);
  ctx.stroke();
  ctx.fillStyle = farmOk ? '#8bc34a' : '#666';
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
  ctx.fillText('FARM', farmR.x + 4, farmR.y + 9.5);
  ctx.textAlign = 'right';
  ctx.fillStyle = cheatsEnabled ? '#00ff88' : farmBudget ? (farmOk ? '#f5c200' : '#888') : '#e05050';
  ctx.fillText(cheatsEnabled ? 'FREE' : `$${FARM_COST}`, farmR.x + farmR.w - 4, farmR.y + 9.5);

  // ── BANK item ──
  const bankAtLim  = bankCount() >= BANK_LIMIT;
  const bankBld    = idleBldCt >= 2;
  const bankBudget = playerBucks >= BANK_COST;
  const bankOk     = !bankAtLim && (cheatsEnabled || (bankBld && bankBudget));
  const bankR      = { x: BM_X + 5, y: BM_Y + 35, w: BM_W - 10, h: 14 };
  hovered.bank     = hitRect(mouse.x, mouse.y, bankR);

  ctx.fillStyle = bankOk  ? 'rgba(60,40,0,0.9)' : 'rgba(30,20,10,0.9)';
  roundRect(bankR.x, bankR.y, bankR.w, bankR.h, 3);
  ctx.fill();
  ctx.strokeStyle = bankOk ? '#8bc34a' : '#555';
  ctx.lineWidth = 1;
  roundRect(bankR.x, bankR.y, bankR.w, bankR.h, 3);
  ctx.stroke();
  ctx.fillStyle = bankOk ? '#8bc34a' : '#666';
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
  ctx.fillText('BANK', bankR.x + 4, bankR.y + 9.5);
  ctx.textAlign = 'right';
  ctx.fillStyle = cheatsEnabled ? '#00ff88' : bankBudget ? (bankOk ? '#f5c200' : '#888') : '#e05050';
  ctx.fillText(cheatsEnabled ? 'FREE' : `$${BANK_COST}`, bankR.x + bankR.w - 4, bankR.y + 9.5);
  if (!cheatsEnabled) {
    ctx.fillStyle = bankBld ? '#888' : '#e0a030';
    ctx.font = '5px monospace'; ctx.textAlign = 'left';
    ctx.fillText(`(needs 2 builders)`, bankR.x + 2, bankR.y + bankR.h + 6);
  }

  // ── BATHROOMS item ──
  const bathAtLim  = bathroomCount() >= BATHROOM_LIMIT;
  const bathBld    = idleBldCt >= 1;
  const bathBudget = playerBucks >= BATHROOM_COST;
  const bathOk     = !bathAtLim && (cheatsEnabled || (bathBld && bathBudget));
  const bathR      = { x: BM_X + 5, y: BM_Y + 63, w: BM_W - 10, h: 14 };
  hovered.bath     = hitRect(mouse.x, mouse.y, bathR);

  ctx.fillStyle = bathOk  ? 'rgba(60,40,0,0.9)' : 'rgba(30,20,10,0.9)';
  roundRect(bathR.x, bathR.y, bathR.w, bathR.h, 3);
  ctx.fill();
  ctx.strokeStyle = bathOk ? '#8bc34a' : '#555';
  ctx.lineWidth = 1;
  roundRect(bathR.x, bathR.y, bathR.w, bathR.h, 3);
  ctx.stroke();
  ctx.fillStyle = bathOk ? '#8bc34a' : '#666';
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
  ctx.fillText('BATHROOMS', bathR.x + 4, bathR.y + 9.5);
  ctx.textAlign = 'right';
  ctx.fillStyle = cheatsEnabled ? '#00ff88' : bathBudget ? (bathOk ? '#f5c200' : '#888') : '#e05050';
  ctx.fillText(cheatsEnabled ? 'FREE' : `$${BATHROOM_COST}`, bathR.x + bathR.w - 4, bathR.y + 9.5);

  // ── HOUSING item ──
  const housAtLim  = housingCount() >= HOUSING_LIMIT;
  const housBld    = idleBldCt >= HOUSING_BUILDER_COUNT;
  const housBudget = playerBucks >= HOUSING_COST;
  const housOk     = !housAtLim && (cheatsEnabled || (housBld && housBudget));
  const housR      = { x: BM_X + 5, y: BM_Y + 81, w: BM_W - 10, h: 14 };
  hovered.hous     = hitRect(mouse.x, mouse.y, housR);

  ctx.fillStyle = housOk ? 'rgba(60,40,0,0.9)' : 'rgba(30,20,10,0.9)';
  roundRect(housR.x, housR.y, housR.w, housR.h, 3);
  ctx.fill();
  ctx.strokeStyle = housOk ? '#8bc34a' : '#555';
  ctx.lineWidth = 1;
  roundRect(housR.x, housR.y, housR.w, housR.h, 3);
  ctx.stroke();
  ctx.fillStyle = housOk ? '#8bc34a' : '#666';
  ctx.font = 'bold 7px monospace'; ctx.textAlign = 'left';
  ctx.fillText('HOUSING', housR.x + 4, housR.y + 9.5);
  ctx.textAlign = 'right';
  ctx.fillStyle = cheatsEnabled ? '#00ff88' : housBudget ? (housOk ? '#f5c200' : '#888') : '#e05050';
  ctx.fillText(cheatsEnabled ? 'FREE' : `$${HOUSING_COST}`, housR.x + housR.w - 4, housR.y + 9.5);
  if (!cheatsEnabled) {
    ctx.fillStyle = housBld ? '#888' : '#e0a030';
    ctx.font = '5px monospace'; ctx.textAlign = 'left';
    ctx.fillText('(needs 2 builders)', housR.x + 2, housR.y + housR.h + 6);
  }

  // ── Status line ──
  ctx.font = '6px monospace'; ctx.textAlign = 'left';
  let status = '', statusColor = '#888';
  if (hovered.farm) {
    if (farmAtLim)       { status = `Farm limit (${FARM_LIMIT}/${FARM_LIMIT})`; statusColor = '#e05050'; }
    else if (!farmBld)   { status = 'Need idle builder';  statusColor = '#e0a030'; }
    else if (!farmBudget){ status = `Need $${FARM_COST - playerBucks} more`; statusColor = '#e05050'; }
    else                 { status = `Farms: ${farmCount()}/${FARM_LIMIT}`; }
  } else if (hovered.bank) {
    if (bankAtLim)       { status = 'Bank limit reached'; statusColor = '#e05050'; }
    else if (!bankBld)   { status = `Need ${2 - idleBldCt} more builder${2 - idleBldCt > 1 ? 's' : ''}`; statusColor = '#e0a030'; }
    else if (!bankBudget){ status = `Need $${BANK_COST - playerBucks} more`; statusColor = '#e05050'; }
    else                 { status = 'Ready to build!'; statusColor = '#8bc34a'; }
  } else if (hovered.bath) {
    if (bathAtLim)       { status = `WC limit (${BATHROOM_LIMIT}/${BATHROOM_LIMIT})`; statusColor = '#e05050'; }
    else if (!bathBld)   { status = 'Need idle builder';  statusColor = '#e0a030'; }
    else if (!bathBudget){ status = `Need $${BATHROOM_COST - playerBucks} more`; statusColor = '#e05050'; }
    else                 { status = `WCs: ${bathroomCount()}/${BATHROOM_LIMIT}`; }
  } else if (hovered.hous) {
    if (housAtLim)       { status = `Housing limit (${HOUSING_LIMIT}/${HOUSING_LIMIT})`; statusColor = '#e05050'; }
    else if (!housBld)   { status = 'Need 2 idle builders'; statusColor = '#e0a030'; }
    else if (!housBudget){ status = `Need $${HOUSING_COST - playerBucks} more`; statusColor = '#e05050'; }
    else                 { status = 'Ready to build!'; statusColor = '#8bc34a'; }
  }
  if (status) {
    ctx.fillStyle = statusColor;
    ctx.fillText(status, BM_X + 6, BM_Y + BM_H - 5);
  }
}

// Build sites — construction in progress
function drawBuildSites(t) {
  buildSites.forEach(site => {
    const isBank     = site.type === 'bank';
    const isBathroom = site.type === 'bathroom';
    const isHousing  = site.type === 'housing';
    const fw = isBank ? BANK_W : isBathroom ? BATHROOM_W : isHousing ? HOUSING_W : FARM_W;
    const fh = isBank ? BANK_H : isBathroom ? BATHROOM_H : isHousing ? HOUSING_H : FARM_H;
    const fx = site.x - fw / 2;
    const fy = site.y - fh / 2;

    const present = site.assignedBuilders.filter(b =>
      b.builderState === 'at_site' || b.builderState === 'building'
    ).length;
    const isBuilding = present >= site.maxBuilders;

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#f5c200';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(fx, fy, fw, fh);
    if (!isBank && !isBathroom && !isHousing) ctx.strokeRect(fx + fw + BIN_GAP, fy + (fh - BIN_H) / 2, BIN_W, BIN_H);
    ctx.setLineDash([]);

    if (isBuilding) {
      const pct = 1 - site.buildTimer / site.totalBuildTime;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(fx, fy - 6, fw, 4);
      ctx.fillStyle = '#f5c200';
      ctx.fillRect(fx, fy - 6, fw * pct, 4);
    }

    const dots  = '.'.repeat((Math.floor(t * 2) % 3) + 1);
    const label = isBuilding ? 'BUILDING' : (present > 0 ? 'WAITING' : site.type.toUpperCase());
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#f5c200';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`${label}${dots}`, fx + fw / 2, fy + fh / 2 + 2);
    ctx.restore();
  });
}

function drawJobUI() {
  // Farm picking overlay
  if (pickingFarm) {
    const iw = 160, ih = 14;
    ctx.fillStyle = 'rgba(10,7,0,0.9)';
    roundRect(W / 2 - iw / 2, 4, iw, ih, 3);
    ctx.fill();
    ctx.strokeStyle = '#f5c200';
    ctx.lineWidth = 1;
    roundRect(W / 2 - iw / 2, 4, iw, ih, 3);
    ctx.stroke();
    ctx.fillStyle = '#f5c200';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click a farm to assign  |  ESC to cancel', W / 2, 13.5);

    farms.forEach((f, i) => {
      const full = farmHasFarmer(f);
      ctx.strokeStyle = full ? '#555' : '#f5c200';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(f.x - 2, f.y - 2, FARM_W + 4, FARM_H + 4);
      ctx.setLineDash([]);
      if (full) {
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        ctx.fillRect(f.x, f.y, FARM_W, FARM_H);
      }
      const bx = f.x + FARM_W / 2, by = f.y + FARM_H / 2;
      ctx.fillStyle = full ? '#555' : '#f5c200';
      roundRect(bx - 14, by - 8, 28, 16, 4);
      ctx.fill();
      ctx.fillStyle = full ? '#aaa' : '#1a1000';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(full ? 'FULL' : i + 1, bx, by + 5);
    });
    return;
  }

  if (!selectedBee) return;

  // Selection ring
  ctx.save();
  ctx.strokeStyle = '#f5c200';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.arc(selectedBee.x, selectedBee.y, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (!showHireMenu) {
    const { hire, interact, honey } = getActionRects(selectedBee);

    // HIRE button (jobless bees only)
    if (hire) {
      ctx.fillStyle = 'rgba(10,7,0,0.9)';
      roundRect(hire.x, hire.y, hire.w, hire.h, 3);
      ctx.fill();
      ctx.strokeStyle = '#f5c200';
      ctx.lineWidth = 1;
      roundRect(hire.x, hire.y, hire.w, hire.h, 3);
      ctx.stroke();
      ctx.fillStyle = '#f5c200';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HIRE', hire.x + hire.w / 2, hire.y + 9);
    }

    // INTERACT button (always when bee is selected)
    ctx.fillStyle = 'rgba(0,10,20,0.9)';
    roundRect(interact.x, interact.y, interact.w, interact.h, 3);
    ctx.fill();
    ctx.strokeStyle = '#70c8e8';
    ctx.lineWidth = 1;
    roundRect(interact.x, interact.y, interact.w, interact.h, 3);
    ctx.stroke();
    ctx.fillStyle = '#70c8e8';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('INTERACT', interact.x + interact.w / 2, interact.y + 9);

    // HARVEST HONEY button (when bank has a banker)
    if (honey) {
      ctx.fillStyle = 'rgba(20,8,0,0.92)';
      roundRect(honey.x, honey.y, honey.w, honey.h, 3);
      ctx.fill();
      ctx.strokeStyle = '#f5a800';
      ctx.lineWidth = 1;
      roundRect(honey.x, honey.y, honey.w, honey.h, 3);
      ctx.stroke();
      ctx.fillStyle = '#f5a800';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('HARVEST HONEY', honey.x + honey.w / 2, honey.y + 9);
    }
  } else if (!selectedBee.job) {
    jobButtonRects(selectedBee).forEach(btn => {
      ctx.fillStyle = 'rgba(10,7,0,0.9)';
      roundRect(btn.x, btn.y, btn.w, btn.h, 3);
      ctx.fill();
      ctx.strokeStyle = '#8bc34a';
      ctx.lineWidth = 1;
      roundRect(btn.x, btn.y, btn.w, btn.h, 3);
      ctx.stroke();
      ctx.fillStyle = '#8bc34a';
      ctx.font = 'bold 7px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + 9);
    });
  }
}

// ── Relationship badges ────────────────────────────────────────────────────
const REL_BADGE = {
  stranger:     { label: '???', color: '#888',    bg: 'rgba(15,15,15,0.9)'  },
  acquaintance: { label: 'hey', color: '#f5c200', bg: 'rgba(45,30,0,0.9)'   },
  friend:       { label: 'bff', color: '#8bc34a', bg: 'rgba(15,45,5,0.9)'   },
};

function drawRelationshipBadges() {
  if (!selectedBee) return;
  npcs.forEach(b => {
    if (b === selectedBee) return;
    if (b.bathroomState === 'in_bathroom') return;
    if (b.bankerState === 'at_counter') return;
    if (b.honeyState === 'offscreen') return;

    const score = getRelScore(selectedBee, b);
    const rel   = getRelationship(selectedBee, b);
    const cfg   = REL_BADGE[rel];

    // Badge above bee head
    const badgeY = b.y - 28;
    ctx.font = 'bold 5px monospace';
    const tw = ctx.measureText(cfg.label).width;
    const bw = tw + 8, bh = 9;
    const bx = b.x - bw / 2;

    ctx.fillStyle = cfg.bg;
    roundRect(bx, badgeY, bw, bh, 3);
    ctx.fill();
    ctx.strokeStyle = cfg.color;
    ctx.lineWidth = 0.8;
    roundRect(bx, badgeY, bw, bh, 3);
    ctx.stroke();
    ctx.fillStyle = cfg.color;
    ctx.textAlign = 'center';
    ctx.fillText(cfg.label, b.x, badgeY + 6.5);

    // Tiny score bar under label
    const barW = bw - 2, barH = 2;
    const barX = bx + 1, barY = badgeY + bh + 1;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);
    ctx.fillStyle = cfg.color;
    ctx.globalAlpha = 0.7;
    ctx.fillRect(barX, barY, barW * (score / 100), barH);
    ctx.globalAlpha = 1;
  });
}

// ── ESC ────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    buildMode = false; pendingBuild = null;
    showBuildMenu = false;
    pickingFarm = false; beeToAssign = null;
    selectedBee = null; showHireMenu = false;
    selectedPoop    = null;
    selectedHousing = null;
    canvas.style.cursor = 'default';
  }
});

// ── Click handler ──────────────────────────────────────────────────────────
function handleWorldClick(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (W / rect.width);
  const cy = (e.clientY - rect.top)  * (H / rect.height);

  // Inside housing
  if (insideHousing) {
    if (hitRect(cx, cy, HOUSING_EXIT_BTN)) { exitHousing(); return; }

    if (selectedHousingCell !== null) {
      const eligible = eligibleTenants();
      for (const r of tenantBeeRects(eligible)) {
        if (hitRect(cx, cy, r)) {
          insideHousing.residents[selectedHousingCell] = r.bee;
          r.bee.beebucks -= HOUSING_RENT;
          selectedHousingCell = null;
          return;
        }
      }
      selectedHousingCell = null;
      return;
    }

    for (let i = 0; i < HEX_CELLS.length; i++) {
      const cell = HEX_CELLS[i];
      if (Math.hypot(cx - cell.x, cy - cell.y) < HEX_R && !insideHousing.residents[i]) {
        selectedHousingCell = i;
        return;
      }
    }

    return;
  }

  // Inside bank — only EXIT button active
  if (insideBank) {
    if (hitRect(cx, cy, EXIT_BTN)) exitBank();
    return;
  }

  // CHEAT button
  if (hitRect(cx, cy, CHEAT_BTN)) { cheatsEnabled = !cheatsEnabled; return; }

  // BUILD button
  if (hitRect(cx, cy, BUILD_BTN)) {
    if (buildMode) {
      buildMode = false; pendingBuild = null;
      canvas.style.cursor = 'default';
    } else {
      showBuildMenu = !showBuildMenu;
    }
    return;
  }

  // Build menu item clicks
  if (showBuildMenu) {
    const farmR = { x: BM_X + 5, y: BM_Y + 17, w: BM_W - 10, h: 14 };
    const bankR = { x: BM_X + 5, y: BM_Y + 35, w: BM_W - 10, h: 14 };
    const bathR = { x: BM_X + 5, y: BM_Y + 63, w: BM_W - 10, h: 14 };
    if (hitRect(cx, cy, farmR)) {
      if (farmCount() < FARM_LIMIT && (cheatsEnabled || (idleBuilderCount() >= 1 && playerBucks >= FARM_COST))) {
        showBuildMenu = false; buildMode = true; pendingBuild = 'farm';
        canvas.style.cursor = 'crosshair';
      }
    } else if (hitRect(cx, cy, bankR)) {
      if (bankCount() < BANK_LIMIT && (cheatsEnabled || (idleBuilderCount() >= 2 && playerBucks >= BANK_COST))) {
        showBuildMenu = false; buildMode = true; pendingBuild = 'bank';
        canvas.style.cursor = 'crosshair';
      }
    } else if (hitRect(cx, cy, bathR)) {
      if (bathroomCount() < BATHROOM_LIMIT && (cheatsEnabled || (idleBuilderCount() >= 1 && playerBucks >= BATHROOM_COST))) {
        showBuildMenu = false; buildMode = true; pendingBuild = 'bathroom';
        canvas.style.cursor = 'crosshair';
      }
    } else if (hitRect(cx, cy, { x: BM_X + 5, y: BM_Y + 81, w: BM_W - 10, h: 14 })) {
      if (housingCount() < HOUSING_LIMIT && (cheatsEnabled || (idleBuilderCount() >= HOUSING_BUILDER_COUNT && playerBucks >= HOUSING_COST))) {
        showBuildMenu = false; buildMode = true; pendingBuild = 'housing';
        canvas.style.cursor = 'crosshair';
      }
    } else {
      showBuildMenu = false;
    }
    return;
  }

  // Placement mode
  if (buildMode && pendingBuild === 'farm') {
    const fx = Math.max(2, Math.min(W - FARM_W - BIN_W - BIN_GAP - 4, cx - FARM_W / 2));
    const fy = Math.max(2, Math.min(H - FARM_H - 2, cy - FARM_H / 2));
    if (!farmOverlaps(fx, fy) && !bankOverlaps(fx, fy) && farmCount() < FARM_LIMIT) {
      if (!cheatsEnabled) playerBucks -= FARM_COST;
      buildSites.push({ x: fx + FARM_W / 2, y: fy + FARM_H / 2, type: 'farm',
        maxBuilders: 1, buildTimer: cheatsEnabled ? 0 : FARM_BUILD_TIME, totalBuildTime: FARM_BUILD_TIME,
        assignedBuilders: [] });
      buildMode = false; pendingBuild = null; canvas.style.cursor = 'default';
    }
    return;
  }

  if (buildMode && pendingBuild === 'bank') {
    const bx = Math.max(2, Math.min(W - BANK_W - 4, cx - BANK_W / 2));
    const by = Math.max(2, Math.min(H - BANK_H - 2, cy - BANK_H / 2));
    if (!bankOverlaps(bx, by) && bankCount() < BANK_LIMIT) {
      if (!cheatsEnabled) playerBucks -= BANK_COST;
      buildSites.push({ x: bx + BANK_W / 2, y: by + BANK_H / 2, type: 'bank',
        maxBuilders: 2, buildTimer: cheatsEnabled ? 0 : BANK_BUILD_TIME, totalBuildTime: BANK_BUILD_TIME,
        assignedBuilders: [] });
      buildMode = false; pendingBuild = null; canvas.style.cursor = 'default';
    }
    return;
  }

  if (buildMode && pendingBuild === 'bathroom') {
    const bx = Math.max(2, Math.min(W - BATHROOM_W - 4, cx - BATHROOM_W / 2));
    const by = Math.max(2, Math.min(H - BATHROOM_H - 2, cy - BATHROOM_H / 2));
    if (!bathroomOverlaps(bx, by) && bathroomCount() < BATHROOM_LIMIT) {
      if (!cheatsEnabled) playerBucks -= BATHROOM_COST;
      buildSites.push({ x: bx + BATHROOM_W / 2, y: by + BATHROOM_H / 2, type: 'bathroom',
        maxBuilders: 1, buildTimer: cheatsEnabled ? 0 : BATHROOM_BUILD_TIME, totalBuildTime: BATHROOM_BUILD_TIME,
        assignedBuilders: [] });
      buildMode = false; pendingBuild = null; canvas.style.cursor = 'default';
    }
    return;
  }

  if (buildMode && pendingBuild === 'housing') {
    const hx = Math.max(2, Math.min(W - HOUSING_W - 4, cx - HOUSING_W / 2));
    const hy = Math.max(2, Math.min(H - HOUSING_H - 2, cy - HOUSING_H / 2));
    if (!housingOverlaps(hx, hy) && housingCount() < HOUSING_LIMIT) {
      if (!cheatsEnabled) playerBucks -= HOUSING_COST;
      buildSites.push({ x: hx + HOUSING_W / 2, y: hy + HOUSING_H / 2, type: 'housing',
        maxBuilders: HOUSING_BUILDER_COUNT, buildTimer: cheatsEnabled ? 0 : HOUSING_BUILD_TIME, totalBuildTime: HOUSING_BUILD_TIME,
        assignedBuilders: [] });
      buildMode = false; pendingBuild = null; canvas.style.cursor = 'default';
    }
    return;
  }

  // Farm picking
  if (pickingFarm) {
    const farm = farmAtPoint(cx, cy);
    if (farm && !farmHasFarmer(farm)) {
      assignFarmer(beeToAssign, farm);
      pickingFarm = false; beeToAssign = null;
    }
    return;
  }

  // Hire menu — job selection
  if (selectedBee && showHireMenu) {
    for (const btn of jobButtonRects(selectedBee)) {
      if (!hitRect(cx, cy, btn)) continue;
      if (btn.job === 'farmer') {
        const available = farms.filter(f => !farmHasFarmer(f));
        if (available.length === 1) {
          assignFarmer(selectedBee, available[0]);
          selectedBee = null;
        } else if (available.length > 1) {
          beeToAssign = selectedBee;
          pickingFarm = true;
          selectedBee = null;
        }
      } else if (btn.job === 'builder') {
        selectedBee.job          = 'builder';
        selectedBee.builderState = 'idle';
        selectedBee.builderTarget = null;
        selectedBee.buildTimer   = 0;
        selectedBee.actionTimer  = 0;
        selectedBee.tx = selectedBee.x;
        selectedBee.ty = selectedBee.y;
        selectedBee = null;
      } else if (btn.job === 'banker') {
        const availBanks = banks.filter(bk => !bankHasBanker(bk));
        if (availBanks.length >= 1) {
          assignBanker(selectedBee, availBanks[0]);
          selectedBee = null;
        }
      }
      showHireMenu = false;
      return;
    }
    showHireMenu = false;
    return;
  }

  // INTERACT / HIRE / HARVEST HONEY buttons (when not showing job menu)
  if (selectedBee && !showHireMenu) {
    const { hire, interact, honey } = getActionRects(selectedBee);
    if (hitRect(cx, cy, interact)) {
      selectedBee.speech = { text: getBeeDialogue(selectedBee), timer: 4.5, dur: 4.5 };
      return;
    }
    if (hire && hitRect(cx, cy, hire)) {
      showHireMenu = true;
      return;
    }
    if (honey && hitRect(cx, cy, honey)) {
      const bee = selectedBee;
      bee.honeyState    = 'going_out';
      bee.hasHoney      = false;
      bee._honeyExitX   = bee.x;
      bee.tx = bee.x;
      bee.ty = H + 28;
      bee.vx = 0; bee.vy = 0;
      selectedBee  = null;
      showHireMenu = false;
      return;
    }
  }

  // ENTER button on selected housing
  if (selectedHousing && hitRect(cx, cy, housingEnterBtnRect(selectedHousing))) {
    enterHousing(selectedHousing);
    selectedHousing = null;
    return;
  }

  // ENTER button on selected bank
  if (selectedBank && hitRect(cx, cy, enterBtnRect(selectedBank))) {
    enterBank(selectedBank);
    selectedBank = null;
    return;
  }

  // CLEAN button on selected poop
  if (selectedPoop && hitRect(cx, cy, cleanBtnRect(selectedPoop))) {
    const poop    = selectedPoop;
    const cleaner = poop.leftBy;
    if (cleaner && npcs.includes(cleaner)) {
      cleaner.cleanupState  = 'going_to_poop';
      cleaner.cleanupTarget = poop;
      cleaner.bathroomState = null;
      cleaner.honeyState    = null;
      cleaner.speech        = null;
    }
    selectedPoop = null;
    return;
  }

  // Click poop to select it
  const clickedPoop = poopAtPoint(cx, cy);
  if (clickedPoop) {
    selectedPoop = selectedPoop === clickedPoop ? null : clickedPoop;
    selectedBee = null; showHireMenu = false; selectedBank = null;
    return;
  }

  // Click housing building
  const clickedHousing = housingAtPoint(cx, cy);
  if (clickedHousing) {
    selectedHousing = selectedHousing === clickedHousing ? null : clickedHousing;
    selectedBee = null; showHireMenu = false; selectedBank = null; selectedPoop = null;
    return;
  }

  // Click bank building
  const clickedBank = bankAtPoint(cx, cy);
  if (clickedBank) {
    selectedBank = selectedBank === clickedBank ? null : clickedBank;
    selectedBee = null; showHireMenu = false; selectedPoop = null; selectedHousing = null;
    return;
  }

  // Select / deselect bee
  for (const b of npcs) {
    if (Math.hypot(b.x - cx, b.y - cy) < 14) {
      selectedBee     = selectedBee === b ? null : b;
      showHireMenu    = false;
      selectedBank    = null;
      selectedPoop    = null;
      selectedHousing = null;
      return;
    }
  }

  selectedBee     = null;
  showHireMenu    = false;
  selectedBank    = null;
  selectedPoop    = null;
  selectedHousing = null;
}
