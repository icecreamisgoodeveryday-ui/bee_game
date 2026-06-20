function drawSky(t) {
  const pulse = 0.5 + 0.5 * Math.sin(t * 0.4);
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, `hsl(${200 + pulse * 20},60%,${18 + pulse * 4}%)`);
  sky.addColorStop(1, `hsl(${30 + pulse * 10},50%,${10 + pulse * 2}%)`);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);
}

function drawTitle(t) {
  const bounce = Math.sin(t * 1.8) * 3;
  ctx.save();
  ctx.textAlign = 'center';

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.font = 'bold 52px serif';
  ctx.fillText('BEE GAME', W / 2 + 3, 80 + bounce + 3);

  ctx.shadowColor = '#f5c200';
  ctx.shadowBlur = 18 + Math.sin(t * 2) * 6;
  ctx.fillStyle = '#f5c200';
  ctx.fillText('BEE GAME', W / 2, 80 + bounce);
  ctx.shadowBlur = 0;

  ctx.font = '14px monospace';
  ctx.fillStyle = '#ffe88a';
  ctx.fillText('a game about bees', W / 2, 102 + bounce);
  ctx.restore();
}

function drawPrompt(t) {
  if (Math.floor(t * 2) % 2 === 0) return;
  ctx.save();
  ctx.textAlign = 'center';
  ctx.font = '13px monospace';
  ctx.fillStyle = '#fff9cc';
  ctx.globalAlpha = 0.85;
  ctx.fillText('[ press any key to start ]', W / 2, H - 22);
  ctx.restore();
}

function drawGround() {
  const grass = ctx.createLinearGradient(0, H - 8, 0, H);
  grass.addColorStop(0, '#3a7d1e');
  grass.addColorStop(1, '#1e4a0a');
  ctx.fillStyle = grass;
  ctx.fillRect(0, H - 8, W, 8);
}

let titleRaf = null;
let started = false;

function titleLoop(ts) {
  const t = ts / 1000;

  drawSky(t);

  hexes.forEach(h => {
    h.y -= h.speed;
    h.x += h.drift;
    if (h.y + h.r < 0) { h.y = H + h.r; h.x = Math.random() * W; }
    ctx.strokeStyle = `rgba(245,194,0,${h.alpha})`;
    ctx.lineWidth = 1;
    hexPath(h.x, h.y, h.r);
    ctx.stroke();
  });

  flowers.forEach(f => drawFlower(f.x, f.y, f.r, f.hue, t, f.phase));
  drawGround();
  drawTitle(t);
  drawBee(W / 2, 165, 1.3, t);
  drawPrompt(t);

  titleRaf = requestAnimationFrame(titleLoop);
}

function onTitleInput() {
  if (started) return;
  started = true;
  cancelAnimationFrame(titleRaf);
  startWorld();
}

window.addEventListener('keydown', onTitleInput);
window.addEventListener('pointerdown', onTitleInput);

titleRaf = requestAnimationFrame(titleLoop);
