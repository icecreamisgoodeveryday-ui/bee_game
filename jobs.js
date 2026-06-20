let selectedBee  = null;
let showHireMenu = false;
let showBuildMenu = false;
let buildMode    = false;   // placement ghost active
let pendingBuild = null;    // 'farm' etc.
let pickingFarm  = false;
let beeToAssign  = null;

const BUILD_BTN  = { x: 4, y: H - 17, w: 40, h: 14 };
const FARM_LIMIT = 2;
const FARM_COST  = 25;
const BUILDER_COMMISSION = 10;

const buildSites = []; // { x, y, type, assignedBuilder }

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

function hitRect(cx, cy, r) {
  return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
}

// ── Farmer AI ──────────────────────────────────────────────────────────────
function updateFarmer(b, dt) {
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
const BUILD_TIME = 8; // seconds to construct

function updateBuilder(b, dt) {
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

  switch (b.builderState) {
    case 'idle': {
      const site = buildSites.find(s => !s.assignedBuilder);
      if (site) {
        site.assignedBuilder = b;
        b.builderTarget = site;
        b.builderState  = 'going_to_site';
        b.tx = site.x; b.ty = site.y;
      } else {
        // Wander, avoiding farms
        pickTarget(b);
        b.actionTimer = 2;
      }
      break;
    }
    case 'going_to_site': {
      if (Math.hypot(b.x - b.builderTarget.x, b.y - b.builderTarget.y) < 8) {
        b.builderState = 'building';
        b.buildTimer   = BUILD_TIME;
      }
      break;
    }
    case 'building': {
      b.buildTimer -= dt;
      if (b.buildTimer <= 0) {
        const site = b.builderTarget;
        if (site.type === 'farm') {
          farms.push(makeFarm(site.x - FARM_W / 2, site.y - FARM_H / 2));
        }
        buildSites.splice(buildSites.indexOf(site), 1);
        b.beebucks     += BUILDER_COMMISSION;
        b.builderTarget = null;
        b.builderState  = 'idle';
        b.actionTimer   = 0.5;
      }
      break;
    }
  }
}

// ── UI position helpers ────────────────────────────────────────────────────
function hireButtonRect(bee) {
  let bx = bee.x + 15, by = bee.y - 24;
  if (bx + 36 > W - 2) bx = bee.x - 51;
  if (by < 2) by = bee.y + 15;
  return { x: bx, y: by, w: 36, h: 13 };
}

function jobButtonRects(bee) {
  let bx = bee.x + 15, by = bee.y - 52;
  if (bx + 56 > W - 2) bx = bee.x - 71;
  if (by < 2) by = bee.y + 15;
  return [
    { x: bx, y: by,      w: 56, h: 13, job: 'farmer',  label: 'FARMER'  },
    { x: bx, y: by + 16, w: 56, h: 13, job: 'builder', label: 'BUILDER' },
  ];
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

// Build menu — shows above the BUILD button
const BM_W = 116, BM_H = 52;
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

  // Divider
  ctx.strokeStyle = 'rgba(245,194,0,0.3)';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(BM_X + 4, BM_Y + 13);
  ctx.lineTo(BM_X + BM_W - 4, BM_Y + 13);
  ctx.stroke();

  // FARM item
  const atLimit   = farmCount() >= FARM_LIMIT;
  const hasBuilder = !!idleBuilder();
  const hasBudget  = playerBucks >= FARM_COST;
  const canBuild   = !atLimit && hasBuilder && hasBudget;

  const itemR = { x: BM_X + 5, y: BM_Y + 17, w: BM_W - 10, h: 14 };
  ctx.fillStyle = canBuild  ? 'rgba(60,40,0,0.9)'
                : atLimit   ? 'rgba(30,30,30,0.9)'
                :              'rgba(40,10,10,0.9)';
  roundRect(itemR.x, itemR.y, itemR.w, itemR.h, 3);
  ctx.fill();
  ctx.strokeStyle = canBuild ? '#8bc34a' : '#555';
  ctx.lineWidth = 1;
  roundRect(itemR.x, itemR.y, itemR.w, itemR.h, 3);
  ctx.stroke();

  ctx.fillStyle = canBuild ? '#8bc34a' : '#666';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('FARM', itemR.x + 4, itemR.y + 9.5);
  ctx.textAlign = 'right';
  ctx.fillStyle = hasBudget ? (canBuild ? '#f5c200' : '#888') : '#e05050';
  ctx.fillText(`$${FARM_COST}`, itemR.x + itemR.w - 4, itemR.y + 9.5);

  // Status line
  ctx.font = '6px monospace';
  ctx.textAlign = 'left';
  if (atLimit) {
    ctx.fillStyle = '#e05050';
    ctx.fillText(`Farm limit reached (${FARM_LIMIT}/${FARM_LIMIT})`, BM_X + 6, BM_Y + BM_H - 5);
  } else if (!hasBuilder) {
    ctx.fillStyle = '#e0a030';
    ctx.fillText('Need an idle builder bee', BM_X + 6, BM_Y + BM_H - 5);
  } else if (!hasBudget) {
    ctx.fillStyle = '#e05050';
    ctx.fillText(`Need $${FARM_COST - playerBucks} more`, BM_X + 6, BM_Y + BM_H - 5);
  } else {
    ctx.fillStyle = '#888';
    ctx.fillText(`Farms: ${farmCount()}/${FARM_LIMIT}`, BM_X + 6, BM_Y + BM_H - 5);
  }
}

// Build sites — construction in progress
function drawBuildSites(t) {
  buildSites.forEach(site => {
    const fx = site.x - FARM_W / 2;
    const fy = site.y - FARM_H / 2;

    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = '#f5c200';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect(fx, fy, FARM_W, FARM_H);
    ctx.strokeRect(fx + FARM_W + BIN_GAP, fy + (FARM_H - BIN_H) / 2, BIN_W, BIN_H);
    ctx.setLineDash([]);

    // Progress bar
    if (site.assignedBuilder && site.assignedBuilder.builderState === 'building') {
      const pct = 1 - site.assignedBuilder.buildTimer / BUILD_TIME;
      ctx.globalAlpha = 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(fx, fy - 6, FARM_W, 4);
      ctx.fillStyle = '#f5c200';
      ctx.fillRect(fx, fy - 6, FARM_W * pct, 4);
    }

    // Animated label
    const dots = '.'.repeat((Math.floor(t * 2) % 3) + 1);
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#f5c200';
    ctx.font = '6px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`BUILDING${dots}`, fx + FARM_W / 2, fy + FARM_H / 2 + 2);
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

  if (selectedBee.job) return;

  if (!showHireMenu) {
    const r = hireButtonRect(selectedBee);
    ctx.fillStyle = 'rgba(10,7,0,0.9)';
    roundRect(r.x, r.y, r.w, r.h, 3);
    ctx.fill();
    ctx.strokeStyle = '#f5c200';
    ctx.lineWidth = 1;
    roundRect(r.x, r.y, r.w, r.h, 3);
    ctx.stroke();
    ctx.fillStyle = '#f5c200';
    ctx.font = 'bold 7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('HIRE', r.x + r.w / 2, r.y + 9);
  } else {
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

// ── ESC ────────────────────────────────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    buildMode = false; pendingBuild = null;
    showBuildMenu = false;
    pickingFarm = false; beeToAssign = null;
    selectedBee = null; showHireMenu = false;
    canvas.style.cursor = 'default';
  }
});

// ── Click handler ──────────────────────────────────────────────────────────
function handleWorldClick(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (W / rect.width);
  const cy = (e.clientY - rect.top)  * (H / rect.height);

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
    const itemR = { x: BM_X + 5, y: BM_Y + 17, w: BM_W - 10, h: 14 };
    if (hitRect(cx, cy, itemR)) {
      const atLimit    = farmCount() >= FARM_LIMIT;
      const hasBuilder = !!idleBuilder();
      const hasBudget  = playerBucks >= FARM_COST;
      if (!atLimit && hasBuilder && hasBudget) {
        showBuildMenu = false;
        buildMode     = true;
        pendingBuild  = 'farm';
        canvas.style.cursor = 'crosshair';
      }
    } else {
      showBuildMenu = false;
    }
    return;
  }

  // Placement mode — click to place building
  if (buildMode && pendingBuild === 'farm') {
    const fx = Math.max(2, Math.min(W - FARM_W - BIN_W - BIN_GAP - 4, cx - FARM_W / 2));
    const fy = Math.max(2, Math.min(H - FARM_H - 2, cy - FARM_H / 2));
    if (!farmOverlaps(fx, fy) && farmCount() < FARM_LIMIT) {
      playerBucks -= FARM_COST;
      buildSites.push({ x: fx + FARM_W / 2, y: fy + FARM_H / 2, type: 'farm', assignedBuilder: null });
      buildMode    = false;
      pendingBuild = null;
      canvas.style.cursor = 'default';
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
      }
      showHireMenu = false;
      return;
    }
    showHireMenu = false;
    return;
  }

  // Hire button
  if (selectedBee && !selectedBee.job && hitRect(cx, cy, hireButtonRect(selectedBee))) {
    showHireMenu = true;
    return;
  }

  // Select / deselect bee
  for (const b of npcs) {
    if (Math.hypot(b.x - cx, b.y - cy) < 14) {
      selectedBee  = selectedBee === b ? null : b;
      showHireMenu = false;
      return;
    }
  }

  selectedBee  = null;
  showHireMenu = false;
}
