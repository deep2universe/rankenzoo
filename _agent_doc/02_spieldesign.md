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
