// Weitere Bildschirme: Start, Aufgaben, Wissensbuch, Einstellungen, Kammer-Info.
import { h, fmt, fill } from '../util.js';
import { GEBAEUDE, FAECHER } from '../game/config.js';
import { MISSIONEN, fortschritt } from '../game/missions.js';
import { themenVon, meisterschaft, anzahlFragen } from '../quiz/engine.js';
import { hasSave, saveInfo, resetSave } from '../game/state.js';
import { openModal, confirmDialog } from './modal.js';
import { drawAnt } from '../render/antdraw.js';
import { configureAudio, canSpeak } from '../audio.js';
import { SPIELE } from './minigames.js';

export function startScreen(onNeu, onWeiter) {
  const root = document.getElementById('start');
  const logo = h('canvas.logo-ant', { width: 360, height: 240 });
  const lctx = logo.getContext('2d');
  let t = 0;
  const anim = () => {
    if (!logo.isConnected) return;
    t += 0.016;
    lctx.setTransform(2, 0, 0, 2, 0, 0);
    lctx.clearRect(0, 0, 180, 120);
    drawAnt(lctx, { x: 92, y: 92 + Math.sin(t * 2) * 2, L: 120, dir: 1, rolle: 'koenigin', phase: t * 2, walking: false, tilt: Math.sin(t) * 0.03 });
    requestAnimationFrame(anim);
  };
  const info = saveInfo();
  const name = h('input', { value: 'Lena', maxlength: 16, placeholder: 'Dein Name', autocomplete: 'off' });
  const kol = h('input', { value: 'Krümelhausen', maxlength: 20, placeholder: 'Name deines Ameisenstaates', autocomplete: 'off' });
  name.value = ''; name.placeholder = 'z. B. Lena';
  const neu = async () => {
    if (info && !(await confirmDialog('Neues Spiel?', 'Dein bisheriger Ameisenstaat wird dabei gelöscht. Wirklich neu anfangen?', 'Ja, neu starten'))) return;
    resetSave();
    fill(root);
    onNeu(name.value.trim() || 'Königin', kol.value.trim() || 'Krümelhausen');
  };
  fill(root, h('div.start-bg'), h('div.start-karte',
    logo,
    h('div.logo', 'Ameisenreich'),
    h('div.untertitel', 'Baue deinen Ameisenstaat – mit Wissen, Köpfchen und Fleiß!'),
    info ? h('div.spielstand', `👑 Gespeichert: „${info.kolonie}" von ${info.name} · ${fmt(info.pop)} Ameisen`) : null,
    h('div.start-knoepfe',
      info ? h('button.btn.gruen.gross', { onclick: () => { fill(root); onWeiter(); } }, '▶ Weiterspielen') : null,
      h('details', { open: !info },
        h('summary', { style: { cursor: 'pointer', fontWeight: 600, color: '#7a5a3a', margin: '4px 0 10px' } }, info ? 'Oder: neues Spiel beginnen' : 'Neues Spiel'),
        h('div.start-form',
          h('label', 'Wie heißt du, Königin?'), name,
          h('label', 'Wie soll dein Ameisenstaat heißen?'), kol,
          h('button.btn.gross', { onclick: neu, style: { marginTop: '6px' } }, '👑 Ameisenstaat gründen'),
        ),
      ),
    ),
    h('div.fusszeile', '📚 Lernstoff Klasse 4 nach dem Bildungsplan Baden-Württemberg · Deutsch, Mathe, Sachunterricht, Englisch, Musik & Kunst, Sport & Miteinander',
      h('br'), '💾 Dein Spiel wird automatisch in diesem Browser gespeichert.'),
  ));
  anim();
}

export function missionenScreen(game) {
  const s = game.state;
  openModal({ titel: 'Aufgaben', unter: `${s.missionen.erledigt.length} von ${MISSIONEN.length} geschafft`, icon: '📜', farbe: ['#ff9f1c', '#ffc93c'],
    inhalt: h('div.missionen-liste', MISSIONEN.map(m => {
      const fertig = s.missionen.erledigt.includes(m.id);
      const aktuell = !fertig && MISSIONEN.find(x => !s.missionen.erledigt.includes(x.id)) === m;
      const f = fortschritt(s, m, game.d);
      const lohn = [m.lohn.sterne && `⭐ ${m.lohn.sterne}`, m.lohn.gang && `🧱 ${m.lohn.gang}`, m.lohn.joker && `🃏 ${m.lohn.joker}`, m.lohn.plan && `${GEBAEUDE[m.lohn.plan].icon}`].filter(Boolean).join(' ');
      return h('div.mission-zeile' + (fertig ? '.fertig' : ''), { style: aktuell ? { border: '3px solid #ffc93c' } : null },
        h('div.em', fertig ? '✅' : m.icon),
        h('div', h('div.tt', m.titel), h('div.ds', fertig || aktuell ? m.text : '🔒 Wird freigeschaltet, wenn du die vorherigen Aufgaben schaffst.'),
          aktuell ? h('div', { style: { fontSize: '.8rem', color: '#8a5a00', marginTop: '3px' } }, `Fortschritt: ${Math.floor(f.ist)} / ${f.soll}`) : null),
        h('div.lohn', lohn));
    })),
  });
}

const farbeFuer = p => (p > 0.8 ? '#2fae4a' : p > 0.55 ? '#8bc34a' : p > 0.3 ? '#ffb020' : '#ff7a5c');

export function wissensbuch(game) {
  const s = game.state;
  const m = openModal({ titel: 'Wissensbuch', unter: 'Dein Lernfortschritt & Ameisen-Lexikon', icon: '📊', klasse: 'breit', farbe: ['#43c46b', '#8be07a'] });
  const tab = (name) => {
    tabs.querySelectorAll('button').forEach(b => b.classList.toggle('an', b.dataset.t === name));
    if (name === 'lernen') fill(inhalt, lernen());
    else if (name === 'lexikon') fill(inhalt, lexikon());
    else fill(inhalt, statistik());
  };
  const tabs = h('div.tabs',
    h('button', { 'data-t': 'lernen', onclick: () => tab('lernen') }, '📚 Fächer & Themen'),
    h('button', { 'data-t': 'lexikon', onclick: () => tab('lexikon') }, '🐜 Ameisen-Lexikon'),
    h('button', { 'data-t': 'stat', onclick: () => tab('stat') }, '🏅 Statistik'));
  const inhalt = h('div');
  m.render(tabs, inhalt);
  tab('lernen');

  function lernen() {
    const L = s.lernen;
    return h('div',
      h('p', { style: { marginTop: 0, color: '#6a5038' } }, `Du hast ${fmt(L.gesamt)} Fragen beantwortet, davon ${fmt(L.richtig)} richtig (${L.gesamt ? Math.round(L.richtig / L.gesamt * 100) : 0} %). In der Bibliothek warten ${fmt(anzahlFragen())} Fragen plus unendlich viele Rechen-Aufgaben.`),
      Object.entries(FAECHER).map(([k, f]) => {
        const pf = L.proFach[k] ?? { r: 0, n: 0 };
        const mm = meisterschaft(s, k);
        return h('div.wissen-fach',
          h('div.kopf', h('span.em', f.icon), h('div', h('div.nm', f.name), h('div', { style: { fontSize: '.8rem', color: '#8a6a4a' } }, f.ort)),
            h('div.zahlen', h('b', Math.round(mm * 100) + ' % Können'), h('br'), `${pf.r} / ${pf.n} richtig`)),
          themenVon(k).map(t => {
            const i = L.themen[`${k}:${t.key}`];
            const p = i ? i.m * Math.min(1, i.n / 6) : 0;
            return h('div.thema-zeile', { title: t.bildungsplan ?? t.beschreibung ?? '' }, h('span', t.icon), h('span', t.name),
              h('div.track', h('i', { style: { width: p * 100 + '%', background: farbeFuer(p) } })),
              h('span.q', i ? `${i.r}/${i.n}` : 'neu'));
          }));
      }));
  }
  function lexikon() {
    const gebaut = new Set(s.rooms.map(r => r.typ));
    return h('div',
      h('p', { style: { marginTop: 0, color: '#6a5038' } }, 'Jede Kammer, die du baust, schaltet echtes Ameisenwissen frei!'),
      h('div.lexikon', Object.entries(GEBAEUDE).map(([k, g]) => gebaut.has(k)
        ? h('div.eintrag', h('b', `${g.icon} ${g.name}`), g.fakt)
        : h('div.eintrag.zu', h('b', `🔒 ${g.name}`), 'Baue diese Kammer, um das Geheimnis zu lüften.'))));
  }
  function statistik() {
    const st = s.stats;
    return h('div',
      h('div.info-grid',
        h('div.info-box', h('h4', 'Bauen'), `⛏️ ${st.gegraben} Gangstücke gegraben`, h('br'), `🏗️ ${st.gebaut} Kammern gebaut`, h('br'), `🔁 ${st.ersetzt} Gangstücke durch Kammern ersetzt`, h('br'), `🪽 ${st.hochzeitsfluege} Hochzeitsflüge`),
        h('div.info-box', h('h4', 'Lernen'), `📚 ${st.quizRunden} Quizrunden`, h('br'), `✅ ${s.lernen.richtig} richtige Antworten`, h('br'), `🔥 Beste Serie: ${s.lernen.besteSerie}`),
      ),
      h('h3', '🧠 Denksport-Rekorde'),
      h('div.info-grid', SPIELE.map(sp => {
        const r = s.minispiele[sp.id];
        return h('div.info-box', h('h4', `${sp.icon} ${sp.name}`), r ? `🏅 ${r.bestText} · ${r.gespielt}× gespielt` : 'Noch nicht gespielt', h('br'), h('small', sp.trainiert));
      })),
    );
  }
}

export function einstellungen(game) {
  const s = game.state, e = s.einstellungen;
  const schalter = (key, label, hinweis) => {
    const sw = h('button.schalter' + (e[key] ? '.an' : ''), { 'aria-pressed': String(!!e[key]), onclick: () => {
      e[key] = !e[key]; sw.classList.toggle('an', e[key]); configureAudio(e); game.save();
    } });
    return h('div.einst-zeile', h('div', label, hinweis ? h('div', { style: { fontSize: '.8rem', color: '#8a6a4a' } }, hinweis) : null), sw);
  };
  const tempo = h('div.seg', [1, 2].map(t => h('button' + (e.tempo === t ? '.an' : ''), { onclick: ev => { e.tempo = t; ev.target.parentElement.querySelectorAll('button').forEach(b => b.classList.toggle('an', b === ev.target)); } }, t === 1 ? 'Normal' : 'Schnell ⏩')));
  const m = openModal({ titel: 'Einstellungen', icon: '⚙️', klasse: 'schmal', farbe: ['#8a6a4a', '#b8946a'],
    inhalt: h('div',
      schalter('ton', '🔔 Geräusche'),
      schalter('musik', '🎵 Musik'),
      schalter('vorlesen', '🔊 Vorlesen erlauben', canSpeak() ? 'Fragen können vorgelesen werden (🔊-Knopf).' : 'Dein Browser unterstützt kein Vorlesen.'),
      h('div.einst-zeile', h('div', '⏱️ Spieltempo'), tempo),
      h('div.einst-zeile', h('div', '💾 Spiel speichern', h('div', { style: { fontSize: '.8rem', color: '#8a6a4a' } }, 'Passiert auch automatisch.')),
        h('button.btn.klein.gruen', { onclick: () => { game.save(); m.close(); } }, 'Speichern')),
      h('div.einst-zeile', h('div', '🏠 Zum Startbildschirm'), h('button.btn.klein.grau', { onclick: () => { game.save(); location.reload(); } }, 'Beenden')),
      h('div.einst-zeile', h('div', '🗑️ Spielstand löschen', h('div', { style: { fontSize: '.8rem', color: '#8a6a4a' } }, 'Achtung: alles weg!')),
        h('button.btn.klein.pink', { onclick: async () => {
          if (await confirmDialog('Wirklich löschen?', 'Dein ganzer Ameisenstaat und dein Lernfortschritt werden gelöscht.', 'Ja, löschen')) { game.stopAutosave(); resetSave(); location.reload(); }
        } }, 'Löschen')),
      h('div.wusstest', h('span.em', '👪'), h('div', h('b', 'Für Eltern & Lehrkräfte: '),
        'Die Fragen orientieren sich am Bildungsplan 2016 (Baden-Württemberg) für die Klassen 3/4. Das Spiel wiederholt falsch beantwortete Fragen gezielt (Leitner-System) und passt die Schwierigkeit an. Der Lernstand steht im Wissensbuch 📊. Kurze Spieleinheiten (20–30 Minuten) sind ideal.')),
    ) });
}

export function roomInfo(game, room) {
  const g = GEBAEUDE[room.typ];
  const d = game.d;
  const pers = d.personal.get(room.id) ?? 0;
  const eff = d.eff.get(room.id) ?? 0;
  const wirkung = [];
  for (const [k, v] of Object.entries(g.liefert ?? {})) wirkung.push(`${{ nahrung: '🍯', wohnen: '🛏️', freizeit: '🎉', bildung: '🎓', hygiene: '🧼', waerme: '☀️' }[k]} versorgt ${v} Ameisen mit ${{ freizeit: 'Freizeit', bildung: 'Bildung', hygiene: 'Sauberkeit', waerme: 'Wärme' }[k] ?? k}`);
  const ef = g.effekte ?? {};
  if (ef.nahrung) wirkung.push(`🍯 +${Math.round(ef.nahrung * 60)} Nahrung pro Minute`);
  if (ef.wohnraum) wirkung.push(`🛏️ Platz für ${ef.wohnraum} Ameisen`);
  if (ef.brutPlatz) wirkung.push(`🥚 Platz für ${ef.brutPlatz} Eier, Larven oder Puppen`);
  if (ef.lager) wirkung.push(`🫙 +${ef.lager} Lagerplatz`);
  const status = room.bau < 1 ? `🏗️ Wird gebaut: ${Math.round(room.bau * 100)} %` : room.verbunden === false ? '⚠️ Keine Verbindung zur Königin! Grabe einen Gang hierher.' : g.personal ? `${eff >= 1 ? '✅' : '⚠️'} Arbeitet mit ${Math.round(Math.min(1, eff) * 100)} % Kraft` : '✅ In Betrieb';
  const m = openModal({ titel: g.name, unter: status, icon: g.icon, klasse: 'schmal', farbe: [g.farbe, '#ffc93c'],
    inhalt: h('div',
      h('p', { style: { fontSize: '1.05rem', lineHeight: '1.45', marginTop: 0 } }, g.text),
      h('div.info-grid',
        h('div.info-box', h('h4', 'Wirkung'), wirkung.length ? wirkung.map(w => h('div', w)) : h('div', '—')),
        h('div.info-box', h('h4', 'Ausgebildete Ameisen'), g.personal ? [h('div', `👷 ${pers} von ${g.personal} ${g.beruf.name}${g.personal > 1 ? 'nen' : ''}`),
          pers < g.personal ? h('div', { style: { fontSize: '.85rem', color: '#a0522d' } }, 'Mehr Arbeiterinnen nötig – lass dein Volk wachsen!') : null] : h('div', 'Braucht kein Personal.')),
      ),
      h('div.wusstest', h('span.em', '💡'), h('div', h('b', 'Wusstest du? '), g.fakt)),
      g.abreissbar === false ? null : h('div', { style: { textAlign: 'right', marginTop: '14px' } },
        h('button.btn.klein.pink', { onclick: async () => {
          if (await confirmDialog(`${g.name} abreißen?`, room.bau < 1 ? 'Du bekommst Bauplan und Sterne zurück.' : `Du bekommst den Bauplan und ${Math.floor(g.kosten / 2)} ⭐ zurück.`, 'Abreißen')) {
            m.close(); game.demolishRoom(room);
          }
        } }, '🧹 Abreißen')),
    ) });
}
