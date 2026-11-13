// Quiz-Engine: Fragen laden, adaptiv auswählen (Leitner + Themen-Meisterschaft), auswerten.
import { FAECHER, QUIZ } from '../game/config.js';
import { MATHE_GEN, ENGLISCH_GEN } from './generators.js';
import { shuffle, pick } from '../util.js';

const BANK = {}; // fach -> { themen, fragen, gens }
const LEITNER_ABSTAND = [1, 2, 4, 7, 12, 20];

export async function loadBanks() {
  const faecher = Object.keys(FAECHER);
  const res = await Promise.allSettled(faecher.map(f => import(`../data/questions/${f}.js`)));
  res.forEach((r, i) => {
    const f = faecher[i];
    const mod = r.status === 'fulfilled' ? r.value.default : { themen: {}, fragen: [] };
    if (r.status === 'rejected') console.info(`Fragenbank ${f} nicht gefunden – nur Generatoren.`);
    BANK[f] = { themen: { ...mod.themen }, fragen: (mod.fragen ?? []).map(q => ({ ...q, fach: f })), gens: {} };
  });
  for (const [k, g] of Object.entries(MATHE_GEN)) addGen('mathe', k, g);
  for (const [k, g] of Object.entries(ENGLISCH_GEN)) addGen('englisch', k, g);
  return BANK;
}
function addGen(fach, key, g) {
  BANK[fach].gens[key] = g;
  BANK[fach].themen[key] = { name: g.name, icon: g.icon, beschreibung: g.beschreibung, generator: true };
}

export const bank = () => BANK;
export function themenVon(fach) {
  const b = BANK[fach];
  if (!b) return [];
  return Object.entries(b.themen).map(([key, t]) => ({
    key, ...t, anzahl: t.generator ? Infinity : b.fragen.filter(q => q.thema === key).length,
  })).filter(t => t.anzahl > 0);
}
export function anzahlFragen() {
  let n = 0;
  for (const b of Object.values(BANK)) n += b.fragen.length;
  return n;
}

function themaInfo(lernen, fach, thema) {
  const k = `${fach}:${thema}`;
  return lernen.themen[k] ?? { m: 0.4, n: 0, r: 0 };
}

function zielStufe(m) {
  const x = Math.random();
  if (m < 0.45) return x < 0.7 ? 1 : 2;
  if (m < 0.75) return x < 0.25 ? 1 : x < 0.8 ? 2 : 3;
  return x < 0.4 ? 2 : 3;
}

/** Eine Runde zusammenstellen. thema = null → gemischt (Interleaving). */
export function buildRound(state, fach, thema = null, anzahl = QUIZ.fragenProRunde) {
  const L = state.lernen;
  const b = BANK[fach];
  const runde = L.runden;
  const out = [];
  const benutzt = new Set();
  const verlauf = new Set(L.verlauf ?? []);
  let pool = b.fragen.filter(q => !thema || q.thema === thema);
  const genKeys = Object.keys(b.gens).filter(k => !thema || k === thema);

  // 1) Fällige Wiederholungen (falsch beantwortete zuerst)
  const faellig = pool.filter(q => {
    const s = L.fragen[q.id];
    return s && s.b < 3 && s.d <= runde;
  }).sort((a, c) => (L.fragen[a.id].b - L.fragen[c.id].b) || (L.fragen[a.id].d - L.fragen[c.id].d));
  for (const q of faellig.slice(0, Math.min(2, anzahl))) { out.push(prep(q, true)); benutzt.add(q.id); }

  // 2) Themen reihum (Interleaving), passende Schwierigkeit
  const themen = thema ? [thema] : shuffle(Object.keys(b.themen));
  let ti = 0, guard = 0;
  while (out.length < anzahl && guard++ < 200) {
    const th = themen[ti++ % themen.length];
    const info = themaInfo(L, fach, th);
    const stufe = zielStufe(info.m);
    if (b.gens[th] && (genKeys.includes(th))) {
      // Generator-Thema – bei gemischten Runden nur gelegentlich, damit kuratierte Fragen Vorrang haben
      if (!thema && pool.length > 20 && Math.random() < 0.55) continue;
      out.push(prep({ ...b.gens[th].gen(stufe), id: `gen-${th}-${Date.now()}-${out.length}`, fach, thema: th, stufe, generiert: true }));
      continue;
    }
    const kand = pool.filter(q => q.thema === th && !benutzt.has(q.id));
    if (!kand.length) continue;
    const neu = kand.filter(q => !L.fragen[q.id] && !verlauf.has(q.id));
    const ungeuebt = kand.filter(q => !verlauf.has(q.id) && (!L.fragen[q.id] || L.fragen[q.id].d <= runde));
    const quelle = neu.length ? neu : ungeuebt.length ? ungeuebt : kand;
    const passend = quelle.filter(q => q.stufe === stufe);
    const q = pick(passend.length ? passend : quelle);
    out.push(prep(q)); benutzt.add(q.id);
  }
  return shuffle(out.slice(0, anzahl).map((q, i) => ({ ...q, _n: i })));
}

/** Frage zur Anzeige vorbereiten (Optionen mischen etc.). */
const nbsp = v => (typeof v === 'string' ? v.replace(/(\d) (?=\d{3}(?!\d))/g, '$1\u202f') : v);
export function prep(q0, wiederholung = false) {
  const q = { ...q0 };
  for (const k of ['frage', 'erklaerung', 'tipp', 'text']) q[k] = nbsp(q[k]);
  if (q.optionen) q.optionen = q.optionen.map(nbsp);
  const p = { ...q, wiederholung };
  if (q.typ === 'choice') {
    if (q.nichtMischen) { p.anzeige = q.optionen.map((t, i) => ({ t: String(t), richtig: i === q.loesung })); }
    else p.anzeige = shuffle(q.optionen.map((t, i) => ({ t: String(t), richtig: i === q.loesung })));
  }
  if (q.typ === 'truefalse') p.anzeige = [{ t: 'Stimmt', richtig: q.loesung === true }, { t: 'Stimmt nicht', richtig: q.loesung === false }];
  if (q.typ === 'order') {
    let s = shuffle(q.teile);
    let g = 0;
    while (s.join('|') === q.teile.join('|') && g++ < 10) s = shuffle(q.teile);
    p.gemischt = s;
  }
  return p;
}

const norm = s => String(s).trim().replace(/\s+/g, ' ').replace(/[ .]/g, '');
export function pruefeEingabe(q, wert) {
  if (q.eingabe === 'zahl') {
    // Komma oder Punkt als Dezimalzeichen; Leerzeichen (auch schmale) als Tausendertrenner
    const n = x => Number(String(x).trim().replace(/[\s\u202f]/g, '').replace(',', '.'));
    const w = n(wert);
    return Number.isFinite(w) && (w === n(q.loesung) || (q.alternativen ?? []).some(a => n(a) === w));
  }
  const cmp = (a, b) => (q.grossKlein ? norm(a) === norm(b) : norm(a).toLowerCase() === norm(b).toLowerCase());
  return cmp(wert, q.loesung) || (q.alternativen ?? []).some(a => cmp(a, wert));
}
export function richtigeAntwortText(q) {
  if (q.typ === 'choice') return String(q.optionen[q.loesung]);
  if (q.typ === 'truefalse') return q.loesung ? 'Stimmt' : 'Stimmt nicht';
  if (q.typ === 'order') return q.teile.join(' ');
  return String(q.loesung).replace(/\B(?=(\d{3})+(?!\d))/g, /^\d+$/.test(String(q.loesung)) ? ' ' : '') + (q.einheit ? ' ' + q.einheit : '');
}

/** Ergebnis verbuchen. Gibt Sterne zurück. */
export function recordAnswer(state, q, richtig, quizBonus = 0) {
  const L = state.lernen;
  L.gesamt++;
  if (richtig) { L.richtig++; L.serie++; L.besteSerie = Math.max(L.besteSerie, L.serie); } else L.serie = 0;
  const pf = (L.proFach[q.fach] ??= { r: 0, n: 0 });
  pf.n++; if (richtig) pf.r++;
  const k = `${q.fach}:${q.thema}`;
  const t = (L.themen[k] ??= { m: 0.4, n: 0, r: 0 });
  t.n++; if (richtig) t.r++;
  const gewicht = q.stufe === 3 ? 0.25 : q.stufe === 2 ? 0.2 : 0.15;
  t.m = t.m * (1 - gewicht) + (richtig ? 1 : 0) * gewicht;
  if (!q.generiert) {
    const s = (L.fragen[q.id] ??= { b: 0, d: 0, n: 0, r: 0 });
    s.n++;
    if (richtig) { s.r++; s.b = Math.min(5, s.b + 1); } else s.b = 0;
    s.d = L.runden + LEITNER_ABSTAND[s.b];
    L.verlauf = [...(L.verlauf ?? []).filter(id => id !== q.id), q.id].slice(-60);
  }
  if (!richtig) return 0;
  let sterne = QUIZ.sterne[q.stufe] ?? 5;
  if (L.serie >= 5) sterne += 4; else if (L.serie >= 3) sterne += 2;
  if (q.wiederholung) sterne += 2; // Belohnung fürs Dranbleiben
  return Math.round(sterne * (1 + quizBonus));
}

export function meisterschaft(state, fach) {
  const ts = themenVon(fach);
  if (!ts.length) return 0;
  let sum = 0;
  for (const t of ts) {
    const i = state.lernen.themen[`${fach}:${t.key}`];
    sum += i ? Math.min(1, i.m * Math.min(1, i.n / 6)) : 0;
  }
  return sum / ts.length;
}

/** Fach mit dem größten Nachholbedarf („Fach des Tages") */
export function fachDesTages(state, tag) {
  const keys = Object.keys(FAECHER);
  const sorted = [...keys].sort((a, b) => (state.lernen.proFach[a]?.n ?? 0) - (state.lernen.proFach[b]?.n ?? 0));
  return sorted[(tag * 7) % 2 === 0 ? 0 : Math.min(1, sorted.length - 1)];
}
