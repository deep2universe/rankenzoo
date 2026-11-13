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

`npm test` prüft das Schema der Fragenbanken und führt einen Smoke-Test für Engine, Generatoren und Simulation aus.

## Was steckt drin?

- **Aufbau-Strategie:**
  - Gänge graben und 21 verschiedene Kammern bauen, zum Beispiel Kinderstube, Pilzgarten, Bäckerei, Universität, Kino, Restaurant, Buchhandlung, Kindergarten, Fußballplatz, Honigtau-Tankstelle, Möbelgeschäft und Einkaufscenter.
  - Bestehende Gänge lassen sich durch Kammern ersetzen.
  - Der Ameisenhügel wächst in 6 Stufen.
- **Ein lebendiges Volk:**
  - Königin, Arbeiterinnen, Drohnen und Brut (Ei → Larve → Puppe).
  - Ausgebildete Ameisen mit Berufen und Accessoires, zum Beispiel Bäckerin mit Kochmütze oder Professorin mit Doktorhut.
  - Sechs Bedürfnisse bestimmen die Zufriedenheit.
  - Ein Hochzeitsflug gründet neue Kolonien.
- **Wissens-Quiz:**
  - 1 125 kuratierte Fragen in 6 Fächergruppen: Deutsch, Mathematik, Sachunterricht, Englisch, Musik & Kunst, Sport & Miteinander.
  - Dazu unbegrenzt viele Rechen- und Zahlenaufgaben mit Rechenweg.
  - Die Schwierigkeit passt sich an, falsch beantwortete Fragen kommen gezielt wieder (Leitner-System).
  - Zu jeder Antwort gibt es eine Erklärung, und alles kann vorgelesen werden.
- **Denksport:** 6 Minispiele: Marienkäfer-Alarm, Duftspur, Memory, Farben-Wirrwarr, Zahlenjagd, Blitzblick.
- **Grafik und Ton:**
  - Alles wird prozedural gezeichnet, mit Tag-/Nachtwechsel und animierten Kammern.
  - Die Ameisen laufen wirklich durch die Gänge.
  - Klänge, Musik und Vorlesen erzeugt der Browser selbst.
- **Kindgerecht:** keine Käufe, keine Ranglisten und keine Strafen fürs Pausieren. Nach 25 Minuten erinnert das Spiel an eine Bewegungspause. Der Spielstand wird nur lokal im Browser gespeichert.

## Projektstruktur

```
index.html                 Einstieg
styles/main.css            Gestaltung
src/main.js                Spielsteuerung & Hauptschleife
src/game/                  Konfiguration, Welt/Gitter, Simulation, Aktionen, Aufgaben, Spielstand
src/render/                Canvas-Renderer: Gelände, Kammern, Ameisen, Himmel
src/ui/                    Oberfläche: HUD, Quiz, Minispiele, Fenster
src/quiz/                  Quiz-Engine (adaptiv, Leitner) & Aufgaben-Generatoren
src/data/questions/        Fragenbanken je Fach (+ SCHEMA.md)
tools/                     Server, Validator, Smoke-Test
_agent_doc/                Recherche zum Lehrplan & Spieldesign
```

## Dokumentation

- [Lernplan-Recherche Klasse 4 (BW)](_agent_doc/01_lernplan_research_klasse_4/00_README.md)
- [Fragesystem-Design](_agent_doc/01_lernplan_research_klasse_4/09_fragesystem_design.md)
- [Spieldesign](_agent_doc/02_spieldesign.md)
- [Schema für neue Fragen](src/data/questions/SCHEMA.md)
