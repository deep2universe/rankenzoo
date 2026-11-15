# Ameisenreich – Spieldesign

## Vision
Ein Kind der 4. Klasse spielt die **Ameisenkönigin** und baut einen Ameisenstaat auf: tief unter der Erde und oben im Ameisenhügel. Dafür braucht es **Wissen**. Baupläne gibt es nur im Quiz zum Schulstoff. **Denksport**-Minispiele üben Konzentration und Reaktion und bringen Nahrung. Das Spiel verbindet drei Dinge:

1. **Aufbau-Strategie:** Gänge graben, Kammern platzieren, Bedürfnisse ausbalancieren, das Volk wachsen lassen.
2. **Lernquiz:** Stoff der Klasse 4 nach dem Bildungsplan Baden-Württemberg, mit Anpassung an das Kind und gezielter Wiederholung.
3. **Konzentrations-Minispiele:** sechs Formate aus der Forschung zu exekutiven Funktionen.

## Spielschleife
```
 Quiz spielen ──► Sterne + Gangstücke + Bauplan (Schatztruhe)
     ▲                                   │
     │                                   ▼
 Bedürfnisse ◄── Volk wächst ◄── Gänge graben, Kammern bauen
     │                                   ▲
     └── Denksport ──► Nahrung ──────────┘
```

## Die Welt
- Seitenansicht, 60 × 50 Zellen zu je 32 px:
  - oben Himmel mit Tag-/Nachtwechsel (ein Ameisentag dauert 4 Minuten)
  - darunter Wiese, Ameisenhügel aus Tannennadeln und 34 Reihen Erde
  - ganz unten Felsbrocken und Grundwasser
- Die **Tiefe** ist eine strategische Größe. Ein Pilzgarten braucht mindestens 6 Reihen Tiefe (dunkel und feucht), der Tautropfen-Brunnen mindestens 16.
- Der **Ameisenhügel** lässt sich in 6 Stufen ausbauen. Jede Stufe bringt Platz für Hügelkammern und Wärme für die Brut.
  - Die Sonnenterrasse gehört in den Hügel.
  - Der Hochzeitsflug-Startplatz muss am Hügelrand liegen.
- **Wiesenbauten** stehen auf der Oberfläche: Fußballplatz, Honigtau-Tankstelle und Blattlaus-Weide.

## Bauen
| Werkzeug | Funktion |
|---|---|
| ⛏️ Gang | Mit dem Finger Gänge durch Erde oder Hügel ziehen. Jedes Feld kostet 1 Gangstück. Neue Felder müssen an Bestehendes anschließen, mögliche Felder leuchten. |
| Bauplan-Karte | Eine vorgefertigte Kammer platzieren. Kosten: Bauplan + Sterne. Die grüne oder rote Vorschau nennt den Grund, falls es nicht geht. |
| **Gang ersetzen** | Kammern dürfen direkt auf Gänge gesetzt werden. Die ersetzten Gangstücke gibt es zurück. |
| 🧹 Abriss | Gänge zuschütten (Gangstück zurück). Kammern abreißen gibt den Bauplan und Sterne zurück (die Hälfte bei fertigen Kammern, alles bei Baustellen). |

Bauarbeiterinnen bauen jede Baustelle in Echtzeit fertig. Eine Kammer ohne Verbindung zur Königin funktioniert nicht und zeigt ⚠️.

## Das Volk
- 👑 **Königin:** legt Eier. Wie schnell, hängt von Zufriedenheit, Kronenstufe, Nahrung, Brutplätzen und Wohnraum ab. Mit einem Regler legt man den **Drohnen-Anteil** fest.
- 🐜 **Arbeiterinnen:** werden automatisch eingeteilt:
  1. Bauarbeiterinnen
  2. Ammen
  3. ausgebildete Fachkräfte in den Gebäuden
  4. alle übrigen werden Sammlerinnen
- 🪽 **Drohnen:** arbeiten nicht und brauchen Futter. Für den **Hochzeitsflug** braucht man 10 Drohnen, 40 Arbeiterinnen, mindestens 60 % Zufriedenheit und einen Startplatz. Der Flug gründet eine neue Kolonie: Die Kronenstufe steigt (mehr Eier), und es gibt viele Sterne und einen Bauplan.
- 🥚 **Brut:** Ei (24 s) → Larve (34 s) → Puppe (28 s) → Ameise. Ammen, Kindergarten, Sonnenterrasse und Hügelwärme beschleunigen die Entwicklung.
- Kindgerecht: Niemand stirbt. Bei Hunger oder großer Unzufriedenheit **wandern** einzelne Ameisen **aus**.

## Ausgebildete Ameisen (Berufe)
Jedes Gebäude hat Arbeitsplätze für Fachkräfte mit sichtbarem Accessoire:

| Gebäude | Beruf und Accessoire |
|---|---|
| Bäckerei, Restaurant | Bäckerin/Köchin mit Kochmütze |
| Universität | Professorin mit Doktorhut |
| Buchhandlung | Buchhändlerin mit Brille |
| Fußballplatz, Möbelgeschäft | Trainerin/Schreinerin mit Stirnband |
| Tankstelle | Tankwartin mit Mütze |
| Kindergarten | Erzieherin mit Schleife |
| Pilzgarten, Blattlaus-Weide | Gärtnerin/Hirtin mit Strohhut |
| Sonnenterrasse | Wärmerin mit Sonnenbrille |
| Kinderstube | Ammen mit Häubchen |

Ein Gebäude arbeitet nur so gut, wie es besetzt ist. Die Universität verbessert alle Berufe um 10 %.

## Gebäude (21)
| Rang | Gebäude |
|---|---|
| Start | Königinnenkammer, Kinderstube, Schlafkammer, Vorratskammer, Abfallkammer, Pilzgarten |
| Ameisendorf (25 Ameisen) | Kindergarten, Bäckerei, Buchhandlung, Blattlaus-Weide, Honigtau-Tankstelle, Apotheke |
| Ameisenstadt (60) | Restaurant, Kino, Fußballplatz, Möbelgeschäft, Tautropfen-Brunnen, Sonnenterrasse, Universität |
| Metropole (120) | Einkaufscenter, Hochzeitsflug-Startplatz |

Jedes Gebäude hat einen echten **Ameisen-Fakt** („Wusstest du?"). Gesammelt werden sie im Ameisen-Lexikon des Wissensbuchs.

## Bedürfnisse und Zufriedenheit
Das Volk hat sechs Bedürfnisse. Jedes zählt mit einem eigenen Gewicht in die Zufriedenheit:

| Bedürfnis | Gewicht |
|---|---|
| Nahrung | 26 % |
| Wohnraum | 20 % |
| Freizeit | 15 % |
| Bildung | 14 % |
| Sauberkeit | 13 % |
| Wärme | 12 % |

- Gebäude versorgen eine bestimmte Zahl von Ameisen.
- Ist ein Bedürfnis unter 60 % erfüllt, zeigt das Volk-Fenster einen konkreten Bautipp.
- Je höher die Zufriedenheit, desto mehr Eier legt die Königin.
- **Nahrung:** Bei den Sammlerinnen nimmt der Ertrag ab, je mehr es sind (längere Wege). Ein großes Volk braucht deshalb Pilzgärten, Blattlaus-Weiden und Bäckereien.

## Fortschritt
- **Kolonie-Ränge:** Gründungs-Nest → Ameisendorf → Ameisenstadt → Ameisen-Metropole → Ameisenreich.
- **22 Aufgaben** führen durchs Spiel: vom ersten Quiz über „Umbau-Profi" (Gang durch Kammer ersetzen) bis zum Hochzeitsflug. Bei den ersten Aufgaben blinkt der passende Knopf.
- **Wissensbuch:** zeigt den Lernstand je Fach und Thema, das Ameisen-Lexikon und Statistiken.

## Denksport-Halle
| Spiel | Format | Was es übt |
|---|---|---|
| 🐞 Marienkäfer-Alarm | Go/No-Go | Reaktion und Impulskontrolle (Blattläuse dürfen nicht angetippt werden) |
| 👃 Duftspur | Simon/Corsi | Arbeitsgedächtnis (Reihenfolgen merken) |
| 🃏 Krabbel-Memory | Paare finden | Merkfähigkeit |
| 🎨 Farben-Wirrwarr | Stroop | selektive Aufmerksamkeit und Flexibilität |
| 🔢 Zahlenjagd | Schulte-Tabelle | Blicksteuerung und Konzentration |
| ⚡ Blitzblick | Subitizing | Mengen schnell erfassen |

Für jedes Spiel gibt es einen Rekord. Die Belohnung richtet sich nach der Leistung (vor allem Nahrung). Die Spiele werden ehrlich beschrieben, siehe Recherche Kap. 08.

## Technik
- Reines HTML, CSS und JavaScript (ES-Module), **ohne Build-Schritt** und ohne Abhängigkeiten.
- **Grafik:** prozedural mit Canvas 2D:
  - Erdschichten mit Rauschen, Wurzeln und Fossilien
  - Ameisen mit Laufzyklus und Accessoires
  - Kammern mit Einrichtung, Lampenlicht und Animationen
  - Himmel mit Sonne, Mond, Sternen, Glühwürmchen und Schmetterlingen
- **Ameisen** suchen ihren Weg mit Breitensuche durch die Gänge. Bis zu 90 sind sichtbar.
- **Ton:** Klänge mit WebAudio erzeugt, dazu sanfte pentatonische Musik und Vorlesen per Web Speech API.
- **Speichern:** im Browser per localStorage, automatisch alle 15 s.
- **Bedienung:**
  - Touch: wischen zum Graben, zwei Finger zum Zoomen und Verschieben
  - Maus: Rad zum Zoomen
  - Tastatur: Q (Quiz), M (Minispiele), G (Gang), X (Abriss), WASD (Ansicht verschieben), Ziffern 1–4 (Antworten)
- **Barrierefreiheit:** Vorlesen, große Touch-Ziele, `prefers-reduced-motion`, Informationen werden nie nur über Farbe vermittelt.

## Strategie-Erweiterung (Version 2)

### Zwei Modi, ein Spiel (Shift ⇧)
Das Nest und das Revier zeigen **denselben Spielstand** – nur mit anderen Werkzeugen:

| | 🏠 Nest | 🗺️ Revier |
|---|---|---|
| Blick | Seitenansicht, Querschnitt durch den Boden | Draufsicht auf die Wiese rund um den Hügel |
| Spieler ist | Baumeisterin | Feldherrin / Planerin |
| Interaktion | graben, bauen, abreißen, Volk versorgen | Befehle geben: Trupps, Wächterinnen, Expeditionen, Handel |
| Rohstoff-Schwerpunkt | Sterne, Gangstücke, Baupläne | Nahrung, Baumaterial, Entdeckungen |

Die Verbindungen sind sichtbar: Ameisen, die im Revier sammeln, verlassen im Nest den Hügel; Oberflächengebäude stehen in der Draufsicht rund um den Hügel; der Hügel wächst in beiden Ansichten mit. Der Wechsel ist eine 0,85-s-Iris-Überblendung vom Hügel aus, die HUD-Farben wechseln von Honig-Braun zu Wald-Grün.

### Revier
- 44 × 30 Felder, am Anfang ist nur ein kleiner Kreis um den Hügel sichtbar, der Rest liegt im **Nebel**.
- **Futterquellen:** Beerenstrauch, Sonnenblumen, Blattlaus-Kolonie, Picknick-Krümel (verbraucht sich), Zweig-Haufen und Harz-Baum (Baumaterial), Tautropfen-Wiese (Sauberkeit), Glitzer-Kiesel (Sterne). Ertrag sinkt mit der Entfernung und wächst mit abnehmendem Zuwachs pro Ameise. Quellen leeren sich und wachsen nach.
- **Befehle:** freie Arbeiterinnen als Sammlerinnen oder Wächterinnen einer Quelle zuteilen (+/−, +5). Reichen die Ameisen nicht, arbeiten alle Trupps anteilig langsamer.
- **Expeditionen:** 1–5 Erkunderinnen laufen zu einem Ziel, lüften den Nebel, entdecken Quellen und bringen Fundstücke mit. Fünf **Schätze** (Sterne, Baumaterial, oft ein Bauplan) und ein **Nachbarvolk** liegen weit draußen.
- **Störenfriede** (Marienkäfer, Spinne, Wespe, Spatz, Ameisenlöwe) senken den Ertrag einer Quelle, bis Wächterinnen sie **freundlich verscheuchen**. Niemand wird verletzt.
- **Wetter:** Regenschauer bremsen das Sammeln, lassen Quellen aber schneller nachwachsen.
- **Handel** mit dem Nachbarvolk (nach „Diplomatie" oder mit Handelsposten): drei wechselnde Tauschangebote.

### Forschung
20 Techniken in 5 Ästen × 4 Stufen. Kosten: Forschungspunkte 🔬 (+ ab Stufe 2 Baumaterial 🪵), Dauer 30–110 s, immer nur ein Projekt. Forschungspunkte kommen aus **richtigen Quizantworten** (+2), Denksport (+1) und Bildungsgebäuden – Lernen treibt also direkt den technischen Fortschritt. Einige Techniken schalten Funktionen frei (Quellen im Nebel ahnen, Handel, Baupläne kopieren).

### Neue Gebäude (16)
Sporthalle, Eisladen, Sechs-Bein-Schuhladen, Fühler-Salon, Ameisenschule, Wachstube, Späherturm, Spielplatz, Forschungslabor, Theater, Musikschule, Krümelkasse, Tautropfen-Bad, Handelsposten, Ameisen-Rathaus, Duftspur-Bahnhof. Jedes hat Einrichtung, Animation, Beruf mit Accessoire und einen echten Ameisen-Fakt.

### Performance
Die alte Version zeichnete ungebremst jedes Bild komplett neu (Gelände 3840 × 3200 px, ~400 Farbverläufe für Ameisen, Weichzeichner auf allen HUD-Elementen). Jetzt:
- Ameisen, Emojis und Lichtschein kommen aus Sprite-Caches.
- Bäume, Gelände und Gras liegen in einem bildschirmgroßen Zwischenspeicher, der nur bei Kamera- oder Weltänderung neu entsteht.
- Adaptive Bildrate: 60 fps bei Interaktion, 30 im Ruhezustand, 5 hinter Fenstern; automatische Auflösungsreduktion, wenn Zeichnen dauerhaft zu lange dauert.
- Kein `backdrop-filter`, keine `box-shadow`-Endlosanimationen; Vignette als statisches CSS-Overlay.
- Messung (Headless-Chromium, 1440 × 900, Retina): JavaScript-Zeit 610 → 27 ms pro Sekunde.

## Version 3: Schule, Entwicklungslinien, Welt

### Schule statt freiem Quiz
- **Stundenplan:** 5 Tage × 4 Stunden (D 5, M 5, SU 3, Sport & Miteinander 3, E 2, Mu/Ku 2). Das Fach ist vorgegeben, das Thema frei wählbar – Struktur wie in der echten Schule, aber mit Selbstbestimmung.
- **Tests:** Jedes Thema wird (nach Schwierigkeit sortiert) in feste Tests à ca. 6 Fragen geteilt; Zufallsaufgaben-Themen haben 3 Tests (Niveau 1–3). Ein Test ist bestanden ab der Hälfte richtiger Antworten beim ersten Versuch und kommt dann nicht wieder. Falsche Fragen werden sofort in der „Zweiten Chance" geübt (zählt nicht fürs Testergebnis).
- **Schulschluss:** Nach vier Stunden endet der Schultag; der nächste beginnt mit dem nächsten Ameisentag (4 Minuten). Das dosiert Bildschirmzeit und lenkt auf Bauen, Revier und Denksport.
- **Transparente Belohnung:** Vor jedem Test sieht das Kind den möglichen Bauplan (als gezeichnetes, animiertes Gebäude) und eine Belohnungs-Leiter. Perfekt → Bauplan; sonst Rohstoffe proportional zu den richtigen Antworten (+ Bonus ab „bestanden").

### Baupläne & Entwicklungslinien
- 36 Linien mit 2–5 Stufen (110 Baupläne), z. B. Kindergarten → Schule → Berufsschule → Gymnasium → Universität. Höhere Stufen entstehen durch Ausbau an derselben Stelle (Fläche bleibt), das Gebäude arbeitet währenddessen weiter.
- Baupläne werden dauerhaft freigeschaltet. Jede Linie gehört zu einem Fach. Die Verteilung legt niedrige Stufen auf leichte Tests, hohe Stufen (Gymnasium, Universität) erst auf Tests mit Niveau 2–3 – die Lernentwicklung spiegelt die Gebäudeentwicklung. Höchstens gut die Hälfte der Themen eines Fachs trägt gleichzeitig einen Bauplan.
- 228 Tests > 106 gewinnbare Baupläne: Sind alle vergeben, gibt es nur noch Rohstoffe.

### Ameisen-Beobachtung
Jede sichtbare Ameise ist eine dauerhafte Bürgerin (oder Drohne) mit Namen, Freundin, Freund, Wohnung, Schulort (abhängig von gebauten Bildungsgebäuden und Alter), Traum und Erlebnissen (aus Spielereignissen wie Bau, Ausbau, perfekte Tests, Hochzeitsflug). Alle Texte sind positiv formuliert; Mängel im Volk werden als Vorfreude ausgedrückt („Ich freue mich riesig auf neue Zimmer!").

### Revier, Zelte, Pollen
Das Revier ist 64 × 44 Felder groß, mit Pollen-Quellen (beschleunigen die Brut um bis zu 30 %) und 16 Fundstücken. Zelte (Zelt → Basislager → Außenposten) dienen als Stützpunkte: Expeditionen starten am nächsten Lager, Sammelwege werden von dort gemessen.

### Welt & Hochzeitsflug
Dritte Ansicht: Übersichtskarte mit Heimatnest, Revier-Kreis und 9 Zielorten. Der Hochzeitsflug ist ein Ring-Flugspiel (Pseudo-3D). Erfolg gründet eine Tochterkolonie mit dauerhaftem Bonus und täglichen Grüßen; Misserfolg kostet nichts.

## Version 4: Ameisen-Zivilisation

### Lernmodi
Beim Spielstart (und in den Einstellungen) wählbar: **Stundenplan** (wie bisher) oder **freie Wahl** (Fach → Thema → beliebiges offenes Test-Paket). In beiden Modi zeigt jede Karte vorab Bauplan oder Rohstoffe; die Bauplan-Verteilung (höchstens gut die Hälfte der Themen trägt einen Bauplan, schwierige Pakete tragen hohe Ausbaustufen) bleibt gleich.

### Mehrere Kolonien
- Architektur: Die angezeigte Kolonie liegt in den gewohnten Feldern des Spielstands (`world`, `rooms`, `volk`, `brut`, `revier`, Nahrung). Ruhende Kolonien liegen in `state.kolonienDaten` und werden einmal pro Spielsekunde mit derselben Simulation über ein Proxy-Objekt „leise" weitergerechnet (Ereignisse werden gesammelt). Gemeinsam: Sterne, Gangstücke, Baumaterial, Forschungspunkte, Joker, Baupläne, Forschung, Schule.
- Jede Kolonie liegt in einer von 20 Gegenden (`biome.js`): Bodenfarben, Hügelmaterial, Bewuchs, Himmel, Hintergrund und Felsen-/Wassermenge im Untergrund.
- Kein langes Warten: Startplatz-Bauplan von Anfang an, 3 Drohnen genügen anfangs, neue Kolonien starten mit fertigem Startnest und 14 Arbeiterinnen, Gründungsbonus (schnellere Eier, Brut und Baustellen in den ersten Tagen), Übungsflüge jederzeit.

### Netz, Hotels, Bewusstsein
- Straßen (3 Stufen) gleichen Nahrung zwischen Kolonien aus und bringen Handel (⭐/min); Botenlinien bringen Wissen (🔬, Quiz-Bonus).
- Besuche reisen nur über Straßen und nur zu Kolonien mit Hotel (Plätze je Hotelstufe): Studentenaustausch (🔬), Nahrungstausch, Duftspur-Konferenz (Forschung schneller), Freundschaftsbesuch (⭐).
- Kollektives Ameisen-Bewusstsein = Kolonien + Verbindungen + Hotels + Bauten + Baupläne + Begegnungen.

### Krabbelschow-Skala (Ameisen-Kardaschow-Skala)
Typ I Flügge Kolonie (bereit für den ersten Hochzeitsflug) · Typ II Ameisen-Nachbarschaft (3 Staaten, 1 Straße) · Typ III Duftnetz-Zivilisation (6 Staaten, 3 Botenlinien, 2 Hotels) · Typ IV Garten-Zivilisation (12 Staaten, alles verbunden, 5 Hotels, Bewusstsein 800) · Typ V Welt-Superorganismus (alle 20 Staaten, Grandhotel, Bewusstsein 2000). Der Wert hat Nachkommastellen (Fortschritt zur nächsten Stufe); jede Kolonie trägt sichtbar bei.

### Holo-HUD
Auf der Weltkarte zuschaltbar (🛰️ / Taste U) mit Aktivierungseffekt; Views: Zivilisationen, Netzwerk & Handel, Krabbelschow-Skala, Duftstoffe (Futter-, Alarm-, Bau-, Wissens-, Freuden-, Wegduft je Kolonie und Spuren entlang der Routen), Entwicklung (Bedarf je Kolonie und globale Ziele).

### Flugspiele
Ringflug leichter (größere Ringe auch bei weiten Zielen, großzügigere Trefferzone, Fehler kosten weniger Flugkraft; Wind bleibt). Neu: **Wespenalarm** – Wespen ausweichen, mit unendlich Nektar friedlich vertreiben, viele Power-up-Blumen mit Nektar-Waffen.
