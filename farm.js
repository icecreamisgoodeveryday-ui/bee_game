const FARM_W = 88;
const FARM_H = 64;
const CROP_COLS = 3;
const CROP_ROWS = 2;
const PLOT_W = 26; // stride (drawn width = PLOT_W - 2 = 24)
const PLOT_H = 25; // stride (drawn height = PLOT_H - 2 = 23)
const BIN_W = 20;
const BIN_H = 20;
const BIN_GAP = 5; // gap between farm edge and bin

const farms = [];

function makeFarm(x, y) {
  const crops = [];
  for (let row = 0; row < CROP_ROWS; row++) {
    for (let col = 0; col < CROP_COLS; col++) {
      crops.push({ col, row, stage: 0, timer: 0, claimed: false });
    }
  }
  return {
    x, y,
    crops,
    bin: { x: x + FARM_W + BIN_GAP, y: y + (FARM_H - BIN_H) / 2, amount: 0 },
  };
}

function cropWorldPos(farm, crop) {
  return {
    x: farm.x + 5 + crop.col * PLOT_W + (PLOT_W - 2) / 2,
    y: farm.y + 10 + crop.row * PLOT_H + (PLOT_H - 2) / 2,
  };
}

// Returns true if a farm placed at (fx,fy) would overlap an existing farm (with padding).
function farmOverlaps(fx, fy) {
  const PAD = 8;
  const fw = FARM_W + BIN_GAP + BIN_W;
  if (farms.some(f => {
    const efw = FARM_W + BIN_GAP + BIN_W;
    return !((fx + fw + PAD < f.x) || (fx > f.x + efw + PAD) ||
             (fy + FARM_H + PAD < f.y) || (fy > f.y + FARM_H + PAD));
  })) return true;
  if (typeof bathrooms !== 'undefined' && bathrooms.some(bth =>
    !(fx + fw + PAD < bth.x || fx > bth.x + BATHROOM_W + PAD ||
      fy + FARM_H + PAD < bth.y || fy > bth.y + BATHROOM_H + PAD)
  )) return true;
  if (typeof housings !== 'undefined' && housings.some(h =>
    !(fx + fw + PAD < h.x || fx > h.x + HOUSING_W + PAD ||
      fy + FARM_H + PAD < h.y || fy > h.y + HOUSING_H + PAD)
  )) return true;
  return false;
}

// Returns the farm the point (cx,cy) falls inside, or null.
function farmAtPoint(cx, cy) {
  return farms.find(f =>
    cx >= f.x && cx <= f.x + FARM_W && cy >= f.y && cy <= f.y + FARM_H
  ) || null;
}

function updateFarms(dt) {
  farms.forEach(farm => {
    farm.crops.forEach(crop => {
      if (crop.stage === 1) {
        crop.timer -= dt;
        if (crop.timer <= 0) { crop.stage = 2; crop.timer = 20; }
      } else if (crop.stage === 2) {
        crop.timer -= dt;
        if (crop.timer <= 0) { crop.stage = 3; }
      }
    });
  });
}

function drawFarm(farm) {
  // Soil background
  ctx.fillStyle = 'hsl(22,40%,16%)';
  ctx.fillRect(farm.x, farm.y, FARM_W, FARM_H);
  ctx.strokeStyle = '#7a5a10';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(farm.x, farm.y, FARM_W, FARM_H);

  ctx.fillStyle = 'rgba(245,194,0,0.75)';
  ctx.font = '6px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('FARM', farm.x + FARM_W / 2, farm.y + 8);

  // Crop plots
  farm.crops.forEach(crop => {
    const px = farm.x + 5 + crop.col * PLOT_W;
    const py = farm.y + 10 + crop.row * PLOT_H;
    const pw = PLOT_W - 2;
    const ph = PLOT_H - 2;
    const cx = px + pw / 2;
    const cy = py + ph / 2;

    ctx.fillStyle = 'hsl(22,28%,12%)';
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'hsl(22,18%,22%)';
    ctx.lineWidth = 0.5;
    ctx.strokeRect(px, py, pw, ph);

    if (crop.stage === 1) {
      ctx.fillStyle = '#7a4e2a';
      ctx.beginPath();
      ctx.arc(cx, cy, 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (crop.stage === 2) {
      ctx.fillStyle = '#3a7a20';
      ctx.fillRect(cx - 1.5, py + 3, 3, ph - 5);
      ctx.fillStyle = '#4a9a30';
      ctx.fillRect(cx - 4, cy, 8, 2);
    } else if (crop.stage === 3) {
      ctx.fillStyle = '#3a7a20';
      ctx.fillRect(cx - 1.5, py + 2, 3, 6);
      ctx.fillStyle = '#f5c200';
      ctx.beginPath();
      ctx.arc(cx, cy + 3, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  });

  // Harvest bin
  const bin = farm.bin;
  ctx.fillStyle = '#6b4a0f';
  ctx.fillRect(bin.x, bin.y, BIN_W, BIN_H);
  ctx.strokeStyle = '#3e2800';
  ctx.lineWidth = 1;
  ctx.strokeRect(bin.x, bin.y, BIN_W, BIN_H);
  ctx.strokeStyle = '#4a3208';
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  ctx.moveTo(bin.x, bin.y + 7);  ctx.lineTo(bin.x + BIN_W, bin.y + 7);
  ctx.moveTo(bin.x, bin.y + 14); ctx.lineTo(bin.x + BIN_W, bin.y + 14);
  ctx.stroke();
  ctx.fillStyle = '#e8d898';
  ctx.font = '5px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('BIN', bin.x + BIN_W / 2, bin.y + 6);
  ctx.fillStyle = '#f5c200';
  ctx.font = '7px monospace';
  ctx.fillText(bin.amount, bin.x + BIN_W / 2, bin.y + 16);
}

function drawFarms() {
  farms.forEach(drawFarm);
}

// Ghost preview while in build mode.
function drawFarmGhost(x, y, valid) {
  ctx.save();
  ctx.globalAlpha = 0.55;
  ctx.strokeStyle = valid ? '#f5c200' : '#ff4040';
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(x, y, FARM_W, FARM_H);
  ctx.strokeRect(x + FARM_W + BIN_GAP, y + (FARM_H - BIN_H) / 2, BIN_W, BIN_H);
  ctx.setLineDash([]);
  ctx.fillStyle = valid ? 'rgba(245,194,0,0.07)' : 'rgba(255,60,60,0.14)';
  ctx.fillRect(x, y, FARM_W + BIN_GAP + BIN_W, FARM_H);
  ctx.restore();
}

// True if point (x,y) is inside any farm's footprint (farm + bin) plus `pad` pixels of padding.
function isBlockedByFarm(x, y, pad) {
  pad = pad || 0;
  return farms.some(f => {
    const fw = FARM_W + BIN_GAP + BIN_W;
    return x >= f.x - pad && x <= f.x + fw + pad &&
           y >= f.y - pad && y <= f.y + FARM_H + pad;
  });
}

function freePlot(farm) {
  return farm.crops.find(c => c.stage === 0 && !c.claimed) || null;
}

function readyPlot(farm) {
  return farm.crops.find(c => c.stage === 3 && !c.claimed) || null;
}
