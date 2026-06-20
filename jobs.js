let selectedBee = null;
let showHireMenu = false;
let buildMode = false;
let pickingFarm = false;
let beeToAssign = null;

const BUILD_BTN = { x: 4, y: H - 17, w: 40, h: 14 };

function enterBuildMode() {
  buildMode = !buildMode;
  pickingFarm = false;
  beeToAssign = null;
  selectedBee = null;
  showHireMenu = false;
  canvas.style.cursor = buildMode ? 'crosshair' : 'default';
}

function farmHasFarmer(farm) {
  return npcs.some(b => b.job === 'farmer' && b.assignedFarm === farm);
}

function assignFarmer(bee, farm) {
  bee.job = 'farmer';
  bee.assignedFarm = farm;
  bee.farmerState = 'idle';
  bee.actionTimer = 0;
  bee._ftarget = null;
  bee.tx = bee.x;
  bee.ty = bee.y;
}

// ── Farmer AI ──────────────────────────────────────────────────────────────
function updateFarmer(b, dt) {
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
  // Farm picking mode: highlight farms and show instruction
  if (pickingFarm) {
    const iw = 160, ih = 14;
    const ix = W / 2 - iw / 2, iy = 4;
    ctx.fillStyle = 'rgba(10,7,0,0.9)';
    roundRect(ix, iy, iw, ih, 3);
    ctx.fill();
    ctx.strokeStyle = '#f5c200';
    ctx.lineWidth = 1;
    roundRect(ix, iy, iw, ih, 3);
    ctx.stroke();
    ctx.fillStyle = '#f5c200';
    ctx.font = '7px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click a farm to assign  |  ESC to cancel', W / 2, iy + 9.5);

    farms.forEach((f, i) => {
      const full = farmHasFarmer(f);
      ctx.strokeStyle = full ? '#666' : '#f5c200';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 2]);
      ctx.strokeRect(f.x - 2, f.y - 2, FARM_W + 4, FARM_H + 4);
      ctx.setLineDash([]);

      if (full) {
        // Dim overlay
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

  // Dashed selection ring
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

// ── ESC cancels build/pick modes ───────────────────────────────────────────
window.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    buildMode = false;
    pickingFarm = false;
    beeToAssign = null;
    selectedBee = null;
    showHireMenu = false;
    canvas.style.cursor = 'default';
  }
});

// ── Canvas click handler (attached in startWorld) ──────────────────────────
function handleWorldClick(e) {
  const rect = canvas.getBoundingClientRect();
  const cx = (e.clientX - rect.left) * (W / rect.width);
  const cy = (e.clientY - rect.top)  * (H / rect.height);

  if (hitRect(cx, cy, BUILD_BTN)) { enterBuildMode(); return; }

  if (buildMode) {
    const fx = Math.max(2, Math.min(W - FARM_W - BIN_W - BIN_GAP - 4, cx - FARM_W / 2));
    const fy = Math.max(2, Math.min(H - FARM_H - 2, cy - FARM_H / 2));
    if (!farmOverlaps(fx, fy)) {
      farms.push(makeFarm(fx, fy));
      buildMode = false;
      canvas.style.cursor = 'default';
    }
    // Stay in build mode if placement would overlap
    return;
  }

  if (pickingFarm) {
    const farm = farmAtPoint(cx, cy);
    if (farm && !farmHasFarmer(farm)) {
      assignFarmer(beeToAssign, farm);
      pickingFarm = false;
      beeToAssign = null;
    }
    // Clicking a full farm or empty space keeps picker open; ESC to cancel
    return;
  }

  if (selectedBee && showHireMenu) {
    for (const btn of jobButtonRects(selectedBee)) {
      if (hitRect(cx, cy, btn) && btn.job === 'farmer') {
        const available = farms.filter(f => !farmHasFarmer(f));
        if (available.length === 0) {
          // no farm or all full — ignore
        } else if (available.length === 1 && farms.length === 1) {
          assignFarmer(selectedBee, farms[0]);
          selectedBee = null;
        } else {
          beeToAssign = selectedBee;
          pickingFarm = true;
          selectedBee = null;
        }
        showHireMenu = false;
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
