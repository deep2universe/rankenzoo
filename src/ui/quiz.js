// Quiz-Oberfläche: Fachwahl → Themenwahl → Fragerunde → Truhe mit Bauplänen.
import { h, pick, shuffle, fill } from '../util.js';
import { FAECHER, FACH_BAUPLAENE, GEBAEUDE, QUIZ } from '../game/config.js';
import { buildRound, themenVon, recordAnswer, pruefeEingabe, richtigeAntwortText, meisterschaft, fachDesTages, prep, themaStand, fachStand, rundeMoeglich, istGeloest } from '../quiz/engine.js';
import { planAuswahl, grantPlan } from '../game/actions.js';
import { openModal, sterneFlug, konfetti, toast } from './modal.js';
import { sfx, speak, canSpeak, stopSpeak } from '../audio.js';
import { drawAnt } from '../render/antdraw.js';
import { emit } from '../events.js';
import { openFragenArchiv, rundenListe, closeTooltip } from './archiv.js';

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

export function openQuiz(game) {
  const s = game.state;
  const tag = game.d.tag;
  const fdt = fachDesTages(s, tag);
  const m = openModal({ titel: 'Wissens-Expedition', unter: 'Wähle ein Fach – richtige Antworten bringen Sterne und Baupläne!', icon: '📚', klasse: 'breit', farbe: ['#ff9f1c', '#ffc93c'] });
  game.pause(true);
  m.bg.addEventListener('animationend', () => {}, { once: true });
  const origClose = m.close;
  m.close = r => { closeTooltip(); origClose(r); game.pause(false); };

  function fachWahl() {
    m.setTitel('Wissens-Expedition', 'Wähle ein Fach – richtige Antworten bringen Sterne und Baupläne!');
    m.setFarbe('#ff9f1c', '#ffc93c'); m.setIcon('📚');
    const karten = Object.entries(FAECHER).map(([k, f]) => {
      const mm = meisterschaft(s, k);
      const fs = fachStand(s, k);
      return h('button.fach-karte', { style: { '--f1': f.farbe, '--f2': f.farbe2 }, onclick: () => themenWahl(k) },
        k === fdt ? h('span.tag-badge', '⭐ Fach des Tages ×1,5') : null,
        h('span.deko', f.icon), h('span.em', f.icon), h('span.nm', f.name), h('span.ort', f.ort),
        h('span.plaene', { title: 'Mögliche Baupläne' }, FACH_BAUPLAENE[k].map(p => GEBAEUDE[p].icon).join('')),
        h('span.geloest-zahl' + (fs.gemeistert ? '.alles' : ''), { title: `${fs.geloest} von ${fs.gesamt} Fragen richtig gelöst` },
          fs.gemeistert ? `🏆 Alle ${fs.gesamt} gelöst!` : `📚 Gelöst: ${fs.geloest} / ${fs.gesamt}`),
        h('div.meister', h('span', 'Können'), h('div.track', h('i', { style: { width: Math.round(mm * 100) + '%' } })), h('b', Math.round(mm * 100) + '%')),
      );
    });
    m.render(h('div.faecher', karten),
      h('p', { style: { textAlign: 'center', color: '#8a6a4a', margin: '16px 0 0', fontSize: '.92rem' } },
        `🃏 Joker: ${s.res.joker}  ·  ✅ Richtige Antworten bisher: ${s.lernen.richtig}  ·  🔥 Beste Serie: ${s.lernen.besteSerie}`),
      h('div', { style: { textAlign: 'center', marginTop: '12px' } },
        h('button.btn.grau.klein', { onclick: () => openFragenArchiv(game, { ausQuiz: true }) }, '🗂️ Fragen-Archiv – Antworten nachschauen')));
  }

  function themenWahl(fach) {
    const f = FAECHER[fach];
    m.setTitel(f.name, f.ort + ' – wähle ein Thema'); m.setFarbe(f.farbe, f.farbe2); m.setIcon(f.icon);
    const themen = themenVon(fach);
    const stern = k => {
      const i = s.lernen.themen[`${fach}:${k}`];
      if (!i || !i.n) return '☆☆☆';
      const n = i.m * Math.min(1, i.n / 6);
      return n > 0.8 ? '★★★' : n > 0.55 ? '★★☆' : n > 0.3 ? '★☆☆' : '☆☆☆';
    };
    const fs = fachStand(s, fach);
    const hatGens = fs.generatoren > 0;
    m.render(
      h('div.themen-kopfzeile',
        h('button.btn.grau.klein', { onclick: fachWahl }, '← Andere Fächer'),
        h('span.fach-stand' + (fs.gemeistert ? '.alles' : ''), fs.gemeistert ? `🏆 Alle ${fs.gesamt} Fragen gelöst!` : `📚 Gelöst: ${fs.geloest} / ${fs.gesamt}`),
        h('button.btn.grau.klein', { onclick: () => openFragenArchiv(game, { fach, ausQuiz: true }) }, '🗂️ Archiv')),
      h('div.themen-liste',
        h('button.thema-btn.alle' + (fs.gemeistert ? '.gemeistert' : ''), { onclick: () => runde(fach, null) }, h('span.em', fs.gemeistert ? '🏆' : '🎲'),
          h('div', h('div.nm', 'Alle Themen gemischt'), h('div.bs', fs.gemeistert
            ? (hatGens ? `Du hast alle ${fs.gesamt} Fragen gelöst! Jetzt warten Zufallsaufgaben auf dich.` : `Wow! Du hast alle ${fs.gesamt} Fragen in diesem Fach gelöst!`)
            : 'Empfohlen! Gemischtes Üben merkt man sich am besten.'))),
        themen.map(t => {
          const st = themaStand(s, fach, t.key);
          const info = t.generator ? '  ∞ Zufallsaufgaben'
            : st.gemeistert ? `  🏆 alle ${st.gesamt} Fragen gelöst` : `  ${st.geloest} von ${st.gesamt} gelöst`;
          return h('button.thema-btn' + (st.gemeistert ? '.gemeistert' : ''), { onclick: () => runde(fach, t.key), title: t.bildungsplan ?? '' },
            h('span.em', t.icon),
            h('div', h('div.nm', t.name),
              h('div.bs', st.gemeistert ? (hatGens ? 'Gemeistert! Weiter geht\'s mit Bonus-Aufgaben 🎲' : 'Gemeistert! Hier bist du Profi.') : t.beschreibung ?? ''),
              h('div.sterne', { style: { color: '#e09a00' } }, stern(t.key), info),
              t.generator ? null : h('div.thema-loes', { 'aria-hidden': 'true' }, h('i', { style: { width: (st.gesamt ? st.geloest / st.gesamt * 100 : 0) + '%' } }))),
            st.gemeistert ? h('span.pokal', { title: 'Thema gemeistert!' }, '🏆') : null);
        }),
      ),
    );
  }

  function runde(fach, thema) {
    const f = FAECHER[fach];
    if (!rundeMoeglich(s, fach, thema)) return gemeistert(fach, thema);
    const fragen = buildRound(s, fach, thema);
    if (!fragen.length) return gemeistert(fach, thema);
    const masc = maskottchen();
    const blase = h('div.sprechblase', fragen.every(q => q.bonus) ? '🏆 Thema gemeistert! Jetzt gibt es Bonus-Aufgaben.' : 'Los geht\'s! Lies jede Frage genau.');
    const quizBonus = game.d.fx.quizBonus + (fach === fdt ? 0.5 : 0);
    const ergebnis = { richtig: 0, sterne: 0, falsche: [], zweite: 0, antworten: [], n: fragen.length, liste: [] };
    let i = 0, zweiteChance = false, queue = fragen;
    const fortschritt = h('div.fortschritt');
    const frageBox = h('div');
    const jokerReihe = h('div.joker-reihe');
    m.setTitel(f.name, thema ? themenVon(fach).find(t => t.key === thema)?.name : 'Alle Themen');
    m.render(h('div.quiz-layout', h('div.quiz-seite', masc.el, blase, jokerReihe), h('div', fortschritt, frageBox)));

    function zeichneFortschritt() {
      fill(fortschritt, ...queue.map((_, k) => h('span' + (k === i ? '.jetzt' : ergebnis.antworten[zweiteChance ? fragen.length + k : k] === true ? '.r' : ergebnis.antworten[zweiteChance ? fragen.length + k : k] === false ? '.f' : ''))));
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
        zweiteChance ? h('span.chip.wdh', '🔁 Zweite Chance') : q.wiederholung ? h('span.chip.wdh', '🔁 Wiederholung') : null,
        q.bonus && !zweiteChance ? h('span.chip.bonus', { title: 'Alle Fragen dieses Themas sind gelöst – das ist eine Zufallsaufgabe.' }, '🎲 Bonus-Aufgabe') : null,
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
        const vorherGemeistert = !q.generiert && themaStand(s, fach, q.thema).gemeistert;
        let sterne = recordAnswer(s, q, richtig, quizBonus);
        ergebnis.liste.push({ q, richtig, zweite: zweiteChance });
        if (richtig && !q.generiert && !vorherGemeistert && themaStand(s, fach, q.thema).gemeistert) {
          const tn = themenVon(fach).find(t => t.key === q.thema)?.name ?? 'Thema';
          setTimeout(() => { toast(`Thema „${tn}" gemeistert – alle Fragen gelöst!`, { icon: '🏆', art: 'gold', dauer: 4200 }); konfetti(30); }, 600);
        }
        if (zweiteChance) sterne = Math.ceil(sterne / 2);
        if (richtig) {
          ergebnis.richtig++; if (zweiteChance) ergebnis.zweite++;
          ergebnis.sterne += sterne;
          s.res.sterne += sterne;
          sfx.richtig();
          masc.set('jubel');
          blase.textContent = pick(LOB) + (s.lernen.serie >= 3 ? ` 🔥 ${s.lernen.serie}er-Serie!` : '');
          sterneFlug(el ?? antwortBereich, Math.ceil(sterne / 3));
          setTimeout(() => game.hud.bump('sterne'), 800);
        } else {
          if (!zweiteChance) ergebnis.falsche.push(q);
          sfx.falsch();
          masc.set('traurig');
          blase.textContent = pick(MUT);
        }
        emit('antwort', { richtig, fach });
        zeichneFortschritt();
        updateJoker();
        const weiter = h('button.btn.gruen', { onclick: naechste }, i + 1 < queue.length || (!zweiteChance && ergebnis.falsche.length) ? 'Weiter ➜' : 'Zur Belohnung 🎁');
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
        // Zweite Chance nur für Fragen, die noch nicht gelöst sind (gelöste kommen nie wieder)
        queue = ergebnis.falsche.filter(q => q.generiert || !istGeloest(s, q.id)).slice(0, 3).map(q => prep(q, true));
        if (!queue.length) return belohnung(fach, ergebnis);
        i = 0;
        blase.textContent = 'Zweite Chance! Jetzt kennst du die Erklärungen – probier es nochmal.';
        masc.set('idle');
        return zeige();
      }
      belohnung(fach, ergebnis);
    }
    zeige();
  }

  function belohnung(fach, erg) {
    const f = FAECHER[fach];
    m._key = null;
    s.stats.quizRunden++;
    s.lernen.runden++;
    const ersteRunde = erg.richtig - erg.zweite;
    const gang = erg.richtig * QUIZ.gangProRichtig;
    s.res.gang += gang;
    const n = erg.n || QUIZ.fragenProRunde; // Runden können kürzer sein, wenn fast alles gelöst ist
    const noetig = Math.min(3, n);
    const perfekt = ersteRunde >= n;
    const planAnzahl = erg.richtig >= noetig ? (perfekt && n >= QUIZ.fragenProRunde ? 2 : 1) : 0;
    if (perfekt) { konfetti(50); sfx.fanfare(); } else sfx.coin();
    m.setTitel(perfekt ? 'Perfekt! Alles richtig!' : 'Expedition geschafft!', `${f.name} · ${erg.richtig} richtige Antworten`);
    m.setIcon(perfekt ? '🏆' : '🎁');
    const truhe = h('div.truhe', { title: 'Öffnen!' }, '🎁');
    const bereich = h('div');
    m.render(h('div.ergebnis',
      h('div.zeile',
        h('div.stat', 'Richtig', h('b', `${ersteRunde} / ${n}`)),
        erg.zweite ? h('div.stat', 'Zweite Chance', h('b', `+${erg.zweite}`)) : null,
        h('div.stat', 'Sterne', h('b', `+${erg.sterne} ⭐`)),
        h('div.stat', 'Gangstücke', h('b', `+${gang} 🧱`)),
      ),
      bereich,
      rundenListe(rundenEintraege(erg.liste)),
    ));
    let offen = 0;
    const zeigePlaene = () => {
      const opts = planAuswahl(s, fach, 3);
      fill(bereich, 
        h('h3', { style: { margin: '6px 0' } }, planAnzahl > 1 ? `Wähle einen Bauplan (${offen + 1} von ${planAnzahl})` : 'Wähle einen Bauplan!'),
        h('div.plan-wahl', opts.map(typ => {
          const G = GEBAEUDE[typ];
          const neu = !s.rooms.some(r => r.typ === typ) && !s.plaene[typ];
          return h('button.plan-karte', { onclick: () => {
            grantPlan(s, typ); sfx.place(); offen++;
            toast(`Bauplan erhalten: ${G.name}`, { icon: G.icon, art: 'gold' });
            if (offen < planAnzahl) zeigePlaene(); else ende(typ);
          } },
            neu ? h('span.neu', 'NEU') : null,
            h('span.em', G.icon), h('span.nm', G.name), h('span.bs', G.text),
            h('div.meta', h('span', `⭐ ${G.kosten}`), h('span', `📐 ${G.w}×${G.h}`), G.personal ? h('span', `👷 ${G.personal} ${G.beruf.name}${G.personal > 1 ? 'nen' : ''}`) : null,
              h('span', G.zone === 'oberflaeche' ? '🌼 Wiese' : G.zone === 'huegel' ? '⛰️ Hügel' : `⬇ Tiefe ${G.minTiefe ?? 0}+`)),
          );
        })),
      );
    };
    const ende = typ => {
      fill(bereich, 
        h('p', { style: { fontSize: '1.1rem' } }, typ ? `Super! Dein neuer Bauplan liegt unten in der Bauleiste. Bau ihn an einen Gang!` : ''),
        h('div', { style: { display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' } },
          h('button.btn.blau', { onclick: () => runde(fach, null) }, '🔁 Noch eine Runde'),
          h('button.btn', { onclick: () => fachWahl() }, '📚 Anderes Fach'),
          h('button.btn.gruen', { onclick: () => { m.close(); if (typ) game.selectPlan(typ); } }, typ ? '🏗️ Jetzt bauen!' : '🐜 Zum Ameisenstaat')),
      );
    };
    if (planAnzahl > 0) {
      fill(bereich, h('p', 'Du hast eine Schatztruhe verdient! Tippe darauf.'), truhe);
      truhe.onclick = () => { sfx.whoosh(); zeigePlaene(); };
    } else {
      ende(null);
      bereich.prepend(h('p', { style: { fontSize: '1.05rem', lineHeight: '1.5' } }, `💪 Für eine Schatztruhe brauchst du mindestens ${noetig} richtige Antwort${noetig > 1 ? 'en' : ''}. Die Sterne und Gangstücke gehören dir trotzdem!`));
    }
    emit('quizEnde', { fach, erg });
  }

  /** Freundliche Meldung, wenn ein Thema (oder ganzes Fach) komplett gelöst ist und es keine Zufallsaufgaben gibt. */
  function gemeistert(fach, thema) {
    const f = FAECHER[fach];
    const t = thema ? themenVon(fach).find(x => x.key === thema) : null;
    const st = thema ? themaStand(s, fach, thema) : fachStand(s, fach);
    m._key = null;
    m.setTitel(f.name, thema ? `${t?.name ?? ''} – gemeistert!` : 'Alles gemeistert!'); m.setFarbe(f.farbe, f.farbe2); m.setIcon('🏆');
    sfx.fanfare(); konfetti(36);
    const gemischtGeht = thema && rundeMoeglich(s, fach, null);
    m.render(h('div.gemeistert-screen',
      h('div.pokal-gross', { 'aria-hidden': 'true' }, '🏆'),
      h('h3', thema ? `„${t?.name ?? thema}" gemeistert!` : `${f.name}: alles gemeistert!`),
      h('p', thema
        ? `Wow! Du hast alle ${st.gesamt} Fragen in diesem Thema richtig beantwortet. Gelöste Fragen kommen nicht wieder – hier bist du jetzt Profi! 🐜`
        : `Unglaublich! Du hast alle ${st.gesamt} Fragen in ${f.name} gelöst. Du bist eine echte Wissens-Ameise! 🐜`),
      h('p.klein', '🗂️ Im Fragen-Archiv kannst du dir alle Fragen und Antworten jederzeit noch einmal ansehen.'),
      h('div.knoepfe',
        h('button.btn.grau', { onclick: () => themenWahl(fach) }, '← Anderes Thema'),
        gemischtGeht ? h('button.btn.blau', { onclick: () => runde(fach, null) }, '🎲 Alle Themen gemischt') : null,
        h('button.btn', { onclick: () => openFragenArchiv(game, { fach, ausQuiz: true }) }, '🗂️ Fragen-Archiv'),
        h('button.btn.gruen', { onclick: fachWahl }, '📚 Anderes Fach')),
    ));
  }

  fachWahl();
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
