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
function drawBeeTop(x, y, angle, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  const flap = Math.abs(Math.sin(t * 14)) * 0.35;

  // Drop shadow
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.beginPath();
  ctx.ellipse(1.5, 2, 6, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  // Left wing — pivots at attachment point on body side
  ctx.save();
  ctx.translate(-5, -1);
  ctx.rotate(-flap - 0.15);
  ctx.fillStyle = 'rgba(200,230,255,0.62)';
  ctx.beginPath();
  ctx.ellipse(-5, -1, 4, 9, -0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Right wing
  ctx.save();
  ctx.translate(5, -1);
  ctx.rotate(flap + 0.15);
  ctx.fillStyle = 'rgba(200,230,255,0.62)';
  ctx.beginPath();
  ctx.ellipse(5, -1, 4, 9, 0.25, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Abdomen (body ellipse, yellow base)
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

  // Eye glints
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.arc(-1.5, -7.5, 1.1, 0, Math.PI * 2);
  ctx.arc(1.5, -7.5, 1.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}
