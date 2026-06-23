function drawBee(x, y, scale, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  const hover = Math.sin(t * 4) * 2;
  ctx.translate(0, hover);

  const flap = Math.abs(Math.sin(t * 12)) * 0.6;

  // Left wing
  ctx.save();
  ctx.rotate(-flap - 0.3);
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-10, -8, 12, 6, -0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right wing
  ctx.save();
  ctx.rotate(flap + 0.3);
  ctx.fillStyle = 'rgba(180,220,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(10, -8, 12, 6, 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Body
  ctx.fillStyle = '#f5c200';
  ctx.beginPath();
  ctx.ellipse(0, 0, 10, 14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stripes
  ctx.fillStyle = '#1a1a1a';
  for (let i = -1; i <= 1; i++) {
    ctx.fillRect(-9, i * 7 - 2, 18, 4);
  }

  // Head
  ctx.fillStyle = '#1a1a1a';
  ctx.beginPath();
  ctx.arc(0, -14, 7, 0, Math.PI * 2);
  ctx.fill();

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(-3, -15, 2.2, 0, Math.PI * 2);
  ctx.arc(3, -15, 2.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#111';
  ctx.beginPath();
  ctx.arc(-3, -15, 1.1, 0, Math.PI * 2);
  ctx.arc(3, -15, 1.1, 0, Math.PI * 2);
  ctx.fill();

  // Antennae
  ctx.strokeStyle = '#1a1a1a';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(-3, -20);
  ctx.quadraticCurveTo(-10, -30, -7, -35);
  ctx.moveTo(3, -20);
  ctx.quadraticCurveTo(10, -30, 7, -35);
  ctx.stroke();
  ctx.fillStyle = '#f5c200';
  ctx.beginPath();
  ctx.arc(-7, -35, 2.5, 0, Math.PI * 2);
  ctx.arc(7, -35, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Stinger
  ctx.fillStyle = '#cc8800';
  ctx.beginPath();
  ctx.moveTo(-3, 13);
  ctx.lineTo(3, 13);
  ctx.lineTo(0, 20);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

// Top-down bee for the world view. angle = direction of travel (radians, 0 = east).
// Sprite faces local -y (north), so rotate by atan2(vy,vx) + PI/2 before calling.
// engaged: 0-1, drives the "on hind legs / looking at you" pose blend.
function drawBeeTop(x, y, angle, t, engaged, job) {
  engaged = engaged || 0;

  ctx.save();
  ctx.translate(x, y);

  // Screen-space bob while talking (up-down in canvas Y)
  if (engaged > 0) {
    ctx.translate(0, Math.sin(t * 6) * 2 * engaged);
  }

  ctx.rotate(angle);

  // Scale up when engaged (reared up / closer to camera feel)
  if (engaged > 0) {
    const s = 1 + 0.22 * engaged;
    ctx.scale(s, s);
  }

  // Wings: slow wide spread when talking, fast narrow flap otherwise
  const spreadExtra = engaged * 0.4;
  const wingW       = 4  + engaged * 2.5;
  const wingH       = 9  + engaged * 3;
  const wingAlpha   = 0.62 + engaged * 0.2;
  const flap = engaged > 0.3
    ? 0.55 + Math.sin(t * 3) * 0.1   // held wide, slow sway
    : Math.abs(Math.sin(t * 14)) * 0.35;

  // Drop shadow (larger when engaged)
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(1.5, 2, 6 + engaged * 2, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left wing
  ctx.save();
  ctx.translate(-5, -1);
  ctx.rotate(-flap - 0.15 - spreadExtra);
  ctx.fillStyle = `rgba(200,230,255,${wingAlpha})`;
  ctx.beginPath();
  ctx.ellipse(-5, -1, wingW, wingH, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right wing
  ctx.save();
  ctx.translate(5, -1);
  ctx.rotate(flap + 0.15 + spreadExtra);
  ctx.fillStyle = `rgba(200,230,255,${wingAlpha})`;
  ctx.beginPath();
  ctx.ellipse(5, -1, wingW, wingH, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Abdomen
  ctx.fillStyle = '#f5c200';
  ctx.beginPath();
  ctx.ellipse(0, 3, 5, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Stripes clipped to abdomen
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, 3, 5, 9, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = '#1a1a1a';
  [-1, 3, 7].forEach(yy => ctx.fillRect(-6, yy, 12, 2.5));
  ctx.restore();

  // Head
  ctx.fillStyle = '#2a1800';
  ctx.beginPath();
  ctx.arc(0, -7, 4, 0, Math.PI * 2);
  ctx.fill();

  // Eye glints — bigger & brighter when engaged (wide-eyed look)
  const eyeR     = 1.1 + engaged * 0.7;
  const eyeAlpha = 0.28 + engaged * 0.5;
  ctx.fillStyle = `rgba(255,255,255,${eyeAlpha})`;
  ctx.beginPath();
  ctx.arc(-1.5, -7.5, eyeR, 0, Math.PI * 2);
  ctx.arc( 1.5, -7.5, eyeR, 0, Math.PI * 2);
  ctx.fill();

  // Job accessory
  if (job === 'builder') {
    // Hard hat — yellow dome with brim, top-down view
    ctx.fillStyle = '#cc7008';
    ctx.beginPath();
    ctx.ellipse(0, -10, 5.5, 4.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f0a820';
    ctx.beginPath();
    ctx.ellipse(0, -10.5, 3.8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8a4a00';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, -10, 5.5, 4.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Dome highlight
    ctx.fillStyle = 'rgba(255,220,120,0.35)';
    ctx.beginPath();
    ctx.ellipse(-1, -11.5, 1.5, 1, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (job === 'farmer') {
    // Straw hat — wide brim + crown, top-down view
    ctx.fillStyle = '#b07828';
    ctx.beginPath();
    ctx.ellipse(0, -10, 7, 5.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6a4010';
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.ellipse(0, -10, 7, 5.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Crown
    ctx.fillStyle = '#d49840';
    ctx.beginPath();
    ctx.ellipse(0, -10, 3.2, 2.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7a4c12';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.ellipse(0, -10, 3.2, 2.5, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Straw texture dots
    ctx.fillStyle = 'rgba(160,100,20,0.5)';
    [[-1.5,-10.5],[1.2,-9.8],[0,-11],[2,-11],[-1,-9]].forEach(([px,py]) => {
      ctx.beginPath(); ctx.arc(px, py, 0.5, 0, Math.PI*2); ctx.fill();
    });
  } else if (job === 'banker') {
    // Monocle over right eye with chain
    ctx.strokeStyle = '#c8a820';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.arc(1.8, -7.5, 2.3, 0, Math.PI * 2);
    ctx.stroke();
    // Chain
    ctx.strokeStyle = '#c8a820';
    ctx.lineWidth = 0.4;
    ctx.beginPath();
    ctx.moveTo(3.9, -6.8);
    ctx.lineTo(4.8, -5.2);
    ctx.stroke();
    // Lens shine
    ctx.fillStyle = 'rgba(255,255,200,0.38)';
    ctx.beginPath();
    ctx.arc(0.9, -8.3, 0.8, 0, Math.PI * 2);
    ctx.fill();
  }

  // Front "legs" raised up when fully engaged — two short arms from head
  if (engaged > 0.55) {
    ctx.save();
    ctx.globalAlpha = (engaged - 0.55) / 0.45;
    ctx.strokeStyle = '#2a1800';
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-2.5, -8);  ctx.lineTo(-6,  -13); ctx.lineTo(-4.5, -15.5);
    ctx.moveTo( 2.5, -8);  ctx.lineTo( 6,  -13); ctx.lineTo( 4.5, -15.5);
    ctx.stroke();
    ctx.restore();
  }

  ctx.restore();
}
