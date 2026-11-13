# Fragesystem: Von der Recherche zur Spielmechanik

Dieses Dokument beschreibt, wie die Lerninhalte der 4. Klasse in Baden-Württemberg im Spiel abgefragt, wiederholt und belohnt werden.

## 1. Sechs Wissensorte (Fächergruppen)

| Fach | Ort im Spiel | Kuratierte Fragen | Generatoren | Bauplan-Schwerpunkt |
|---|---|---|---|---|
| Deutsch | 📖 Wörterwald | 249 (15 Themen) | – | Buchhandlung, Kindergarten, Universität |
| Mathematik | 🔢 Zahlenmine | 189 (12 Themen) | 10 Aufgabentypen, unbegrenzt viele Aufgaben | Vorratskammer, Einkaufscenter, Tankstelle |
| Sachunterricht | 🔬 Forscherwiese | 258 (15 Themen) | – | Pilzgarten, Blattlaus-Weide, Apotheke, Brunnen |
| Englisch | 🇬🇧 Englisch-Insel | 182 (12 Themen) | Zahlen bis 100 | Restaurant, Kino, Bäckerei |
| Musik & Kunst | 🎨 Kreativ-Werkstatt | 134 (9 Themen) | – | Kino, Möbelgeschäft, Bäckerei |
| Sport & Miteinander | 🤝 Arena der Freundschaft | 113 (8 Themen) | – | Fußballplatz, Hochzeitsflug-Startplatz |

Jedes Fach liefert bevorzugt bestimmte Baupläne. Wer viele Gebäude will, spielt also von selbst alle Fächer. Zusätzlich gibt es jeden Tag ein **Fach des Tages** mit 1,5-fachen Sternen. Ausgewählt wird das Fach, das bisher am wenigsten geübt wurde.

## 2. Fragetypen und was sie prüfen

| Typ | Einsatz | Lernziel |
|---|---|---|
| `choice` (2–4 Optionen, werden gemischt) | Begriffe, Regeln, Sachwissen | Die falschen Antworten sind **typische Fehlvorstellungen**. Wer daneben liegt, bekommt eine Erklärung genau zu diesem Fehler. |
| `truefalse` | Mythen und Fehlvorstellungen („Strom wird verbraucht") | Begriffe sicher voneinander abgrenzen |
| `input` (Ziffernblock oder Text mit ä/ö/ü/ß) | Rechnen, Umrechnen, Rechtschreibung | Antwort selbst hervorbringen statt wiedererkennen (stärkere Abrufübung) |
| `order` | Satzbau, Alphabet, Abläufe (z. B. Linksabbiegen), Zahlen ordnen | Strukturen und Reihenfolgen verstehen |

Leseverstehen: 7 eigene Lesetexte (Sachtext, Erzählung, Gedicht, Fabel, Anleitung) mit je 3–4 Fragen.

## 3. Anpassung an das Kind

1. **Wie gut ein Thema sitzt:** Für jedes Thema (`fach:thema`) wird ein gleitender Mittelwert `m` geführt. Er beginnt bei 0,4. Schwere Fragen zählen stärker.
2. **Welche Schwierigkeitsstufe kommt:** Daraus ergibt sich die Zielstufe:

   | Wert `m` | Stufe 1 | Stufe 2 | Stufe 3 |
   |---|---|---|---|
   | unter 0,45 | 70 % | 30 % | – |
   | 0,45 bis 0,75 | 25 % | 55 % | 20 % |
   | über 0,75 | – | 40 % | 60 % |

3. **Wann eine Frage wiederkommt (Leitner-System):** Jede Frage liegt in einem von sechs Kästen (0–5).
   - Richtig: Die Frage rückt einen Kasten weiter.
   - Falsch: Die Frage fällt zurück in Kasten 0.
   - Fällig ist sie wieder nach 1, 2, 4, 7, 12 bzw. 20 Runden.
4. **Wie eine Runde zusammengestellt wird:**
   - Bis zu 2 fällige Wiederholungen.
   - Danach kommen die Themen reihum dran (gemischtes Üben). Neue Fragen haben dabei Vorrang vor bekannten.
   - Die letzten 60 Fragen werden nicht sofort wiederholt.
5. **Zweite Chance:** Bis zu 3 falsch beantwortete Fragen kommen am Ende der Runde noch einmal, direkt nach der Erklärung. Das ist sofortiges Abrufen, und richtige Antworten zählen für die Schatztruhe.

## 4. Feedback

- Jede Frage hat eine **Erklärung** (warum ist die Antwort richtig, welche Probe hilft) und meist einen **Tipp**. Den Tipp kann man mit einem Joker vorab sehen.
- Bei einer falschen Antwort wird die richtige deutlich angezeigt. Das Maskottchen „Professorin Krümel" macht Mut, ohne zu werten. Beispiele: „Fehler sind zum Lernen da!", „Gut, dass wir das üben!"
- Fragen und Erklärungen lassen sich **vorlesen** (Web Speech API, Deutsch oder britisches Englisch). Das hilft Kindern, die noch langsam lesen.
- Rechen-Generatoren zeigen den **Rechenweg**, zum Beispiel bei der schriftlichen Addition jede Stelle mit Übertrag.

## 5. Belohnungen (Lernen bleibt im Mittelpunkt)

| Ereignis | Belohnung |
|---|---|
| Richtige Antwort | Sterne: 5 / 8 / 12 je nach Stufe, Bonus ab einer 3er-Serie, ×1,2 mit Universität, ×1,5 im Fach des Tages |
| Rundenende | 2 Gangstücke je richtige Antwort |
| Mindestens 3 richtige Antworten | Schatztruhe: 1 Bauplan nach Wahl aus 3 |
| 6 von 6 im ersten Anlauf | 2 Baupläne |
| Minispiele | vor allem Nahrung, dazu wenige Sterne. Baupläne gibt es **nur** im Quiz. |

Weitere Grundsätze:
- Baupläne lassen sich nur durch Wissen verdienen. Das Quiz ist der Weg, den Staat wachsen zu lassen.
- Belohnt wird **Können**, nicht Klicken: Es gibt keine Belohnung für bloßes Öffnen, keine Lootboxen, keine Käufe und keine Ranglisten.
- Wer pausiert, verliert nichts. Die Kolonie läuft nur weiter, solange gespielt wird, und niemand stirbt (Ameisen wandern höchstens aus).

## 6. Mathe-Generatoren (unbegrenzt viele Aufgaben)

`g_stellenwert`, `g_runden`, `g_kopfrechnen`, `g_schriftlich_plus_minus`, `g_schriftlich_mal_geteilt`, `g_ueberschlag`, `g_groessen`, `g_platzhalter`, `g_folgen`, `g_teiler`.

Für jede der drei Stufen sind die Zahlbereiche festgelegt:

| Stufe | Zahlenraum |
|---|---|
| 1 | bis 1 000 bzw. 10 000 |
| 2 | bis 100 000 |
| 3 | bis 1 Mio., mit Kommazahlen bei Größen und Division mit Rest |

Ergebnisse über 1 Million kommen nicht vor. Ein automatischer Test (`node tools/smoke-test.mjs`) prüft 900 Aufgaben je Generator auf gültige Werte.

## 7. Qualitätssicherung

- `node tools/validate-questions.mjs` prüft alle Fragen auf das Schema: eindeutige IDs, gültige Lösungen, Länge der Texte und vorhandene Erklärung.
- Jede Fragenbank hat die jeweilige Fach-Agentin beim Schreiben selbst geprüft. Danach hat eine unabhängige Lektorin alle Banken auf Richtigkeit und Eindeutigkeit durchgesehen.
- Sensible Bereiche wie Religion sind neutral formuliert („Christen feiern …", „Muslime feiern …") und nennen keine beweglichen Festdaten.
