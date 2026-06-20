let selectedBee = null;
let showHireMenu = false;
let buildMode = false;

const BUILD_BTN = { x: 4, y: H - 17, w: 40, h: 14 };

function enterBuildMode() {
  buildMode = !buildMode;
  canvas.style.cursor = buildMode ? 'crosshair' : 'default';
  selectedBee = null;
  showHireMenu = false;
}

// ── Farmer AI ──────────────────────────────────────────────────────────────
function updateFarmer(b, dt) {
  // Precise movement toward b.tx/b.ty (no wander jitter)
  const dx = b.tx - b.x;
  const dy = b.ty - b.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 3) {
    b.vx += (dx / d * b.speed - b.vx) * 8 * dt;
    b.vy += (dy / d * b.speed - b.vy) * 8 * dt;
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b._angle = Math.atan2(b.vy, b.vx) + Math.PI / 2;
  } else {
    b.vx *= 0.7;
    b.vy *= 0.7;
  }

  if (b.actionTimer > 0) { b.actionTimer -= dt; return; }

  const farm = farms[0];
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
      // Nothing to do — loiter near farm
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

// ── UI helpers ─────────────────────────────────────────────────────────────
function hireButtonRect(bee) {
  let bx = bee.x + 15, by = bee.y - 24;
  if (bx + 36 > W - 2) bx = bee.x - 51;
  if (by < 2) by = bee.y + 15;
  return { x: bx, y: by, w: 36, h: 13 };
}

function jobButtonRects(bee) {
  let bx = bee.x + 15, by = bee.y - 38;
  if (bx + 50 > W - 2) bx = bee.x - 65;
  if (by < 2) by = bee.y + 15;
  return [
    { x: bx, y: by, w: 50, h: 13, job: 'farmer', label: 'FARMER' },
  ];
}

function hitRect(cx, cy, r) {
  return cx >= r.x && cx <= r.x + r.w && cy >= r.y && cy <= r.y + r.h;
}

// ── Drawing ────────────────────────────────────────────────────────────────
function drawBuildButton() {
  const hov = hitRect(mouse.x, mouse.y, BUILD_BTN);
  ctx.fillStyle = buildMode ? '#f5c200' : hov ? '#c8a200' : 'rgba(20,14,0,0.88)';
  roundRect(BUILD_BTN.x, BUILD_BTN.y, BUILD_BTN.w, BUILD_BTN.h, 3);
  ctx.fill();
  ctx.strokeStyle = '#f5c200';
  ctx.lineWidth = 1;
  roundRect(BUILD_BTN.x, BUILD_BTN.y, BUILD_BTN.w, BUILD_BTN.h, 3);
  ctx.stroke();
  ctx.fillStyle = buildMode ? '#1a1000' : '#f5c200';
  ctx.font = 'bold 7px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(buildMode ? 'PLACE' : 'BUILD', BUILD_BTN.x + BUILD_BTN.w / 2, BUILD_BTN.y + 9.5);
}

function drawJobUI() {
  if (!selectedBee) return;

  // Dashed selection ring
  ctx.save();
  ctx.strokeStyle = '#f5c200';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([3, 2]);
  ctx.beginPath();
  ctx.arc(selectedBee.x, selectedBee.y, 13, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  if (selectedBee.job) return; // already employed, no hire

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

// ── Canvas click handler (attached in startWorld) ──────────────────────────
function handleWorldClick(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (W / rect.width);
  const cy = (e.clientY - rect.top)  * (H / rect.height);

  if (hitRect(cx, cy, BUILD_BTN)) { enterBuildMode(); return; }

  if (buildMode) {
    let fx = Math.max(2, Math.min(W - FARM_W - BIN_W - 10, cx - FARM_W / 2));
    let fy = Math.max(2, Math.min(H - FARM_H - 2, cy - FARM_H / 2));
    farms.push(makeFarm(fx, fy));
    buildMode = false;
    canvas.style.cursor = 'default';
    return;
  }

  if (selectedBee && showHireMenu) {
    for (const btn of jobButtonRects(selectedBee)) {
      if (hitRect(cx, cy, btn)) {
        selectedBee.job = btn.job;
        selectedBee.farmerState = 'idle';
        selectedBee.actionTimer = 0;
        selectedBee._ftarget = null;
        selectedBee.tx = selectedBee.x;
        selectedBee.ty = selectedBee.y;
        showHireMenu = false;
        selectedBee = null;
        return;
      }
    }
    showHireMenu = false;
    return;
  }

  if (selectedBee && !selectedBee.job && hitRect(cx, cy, hireButtonRect(selectedBee))) {
    showHireMenu = true;
    return;
  }

  // Click a bee to select/deselect
  for (const b of npcs) {
    if (Math.hypot(b.x - cx, b.y - cy) < 14) {
      selectedBee = selectedBee === b ? null : b;
      showHireMenu = false;
      return;
    }
  }

  selectedBee = null;
  showHireMenu = false;
}
