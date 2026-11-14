# 🐜 Ameisenreich

**Ein Lern- und Aufbauspiel für die 4. Klasse.** Du bist die Ameisenkönigin und baust einen ganzen Ameisenstaat auf: tief unter der Erde und oben im Ameisenhügel. Baupläne gibt es nur für **Wissen**. Im Quiz beantwortest du Fragen aus dem Stoff der 4. Klasse (Bildungsplan Baden-Württemberg). In der **Denksport-Halle** übst du Konzentration und Reaktion.

## Starten

Das Spiel läuft komplett im Browser, ohne Installation und ohne Build-Schritt. Weil es ES-Module nutzt, muss es über einen kleinen Webserver geöffnet werden:

```bash
npm start
```

Danach im Browser **http://localhost:8080** öffnen. Alternativ geht jeder andere statische Webserver, zum Beispiel `python3 -m http.server` oder GitHub Pages.

Tests:

```bash
npm test
```

`npm test` prüft das Schema der Fragenbanken und führt Tests für Quiz-Engine, Generatoren, Simulation und die Strategie-Ebene (Revier, Forschung, Handel, alle Gebäude) aus.

## Was steckt drin?

- **Zwei Ansichten, ein Spiel – Shift ⇧ wechselt:**
  - 🏠 **Nest** (Seitenansicht): Gänge graben, Kammern bauen, das Volk versorgen.
  - 🗺️ **Revier** (Draufsicht): die Wiese rund um den Hügel. Hier gibst du den Ameisen **Befehle**: Sammel-Trupps zu Futterquellen schicken, Wächterinnen gegen Störenfriede abstellen, **Expeditionen** in den Nebel senden, Schätze finden, mit einem Nachbarvolk handeln. Wetter und Tageszeit wirken sich aus.
  - Der Wechsel wird mit einer Iris-Überblendung vom Ameisenhügel aus animiert; die Oberfläche wechselt ihr Farbthema.
- **Aufbau-Strategie:**
  - 37 Gebäude, darunter Sporthalle, Eisladen, Sechs-Bein-Schuhladen, Fühler-Salon, Ameisenschule, Forschungslabor, Theater, Musikschule, Krümelkasse, Tautropfen-Bad, Wachstube, Späherturm, Spielplatz, Handelsposten, Rathaus und Duftspur-Bahnhof.
  - Rohstoffe: Sterne ⭐, Gangstücke 🧱, Nahrung 🍯, **Baumaterial 🪵** (aus dem Revier) und **Forschungspunkte 🔬** (aus Quiz und Bildungsgebäuden).
  - **Forschung & Entwicklung:** 20 Techniken in 5 Ästen (Landwirtschaft, Erkundung, Baukunst, Volk & Brut, Kultur & Wissen), jede mit echtem Ameisen-Fakt.
  - **Arbeitsverteilung:** Bauarbeiterinnen je Baustelle und Ammen-Einsatz einstellbar.
  - Der Ameisenhügel wächst in 6 Stufen.
- **Ein lebendiges Volk:**
  - Königin, Arbeiterinnen, Drohnen und Brut (Ei → Larve → Puppe).
  - Ausgebildete Ameisen mit Berufen und Accessoires (Kochmütze, Doktorhut, Helm, Zylinder …).
  - Sechs Bedürfnisse bestimmen die Zufriedenheit.
  - Ein Hochzeitsflug gründet neue Kolonien.
- **Wissens-Quiz:**
  - 1 125 kuratierte Fragen in 6 Fächergruppen, dazu unbegrenzt viele Rechen- und Zahlenaufgaben mit Rechenweg.
  - **Gelöste Fragen kommen nicht wieder.** Falsch beantwortete Fragen werden wiederholt, bis sie sitzen.
  - **Fragen-Archiv 🗂️:** alle gestellten Fragen mit Status; die richtige Antwort und Erklärung zeigt eine Tooltip-Karte beim Darüberfahren, ein Klick pinnt sie fest (mit eigenem ✕).
  - Jede richtige Antwort bringt auch Forschungspunkte.
- **Denksport:** 10 Minispiele: Marienkäfer-Alarm (mit Zifferntasten 1–9), Duftspur, Memory, Farben-Wirrwarr, Zahlenjagd, Blitzblick, Futter-Waage, Pfadfinderin, Kammer-Inventur, Sortier-Ameise.
- **Grafik und Ton:**
  - Alles wird prozedural gezeichnet, mit Tag-/Nachtwechsel, Wetter und animierten Kammern.
  - Die Ameisen laufen wirklich durch die Gänge und über die Duftstraßen im Revier.
  - Klänge, Musik und Vorlesen erzeugt der Browser selbst.
- **Sparsam mit Akku und Lüfter:** Sprite-Caches, ein zwischengespeichertes Geländebild, adaptive Bildrate (flüssig beim Scrollen, gemächlich im Ruhezustand, fast still hinter Fenstern) und eine Grafik-Einstellung (Sparsam / Ausgewogen / Hoch).
- **Kindgerecht:** keine Käufe, keine Ranglisten, niemand stirbt (Störenfriede werden nur verscheucht). Nach 25 Minuten erinnert das Spiel an eine Bewegungspause. Der Spielstand wird nur lokal im Browser gespeichert.

## Bedienung

| Taste | Nest | Revier |
|---|---|---|
| ⇧ Shift | ins Revier | ins Nest |
| Q / M | Quiz / Denksport | Quiz / Denksport |
| F | Forschung | Forschung |
| G / X | Gang graben / Abriss | – |
| E | – | Expedition: Ziel wählen |
| WASD, Pfeile, Mausrad | Ansicht verschieben / zoomen | Ansicht verschieben / zoomen |
| H | zur Königin | zum Hügel |
| 1–9 | Quiz-Antworten, Marienkäfer-Löcher | |

## Projektstruktur

```
index.html                 Einstieg
styles/main.css            Gestaltung
src/main.js                Spielsteuerung & Hauptschleife
src/game/                  Konfiguration, Welt/Gitter, Simulation, Aktionen, Aufgaben, Spielstand,
                           Revier (revier.js), Forschung (forschung.js)
src/render/                Canvas-Renderer: Gelände, Kammern, Ameisen, Himmel, Revier-Karte, Sprite-Caches
src/ui/                    Oberfläche: HUD, Quiz, Minispiele, Fenster, Revier, Forschung, Archiv, Tooltip
src/quiz/                  Quiz-Engine (adaptiv, Leitner) & Aufgaben-Generatoren
src/data/questions/        Fragenbanken je Fach (+ SCHEMA.md)
tools/                     Server, Validator, Smoke-Test, Strategie-Test
_agent_doc/                Recherche zum Lehrplan & Spieldesign
```

## Dokumentation

- [Lernplan-Recherche Klasse 4 (BW)](_agent_doc/01_lernplan_research_klasse_4/00_README.md)
- [Fragesystem-Design](_agent_doc/01_lernplan_research_klasse_4/09_fragesystem_design.md)
- [Spieldesign](_agent_doc/02_spieldesign.md)
- [Schema für neue Fragen](src/data/questions/SCHEMA.md)
