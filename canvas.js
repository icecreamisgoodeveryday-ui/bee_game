const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const W = 480;
const H = 270;
canvas.width = W;
canvas.height = H;

function resize() {
  const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
  canvas.style.width = (W * scale) + 'px';
  canvas.style.height = (H * scale) + 'px';
}
window.addEventListener('resize', resize);
resize();
