// Klänge (synthetisch per WebAudio), sanfte Hintergrundmusik und Vorlesen.
let ac = null, master = null, musicGain = null;
const settings = { ton: true, musik: true, vorlesen: true };

export function configureAudio(s) {
  Object.assign(settings, s);
  if (musicGain) musicGain.gain.value = settings.musik ? 0.05 : 0;
}

function ctx() {
  if (!ac) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ac = new AC();
    master = ac.createGain();
    master.gain.value = 0.5;
    master.connect(ac.destination);
  }
  if (ac.state === 'suspended') ac.resume();
  return ac;
}

function tone(freq, start, dur, { type = 'sine', vol = 0.3, slide = 0, attack = 0.01 } = {}) {
  const a = ctx();
  if (!a || !settings.ton) return;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type;
  const t0 = a.currentTime + start;
  o.frequency.setValueAtTime(freq, t0);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(vol, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g); g.connect(master);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noise(start, dur, vol = 0.15, freq = 800) {
  const a = ctx();
  if (!a || !settings.ton) return;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = a.createBufferSource(); s.buffer = buf;
  const f = a.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
  const g = a.createGain(); g.gain.value = vol;
  s.connect(f); f.connect(g); g.connect(master);
  s.start(a.currentTime + start);
}

export const sfx = {
  click: () => tone(660, 0, 0.06, { type: 'triangle', vol: 0.15 }),
  pop: () => tone(520, 0, 0.12, { type: 'sine', vol: 0.25, slide: 400 }),
  dig: () => noise(0, 0.12, 0.2, 500),
  place: () => { tone(330, 0, 0.12, { type: 'triangle', vol: 0.25 }); tone(495, 0.08, 0.16, { type: 'triangle', vol: 0.22 }); },
  error: () => tone(200, 0, 0.18, { type: 'square', vol: 0.06, slide: -60 }),
  richtig: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.25, { type: 'triangle', vol: 0.22 })),
  falsch: () => { tone(330, 0, 0.2, { type: 'sine', vol: 0.2 }); tone(262, 0.15, 0.3, { type: 'sine', vol: 0.18 }); },
  coin: () => { tone(988, 0, 0.08, { type: 'square', vol: 0.07 }); tone(1319, 0.07, 0.2, { type: 'square', vol: 0.07 }); },
  fanfare: () => [523, 523, 659, 784, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.3, { type: 'triangle', vol: 0.2 })),
  built: () => [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.3, { type: 'sine', vol: 0.22 })),
  tick: () => tone(1200, 0, 0.03, { type: 'square', vol: 0.04 }),
  whoosh: () => noise(0, 0.4, 0.12, 2000),
  // Hochzeitsflug: glockiger Ring-Klang, steigt mit der Serie (pentatonisch)
  ring: (serie = 1) => {
    const st = [0, 2, 4, 7, 9, 12, 14, 16, 19][Math.min(8, Math.max(0, serie - 1))];
    const f = 587 * Math.pow(2, st / 12);
    tone(f, 0, 0.45, { type: 'sine', vol: 0.2 });
    tone(f * 2, 0.04, 0.35, { type: 'triangle', vol: 0.07 });
    tone(f * 3, 0.08, 0.5, { type: 'sine', vol: 0.04 });
  },
  // sanftes Hinabgleiten
  sinken: () => { tone(620, 0, 1.1, { type: 'sine', vol: 0.12, slide: -330, attack: 0.05 }); noise(0, 0.9, 0.05, 900); },
  // Wespenalarm: leises Nektar-„Plipp“ (wird oft gespielt → sehr leise)
  nektar: () => tone(880 + Math.random() * 160, 0, 0.05, { type: 'sine', vol: 0.035, slide: 300 }),
  // Wespe wird satt: fröhliches „Wuiii“ nach oben
  satt: () => { tone(420, 0, 0.16, { type: 'triangle', vol: 0.12, slide: 380 }); tone(990, 0.08, 0.14, { type: 'sine', vol: 0.06 }); },
  // Power-up: glitzerndes Arpeggio
  powerup: () => [659, 784, 988, 1319, 1568].forEach((f, i) => tone(f, i * 0.05, 0.22, { type: 'triangle', vol: 0.12 })),
  // Wespe brummt (kurz, freundlich-frech)
  summ: () => { tone(150, 0, 0.35, { type: 'sawtooth', vol: 0.035, slide: 40 }); tone(156, 0.02, 0.33, { type: 'sawtooth', vol: 0.03, slide: -20 }); },
  // sanftes „Boing“ beim Anrempeln
  autsch: () => { tone(300, 0, 0.18, { type: 'sine', vol: 0.18, slide: -140 }); tone(240, 0.1, 0.16, { type: 'sine', vol: 0.12, slide: 120 }); },
  // Honigblase fängt eine Wespe ab
  schild: () => { tone(520, 0, 0.12, { type: 'sine', vol: 0.16, slide: 500 }); tone(1040, 0.06, 0.16, { type: 'sine', vol: 0.07 }); },
  // Blüten-/Honigbombe: weiches „Wuuusch“ mit Glitzer
  bombe: () => { noise(0, 0.6, 0.14, 1200); tone(220, 0, 0.5, { type: 'sine', vol: 0.18, slide: -120 }); [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.12 + i * 0.06, 0.25, { type: 'triangle', vol: 0.08 })); },
  // Holo-HUD: weiches „Whoom" beim Hochfahren, Zusammenfallen beim Ausschalten, Piep beim Tab-Wechsel
  holoAn: () => {
    tone(70, 0, 1.1, { type: 'sine', vol: 0.22, slide: 260, attack: 0.25 });
    tone(140, 0.05, 0.9, { type: 'triangle', vol: 0.06, slide: 520, attack: 0.3 });
    noise(0, 0.9, 0.05, 1400);
    [880, 1175, 1568, 2093].forEach((f, i) => tone(f, 0.45 + i * 0.07, 0.35, { type: 'sine', vol: 0.05 }));
  },
  holoAus: () => { tone(420, 0, 0.55, { type: 'sine', vol: 0.16, slide: -350, attack: 0.02 }); tone(1600, 0.42, 0.08, { type: 'square', vol: 0.03 }); noise(0, 0.45, 0.05, 900); },
  holoTab: () => { tone(1046, 0, 0.07, { type: 'sine', vol: 0.1 }); tone(1568, 0.04, 0.09, { type: 'sine', vol: 0.07 }); },
};

// --- Sanfte, generative Musik (pentatonisch, Marimba-artig) ---
let musicTimer = null;
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
const CHORDS = [[0, 4, 7], [-3, 0, 4], [-7, -3, 0], [-5, -1, 2]];
export function startMusic() {
  const a = ctx();
  if (!a || musicTimer) return;
  musicGain = a.createGain();
  musicGain.gain.value = settings.musik ? 0.05 : 0;
  musicGain.connect(a.destination);
  let step = 0;
  const base = 261.63;
  const pluck = (semi, when, dur, vol) => {
    const o = a.createOscillator(), g = a.createGain();
    o.type = 'sine';
    o.frequency.value = base * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(musicGain);
    o.start(when); o.stop(when + dur + 0.05);
  };
  musicTimer = setInterval(() => {
    if (!settings.musik) return;
    const t0 = a.currentTime + 0.05;
    const chord = CHORDS[Math.floor(step / 8) % CHORDS.length];
    if (step % 8 === 0) chord.forEach(s => pluck(s - 12, t0, 2.6, 0.5));
    if (Math.random() < 0.7) pluck(SCALE[(Math.random() * SCALE.length) | 0] + (Math.random() < 0.3 ? 12 : 0), t0, 0.9, 0.55);
    step++;
  }, 380);
}

// --- Vorlesen (Web Speech API) ---
export function speak(text, lang = 'de-DE') {
  if (!settings.vorlesen || !('speechSynthesis' in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[_]{2,}/g, ' Lücke ').replace(/[\u{1F300}-\u{1FAFF}]/gu, ''));
    u.lang = lang;
    u.rate = 0.95;
    const voices = window.speechSynthesis.getVoices();
    const v = voices.find(v => v.lang === lang) || voices.find(v => v.lang.startsWith(lang.slice(0, 2)));
    if (v) u.voice = v;
    window.speechSynthesis.speak(u);
  } catch { /* nicht verfügbar */ }
}
export function stopSpeak() {
  try { window.speechSynthesis?.cancel(); } catch { /* egal */ }
}
export const canSpeak = () => 'speechSynthesis' in window;
