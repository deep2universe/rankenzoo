// Prozedurale Aufgaben – unendlich viele Übungen mit Rechenweg-Erklärung.
import { randInt, pick, shuffle, zahl } from '../util.js';

const r = randInt;
const Z = zahl;

function choice(frage, richtig, falsche, extra) {
  const optionen = shuffle([richtig, ...falsche]);
  return { typ: 'choice', frage, optionen: optionen.map(String), loesung: optionen.indexOf(richtig), ...extra };
}

const STELLEN = ['Einer', 'Zehner', 'Hunderter', 'Tausender', 'Zehntausender', 'Hunderttausender'];
const KURZ = ['E', 'Z', 'H', 'T', 'ZT', 'HT'];

// ---------- Schriftliche Addition mit Rechenweg ----------
function erklaereAddition(zahlen) {
  const len = Math.max(...zahlen.map(z => String(z).length));
  let uebertrag = 0;
  const schritte = [];
  for (let i = 0; i < len; i++) {
    const ziffern = zahlen.map(z => Math.floor(z / 10 ** i) % 10);
    const s = ziffern.reduce((a, b) => a + b, 0) + uebertrag;
    const teil = ziffern.join(' + ') + (uebertrag ? ` + ${uebertrag} (Übertrag)` : '');
    schritte.push(`${STELLEN[i]}: ${teil} = ${s}${s >= 10 ? ` → schreibe ${s % 10}, merke ${Math.floor(s / 10)}` : ''}`);
    uebertrag = Math.floor(s / 10);
  }
  if (uebertrag) schritte.push(`Der letzte Übertrag ${uebertrag} kommt nach vorne.`);
  return schritte.join('. ') + '.';
}

function erklaereSubtraktion(a, b) {
  const len = String(a).length;
  let borg = 0;
  const schritte = [];
  for (let i = 0; i < len; i++) {
    const da = Math.floor(a / 10 ** i) % 10, db = (Math.floor(b / 10 ** i) % 10) + borg;
    if (i >= String(b).length && borg === 0) break;
    const extra = borg ? ' (mit dem Übertrag)' : '';
    if (da >= db) { schritte.push(`${STELLEN[i]}${extra}: ${da} − ${db} = ${da - db}`); borg = 0; }
    else { schritte.push(`${STELLEN[i]}${extra}: ${da} − ${db} geht nicht → 1 von der nächsten Stelle holen: ${da + 10} − ${db} = ${da + 10 - db}`); borg = 1; }
  }
  return schritte.join('. ') + '. Probe: Ergebnis + ' + Z(b) + ' muss ' + Z(a) + ' ergeben.';
}

export const MATHE_GEN = {
  g_stellenwert: {
    name: 'Stellenwerte bis 1 Million', icon: '🧮', beschreibung: 'Ziffern, Stellen und Bündeln verstehen',
    gen(stufe) {
      const n = stufe === 1 ? r(1000, 99999) : r(100000, 999999);
      const v = r(0, 2);
      if (v === 0) {
        const len = String(n).length;
        const pos = r(0, len - 1);
        const ziffer = Math.floor(n / 10 ** pos) % 10;
        const andere = [...new Set(String(n).split('').map(Number))].filter(d => d !== ziffer);
        const falsche = shuffle([...andere, ...[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].filter(d => d !== ziffer && !andere.includes(d))]).slice(0, 3);
        return choice(`Welche Ziffer steht in ${Z(n)} an der ${STELLEN[pos]}stelle?`, ziffer, falsche, {
          erklaerung: `Von rechts gezählt: E, Z, H, T, ZT, HT. An der ${STELLEN[pos]}stelle (${KURZ[pos]}) steht die ${ziffer}.`,
          tipp: 'Lege die Zahl gedanklich in eine Stellenwerttafel: HT | ZT | T | H | Z | E.',
        });
      }
      if (v === 1) {
        const ht = r(stufe === 1 ? 0 : 1, 9), zt = r(0, 9), t = r(0, 9), hh = r(0, 9), zz = r(0, 9), e = r(0, 9);
        const teile = [[ht, 'HT', 100000], [zt, 'ZT', 10000], [t, 'T', 1000], [hh, 'H', 100], [zz, 'Z', 10], [e, 'E', 1]].filter(x => x[0] > 0);
        const wert = teile.reduce((s, x) => s + x[0] * x[2], 0);
        const shuffled = stufe === 3 ? shuffle(teile) : teile;
        return {
          typ: 'input', eingabe: 'zahl', frage: `Welche Zahl ist das? ${shuffled.map(x => `${x[0]} ${x[1]}`).join(' + ')}`, loesung: wert,
          erklaerung: `Jede Stelle hat ihren Wert: ${teile.map(x => `${x[0]} ${x[1]} = ${Z(x[0] * x[2])}`).join(', ')}. Zusammen: ${Z(wert)}.` + (stufe === 3 ? ' Achtung: Die Stellen waren durcheinander!' : ''),
          tipp: 'Fehlt eine Stelle, schreibst du dort eine 0.',
        };
      }
      const basis = pick([1000, 10000, 100000]);
      const name = basis === 1000 ? 'Tausender' : basis === 10000 ? 'Zehntausender' : 'Hunderttausender';
      const k = r(2, 9) * (stufe === 3 && basis < 100000 ? 10 : 1);
      const wert = k * basis;
      return choice(`${k} ${name} – wie viel ist das?`, wert, [wert / 10, wert * 10, k * basis / 100].filter(x => x >= 1 && x !== wert).slice(0, 3), {
        erklaerung: `1 ${name} = ${Z(basis)}. Also sind ${k} ${name} = ${k} · ${Z(basis)} = ${Z(wert)}.`,
      });
    },
  },
  g_runden: {
    name: 'Runden', icon: '🎯', beschreibung: 'Auf Zehner, Hunderter, Tausender runden',
    gen(stufe) {
      const stellen = stufe === 1 ? [10, 100] : stufe === 2 ? [100, 1000] : [1000, 10000, 100000];
      const auf = pick(stellen);
      const n = r(auf * 2, Math.min(999999, auf * 100 - 1));
      const ger = Math.round(n / auf) * auf;
      const ab = Math.floor(n / auf) * auf, aufw = ab + auf;
      const name = { 10: 'Zehner', 100: 'Hunderter', 1000: 'Tausender', 10000: 'Zehntausender', 100000: 'Hunderttausender' }[auf];
      const entscheid = Math.floor(n / (auf / 10)) % 10;
      return choice(`Runde ${Z(n)} auf ${name}.`, ger, [ab === ger ? aufw : ab, ger + auf, Math.max(auf, ger - auf)].filter((x, i, a) => x !== ger && a.indexOf(x) === i).slice(0, 3), {
        erklaerung: `Schau auf die Stelle rechts neben den ${name}n: Da steht ${entscheid}. ${entscheid >= 5 ? '5, 6, 7, 8, 9 → aufrunden' : '0, 1, 2, 3, 4 → abrunden'}. Also ${Z(n)} ≈ ${Z(ger)}.`,
        tipp: 'Bei 0–4 wird abgerundet, bei 5–9 aufgerundet.',
      });
    },
  },
  g_kopfrechnen: {
    name: 'Kopfrechnen', icon: '⚡', beschreibung: 'Geschickt im Kopf rechnen',
    gen(stufe) {
      const v = r(0, 3);
      if (v === 0) {
        const a = r(2, 9), b = r(2, 9) * (stufe === 1 ? 1 : stufe === 2 ? 10 : 100);
        return { typ: 'input', eingabe: 'zahl', frage: `${a} · ${Z(b)} = ?`, loesung: a * b,
          erklaerung: stufe === 1 ? `Das ist eine Einmaleins-Aufgabe: ${a} · ${b} = ${a * b}.` : `Rechne erst ${a} · ${b / (stufe === 2 ? 10 : 100)} = ${a * b / (stufe === 2 ? 10 : 100)} und hänge ${stufe === 2 ? 'eine Null' : 'zwei Nullen'} an: ${Z(a * b)}.`,
          tipp: 'Nutze das kleine Einmaleins und denke an die Nullen.' };
      }
      if (v === 1) {
        const b = r(2, 9), q = r(2, 9) * (stufe === 1 ? 1 : stufe === 2 ? 10 : 100);
        const a = b * q;
        return { typ: 'input', eingabe: 'zahl', frage: `${Z(a)} : ${b} = ?`, loesung: q,
          erklaerung: `Umkehraufgabe: ${b} · ? = ${Z(a)}. ${stufe > 1 ? `Denke an ${a / (stufe === 2 ? 10 : 100)} : ${b} = ${q / (stufe === 2 ? 10 : 100)} und ergänze die Nullen.` : ''} Ergebnis: ${Z(q)}.`,
          tipp: 'Teilen ist die Umkehrung vom Malnehmen.' };
      }
      if (v === 2) {
        const m = stufe === 1 ? 10 : stufe === 2 ? 10 : 100;
        const a = r(12, 98) * m, b = r(12, 98) * m;
        return { typ: 'input', eingabe: 'zahl', frage: `${Z(a)} + ${Z(b)} = ?`, loesung: a + b,
          erklaerung: `Zerlege: ${Z(a)} + ${Z(Math.floor(b / (m * 10)) * m * 10)} = ${Z(a + Math.floor(b / (m * 10)) * m * 10)}, dann + ${Z(b % (m * 10))} = ${Z(a + b)}.`,
          tipp: 'Rechne erst mit den großen Stellen, dann mit dem Rest.' };
      }
      const ziel = stufe === 1 ? 100 : stufe === 2 ? 1000 : 10000;
      const a = r(Math.floor(ziel * 0.1), ziel - 1);
      return { typ: 'input', eingabe: 'zahl', frage: `Wie viel fehlt von ${Z(a)} bis ${Z(ziel)}?`, loesung: ziel - a,
        erklaerung: `Ergänze schrittweise: ${Z(a)} + ${Z(ziel - a)} = ${Z(ziel)}. Probe: ${Z(ziel)} − ${Z(a)} = ${Z(ziel - a)}.`,
        tipp: 'Ergänze erst bis zum nächsten vollen Zehner/Hunderter.' };
    },
  },
  g_schriftlich_plus_minus: {
    name: 'Schriftlich plus & minus', icon: '✏️', beschreibung: 'Stellengerecht untereinander rechnen',
    gen(stufe) {
      const max = stufe === 1 ? 999 : stufe === 2 ? 99999 : 999999;
      const min = stufe === 1 ? 100 : stufe === 2 ? 1000 : 10000;
      if (Math.random() < 0.5) {
        const zahlen = stufe === 3 && Math.random() < 0.5 ? [r(min, max / 2), r(min, max / 3), r(100, 9999)] : [r(min, max / 2), r(min, max / 2)];
        const s = zahlen.reduce((a, b) => a + b, 0);
        return { typ: 'input', eingabe: 'zahl', frage: `Rechne schriftlich: ${zahlen.map(Z).join(' + ')}`, loesung: s,
          erklaerung: erklaereAddition(zahlen), tipp: 'Schreibe die Zahlen stellengerecht untereinander: Einer unter Einer!',
          schriftlich: { op: '+', zahlen } };
      }
      const a = r(min * 2, max), b = r(min, a - 1);
      return { typ: 'input', eingabe: 'zahl', frage: `Rechne schriftlich: ${Z(a)} − ${Z(b)}`, loesung: a - b,
        erklaerung: erklaereSubtraktion(a, b), tipp: 'Beginne bei den Einern. Probe: Ergebnis + abgezogene Zahl = Anfangszahl.',
        schriftlich: { op: '−', zahlen: [a, b] } };
    },
  },
  g_schriftlich_mal_geteilt: {
    name: 'Schriftlich mal & geteilt', icon: '✖️', beschreibung: 'Schriftliche Multiplikation und Division',
    gen(stufe) {
      if (Math.random() < 0.5) {
        const a = stufe === 1 ? r(102, 999) : stufe === 2 ? r(1002, 9999) : r(102, 999);
        const b = stufe === 3 ? r(12, 49) : r(3, 9);
        let erkl;
        if (b < 10) {
          erkl = `Rechne von rechts: ${String(a).split('').reverse().map((d, i) => `${b} · ${d} ${STELLEN[i]}`).join(', ')} – Überträge dazuzählen. ${Z(a)} · ${b} = ${Z(a * b)}.`;
        } else {
          const z = Math.floor(b / 10), e = b % 10;
          erkl = `Zerlege ${b} in ${z * 10} und ${e}: ${Z(a)} · ${z * 10} = ${Z(a * z * 10)} und ${Z(a)} · ${e} = ${Z(a * e)}. Zusammen: ${Z(a * z * 10)} + ${Z(a * e)} = ${Z(a * b)}.`;
        }
        return { typ: 'input', eingabe: 'zahl', frage: `Rechne schriftlich: ${Z(a)} · ${b}`, loesung: a * b, erklaerung: erkl,
          tipp: 'Überschlage zuerst, dann weißt du ungefähr, wie groß das Ergebnis wird.' };
      }
      const b = r(2, 9);
      const q = stufe === 1 ? r(12, 99) : stufe === 2 ? r(102, 999) : r(1002, 9999);
      const rest = stufe === 3 ? r(1, b - 1) : 0;
      const a = b * q + rest;
      if (rest) {
        return { typ: 'input', eingabe: 'zahl', frage: `${Z(a)} : ${b} = ${Z(q)} Rest ☐ – wie groß ist der Rest?`, loesung: rest,
          erklaerung: `${b} · ${Z(q)} = ${Z(b * q)}. Bis ${Z(a)} fehlen noch ${rest}. Der Rest muss immer kleiner als ${b} sein.`,
          tipp: 'Rechne erst die Malaufgabe ' + b + ' · ' + Z(q) + '.' };
      }
      return { typ: 'input', eingabe: 'zahl', frage: `Rechne schriftlich: ${Z(a)} : ${b}`, loesung: q,
        erklaerung: `Teile Stelle für Stelle von links: Wie oft passt ${b} hinein? Ergebnis ${Z(q)}. Probe: ${Z(q)} · ${b} = ${Z(a)}.`,
        tipp: 'Bei der Division beginnst du links bei der größten Stelle.' };
    },
  },
  g_ueberschlag: {
    name: 'Überschlagen', icon: '🔭', beschreibung: 'Ergebnisse schätzen und prüfen',
    gen(stufe) {
      const a = r(stufe === 1 ? 110 : 1100, stufe === 1 ? 980 : 9800), b = r(stufe === 1 ? 110 : 1100, stufe === 1 ? 980 : 9800);
      const plus = Math.random() < 0.6;
      const rund = stufe === 1 ? 100 : 1000;
      const ra = Math.round(a / rund) * rund, rb = Math.round(b / rund) * rund;
      const u = plus ? ra + rb : ra * 3;
      if (plus) {
        return choice(`Welcher Überschlag passt am besten zu ${Z(a)} + ${Z(b)}?`, u, [u + rund * 2, Math.max(rund, u - rund * 3), u * 10].filter(x => x !== u), {
          erklaerung: `Runde beide Zahlen: ${Z(a)} ≈ ${Z(ra)} und ${Z(b)} ≈ ${Z(rb)}. ${Z(ra)} + ${Z(rb)} = ${Z(u)}. Genau: ${Z(a + b)}.`,
          tipp: 'Runde zuerst auf glatte Zahlen, dann rechne im Kopf.' });
      }
      return choice(`Ungefähr wie viel ist ${Z(a)} · 3?`, u, [u * 10, Math.max(rund, Math.round(u / 10)), u + rund * 4], {
        erklaerung: `${Z(a)} ≈ ${Z(ra)}. ${Z(ra)} · 3 = ${Z(u)}. Genau: ${Z(a * 3)}.`,
        tipp: 'Ein Überschlag hilft, große Rechenfehler zu entdecken.' });
    },
  },
  g_groessen: {
    name: 'Größen umrechnen', icon: '📏', beschreibung: 'km, m, cm, kg, g, h, min, €, l, ml',
    gen(stufe) {
      const E = [
        ['km', 'm', 1000], ['m', 'cm', 100], ['cm', 'mm', 10], ['kg', 'g', 1000], ['t', 'kg', 1000],
        ['h', 'min', 60], ['min', 's', 60], ['€', 'ct', 100], ['l', 'ml', 1000],
      ];
      const [gross, klein, f] = pick(E);
      if (stufe === 3 && f !== 60) {
        const halb = r(1, 9) + pick([0.5, 0.25, 0.75].filter(x => f % (1 / x) === 0 || f >= 100));
        const wert = Math.round(halb * f);
        const s = String(halb).replace('.', ',');
        return { typ: 'input', eingabe: 'zahl', frage: `${s} ${gross} = ☐ ${klein}`, loesung: wert, einheit: klein,
          erklaerung: `1 ${gross} = ${Z(f)} ${klein}. ${s} ${gross} = ${Math.floor(halb)} ${gross} und ${Z(Math.round((halb % 1) * f))} ${klein} = ${Z(wert)} ${klein}.`,
          tipp: `Denke: 1 ${gross} = ${Z(f)} ${klein}. Die Kommastelle ist ein Teil davon.` };
      }
      const k = stufe === 1 ? r(2, 9) : r(2, 12);
      if (Math.random() < 0.5 || stufe === 1) {
        return { typ: 'input', eingabe: 'zahl', frage: `${k} ${gross} = ☐ ${klein}`, loesung: k * f, einheit: klein,
          erklaerung: `1 ${gross} = ${Z(f)} ${klein}, also sind ${k} ${gross} = ${k} · ${Z(f)} = ${Z(k * f)} ${klein}.` };
      }
      const rest = r(1, f - 1);
      const gesamt = k * f + rest;
      return { typ: 'input', eingabe: 'zahl', frage: `${k} ${gross} ${rest} ${klein} = ☐ ${klein}`, loesung: gesamt, einheit: klein,
        erklaerung: `${k} ${gross} = ${Z(k * f)} ${klein}. Dazu ${rest} ${klein}: ${Z(k * f)} + ${rest} = ${Z(gesamt)} ${klein}.` };
    },
  },
  g_platzhalter: {
    name: 'Platzhalter & Umkehraufgaben', icon: '🔍', beschreibung: 'Die fehlende Zahl finden',
    gen(stufe) {
      const v = r(0, 2);
      if (v === 0) {
        const ziel = stufe === 1 ? 1000 : stufe === 2 ? 10000 : r(2, 9) * 100000;
        const a = r(Math.floor(ziel / 10), ziel - 1);
        return { typ: 'input', eingabe: 'zahl', frage: `${Z(a)} + ☐ = ${Z(ziel)}`, loesung: ziel - a,
          erklaerung: `Rechne rückwärts mit der Umkehraufgabe: ${Z(ziel)} − ${Z(a)} = ${Z(ziel - a)}.` };
      }
      if (v === 1) {
        const a = r(3, 9), b = r(3, 12) * (stufe === 3 ? 100 : stufe === 2 ? 10 : 1);
        return { typ: 'input', eingabe: 'zahl', frage: `${a} · ☐ = ${Z(a * b)}`, loesung: b,
          erklaerung: `Umkehraufgabe: ${Z(a * b)} : ${a} = ${Z(b)}.` };
      }
      const b = r(2, 9), q = r(11, stufe === 1 ? 30 : 250);
      return { typ: 'input', eingabe: 'zahl', frage: `☐ : ${b} = ${q}`, loesung: b * q,
        erklaerung: `Umkehraufgabe: ${q} · ${b} = ${Z(b * q)}.` };
    },
  },
  g_folgen: {
    name: 'Zahlenfolgen', icon: '🔁', beschreibung: 'Muster erkennen und fortsetzen',
    gen(stufe) {
      const start = r(1, 50) * (stufe === 3 ? 10 : 1);
      let folge = [], regel;
      if (stufe === 1) {
        const d = pick([3, 4, 5, 6, 7, 8, 9, 25, 50]);
        for (let i = 0; i < 5; i++) folge.push(start + i * d);
        regel = `Es kommt immer ${d} dazu.`;
      } else if (stufe === 2) {
        const d1 = r(2, 9), d2 = r(2, 9);
        let x = start; folge.push(x);
        for (let i = 0; i < 5; i++) { x += i % 2 ? -d2 : d1 + d2; folge.push(x); }
        regel = `Abwechselnd +${d1 + d2} und −${d2}.`;
      } else {
        const f = pick([2, 3]);
        let x = r(1, 9); folge.push(x);
        for (let i = 0; i < 4; i++) { x = x * f; folge.push(x); }
        regel = `Jede Zahl wird mit ${f} malgenommen (${f === 2 ? 'verdoppelt' : 'verdreifacht'}).`;
      }
      const next = folge.pop();
      return { typ: 'input', eingabe: 'zahl', frage: `Wie geht es weiter? ${folge.map(Z).join(', ')}, ☐`, loesung: next,
        erklaerung: `${regel} Deshalb kommt als Nächstes ${Z(next)}.`, tipp: 'Schau, wie sich die Zahlen von einer zur nächsten verändern.' };
    },
  },
  g_teiler: {
    name: 'Teiler & Vielfache', icon: '🧩', beschreibung: 'Teilbarkeit erkennen',
    gen(stufe) {
      const t = pick(stufe === 1 ? [2, 5, 10] : stufe === 2 ? [2, 3, 4, 5, 10] : [3, 4, 6, 9]);
      const ja = Math.random() < 0.5;
      let n = r(3, 40) * t;
      if (!ja) n += r(1, t - 1);
      const regeln = {
        2: 'Eine Zahl ist durch 2 teilbar, wenn die letzte Ziffer gerade ist (0, 2, 4, 6, 8).',
        5: 'Durch 5 teilbar sind Zahlen, die auf 0 oder 5 enden.',
        10: 'Durch 10 teilbar sind Zahlen, die auf 0 enden.',
        3: 'Durch 3 teilbar, wenn die Quersumme durch 3 teilbar ist.',
        9: 'Durch 9 teilbar, wenn die Quersumme durch 9 teilbar ist.',
        4: 'Durch 4 teilbar, wenn die Zahl aus den letzten zwei Ziffern durch 4 teilbar ist.',
        6: 'Durch 6 teilbar, wenn sie durch 2 UND durch 3 teilbar ist.',
      };
      const qs = String(n).split('').reduce((a, b) => a + +b, 0);
      return { typ: 'truefalse', frage: `${Z(n)} ist durch ${t} teilbar.`, loesung: n % t === 0,
        erklaerung: `${regeln[t]}${t === 3 || t === 9 ? ` Quersumme von ${n}: ${qs}.` : ''} ${n} : ${t} = ${Math.floor(n / t)}${n % t ? ` Rest ${n % t}` : ''}.` };
    },
  },
};

// ---------- Englisch: Zahlen ----------
const EINS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const ZEHN = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
export function englishNumber(n) {
  if (n < 20) return EINS[n];
  if (n === 100) return 'one hundred';
  return ZEHN[Math.floor(n / 10)] + (n % 10 ? '-' + EINS[n % 10] : '');
}
export const ENGLISCH_GEN = {
  g_numbers: {
    name: 'Numbers bis 100', icon: '🔢', beschreibung: 'Englische Zahlen lesen und verstehen',
    gen(stufe) {
      const n = stufe === 1 ? r(1, 20) : stufe === 2 ? r(13, 59) : r(21, 100);
      const falsch = new Set();
      const kand = [n + 10, n - 10, (n % 10) * 10 + Math.floor(n / 10), n + 1, n - 1, n + 2];
      for (const k of shuffle(kand)) if (k > 0 && k <= 100 && k !== n) falsch.add(k);
      const f = [...falsch].slice(0, 3);
      if (Math.random() < 0.5) {
        return choice(`Wie schreibt man ${n} auf Englisch?`, englishNumber(n), f.map(englishNumber), {
          erklaerung: `${n} heißt auf Englisch „${englishNumber(n)}". ${n > 20 && n % 10 ? 'Im Englischen kommt der Zehner zuerst – anders als im Deutschen!' : ''}`,
          tipp: 'Englisch: erst Zehner, dann Einer (twenty-one = 21).' });
      }
      return choice(`Welche Zahl ist „${englishNumber(n)}"?`, n, f, {
        erklaerung: `„${englishNumber(n)}" bedeutet ${n}. ${n >= 13 && n <= 19 ? 'Die Endung -teen steht für die Zahlen 13 bis 19.' : n % 10 === 0 && n >= 20 ? 'Die Endung -ty steht für Zehnerzahlen.' : ''}`,
        sprache: 'en', tipp: '-teen = 13 bis 19, -ty = Zehner (20, 30, …)' });
    },
  },
};
