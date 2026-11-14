// Forschung & Entwicklung: Technologie-Baum als Fenster.
import { h, fill } from '../util.js';
import { GEBAEUDE, SIM } from '../game/config.js';
import { AESTE, TECHS, techStatus, kannForschen, starteForschung, brichForschungAb, hatTech } from '../game/forschung.js';
import { planKopieKosten, kopierePlan } from '../game/actions.js';
import { openModal, toast } from './modal.js';
import { sfx } from '../audio.js';

export function openForschung(game) {
  const s = game.state;
  const m = openModal({ titel: 'Forschung & Entwicklung', unter: 'Entdecke neue Ameisen-Techniken für deinen Staat', icon: '🔬', klasse: 'breit', farbe: ['#3fa7e0', '#8b6ce0'] });
  let auswahl = s.forschung.aktiv?.id ?? Object.keys(TECHS).find(id => techStatus(s, id) === 'moeglich');
  let timer = null;
  const oc = m.close; m.close = r => { clearInterval(timer); oc(r); };

  function render() {
    const d = game.d;
    const fa = s.forschung.aktiv;
    const kopf = h('div.fo-kopf',
      h('div.fo-res', h('span.big', '🔬 ', h('b', Math.floor(s.res.fp))), h('small', `+${(d.fpProSek * 60).toFixed(1).replace('.', ',')} pro Minute`)),
      h('div.fo-res', h('span.big', '🪵 ', h('b', Math.floor(s.res.material ?? 0))), h('small', 'Baumaterial aus dem Revier')),
      fa ? h('div.fo-aktiv', h('span.em', TECHS[fa.id].icon), h('div', h('small', 'Wird erforscht'), h('b', TECHS[fa.id].name),
        h('div.fo-track', h('i', { style: { width: Math.round(fa.t / TECHS[fa.id].dauer * 100) + '%' } }))),
        h('small.fo-rest', `noch ${Math.ceil((TECHS[fa.id].dauer - fa.t) / (1 + d.fx.forschTempo))} s`))
        : h('div.fo-aktiv.leer', '💡 Kein Projekt aktiv – wähle unten eine Technik aus!'),
    );
    const spalten = Object.entries(AESTE).map(([ak, a]) => h('div.fo-ast', { style: { '--a1': a.farbe, '--a2': a.farbe2 } },
      h('div.fo-ast-kopf', h('span', a.icon), a.name),
      Object.entries(TECHS).filter(([, t]) => t.ast === ak).sort((x, y) => x[1].stufe - y[1].stufe).map(([id, t]) => {
        const st = techStatus(s, id);
        return h('button.fo-tech.' + st + (auswahl === id ? '.gewaehlt' : ''), { onclick: () => { auswahl = id; sfx.click(); render(); } },
          h('span.stufe', 'I II III IV'.split(' ')[t.stufe - 1]),
          h('span.em', st === 'gesperrt' ? '🔒' : t.icon), h('span.nm', t.name),
          st === 'fertig' ? h('span.ok', '✓') : st === 'aktiv' ? h('span.lauf', h('i', { style: { width: Math.round(fa.t / t.dauer * 100) + '%' } })) : h('span.preis', `🔬${t.kosten.fp}${t.kosten.material ? ' 🪵' + t.kosten.material : ''}`));
      })));
    let detail = null;
    if (auswahl) {
      const t = TECHS[auswahl], st = techStatus(s, auswahl), k = kannForschen(s, auswahl);
      detail = h('div.fo-detail', { style: { '--a1': AESTE[t.ast].farbe, '--a2': AESTE[t.ast].farbe2 } },
        h('div.em', t.icon),
        h('div.txt', h('div.nm', t.name, h('small', ` · ${AESTE[t.ast].name}, Stufe ${t.stufe}`)), h('p', t.text),
          h('div.fakt', h('b', '🐜 Echtes Ameisenwissen: '), t.fakt),
          t.voraus.length ? h('div.voraus', 'Voraussetzung: ', t.voraus.map(v => (hatTech(s, v) ? '✅ ' : '⬜ ') + TECHS[v].name).join(', ')) : null),
        h('div.knopf',
          st === 'fertig' ? h('div.fertig-badge', '✓ Erforscht') :
          st === 'aktiv' ? h('button.btn.grau.klein', { onclick: () => { brichForschungAb(s); sfx.click(); render(); } }, 'Abbrechen (Kosten zurück)') :
          h('button.btn.gruen', { disabled: !k.ok, onclick: () => {
            const r = starteForschung(s, auswahl);
            if (r.ok) { sfx.place(); toast(`Forschung gestartet: ${t.name}`, { icon: t.icon }); } else { sfx.error(); toast(r.grund, { icon: '🔬', art: 'warn' }); }
            render();
          } }, `🔬 Erforschen (${t.dauer} s)`),
          !k.ok && st === 'moeglich' ? h('small.grund', k.grund) : null,
        ),
      );
    }
    // Architektur: Baupläne kopieren
    let kopie = null;
    if (hatTech(s, 'architektur')) {
      const typen = [...new Set(s.rooms.filter(r => r.bau >= 1).map(r => r.typ))].filter(t => !GEBAEUDE[t].einzigartig && t !== 'koenigin');
      kopie = h('div.fo-kopie', h('h3', '📐 Baupläne kopieren (Architektur)'),
        h('div.fo-kopie-liste', typen.map(typ => {
          const k = planKopieKosten(typ);
          return h('button.fo-kopie-karte', { onclick: () => { const r = kopierePlan(s, typ); if (r.ok) { sfx.coin(); toast(`Bauplan kopiert: ${GEBAEUDE[typ].name}`, { icon: '📐', art: 'gut' }); game.hud.planSig = ''; } else { sfx.error(); toast(r.grund, { icon: '📐', art: 'warn' }); } render(); } },
            h('span.em', GEBAEUDE[typ].icon), h('span', GEBAEUDE[typ].name), h('small', `🪵${k.material} ⭐${k.sterne}`));
        })));
    }
    fill(m.inhalt, kopf, h('div.fo-baum', spalten), detail, kopie,
      h('p.fo-fuss', `💡 Forschungspunkte bekommst du für jede richtige Quizantwort (+${SIM.fpProRichtig} 🔬), für Denksport (+1) und von Schule, Buchhandlung, Universität und Forschungslabor. Baumaterial 🪵 holen deine Trupps im Revier (Shift-Taste).`));
  }
  render();
  timer = setInterval(() => { if (!m.closed && s.forschung.aktiv) render(); }, 1000);
  return m;
}
