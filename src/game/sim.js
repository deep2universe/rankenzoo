// Simulation des Ameisenstaates: Arbeit, Nahrung, Brut, Zufriedenheit.
import { GEBAEUDE, SIM, BEDUERFNISSE, rangVon } from './config.js';
import { computeConnectivity } from './world.js';
import { forschungsEffekte, forschungTick } from './forschung.js';
import { revierBedarf, revierRaten, revierTick, lagerEffekte } from './revier.js';
import { weltEffekte, startplatzStufe, drohnenNoetig } from './welt.js';
import { ausbauFertig } from './bauplaene.js';
import { gruendungsBonus, drohnenGesamt } from './kolonien.js';
import { netzEffekte } from './zivilisation.js';
import { emit } from '../events.js';
import { clamp } from '../util.js';

/** Abgeleitete Werte (werden jeden Tick neu berechnet, nicht gespeichert). */
export function derive(state) {
  const v = state.volk;
  const pop = v.arbeiterinnen + v.drohnen + 1;
  const fx = {
    brutTempo: 0, sammelBonus: 0, tempo: 0, quizBonus: 0, ausbildung: 0, wohnBonus: 0, pilzBonus: 0,
    verbrauch: 0, sterneProMin: 0, zufriedenBonus: 0, joker: 0,
    fp: 0, fpMult: 0, forschTempo: 0, wacheStaerke: 0, sicht: 0, expSlots: 0, expTempo: 0, revierBonus: 0, handel: 0,
    lagerBonus: 0, weideBonus: 0, eiTempo: 0, bauTempo: 0, hygieneMult: 0, waermeMult: 0, freizeitMult: 0,
    quelleNahrung: 0, quelleNachwuchs: 0, schatzBonus: 0, flugBonus: 0, ausbauRabatt: 0, pollen: 0, hotel: 0,
  };
  // Forschung und Tochterkolonien wirken immer (unabhängig vom Personal)
  for (const [k, val] of Object.entries(forschungsEffekte(state))) fx[k] = (fx[k] ?? 0) + val;
  for (const [k, val] of Object.entries(weltEffekte(state))) fx[k] = (fx[k] ?? 0) + val;
  if (state.revier) for (const [k, val] of Object.entries(lagerEffekte(state.revier))) fx[k] = (fx[k] ?? 0) + val;
  for (const [k, val] of Object.entries(netzEffekte(state))) fx[k] = (fx[k] ?? 0) + val;
  // Junge Tochterkolonien wachsen in den ersten Tagen besonders schnell
  const gb = gruendungsBonus(state);
  fx.eiTempo += 0.9 * gb; fx.brutTempo += 0.5 * gb; fx.bauTempo += 0.5 * gb;
  const fertig = state.rooms.filter(r => r.bau >= 1 && r.verbunden !== false);
  // Spezial-Effekte, die andere Effizienzen beeinflussen, zuerst grob sammeln (Universität, Berufsschule)
  for (const r of fertig) fx.ausbildung += GEBAEUDE[r.typ].effekte?.ausbildung ?? 0;
  const befehle = state.befehle ?? { bauMax: 3, ammen: 'normal' };

  // --- Arbeitsverteilung ---
  let frei = v.arbeiterinnen;
  const jobs = { bau: 0, ammen: 0, personal: 0, sammler: 0 };
  const baustellen = state.rooms.filter(r => (r.bau < 1 || r.ausbau) && r.verbunden !== false);
  const bauProStelle = new Map();
  for (const r of baustellen) {
    const n = Math.min(befehle.bauMax ?? 3, Math.max(0, Math.floor(frei * 0.6) - jobs.bau), frei);
    const k = Math.max(frei > 0 ? 1 : 0, n);
    bauProStelle.set(r.id, k);
    jobs.bau += k; frei -= k;
  }
  const brutAnz = state.brut.length;
  const ammenF = befehle.ammen === 'viel' ? 1.7 : befehle.ammen === 'wenig' ? 0.5 : 1;
  const ammenWunsch = Math.ceil((brutAnz / 5) * ammenF);
  jobs.ammen = Math.min(ammenWunsch, Math.floor(frei * 0.35 * Math.max(1, ammenF)) + (frei > 0 && ammenWunsch > 0 ? 1 : 0), frei);
  frei -= jobs.ammen;
  // Personal: Nahrungsproduzenten zuerst
  const prio = t => (GEBAEUDE[t].effekte?.nahrung ? 0 : t === 'koenigin' ? 1 : 2);
  const personal = new Map();
  const reserve = Math.min(3, frei); // ein paar Sammlerinnen bleiben immer
  let verfuegbar = frei - reserve;
  for (const r of [...fertig].sort((a, b) => prio(a.typ) - prio(b.typ))) {
    const want = GEBAEUDE[r.typ].personal;
    const k = Math.max(0, Math.min(want, verfuegbar));
    personal.set(r.id, k);
    verfuegbar -= k; jobs.personal += k;
  }
  frei -= jobs.personal;
  // Befehle der Königin: Revier-Trupps (Sammlerinnen, Wächterinnen, Expeditionen)
  const bedarf = state.revier ? revierBedarf(state.revier) : { summe: 0, s: 0, w: 0, e: 0 };
  const revierFrei = Math.max(0, frei - Math.min(2, frei));
  // Expeditionen sind schon unterwegs – sie zählen immer voll
  const revierFaktor = bedarf.summe ? Math.min(1, Math.max(0, revierFrei - bedarf.e) / Math.max(1, bedarf.s + bedarf.w)) : 1;
  jobs.revier = Math.min(revierFrei, bedarf.e + Math.round((bedarf.s + bedarf.w) * revierFaktor));
  jobs.exp = bedarf.e;
  frei -= jobs.revier;
  jobs.sammler = Math.max(0, frei);

  // --- Effizienz & Effekte ---
  const eff = new Map();
  const versorgung = {};
  for (const k of Object.keys(BEDUERFNISSE)) versorgung[k] = SIM.grundVersorgung;
  versorgung.waerme += state.world.hill * 20;
  let wohnraum = SIM.grundWohnraum, lager = SIM.grundLager, brutPlatz = SIM.grundBrut, nahrungBau = 0;
  for (const r of fertig) {
    const g = GEBAEUDE[r.typ];
    const e = (g.personal ? (personal.get(r.id) ?? 0) / g.personal : 1) * (1 + fx.ausbildung);
    eff.set(r.id, e);
    for (const [k, val] of Object.entries(g.liefert ?? {})) versorgung[k] += val * Math.min(e, 1.2) * (1 + (k === 'freizeit' ? fx.freizeitMult : k === 'hygiene' ? fx.hygieneMult : k === 'waerme' ? fx.waermeMult : 0));
    const ef = g.effekte ?? {};
    if (ef.wohnraum) wohnraum += ef.wohnraum;
    if (ef.lager) lager += ef.lager * Math.max(0.5, Math.min(e, 1));
    if (ef.brutPlatz) brutPlatz += ef.brutPlatz;
    for (const key of ['brutTempo', 'sammelBonus', 'tempo', 'quizBonus', 'wohnBonus', 'pilzBonus', 'verbrauch', 'sterneProMin', 'zufriedenBonus', 'joker',
      'fp', 'forschTempo', 'wacheStaerke', 'sicht', 'expSlots', 'expTempo', 'revierBonus', 'handel', 'lagerBonus', 'eiTempo', 'bauTempo', 'weideBonus', 'hotel']) {
      if (ef[key]) fx[key] += ef[key] * Math.min(e, 1.1);
    }
    if (ef.flugBonus) fx.flugBonus = Math.max(fx.flugBonus, ef.flugBonus); // Startplatz-Stufe zählt, nicht die Besetzung
  }
  wohnraum = Math.round(SIM.grundWohnraum + (wohnraum - SIM.grundWohnraum) * (1 + fx.wohnBonus));
  lager = Math.round(lager * (1 + fx.lagerBonus));
  for (const r of fertig) {
    const g = GEBAEUDE[r.typ];
    if (g.effekte?.nahrung) {
      const bonus = r.typ === 'pilz' ? 1 + fx.pilzBonus : r.typ === 'blattlaus' ? 1 + fx.weideBonus : 1;
      nahrungBau += g.effekte.nahrung * eff.get(r.id) * bonus * (1 + fx.tempo);
    }
  }
  const tagPhase = (state.zeit % SIM.tagDauer) / SIM.tagDauer;
  const istNacht = tagPhase > 0.72 || tagPhase < 0.06;
  // abnehmender Ertrag: je mehr Sammlerinnen, desto weiter die Wege
  const regen = state.revier?.wetter?.typ === 'regen';
  const sammelRate = (jobs.sammler / (1 + jobs.sammler / 40)) * SIM.sammeln * (1 + fx.sammelBonus) * (1 + fx.tempo) * (istNacht ? 0.5 : 1) * (regen ? 0.6 : 1);
  const revier = state.revier ? revierRaten(state, fx, revierFaktor, tagPhase) : { nahrung: 0, material: 0, sterne: 0, tau: 0, pollen: 0, pro: new Map() };
  versorgung.hygiene += revier.tau;
  // Pollen ist eiweißreich: Larven wachsen schneller (bis +30 %)
  fx.pollen = revier.pollen * 60;
  fx.brutTempo += Math.min(0.3, fx.pollen / 30);
  const fpProSek = ((SIM.fpGrund + fx.fp) / 60) * (1 + fx.fpMult);
  const vb = SIM.verbrauch;
  const larven = state.brut.filter(b => b.s === 'larve').length;
  const verbrauch = (v.arbeiterinnen * vb.arbeiterin + v.drohnen * vb.drohne + vb.koenigin + larven * vb.larve) * (1 + fx.verbrauch);
  const nahrungProSek = sammelRate + nahrungBau + revier.nahrung;

  // --- Bedürfnisse ---
  const erwachsene = Math.max(1, pop);
  const quote = {};
  const vorrat = state.res.nahrung;
  quote.nahrung = vorrat <= 0.5 ? 0 : clamp(0.55 + 0.45 * (vorrat / Math.max(25, verbrauch * 90)), 0, 1);
  if (nahrungProSek < verbrauch && vorrat < verbrauch * 60) quote.nahrung = Math.min(quote.nahrung, 0.6);
  quote.wohnen = clamp(wohnraum / erwachsene, 0, 1);
  for (const k of ['freizeit', 'bildung', 'hygiene', 'waerme']) quote[k] = clamp(versorgung[k] / erwachsene, 0, 1);
  const gew = { nahrung: 0.26, wohnen: 0.2, freizeit: 0.15, bildung: 0.14, hygiene: 0.13, waerme: 0.12 };
  let z = 0;
  for (const [k, w] of Object.entries(gew)) z += quote[k] * w;
  const zufriedenheit = clamp(z * 100 + fx.zufriedenBonus, 0, 100);

  return {
    pop, jobs, bauProStelle, personal, eff, versorgung, quote, zufriedenheit, wohnraum, lager, brutPlatz,
    nahrungProSek, verbrauch, fx, tagPhase, istNacht, tag: Math.floor(state.zeit / SIM.tagDauer) + 1,
    rang: rangVon(pop), revier, revierFaktor, bedarf, fpProSek, sammelRate, nahrungBau, regen,
  };
}

/** Ein Simulationsschritt (dt in Sekunden Spielzeit). */
export function tick(state, dt) {
  const d = derive(state);
  const v = state.volk;
  const tagVorher = Math.floor(state.zeit / SIM.tagDauer);
  state.zeit += dt;

  // Nahrung
  state.res.nahrung = clamp(state.res.nahrung + (d.nahrungProSek - d.verbrauch) * dt, 0, d.lager);

  // Bau & Ausbau
  for (const r of state.rooms) {
    if (r.verbunden === false) continue;
    const k = d.bauProStelle.get(r.id) ?? 0;
    const tempo = dt * k * (1 + d.fx.tempo) * (1 + d.fx.bauTempo);
    if (r.bau < 1) {
      r.bau = Math.min(1, r.bau + tempo / GEBAEUDE[r.typ].bauzeit);
      if (r.bau >= 1) {
        state.stats.gebaut++;
        emit('gebaut', r);
      }
    } else if (r.ausbau) {
      r.ausbau.p = Math.min(1, r.ausbau.p + tempo / (GEBAEUDE[r.ausbau.ziel]?.bauzeit ?? 20));
      if (r.ausbau.p >= 1) {
        state.stats.ausgebaut = (state.stats.ausgebaut ?? 0) + 1;
        ausbauFertig(state, r);
      }
    }
  }

  // Eiablage
  const hatFutter = state.res.nahrung > 3;
  const erwachsen = v.arbeiterinnen + v.drohnen;
  const platz = state.brut.length < d.brutPlatz && erwachsen + state.brut.length < d.wohnraum + 4;
  const freude = 0.45 + d.zufriedenheit / 100;
  v.eiTimer += dt * freude * (1 + 0.15 * (state.kronenStufe - 1)) * (1 + d.fx.eiTempo);
  if (v.eiTimer >= SIM.eiIntervall) {
    v.eiTimer = 0;
    if (hatFutter && platz) {
      state.brut.push({ s: 'ei', t: 0, k: Math.random() < v.drohnenAnteil ? 'd' : 'a' });
      emit('ei');
    } else if (!platz) {
      emit('hinweis', { id: 'platz', text: state.brut.length >= d.brutPlatz ? 'Die Kinderstuben sind voll! Baue mehr Kinderstuben.' : 'Kein Wohnraum mehr! Baue Schlafkammern.' });
    }
  }

  // Brutentwicklung
  const ammenFaktor = state.brut.length ? clamp(0.45 + 0.55 * (d.jobs.ammen / Math.ceil(state.brut.length / 5)), 0.45, 1) : 1;
  const tempo = (1 + d.fx.brutTempo + state.world.hill * 0.04) * ammenFaktor * (hatFutter ? 1 : 0.15);
  const fertigeBrut = [];
  for (const b of state.brut) {
    b.t += dt * tempo;
    const dauer = SIM.brutDauer[b.s];
    if (b.t >= dauer) {
      b.t = 0;
      if (b.s === 'ei') b.s = 'larve';
      else if (b.s === 'larve') b.s = 'puppe';
      else fertigeBrut.push(b);
    }
  }
  if (fertigeBrut.length) {
    state.brut = state.brut.filter(b => !fertigeBrut.includes(b));
    for (const b of fertigeBrut) {
      if (b.k === 'd') v.drohnen++; else v.arbeiterinnen++;
      emit('geschluepft', b.k);
    }
  }

  // Auswandern bei Hunger / großer Unzufriedenheit (kindgerecht: niemand stirbt)
  if (state.res.nahrung <= 0.5 || d.zufriedenheit < 22) {
    v.auswanderTimer += dt;
    const grenze = state.res.nahrung <= 0.5 ? 10 : 25;
    if (v.auswanderTimer > grenze && v.arbeiterinnen + v.drohnen > 4) {
      v.auswanderTimer = 0;
      if (v.drohnen > 0 && Math.random() < 0.5) v.drohnen--; else v.arbeiterinnen--;
      emit('ausgewandert', state.res.nahrung <= 0.5 ? 'hunger' : 'unzufrieden');
    }
  } else v.auswanderTimer = Math.max(0, v.auswanderTimer - dt);

  // Handel (Einkaufscenter)
  if (d.fx.sterneProMin > 0) {
    state._sterneRest = (state._sterneRest ?? 0) + (d.fx.sterneProMin / 60) * dt;
    if (state._sterneRest >= 1) {
      const n = Math.floor(state._sterneRest);
      state._sterneRest -= n;
      state.res.sterne += n;
    }
  }

  // Forschung & Revier
  state.res.fp = (state.res.fp ?? 0) + d.fpProSek * dt;
  if (state.forschung) forschungTick(state, dt, 1 + d.fx.forschTempo);
  if (state.revier) revierTick(state, d, dt);

  // Neuer Tag
  const tagJetzt = Math.floor(state.zeit / SIM.tagDauer);
  if (tagJetzt > tagVorher) {
    const neu = Math.min(9 - state.res.joker, Math.round(d.fx.joker));
    if (neu > 0) state.res.joker += neu;
    emit('neuerTag', { tag: tagJetzt + 1, joker: Math.max(0, neu) });
  }
  return d;
}

export function refreshConnectivity(state) {
  computeConnectivity(state.world, state.rooms);
}

export function hochzeitsflugBereit(state, d) {
  const stufe = startplatzStufe(state);
  const drohnen = drohnenNoetig(state);
  const hat = drohnenGesamt(state);
  const gruende = [];
  if (!stufe) gruende.push('Baue einen Hochzeitsflug-Startplatz 🪽 am Hügelrand (der Bauplan ist schon da!)');
  if (hat < drohnen) gruende.push(`Mindestens ${drohnen} Drohnen 🪽 (du hast ${hat}) – stelle im Volk-Fenster den Drohnen-Anteil höher`);
  if (d.zufriedenheit < 50) gruende.push(`Zufriedenheit mind. 50 % (jetzt ${Math.round(d.zufriedenheit)} %)`);
  return { ok: gruende.length === 0, gruende, drohnen };
}
