// Das Revier: die Welt rund um den Ameisenhügel – von oben gesehen.
// Hier gibt die Königin Befehle: Sammel-Trupps zu Futterquellen schicken, Wächterinnen
// abstellen, Expeditionen in den Nebel senden und mit Nachbarvölkern handeln.
import { REVIER, QUELLEN, STOERER, FUNDE, GEBAEUDE } from './config.js';
import { mulberry32, clamp } from '../util.js';
import { emit } from '../events.js';

const { W, H } = REVIER;
export const NEST = { x: Math.floor(W / 2), y: Math.floor(H / 2) };
const ti = (x, y) => y * W + x;
export const distNest = q => Math.hypot(q.x + 0.5 - (NEST.x + 0.5), q.y + 0.5 - (NEST.y + 0.5));

// ---------------------------------------------------------------- Lager (Zelte)
export const LAGER_TYPEN = ['zelt', 'basislager', 'aussenposten'];
export const lagerTyp = l => LAGER_TYPEN[Math.min(2, (l.stufe ?? 1) - 1)];
const lagerFertig = r => (r.lager ?? []).filter(l => l.bau >= 1);

/** Nächster Stützpunkt (Hügel oder fertiges Lager) zu einem Punkt: { x, y, lager|null, d } */
export function naechsteBasis(r, x, y) {
  let best = { x: NEST.x, y: NEST.y, lager: null, d: Math.hypot(x - NEST.x, y - NEST.y) };
  for (const l of lagerFertig(r)) {
    const d = Math.hypot(x - l.x, y - l.y);
    if (d < best.d) best = { x: l.x, y: l.y, lager: l, d };
  }
  return best;
}
/** Weg einer Quelle zum nächsten Stützpunkt (Lager verkürzen die Wege der Sammlerinnen). */
export const distBasis = (r, q) => naechsteBasis(r, q.x, q.y).d;

/** Darf hier ein Zelt stehen? */
export function lagerPlatz(r, x, y) {
  if (x < 1 || y < 1 || x >= W - 1 || y >= H - 1) return { ok: false, grund: 'Zu nah am Rand.' };
  if (!r.sicht[ti(x, y)]) return { ok: false, grund: 'Im Nebel kann man kein Zelt aufstellen – erst erkunden!' };
  if (Math.hypot(x - NEST.x, y - NEST.y) < 4.5) return { ok: false, grund: 'Zu nah am Hügel – Zelte gehören weiter hinaus.' };
  if ((r.lager ?? []).some(l => Math.hypot(l.x - x, l.y - y) < 4)) return { ok: false, grund: 'Hier steht schon ein Lager in der Nähe.' };
  if (r.quellen.some(q => (q.entdeckt || q.typ === 'schatz') && q.menge > 0 && Math.hypot(q.x - x, q.y - y) < 1.2)) return { ok: false, grund: 'Da ist schon etwas – stell das Zelt daneben.' };
  if ((r.lager ?? []).length >= REVIER.maxLager) return { ok: false, grund: `Mehr als ${REVIER.maxLager} Lager kann dein Volk nicht versorgen.` };
  return { ok: true };
}

export function lagerKosten(r) {
  const G = GEBAEUDE.zelt, n = (r.lager ?? []).length;
  return { sterne: Math.round(G.kosten * (1 + 0.35 * n)), material: Math.round(G.material * (1 + 0.35 * n)) };
}

/** Zelt aufstellen (Bauplan „Zelt" nötig). */
export function baueLager(state, x, y) {
  const r = state.revier;
  if (!state.bauplaene?.zelt) return { ok: false, grund: 'Dafür brauchst du den Bauplan „Expeditions-Zelt" aus dem Quiz.' };
  x = Math.round(x); y = Math.round(y);
  const p = lagerPlatz(r, x, y);
  if (!p.ok) return p;
  const k = lagerKosten(r);
  if (state.res.sterne < k.sterne) return { ok: false, grund: `Du brauchst ${k.sterne} ⭐.` };
  if ((state.res.material ?? 0) < k.material) return { ok: false, grund: `Du brauchst ${k.material} 🪵 Baumaterial.` };
  state.res.sterne -= k.sterne; state.res.material -= k.material;
  const l = { id: r.nextLager++, x, y, stufe: 1, bau: 0 };
  (r.lager ??= []).push(l);
  emit('lagerStart', l);
  return { ok: true, lager: l };
}

/** Ausbau eines Lagers zur nächsten Stufe: { ziel, frei, ok, grund, kosten } oder null */
export function lagerAusbauInfo(state, l) {
  if (l.stufe >= 3) return null;
  const ziel = LAGER_TYPEN[l.stufe];
  const G = GEBAEUDE[ziel];
  const kosten = { sterne: G.kosten, material: G.material };
  const frei = !!state.bauplaene?.[ziel];
  let grund = null;
  if (!frei) grund = `Bauplan „${G.name}" fehlt – gewinne ihn im Quiz.`;
  else if (l.bau < 1) grund = 'Wird gerade gebaut …';
  else if (state.res.sterne < kosten.sterne) grund = `Du brauchst ${kosten.sterne} ⭐.`;
  else if ((state.res.material ?? 0) < kosten.material) grund = `Du brauchst ${kosten.material} 🪵.`;
  return { ziel, frei, ok: !grund, grund, kosten };
}
export function lagerAusbauen(state, l) {
  const info = lagerAusbauInfo(state, l);
  if (!info?.ok) return { ok: false, grund: info?.grund ?? 'Höchste Stufe erreicht.' };
  state.res.sterne -= info.kosten.sterne; state.res.material -= info.kosten.material;
  l.stufe++; l.bau = 0;
  return { ok: true };
}

/** Effekte der Lager für derive(): Außenposten schenken eine Expedition mehr. */
export function lagerEffekte(r) {
  const fx = { expSlots: 0 };
  for (const l of lagerFertig(r)) if (l.stufe >= 3) fx.expSlots += 1;
  return fx;
}

/** Neues Revier erzeugen (deterministisch aus dem Seed). */
export function createRevier(seed) {
  const rnd = mulberry32(seed * 7 + 13);
  const quellen = [];
  let id = 1;
  const frei = (x, y, abst = 2.6) => x > 1 && y > 1 && x < W - 2 && y < H - 2 &&
    Math.hypot(x - NEST.x, y - NEST.y) > 2.5 && quellen.every(q => Math.hypot(q.x - x, q.y - y) >= abst);
  const setze = (typ, dMin, dMax, extra = {}) => {
    for (let k = 0; k < 400; k++) {
      const a = rnd() * Math.PI * 2, d = dMin + rnd() * (dMax - dMin);
      const x = Math.round(NEST.x + Math.cos(a) * d * 1.25), y = Math.round(NEST.y + Math.sin(a) * d * 0.85);
      if (!frei(x, y, extra.abst)) continue;
      const Q = QUELLEN[typ];
      const q = { id: id++, typ, x, y, menge: Q.menge, max: Q.menge, entdeckt: false };
      quellen.push(q);
      return q;
    }
    return null;
  };
  // nah am Nest: sicherer Start
  const start = [setze('beeren', 2.8, 3.4), setze('zweige', 2.8, 3.4), setze('klee', 3.2, 4.2)];
  // Mittelfeld
  setze('blattlaus', 5, 8); setze('samen', 5, 9); setze('tau', 6, 9); setze('harz', 6, 10); setze('zweige', 7, 11);
  setze('blumen', 6, 10); setze('loewenzahn', 7, 11);
  // weit draußen
  setze('zucker', 10, 15); setze('kristall', 9, 14); setze('beeren', 10, 15); setze('blattlaus', 11, 16);
  setze('harz', 12, 17); setze('samen', 12, 17); setze('kristall', 14, 18); setze('tau', 13, 18);
  setze('blumen', 12, 18); setze('pilzring', 11, 17); setze('eichel', 13, 19); setze('klee', 14, 20);
  // ganz weit draußen (größeres Revier)
  setze('loewenzahn', 17, 23); setze('zucker', 18, 24); setze('kristall', 18, 24); setze('pilzring', 17, 23);
  setze('eichel', 18, 24); setze('blumen', 19, 24); setze('beeren', 18, 24); setze('tau', 19, 24);
  setze('nachbar', 15, 20, { abst: 5 });
  for (let i = 0; i < 5; i++) setze('schatz', 8 + i * 3.2, 12 + i * 3.2, { abst: 4 });
  // Fundstücke im Nebel
  const funde = Object.keys(FUNDE);
  for (let i = funde.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [funde[i], funde[j]] = [funde[j], funde[i]]; }
  funde.slice(0, 14).forEach((f, i) => { const q = setze('fund', 6 + (i % 7) * 2.6, 9 + (i % 7) * 2.6 + 3, { abst: 2.2 }); if (q) q.fund = f; });
  const r = {
    seed, quellen, nextId: id,
    sicht: new Array(W * H).fill(0),
    trupps: {},            // quelleId -> { s: Sammlerinnen, w: Wächterinnen }
    exp: [], nextExp: 1,   // Expeditionen
    stoererTimer: 75, wetter: { typ: 'sonne', t: 0 }, wetterTimer: 200,
    handel: { angebote: [], timer: 0 },
    gefunden: 0, vertrieben: 0, expeditionen: 0,
    besucht: false,
    lager: [], nextLager: 1,  // Zelte, Basislager, Außenposten
    sammlung: [],             // gefundene Fundstücke (Schlüssel aus FUNDE)
  };
  aufdecken(r, NEST.x, NEST.y, REVIER.startSicht);
  for (const q of start) if (q) aufdecken(r, q.x, q.y, 1.6);
  return r;
}

/** Sichtkreis aufdecken; gibt neu entdeckte Quellen zurück. */
export function aufdecken(r, cx, cy, rad) {
  let neu = 0;
  const x0 = Math.max(0, Math.floor(cx - rad)), x1 = Math.min(W - 1, Math.ceil(cx + rad));
  const y0 = Math.max(0, Math.floor(cy - rad)), y1 = Math.min(H - 1, Math.ceil(cy + rad));
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (Math.hypot(x + 0.5 - cx - 0.5, y + 0.5 - cy - 0.5) > rad) continue;
    if (!r.sicht[ti(x, y)]) { r.sicht[ti(x, y)] = 1; neu++; }
  }
  const entdeckt = [];
  if (neu) {
    r.sichtVersion = (r.sichtVersion ?? 0) + 1;
    for (const q of r.quellen) {
      if (!q.entdeckt && r.sicht[ti(q.x, q.y)]) { q.entdeckt = true; entdeckt.push(q); }
    }
  }
  return entdeckt;
}

export const sichtbar = (r, x, y) => x >= 0 && y >= 0 && x < W && y < H && !!r.sicht[ti(x, y)];
export const erkundetAnteil = r => r.sicht.reduce((a, b) => a + b, 0) / r.sicht.length;

/** Wie viele Arbeiterinnen hat die Königin draußen eingeplant? */
export function revierBedarf(r) {
  let s = 0, w = 0;
  for (const t of Object.values(r.trupps)) { s += t.s ?? 0; w += t.w ?? 0; }
  const e = r.exp.reduce((a, x) => a + x.n, 0);
  return { s, w, e, summe: s + w + e };
}

export function setzeTrupp(r, quelleId, art, delta, maxFrei = Infinity) {
  const q = r.quellen.find(q => q.id === quelleId);
  if (!q || !q.entdeckt || !QUELLEN[q.typ].gibt) return false;
  const t = (r.trupps[quelleId] ??= { s: 0, w: 0 });
  const vorher = t[art];
  t[art] = clamp(t[art] + Math.min(delta, maxFrei), 0, 60);
  if (!t.s && !t.w) delete r.trupps[quelleId];
  return (r.trupps[quelleId]?.[art] ?? 0) !== vorher;
}

export function expSlots(fx) { return 1 + Math.round(fx.expSlots ?? 0); }

export function sendeExpedition(r, tx, ty, n, fx) {
  if (r.exp.length >= expSlots(fx)) return { ok: false, grund: `Alle ${expSlots(fx)} Expeditions-Plätze sind unterwegs.` };
  tx = clamp(Math.round(tx), 0, W - 1); ty = clamp(Math.round(ty), 0, H - 1);
  if (tx === NEST.x && ty === NEST.y) return { ok: false, grund: 'Das ist ja euer eigener Hügel!' };
  const b = naechsteBasis(r, tx, ty);
  const e = { id: r.nextExp++, x: b.x, y: b.y, hx: b.x, hy: b.y, lager: b.lager?.id ?? null, tx, ty, n, phase: 'hin', t: 0, fund: null };
  r.exp.push(e);
  r.expeditionen++;
  emit('expStart', e);
  return { ok: true, e };
}

/** Erträge aus den Trupps (pro Sekunde). faktor < 1, wenn zu wenige Ameisen frei sind. */
export function revierRaten(state, fx, faktor = 1, tagPhase = 0.3) {
  const r = state.revier;
  const out = { nahrung: 0, material: 0, sterne: 0, tau: 0, pollen: 0, pro: new Map() };
  const regen = r.wetter.typ === 'regen';
  const nacht = tagPhase > 0.72 || tagPhase < 0.06;
  for (const [qid, t] of Object.entries(r.trupps)) {
    const q = r.quellen.find(x => x.id === +qid);
    if (!q) continue;
    const Q = QUELLEN[q.typ];
    const n = (t.s ?? 0) * faktor;
    if (!n || !Q.gibt) { out.pro.set(q.id, 0); continue; }
    if (Q.gibt === 'tau') { const v = n * 3 * (regen ? 1.3 : 1); out.tau += v; out.pro.set(q.id, v); continue; }
    const df = 1 / (1 + distBasis(r, q) / 14);
    let bonus = 1 + (fx.revierBonus ?? 0) + (fx.sammelBonus ?? 0) * 0.5 + (Q.gibt === 'nahrung' ? fx.quelleNahrung ?? 0 : 0);
    bonus *= 1 + (fx.tempo ?? 0);
    const v = Q.rate * (n / (1 + n / 14)) * df * bonus * (regen ? 0.45 : 1) * (nacht ? 0.6 : 1) * (q.stoerer ? 0.3 : 1) * (q.menge > 0.5 ? 1 : 0);
    out[Q.gibt] += v;
    if (Q.pollen) out.pollen += v;
    out.pro.set(q.id, v);
  }
  return out;
}

function belohnung(rnd, fx) {
  const b = 1 + (fx.schatzBonus ?? 0);
  return { sterne: Math.round((30 + rnd * 40) * b), material: Math.round((15 + rnd * 25) * b), plan: rnd > 0.35, joker: rnd < 0.35 ? 1 : 0 };
}

/** Ein Revier-Schritt: Erträge, Expeditionen, Störenfriede, Wetter, Handel. */
export function revierTick(state, d, dt) {
  const r = state.revier;
  const fx = d.fx;
  // Erträge verbuchen & Quellen leeren
  const raten = d.revier;
  state.res.material = (state.res.material ?? 0) + raten.material * dt;
  state._revSterne = (state._revSterne ?? 0) + raten.sterne * dt;
  if (state._revSterne >= 1) { const n = Math.floor(state._revSterne); state.res.sterne += n; state._revSterne -= n; }
  for (const q of r.quellen) {
    const Q = QUELLEN[q.typ];
    const v = raten.pro.get(q.id) ?? 0;
    if (v && Q.gibt !== 'tau') {
      const vorher = q.menge;
      q.menge = Math.max(0, q.menge - v * dt * (Q.gibt === 'sterne' ? 8 : 1));
      if (vorher > 0.5 && q.menge <= 0.5) emit('quelleLeer', q);
    }
    if (Q.regen) q.menge = Math.min(q.max, q.menge + Q.regen * (1 + (fx.quelleNachwuchs ?? 0)) * dt * (r.wetter.typ === 'regen' ? 1.6 : 1));
  }
  // Expeditionen
  const tempo = REVIER.expTempo * (1 + (fx.expTempo ?? 0)) * (r.wetter.typ === 'regen' ? 0.6 : 1);
  const sichtR = REVIER.expSicht + (fx.sicht ?? 0) * 0.8;
  for (const e of [...r.exp]) {
    const speed = tempo * (0.85 + 0.08 * e.n);
    if (e.phase === 'suche') {
      e.t += dt;
      if (e.t >= 2.5) {
        e.phase = 'heim';
        // Schätze in der Nähe einsammeln
        for (const q of r.quellen) {
          if (q.typ !== 'schatz' || q.menge <= 0 || Math.hypot(q.x - e.tx, q.y - e.ty) > 1.6) continue;
          q.menge = 0; q.entdeckt = true;
          e.fund = belohnung(Math.random(), fx);
          r.gefunden++;
        }
        for (const q of r.quellen) {
          if (q.typ !== 'fund' || q.menge <= 0 || Math.hypot(q.x - e.tx, q.y - e.ty) > 1.6) continue;
          q.menge = 0; q.entdeckt = true;
          e.fundstueck = q.fund;
        }
        if (!e.fund && !e.fundstueck && Math.random() < 0.45) e.fund = { sterne: 4 + Math.round(Math.random() * 8), material: Math.round(Math.random() * 10), klein: true };
      }
      continue;
    }
    const zx = e.phase === 'hin' ? e.tx : (e.hx ?? NEST.x), zy = e.phase === 'hin' ? e.ty : (e.hy ?? NEST.y);
    const dx = zx - e.x, dy = zy - e.y, dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= step) {
      e.x = zx; e.y = zy;
      if (e.phase === 'hin') { e.phase = 'suche'; e.t = 0; }
      else {
        r.exp = r.exp.filter(x => x !== e);
        if (e.fund) {
          state.res.sterne += e.fund.sterne ?? 0;
          state.res.material = (state.res.material ?? 0) + (e.fund.material ?? 0);
          if (e.fund.joker) state.res.joker = Math.min(9, state.res.joker + e.fund.joker);
        }
        if (e.fundstueck && FUNDE[e.fundstueck]) {
          const F = FUNDE[e.fundstueck];
          (r.sammlung ??= []).includes(e.fundstueck) || r.sammlung.push(e.fundstueck);
          for (const [k, v] of Object.entries(F.lohn)) state.res[k] = (state.res[k] ?? 0) + v;
        }
        emit('expHeim', e);
      }
    } else { e.x += (dx / dist) * step; e.y += (dy / dist) * step; }
    const neu = aufdecken(r, e.x, e.y, sichtR + e.n * 0.12);
    for (const q of neu) emit('quelleEntdeckt', q);
  }
  // Lager: Erkunderinnen bauen Zelte selbst auf; fertige Lager lüften den Nebel ringsum
  for (const l of r.lager ?? []) {
    if (l.bau >= 1) continue;
    l.bau = Math.min(1, l.bau + dt / (GEBAEUDE[lagerTyp(l)]?.bauzeit ?? 12));
    if (l.bau >= 1) {
      const neu = aufdecken(r, l.x, l.y, (GEBAEUDE[lagerTyp(l)]?.sicht ?? 3) + (fx.sicht ?? 0) * 0.5);
      for (const q of neu) emit('quelleEntdeckt', q);
      emit('lagerFertig', l);
    }
  }
  // Störenfriede
  r.stoererTimer -= dt;
  if (r.stoererTimer <= 0) {
    r.stoererTimer = 80 + Math.random() * 90;
    const kandidaten = r.quellen.filter(q => q.entdeckt && !q.stoerer && QUELLEN[q.typ].stoerer.length);
    const mitTrupp = kandidaten.filter(q => r.trupps[q.id]?.s);
    const pool = mitTrupp.length ? mitTrupp : kandidaten;
    if (pool.length) {
      const q = pool[Math.floor(Math.random() * pool.length)];
      const typ = QUELLEN[q.typ].stoerer[Math.floor(Math.random() * QUELLEN[q.typ].stoerer.length)];
      q.stoerer = { typ, kraft: STOERER[typ].staerke * 8, max: STOERER[typ].staerke * 8, t: 0 };
      emit('stoerer', q);
    }
  }
  for (const q of r.quellen) {
    if (!q.stoerer) continue;
    const w = r.trupps[q.id]?.w ?? 0;
    q.stoerer.t += dt;
    q.stoerer.kraft -= w * d.revierFaktor * (1 + (fx.wacheStaerke ?? 0)) * dt;
    if (q.stoerer.kraft <= 0) {
      const typ = q.stoerer.typ;
      q.stoerer = null; r.vertrieben++;
      state.res.sterne += 8;
      emit('vertrieben', { q, typ });
    } else if (q.stoerer.t > 100) { q.stoerer = null; emit('stoererWeg', q); }
  }
  // Wetter
  r.wetterTimer -= dt;
  if (r.wetterTimer <= 0) {
    if (r.wetter.typ === 'regen') { r.wetter = { typ: 'sonne', t: 0 }; r.wetterTimer = 180 + Math.random() * 160; emit('wetter', 'sonne'); }
    else { r.wetter = { typ: 'regen', t: 0 }; r.wetterTimer = 30 + Math.random() * 15; emit('wetter', 'regen'); }
  }
  r.wetter.t += dt;
  // Handel
  r.handel.timer -= dt;
  if (r.handel.timer <= 0 || !r.handel.angebote.length) { r.handel.timer = 120; r.handel.angebote = neueAngebote(fx); }
}

export function handelMoeglich(state, fx) {
  const nachbar = state.revier.quellen.find(q => q.typ === 'nachbar' && q.entdeckt);
  if (!nachbar) return { ok: false, grund: 'Entdecke zuerst ein Nachbarvolk im Nebel (Expedition!).' };
  if ((fx.handel ?? 0) < 1) return { ok: false, grund: 'Erforsche „Diplomatie" oder baue einen Handelsposten.' };
  return { ok: true };
}

function neueAngebote(fx) {
  const g = (fx.handel ?? 0) >= 2 ? 1.3 : 1;
  const alle = [
    { gib: { nahrung: 60 }, bekomm: { material: Math.round(22 * g) } },
    { gib: { material: 30 }, bekomm: { nahrung: Math.round(70 * g) } },
    { gib: { nahrung: 50 }, bekomm: { sterne: Math.round(18 * g) } },
    { gib: { material: 25 }, bekomm: { sterne: Math.round(20 * g) } },
    { gib: { sterne: 30 }, bekomm: { material: Math.round(28 * g) } },
    { gib: { nahrung: 40, material: 10 }, bekomm: { fp: Math.round(8 * g) } },
    { gib: { sterne: 40 }, bekomm: { gang: Math.round(6 * g) } },
  ];
  const out = [];
  while (out.length < 3) { const a = alle[Math.floor(Math.random() * alle.length)]; if (!out.includes(a)) out.push(a); }
  return out.map(a => ({ ...a, genutzt: false }));
}

export function handeln(state, i) {
  const a = state.revier.handel.angebote[i];
  if (!a || a.genutzt) return { ok: false };
  for (const [k, v] of Object.entries(a.gib)) if ((state.res[k] ?? 0) < v) return { ok: false, grund: 'Dafür reicht es noch nicht.' };
  for (const [k, v] of Object.entries(a.gib)) state.res[k] -= v;
  for (const [k, v] of Object.entries(a.bekomm)) state.res[k] = (state.res[k] ?? 0) + v;
  a.genutzt = true;
  emit('handel', a);
  return { ok: true };
}
