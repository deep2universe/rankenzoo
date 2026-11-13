// Validiert alle Fragenbanken in src/data/questions/*.js
// Aufruf: node tools/validate-questions.mjs
import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'questions');
const FAECHER = ['deutsch', 'mathe', 'sachunterricht', 'englisch', 'musik_kunst', 'sport_werte'];
const TYPEN = ['choice', 'input', 'order', 'truefalse'];
const ids = new Set();
let fehler = 0, gesamt = 0;
const err = (f, q, m) => { fehler++; console.error(`✗ ${f} ${q?.id ?? ''}: ${m}`); };

for (const file of readdirSync(dir).filter(f => f.endsWith('.js'))) {
  const mod = (await import(pathToFileURL(join(dir, file)).href)).default;
  if (!mod || !FAECHER.includes(mod.fach)) { err(file, null, `fach fehlt/ungültig (${mod?.fach})`); continue; }
  if (!mod.themen || typeof mod.themen !== 'object') { err(file, null, 'themen fehlt'); continue; }
  for (const [k, t] of Object.entries(mod.themen)) {
    if (!t.name || !t.icon) err(file, { id: 'thema:' + k }, 'Thema braucht name + icon');
  }
  const proThema = {};
  for (const q of mod.fragen ?? []) {
    gesamt++;
    if (!q.id || ids.has(q.id)) err(file, q, 'id fehlt oder doppelt');
    ids.add(q.id);
    if (!mod.themen[q.thema]) err(file, q, `unbekanntes thema ${q.thema}`);
    proThema[q.thema] = (proThema[q.thema] ?? 0) + 1;
    if (![1, 2, 3].includes(q.stufe)) err(file, q, 'stufe muss 1,2,3 sein');
    if (!TYPEN.includes(q.typ)) err(file, q, `typ ungültig ${q.typ}`);
    if (!q.frage || q.frage.length > 240) err(file, q, 'frage fehlt oder > 240 Zeichen');
    if (!q.erklaerung || q.erklaerung.length < 10) err(file, q, 'erklaerung fehlt/zu kurz');
    if (q.text && q.text.length > 1000) err(file, q, 'text > 1000 Zeichen');
    if (q.typ === 'choice') {
      const o = q.optionen;
      if (!Array.isArray(o) || o.length < 2 || o.length > 4) err(file, q, 'optionen: 2–4 nötig');
      else {
        if (new Set(o.map(String)).size !== o.length) err(file, q, 'optionen doppelt');
        if (!Number.isInteger(q.loesung) || q.loesung < 0 || q.loesung >= o.length) err(file, q, 'loesung muss gültiger Index sein');
        if (o.some(x => String(x).length > 80)) err(file, q, 'option > 80 Zeichen');
      }
    }
    if (q.typ === 'truefalse' && typeof q.loesung !== 'boolean') err(file, q, 'loesung muss boolean sein');
    if (q.typ === 'input') {
      if (q.loesung === undefined || q.loesung === '') err(file, q, 'loesung fehlt');
      if (!['zahl', 'text'].includes(q.eingabe)) err(file, q, 'eingabe muss zahl|text sein');
      if (q.eingabe === 'zahl' && !/^-?\d+([.,]\d+)?$/.test(String(q.loesung))) err(file, q, 'zahl-loesung ungültig');
    }
    if (q.typ === 'order') {
      const t = q.teile;
      if (!Array.isArray(t) || t.length < 3 || t.length > 8) err(file, q, 'teile: 3–8 nötig');
      else if (new Set(t).size !== t.length) err(file, q, 'teile doppelt');
    }
  }
  console.log(`✓ ${file}: ${mod.fragen?.length ?? 0} Fragen, ${Object.keys(mod.themen).length} Themen`);
  for (const [t, n] of Object.entries(proThema)) console.log(`    ${t.padEnd(24)} ${n}`);
}
console.log(`\n${gesamt} Fragen gesamt, ${fehler} Fehler`);
process.exit(fehler ? 1 : 0);
