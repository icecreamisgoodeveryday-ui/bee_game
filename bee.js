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
