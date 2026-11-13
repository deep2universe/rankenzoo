// Fenster (Modals), Toasts, Konfetti.
import { h, fill } from '../util.js';
import { sfx, stopSpeak } from '../audio.js';
import { emit } from '../events.js';

const root = () => document.getElementById('modal-root');
const stack = [];

/**
 * Öffnet ein Fenster.
 * @param {object} o {titel, unter, icon, farbe:[k1,k2], klasse, inhalt (Node), schliessbar, onClose}
 */
export function openModal(o) {
  const inhalt = h('div.modal-inhalt');
  const kopf = h('div.modal-kopf', { style: { '--k1': o.farbe?.[0] ?? '#ff9f1c', '--k2': o.farbe?.[1] ?? '#ffc93c' } },
    o.icon ? h('div.gross-em', o.icon) : null,
    h('div', h('h2', o.titel ?? ''), o.unter ? h('div.unter', o.unter) : null),
    o.schliessbar === false ? null : h('button.schliessen', { 'aria-label': 'Schließen', onclick: () => m.close() }, '✕'),
  );
  const box = h('div.modal' + (o.klasse ? '.' + o.klasse : ''), { role: 'dialog', 'aria-modal': 'true' }, kopf, inhalt);
  const bg = h('div.modal-bg', box);
  if (o.schliessbar !== false) bg.addEventListener('pointerdown', e => { if (e.target === bg) m.close(); });
  const m = {
    el: box, inhalt, kopf, bg,
    setTitel(t, u) { kopf.querySelector('h2').textContent = t; const un = kopf.querySelector('.unter'); if (un && u != null) un.textContent = u; },
    setFarbe(a, b) { kopf.style.setProperty('--k1', a); kopf.style.setProperty('--k2', b); },
    setIcon(i) { const e = kopf.querySelector('.gross-em'); if (e) e.textContent = i; },
    render(...nodes) { fill(inhalt, ...nodes.flat()); box.scrollTop = 0; },
    closed: false,
    close(reason) {
      if (m.closed) return;
      m.closed = true;
      stopSpeak();
      bg.classList.add('weg');
      setTimeout(() => bg.remove(), 200);
      const i = stack.indexOf(m);
      if (i >= 0) stack.splice(i, 1);
      o.onClose?.(reason);
      emit('modal', stack.length);
    },
  };
  if (o.inhalt) m.render(o.inhalt);
  root().append(bg);
  stack.push(m);
  sfx.click();
  emit('modal', stack.length);
  return m;
}
export const modalOffen = () => stack.length > 0;
export function closeTop() { stack[stack.length - 1]?.close('esc'); }
export function topModal() { return stack[stack.length - 1]; }

export function toast(text, { icon = '🐜', art = '', dauer = 3200 } = {}) {
  const t = h('div.toast' + (art ? '.' + art : ''), { style: { '--dauer': dauer / 1000 + 's' } }, h('span.em', icon), h('span', text));
  const box = document.getElementById('toasts');
  box.append(t);
  while (box.children.length > 4) box.firstChild.remove();
  setTimeout(() => t.remove(), dauer + 500);
}

export function konfetti(n = 40) {
  const items = ['🎉', '⭐', '✨', '🍃', '🌼', '🎊', '💛'];
  for (let i = 0; i < n; i++) {
    const k = h('div.konfetti', items[i % items.length]);
    k.style.left = Math.random() * 100 + 'vw';
    k.style.animationDuration = 1.8 + Math.random() * 2 + 's';
    k.style.animationDelay = Math.random() * 0.6 + 's';
    document.body.append(k);
    setTimeout(() => k.remove(), 4500);
  }
}

export function confirmDialog(titel, text, jaText = 'Ja', neinText = 'Abbrechen') {
  return new Promise(res => {
    const m = openModal({
      titel, icon: '🤔', klasse: 'schmal', onClose: () => res(false),
      inhalt: h('div',
        h('p', { style: { fontSize: '1.1rem', lineHeight: '1.45' } }, text),
        h('div', { style: { display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '16px' } },
          h('button.btn.grau', { onclick: () => m.close() }, neinText),
          h('button.btn.pink', { onclick: () => { res(true); m.closed = true; m.bg.remove(); stack.splice(stack.indexOf(m), 1); emit('modal', stack.length); } }, jaText),
        ),
      ),
    });
  });
}

/** Sterne fliegen von einem Element zur Sterne-Anzeige */
export function sterneFlug(vonEl, n = 5) {
  const ziel = document.querySelector('[data-res="sterne"]');
  if (!vonEl || !ziel) return;
  const a = vonEl.getBoundingClientRect(), b = ziel.getBoundingClientRect();
  for (let i = 0; i < Math.min(n, 8); i++) {
    const s = h('div.sterne-flug', '⭐');
    s.style.left = a.left + a.width / 2 + (Math.random() - 0.5) * 40 + 'px';
    s.style.top = a.top + a.height / 2 + 'px';
    s.style.setProperty('--dx', b.left - a.left - a.width / 2 + 'px');
    s.style.setProperty('--dy', b.top - a.top - a.height / 2 + 'px');
    s.style.animationDelay = i * 0.06 + 's';
    document.body.append(s);
    setTimeout(() => s.remove(), 1400);
  }
}
