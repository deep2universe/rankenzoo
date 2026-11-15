// Die Ameisen-Zivilisation: Verbindungen zwischen den Kolonien (Ameisenstraßen & Botenlinien),
// Besuche in Hotels (Studentenaustausch, Nahrungstausch, Duftspur-Konferenzen, Freundschaftsbesuche),
// Handel, das kollektive Ameisen-Bewusstsein, die Krabbelschow-Skala, die Duftkarte und der Bedarf je Kolonie.
// Alles hier ist reine Spiellogik – die Darstellung übernehmen Weltkarte und Holo-HUD.
import { GEBAEUDE, SIM } from './config.js';
import { ortById, WELT, ORT_ANZAHL } from './welt.js';
import { kolonieIds, kolonieName, kolonieDaten, aktiveId, kolonieBiom } from './kolonien.js';
import { emit } from '../events.js';

// ---------------------------------------------------------------- Grundlagen
export const ROUTEN = {
  strasse: { name: 'Ameisenstraße', icon: '🛣️', stufen: ['Trampelpfad', 'Ameisenstraße', 'Duft-Autobahn'],
    text: 'Auf Straßen werden Waren getauscht (Nahrung gleicht sich aus, Handel bringt ⭐) und Gäste können reisen.' },
  boten: { name: 'Botenlinie', icon: '📨', stufen: ['Duftpost'],
    text: 'Botinnen tragen Duftbotschaften: Wissen fließt zwischen den Kolonien (mehr 🔬 und Quiz-Bonus).' },
};
export const BESUCHE = {
  studenten: { name: 'Studentenaustausch', icon: '🎓', farbe: '#b18cff', text: 'Junge Ameisen lernen in der anderen Kolonie.' },
  nahrung: { name: 'Nahrungstausch', icon: '🍯', farbe: '#ffcf40', text: 'Volle Vorratskammern helfen leeren.' },
  konferenz: { name: 'Duftspur-Konferenz', icon: '🔬', farbe: '#6fe0ff', text: 'Forscherinnen diskutieren Duftspur-Analysen.' },
  freunde: { name: 'Freundschaftsbesuch', icon: '💛', farbe: '#ff8fb1', text: 'Freundinnen treffen sich und feiern.' },
};
/** Duftstoffe der Ameisen – die Duftkarte im HUD zeigt, was das Volk gerade „riecht". */
export const DUEFTE = {
  futter: { name: 'Futterduft', icon: '🍯', farbe: '#ffcf40', text: 'Je stärker, desto voller sind die Vorratskammern.', fakt: 'Sammlerinnen markieren gute Futterquellen mit einer Duftspur – je besser das Futter, desto stärker die Spur.' },
  alarm: { name: 'Alarmduft', icon: '🚨', farbe: '#ff5a5a', text: 'Hier stimmt etwas nicht: Die Ameisen sind unzufrieden oder hungrig.', fakt: 'Alarmduft verbreitet sich in Sekunden – dann laufen viele Ameisen aufgeregt herbei.' },
  bau: { name: 'Bauduft', icon: '🏗️', farbe: '#ff9f43', text: 'Hier wird gebaut oder ausgebaut.', fakt: 'Ameisen „riechen" an Baustellen, wo noch Erde gebraucht wird, und tragen Krümel dorthin.' },
  lern: { name: 'Wissensduft', icon: '🎓', farbe: '#b18cff', text: 'So gut ist die Kolonie mit Bildung versorgt.', fakt: 'Erfahrene Ameisen führen Neulinge im Tandemlauf – und hinterlassen dabei Duftmarken.' },
  freude: { name: 'Freudenduft', icon: '💛', farbe: '#ff8fb1', text: 'Glückliche Kolonien duften süß.', fakt: 'Beim Futterteilen (Trophallaxis) tauschen Ameisen auch Duftstoffe aus – so riecht das ganze Volk gleich.' },
  weg: { name: 'Wegduft', icon: '🧭', farbe: '#5fd068', text: 'Wie gut ist die Kolonie mit anderen verbunden?', fakt: 'Ameisenstraßen werden ständig nachgeduftet – sonst verfliegt die Spur nach einiger Zeit.' },
};

const pos = id => { const o = ortById(id); return o ? { x: o.x, y: o.y } : { ...WELT.HEIM }; };
export const distanz = (a, b) => { const p = pos(a), q = pos(b); return Math.hypot(p.x - q.x, p.y - q.y); };
const welt = state => state.welt;
const routenListe = state => [...(welt(state)?.strassen ?? []), ...(welt(state)?.boten ?? [])];
const fertig = r => (r.bau ?? 1) >= 1;
const verbindet = (r, id) => r.a === id || r.b === id;
const anderes = (r, id) => (r.a === id ? r.b : r.a);

// ---------------------------------------------------------------- Kolonien-Überblick
function roomsVon(state, id) { return kolonieDaten(state, id)?.rooms ?? []; }

/** Hotel-Stufe & Gästeplätze einer Kolonie (aus fertigen Gästehaus-Linien-Gebäuden). */
export function hotelVon(state, id) {
  let stufe = 0, plaetze = 0;
  for (const r of roomsVon(state, id)) {
    const G = GEBAEUDE[r.typ];
    if (G?.linie !== 'gaestehaus' || r.bau < 1) continue;
    stufe = Math.max(stufe, G.lstufe);
    plaetze += 2 * (G.effekte?.hotel ?? 1);
  }
  return { stufe, plaetze };
}

/** Wichtige Kennzahlen aller Kolonien – für Weltkarte und HUD. dAktiv = derive() der aktiven Kolonie. */
export function kolonieListe(state, dAktiv) {
  const aktiv = aktiveId(state);
  return kolonieIds(state).map(id => {
    const k = kolonieDaten(state, id);
    const info = id === aktiv && dAktiv ? {
      pop: dAktiv.pop, zufriedenheit: dAktiv.zufriedenheit, nahrung: state.res.nahrung, lager: dAktiv.lager, nahrungProSek: dAktiv.nahrungProSek,
      verbrauch: dAktiv.verbrauch, quote: dAktiv.quote, wohnraum: dAktiv.wohnraum, rang: dAktiv.rang, brut: state.brut.length, drohnen: state.volk.drohnen,
      arbeiterinnen: state.volk.arbeiterinnen, bildung: dAktiv.versorgung?.bildung ?? 0, fp: dAktiv.fpProSek * 60,
    } : (k?.info ?? { pop: (k?.volk?.arbeiterinnen ?? 0) + 1, zufriedenheit: 60, nahrung: k?.nahrung ?? 0, lager: 120, quote: {}, brut: k?.brut?.length ?? 0, drohnen: k?.volk?.drohnen ?? 0, arbeiterinnen: k?.volk?.arbeiterinnen ?? 0, nahrungProSek: 0, verbrauch: 0, rang: 0, bildung: 0, fp: 0 });
    const rooms = k?.rooms ?? [];
    const bauen = rooms.filter(r => r.bau < 1 || r.ausbau).length;
    const bildung = rooms.filter(r => GEBAEUDE[r.typ]?.linie === 'kita' && r.bau >= 1).reduce((m, r) => Math.max(m, GEBAEUDE[r.typ].lstufe), 0);
    const routen = routenListe(state).filter(r => verbindet(r, id));
    const o = ortById(id);
    return {
      id, name: kolonieName(state, id), ort: o, biom: kolonieBiom(state, id), x: o.x, y: o.y, aktiv: id === aktiv,
      ...info, gebaeude: rooms.filter(r => r.bau >= 1).length, baustellen: bauen,
      bildungStufe: bildung, bildungName: bildung ? GEBAEUDE[['kita', 'schule', 'berufsschule', 'gymnasium', 'universitaet'][bildung - 1]].name : null,
      hotel: hotelVon(state, id),
      strassen: routen.filter(r => r.art === 'strasse' && fertig(r)).length,
      boten: routen.filter(r => r.art === 'boten' && fertig(r)).length,
      gegruendet: id === 'heim' ? 1 : welt(state).kolonien.find(x => x.ort === id)?.tag ?? 1,
      fuellung: info.lager ? Math.min(1, info.nahrung / info.lager) : 0,
    };
  });
}

// ---------------------------------------------------------------- Routen bauen
export function routeKosten(art, a, b, stufe = 1) {
  const d = distanz(a, b);
  if (art === 'boten') return { sterne: Math.round(12 + d / 70), fp: Math.round(4 + d / 260), material: 0 };
  const f = [1, 1, 1.6, 2.4][stufe];
  return { sterne: Math.round((22 + d / 35) * f), material: Math.round((14 + d / 55) * f), fp: 0 };
}
export const routeDauer = (art, a, b) => (art === 'boten' ? 8 + distanz(a, b) / 160 : 16 + distanz(a, b) / 70);
export const routeZwischen = (state, art, a, b) => (art === 'boten' ? welt(state).boten : welt(state).strassen).find(r => (r.a === a && r.b === b) || (r.a === b && r.b === a)) ?? null;

/** Kann zwischen a und b eine Route gebaut werden? { ok, grund, kosten } */
export function routeMoeglich(state, art, a, b) {
  const ids = kolonieIds(state);
  const kosten = routeKosten(art, a, b);
  if (a === b) return { ok: false, grund: 'Wähle zwei verschiedene Kolonien.', kosten };
  if (!ids.includes(a) || !ids.includes(b)) return { ok: false, grund: 'Beide Orte brauchen eine Kolonie.', kosten };
  if (routeZwischen(state, art, a, b)) return { ok: false, grund: `Diese ${ROUTEN[art].name} gibt es schon.`, kosten };
  for (const [k, v] of Object.entries(kosten)) if (v && (state.res[k] ?? 0) < v) return { ok: false, grund: `Dafür fehlen ${v - Math.floor(state.res[k] ?? 0)} ${{ sterne: '⭐', material: '🪵', fp: '🔬' }[k]}.`, kosten };
  return { ok: true, kosten };
}

export function baueRoute(state, art, a, b) {
  const m = routeMoeglich(state, art, a, b);
  if (!m.ok) return m;
  for (const [k, v] of Object.entries(m.kosten)) state.res[k] -= v;
  const W = welt(state);
  const r = { id: W.nextRoute++, art, a, b, stufe: 1, bau: 0 };
  (art === 'boten' ? W.boten : W.strassen).push(r);
  emit('routeStart', r);
  return { ok: true, route: r };
}

/** Ausbau einer Straße (Trampelpfad → Ameisenstraße → Duft-Autobahn). */
export function routeAusbauInfo(state, r) {
  if (r.art !== 'strasse' || r.stufe >= 3) return null;
  const kosten = routeKosten('strasse', r.a, r.b, r.stufe + 1);
  let grund = null;
  if (!fertig(r)) grund = 'Wird noch gebaut …';
  else for (const [k, v] of Object.entries(kosten)) if (v && (state.res[k] ?? 0) < v) { grund = `Dafür fehlen ${v - Math.floor(state.res[k] ?? 0)} ${{ sterne: '⭐', material: '🪵' }[k]}.`; break; }
  return { ok: !grund, grund, kosten, ziel: ROUTEN.strasse.stufen[r.stufe] };
}
export function routeAusbauen(state, r) {
  const info = routeAusbauInfo(state, r);
  if (!info?.ok) return { ok: false, grund: info?.grund ?? 'Höchste Stufe erreicht.' };
  for (const [k, v] of Object.entries(info.kosten)) state.res[k] -= v;
  r.stufe++; r.bau = 0.4; // der Ausbau geht schneller als der Neubau
  return { ok: true };
}

/** Zusammenhangskomponenten des Netzes (fertige Straßen & Botenlinien). */
export function netzGruppen(state) {
  const ids = kolonieIds(state);
  const eltern = Object.fromEntries(ids.map(i => [i, i]));
  const f = i => (eltern[i] === i ? i : (eltern[i] = f(eltern[i])));
  for (const r of routenListe(state)) if (fertig(r) && eltern[r.a] && eltern[r.b]) eltern[f(r.a)] = f(r.b);
  const gruppen = {};
  for (const i of ids) (gruppen[f(i)] ??= []).push(i);
  return Object.values(gruppen);
}

// ---------------------------------------------------------------- Wirkung des Netzes
/** Effekte des Netzes für derive(). Globale Erträge (🔬, ⭐) nur in der aktiven Kolonie, damit nichts doppelt zählt. */
export function netzEffekte(state) {
  const W = welt(state);
  if (!W) return {};
  const boten = (W.boten ?? []).filter(fertig).length;
  const strassen = (W.strassen ?? []).filter(fertig);
  const hotels = kolonieIds(state).filter(id => hotelVon(state, id).stufe > 0).length;
  const fx = {
    fpMult: Math.min(0.3, boten * 0.03),
    quizBonus: Math.min(0.15, boten * 0.015),
    zufriedenBonus: Math.min(4, hotels * 0.5 + strassen.length * 0.25),
  };
  if (!state._hintergrund) {
    fx.fp = boten * 0.4 + strassen.length * 0.1;
    fx.sterneProMin = strassen.reduce((s, r) => s + 0.25 * r.stufe, 0);
  }
  return fx;
}

function lagerVon(state, id, dAktiv) {
  if (id === aktiveId(state)) return { nahrung: state.res.nahrung, lager: dAktiv?.lager ?? 120, setze: v => { state.res.nahrung = v; } };
  const k = state.kolonienDaten?.[id];
  return { nahrung: k?.nahrung ?? 0, lager: k?.info?.lager ?? 120, setze: v => { if (k) k.nahrung = v; } };
}
function nahrungAusgleich(state, a, b, menge, dAktiv) {
  const A = lagerVon(state, a, dAktiv), B = lagerVon(state, b, dAktiv);
  const fa = A.nahrung / Math.max(1, A.lager), fb = B.nahrung / Math.max(1, B.lager);
  if (Math.abs(fa - fb) < 0.12) return 0;
  const [von, nach] = fa > fb ? [A, B] : [B, A];
  const x = Math.max(0, Math.min(menge, von.nahrung - 5, nach.lager - nach.nahrung));
  von.setze(von.nahrung - x); nach.setze(nach.nahrung + x);
  return x;
}

/**
 * Ein Welt-Schritt: Routen bauen sich, Waren fließen über Straßen, Besuche reisen zu Hotels.
 * Gibt Ereignisse zurück (für kleine Meldungen und Bürgerinnen-Erlebnisse).
 */
export function weltTick(state, dt, dAktiv) {
  const W = welt(state);
  if (!W) return [];
  W.strassen ??= []; W.boten ??= []; W.besuche ??= []; W.nextRoute ??= 1; W.bewusstsein ??= 0;
  const out = [];
  for (const r of routenListe(state)) {
    if (r.bau >= 1) continue;
    r.bau = Math.min(1, r.bau + dt / routeDauer(r.art, r.a, r.b));
    if (r.bau >= 1) out.push({ typ: 'routeFertig', route: r });
  }
  // Warenaustausch über Straßen
  for (const r of W.strassen) if (fertig(r)) nahrungAusgleich(state, r.a, r.b, 0.35 * r.stufe * dt, dAktiv);
  // Wissen fließt über Botenlinien → kollektives Bewusstsein wächst
  W.bewusstsein += dt * (0.03 * W.boten.filter(fertig).length + 0.01 * W.strassen.filter(fertig).length);
  // Besuche
  W.besuchTimer = (W.besuchTimer ?? 20) - dt;
  if (W.besuchTimer <= 0) {
    W.besuchTimer = 14 + Math.random() * 14;
    const moeglich = [];
    for (const r of W.strassen.filter(fertig)) for (const [von, nach] of [[r.a, r.b], [r.b, r.a]]) {
      const h = hotelVon(state, nach);
      const gaeste = W.besuche.filter(b => b.nach === nach).length;
      if (h.plaetze > gaeste) moeglich.push({ r, von, nach });
    }
    if (moeglich.length) {
      const w = moeglich[Math.floor(Math.random() * moeglich.length)];
      const arten = Object.keys(BESUCHE);
      const art = arten[Math.floor(Math.random() * arten.length)];
      const dauer = Math.max(6, distanz(w.von, w.nach) / (55 * w.r.stufe));
      W.besuche.push({ id: (W.nextBesuch = (W.nextBesuch ?? 1) + 1), route: w.r.id, von: w.von, nach: w.nach, art, p: 0, dauer });
    }
  }
  for (const b of [...W.besuche]) {
    b.p += dt / b.dauer;
    if (b.p < 1) continue;
    W.besuche = W.besuche.filter(x => x !== b);
    const h = hotelVon(state, b.nach).stufe || 1;
    let lohn = '';
    if (b.art === 'studenten') { const x = 4 + 2 * h; state.res.fp = (state.res.fp ?? 0) + x; W.bewusstsein += 3; lohn = `+${x} 🔬`; }
    else if (b.art === 'nahrung') { const x = Math.round(nahrungAusgleich(state, b.von, b.nach, 30, dAktiv)); W.bewusstsein += 1; lohn = x ? `${x} 🍯 ausgetauscht` : 'alle sind satt'; }
    else if (b.art === 'konferenz') {
      if (state.forschung?.aktiv) { state.forschung.aktiv.t += 6 * h; lohn = 'Forschung kommt schneller voran'; }
      else { state.res.fp = (state.res.fp ?? 0) + 6; lohn = '+6 🔬'; }
      W.bewusstsein += 4;
    } else { state.res.sterne += 3 + h; W.bewusstsein += 2; lohn = `+${3 + h} ⭐`; }
    W.besuchZaehler ??= {};
    W.besuchZaehler[b.art] = (W.besuchZaehler[b.art] ?? 0) + 1;
    out.push({ typ: 'besuch', besuch: b, lohn });
  }
  // Handel bringt Sterne (auch ohne aktive Kolonie gezählt – hier sicher nur einmal)
  return out;
}

// ---------------------------------------------------------------- Bewusstsein & Krabbelschow-Skala
/** Das kollektive Ameisen-Bewusstsein: wächst mit Kolonien, Verbindungen, Hotels, Bauten, Wissen und Begegnungen. */
export function bewusstsein(state) {
  const ids = kolonieIds(state);
  const teile = {
    kolonien: ids.length * 40,
    strassen: (welt(state)?.strassen ?? []).filter(fertig).reduce((s, r) => s + 15 * r.stufe, 0),
    boten: (welt(state)?.boten ?? []).filter(fertig).length * 10,
    hotels: ids.reduce((s, id) => s + 12 * hotelVon(state, id).stufe, 0),
    bauten: Math.round(ids.reduce((s, id) => s + roomsVon(state, id).filter(r => r.bau >= 1).length, 0) * 0.5),
    wissen: Object.keys(state.bauplaene ?? {}).length,
    begegnungen: Math.round(welt(state)?.bewusstsein ?? 0),
  };
  return { wert: Object.values(teile).reduce((a, b) => a + b, 0), teile };
}

/**
 * Krabbelschow-Skala – wie die Kardaschow-Skala für Sternenvölker, nur für Ameisen.
 * Typ I ist erreicht, sobald das Volk bereit für den ersten Hochzeitsflug ist.
 */
export function krabbelschow(state) {
  const ids = kolonieIds(state);
  const n = ids.length;
  const strassen = (welt(state)?.strassen ?? []).filter(fertig);
  const boten = (welt(state)?.boten ?? []).filter(fertig);
  const hotels = ids.filter(id => hotelVon(state, id).stufe > 0).length;
  const grand = ids.some(id => hotelVon(state, id).stufe >= 3);
  const gruppen = netzGruppen(state).length;
  const bw = bewusstsein(state).wert;
  const B = (text, ist, soll) => ({ text, ist: Math.min(ist, soll), soll, ok: ist >= soll });
  const stufen = [
    { nr: 1, name: 'Flügge Kolonie', icon: '🪽', farbe: '#7cd8ff',
      text: 'Dein Volk ist bereit, junge Königinnen in die Welt zu schicken.',
      bedingungen: [B('Bereit für den ersten Hochzeitsflug', welt(state)?.flugBereitErreicht || n > 1 ? 1 : 0, 1)] },
    { nr: 2, name: 'Ameisen-Nachbarschaft', icon: '🏘️', farbe: '#8fffb0',
      text: 'Mehrere Kolonien halten zusammen und tauschen Waren.',
      bedingungen: [B('Ameisenstaaten', n, 3), B('Ameisenstraßen', strassen.length, 1)] },
    { nr: 3, name: 'Duftnetz-Zivilisation', icon: '📨', farbe: '#d6a8ff',
      text: 'Botinnen tragen Wissen von Kolonie zu Kolonie, Gäste übernachten in Hotels.',
      bedingungen: [B('Ameisenstaaten', n, 6), B('Botenlinien', boten.length, 3), B('Kolonien mit Hotel', hotels, 2)] },
    { nr: 4, name: 'Garten-Zivilisation', icon: '🌍', farbe: '#ffd36b',
      text: 'Der ganze Garten ist ein einziges, verbundenes Ameisenreich.',
      bedingungen: [B('Ameisenstaaten', n, 12), B('Alle Kolonien verbunden', gruppen <= 1 && n > 1 ? 1 : 0, 1), B('Kolonien mit Hotel', hotels, 5), B('Ameisen-Bewusstsein', bw, 800)] },
    { nr: 5, name: 'Welt-Superorganismus', icon: '🌌', farbe: '#ff9ff3',
      text: 'Alle 20 Ameisenstaaten denken und fühlen gemeinsam – das kollektive Ameisenbewusstsein ist vollständig!',
      bedingungen: [B('Ameisenstaaten', n, ORT_ANZAHL), B('Grandhotel „Sternenduft"', grand ? 1 : 0, 1), B('Ameisen-Bewusstsein', bw, 2000)] },
  ];
  let typ = 0;
  for (const s of stufen) {
    s.anteil = s.bedingungen.reduce((a, b) => a + b.ist / b.soll, 0) / s.bedingungen.length;
    s.erreicht = s.bedingungen.every(b => b.ok) && (s.nr === 1 || stufen[s.nr - 2].erreicht);
    if (s.erreicht) typ = s.nr;
  }
  const naechste = stufen.find(s => !s.erreicht) ?? null;
  const wert = typ + (naechste ? naechste.anteil * 0.999 : 0);
  // Beiträge der einzelnen Kolonien (für die Karte)
  const beitraege = ids.map(id => {
    const h = hotelVon(state, id).stufe;
    const v = routenListe(state).filter(r => fertig(r) && verbindet(r, id)).length;
    const k = kolonieDaten(state, id);
    const pop = id === aktiveId(state) ? state.volk.arbeiterinnen : k?.volk?.arbeiterinnen ?? 0;
    const bauten = (k?.rooms ?? []).filter(r => r.bau >= 1).length;
    return { id, punkte: Math.round(10 + pop / 4 + h * 8 + v * 6 + bauten * 1.5) };
  });
  const summe = beitraege.reduce((a, b) => a + b.punkte, 0) || 1;
  for (const b of beitraege) b.anteil = b.punkte / summe;
  return { typ, wert, stufen, naechste, beitraege, bewusstsein: bw };
}

// ---------------------------------------------------------------- Duftkarte
export function duftKarte(state, dAktiv) {
  const liste = kolonieListe(state, dAktiv);
  const kolonien = liste.map(k => {
    const q = k.quote ?? {};
    const duefte = [
      { art: 'futter', staerke: k.fuellung },
      { art: 'alarm', staerke: Math.max(0, Math.min(1, (70 - k.zufriedenheit) / 50 + (k.fuellung < 0.15 ? 0.4 : 0))) },
      { art: 'bau', staerke: Math.min(1, k.baustellen / 3) },
      { art: 'lern', staerke: q.bildung ?? Math.min(1, k.bildung / Math.max(1, k.pop)) },
      { art: 'freude', staerke: Math.max(0, Math.min(1, k.zufriedenheit / 100)) },
      { art: 'weg', staerke: Math.min(1, (k.strassen + k.boten) / 4) },
    ].map(x => ({ ...x, ...DUEFTE[x.art], text: duftText(x.art, x.staerke, k) }));
    return { id: k.id, name: k.name, x: k.x, y: k.y, duefte };
  });
  const spuren = routenListe(state).map(r => ({ id: r.id, art: r.art, a: r.a, b: r.b, stufe: r.stufe, fertig: fertig(r), staerke: fertig(r) ? 0.4 + 0.2 * (r.stufe ?? 1) : r.bau * 0.4 }));
  return { kolonien, spuren };
}
function duftText(art, s, k) {
  const p = Math.round(s * 100);
  switch (art) {
    case 'futter': return s > 0.6 ? `Volle Vorräte (${p} %) – lecker!` : s > 0.25 ? `Vorräte halb voll (${p} %).` : `Wenig Futter (${p} %) – Sammlerinnen oder eine Straße zu einer vollen Kolonie helfen.`;
    case 'alarm': return s < 0.15 ? 'Alles ruhig – kein Alarm.' : `Etwas Alarm (${p} %): Zufriedenheit ${Math.round(k.zufriedenheit)} %.`;
    case 'bau': return k.baustellen ? `${k.baustellen} Baustelle${k.baustellen > 1 ? 'n' : ''} in Arbeit.` : 'Gerade keine Baustellen.';
    case 'lern': return k.bildungName ? `Bildung: ${k.bildungName}.` : 'Noch keine Schule – ein Kindergarten wäre ein guter Anfang.';
    case 'freude': return `Zufriedenheit ${Math.round(k.zufriedenheit)} %.`;
    case 'weg': return k.strassen + k.boten ? `${k.strassen} Straße(n), ${k.boten} Botenlinie(n).` : 'Noch nicht mit anderen Kolonien verbunden.';
  }
  return '';
}

// ---------------------------------------------------------------- Bedarf & Infrastruktur
/** Was fehlt wo? Liste je Kolonie plus globale Hinweise – sortiert nach Wichtigkeit. */
export function bedarf(state, dAktiv) {
  const liste = kolonieListe(state, dAktiv);
  const viele = liste.length > 1;
  const proKolonie = liste.map(k => {
    const items = [];
    const add = (prio, icon, text, aktion = null) => items.push({ prio, icon, text, aktion });
    if (viele && !k.hotel.stufe) add(2, '🏨', 'Kein Hotel: Gäste aus anderen Kolonien können hier nicht übernachten. Baue ein Duft-Gästehaus.', { art: 'bauen', typ: 'gaestehaus' });
    if (viele && !k.strassen) add(2, '🛣️', 'Keine Ameisenstraße: kein Warenaustausch, keine Gäste.', { art: 'route', route: 'strasse' });
    if (viele && !k.boten) add(1, '📨', 'Keine Botenlinie: Wissen kommt hier nicht an.', { art: 'route', route: 'boten' });
    if (k.fuellung < 0.2) add(3, '🍯', 'Wenig Nahrung! Pilzgarten, Sammel-Trupps oder eine Straße zu einer vollen Kolonie helfen.');
    const q = k.quote ?? {};
    if ((q.wohnen ?? 1) < 0.7) add(2, '🛏️', 'Zu wenig Wohnraum – Schlafkammern bauen oder ausbauen.', { art: 'bauen', typ: 'wohnen' });
    if ((q.bildung ?? 1) < 0.5) add(1, '🎓', k.bildungName ? `Mehr Bildung nötig – ${k.bildungName} ausbauen.` : 'Keine Schule – baue einen Ameisen-Kindergarten.', { art: 'bauen', typ: 'kita' });
    if ((q.freizeit ?? 1) < 0.5) add(1, '🎉', 'Langeweile – ein Freizeit-Gebäude würde guttun.');
    if ((q.hygiene ?? 1) < 0.5) add(1, '🧼', 'Sauberkeit fehlt – Abfallkammer oder Apotheke bauen.', { art: 'bauen', typ: 'muell' });
    if ((q.waerme ?? 1) < 0.5) add(1, '☀️', 'Es ist kühl – Hügel ausbauen oder Sonnenterrasse bauen.');
    if (k.zufriedenheit >= 75 && !items.length) add(0, '🌟', 'Alles bestens – diese Kolonie blüht!');
    items.sort((a, b) => b.prio - a.prio);
    return { id: k.id, name: k.name, x: k.x, y: k.y, items };
  });
  const global = [];
  const ks = krabbelschow(state);
  if (ks.naechste) for (const b of ks.naechste.bedingungen.filter(b => !b.ok)) global.push({ prio: 2, icon: ks.naechste.icon, text: `Für Krabbelschow-Typ ${ks.naechste.nr}: ${b.text} (${Math.floor(b.ist)}/${b.soll})` });
  const gruppen = netzGruppen(state);
  if (gruppen.length > 1) global.push({ prio: 2, icon: '🧩', text: `Dein Reich besteht aus ${gruppen.length} getrennten Teilen – verbinde sie mit Straßen oder Botenlinien.` });
  return { proKolonie, global };
}

/** Handelsrouten-Überblick für das HUD: was fließt gerade wohin? */
export function fluesse(state, dAktiv) {
  const liste = kolonieListe(state, dAktiv);
  const byId = Object.fromEntries(liste.map(k => [k.id, k]));
  return routenListe(state).filter(fertig).map(r => {
    const A = byId[r.a], B = byId[r.b];
    let ware = null;
    if (r.art === 'strasse' && A && B && Math.abs(A.fuellung - B.fuellung) >= 0.12) ware = { von: A.fuellung > B.fuellung ? r.a : r.b, nach: A.fuellung > B.fuellung ? r.b : r.a, icon: '🍯' };
    return { ...r, ware, wissen: r.art === 'boten' };
  });
}

export { SIM };
