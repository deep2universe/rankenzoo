// Zeichnet niedliche Ameisen in Seitenansicht (prozedural).

const PAL = {
  arbeiterin: { kopf: '#7a2f1c', brust: '#9b3b21', hinter: '#2b1a14', bein: '#3a2018' },
  drohne: { kopf: '#1f1b24', brust: '#2f2a36', hinter: '#1a1720', bein: '#25212b' },
  koenigin: { kopf: '#8a3a1e', brust: '#a8461f', hinter: '#3a2016', bein: '#3d2117' },
};

function ell(ctx, x, y, rx, ry, rot = 0) {
  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
}

function shiny(ctx, x, y, rx, ry, base, rot = 0) {
  const g = ctx.createRadialGradient(x - rx * 0.35, y - ry * 0.45, rx * 0.1, x, y, Math.max(rx, ry) * 1.1);
  g.addColorStop(0, lighten(base, 0.45));
  g.addColorStop(0.45, base);
  g.addColorStop(1, darken(base, 0.45));
  ctx.fillStyle = g;
  ell(ctx, x, y, rx, ry, rot);
  ctx.fill();
}

const cache = new Map();
function parse(c) {
  if (cache.has(c)) return cache.get(c);
  const v = parseInt(c.slice(1), 16);
  const r = [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  cache.set(c, r);
  return r;
}
function lighten(c, f) { const [r, g, b] = parse(c); return `rgb(${r + (255 - r) * f | 0},${g + (255 - g) * f | 0},${b + (255 - b) * f | 0})`; }
function darken(c, f) { const [r, g, b] = parse(c); return `rgb(${r * (1 - f) | 0},${g * (1 - f) | 0},${b * (1 - f) | 0})`; }

/**
 * @param o {x,y,L (Länge), dir (1|-1), tilt (rad), phase (Laufzyklus), rolle, acc, last, walking, wings}
 */
export function drawAnt(ctx, o) {
  const { x, y, L, dir = 1, tilt = 0, phase = 0, rolle = 'arbeiterin', acc, last, walking = true, alpha = 1 } = o;
  const p = PAL[rolle] ?? PAL.arbeiterin;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(tilt);
  ctx.scale(dir, 1);
  if (alpha < 1) ctx.globalAlpha = alpha;
  const q = rolle === 'koenigin';
  const gR = q ? 0.34 : rolle === 'drohne' ? 0.24 : 0.25; // Hinterleib-Größe

  // Schatten
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ell(ctx, -0.05 * L, 0.21 * L, 0.48 * L, 0.05 * L);
  ctx.fill();

  // Beine (hinten = dunkler)
  const legX = [-0.04, 0.05, 0.13];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let side = 0; side < 2; side++) {
    ctx.strokeStyle = side === 0 ? darken(p.bein, 0.3) : p.bein;
    ctx.lineWidth = Math.max(1, L * 0.035);
    for (let i = 0; i < 3; i++) {
      const ph = phase + i * 2.094 + side * Math.PI;
      const swing = walking ? Math.sin(ph) * 0.09 * L : 0;
      const lift = walking ? Math.max(0, Math.cos(ph)) * 0.05 * L : 0;
      const ax = legX[i] * L, ay = 0.0 * L;
      const kneeX = ax + (i - 1) * 0.12 * L + swing * 0.5;
      const kneeY = -0.06 * L - lift * 0.5;
      const footX = ax + (i - 1) * 0.2 * L + swing;
      const footY = 0.2 * L - lift;
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(kneeX, kneeY);
      ctx.lineTo(footX, footY);
      ctx.stroke();
    }
  }

  // Flügel (Drohne / junge Königin)
  if (o.wings) {
    const flap = Math.sin(phase * 3) * 0.15;
    ctx.fillStyle = 'rgba(220,240,255,0.55)';
    ctx.strokeStyle = 'rgba(150,190,220,0.8)';
    ctx.lineWidth = Math.max(0.6, L * 0.015);
    ctx.save();
    ctx.translate(0.02 * L, -0.08 * L);
    ctx.rotate(-0.35 + flap);
    ell(ctx, -0.28 * L, -0.08 * L, 0.36 * L, 0.1 * L);
    ctx.fill(); ctx.stroke();
    ctx.rotate(0.25);
    ell(ctx, -0.22 * L, -0.02 * L, 0.26 * L, 0.07 * L);
    ctx.fill(); ctx.stroke();
    ctx.restore();
  }

  // Hinterleib (Gaster)
  const gx = -(q ? 0.42 : 0.33) * L;
  shiny(ctx, gx, -0.03 * L, gR * L, gR * 0.74 * L, p.hinter, -0.15);
  // Streifen
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.lineWidth = Math.max(0.6, L * 0.02);
  for (let k = -1; k <= 1; k++) {
    ctx.beginPath();
    ctx.ellipse(gx + k * gR * 0.45 * L, -0.03 * L, gR * 0.12 * L, gR * 0.66 * L, -0.15, -1.2, 1.2);
    ctx.stroke();
  }
  // Stielchen
  shiny(ctx, -0.1 * L, -0.02 * L, 0.05 * L, 0.05 * L, p.brust);
  // Brust
  shiny(ctx, 0.04 * L, -0.03 * L, 0.14 * L, 0.085 * L, p.brust, -0.1);
  // Kopf
  const hx = 0.26 * L, hy = -0.08 * L, hr = (rolle === 'drohne' ? 0.1 : 0.13) * L;
  shiny(ctx, hx, hy, hr, hr * 0.92, p.kopf);
  // Mundwerkzeuge
  ctx.strokeStyle = darken(p.kopf, 0.4);
  ctx.lineWidth = Math.max(0.8, L * 0.025);
  ctx.beginPath();
  ctx.moveTo(hx + hr * 0.8, hy + hr * 0.4);
  ctx.quadraticCurveTo(hx + hr * 1.35, hy + hr * 0.55, hx + hr * 1.1, hy + hr * 0.9);
  ctx.stroke();
  // Auge (groß & freundlich)
  const er = (rolle === 'drohne' ? 0.06 : 0.05) * L;
  ctx.fillStyle = '#fff';
  ell(ctx, hx + hr * 0.35, hy - hr * 0.2, er, er * 1.1);
  ctx.fill();
  ctx.fillStyle = '#111';
  ell(ctx, hx + hr * 0.45, hy - hr * 0.15, er * 0.55, er * 0.65);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ell(ctx, hx + hr * 0.52, hy - hr * 0.3, er * 0.22, er * 0.22);
  ctx.fill();
  // Fühler
  const wig = Math.sin(phase * 0.7) * 0.04 * L;
  ctx.strokeStyle = p.kopf;
  ctx.lineWidth = Math.max(0.8, L * 0.028);
  for (const off of [0, 0.05 * L]) {
    ctx.beginPath();
    ctx.moveTo(hx + hr * 0.2 - off * 0.3, hy - hr * 0.8);
    const ex = hx + hr * 0.5 - off, ey = hy - hr * 2.1 + wig;
    ctx.lineTo(ex, ey);
    ctx.lineTo(ex + 0.16 * L, ey + 0.05 * L - wig);
    ctx.stroke();
    ctx.fillStyle = p.kopf;
    ell(ctx, ex + 0.16 * L, ey + 0.05 * L - wig, L * 0.022, L * 0.022);
    ctx.fill();
  }

  // Accessoires
  if (q) drawCrown(ctx, hx - hr * 0.1, hy - hr * 0.95, hr * 1.2);
  if (acc) drawAcc(ctx, acc, hx, hy, hr, L);

  // Last
  if (last) drawLoad(ctx, last, hx + hr * 1.3, hy + hr * 0.5, L);
  ctx.restore();
}

function drawCrown(ctx, x, y, s) {
  ctx.save();
  ctx.translate(x, y);
  const g = ctx.createLinearGradient(0, -s, 0, s * 0.2);
  g.addColorStop(0, '#fff3a6');
  g.addColorStop(1, '#e0a400');
  ctx.fillStyle = g;
  ctx.strokeStyle = '#a06c00';
  ctx.lineWidth = Math.max(0.6, s * 0.08);
  ctx.beginPath();
  ctx.moveTo(-s * 0.6, 0);
  ctx.lineTo(-s * 0.6, -s * 0.55);
  ctx.lineTo(-s * 0.3, -s * 0.25);
  ctx.lineTo(0, -s * 0.75);
  ctx.lineTo(s * 0.3, -s * 0.25);
  ctx.lineTo(s * 0.6, -s * 0.55);
  ctx.lineTo(s * 0.6, 0);
  ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff4f7a';
  ctx.beginPath(); ctx.arc(0, -s * 0.2, s * 0.12, 0, 7); ctx.fill();
  ctx.restore();
}

function drawAcc(ctx, acc, hx, hy, hr, L) {
  ctx.save();
  ctx.lineWidth = Math.max(0.7, L * 0.025);
  const top = hy - hr * 0.85;
  switch (acc) {
    case 'kochmuetze': {
      ctx.fillStyle = '#ffffff'; ctx.strokeStyle = '#cfcfcf';
      ctx.fillRect(hx - hr * 0.7, top - hr * 0.45, hr * 1.4, hr * 0.5);
      ctx.beginPath();
      ctx.arc(hx - hr * 0.4, top - hr * 0.7, hr * 0.45, 0, 7);
      ctx.arc(hx + hr * 0.1, top - hr * 0.95, hr * 0.5, 0, 7);
      ctx.arc(hx + hr * 0.55, top - hr * 0.7, hr * 0.42, 0, 7);
      ctx.fill();
      break;
    }
    case 'doktorhut': {
      ctx.fillStyle = '#20202a';
      ctx.fillRect(hx - hr * 0.6, top - hr * 0.35, hr * 1.2, hr * 0.45);
      ctx.beginPath();
      ctx.moveTo(hx - hr * 1.1, top - hr * 0.35);
      ctx.lineTo(hx + hr * 0.1, top - hr * 0.75);
      ctx.lineTo(hx + hr * 1.2, top - hr * 0.35);
      ctx.lineTo(hx, top - hr * 0.05);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#ffd34d';
      ctx.beginPath(); ctx.moveTo(hx + hr * 0.1, top - hr * 0.4); ctx.lineTo(hx + hr * 1.0, top - hr * 0.2); ctx.lineTo(hx + hr * 1.0, top + hr * 0.4); ctx.stroke();
      break;
    }
    case 'strohhut': {
      ctx.fillStyle = '#f2cf6b'; ctx.strokeStyle = '#b8902f';
      ell(ctx, hx, top, hr * 1.25, hr * 0.22); ctx.fill(); ctx.stroke();
      ell(ctx, hx, top - hr * 0.3, hr * 0.6, hr * 0.42); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8584a'; ctx.fillRect(hx - hr * 0.6, top - hr * 0.12, hr * 1.2, hr * 0.12);
      break;
    }
    case 'muetze': {
      ctx.fillStyle = '#3d8bff';
      ctx.beginPath(); ctx.arc(hx, top + hr * 0.15, hr * 0.7, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#245fc0';
      ell(ctx, hx + hr * 0.75, top + hr * 0.12, hr * 0.55, hr * 0.12); ctx.fill();
      break;
    }
    case 'haube': {
      ctx.fillStyle = '#ffffff';
      ctx.beginPath(); ctx.arc(hx - hr * 0.1, top + hr * 0.2, hr * 0.68, Math.PI * 1.05, -0.05); ctx.fill();
      ctx.fillStyle = '#ff6fa5';
      ctx.beginPath();
      const cx = hx - hr * 0.1, cy = top - hr * 0.15, s = hr * 0.16;
      ctx.moveTo(cx, cy + s); ctx.bezierCurveTo(cx - s * 2, cy - s * 0.5, cx - s * 0.5, cy - s * 1.6, cx, cy - s * 0.4);
      ctx.bezierCurveTo(cx + s * 0.5, cy - s * 1.6, cx + s * 2, cy - s * 0.5, cx, cy + s);
      ctx.fill();
      break;
    }
    case 'brille': {
      ctx.strokeStyle = '#222'; ctx.lineWidth = Math.max(0.8, L * 0.02);
      ctx.beginPath(); ctx.arc(hx + hr * 0.45, hy - hr * 0.15, hr * 0.32, 0, 7); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + hr * 0.13, hy - hr * 0.2); ctx.lineTo(hx - hr * 0.5, hy - hr * 0.3); ctx.stroke();
      break;
    }
    case 'sonnenbrille': {
      ctx.fillStyle = '#111';
      ell(ctx, hx + hr * 0.45, hy - hr * 0.15, hr * 0.38, hr * 0.26); ctx.fill();
      ctx.strokeStyle = '#111'; ctx.beginPath(); ctx.moveTo(hx + hr * 0.1, hy - hr * 0.2); ctx.lineTo(hx - hr * 0.5, hy - hr * 0.3); ctx.stroke();
      break;
    }
    case 'stirnband': {
      ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = Math.max(1, hr * 0.28);
      ctx.beginPath(); ctx.arc(hx, hy, hr * 0.95, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      break;
    }
    case 'schleife': {
      ctx.fillStyle = '#ff5fa2';
      const bx = hx - hr * 0.3, by = top + hr * 0.05;
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx - hr * 0.6, by - hr * 0.35); ctx.lineTo(bx - hr * 0.6, by + hr * 0.35); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + hr * 0.6, by - hr * 0.35); ctx.lineTo(bx + hr * 0.6, by + hr * 0.35); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff9cc8'; ctx.beginPath(); ctx.arc(bx, by, hr * 0.16, 0, 7); ctx.fill();
      break;
    }
    case 'kiste': {
      ctx.fillStyle = '#c98b4a'; ctx.strokeStyle = '#7d5124';
      ctx.fillRect(-0.12 * L, -0.3 * L, 0.24 * L, 0.18 * L);
      ctx.strokeRect(-0.12 * L, -0.3 * L, 0.24 * L, 0.18 * L);
      break;
    }
  }
  ctx.restore();
}

function drawLoad(ctx, last, x, y, L) {
  ctx.save();
  ctx.translate(x, y);
  if (last === 'blatt') {
    ctx.rotate(-0.6);
    ctx.fillStyle = '#5cc94a'; ctx.strokeStyle = '#2f8a2a'; ctx.lineWidth = Math.max(0.6, L * 0.015);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.quadraticCurveTo(L * 0.22, -L * 0.25, 0, -L * 0.5);
    ctx.quadraticCurveTo(-L * 0.22, -L * 0.25, 0, 0);
    ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -L * 0.45); ctx.stroke();
  } else if (last === 'krume') {
    ctx.fillStyle = '#f0c27a'; ctx.strokeStyle = '#b07a35';
    ctx.beginPath(); ctx.arc(L * 0.03, -L * 0.04, L * 0.09, 0, 7); ctx.fill(); ctx.stroke();
  } else if (last === 'tropfen') {
    ctx.fillStyle = '#ffc93c';
    ctx.beginPath(); ctx.arc(L * 0.03, -L * 0.03, L * 0.075, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.arc(L * 0.01, -L * 0.06, L * 0.025, 0, 7); ctx.fill();
  } else if (last === 'erde') {
    ctx.fillStyle = '#6b4428';
    ctx.beginPath(); ctx.arc(L * 0.03, -L * 0.03, L * 0.08, 0, 7); ctx.fill();
  } else if (last === 'ei') {
    ctx.fillStyle = '#fffaf0';
    ell(ctx, L * 0.03, -L * 0.03, L * 0.05, L * 0.07, 0.4); ctx.fill();
  }
  ctx.restore();
}

export function drawEgg(ctx, x, y, s) {
  ctx.fillStyle = '#fffaf0';
  ctx.strokeStyle = 'rgba(180,160,120,.6)';
  ctx.lineWidth = 0.7;
  ell(ctx, x, y, s * 0.55, s * 0.75, 0.3);
  ctx.fill(); ctx.stroke();
}

export function drawLarva(ctx, x, y, s, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 2 + x) * 0.15);
  const g = ctx.createRadialGradient(-s * 0.2, -s * 0.2, 0, 0, 0, s * 1.2);
  g.addColorStop(0, '#fffdf3'); g.addColorStop(1, '#ead9b0');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 1.0, s * 0.7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(170,140,90,.5)';
  ctx.lineWidth = 0.6;
  for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(i * s * 0.35, 0, s * 0.62, -1.1, 1.1); ctx.stroke(); }
  ctx.fillStyle = '#3a2a1a';
  ctx.beginPath(); ctx.arc(s * 0.75, -s * 0.15, s * 0.1, 0, 7); ctx.fill();
  ctx.restore();
}

export function drawPupa(ctx, x, y, s) {
  const g = ctx.createLinearGradient(x, y - s, x, y + s);
  g.addColorStop(0, '#f6e2b3'); g.addColorStop(1, '#cfa767');
  ctx.fillStyle = g;
  ctx.strokeStyle = 'rgba(120,85,40,.6)';
  ctx.lineWidth = 0.7;
  ell(ctx, x, y, s * 1.25, s * 0.62, -0.1);
  ctx.fill(); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.55); ctx.lineTo(x - s * 0.3, y + s * 0.55); ctx.stroke();
}
