# Fragen-Schema für „Ameisenreich" (Lernspiel Klasse 4, Baden-Württemberg)

Jede Fächerdatei ist ein ES-Modul `src/data/questions/<fach>.js` mit `export default { … }`.
Prüfen mit: `node tools/validate-questions.mjs`

## Fächer-Schlüssel (`fach`)

| Schlüssel        | Im Spiel                     | Inhalt                                             |
|------------------|------------------------------|----------------------------------------------------|
| `deutsch`        | Wörterwald 📖                | Deutsch                                            |
| `mathe`          | Zahlenmine 🔢                | Mathematik (zusätzlich gibt es Zufallsgeneratoren) |
| `sachunterricht` | Forscherwiese 🔬             | Sachunterricht                                     |
| `englisch`       | Englisch-Insel 🇬🇧            | Englisch (Fremdsprache)                            |
| `musik_kunst`    | Kreativ-Werkstatt 🎨         | Musik, Kunst/Werken                                |
| `sport_werte`    | Sport & Miteinander 🤝       | Bewegung/Spiel/Sport, Religion/Ethik-Grundwissen, Werte, Gesundheit |

## Aufbau

```js
export default {
  fach: 'deutsch',
  themen: {
    // Schlüssel: kleingeschrieben, ohne Leerzeichen
    wortarten: {
      name: 'Wortarten',            // kurz, kindgerecht
      icon: '🏷️',                    // ein Emoji
      beschreibung: 'Nomen, Verben, Adjektive & Co. erkennen', // ein Satz für Kinder
      bildungsplan: 'Bildungsplan BW 2016, Deutsch 3/4, 3.2.2.4 Sprache und Sprachgebrauch untersuchen' // Bezug
    },
  },
  fragen: [ /* siehe unten */ ],
};
```

## Fragetypen

Gemeinsame Felder (Pflicht): `id` (global eindeutig, z. B. `de-wortarten-001`), `thema`, `stufe` (1 = leicht, 2 = mittel, 3 = knifflig),
`typ`, `frage` (max. 240 Zeichen), `erklaerung` (Pflicht! 1–3 kindgerechte Sätze, die erklären WARUM – das ist der Lernmoment).
Optional: `bild` (ein Emoji als Illustration), `text` (Lesetext für Leseverstehen, max. 1000 Zeichen),
`sprache: 'en'` (Frage wird beim Vorlesen englisch gesprochen), `tipp` (kleiner Hinweis, der per Joker gezeigt wird).

### 1. `choice` – Auswahl (2–4 Optionen, werden im Spiel gemischt)
```js
{ id: 'de-wortarten-001', thema: 'wortarten', stufe: 1, typ: 'choice',
  frage: 'Welches Wort ist ein Nomen?',
  optionen: ['krabbeln', 'Ameise', 'flink', 'unter'],
  loesung: 1,            // Index der richtigen Option
  erklaerung: 'Nomen (Namenwörter) bezeichnen Lebewesen, Dinge oder Gefühle. „Ameise" ist ein Lebewesen – man schreibt es groß.',
  tipp: 'Vor ein Nomen kannst du „der", „die" oder „das" setzen.' }
```
Optional `nichtMischen: true`, wenn die Reihenfolge wichtig ist (z. B. Zahlen aufsteigend).
Keine Optionen wie „Alle Antworten" / „Keine davon".

### 2. `truefalse` – Stimmt das?
```js
{ id: 'su-wasser-004', thema: 'wasser', stufe: 1, typ: 'truefalse',
  frage: 'Wasser gefriert bei 0 °C zu Eis.', loesung: true,
  erklaerung: 'Bei 0 °C wird flüssiges Wasser fest – es wird zu Eis.' }
```

### 3. `input` – Eingabe
```js
{ id: 'ma-groessen-010', thema: 'groessen', stufe: 2, typ: 'input', eingabe: 'zahl',
  frage: 'Wie viele Meter sind 3 km?', loesung: 3000, einheit: 'm',
  erklaerung: '1 km = 1000 m, also sind 3 km = 3000 m.' }
```
`eingabe: 'zahl'` (Ziffernblock) oder `'text'`. Bei Text: Vergleich ohne Groß/Klein, außer `grossKlein: true`.
`alternativen: ['…']` für weitere richtige Schreibweisen. Text-Eingaben sparsam einsetzen (kurze Wörter).

### 4. `order` – In die richtige Reihenfolge bringen
```js
{ id: 'de-satzbau-003', thema: 'satzbau', stufe: 1, typ: 'order',
  frage: 'Bilde einen richtigen Satz!',
  teile: ['Die', 'Ameise', 'trägt', 'ein', 'Blatt.'],   // in RICHTIGER Reihenfolge angeben – das Spiel mischt
  erklaerung: 'Im Aussagesatz steht das Verb (Prädikat) an zweiter Stelle.' }
```
3–8 Teile, keine doppelten Teile.

## Qualitätsregeln
- Fachlich 100 % korrekt (amtliche Rechtschreibung), am Bildungsplan BW 2016 Klassen 3/4 orientiert.
- Kindgerechte, freundliche Sprache. Du-Form. Kurze Sätze.
- Gern Bezug zur Ameisenwelt / Natur (das Spiel spielt in einem Ameisenstaat), aber nur, wenn es passt.
- Ablenker (falsche Optionen) sollen typische Fehlvorstellungen abbilden – so wird die Erklärung zum Lernmoment.
- Keine Wertungen über Religionen; Religion/Ethik nur als neutrales Grundwissen über Feste, Werte, Miteinander.
- Mischung der Stufen ca. 40 % Stufe 1, 40 % Stufe 2, 20 % Stufe 3.
