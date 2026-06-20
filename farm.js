const FARM_W = 68;
const FARM_H = 50;
const CROP_COLS = 3;
const CROP_ROWS = 2;
const PLOT_W = 18;
const PLOT_H = 17;
const BIN_W = 18;
const BIN_H = 18;

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
    bin: { x: x + FARM_W + 5, y: y + (FARM_H - BIN_H) / 2, amount: 0 },
  };
}

function cropWorldPos(farm, crop) {
  return {
    x: farm.x + 5 + crop.col * PLOT_W + PLOT_W / 2,
    y: farm.y + 10 + crop.row * PLOT_H + PLOT_H / 2,
  };
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

function drawFarms() {
  farms.forEach(farm => {
    // Farm soil background
    ctx.fillStyle = 'hsl(22,40%,16%)';
    ctx.fillRect(farm.x, farm.y, FARM_W, FARM_H);
    ctx.strokeStyle = '#7a5a10';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(farm.x, farm.y, FARM_W, FARM_H);

    // FARM label
    ctx.fillStyle = 'rgba(245,194,0,0.75)';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('FARM', farm.x + FARM_W / 2, farm.y + 7);

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
        ctx.arc(cx, cy, 1.5, 0, Math.PI * 2);
        ctx.fill();
      } else if (crop.stage === 2) {
        ctx.fillStyle = '#3a7a20';
        ctx.fillRect(cx - 1, py + 2, 2, ph - 3);
        ctx.fillStyle = '#4a9a30';
        ctx.fillRect(cx - 3, cy, 6, 1.5);
      } else if (crop.stage === 3) {
        ctx.fillStyle = '#3a7a20';
        ctx.fillRect(cx - 1, py + 1, 2, 5);
        ctx.fillStyle = '#f5c200';
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 4, 0, Math.PI * 2);
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
    // Wood slats
    ctx.strokeStyle = '#4a3208';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(bin.x, bin.y + 6); ctx.lineTo(bin.x + BIN_W, bin.y + 6);
    ctx.moveTo(bin.x, bin.y + 12); ctx.lineTo(bin.x + BIN_W, bin.y + 12);
    ctx.stroke();
    ctx.fillStyle = '#e8d898';
    ctx.font = '5px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('BIN', bin.x + BIN_W / 2, bin.y + 5);
    ctx.fillStyle = '#f5c200';
    ctx.font = '6px monospace';
    ctx.fillText(bin.amount, bin.x + BIN_W / 2, bin.y + 14);
  });
}

function freePlot(farm) {
  return farm.crops.find(c => c.stage === 0 && !c.claimed) || null;
}

function readyPlot(farm) {
  return farm.crops.find(c => c.stage === 3 && !c.claimed) || null;
}
