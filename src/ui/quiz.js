// Quiz-Oberfläche im Schul-Takt: Stundenplan → Thema im aktuellen Fach wählen → Test-Vorschau (was gibt es zu gewinnen?)
// → Fragen → Ergebnis. Ein perfekter Test schaltet einen Bauplan frei, sonst gibt es Rohstoffe.
import { h, pick, shuffle, fill } from '../util.js';
import { FAECHER, GEBAEUDE, LINIEN, QUIZ } from '../game/config.js';
import { themenVon, recordAnswer, pruefeEingabe, richtigeAntwortText, meisterschaft, prep } from '../quiz/engine.js';
import {
  WOCHENPLAN, WOCHENTAGE, WOCHENTAGE_KURZ, STUNDEN_ZEITEN, STUNDEN_PRO_TAG, aktuelleStunde, stundeBeenden, stundenStatus,
  themaTests, fachTests, spielbareTests, offeneFaecher, bauplanVerteilung, testBelohnung, testFragen, testErgebnis, pruefeAltlasten, testStand,
} from '../quiz/stundenplan.js';
import { schalteFrei, planVerfuegbar, istFrei, neuBaubar } from '../game/bauplaene.js';
import { gebaeudeBild } from '../render/vorschau.js';
import { openModal, sterneFlug, konfetti, toast } from './modal.js';
import { sfx, speak, canSpeak, stopSpeak } from '../audio.js';
import { drawAnt } from '../render/antdraw.js';
import { emit } from '../events.js';
import { openFragenArchiv, rundenListe, closeTooltip } from './archiv.js';
import { openBauplanBuch, planKarte } from './bauplanBuch.js';

const LOB = ['Super gemacht!', 'Klasse!', 'Richtig – du bist eine echte Wissens-Ameise!', 'Spitze!', 'Genau so!', 'Wow, stark!', 'Toll gedacht!'];
const MUT = ['Nicht schlimm – jetzt weißt du es!', 'Fehler sind zum Lernen da!', 'Fast! Lies dir die Erklärung durch.', 'Kopf hoch – beim nächsten Mal klappt es!', 'Gut, dass wir das üben!'];
const BST = ['A', 'B', 'C', 'D'];

function maskottchen() {
  const cv = h('canvas.maskottchen', { width: 300, height: 300 });
  const ctx = cv.getContext('2d');
  const st = { mood: 'idle', t: 0, moodT: 0, raf: 0 };
  let last = performance.now();
  const loop = now => {
    // 30 Bilder pro Sekunde reichen für das Maskottchen
    if (now - last < 32) { if (cv.isConnected) st.raf = requestAnimationFrame(loop); return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    st.t += dt; st.moodT += dt;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 150, 150);
    const jump = st.mood === 'jubel' ? Math.abs(Math.sin(st.moodT * 9)) * 18 * Math.max(0, 1 - st.moodT / 1.4) : 0;
    const tilt = st.mood === 'traurig' ? 0.15 : Math.sin(st.t * 1.5) * 0.03;
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.beginPath(); ctx.ellipse(75, 128, 48 - jump, 7, 0, 0, 7); ctx.fill();
    drawAnt(ctx, { x: 80, y: 110 - jump, L: 110, dir: 1, tilt, phase: st.t * (st.mood === 'jubel' ? 12 : 2), rolle: 'arbeiterin', acc: 'doktorhut', walking: st.mood === 'jubel' });
    if (st.mood === 'jubel' && st.moodT < 1.5) {
      ctx.font = '22px "Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
      ctx.fillText('✨', 20, 40 - st.moodT * 10); ctx.fillText('⭐', 115, 34 - st.moodT * 14);
    }
    if (cv.isConnected) st.raf = requestAnimationFrame(loop);
  };
  st.raf = requestAnimationFrame(loop);
  return { el: cv, set(m) { st.mood = m; st.moodT = 0; } };
}

const ROH = { sterne: '⭐', gang: '🧱', fp: '🔬', material: '🪵', nahrung: '🍯', joker: '🃏' };
const roh = o => Object.entries(o).filter(([, v]) => v).map(([k, v]) => `${ROH[k] ?? ''} ${v}`).join('  ·  ');
const uhr = sek => `${Math.floor(sek / 60)}:${String(Math.floor(sek % 60)).padStart(2, '0')}`;
const niveauSterne = n => '★'.repeat(n) + '☆'.repeat(3 - n);

export function openQuiz(game) {
  const s = game.state;
  pruefeAltlasten(s);
  const m = openModal({ titel: 'Stundenplan', unter: '', icon: '🎒', klasse: 'breit', farbe: ['#ff9f1c', '#ffc93c'] });
  game.pause(true);
  const origClose = m.close;
  m.close = r => { closeTooltip(); origClose(r); game.pause(false); };
  const quizBonus = () => game.d.fx.quizBonus ?? 0;

  // ------------------------------------------------------------ Stundenplan
  function stundenplan() {
    const st = aktuelleStunde(s);
    m._key = null;
    m.setFarbe('#ff9f1c', '#ffc93c'); m.setIcon('🎒');
    m.setTitel(`Stundenplan · Woche ${st.woche}`, st.schulschluss ? `${WOCHENTAGE[st.wtag]} · Schulschluss` : `${WOCHENTAGE[st.wtag]} · ${st.stunde + 1}. Stunde`);
    const F = st.fach ? FAECHER[st.fach] : null;
    const fachOffen = st.fach && spielbareTests(s, st.fach).length > 0;
    let jetzt;
    if (st.schulschluss) {
      jetzt = h('div.jetzt-karte.frei',
        h('div.jk-em', '🎒'),
        h('div.jk-text',
          h('div.jk-klein', 'Schulschluss für heute!'),
          h('div.jk-gross', 'Super gelernt! 🌟'),
          h('div.jk-info', `Der nächste Schultag beginnt mit dem neuen Ameisentag – in ${uhr(st.sekundenBisMorgen)} min. Bis dahin: bauen, das Revier erkunden oder Denksport spielen!`)),
        h('div.jk-knoepfe',
          h('button.btn.lila', { onclick: () => { m.close(); game.openMinigames(); } }, '🧠 Denksport'),
          h('button.btn.gruen', { onclick: () => m.close() }, '🏗️ Weiterbauen')));
    } else if (!fachOffen) {
      const andere = offeneFaecher(s);
      jetzt = h('div.jetzt-karte', { style: { '--f1': F.farbe, '--f2': F.farbe2 } },
        h('div.jk-em', F.icon),
        h('div.jk-text',
          h('div.jk-klein', `${st.stunde + 1}. Stunde · ${STUNDEN_ZEITEN[st.stunde]}`),
          h('div.jk-gross', `${F.name}: alles geschafft! 🏆`),
          h('div.jk-info', andere.length ? 'Alle Tests in diesem Fach sind bestanden. Diese Stunde ist Freiarbeit – wähle ein anderes Fach:' : 'Du hast wirklich ALLE Tests bestanden! Im Fragen-Archiv kannst du alles nachlesen.')),
        h('div.jk-knoepfe', andere.map(f => h('button.btn.klein', { style: { background: FAECHER[f].farbe }, onclick: () => themenWahl(f, true) }, `${FAECHER[f].icon} ${FAECHER[f].name}`))));
    } else {
      jetzt = h('button.jetzt-karte.los', { style: { '--f1': F.farbe, '--f2': F.farbe2 }, onclick: () => themenWahl(st.fach) },
        h('div.jk-em', F.icon),
        h('div.jk-text',
          h('div.jk-klein', `Jetzt: ${st.stunde + 1}. Stunde · ${STUNDEN_ZEITEN[st.stunde]}`),
          h('div.jk-gross', F.name),
          h('div.jk-info', `${F.ort} – wähle dein Thema und schreibe einen Test.`)),
        h('div.jk-los', 'Zum Unterricht ➜'));
    }
    // Wochenraster
    const raster = h('div.wochenraster', { style: { '--tage': WOCHENPLAN.length } },
      h('div.wr-ecke'),
      WOCHENTAGE_KURZ.map((t, i) => h('div.wr-tag' + (i === st.wtag ? '.heute' : ''), t)),
      Array.from({ length: STUNDEN_PRO_TAG }, (_, std) => [
        std === 2 ? [h('div.wr-pause', '🥪 Große Pause'), WOCHENPLAN.map((_, i) => h('div.wr-pause-zelle' + (i === st.wtag ? '.heute' : '')))] : null,
        h('div.wr-zeit', h('b', `${std + 1}.`), h('small', STUNDEN_ZEITEN[std])),
        WOCHENPLAN.map((tag, wt) => {
          const f = tag[std], FF = FAECHER[f];
          const status = stundenStatus(s, wt, std);
          const eintrag = s.schule.verlauf.findLast?.(v => v.woche === st.woche && v.wtag === wt && v.stunde === std);
          return h('div.wr-stunde.' + status + (wt === st.wtag ? '.heute' : ''), { style: { '--f1': FF.farbe, '--f2': FF.farbe2 }, title: `${WOCHENTAGE[wt]}, ${std + 1}. Stunde: ${FF.name}` },
            h('span.em', FF.icon), h('span.nm', FF.name.replace(' & ', ' & ').replace('Sport & Miteinander', 'Sport & Werte')),
            status === 'fertig' ? h('span.haken', eintrag?.perfekt ? '🏆' : eintrag?.bestanden ? '✓' : '•') : null,
            status === 'jetzt' ? h('span.jetzt-pfeil', '▶') : null);
        }),
      ]),
    );
    const fortschritt = h('div.fach-fortschritt', Object.entries(FAECHER).map(([k, f]) => {
      const ft = fachTests(s, k);
      return h('div.ff', { title: `${f.name}: ${ft.bestanden} von ${ft.gesamt} Tests bestanden, ${ft.perfekt} perfekt` },
        h('span.em', f.icon), h('div.ff-track', h('i', { style: { width: (ft.gesamt ? ft.bestanden / ft.gesamt * 100 : 0) + '%', background: f.farbe } })),
        h('small', `${ft.bestanden}/${ft.gesamt}`));
    }));
    m.render(
      h('div.stundenplan-layout', jetzt, raster),
      h('h4.sp-unter', '📈 Bestandene Tests'), fortschritt,
      h('div.sp-fuss',
        h('span', `🃏 Joker: ${s.res.joker} · ✅ Richtige Antworten: ${s.lernen.richtig} · 🔥 Beste Serie: ${s.lernen.besteSerie}`),
        h('div.sp-knoepfe',
          h('button.btn.grau.klein', { onclick: () => openBauplanBuch(game) }, '📐 Bauplan-Buch'),
          h('button.btn.grau.klein', { onclick: () => openFragenArchiv(game, { ausQuiz: true }) }, '🗂️ Fragen-Archiv'))),
    );
    m._key = e => {
      if (e.key === 'Enter' && !st.schulschluss && fachOffen) { themenWahl(st.fach); return true; }
      return false;
    };
  }

  // ------------------------------------------------------------ Themenwahl
  function themenWahl(fach, freiarbeit = false) {
    const f = FAECHER[fach];
    const st = aktuelleStunde(s);
    m._key = null;
    m.setTitel(f.name, `${freiarbeit ? 'Freiarbeit' : `${st.stunde + 1}. Stunde`} · ${f.ort} – wähle ein Thema`); m.setFarbe(f.farbe, f.farbe2); m.setIcon(f.icon);
    const verteilung = bauplanVerteilung(s, fach);
    const ft = fachTests(s, fach);
    const karten = themenVon(fach).map(t => {
      const tt = themaTests(s, fach, t.key);
      const test = tt.naechster;
      const plan = test ? verteilung.get(test.id) : null;
      const punkte = h('div.test-punkte', tt.tests.map(x => {
        const ts = testStand(s, x.id);
        return h('span.tp' + (ts?.perfekt ? '.perfekt' : ts?.bestanden ? '.ok' : x === test ? '.jetzt' : ''),
          { title: `Test ${x.nr}: ${ts?.perfekt ? 'perfekt!' : ts?.bestanden ? 'bestanden' : x === test ? 'als Nächstes' : 'noch offen'}` }, ts?.perfekt ? '★' : ts?.bestanden ? '✓' : x.nr);
      }));
      if (!test) {
        return h('div.thema-karte.fertig',
          h('div.tk-kopf', h('span.em', t.icon), h('div', h('div.nm', t.name), h('div.bs', 'Alle Tests bestanden! 🏆'))), punkte,
          h('div.tk-lohn.fertig', h('span', '🏆 Gemeistert'), h('button.link', { onclick: () => openFragenArchiv(game, { fach, ausQuiz: true }) }, 'Fragen ansehen')));
      }
      const bel = testBelohnung(s, test, quizBonus(), plan);
      return h('button.thema-karte' + (plan ? '.mit-plan' : ''), { onclick: () => testIntro(test, plan, freiarbeit), title: t.bildungsplan ?? '' },
        h('div.tk-kopf', h('span.em', t.icon), h('div', h('div.nm', t.name), h('div.bs', t.beschreibung ?? ''))),
        punkte,
        h('div.tk-test', `Test ${test.nr} von ${test.von} · ${test.n} Fragen · `, h('span.niv', { title: 'Schwierigkeit' }, niveauSterne(test.niveau))),
        plan
          ? h('div.tk-lohn.plan', h('div.tk-bild', gebaeudeBild(plan, { zoom: 0.42 })), h('div', h('b', `${GEBAEUDE[plan].icon} ${GEBAEUDE[plan].name}`), h('small', `🏆 Bauplan bei ${test.n} von ${test.n} richtig`)))
          : h('div.tk-lohn', h('b', '🎁 Rohstoffe'), h('small', `bis ⭐ ${bel.sterneMax} · 🧱 ${test.n * bel.proRichtig.gang} · 🪵 ${bel.bestanden.material}${bel.perfektOhnePlan ? ` · 🃏` : ''}`)));
    });
    m.render(
      h('div.themen-kopfzeile',
        h('button.btn.grau.klein', { onclick: stundenplan }, '← Stundenplan'),
        h('span.fach-stand' + (ft.offen === 0 ? '.alles' : ''), `📝 Tests bestanden: ${ft.bestanden} / ${ft.gesamt}  ·  ★ perfekt: ${ft.perfekt}`),
        h('button.btn.grau.klein', { onclick: () => openFragenArchiv(game, { fach, ausQuiz: true }) }, '🗂️ Archiv')),
      h('p.themen-tipp', '💡 Bei einem Thema mit Bauplan musst du ALLE Fragen richtig beantworten, um ihn zu bekommen. Sonst gibt es Rohstoffe – je mehr richtig, desto mehr!'),
      h('div.themen-karten', karten),
    );
  }

  // ------------------------------------------------------------ Test-Vorschau
  function testIntro(test, plan, freiarbeit) {
    const f = FAECHER[test.fach];
    const t = themenVon(test.fach).find(x => x.key === test.thema);
    const bel = testBelohnung(s, test, quizBonus(), plan);
    m.setTitel(`${t?.icon ?? ''} ${t?.name ?? ''}`, `${f.name} · Test ${test.nr} von ${test.von} · ${niveauSterne(test.niveau)}`);
    const G = plan ? GEBAEUDE[plan] : null;
    const planTeil = plan
      ? h('div.intro-plan',
        h('div.ip-band', '🏆 Hauptgewinn bei allen richtigen Antworten'),
        planKarte(plan, { zoom: GEBAEUDE[plan].w >= 5 ? 1.6 : GEBAEUDE[plan].w >= 4 ? 1.9 : 2.3, lebendig: true, extra: h('div.pv-info', G.text,
          h('div.pv-art', neuBaubar(plan) ? '🏗️ Neues Gebäude – du kannst es danach bauen.' : `⬆️ Ausbau: ${GEBAEUDE[G.vorige].icon} ${GEBAEUDE[G.vorige].name} → ${G.icon} ${G.name}`)) }))
      : h('div.intro-plan.ohne',
        h('div.ip-band', '🎁 Bei allen richtigen Antworten'),
        h('div.ip-schatz', h('span.em', '💰'), h('div', h('b', 'Schatz-Bonus'), h('div', roh(bel.perfektOhnePlan)))),
        h('p.ip-hinweis', 'Für dieses Thema liegt gerade kein Bauplan bereit – dafür gibt es extra Rohstoffe!'));
    const leiter = h('div.belohnungs-leiter',
      h('div.bl-stufe', h('div.bl-wann', '✏️ Jede richtige Antwort'), h('div.bl-was', roh({ sterne: bel.proRichtig.sterne, gang: bel.proRichtig.gang, fp: bel.proRichtig.fp }))),
      h('div.bl-stufe', h('div.bl-wann', `✅ Ab ${bel.noetig} richtig: bestanden`), h('div.bl-was', '+ ' + roh(bel.bestanden))),
      h('div.bl-stufe.top', h('div.bl-wann', `🏆 Alle ${test.n} richtig`), h('div.bl-was', plan ? `${G.icon} Bauplan „${G.name}"` : '+ ' + roh(bel.perfektOhnePlan))),
    );
    m.render(h('div.test-intro',
      planTeil,
      h('div.intro-rechts',
        h('h3', 'Das kannst du gewinnen'),
        leiter,
        h('p.intro-regel', `Der Test hat ${test.n} Fragen. Zählt nur dein erster Versuch – falsche Fragen kannst du danach in der „Zweiten Chance" üben. Bestanden ist bestanden: Der Test kommt dann nicht wieder.`),
        h('div.intro-knoepfe',
          h('button.btn.grau', { onclick: () => themenWahl(test.fach, freiarbeit) }, '← Anderes Thema'),
          h('button.btn.gruen.gross', { onclick: () => runde(test, plan, freiarbeit) }, '✏️ Test starten')))));
    m._key = e => { if (e.key === 'Enter') { runde(test, plan, freiarbeit); return true; } return false; };
  }

  // ------------------------------------------------------------ Fragerunde
  function runde(test, plan, freiarbeit) {
    const fach = test.fach;
    const f = FAECHER[fach];
    const fragen = testFragen(test);
    if (!fragen.length) return themenWahl(fach, freiarbeit);
    const masc = maskottchen();
    const blase = h('div.sprechblase', plan ? `Los geht's! Alle ${fragen.length} richtig = ${GEBAEUDE[plan].icon} Bauplan!` : 'Los geht\'s! Lies jede Frage genau.');
    const ergebnis = { richtig: 0, sterne: 0, falsche: [], zweite: 0, fehler: 0, antworten: [], n: fragen.length, liste: [] };
    let i = 0, zweiteChance = false, queue = fragen;
    const fortschritt = h('div.fortschritt');
    const frageBox = h('div');
    const jokerReihe = h('div.joker-reihe');
    const quizBonusWert = game.d.fx.quizBonus ?? 0;
    const tn = themenVon(fach).find(t => t.key === test.thema)?.name ?? '';
    m.setTitel(f.name, `${tn} · Test ${test.nr}`);
    m.render(h('div.quiz-layout', h('div.quiz-seite', masc.el, blase, jokerReihe, plan ? h('div.runde-plan', gebaeudeBild(plan, { zoom: 0.5 }), h('small', ergebnis.fehler ? 'Diesmal nicht – aber Rohstoffe gibt es trotzdem!' : `Alle richtig = ${GEBAEUDE[plan].name}`)) : null), h('div', fortschritt, frageBox)));
    const planHinweis = () => { const el = m.el.querySelector('.runde-plan small'); if (el) el.textContent = ergebnis.fehler ? 'Diesmal nicht – aber Rohstoffe gibt es trotzdem!' : `Alle richtig = ${GEBAEUDE[plan].name}`; m.el.querySelector('.runde-plan')?.classList.toggle('verpasst', ergebnis.fehler > 0); };

    function zeichneFortschritt() {
      fill(fortschritt, ...queue.map((_, k) => h('span' + (k === i ? '.jetzt' : ergebnis.antworten[zweiteChance ? fragen.length + k : k] === true ? '.r' : ergebnis.antworten[zweiteChance ? fragen.length + k : k] === false ? '.f' : ''))));
      if (plan) planHinweis();
    }

    function zeige() {
      const q = queue[i];
      window.__lastQ = q; // für automatische Tests
      zeichneFortschritt();
      let beantwortet = false;
      const sprecheFrage = () => {
        const opt = q.anzeige ? ' ' + q.anzeige.map((o, k) => (q.typ === 'choice' ? BST[k] + ': ' : '') + o.t).join('. ') : '';
        speak((q.text ? q.text + ' ' : '') + q.frage + opt, q.sprache === 'en' ? 'en-GB' : 'de-DE');
      };
      const kopf = h('div.frage-kopf',
        h('span.chip', `Frage ${i + 1} von ${queue.length}`),
        h('span.chip', '★'.repeat(q.stufe) + '☆'.repeat(3 - q.stufe)),
        zweiteChance ? h('span.chip.wdh', { title: 'Zum Üben – zählt nicht mehr für das Testergebnis' }, '🔁 Zweite Chance') : null,
        !zweiteChance && plan ? h('span.chip.bonus', { title: 'Alles richtig = Bauplan!' }, `${GEBAEUDE[plan].icon} ${ergebnis.fehler ? 'Bauplan diesmal verpasst' : 'Bauplan in Reichweite'}`) : null,
        canSpeak() ? h('button.vorlesen', { title: 'Vorlesen', onclick: sprecheFrage }, '🔊') : null,
      );
      const tippBox = h('div');
      const antwortBereich = h('div');
      const feedback = h('div');

      const fertig = (richtig, el) => {
        if (beantwortet) return;
        beantwortet = true;
        stopSpeak();
        ergebnis.antworten[zweiteChance ? fragen.length + i : i] = richtig;
        let sterne = recordAnswer(s, q, richtig, quizBonusWert);
        ergebnis.liste.push({ q, richtig, zweite: zweiteChance });
        if (zweiteChance) sterne = Math.ceil(sterne / 2);
        if (richtig) {
          if (zweiteChance) ergebnis.zweite++; else ergebnis.richtig++;
          ergebnis.sterne += sterne;
          s.res.sterne += sterne;
          sfx.richtig();
          masc.set('jubel');
          blase.textContent = pick(LOB) + (s.lernen.serie >= 3 ? ` 🔥 ${s.lernen.serie}er-Serie!` : '');
          sterneFlug(el ?? antwortBereich, Math.ceil(sterne / 3));
          setTimeout(() => game.hud.bump('sterne'), 800);
        } else {
          if (!zweiteChance) { ergebnis.falsche.push(q); ergebnis.fehler++; }
          sfx.falsch();
          masc.set('traurig');
          blase.textContent = pick(MUT);
        }
        emit('antwort', { richtig, fach });
        zeichneFortschritt();
        updateJoker();
        const weiter = h('button.btn.gruen', { onclick: naechste }, i + 1 < queue.length || (!zweiteChance && ergebnis.falsche.length) ? 'Weiter ➜' : 'Zum Ergebnis 🎁');
        fill(feedback, h('div.feedback.' + (richtig ? 'gut' : 'schlecht'),
          h('span.em', richtig ? '🎉' : '💡'),
          h('div.tt', richtig ? `Richtig! +${sterne} ⭐` : 'Die richtige Antwort ist: ' + richtigeAntwortText(q)),
          h('div.erk', q.erklaerung),
          h('div.weiter-reihe',
            canSpeak() ? h('button.btn.grau.klein', { onclick: () => speak(q.erklaerung, q.sprache === 'en' && /^[A-Za-z]/.test(q.erklaerung) ? 'en-GB' : 'de-DE') }, '🔊 Erklärung') : null,
            weiter),
        ));
        setTimeout(() => weiter.focus(), 50);
        feedback.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      };

      // --- Antwortformen ---
      if (q.typ === 'choice' || q.typ === 'truefalse') {
        const btns = q.anzeige.map((o, k) => {
          const b = h('button.option', { onclick: () => {
            if (beantwortet) return;
            btns.forEach((bb, kk) => { bb.disabled = true; if (q.anzeige[kk].richtig) bb.classList.add('richtig'); });
            if (!o.richtig) b.classList.add('falsch');
            fertig(o.richtig, b);
          } }, q.typ === 'choice' ? h('span.bst', BST[k]) : null, h('span', o.t));
          return b;
        });
        const lang = q.anzeige.some(o => o.t.length > 28);
        antwortBereich.append(h('div' + (q.typ === 'truefalse' ? '.tf-reihe' : '.optionen' + (lang ? '.einspaltig' : '')), btns));
        antwortBereich._btns = btns;
      } else if (q.typ === 'input' && q.eingabe === 'zahl') {
        let wert = '';
        const anzeige = h('div.eingabe-anzeige.fokus');
        const render = () => fill(anzeige, h('span', wert.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') || ''), beantwortet ? null : h('span.cursor'), q.einheit ? h('span.einheit', q.einheit) : null);
        const pruefen = () => {
          if (!wert || beantwortet) return;
          const ok = pruefeEingabe(q, wert);
          anzeige.style.borderColor = ok ? '#2fae4a' : '#ff7a6b';
          anzeige.style.background = ok ? '#dbffd9' : '#ffe0dc';
          fertig(ok, anzeige); render();
        };
        const taste = t => {
          if (beantwortet) return;
          if (t === '⌫') wert = wert.slice(0, -1);
          else if (t === ',') { if (!wert.includes(',')) wert += wert ? ',' : '0,'; }
          else if (wert.length < 9) wert = (wert === '0' ? '' : wert) + t;
          sfx.tick(); render();
        };
        const brauchtKomma = String(q.loesung).includes(',') || String(q.loesung).includes('.');
        const block = h('div.ziffernblock',
          ['7', '8', '9'].map(t => h('button', { onclick: () => taste(t) }, t)), h('button', { onclick: () => taste('⌫') }, '⌫'),
          ['4', '5', '6'].map(t => h('button', { onclick: () => taste(t) }, t)), h('button.ok', { onclick: pruefen }, 'OK'),
          ['1', '2', '3'].map(t => h('button', { onclick: () => taste(t) }, t)),
          h('button', { onclick: () => taste('0'), style: { gridColumn: brauchtKomma ? 'span 2' : 'span 3' } }, '0'),
          brauchtKomma ? h('button', { onclick: () => taste(',') }, ',') : null,
        );
        render();
        antwortBereich.append(h('div.eingabe-bereich', anzeige, block));
        antwortBereich._key = e => {
          if (/^[0-9]$/.test(e.key)) taste(e.key);
          else if (e.key === 'Backspace') taste('⌫');
          else if (e.key === ',' || e.key === '.') { if (brauchtKomma) taste(','); }
          else if (e.key === 'Enter') pruefen();
          else return false;
          return true;
        };
      } else if (q.typ === 'input') {
        const inp = h('input.text-eingabe', { type: 'text', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false', placeholder: 'Deine Antwort …' });
        const pruefen = () => {
          if (!inp.value.trim() || beantwortet) return;
          const ok = pruefeEingabe(q, inp.value);
          inp.style.borderColor = ok ? '#2fae4a' : '#ff7a6b'; inp.disabled = true;
          fertig(ok, inp);
        };
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') pruefen(); e.stopPropagation(); });
        const sonder = h('div', { style: { display: 'flex', gap: '8px' } }, ['ä', 'ö', 'ü', 'ß', 'Ä', 'Ö', 'Ü'].map(z =>
          h('button.joker', { onclick: () => { if (inp.disabled) return; inp.value += z; inp.focus(); } }, z)));
        antwortBereich.append(h('div.eingabe-bereich', inp, sonder, h('button.btn.gruen', { onclick: pruefen }, 'Prüfen ✓')));
        setTimeout(() => inp.focus(), 100);
      } else if (q.typ === 'order') {
        const ziel = h('div.ordnen-ziel'), pool = h('div.ordnen-pool');
        const gewaehlt = [];
        const pruefBtn = h('button.btn.gruen', { disabled: true, onclick: () => {
          if (beantwortet) return;
          const ok = gewaehlt.join('|') === q.teile.join('|');
          [...ziel.children].forEach((k, idx) => k.classList.add(gewaehlt[idx] === q.teile[idx] ? 'richtig' : 'falsch'));
          fertig(ok, ziel);
        } }, 'Prüfen ✓');
        const draw = () => {
          fill(ziel, ...gewaehlt.map((t, idx) => h('button.kachel', { onclick: () => { if (beantwortet) return; gewaehlt.splice(idx, 1); sfx.tick(); draw(); } }, t)));
          const rest = [...q.gemischt];
          gewaehlt.forEach(t => rest.splice(rest.indexOf(t), 1));
          fill(pool, ...rest.map(t => h('button.kachel', { onclick: () => { if (beantwortet) return; gewaehlt.push(t); sfx.tick(); draw(); } }, t)));
          pruefBtn.disabled = gewaehlt.length !== q.teile.length;
        };
        draw();
        antwortBereich.append(ziel, pool, h('div', { style: { textAlign: 'center', marginTop: '10px' } }, pruefBtn));
      }

      // --- Joker ---
      function updateJoker() {
        const kannFiftyFifty = q.typ === 'choice' && q.anzeige.length >= 3 && !beantwortet && !antwortBereich._ff;
        fill(jokerReihe, 
          h('button.joker', { disabled: !kannFiftyFifty || s.res.joker <= 0, title: 'Zwei falsche Antworten verschwinden', onclick: () => {
            s.res.joker--; antwortBereich._ff = true; sfx.pop();
            const falsche = shuffle(antwortBereich._btns.filter((b, k) => !q.anzeige[k].richtig)).slice(0, q.anzeige.length - 2);
            falsche.forEach(b => { b.classList.add('weg'); b.disabled = true; });
            updateJoker();
          } }, '✂️ 50:50'),
          h('button.joker', { disabled: !q.tipp || beantwortet || antwortBereich._tipp || s.res.joker <= 0, title: 'Ein kleiner Hinweis', onclick: () => {
            s.res.joker--; antwortBereich._tipp = true; sfx.pop();
            fill(tippBox, h('div.tipp-box', '💡 ' + q.tipp));
            updateJoker();
          } }, '💡 Tipp'),
          h('span.joker', { style: { boxShadow: 'none', background: 'transparent' } }, `🃏 × ${s.res.joker}`),
        );
      }
      updateJoker();

      fill(frageBox, 
        kopf,
        q.text ? h('div.lesetext', q.text) : null,
        q.bild ? h('div.frage-bild', q.bild) : null,
        h('div.frage-text', { lang: q.sprache === 'en' ? 'en' : 'de' }, q.frage),
        tippBox, antwortBereich, feedback,
      );
      m.el.scrollTop = 0;
      m._key = e => {
        if (beantwortet) {
          if (e.key === 'Enter') { feedback.querySelector('.btn.gruen')?.click(); return true; }
          return false;
        }
        if (antwortBereich._key) return antwortBereich._key(e);
        if (antwortBereich._btns && /^[1-4]$/.test(e.key)) { antwortBereich._btns[+e.key - 1]?.click(); return true; }
        return false;
      };
    }

    function naechste() {
      i++;
      if (i < queue.length) return zeige();
      if (!zweiteChance && ergebnis.falsche.length) {
        zweiteChance = true;
        queue = ergebnis.falsche.slice(0, 3).map(q => prep(q, true));
        i = 0;
        blase.textContent = 'Zweite Chance! Jetzt kennst du die Erklärungen – probier es nochmal. (Zählt nicht mehr für den Test, bringt aber Sterne.)';
        masc.set('idle');
        return zeige();
      }
      auswertung(test, plan, ergebnis, freiarbeit);
    }
    zeige();
  }

  // ------------------------------------------------------------ Ergebnis
  function auswertung(test, plan, erg, freiarbeit) {
    const f = FAECHER[test.fach];
    m._key = null;
    s.stats.quizRunden++;
    s.lernen.runden++;
    const bel = testBelohnung(s, test, quizBonus(), plan);
    const res = testErgebnis(s, test, erg.richtig);
    const gang = (erg.richtig + erg.zweite) * QUIZ.gangProRichtig;
    s.res.gang += gang;
    const extra = {};
    if (res.bestanden) { s.res.material = (s.res.material ?? 0) + bel.bestanden.material; s.res.nahrung += bel.bestanden.nahrung; Object.assign(extra, bel.bestanden); }
    let neuerPlan = null;
    if (res.perfekt) {
      if (plan && planVerfuegbar(s, plan)) { schalteFrei(s, plan, 'quiz'); neuerPlan = plan; s.stats.bauplaeneQuiz = (s.stats.bauplaeneQuiz ?? 0) + 1; }
      else {
        const b = bel.perfektOhnePlan;
        s.res.sterne += b.sterne; s.res.material = (s.res.material ?? 0) + b.material; s.res.joker = Math.min(9, s.res.joker + b.joker);
        for (const [k, v] of Object.entries(b)) extra[k] = (extra[k] ?? 0) + v;
      }
    }
    s.stats.testsBestanden = (s.stats.testsBestanden ?? 0) + (res.neuBestanden ? 1 : 0);
    s.stats.testsPerfekt = (s.stats.testsPerfekt ?? 0) + (res.perfekt ? 1 : 0);
    const st = aktuelleStunde(s);
    const tagFertig = stundeBeenden(s, { fach: test.fach, test: test.id, richtig: erg.richtig, n: erg.n, bestanden: res.bestanden, perfekt: res.perfekt, plan: neuerPlan, frei: freiarbeit });
    if (res.perfekt) { konfetti(60); sfx.fanfare(); } else if (res.bestanden) sfx.coin(); else sfx.pop();
    const titel = res.perfekt ? 'Perfekt! Alles richtig! 🏆' : res.bestanden ? 'Test bestanden! ✅' : 'Gut geübt! 💪';
    m.setTitel(titel, `${f.name} · ${erg.richtig} von ${erg.n} richtig`);
    m.setIcon(res.perfekt ? '🏆' : res.bestanden ? '✅' : '💪');
    const bereich = h('div.erg-bereich');
    const weiter = h('div.erg-knoepfe',
      h('button.btn.blau', { onclick: stundenplan }, tagFertig ? '🎒 Schulschluss – zum Stundenplan' : `📅 Nächste Stunde: ${FAECHER[WOCHENPLAN[st.wtag][Math.min(STUNDEN_PRO_TAG - 1, st.stunde + 1)]]?.name ?? ''}`),
      neuerPlan
        ? h('button.btn.gruen', { onclick: () => { m.close(); game.nachBauplan?.(neuerPlan); } }, neuBaubar(neuerPlan) ? '🏗️ Jetzt bauen!' : '⬆️ Jetzt ausbauen!')
        : h('button.btn.gruen', { onclick: () => m.close() }, '🐜 Zum Ameisenstaat'));
    m.render(h('div.ergebnis',
      h('div.zeile',
        h('div.stat', 'Beim 1. Versuch', h('b', `${erg.richtig} / ${erg.n}`)),
        erg.zweite ? h('div.stat', 'Zweite Chance', h('b', `+${erg.zweite}`)) : null,
        h('div.stat', 'Sterne', h('b', `+${erg.sterne} ⭐`)),
        h('div.stat', 'Gangstücke', h('b', `+${gang} 🧱`)),
        Object.keys(extra).length ? h('div.stat', 'Bonus', h('b', roh(extra))) : null,
      ),
      h('p.erg-satz', res.perfekt ? 'Wow – jede Frage beim ersten Versuch richtig!'
        : res.bestanden ? `Bestanden! ${plan ? `Für den Bauplan hätten alle ${erg.n} Antworten stimmen müssen – vielleicht klappt es beim nächsten Bauplan-Test.` : 'Die Rohstoffe gehören dir.'} Dieser Test ist jetzt erledigt.`
          : `Für „bestanden" brauchst du ${bel.noetig} richtige Antworten. Kein Problem: Der Test wartet auf dich – in der nächsten ${f.name}-Stunde kannst du es nochmal versuchen. Die Sterne für richtige Antworten gehören dir!`),
      bereich, weiter,
      rundenListe(rundenEintraege(erg.liste)),
    ));
    if (neuerPlan) {
      const truhe = h('button.truhe', { title: 'Öffnen!' }, '🎁');
      fill(bereich, h('p', { style: { fontSize: '1.1rem', fontWeight: 700 } }, 'Du hast dir einen Bauplan verdient! Tippe auf die Truhe.'), truhe);
      truhe.onclick = () => {
        sfx.whoosh(); konfetti(30);
        const G = GEBAEUDE[neuerPlan];
        fill(bereich, h('div.plan-enthuellt',
          h('div.pe-band', '✨ Neuer Bauplan freigeschaltet! ✨'),
          planKarte(neuerPlan, { zoom: GEBAEUDE[neuerPlan].w >= 4 ? 1.8 : 2.1, lebendig: true, extra: h('div.pv-info', G.text,
            h('div.pv-art', neuBaubar(neuerPlan) ? '🏗️ Du findest ihn unten in der Bauleiste – du kannst ihn so oft bauen, wie deine Sterne reichen.' : `⬆️ Tippe im Nest auf ein Gebäude „${GEBAEUDE[G.vorige].name}" und wähle „Ausbauen".`)) })));
        toast(`Bauplan freigeschaltet: ${G.name}`, { icon: G.icon, art: 'gold', dauer: 4500 });
      };
    }
    emit('quizEnde', { fach: test.fach, erg });
    emit('testEnde', { test, ...res, plan: neuerPlan });
    if (tagFertig) setTimeout(() => toast('Schulschluss! Alle Stunden für heute geschafft. 🎒', { icon: '🔔', art: 'gold', dauer: 4500 }), 900);
    game.save?.();
  }

  stundenplan();
  return m;
}

/** Fragen der Runde für die Ergebnisliste: je Frage der letzte Stand (1. Versuch, 2. Chance). */
function rundenEintraege(liste = []) {
  const map = new Map();
  for (const { q, richtig, zweite } of liste) {
    const key = q.id;
    const alt = map.get(key);
    const status = richtig ? (zweite ? 'zweite' : 'geloest') : 'ueben';
    if (!alt) map.set(key, { q, status });
    else if (richtig) alt.status = status;
  }
  return [...map.values()];
}
