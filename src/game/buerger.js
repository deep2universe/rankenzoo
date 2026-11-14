// Bürgerinnen & Bürger des Ameisenstaates: Jede sichtbare Ameise bekommt eine eigene Persönlichkeit –
// Name, beste Freundin, besten Freund, Wohnung, Schule, Träume und Erlebnisse.
// Alle Texte sind bewusst positiv und zukunftsfroh formuliert.
import { GEBAEUDE, SIM } from './config.js';

const VORNAMEN_W = ['Lotti', 'Fini', 'Mia', 'Emmi', 'Paula', 'Ida', 'Frieda', 'Lilly', 'Hanna', 'Nele', 'Rosi', 'Tilda', 'Greta', 'Mathilda',
  'Wilma', 'Clara', 'Ella', 'Juna', 'Pia', 'Zoe', 'Lina', 'Malu', 'Romy', 'Fenja', 'Luzi', 'Amelie', 'Thea', 'Ronja', 'Elsa', 'Nora', 'Merle',
  'Jule', 'Hedi', 'Selma', 'Frida', 'Liv', 'Marta', 'Toni', 'Kiki', 'Bella', 'Momo', 'Sunny', 'Krümelchen', 'Polly', 'Ylvi', 'Hummel'];
const VORNAMEN_M = ['Bruno', 'Fridolin', 'Theo', 'Emil', 'Paul', 'Anton', 'Jonas', 'Ole', 'Leo', 'Max', 'Karl', 'Willi', 'Fritz', 'Mats',
  'Henri', 'Jakob', 'Luis', 'Felix', 'Oskar', 'Benno', 'Kasimir', 'Ludwig', 'Hugo', 'Rudi', 'Pepe'];
const NACHNAMEN = ['Krabbelbein', 'Sechsfuß', 'Fühlerfein', 'Honigtropf', 'Krümelreich', 'Tannennadel', 'Wiesengrün', 'Tautropfen', 'Sonnenschein',
  'Blattläufer', 'Moosweich', 'Harzglanz', 'Kieselklug', 'Pollenstaub', 'Duftspur', 'Grashalm', 'Rindenrot', 'Kleeblatt', 'Nektarsüß'];

const TRAEUME_W = ['eines Tages Professorin an der Universität zu werden', 'die größte Pilzernte des Waldes einzubringen', 'bis an den Rand des Reviers zu wandern und dort ein Zelt aufzuschlagen',
  'eine berühmte Bäckerin zu werden', 'allen jungen Ameisen das Lesen beizubringen', 'mit einem Fernrohr die Sterne zu zählen', 'eine eigene kleine Kolonie zu gründen',
  'ein Theaterstück über die Königin zu schreiben', 'die schnellste Läuferin beim Ameisen-Sportfest zu werden', 'eine neue Duftspur bis zur Blumenwiese zu legen',
  'Ärztin zu werden und allen zu helfen', 'eine Brücke über den Bach zu bauen', 'Musik für das große Ameisen-Orchester zu komponieren'];
const TRAEUME_M = ['beim Hochzeitsflug ganz hoch hinauf bis zu den Wolken zu fliegen', 'die weite Welt hinter dem Gartenzaun zu sehen', 'beim großen Hochzeitsflug der eleganteste Flieger zu sein',
  'einmal über den Teich zu fliegen'];
const HOBBYS = ['Fühler-Fangen spielen', 'Tautropfen-Seifenblasen machen', 'Krümelkuchen backen', 'auf den Ameisenhügel klettern und den Sonnenuntergang ansehen',
  'neue Duftspuren erfinden', 'Blattmusik üben', 'ihr Zimmer mit Blütenblättern schmücken', 'Kieselsteine sammeln', 'Geschichten über die Königin erzählen',
  'Pusteblumen-Samen fliegen lassen', 'Purzelbäume im Moos schlagen', 'Rätsel lösen'];
const HOBBY_GEBAEUDE = { kino: 'im Kino den neuen Krabbelfilm ansehen', theater: 'ins Theater gehen', schwimmbad: 'im Tautropfen-Bad planschen',
  eisladen: 'ein Honigtau-Eis essen', fussball: 'Fußball spielen', sporthalle: 'in der Sporthalle klettern', musikschule: 'Fühler-Geige üben',
  buchhandlung: 'ein spannendes Buch über Pilze lesen', spielplatz: 'auf dem Spielplatz schaukeln', friseur: 'sich die Fühler föhnen lassen',
  restaurant: 'mit Freundinnen im Restaurant essen', einkauf: 'im Einkaufscenter bummeln', baeckerei: 'ein frisches Krümelbrot holen' };
const LIEBLINGSESSEN = ['Honigtau', 'Krümelbrot', 'Pilz-Suppe', 'Beerensaft', 'Sonnenblumen-Kerne', 'Pollen-Plätzchen', 'Nektar-Eis', 'Samenkuchen'];
const LERNFAECHER = ['Duftkunde', 'Pilzbiologie', 'Rechnen mit sechs Beinen', 'Wetterkunde', 'Englisch für Ameisen', 'Gänge-Bauen', 'Sternenkunde',
  'Blattlaus-Pflege', 'Musik & Zirpen', 'Kartenlesen'];
const TAGES_EREIGNISSE = ['hat heute einen besonders großen Krümel nach Hause getragen 💪', 'hat einer jüngeren Ameise geduldig den Weg gezeigt 🧭',
  'hat den Larven eine Gute-Nacht-Geschichte vorgelesen 📖', 'hat beim Fühler-Fangen gewonnen 🏅', 'hat eine neue Abkürzung zur Vorratskammer entdeckt 🗺️',
  'hat einen wunderschönen Tautropfen gefunden 💧', 'hat mit allen ein kleines Fest im Gang gefeiert 🎉', 'hat einer Freundin beim Tragen geholfen 🤝',
  'hat zum ersten Mal einen Regenbogen gesehen 🌈', 'hat einen Witz erzählt, über den das ganze Nest gelacht hat 😄', 'hat ihr Zimmer gemütlich eingerichtet 🛋️',
  'hat beim Sonnenbaden neue Kraft getankt ☀️'];

const rndAus = (seed, arr) => arr[Math.abs(seed) % arr.length];
const hash = n => { let x = n * 2654435761 >>> 0; x ^= x >>> 13; x = Math.imul(x, 0x5bd1e995) >>> 0; return (x ^ (x >>> 15)) >>> 0; };
const ameisentag = state => Math.floor((state.zeit ?? 0) / SIM.tagDauer) + 1;

function register(state) {
  return (state.buerger ??= { liste: [], nextId: 1 });
}

export function buergerById(state, id) {
  return state.buerger?.liste.find(b => b.id === id) ?? null;
}

function neuerBuerger(state, maennlich) {
  const B = register(state);
  const id = B.nextId++;
  const seed = hash(id * 31 + (state.world?.seed ?? 7));
  const vor = maennlich ? rndAus(seed, VORNAMEN_M) : rndAus(seed, VORNAMEN_W);
  const tag = ameisentag(state);
  const b = {
    id, m: maennlich, seed,
    name: `${vor} ${rndAus(seed >>> 5, NACHNAMEN)}`,
    geb: Math.max(1, tag - (seed % 4)),
    traum: maennlich ? rndAus(seed >>> 3, TRAEUME_M) : rndAus(seed >>> 3, TRAEUME_W),
    essen: rndAus(seed >>> 7, LIEBLINGSESSEN),
    freundin: null, freund: null,
    ereignisse: [{ tag: Math.max(1, tag - (seed % 4)), text: maennlich ? 'ist als Drohne aus seiner Puppe geschlüpft 🎉' : 'ist aus ihrer Puppe geschlüpft 🎉' }],
  };
  B.liste.push(b);
  // Register klein halten: älteste, nicht sichtbare Einträge entfernen
  if (B.liste.length > 220) B.liste.splice(0, B.liste.length - 220);
  return b;
}

/** Eine Bürgerin (oder Drohne) für eine sichtbare Ameise holen – bevorzugt eine, die gerade nicht zu sehen ist. */
export function holeBuerger(state, maennlich, belegt) {
  const B = register(state);
  const frei = B.liste.find(b => !!b.m === !!maennlich && !belegt.has(b.id));
  return (frei ?? neuerBuerger(state, maennlich)).id;
}

export function ereignis(state, b, text) {
  if (!b) return;
  b.ereignisse.push({ tag: ameisentag(state), text });
  if (b.ereignisse.length > 8) b.ereignisse.splice(1, b.ereignisse.length - 8); // das Schlüpfen bleibt immer
}

/** Ein paar zufällige Bürgerinnen erleben etwas (für Spielereignisse). */
export function ereignisFuerEinige(state, anzahl, text) {
  const L = state.buerger?.liste ?? [];
  if (!L.length) return;
  for (let i = 0; i < anzahl; i++) {
    const b = L[Math.floor(Math.random() * L.length)];
    if (b && !b.m) ereignis(state, b, typeof text === 'function' ? text(b) : text);
  }
}

export function tagesEreignis(state) {
  const L = (state.buerger?.liste ?? []).filter(b => !b.m);
  if (!L.length) return;
  const b = L[Math.floor(Math.random() * L.length)];
  ereignis(state, b, TAGES_EREIGNISSE[Math.floor(Math.random() * TAGES_EREIGNISSE.length)]);
}

function freundeVerknuepfen(state, b) {
  const L = state.buerger.liste;
  if (!buergerById(state, b.freundin)) {
    const kand = L.filter(x => !x.m && x.id !== b.id);
    if (kand.length) {
      const f = kand[hash(b.seed + kand.length) % kand.length];
      b.freundin = f.id;
      f.freundin ??= b.id;
      ereignis(state, b, `hat ${f.name.split(' ')[0]} kennengelernt – seitdem sind sie beste Freundinnen 💛`);
    }
  }
  if (!buergerById(state, b.freund)) {
    const kand = L.filter(x => x.m && x.id !== b.id);
    if (kand.length) {
      const f = kand[hash(b.seed * 3 + kand.length) % kand.length];
      b.freund = f.id;
      ereignis(state, b, `hat sich mit der Drohne ${f.name.split(' ')[0]} angefreundet 🤝`);
    }
  }
}

const fertigeRaeume = (state, linie) => state.rooms.filter(r => GEBAEUDE[r.typ]?.linie === linie && r.bau >= 1)
  .sort((a, b) => GEBAEUDE[a.typ].lstufe - GEBAEUDE[b.typ].lstufe || a.id - b.id);
const artikel = name => (/(saal|platz|garten|laden|salon|shop|turm|palast|hof|speicher|markt|bahnhof|posten|stube$|park|keller|bad|kontor|zentrum|studio|werk|haus|lager)$/i.test(name) ? 'im' : 'in der');
const imRaum = r => { const n = GEBAEUDE[r.typ].name; const a = artikel(n); return `${a} ${n}`; };

/** Alles, was die Info-Karte über eine Ameise anzeigt. ant = sichtbare Ameise (Agent) oder null. */
export function steckbrief(state, d, id, ant = null) {
  const b = buergerById(state, id);
  if (!b) return null;
  freundeVerknuepfen(state, b);
  const tag = ameisentag(state);
  const alter = Math.max(0, tag - b.geb);
  const kol = state.spieler?.koloniename ?? 'unserem Nest';
  // Wohlbefinden
  const wohl = Math.max(8, Math.min(100, Math.round((d?.zufriedenheit ?? 70) + ((b.seed % 17) - 8))));
  const stimmung = wohl >= 80 ? { em: '🤩', txt: 'strahlend glücklich' } : wohl >= 60 ? { em: '😊', txt: 'glücklich' } : wohl >= 40 ? { em: '🙂', txt: 'zufrieden' } : { em: '🌱', txt: 'voller Hoffnung' };
  const q = d?.quote ?? {};
  const schwach = Object.entries(q).sort((a, c) => a[1] - c[1])[0];
  const SAETZE = {
    nahrung: 'Mein Bauch freut sich schon auf die nächste Beerenernte – unsere Sammlerinnen sind die Besten!',
    wohnen: 'Es ist gerade kuschelig eng bei uns. Ich freue mich riesig auf neue Zimmer!',
    freizeit: 'Ich wünsche mir einen Ort zum Spielen und Feiern – das wird bestimmt bald etwas Tolles!',
    bildung: 'Ich möchte so gern noch mehr lernen. Bestimmt bekommen wir bald eine neue Schule!',
    hygiene: 'Ein bisschen Putzen, und alles glänzt wieder – zusammen schaffen wir das!',
    waerme: 'Brrr, ein bisschen frisch! Aber mit mehr Sonnenwärme wird es bald mollig.',
  };
  const GLUECK = [`Ich liebe mein Leben in ${kol}! Jeder Tag ist ein kleines Abenteuer.`, 'Heute ist ein wunderbarer Tag – und morgen wird bestimmt noch schöner!',
    'Ich bin so stolz auf unser Volk. Gemeinsam schaffen wir alles!', 'Wenn ich groß bin, möchte ich anderen Ameisen helfen – so wie mir geholfen wurde.',
    'Ich bin dankbar für meine Freundinnen. Mit ihnen macht jede Arbeit Spaß!'];
  const satz = b.m ? `Ich trainiere jeden Tag meine Flügel. Bald fliege ich los und helfe, eine neue Kolonie zu gründen!`
    : schwach && schwach[1] < 0.7 ? SAETZE[schwach[0]] : rndAus(b.seed + tag, GLUECK);
  // Wohnung
  const wohnungen = fertigeRaeume(state, 'wohnen');
  const wohnung = wohnungen.length ? wohnungen[b.seed % wohnungen.length] : null;
  const wohnText = wohnung
    ? `wohnt ${imRaum(wohnung)} (Nr. ${wohnung.id}), ${['im oberen Stockbett', 'im unteren Stockbett', 'gleich neben der Lampe', 'in der Moos-Nische am Fenster'][b.seed % 4]}`
    : 'kuschelt mit den anderen im warmen Gang neben der Königin – und freut sich auf die erste eigene Schlafkammer';
  // Schule
  const schulen = fertigeRaeume(state, 'kita');
  let schule;
  if (b.m) schule = 'besucht die Flugschule am Hügelrand und übt Starten und Landen 🪽';
  else if (!schulen.length) schule = 'lernt von den älteren Ameisen – und freut sich schon auf den ersten Kindergarten im Nest 🧸';
  else {
    const stufeMax = schulen.length - 1;
    const k = Math.min(stufeMax, Math.floor(alter / 2) + (b.seed % 2));
    const r = schulen[k];
    const fach = rndAus(b.seed >>> 9, LERNFAECHER);
    schule = r.typ === 'kita' ? 'geht in den Ameisen-Kindergarten und spielt dort mit Bauklötzen aus Rinde 🧸'
      : `geht ${artikel(GEBAEUDE[r.typ].name) === 'im' ? 'ins' : 'in die'} ${GEBAEUDE[r.typ].name} und lernt dort ${fach} ${GEBAEUDE[r.typ].icon}`;
  }
  // Tätigkeit
  let tut = 'macht gerade eine kleine Pause', vorhaben = null, beruf = b.m ? 'Drohne' : 'Arbeiterin';
  if (ant) {
    const room = ant.roomId ? state.rooms.find(r => r.id === ant.roomId) : null;
    switch (ant.job) {
      case 'sammler':
        beruf = 'Sammlerin';
        tut = ant.hidden > 0 ? 'ist draußen auf der Wiese und sucht leckeres Futter 🌿'
          : ant.last ? `bringt ${{ blatt: 'ein Blattstück', krume: 'einen Krümel', tropfen: 'einen Honigtau-Tropfen' }[ant.last] ?? 'etwas Leckeres'} nach Hause 🧺`
            : ant.onArrive === 'raus' ? 'macht sich gut gelaunt auf den Weg nach draußen 🚶‍♀️' : 'ruht sich kurz aus und plaudert mit den anderen';
        break;
      case 'bau': {
        beruf = 'Bauarbeiterin';
        const p = room ? Math.round((room.bau < 1 ? room.bau : room.ausbau?.p ?? 1) * 100) : 0;
        tut = room ? (room.ausbau ? `baut ${imRaum(room)} zu ${GEBAEUDE[room.ausbau.ziel].name} aus` : `baut an ${GEBAEUDE[room.typ].name} mit`) + ` (${p} %) 🏗️` : 'hilft auf einer Baustelle 🏗️';
        break;
      }
      case 'personal':
        if (room) { beruf = GEBAEUDE[room.typ].beruf?.name ?? 'Fachkraft'; tut = `arbeitet als ${beruf} ${imRaum(room)} ${GEBAEUDE[room.typ].icon}`; }
        break;
      case 'amme':
        beruf = 'Amme';
        tut = 'kümmert sich liebevoll um die Eier, Larven und Puppen 🍼';
        break;
      case 'drohne':
        beruf = 'Drohne';
        tut = 'putzt seine Flügel und träumt vom großen Hochzeitsflug 🪽';
        break;
    }
  }
  const hobbys = [...HOBBYS];
  for (const [t, h] of Object.entries(HOBBY_GEBAEUDE)) if (state.rooms.some(r => GEBAEUDE[r.typ]?.linie === t && r.bau >= 1)) hobbys.push(h, h);
  vorhaben = b.m ? 'Nach dem Flugtraining möchte er mit seinen Freunden auf dem Hügel die Wolken beobachten.'
    : `Nach der Arbeit möchte sie ${rndAus(b.seed + tag * 7, hobbys)}.`;
  const freundin = buergerById(state, b.freundin);
  const freund = buergerById(state, b.freund);
  return {
    id: b.id, name: b.name, m: b.m, beruf, alter, wohl, stimmung, satz, wohnText, schule, tut, vorhaben,
    traum: `Ihr großer Traum: ${b.traum}.`.replace('Ihr großer', b.m ? 'Sein großer' : 'Ihr großer'),
    essen: b.essen,
    freundin: freundin ? { id: freundin.id, name: freundin.name } : null,
    freund: freund ? { id: freund.id, name: freund.name } : null,
    ereignisse: [...b.ereignisse].reverse(),
  };
}
