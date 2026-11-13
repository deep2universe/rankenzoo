// Fragenbank Deutsch – „Ameisenreich“, Klasse 4, Baden-Württemberg
// Bezug: Bildungsplan 2016 Grundschule Deutsch (Klassen 3/4), Grammatikrahmen BW (2021),
// Rechtschreibrahmen BW (aktualisiert 2025), Grundwortschatz BW (2020).
// Recherche & Begründungen: _agent_doc/01_lernplan_research_klasse_4/02_deutsch.md

const BP = 'Bildungsplan BW 2016, Deutsch 3/4';

// ---------- Lesetexte (Leseverstehen) ----------
const TEXT_BLATTSCHNEIDER = 'Die Gärtner im Regenwald\n\n' +
  'In den Regenwäldern Mittel- und Südamerikas leben Blattschneiderameisen. Mit ihren scharfen Kiefern schneiden sie kleine Stücke aus Blättern. ' +
  'Dann tragen sie die Blattstücke wie grüne Segel über ihren Köpfen nach Hause. Ein Blattstück kann mehrmals so schwer sein wie die Ameise selbst.\n' +
  'Doch die Ameisen fressen die Blätter nicht! Im Bau zerkauen sie die Blätter zu einem Brei. Auf diesem Brei wächst ein Pilz. ' +
  'Die Ameisen pflegen ihn wie Gärtner ihren Garten. Von dem Pilz ernähren sie sich und ihre Larven.\n' +
  'Manchmal sitzt auf einem Blattstück eine winzige Ameise. Sie fährt aber nicht nur gemütlich mit: Sie verjagt Fliegen, die die Trägerin angreifen wollen.';

const TEXT_BRUECKE = 'Lotta und die lebende Brücke\n\n' +
  'Lotta war mit ihrem Opa im Regenwald unterwegs. Plötzlich zeigte sie auf den Boden. „Opa, schau mal! Die Ameisen kommen nicht weiter“, rief sie. ' +
  'Ein schmaler Wassergraben trennte die Ameisenstraße vom anderen Ufer.\n' +
  'Die ersten Ameisen hielten an. Dann geschah etwas Erstaunliches: Eine Ameise krallte sich am Rand fest. Die nächste hielt sich an ihr fest, dann noch eine und noch eine. ' +
  'Langsam wuchs eine Kette über den Graben. Schließlich berührte die letzte Ameise das andere Ufer.\n' +
  '„Sie bauen eine Brücke aus ihren eigenen Körpern!“, staunte Lotta. Opa nickte. „Zusammen schaffen sie, was eine allein nie könnte.“\n' +
  'Hunderte Ameisen liefen nun über die lebende Brücke. Am Abend schrieb Lotta alles in ihr Forscherheft.';

const TEXT_IGEL = 'Wie der Igel den Winter verschläft\n\n' +
  'Wenn es im Herbst kalt wird und es kaum noch Käfer, Raupen und Würmer gibt, sucht sich der Igel ein Versteck. ' +
  'Unter einem Laubhaufen oder in einer Hecke baut er sich ein Nest aus Blättern und Moos. Dort rollt er sich zusammen und hält Winterschlaf.\n' +
  'Während des Winterschlafs ist sein Körper ganz anders als sonst: Sein Herz schlägt viel langsamer, und er atmet nur noch wenige Male in der Minute. ' +
  'Seine Körpertemperatur sinkt stark, manchmal auf nur fünf Grad. So spart der Igel Energie. Er lebt von dem Fett, das er sich im Herbst angefressen hat.\n' +
  'Erst im Frühling, wenn es wärmer wird, wacht der Igel auf. Dann ist er sehr hungrig und hat viel Gewicht verloren.';

const TEXT_GLUEHWUERMCHEN = 'Kleine Laternen in der Sommernacht\n\n' +
  'An warmen Sommerabenden im Juni und Juli kann man manchmal kleine Lichter durch die Luft schweben sehen. Das sind Glühwürmchen. ' +
  'Obwohl sie so heißen, sind sie keine Würmer, sondern Käfer.\n' +
  'Die Tiere erzeugen ihr Licht selbst – im hinteren Teil ihres Körpers. Das Licht ist kalt. Es wird also nicht heiß wie eine Glühbirne. ' +
  'Mit dem Leuchten finden sich Männchen und Weibchen. Bei vielen Arten können die Weibchen nicht fliegen. ' +
  'Sie sitzen im Gras und leuchten, damit die fliegenden Männchen sie finden.';

const TEXT_GEDICHT = 'Die Ameisenstraße\n\n' +
  'Ganz früh am Morgen, kühl und nass,\n' +
  'krabbeln Ameisen durch das Gras.\n' +
  'Sie tragen Nadeln, groß und klein,\n' +
  'und keine ist dabei allein.\n\n' +
  'Sie laufen hin, sie laufen her,\n' +
  'der Weg ist weit, die Last ist schwer.\n' +
  'Und wenn die Sonne untergeht,\n' +
  'ein Hügel stolz im Walde steht.';

const TEXT_ANLEITUNG = 'Ameisen beobachten – eine Anleitung\n\n' +
  'Material: eine Lupe, ein Heft, ein Stift und ein Teelöffel Zuckerwasser\n' +
  '1. Suche eine Ameisenstraße im Garten oder auf dem Schulhof.\n' +
  '2. Lege einen Tropfen Zuckerwasser neben die Ameisenstraße.\n' +
  '3. Setze dich leise daneben und warte ein paar Minuten.\n' +
  '4. Beobachte mit der Lupe, was die Ameisen tun.\n' +
  '5. Schreibe deine Beobachtungen in dein Heft.\n' +
  'Wichtig: Störe die Ameisen nicht und zerstöre nie einen Ameisenhügel! Waldameisen stehen unter Naturschutz.';

const TEXT_FABEL = 'Der Hirschkäfer und die Ameisen\n\n' +
  'Ein Hirschkäfer saß auf einem Ast und lachte über die Ameisen. „Ihr seid so klein und schwach“, prahlte er. „Ich dagegen habe mächtige Zangen!“ ' +
  'Die Ameisen sagten nichts und arbeiteten weiter.\n' +
  'Da kam ein heftiger Sturm. Der Ast brach, und der Hirschkäfer fiel auf den Rücken. So sehr er auch zappelte, er kam nicht wieder auf die Beine.\n' +
  'Die Ameisen eilten herbei. Viele kleine Ameisen packten gemeinsam an und drehten den Käfer wieder um.\n' +
  'Beschämt sagte der Hirschkäfer: „Danke! Ich habe mich geirrt.“\n' +
  'Wer andere wegen ihrer Größe verspottet, weiß nicht, wie stark sie gemeinsam sind.';

export default {
  fach: 'deutsch',
  themen: {
    wortarten: {
      name: 'Wortarten',
      icon: '🏷️',
      beschreibung: 'Nomen, Verben, Adjektive & Co. erkennen – mit Proben statt Raten',
      bildungsplan: `${BP}, 3.2.2.4 (3) Wortarten bestimmen; Grammatikrahmen BW Kl. 3/4`,
    },
    nomen_faelle: {
      name: 'Nomen & Fälle',
      icon: '🐜',
      beschreibung: 'Einzahl, Mehrzahl, Artikel und die vier Fälle',
      bildungsplan: `${BP}, 3.2.2.4 (3) Nomen – Artikel; Grammatikrahmen BW Kl. 3/4: Numerus, Genus, Kasus`,
    },
    verben_zeitformen: {
      name: 'Verben & Zeitformen',
      icon: '⏳',
      beschreibung: 'Grundform, Personalform, Präsens, Präteritum, Perfekt und Futur',
      bildungsplan: `${BP}, 3.2.2.4 (3)(4) Personalformen, Zeitstufen; 3.2.2.2 (2) Perfekt/Präteritum`,
    },
    adjektive: {
      name: 'Adjektive',
      icon: '🌈',
      beschreibung: 'Wie ist etwas? Adjektive finden, steigern und vergleichen',
      bildungsplan: `${BP}, 3.2.2.4 (3)(4) Adjektiv, Vergleichsformen`,
    },
    satzglieder: {
      name: 'Satzglieder',
      icon: '🧩',
      beschreibung: 'Prädikat, Subjekt und Objekte mit Umstell- und Ersatzprobe finden',
      bildungsplan: `${BP}, 3.2.2.4 (7) sprachliche Operationen, (8) Prädikat, (9) Satzglieder`,
    },
    satzarten_zeichen: {
      name: 'Satzarten & Satzzeichen',
      icon: '❓',
      beschreibung: 'Aussage, Frage, Aufforderung – und das passende Satzzeichen',
      bildungsplan: `${BP}, 3.2.2.4 (5) Satzzeichen; 3.2.1.1 (7) Satzgrenzen`,
    },
    woertliche_rede: {
      name: 'Wörtliche Rede',
      icon: '💬',
      beschreibung: 'Redezeichen richtig setzen – Begleitsatz vorne oder hinten',
      bildungsplan: `${BP}, 3.2.2.4 (6) Zeichen bei der wörtlichen Rede`,
    },
    rechtschreibung_strategien: {
      name: 'Rechtschreib-Werkzeuge',
      icon: '🧰',
      beschreibung: 'Verlängern, Ableiten, Silben schwingen und Merkwörter',
      bildungsplan: `${BP}, 3.2.1.3 (3)(4)(5) Rechtschreibstrategien; Rechtschreibrahmen BW Kl. 3/4`,
    },
    ss_s_sz: {
      name: 's, ss oder ß?',
      icon: '🐍',
      beschreibung: 'Kurzer oder langer Laut? So findest du s, ss oder ß',
      bildungsplan: `${BP}, 3.2.1.3 (3); Rechtschreibrahmen BW Kl. 3/4: herleitbare s- und ß-Schreibung`,
    },
    das_dass: {
      name: 'das oder dass?',
      icon: '🔍',
      beschreibung: 'Mit der Ersatzprobe „dieses/welches“ entscheiden',
      bildungsplan: `${BP}, 3.2.2.4 (7) ersetzen; Vertiefung (Rechtschreibrahmen BW: das/dass verbindlich ab Kl. 5/6)`,
    },
    gross_klein: {
      name: 'Groß oder klein?',
      icon: '🔠',
      beschreibung: 'Nomen, Satzanfänge und Namen großschreiben',
      bildungsplan: `${BP}, 3.2.1.3 (3) Großschreibung; Rechtschreibrahmen BW Kl. 3/4: Großschreibung aufgrund von Wortbildung`,
    },
    wortfamilien_wortfelder: {
      name: 'Wortfamilien & Wortfelder',
      icon: '🌳',
      beschreibung: 'Wörter mit gleichem Stamm und Wörter mit ähnlicher Bedeutung',
      bildungsplan: `${BP}, 3.2.2.4 (2)(4) Wortfamilien, Wortfelder, Wortstamm; 3.2.2.3 (10) Mehrdeutigkeit`,
    },
    wortbildung: {
      name: 'Wörter bauen',
      icon: '🏗️',
      beschreibung: 'Zusammengesetzte Wörter, Vorbausteine und Nachbausteine',
      bildungsplan: `${BP}, 3.2.2.4 (1)(4) Vorbaustein, Nachbaustein, Ableitung, Zusammensetzung`,
    },
    alphabet_nachschlagen: {
      name: 'ABC & Nachschlagen',
      icon: '📚',
      beschreibung: 'Nach dem Alphabet ordnen, im Wörterbuch suchen, Silben trennen',
      bildungsplan: `${BP}, 3.2.1.3 (2) Nachschlagewerke; Begriff Alphabet; Rechtschreibrahmen BW Kl. 3/4: Worttrennung`,
    },
    leseverstehen: {
      name: 'Lesedetektive',
      icon: '🕵️',
      beschreibung: 'Texte genau lesen und Fragen dazu beantworten',
      bildungsplan: `${BP}, 3.2.1.4 Lesefähigkeit, 3.2.1.6 Leseverstehen, 3.2.1.7 Texterschließungsstrategien`,
    },
  },

  fragen: [
    // =====================================================================
    // WORTARTEN
    // =====================================================================
    { id: 'de-wortarten-001', thema: 'wortarten', stufe: 1, typ: 'choice', bild: '🐜',
      frage: 'Welches Wort ist ein Nomen?',
      optionen: ['krabbeln', 'Ameise', 'flink', 'unter'],
      loesung: 1,
      erklaerung: 'Nomen bezeichnen Lebewesen, Dinge oder Gefühle. Vor „Ameise“ passt ein Artikel: die Ameise. Darum schreibt man es groß.',
      tipp: 'Vor ein Nomen kannst du „der“, „die“ oder „das“ setzen.' },

    { id: 'de-wortarten-002', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist ein Verb?',
      optionen: ['Tunnel', 'tief', 'graben', 'neben'],
      loesung: 2,
      erklaerung: 'Verben kann man in Personalformen setzen: ich grabe, du gräbst, sie gräbt. Mit „Tunnel“, „tief“ oder „neben“ geht das nicht.',
      tipp: 'Probiere: „ich …“, „du …“, „wir …“.' },

    { id: 'de-wortarten-003', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist ein Adjektiv?',
      optionen: ['Blatt', 'tragen', 'und', 'fleißig'],
      loesung: 3,
      erklaerung: 'Adjektive sagen, wie jemand oder etwas ist. Man kann sie oft steigern: fleißig – fleißiger – am fleißigsten.',
      tipp: 'Passt das Wort in die Lücke „die … Ameise“?' },

    { id: 'de-wortarten-004', thema: 'wortarten', stufe: 2, typ: 'choice',
      frage: 'Welches Wort ist ein Nomen, obwohl man es nicht anfassen kann?',
      optionen: ['mutig', 'Mut', 'ermutigen', 'mutiger'],
      loesung: 1,
      erklaerung: 'Auch Gefühle und Gedanken sind Nomen: der Mut, die Angst, die Freude. Die Artikelprobe zeigt es: „der Mut“ passt.',
      tipp: 'Nicht anfassen können heißt nicht „kein Nomen“. Mach die Artikelprobe!' },

    { id: 'de-wortarten-005', thema: 'wortarten', stufe: 2, typ: 'choice', bild: '😴',
      frage: '„Die Ameise schläft im Bau.“ Welche Wortart ist „schläft“?',
      optionen: ['Verb', 'Nomen', 'Adjektiv', 'Artikel'],
      loesung: 0,
      erklaerung: 'Auch wenn man beim Schlafen nichts „tut“, ist „schlafen“ ein Verb. Es verändert sich mit der Person: ich schlafe, du schläfst, sie schläft.',
      tipp: 'Verben erkennst du an den Personalformen, nicht daran, ob man sich bewegt.' },

    { id: 'de-wortarten-006', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist ein Artikel?',
      optionen: ['Hügel', 'der', 'hoch', 'auf'],
      loesung: 1,
      erklaerung: 'Artikel sind Begleiter von Nomen. Bestimmte Artikel sind der, die, das. Unbestimmte Artikel sind ein und eine.' },

    { id: 'de-wortarten-007', thema: 'wortarten', stufe: 2, typ: 'choice',
      frage: '„Die Ameise ist müde. Sie ruht sich aus.“ Welches Wort ist ein Pronomen und steht für „die Ameise“?',
      optionen: ['müde', 'ruht', 'Sie', 'ist'],
      loesung: 2,
      erklaerung: 'Pronomen stehen für ein Nomen. „Sie“ ersetzt „die Ameise“. So muss man das Nomen nicht ständig wiederholen.',
      tipp: 'Welches Wort kannst du durch „die Ameise“ austauschen?' },

    { id: 'de-wortarten-008', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist eine Präposition?',
      optionen: ['Wurzel', 'krabbelt', 'klein', 'unter'],
      loesung: 3,
      erklaerung: 'Präpositionen zeigen, wo etwas ist oder wohin es geht: unter der Wurzel, auf dem Blatt, neben dem Stein.',
      tipp: 'Präpositionen sind kleine Wörter vor einem Nomen mit Artikel.' },

    { id: 'de-wortarten-009', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: '„Ameisen tragen Blätter und Samen.“ Welches Wort ist eine Konjunktion (ein Bindewort)?',
      optionen: ['und', 'Ameisen', 'tragen', 'Samen'],
      loesung: 0,
      erklaerung: 'Konjunktionen wie „und“ oder „oder“ verbinden Wörter oder Sätze. Hier verbindet „und“ die Wörter „Blätter“ und „Samen“.' },

    { id: 'de-wortarten-010', thema: 'wortarten', stufe: 1, typ: 'truefalse',
      frage: 'Nomen schreibt man groß.',
      loesung: true,
      erklaerung: 'Nomen schreibt man immer groß – genau wie das erste Wort eines Satzes. Die Artikelprobe hilft dir, Nomen zu erkennen.' },

    { id: 'de-wortarten-011', thema: 'wortarten', stufe: 2, typ: 'truefalse',
      frage: 'Verben sind nur Wörter für Tätigkeiten, bei denen man sich bewegt.',
      loesung: false,
      erklaerung: 'Auch „schlafen“, „denken“, „bleiben“ oder „wissen“ sind Verben. Man erkennt Verben daran, dass sie sich mit der Person verändern: ich denke, du denkst.' },

    { id: 'de-wortarten-012', thema: 'wortarten', stufe: 3, typ: 'choice',
      frage: 'In welchem Satz wird das Verb „laufen“ als Nomen gebraucht?',
      optionen: ['Die Ameisen laufen schnell.', 'Wir wollen heute laufen.', 'Beim Laufen schwitzt Ben.', 'Ihr müsst laufen.'],
      loesung: 2,
      erklaerung: 'In „beim“ steckt ein Artikel: bei dem Laufen. Ein Wort mit Artikel davor wird wie ein Nomen gebraucht und großgeschrieben.',
      tipp: '„beim“ = „bei dem“.' },

    { id: 'de-wortarten-013', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist kein Nomen?',
      optionen: ['Käfer', 'Blume', 'grün', 'Wiese'],
      loesung: 2,
      erklaerung: '„grün“ beschreibt, wie etwas ist – es ist ein Adjektiv. Zu Käfer, Blume und Wiese passt ein Artikel: der Käfer, die Blume, die Wiese.' },

    { id: 'de-wortarten-014', thema: 'wortarten', stufe: 2, typ: 'choice',
      frage: '„Ihr seid schnell.“ Zu welcher Wortart gehört „Ihr“?',
      optionen: ['Verb', 'Artikel', 'Adjektiv', 'Pronomen'],
      loesung: 3,
      erklaerung: '„Ihr“ ist ein Personalpronomen. Es steht für mehrere Personen, die man anspricht – so wie ich, du, er, sie, es, wir und sie.' },

    { id: 'de-wortarten-015', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: 'In welcher Reihe stehen nur Verben?',
      optionen: ['singen, Lied, laut', 'singen, lachen, rennen', 'Haus, Baum, Maus', 'groß, klein, dick'],
      loesung: 1,
      erklaerung: 'Bei singen, lachen und rennen kannst du Personalformen bilden: ich singe, ich lache, ich renne. „Lied“ ist ein Nomen, „laut“ ein Adjektiv.' },

    { id: 'de-wortarten-016', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: 'In welcher Reihe stehen nur Adjektive?',
      optionen: ['rot, Rose, riechen', 'mutig, Mut, ermutigen', 'rot, weich, mutig', 'weich, Wolle, weben'],
      loesung: 2,
      erklaerung: 'Rot, weich und mutig sagen, wie etwas ist. In den anderen Reihen stecken Nomen (Rose, Mut, Wolle) und Verben (riechen, ermutigen, weben).' },

    { id: 'de-wortarten-017', thema: 'wortarten', stufe: 2, typ: 'choice',
      frage: '„Die kleine Ameise trägt einen großen Krümel.“ Zu welcher Wortart gehören „kleine“ und „großen“?',
      optionen: ['Adjektiv', 'Nomen', 'Artikel', 'Verb'],
      loesung: 0,
      erklaerung: 'Adjektive stehen oft zwischen Artikel und Nomen und passen ihre Endung an: klein → die kleine Ameise, groß → einen großen Krümel.' },

    { id: 'de-wortarten-018', thema: 'wortarten', stufe: 2, typ: 'choice',
      frage: 'Wie kannst du prüfen, ob „springen“ ein Verb ist?',
      optionen: ['Ich prüfe, ob man es anfassen kann.', 'Ich setze „der“ davor.', 'Ich steigere es.', 'Ich bilde Personalformen: ich springe, du springst.'],
      loesung: 3,
      erklaerung: 'Verben verändern sich mit der Person: ich springe, du springst, er springt. Das ist die beste Probe für Verben.' },

    { id: 'de-wortarten-019', thema: 'wortarten', stufe: 1, typ: 'choice',
      frage: 'Wie kannst du prüfen, ob „Freude“ ein Nomen ist?',
      optionen: ['Ich setze einen Artikel davor: die Freude.', 'Ich prüfe, ob man es anfassen kann.', 'Ich bilde „ich freude“.', 'Ich steigere: Freude, Freuder.'],
      loesung: 0,
      erklaerung: 'Die Artikelprobe funktioniert auch bei Gefühlen: die Freude, der Mut, die Angst. Anfassen ist keine gute Probe.' },

    { id: 'de-wortarten-020', thema: 'wortarten', stufe: 3, typ: 'truefalse',
      frage: 'Im Satz „Das Grün der Blätter leuchtet.“ ist „Grün“ ein Nomen.',
      loesung: true,
      erklaerung: 'Vor „Grün“ steht der Artikel „das“. Darum wird das Wort hier wie ein Nomen gebraucht und großgeschrieben.',
      tipp: 'Schau, was direkt vor dem Wort steht.' },

    { id: 'de-wortarten-021', thema: 'wortarten', stufe: 2, typ: 'choice',
      frage: 'Zu welcher Wortart gehören „unter, auf, neben, hinter“?',
      optionen: ['Pronomen', 'Präpositionen', 'Konjunktionen', 'Artikel'],
      loesung: 1,
      erklaerung: 'Diese Wörter sind Präpositionen. Sie zeigen ein Verhältnis an, oft den Ort: unter dem Stein, auf dem Blatt, neben dem Bau.' },

    // =====================================================================
    // NOMEN & FÄLLE
    // =====================================================================
    { id: 'de-nomen-001', thema: 'nomen_faelle', stufe: 1, typ: 'choice', bild: '🐜',
      frage: 'Wie heißt die Mehrzahl von „die Ameise“?',
      optionen: ['die Ameise', 'die Ameises', 'die Ameisen', 'die Ameiser'],
      loesung: 2,
      erklaerung: 'Die Mehrzahl (der Plural) von „die Ameise“ ist „die Ameisen“. Viele Nomen bekommen in der Mehrzahl die Endung -n oder -en.' },

    { id: 'de-nomen-002', thema: 'nomen_faelle', stufe: 1, typ: 'choice', bild: '🌳',
      frage: 'Wie heißt die Mehrzahl von „der Baum“?',
      optionen: ['die Bäume', 'die Baume', 'die Bäumer', 'die Baums'],
      loesung: 0,
      erklaerung: 'Aus „der Baum“ wird „die Bäume“: Das au wird zu äu, und hinten kommt ein -e dazu.' },

    { id: 'de-nomen-003', thema: 'nomen_faelle', stufe: 2, typ: 'choice',
      frage: 'Bei welchem Nomen klingen Einzahl und Mehrzahl gleich?',
      optionen: ['die Raupe', 'das Blatt', 'der Käfer', 'der Wurm'],
      loesung: 2,
      erklaerung: 'Es heißt „der Käfer“ und „die Käfer“. Nur der Artikel zeigt, ob einer oder mehrere gemeint sind. Bei den anderen ändert sich das Wort: Raupen, Blätter, Würmer.' },

    { id: 'de-nomen-004', thema: 'nomen_faelle', stufe: 1, typ: 'choice',
      frage: 'Welcher Artikel passt? „___ Hügel“',
      optionen: ['der', 'die', 'das'],
      loesung: 0, nichtMischen: true,
      erklaerung: 'Es heißt „der Hügel“. Das Nomen ist männlich (maskulin).' },

    { id: 'de-nomen-005', thema: 'nomen_faelle', stufe: 2, typ: 'choice',
      frage: 'Welcher Artikel passt zu „Freiheit“?',
      optionen: ['der', 'die', 'das'],
      loesung: 1, nichtMischen: true,
      erklaerung: 'Nomen mit den Nachbausteinen -heit, -keit und -ung sind immer weiblich: die Freiheit, die Fröhlichkeit, die Hoffnung.',
      tipp: 'Schau dir das Wortende an.' },

    { id: 'de-nomen-006', thema: 'nomen_faelle', stufe: 2, typ: 'choice', bild: '🌼',
      frage: 'Welcher Artikel passt zu „Blümchen“?',
      optionen: ['der', 'die', 'das'],
      loesung: 2, nichtMischen: true,
      erklaerung: 'Verkleinerungsformen mit -chen oder -lein haben immer den Artikel „das“: das Blümchen, das Büchlein – auch wenn es „die Blume“ heißt.' },

    { id: 'de-nomen-007', thema: 'nomen_faelle', stufe: 1, typ: 'choice',
      frage: 'Nach welchem Fall fragst du mit „Wer oder was?“',
      optionen: ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'],
      loesung: 0, nichtMischen: true,
      erklaerung: 'Mit „Wer oder was?“ fragst du nach dem Nominativ, dem 1. Fall. Das Subjekt eines Satzes steht immer im Nominativ.' },

    { id: 'de-nomen-008', thema: 'nomen_faelle', stufe: 2, typ: 'choice',
      frage: 'Mit welcher Frage findest du den Dativ (3. Fall)?',
      optionen: ['Wen oder was?', 'Wessen?', 'Wem?', 'Wer oder was?'],
      loesung: 2,
      erklaerung: 'Nach dem Dativ fragst du mit „Wem?“. Beispiel: Wem hilft die Ameise? – dem Käfer.' },

    { id: 'de-nomen-009', thema: 'nomen_faelle', stufe: 2, typ: 'choice',
      frage: '„Die Ameise trägt den Krümel.“ In welchem Fall steht „den Krümel“?',
      optionen: ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'],
      loesung: 3, nichtMischen: true,
      erklaerung: 'Frage: Wen oder was trägt die Ameise? – den Krümel. Mit „Wen oder was?“ findest du den Akkusativ (4. Fall).',
      tipp: 'Stelle die Frage mit dem Verb: Wen oder was trägt …?' },

    { id: 'de-nomen-010', thema: 'nomen_faelle', stufe: 2, typ: 'choice',
      frage: '„Die Ameise hilft dem Käfer.“ In welchem Fall steht „dem Käfer“?',
      optionen: ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'],
      loesung: 2, nichtMischen: true,
      erklaerung: 'Frage: Wem hilft die Ameise? – dem Käfer. „Wem?“ fragt nach dem Dativ (3. Fall). Das Verb „helfen“ verlangt immer den Dativ.',
      tipp: 'Frage nicht „Wen?“, sondern probiere „Wem hilft …?“.' },

    { id: 'de-nomen-011', thema: 'nomen_faelle', stufe: 1, typ: 'choice',
      frage: '„Der Regenwurm gräbt im Boden.“ In welchem Fall steht „Der Regenwurm“?',
      optionen: ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'],
      loesung: 0, nichtMischen: true,
      erklaerung: 'Frage: Wer oder was gräbt im Boden? – der Regenwurm. Das ist der Nominativ (1. Fall).' },

    { id: 'de-nomen-012', thema: 'nomen_faelle', stufe: 3, typ: 'choice', bild: '🪺',
      frage: '„Das Nest des Vogels ist leer.“ In welchem Fall steht „des Vogels“?',
      optionen: ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'],
      loesung: 1, nichtMischen: true,
      erklaerung: 'Frage: Wessen Nest ist leer? – das Nest des Vogels. Mit „Wessen?“ fragst du nach dem Genitiv (2. Fall).' },

    { id: 'de-nomen-013', thema: 'nomen_faelle', stufe: 3, typ: 'choice', bild: '🐕',
      frage: 'Welches Wort passt? „Ich gebe ___ Hund einen Knochen.“',
      optionen: ['den', 'dem', 'der', 'des'],
      loesung: 1,
      erklaerung: 'Frage: Wem gebe ich einen Knochen? – dem Hund. Nach „Wem?“ steht der Dativ: dem Hund. „Den Hund“ wäre der Akkusativ.',
      tipp: 'Wem gebe ich etwas? Wen oder was gebe ich?' },

    { id: 'de-nomen-014', thema: 'nomen_faelle', stufe: 3, typ: 'choice', bild: '🦔',
      frage: 'Welches Wort passt? „Ich sehe ___ Igel im Laub.“',
      optionen: ['dem', 'der', 'den', 'des'],
      loesung: 2,
      erklaerung: 'Frage: Wen oder was sehe ich? – den Igel. Nach „Wen oder was?“ steht der Akkusativ: den Igel.' },

    { id: 'de-nomen-015', thema: 'nomen_faelle', stufe: 2, typ: 'truefalse',
      frage: 'In jedem Satz gibt es ein Nomen im Akkusativ.',
      loesung: false,
      erklaerung: 'Nicht jeder Satz hat einen Akkusativ. In „Die Sonne scheint.“ gibt es nur den Nominativ: Wer oder was scheint? – die Sonne.' },

    { id: 'de-nomen-016', thema: 'nomen_faelle', stufe: 2, typ: 'order',
      frage: 'Ordne die vier Fälle: vom 1. bis zum 4. Fall!',
      teile: ['Nominativ', 'Genitiv', 'Dativ', 'Akkusativ'],
      erklaerung: '1. Fall Nominativ (Wer oder was?), 2. Fall Genitiv (Wessen?), 3. Fall Dativ (Wem?), 4. Fall Akkusativ (Wen oder was?).',
      tipp: 'Merksatz für N – G – D – A: „Nur Glückliche Dachse Arbeiten.“' },

    { id: 'de-nomen-017', thema: 'nomen_faelle', stufe: 2, typ: 'choice',
      frage: 'Welches Nomen bezeichnet etwas, das man nicht anfassen kann?',
      optionen: ['der Ast', 'die Angst', 'die Ameise', 'der Apfel'],
      loesung: 1,
      erklaerung: '„Angst“ ist ein Gefühl. Man kann es nicht anfassen, trotzdem ist es ein Nomen: die Angst. Solche Nomen heißen auch Abstrakta.' },

    { id: 'de-nomen-018', thema: 'nomen_faelle', stufe: 1, typ: 'truefalse',
      frage: 'Der Artikel „das“ zeigt, dass ein Nomen sächlich ist, zum Beispiel „das Blatt“.',
      loesung: true,
      erklaerung: 'Es gibt drei Geschlechter: männlich (der Käfer), weiblich (die Ameise) und sächlich (das Blatt).' },

    { id: 'de-nomen-019', thema: 'nomen_faelle', stufe: 1, typ: 'input', eingabe: 'text', bild: '🐭',
      frage: 'Schreibe die Mehrzahl von „die Maus“ (ohne Artikel).',
      loesung: 'Mäuse', alternativen: ['die Mäuse'],
      erklaerung: 'Aus „die Maus“ wird „die Mäuse“. Das au wird zu äu – daran erkennst du auch, warum man „Mäuse“ mit äu schreibt.' },

    // =====================================================================
    // VERBEN & ZEITFORMEN
    // =====================================================================
    { id: 'de-verben-001', thema: 'verben_zeitformen', stufe: 1, typ: 'choice',
      frage: 'Wie heißt die Grundform (der Infinitiv) von „sie krabbelt“?',
      optionen: ['krabbelt', 'krabbelte', 'krabbeln', 'gekrabbelt'],
      loesung: 2,
      erklaerung: 'Die Grundform endet meistens auf -en oder -n: krabbeln. So steht das Verb auch im Wörterbuch.' },

    { id: 'de-verben-002', thema: 'verben_zeitformen', stufe: 1, typ: 'choice',
      frage: 'Welche Personalform passt? „Du ___ sehr schnell.“ (rennen)',
      optionen: ['rennst', 'rennt', 'renne', 'rennen'],
      loesung: 0,
      erklaerung: 'Zu „du“ gehört meistens die Endung -st: du rennst, du gräbst, du krabbelst.' },

    { id: 'de-verben-003', thema: 'verben_zeitformen', stufe: 1, typ: 'choice',
      frage: 'In welcher Zeitform steht: „Die Ameise trägt ein Blatt.“?',
      optionen: ['Präsens', 'Präteritum', 'Perfekt', 'Futur'],
      loesung: 0, nichtMischen: true,
      erklaerung: '„trägt“ steht im Präsens (Gegenwart). Es passiert gerade jetzt oder immer wieder.' },

    { id: 'de-verben-004', thema: 'verben_zeitformen', stufe: 2, typ: 'choice',
      frage: 'In welcher Zeitform steht: „Die Ameise trug ein Blatt.“?',
      optionen: ['Präsens', 'Präteritum', 'Perfekt', 'Futur'],
      loesung: 1, nichtMischen: true,
      erklaerung: '„trug“ ist Präteritum, eine Vergangenheitsform. Man nennt es auch die schriftliche Vergangenheit, weil man es oft in Geschichten benutzt.' },

    { id: 'de-verben-005', thema: 'verben_zeitformen', stufe: 2, typ: 'choice',
      frage: 'In welcher Zeitform steht: „Die Ameise hat ein Blatt getragen.“?',
      optionen: ['Präsens', 'Präteritum', 'Perfekt', 'Futur'],
      loesung: 2, nichtMischen: true,
      erklaerung: 'Das Perfekt besteht aus zwei Teilen: „hat“ + „getragen“. Man nennt es auch die gesprochene Vergangenheit, weil man so oft erzählt.',
      tipp: 'Achte auf „haben“ oder „sein“ und ein Wort mit ge-.' },

    { id: 'de-verben-006', thema: 'verben_zeitformen', stufe: 2, typ: 'choice',
      frage: 'In welcher Zeitform steht: „Die Ameise wird ein Blatt tragen.“?',
      optionen: ['Präsens', 'Präteritum', 'Perfekt', 'Futur'],
      loesung: 3, nichtMischen: true,
      erklaerung: 'Das Futur bildet man mit „werden“ und der Grundform: wird … tragen. Es zeigt meist etwas Zukünftiges an.' },

    { id: 'de-verben-007', thema: 'verben_zeitformen', stufe: 3, typ: 'choice',
      frage: '„Morgen besuchen wir den Ameisenhügel.“ In welcher Zeitform steht das Verb?',
      optionen: ['Futur', 'Präsens', 'Perfekt', 'Präteritum'],
      loesung: 1,
      erklaerung: 'Gemeint ist zwar die Zukunft, aber die Verbform „besuchen“ steht im Präsens. Das Wort „morgen“ zeigt die Zukunft an. Im Futur hieße es: Wir werden … besuchen.',
      tipp: 'Schau nur auf die Verbform, nicht auf das Wort „morgen“.' },

    { id: 'de-verben-008', thema: 'verben_zeitformen', stufe: 2, typ: 'choice',
      frage: 'Wie heißt das Präteritum? „Der Käfer ___ über den Stein.“ (laufen)',
      optionen: ['laufte', 'lief', 'läuft', 'ist gelaufen'],
      loesung: 1,
      erklaerung: '„laufen“ ist ein unregelmäßiges (starkes) Verb. Im Präteritum ändert sich der Wortstamm: laufen – lief. „laufte“ gibt es nicht.' },

    { id: 'de-verben-009', thema: 'verben_zeitformen', stufe: 2, typ: 'choice',
      frage: 'Wie heißt das Präteritum? „Der Maulwurf ___ einen langen Gang.“ (graben)',
      optionen: ['grabte', 'gräbt', 'grub', 'grab'],
      loesung: 2,
      erklaerung: '„graben“ ist ein starkes Verb: graben – grub – gegraben. Der Selbstlaut ändert sich von a zu u.' },

    { id: 'de-verben-010', thema: 'verben_zeitformen', stufe: 2, typ: 'choice',
      frage: 'Welcher Satz im Perfekt ist richtig?',
      optionen: ['Wir haben zum Teich gelaufen.', 'Wir sind zum Teich gelauft.', 'Wir sind zum Teich gelaufen.', 'Wir haben zum Teich gelauft.'],
      loesung: 2,
      erklaerung: 'Verben, die eine Bewegung von einem Ort zum anderen ausdrücken, bilden das Perfekt meist mit „sein“: Wir sind gelaufen. Das Partizip von laufen heißt „gelaufen“.' },

    { id: 'de-verben-011', thema: 'verben_zeitformen', stufe: 2, typ: 'choice',
      frage: 'Welcher Satz im Perfekt ist richtig?',
      optionen: ['Die Ameise ist den Krümel getragen.', 'Die Ameise hat den Krümel getragen.', 'Die Ameise hat den Krümel getragt.', 'Die Ameise hat den Krümel trug.'],
      loesung: 1,
      erklaerung: 'Perfekt = „haben“ oder „sein“ + Partizip. Bei „tragen“ heißt es: hat … getragen.' },

    { id: 'de-verben-012', thema: 'verben_zeitformen', stufe: 1, typ: 'truefalse',
      frage: 'Das Perfekt besteht aus zwei Teilen, zum Beispiel „hat gebaut“ oder „ist gekrochen“.',
      loesung: true,
      erklaerung: 'Im Perfekt steht eine Form von „haben“ oder „sein“ und dazu das Partizip: hat gebaut, ist gekrochen.' },

    { id: 'de-verben-013', thema: 'verben_zeitformen', stufe: 2, typ: 'truefalse',
      frage: 'Wenn man mündlich von Erlebnissen erzählt, benutzt man oft das Perfekt. In geschriebenen Geschichten steht oft das Präteritum.',
      loesung: true,
      erklaerung: 'Darum heißt das Perfekt auch gesprochene Vergangenheit („Ich bin gerannt.“) und das Präteritum schriftliche Vergangenheit („Ich rannte.“).' },

    { id: 'de-verben-014', thema: 'verben_zeitformen', stufe: 1, typ: 'choice',
      frage: 'Welcher Satz steht im Futur?',
      optionen: ['Ich schwimme.', 'Ich schwamm.', 'Ich werde schwimmen.', 'Ich bin geschwommen.'],
      loesung: 2,
      erklaerung: 'Das Futur erkennst du an „werden“ + Grundform: Ich werde schwimmen.' },

    { id: 'de-verben-015', thema: 'verben_zeitformen', stufe: 3, typ: 'choice', bild: '📖',
      frage: 'Wie heißt die Aufforderung an ein Kind? „___ den Text genau!“ (lesen)',
      optionen: ['Lese', 'Lies', 'Les', 'Lest'],
      loesung: 1,
      erklaerung: 'Die Aufforderungsform (Imperativ) bildest du aus der du-Form: du liest → Lies! „Lest!“ sagt man zu mehreren Kindern.',
      tipp: 'Denke an die du-Form: du liest.' },

    { id: 'de-verben-016', thema: 'verben_zeitformen', stufe: 3, typ: 'choice', bild: '🍎',
      frage: 'Wie heißt die Aufforderung an ein Kind? „___ dir einen Apfel!“ (nehmen)',
      optionen: ['Nehm', 'Nehme', 'Nimmt', 'Nimm'],
      loesung: 3,
      erklaerung: 'Aus „du nimmst“ wird die Aufforderung „Nimm!“. Das e wechselt zu i – genau wie bei „geben – gib!“ und „helfen – hilf!“.' },

    { id: 'de-verben-017', thema: 'verben_zeitformen', stufe: 1, typ: 'input', eingabe: 'text',
      frage: 'Schreibe das Präteritum von „gehen“: „Gestern ___ ich in den Wald.“',
      loesung: 'ging',
      erklaerung: '„gehen“ ist ein starkes Verb: gehen – ging – gegangen. „gehte“ gibt es nicht.' },

    { id: 'de-verben-018', thema: 'verben_zeitformen', stufe: 2, typ: 'input', eingabe: 'text',
      frage: 'Schreibe die Grundform (den Infinitiv) von „sie aß“.',
      loesung: 'essen',
      erklaerung: '„aß“ ist das Präteritum von „essen“: essen – aß – gegessen. Im Wörterbuch suchst du deshalb unter „essen“.' },

    { id: 'de-verben-019', thema: 'verben_zeitformen', stufe: 2, typ: 'order',
      frage: 'Bilde einen Satz im Perfekt!',
      teile: ['Die', 'Ameisen', 'haben', 'einen', 'Tunnel', 'gegraben.'],
      erklaerung: 'Im Perfekt umklammern die beiden Verbteile den Satz: „haben“ steht an zweiter Stelle, „gegraben“ ganz am Ende.' },

    { id: 'de-verben-020', thema: 'verben_zeitformen', stufe: 1, typ: 'choice',
      frage: 'Woran erkennst du das Futur?',
      optionen: ['an „haben“ + Partizip', 'an der Endung -te', 'an „werden“ + Grundform', 'am Wort „gestern“'],
      loesung: 2,
      erklaerung: 'Futur = „werden“ + Grundform des Verbs: Ich werde bauen, du wirst bauen. Die Endung -te zeigt das Präteritum (baute).' },

    { id: 'de-verben-021', thema: 'verben_zeitformen', stufe: 1, typ: 'choice',
      frage: 'Welche Form passt zu „wir“?',
      optionen: ['wir baust', 'wir bauen', 'wir baut', 'wir baue'],
      loesung: 1,
      erklaerung: 'Zu „wir“ gehört die Endung -en: wir bauen. Sie sieht aus wie die Grundform.' },

    { id: 'de-verben-022', thema: 'verben_zeitformen', stufe: 2, typ: 'truefalse',
      frage: '„Ich bin gestern geschwommen.“ steht im Präteritum.',
      loesung: false,
      erklaerung: 'Der Satz steht im Perfekt: „bin“ + „geschwommen“. Im Präteritum hieße es: Ich schwamm gestern.' },

    // =====================================================================
    // ADJEKTIVE
    // =====================================================================
    { id: 'de-adjektive-001', thema: 'adjektive', stufe: 1, typ: 'choice',
      frage: 'Steigere richtig: groß – größer – …',
      optionen: ['am größesten', 'am größten', 'am großten', 'am meisten groß'],
      loesung: 1,
      erklaerung: 'Die Höchststufe heißt „am größten“. Schon in „größer“ wird das o zum ö – das bleibt auch in der Höchststufe.' },

    { id: 'de-adjektive-002', thema: 'adjektive', stufe: 2, typ: 'choice',
      frage: 'Steigere richtig: gut – … – am besten',
      optionen: ['guter', 'güter', 'besser', 'mehr gut'],
      loesung: 2,
      erklaerung: '„gut“ wird unregelmäßig gesteigert: gut – besser – am besten. Solche Formen muss man sich merken.' },

    { id: 'de-adjektive-003', thema: 'adjektive', stufe: 2, typ: 'choice', bild: '🪲',
      frage: 'Welcher Satz ist richtig?',
      optionen: ['Der Käfer ist größer wie die Ameise.', 'Der Käfer ist größer als die Ameise.', 'Der Käfer ist mehr groß als die Ameise.'],
      loesung: 1,
      erklaerung: 'Wenn zwei Dinge verschieden sind, benutzt du die Vergleichsstufe mit „als“: größer als. Bei Gleichheit sagst du „so groß wie“.',
      tipp: 'Verschieden → als. Gleich → so … wie.' },

    { id: 'de-adjektive-004', thema: 'adjektive', stufe: 2, typ: 'choice', bild: '🐝',
      frage: 'Welcher Satz ist richtig?',
      optionen: ['Die Ameise ist so fleißig als die Biene.', 'Die Ameise ist so fleißiger wie die Biene.', 'Die Ameise ist so fleißig wie die Biene.'],
      loesung: 2,
      erklaerung: 'Sind zwei gleich, sagst du „so … wie“ mit der Grundstufe: so fleißig wie.' },

    { id: 'de-adjektive-005', thema: 'adjektive', stufe: 1, typ: 'choice',
      frage: 'Was ist das Gegenteil von „schwer“?',
      optionen: ['groß', 'leicht', 'dick', 'stark'],
      loesung: 1,
      erklaerung: 'Das Gegenteil von „schwer“ ist „leicht“: ein schwerer Stein, eine leichte Feder.' },

    { id: 'de-adjektive-006', thema: 'adjektive', stufe: 1, typ: 'choice', bild: '🏖️',
      frage: 'Bilde aus dem Nomen „Sand“ ein Adjektiv.',
      optionen: ['sandlich', 'sandbar', 'sandig', 'sandisch'],
      loesung: 2,
      erklaerung: 'Mit dem Nachbaustein -ig wird aus dem Nomen „Sand“ das Adjektiv „sandig“. Adjektive schreibt man klein.' },

    { id: 'de-adjektive-007', thema: 'adjektive', stufe: 1, typ: 'choice',
      frage: 'Bilde aus dem Nomen „Freund“ ein Adjektiv.',
      optionen: ['freundlich', 'freundig', 'freundbar', 'freundsam'],
      loesung: 0,
      erklaerung: 'Mit dem Nachbaustein -lich entsteht „freundlich“. Weitere Beispiele: Glück → glücklich, Herz → herzlich.' },

    { id: 'de-adjektive-008', thema: 'adjektive', stufe: 1, typ: 'truefalse',
      frage: 'Adjektive beschreiben, wie jemand oder etwas ist.',
      loesung: true,
      erklaerung: 'Adjektive beschreiben Eigenschaften: die flinke Ameise, der grüne Käfer, das süße Zuckerwasser.' },

    { id: 'de-adjektive-009', thema: 'adjektive', stufe: 1, typ: 'choice',
      frage: 'Welche Stufe ist „am höchsten“?',
      optionen: ['Grundstufe', 'Vergleichsstufe', 'Höchststufe'],
      loesung: 2, nichtMischen: true,
      erklaerung: 'hoch (Grundstufe) – höher (Vergleichsstufe) – am höchsten (Höchststufe).' },

    { id: 'de-adjektive-010', thema: 'adjektive', stufe: 3, typ: 'choice',
      frage: 'Steigere richtig: viel – mehr – …',
      optionen: ['am vielsten', 'am mehrsten', 'am meisten', 'am mehr'],
      loesung: 2,
      erklaerung: '„viel“ wird unregelmäßig gesteigert: viel – mehr – am meisten. Wie bei „gut – besser – am besten“ musst du dir das merken.' },

    { id: 'de-adjektive-011', thema: 'adjektive', stufe: 2, typ: 'input', eingabe: 'text', bild: '☀️',
      frage: 'Setze „warm“ in die Vergleichsstufe: „Heute ist es ___ als gestern.“',
      loesung: 'wärmer',
      erklaerung: 'warm – wärmer – am wärmsten. In der Vergleichsstufe wird das a zum ä.' },

    { id: 'de-adjektive-012', thema: 'adjektive', stufe: 2, typ: 'choice',
      frage: 'In welchem Satz steht das Adjektiv in der Vergleichsstufe?',
      optionen: ['Die Ameise ist schnell.', 'Die Ameise ist am schnellsten.', 'Die schnelle Ameise rennt.', 'Die Ameise ist schneller als die Schnecke.'],
      loesung: 3,
      erklaerung: 'Die Vergleichsstufe hat die Endung -er und oft „als“ danach: schneller als.' },

    { id: 'de-adjektive-013', thema: 'adjektive', stufe: 1, typ: 'truefalse',
      frage: 'In „Die kleinen Ameisen tragen große Blätter.“ gibt es zwei Adjektive.',
      loesung: true,
      erklaerung: '„kleinen“ und „große“ sind Adjektive. Sie beschreiben die Ameisen und die Blätter genauer.' },

    { id: 'de-adjektive-014', thema: 'adjektive', stufe: 3, typ: 'choice',
      frage: 'Alle Wörter enden auf -ig. Welches ist ein Adjektiv?',
      optionen: ['König', 'Honig', 'mutig', 'Käfig'],
      loesung: 2,
      erklaerung: '„mutig“ kannst du steigern: mutiger, am mutigsten. Zu König, Honig und Käfig passt ein Artikel – sie sind Nomen.',
      tipp: 'Mach die Artikelprobe und die Steigerungsprobe.' },

    { id: 'de-adjektive-015', thema: 'adjektive', stufe: 1, typ: 'choice',
      frage: 'Welches Paar besteht aus Gegensätzen?',
      optionen: ['hell – leuchtend', 'dunkel – finster', 'hell – dunkel', 'klein – winzig'],
      loesung: 2,
      erklaerung: '„hell“ und „dunkel“ sind Gegensätze. Die anderen Paare bedeuten ungefähr dasselbe – sie gehören zu einem Wortfeld.' },

    // =====================================================================
    // SATZGLIEDER
    // =====================================================================
    { id: 'de-satzglieder-001', thema: 'satzglieder', stufe: 1, typ: 'choice',
      frage: 'Was ist das Prädikat im Satz „Die Ameise krabbelt über den Ast.“?',
      optionen: ['Die Ameise', 'krabbelt', 'über den Ast', 'Ast'],
      loesung: 1,
      erklaerung: 'Das Prädikat ist das Verb in der Personalform: krabbelt. Es ist der Kern des Satzes.' },

    { id: 'de-satzglieder-002', thema: 'satzglieder', stufe: 1, typ: 'choice', bild: '🐦',
      frage: 'Was ist das Subjekt im Satz „Der Specht klopft an den Baum.“?',
      optionen: ['klopft', 'an den Baum', 'Baum', 'Der Specht'],
      loesung: 3,
      erklaerung: 'Frage: Wer oder was klopft an den Baum? – der Specht. Mit „Wer oder was?“ findest du das Subjekt.' },

    { id: 'de-satzglieder-003', thema: 'satzglieder', stufe: 1, typ: 'choice',
      frage: 'Mit welcher Frage findest du das Subjekt?',
      optionen: ['Wem …?', 'Wer oder was …?', 'Wen oder was …?', 'Wo …?'],
      loesung: 1,
      erklaerung: 'Das Subjekt findest du mit „Wer oder was?“ und dem Prädikat: Wer oder was krabbelt? – die Ameise.' },

    { id: 'de-satzglieder-004', thema: 'satzglieder', stufe: 2, typ: 'choice',
      frage: '„Die Ameisen bauen einen Hügel.“ Welches Satzglied ist „einen Hügel“?',
      optionen: ['Subjekt', 'Prädikat', 'Dativobjekt', 'Akkusativobjekt'],
      loesung: 3,
      erklaerung: 'Frage: Wen oder was bauen die Ameisen? – einen Hügel. Die Antwort auf „Wen oder was?“ ist das Akkusativobjekt.' },

    { id: 'de-satzglieder-005', thema: 'satzglieder', stufe: 2, typ: 'choice', bild: '🕷️',
      frage: '„Die Spinne zeigt der Fliege ihr Netz.“ Welches Satzglied ist „der Fliege“?',
      optionen: ['Subjekt', 'Dativobjekt', 'Akkusativobjekt', 'Prädikat'],
      loesung: 1,
      erklaerung: 'Frage: Wem zeigt die Spinne ihr Netz? – der Fliege. Die Antwort auf „Wem?“ ist das Dativobjekt. „ihr Netz“ ist das Akkusativobjekt.' },

    { id: 'de-satzglieder-006', thema: 'satzglieder', stufe: 2, typ: 'choice',
      frage: 'Wie findest du heraus, welche Wörter zusammen ein Satzglied bilden?',
      optionen: ['Ich zähle die Wörter.', 'Jedes Wort ist ein eigenes Satzglied.', 'Ich suche alle Nomen.', 'Ich stelle den Satz um. Was zusammenbleibt, ist ein Satzglied.'],
      loesung: 3,
      erklaerung: 'Das ist die Umstellprobe: Wörter, die beim Umstellen immer zusammenbleiben, bilden ein Satzglied, zum Beispiel „die kleine Ameise“.' },

    { id: 'de-satzglieder-007', thema: 'satzglieder', stufe: 2, typ: 'choice',
      frage: 'Welcher Satz ist eine richtige Umstellung von „Die Ameise trägt heute ein Blatt.“?',
      optionen: ['Heute die Ameise trägt ein Blatt.', 'Heute trägt die Ameise ein Blatt.', 'Die Ameise heute trägt ein Blatt.', 'Ein Blatt heute trägt die Ameise.'],
      loesung: 1,
      erklaerung: 'Beim Umstellen bleibt das Prädikat „trägt“ an der zweiten Stelle. Nur die anderen Satzglieder wandern.' },

    { id: 'de-satzglieder-008', thema: 'satzglieder', stufe: 3, typ: 'choice',
      frage: 'Wo steht das Prädikat (die Personalform des Verbs) in einem Aussagesatz?',
      optionen: ['immer ganz am Anfang', 'an der zweiten Satzgliedstelle', 'immer ganz am Ende', 'direkt nach dem ersten Nomen'],
      loesung: 1,
      erklaerung: 'Im Aussagesatz steht die Personalform des Verbs an der zweiten Satzgliedstelle – egal, wie du die anderen Satzglieder umstellst.' },

    { id: 'de-satzglieder-009', thema: 'satzglieder', stufe: 3, typ: 'choice', bild: '🌅',
      frage: '„Am Morgen weckt die Sonne die Ameisen.“ Was ist das Subjekt?',
      optionen: ['Am Morgen', 'weckt', 'die Sonne', 'die Ameisen'],
      loesung: 2,
      erklaerung: 'Frage: Wer oder was weckt? – die Sonne. Außerdem passt „weckt“ (Einzahl) nur zu „die Sonne“. Das Subjekt steht also nicht immer vorne!',
      tipp: 'Das Prädikat und das Subjekt passen in der Zahl zusammen.' },

    { id: 'de-satzglieder-010', thema: 'satzglieder', stufe: 3, typ: 'choice',
      frage: '„Den Käfer sieht der Vogel nicht.“ Welches Satzglied ist „Den Käfer“?',
      optionen: ['Subjekt', 'Dativobjekt', 'Prädikat', 'Akkusativobjekt'],
      loesung: 3,
      erklaerung: 'Frage: Wen oder was sieht der Vogel nicht? – den Käfer. Das ist das Akkusativobjekt, auch wenn es vorne steht. Das Subjekt ist „der Vogel“.' },

    { id: 'de-satzglieder-011', thema: 'satzglieder', stufe: 2, typ: 'truefalse',
      frage: 'Das Subjekt steht immer am Anfang des Satzes.',
      loesung: false,
      erklaerung: 'Das Subjekt kann auch weiter hinten stehen: „Heute baut die Ameise einen Tunnel.“ Frage immer: Wer oder was baut? – die Ameise.' },

    { id: 'de-satzglieder-012', thema: 'satzglieder', stufe: 3, typ: 'choice',
      frage: '„Die Ameisen haben den Tunnel gebaut.“ Wie heißt das ganze Prädikat?',
      optionen: ['haben', 'gebaut', 'haben … gebaut', 'den Tunnel gebaut'],
      loesung: 2,
      erklaerung: 'Im Perfekt ist das Prädikat zweiteilig: „haben“ an zweiter Stelle und „gebaut“ am Ende. Zusammen bilden sie das Prädikat.' },

    { id: 'de-satzglieder-013', thema: 'satzglieder', stufe: 1, typ: 'order',
      frage: 'Bilde einen Aussagesatz aus den Satzgliedern!',
      teile: ['Die kleine Ameise', 'findet', 'einen Zuckerkrümel.'],
      erklaerung: 'Im Aussagesatz steht das Prädikat „findet“ an zweiter Stelle. Am Ende steht ein Punkt.' },

    { id: 'de-satzglieder-014', thema: 'satzglieder', stufe: 2, typ: 'order',
      frage: 'Bilde einen Aussagesatz aus den Satzgliedern!',
      teile: ['Im Sommer', 'sammeln', 'die Ameisen', 'viele Vorräte.'],
      erklaerung: 'Auch wenn „Im Sommer“ vorne steht, bleibt das Prädikat „sammeln“ an zweiter Stelle. Danach folgt das Subjekt „die Ameisen“.' },

    { id: 'de-satzglieder-015', thema: 'satzglieder', stufe: 3, typ: 'order', bild: '🦔',
      frage: 'Stelle den Satz so um, dass er mit „Dem Igel“ beginnt!',
      teile: ['Dem Igel', 'bringt', 'das Mädchen', 'eine Schale Wasser.'],
      erklaerung: '„Dem Igel“ ist das Dativobjekt (Wem bringt das Mädchen Wasser?). Auch wenn es vorne steht, bleibt das Prädikat „bringt“ an zweiter Stelle.' },

    { id: 'de-satzglieder-016', thema: 'satzglieder', stufe: 2, typ: 'choice',
      frage: '„Die fleißigen Ameisen bauen einen Hügel.“ Durch welches Wort kannst du „Die fleißigen Ameisen“ ersetzen?',
      optionen: ['Ihr', 'Es', 'Sie', 'Ihm'],
      loesung: 2,
      erklaerung: 'Ersatzprobe: „Sie bauen einen Hügel.“ Drei Wörter lassen sich durch ein Pronomen ersetzen – also bilden sie zusammen ein Satzglied, das Subjekt.' },

    { id: 'de-satzglieder-017', thema: 'satzglieder', stufe: 1, typ: 'truefalse',
      frage: 'In jedem vollständigen Satz gibt es ein Prädikat.',
      loesung: true,
      erklaerung: 'Das Prädikat ist der Kern des Satzes. Ohne Verb ist ein Satz nicht vollständig: „Die Ameise … ein Blatt.“ – da fehlt etwas!' },

    { id: 'de-satzglieder-018', thema: 'satzglieder', stufe: 3, typ: 'choice',
      frage: 'Welcher Satz enthält ein Dativobjekt?',
      optionen: ['Die Ameise sucht ihre Schwester.', 'Die Ameise ist eine Arbeiterin.', 'Die Ameise hilft ihrer Schwester.', 'Die Ameise läuft schnell.'],
      loesung: 2,
      erklaerung: 'Frage: Wem hilft die Ameise? – ihrer Schwester. Das ist ein Dativobjekt. Bei „sucht“ fragst du „Wen oder was?“ – das ist ein Akkusativobjekt.' },

    { id: 'de-satzglieder-019', thema: 'satzglieder', stufe: 1, typ: 'choice',
      frage: 'Welches Satzglied erfragst du mit „Wen oder was?“',
      optionen: ['Akkusativobjekt', 'Dativobjekt', 'Subjekt', 'Prädikat'],
      loesung: 0,
      erklaerung: 'Mit „Wen oder was?“ findest du das Akkusativobjekt: Wen oder was trägt die Ameise? – den Krümel.' },

    // =====================================================================
    // SATZARTEN & SATZZEICHEN
    // =====================================================================
    { id: 'de-satzarten-001', thema: 'satzarten_zeichen', stufe: 1, typ: 'choice',
      frage: 'Welches Satzzeichen fehlt? „Wohin krabbelt die Ameise_“',
      optionen: ['.', '?', '!', ':'],
      loesung: 1,
      erklaerung: 'Der Satz beginnt mit dem Fragewort „Wohin“. Es ist ein Fragesatz, also kommt ein Fragezeichen ans Ende.' },

    { id: 'de-satzarten-002', thema: 'satzarten_zeichen', stufe: 1, typ: 'choice',
      frage: 'Welches Satzzeichen passt? „Halt, bleib sofort stehen_“',
      optionen: ['?', ':', '!'],
      loesung: 2,
      erklaerung: 'Hier fordert jemand etwas mit Nachdruck. Nach einer solchen Aufforderung steht ein Ausrufezeichen.' },

    { id: 'de-satzarten-003', thema: 'satzarten_zeichen', stufe: 1, typ: 'choice',
      frage: 'Welche Satzart ist „Die Ameisen bauen einen Hügel.“?',
      optionen: ['Aussagesatz', 'Fragesatz', 'Aufforderungssatz'],
      loesung: 0,
      erklaerung: 'Der Satz teilt etwas mit. Es ist ein Aussagesatz – er endet mit einem Punkt.' },

    { id: 'de-satzarten-004', thema: 'satzarten_zeichen', stufe: 1, typ: 'choice',
      frage: 'Welche Satzart ist „Hilf mir bitte beim Tragen!“?',
      optionen: ['Aussagesatz', 'Aufforderungssatz', 'Fragesatz'],
      loesung: 1,
      erklaerung: 'Jemand bittet oder fordert dazu auf, etwas zu tun. Das ist ein Aufforderungssatz. Das Verb „Hilf“ steht vorne.' },

    { id: 'de-satzarten-005', thema: 'satzarten_zeichen', stufe: 2, typ: 'choice',
      frage: 'Wo steht das Verb in einer Ja-Nein-Frage wie „Siehst du die Ameise?“',
      optionen: ['an zweiter Stelle', 'am Ende', 'an erster Stelle'],
      loesung: 2,
      erklaerung: 'Bei Fragen, auf die man mit Ja oder Nein antwortet, steht das Verb an erster Stelle. Bei W-Fragen steht zuerst das Fragewort, dann das Verb.' },

    { id: 'de-satzarten-006', thema: 'satzarten_zeichen', stufe: 2, typ: 'choice',
      frage: 'Welcher Satz ist mit Kommas richtig geschrieben?',
      optionen: ['Im Bau gibt es Eier, Larven, Puppen, und Vorräte.', 'Im Bau gibt es Eier, Larven, Puppen und Vorräte.', 'Im Bau gibt es, Eier, Larven, Puppen und Vorräte.', 'Im Bau gibt es Eier Larven Puppen und Vorräte.'],
      loesung: 1,
      erklaerung: 'Bei einer Aufzählung trennt man die Teile durch Kommas. Vor dem letzten „und“ steht kein Komma.' },

    { id: 'de-satzarten-007', thema: 'satzarten_zeichen', stufe: 1, typ: 'truefalse',
      frage: 'Bei einer Aufzählung steht vor „und“ kein Komma.',
      loesung: true,
      erklaerung: 'Das „und“ ersetzt das Komma: Ameisen, Käfer und Spinnen. Das gilt auch für „oder“.' },

    { id: 'de-satzarten-008', thema: 'satzarten_zeichen', stufe: 3, typ: 'choice', bild: '🏨',
      frage: 'Welcher Satz ist richtig geschrieben?',
      optionen: ['Das brauchst du, Holz: Bambus und Schnur.', 'Das: brauchst du Holz, Bambus und Schnur.', 'Das brauchst du: Holz, Bambus und Schnur.'],
      loesung: 2,
      erklaerung: 'Ein Doppelpunkt kann eine Aufzählung ankündigen. Er steht direkt vor der Aufzählung, die Teile werden mit Kommas getrennt.' },

    { id: 'de-satzarten-009', thema: 'satzarten_zeichen', stufe: 1, typ: 'choice',
      frage: 'Welcher Satz ist ein Fragesatz?',
      optionen: ['Der Regen kommt bald.', 'Wann kommt der Regen?', 'Komm schnell rein!'],
      loesung: 1,
      erklaerung: '„Wann kommt der Regen?“ ist eine Frage: Sie beginnt mit einem Fragewort und endet mit einem Fragezeichen.' },

    { id: 'de-satzarten-010', thema: 'satzarten_zeichen', stufe: 3, typ: 'choice',
      frage: 'Wie viele Sätze stecken in diesem Text? „die ameise sucht futter sie findet einen apfel sie ruft ihre freundinnen“',
      optionen: ['1', '2', '3', '4'],
      loesung: 2, nichtMischen: true,
      erklaerung: 'Jeder Satz hat ein eigenes Prädikat: sucht, findet, ruft. Also sind es drei Sätze: Die Ameise sucht Futter. Sie findet einen Apfel. Sie ruft ihre Freundinnen.',
      tipp: 'Lies laut und achte, wo deine Stimme absinkt. Zähle die Verben.' },

    { id: 'de-satzarten-011', thema: 'satzarten_zeichen', stufe: 2, typ: 'choice',
      frage: 'Welche Schreibweise ist richtig?',
      optionen: ['Die Ameise sucht Futter, sie findet, einen Apfel.', 'Die Ameise sucht Futter. Sie findet einen Apfel.', 'die Ameise sucht Futter. sie findet einen Apfel.'],
      loesung: 1,
      erklaerung: 'Am Satzende steht ein Punkt, und der nächste Satz beginnt groß. Zwischen „findet“ und „einen Apfel“ gehört kein Komma.' },

    { id: 'de-satzarten-012', thema: 'satzarten_zeichen', stufe: 1, typ: 'truefalse',
      frage: 'Nach einem Aufforderungssatz steht oft ein Ausrufezeichen.',
      loesung: true,
      erklaerung: 'Aufforderungen wie „Komm her!“ oder „Pass auf!“ enden meistens mit einem Ausrufezeichen.' },

    { id: 'de-satzarten-013', thema: 'satzarten_zeichen', stufe: 2, typ: 'choice', bild: '👑',
      frage: 'Welcher Satz ist eine W-Frage?',
      optionen: ['Wohnt die Ameisenkönigin im Bau?', 'Wo wohnt die Ameisenkönigin?', 'Die Ameisenkönigin wohnt im Bau.'],
      loesung: 1,
      erklaerung: 'W-Fragen beginnen mit einem Fragewort wie wo, wer, was, wann, warum. „Wohnt die …?“ ist eine Ja-Nein-Frage.' },

    { id: 'de-satzarten-014', thema: 'satzarten_zeichen', stufe: 1, typ: 'choice',
      frage: '„Pass auf, da kommt ein Vogel!“ Was will die Sprecherin damit erreichen?',
      optionen: ['Sie will etwas fragen.', 'Sie will warnen.', 'Sie will nur ruhig etwas erzählen.'],
      loesung: 1,
      erklaerung: 'Der Satz ist eine Aufforderung mit Ausrufezeichen. Die Sprecherin will warnen, damit schnell etwas passiert.' },

    // =====================================================================
    // WÖRTLICHE REDE
    // =====================================================================
    { id: 'de-rede-001', thema: 'woertliche_rede', stufe: 1, typ: 'choice',
      frage: 'Welcher Satz ist richtig geschrieben?',
      optionen: ['Mia sagt „Ich sehe eine Ameise.“', 'Mia sagt: „Ich sehe eine Ameise.“', 'Mia sagt: Ich sehe eine Ameise.', 'Mia sagt: „ich sehe eine Ameise.“'],
      loesung: 1,
      erklaerung: 'Steht der Begleitsatz vorne, folgt ein Doppelpunkt. Die wörtliche Rede steht in Anführungszeichen und beginnt groß.' },

    { id: 'de-rede-002', thema: 'woertliche_rede', stufe: 2, typ: 'choice',
      frage: 'Welcher Satz ist richtig geschrieben?',
      optionen: ['„Ich sehe eine Ameise.“ sagt Mia.', '„Ich sehe eine Ameise“ sagt Mia.', '„Ich sehe eine Ameise“, sagt Mia.', '„Ich sehe eine Ameise“, Sagt Mia.'],
      loesung: 2,
      erklaerung: 'Steht der Begleitsatz hinten, fällt der Punkt der wörtlichen Rede weg. Nach den Anführungszeichen kommt ein Komma, und der Begleitsatz beginnt klein.' },

    { id: 'de-rede-003', thema: 'woertliche_rede', stufe: 2, typ: 'choice',
      frage: 'Welcher Satz ist richtig geschrieben?',
      optionen: ['„Wo ist der Bau“, fragt Tom?', '„Wo ist der Bau?“, fragt Tom.', '„Wo ist der Bau?“ Fragt Tom.', '„Wo ist der Bau.“, fragt Tom.'],
      loesung: 1,
      erklaerung: 'Das Fragezeichen gehört zur wörtlichen Rede und bleibt in den Anführungszeichen. Danach folgen ein Komma und der kleingeschriebene Begleitsatz.' },

    { id: 'de-rede-004', thema: 'woertliche_rede', stufe: 1, typ: 'choice',
      frage: 'Was ist der Begleitsatz? Opa ruft: „Kommt zum Essen!“',
      optionen: ['Kommt zum Essen!', 'Opa ruft:', 'Essen'],
      loesung: 1,
      erklaerung: 'Der Begleitsatz sagt, wer spricht und wie: „Opa ruft“. Was Opa genau sagt, ist die wörtliche Rede.' },

    { id: 'de-rede-005', thema: 'woertliche_rede', stufe: 1, typ: 'truefalse',
      frage: 'Die wörtliche Rede steht in Anführungszeichen.',
      loesung: true,
      erklaerung: 'Anführungszeichen zeigen genau, was jemand sagt. Im Deutschen steht das erste unten („) und das zweite oben (“).' },

    { id: 'de-rede-006', thema: 'woertliche_rede', stufe: 1, typ: 'truefalse',
      frage: 'Steht der Begleitsatz vor der wörtlichen Rede, setzt man danach einen Doppelpunkt.',
      loesung: true,
      erklaerung: 'Beispiel: Lea flüstert: „Da ist ein Reh.“ Der Doppelpunkt kündigt die wörtliche Rede an.' },

    { id: 'de-rede-007', thema: 'woertliche_rede', stufe: 3, typ: 'truefalse',
      frage: 'Steht der Begleitsatz hinten, setzt man am Ende einer Aussage in der wörtlichen Rede einen Punkt: „Ich bin müde.“ sagt Ben.',
      loesung: false,
      erklaerung: 'Der Punkt fällt weg, dafür kommt nach den Anführungszeichen ein Komma: „Ich bin müde“, sagt Ben.' },

    { id: 'de-rede-008', thema: 'woertliche_rede', stufe: 2, typ: 'choice', bild: '🦌',
      frage: 'Welches Satzzeichen fehlt? Lea flüstert_ „Da ist ein Reh.“',
      optionen: [',', ':', '.', '!'],
      loesung: 1,
      erklaerung: 'Der Begleitsatz „Lea flüstert“ steht vorne. Darum folgt ein Doppelpunkt.' },

    { id: 'de-rede-009', thema: 'woertliche_rede', stufe: 3, typ: 'choice',
      frage: 'Welches Satzzeichen fehlt? „Pass auf!“_ ruft Ben.',
      optionen: ['.', ':', ',', 'kein Satzzeichen'],
      loesung: 2,
      erklaerung: 'Nach der wörtlichen Rede kommt vor dem nachgestellten Begleitsatz ein Komma – auch nach einem Ausrufezeichen oder Fragezeichen: „Pass auf!“, ruft Ben.' },

    { id: 'de-rede-010', thema: 'woertliche_rede', stufe: 1, typ: 'choice',
      frage: 'Welches Verb passt statt „sagen“, wenn jemand ganz leise spricht?',
      optionen: ['brüllen', 'flüstern', 'rufen', 'fragen'],
      loesung: 1,
      erklaerung: '„flüstern“ heißt ganz leise sprechen. Verschiedene Verben aus dem Wortfeld „sagen“ machen deine Geschichten lebendiger.' },

    { id: 'de-rede-011', thema: 'woertliche_rede', stufe: 3, typ: 'order', bild: '🦔',
      frage: 'Bringe die Teile in die richtige Reihenfolge!',
      teile: ['Der Igel', 'brummt:', '„Ich', 'habe', 'Hunger.“'],
      erklaerung: 'Erst kommt der Begleitsatz mit Doppelpunkt, dann die wörtliche Rede in Anführungszeichen. Sie beginnt groß.' },

    { id: 'de-rede-012', thema: 'woertliche_rede', stufe: 1, typ: 'choice',
      frage: 'Was ist hier die wörtliche Rede? „Heute bauen wir ein Insektenhotel“, erklärt Frau Klein.',
      optionen: ['erklärt Frau Klein', 'Heute bauen wir ein Insektenhotel', 'Frau Klein'],
      loesung: 1,
      erklaerung: 'Die wörtliche Rede steht in den Anführungszeichen – das sind die Worte, die Frau Klein sagt. „erklärt Frau Klein“ ist der Begleitsatz.' },

    // =====================================================================
    // RECHTSCHREIB-WERKZEUGE (Strategien)
    // =====================================================================
    { id: 'de-strategie-001', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice', bild: '🐕',
      frage: '„Hund“ oder „Hunt“? Welches Werkzeug hilft dir?',
      optionen: ['Ableiten: von „Haus“', 'Verlängern: die Hunde', 'Merken: immer mit t', 'Großschreiben'],
      loesung: 1,
      erklaerung: 'Am Wortende klingen d und t gleich. Verlängere das Wort: die Hun-de. Jetzt hörst du deutlich ein d.',
      tipp: 'Bilde die Mehrzahl.' },

    { id: 'de-strategie-002', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['der Zwerk', 'der Zwerch', 'der Zwerg'],
      loesung: 2,
      erklaerung: 'Verlängere: die Zwer-ge. In der Mehrzahl hörst du das g deutlich.' },

    { id: 'de-strategie-003', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'choice', bild: '🌳',
      frage: '„Bäume“ mit äu oder eu? Welches Werkzeug hilft dir?',
      optionen: ['Ableiten: der Baum', 'Verlängern: die Bäumer', 'Silben schwingen', 'Es ist ein Merkwort.'],
      loesung: 0,
      erklaerung: 'Suche ein verwandtes Wort mit au: der Baum. Kommt ein Wort von au, schreibst du äu.' },

    { id: 'de-strategie-004', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice',
      frage: 'Welches Wort schreibt man mit ä, weil es von einem Wort mit a kommt?',
      optionen: ['Äste', 'Ente', 'Messer', 'Feld'],
      loesung: 0,
      erklaerung: '„Äste“ kommt von „der Ast“ – darum ä. Zu Ente, Messer und Feld gibt es kein verwandtes Wort mit a.' },

    { id: 'de-strategie-005', thema: 'rechtschreibung_strategien', stufe: 3, typ: 'choice', bild: '🪲',
      frage: 'Welches Wort ist ein Merkwort mit ä? (Es gibt kein verwandtes Wort mit a.)',
      optionen: ['Kälte', 'Käfer', 'Bäcker', 'Gläser'],
      loesung: 1,
      erklaerung: 'Kälte kommt von kalt, Bäcker von backen, Gläser von Glas. Für „Käfer“ gibt es kein Wort mit a – das musst du dir merken.',
      tipp: 'Suche zu jedem Wort ein verwandtes Wort mit a.' },

    { id: 'de-strategie-006', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice', bild: '☀️',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['die Sone', 'die Sonne', 'die Sohne'],
      loesung: 1,
      erklaerung: 'Das o in „Sonne“ ist kurz. Schwinge die Silben: Son-ne. Nach einem kurzen Selbstlaut folgen oft zwei gleiche Mitlaute.' },

    { id: 'de-strategie-007', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'choice',
      frage: 'Warum schreibt man „Mutter“ mit tt?',
      optionen: ['Weil das u lang gesprochen wird.', 'Weil das Wort ein Nomen ist.', 'Weil am Ende -er steht.', 'Weil das u kurz gesprochen wird.'],
      loesung: 3,
      erklaerung: 'Nach einem kurz gesprochenen Selbstlaut wird der Mitlaut verdoppelt: Mut-ter, Wet-ter, Ham-mer.',
      tipp: 'Sprich das Wort deutlich in Silben.' },

    { id: 'de-strategie-008', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice', bild: '🐱',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['die Kaze', 'die Kazze', 'die Katze'],
      loesung: 2,
      erklaerung: 'Nach einem kurzen Selbstlaut schreibt man tz statt zz: Katze, Mütze, sitzen.' },

    { id: 'de-strategie-009', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['der Zucker', 'der Zuker', 'der Zukker'],
      loesung: 0,
      erklaerung: 'Nach einem kurzen Selbstlaut schreibt man ck statt kk: Zucker, Hecke, backen.' },

    { id: 'de-strategie-010', thema: 'rechtschreibung_strategien', stufe: 3, typ: 'choice', bild: '☁️',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['die Wolcke', 'die Wolke', 'die Wollke'],
      loesung: 1,
      erklaerung: 'Nach l, n und r steht nie ck oder tz: Wolke, Bank, Herz. Nach dem l folgt schon ein zweiter Mitlaut, darum wird nichts verdoppelt.',
      tipp: 'Merkspruch: Nach l, n, r – das merke ja – steht nie tz und nie ck.' },

    { id: 'de-strategie-011', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'truefalse',
      frage: 'Nach l, n und r steht nie ck oder tz.',
      loesung: true,
      erklaerung: 'Deshalb schreibt man Wolke, Bank, stark, Pilz und Herz – ohne ck und ohne tz.' },

    { id: 'de-strategie-012', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice', bild: '🐝',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['die Bine', 'die Bihne', 'die Biene'],
      loesung: 2,
      erklaerung: 'Ein lang gesprochenes i schreibt man meistens ie: Biene, Wiese, Tier.' },

    { id: 'de-strategie-013', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'choice', bild: '🦔',
      frage: 'Welches Wort mit langem i schreibt man nur mit i? (Merkwort)',
      optionen: ['der Spiegel', 'der Igel', 'die Wiese', 'das Tier'],
      loesung: 1,
      erklaerung: '„Igel“ hat ein langes i, wird aber ohne e geschrieben. Solche Ausnahmen sind Merkwörter – genauso wie Tiger und Biber.' },

    { id: 'de-strategie-014', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'choice', bild: '⏰',
      frage: 'Welches Wort hat ein stummes h (Dehnungs-h)?',
      optionen: ['der Hut', 'das Haus', 'die Uhr', 'der Hals'],
      loesung: 2,
      erklaerung: 'In „Uhr“ hört man das h nicht. Es zeigt nur, dass das u lang ist. Solche Wörter sind Merkwörter. Oft steht das stumme h vor l, m, n oder r.' },

    { id: 'de-strategie-015', thema: 'rechtschreibung_strategien', stufe: 3, typ: 'choice', bild: '👀',
      frage: 'Warum schreibt man „er sieht“ mit h?',
      optionen: ['Weil alle Verben ein h haben.', 'Weil es ein Nomen ist.', 'Weil man es in der Grundform se-hen hören kann.', 'Weil das Wort kurz ist.'],
      loesung: 2,
      erklaerung: 'Bilde die Grundform und schwinge die Silben: se-hen. Beim deutlichen Sprechen hörst du das h am Anfang der zweiten Silbe. Das h bleibt in allen Formen: er sieht.' },

    { id: 'de-strategie-016', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'choice',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['das Mos', 'das Moss', 'das Moos'],
      loesung: 2,
      erklaerung: '„Moos“ schreibt man mit Doppel-o. Wörter mit aa, ee oder oo sind Merkwörter: Moos, Boot, Meer, Haar.' },

    { id: 'de-strategie-017', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice', bild: '🍂',
      frage: '„gelb“ oder „gelp“? Wie findest du es heraus?',
      optionen: ['Ableiten: von „Gold“', 'Verlängern: gelbe Blätter', 'Das Wort kleinschreiben', 'Silben zählen'],
      loesung: 1,
      erklaerung: 'Auch Adjektive kannst du verlängern: gel-be Blätter. Jetzt hörst du das b.' },

    { id: 'de-strategie-018', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'choice', bild: '👑',
      frage: '„König“ mit g oder k am Ende? Wie prüfst du es?',
      optionen: ['Ableiten: von „können“', 'Verlängern: die Könige', 'Es ist ein Merkwort mit k.', 'Man hört es am Ende genau.'],
      loesung: 1,
      erklaerung: 'Viele sprechen das Ende wie „-ik“ aus. Verlängere: die Kö-ni-ge – jetzt hörst du das g. Das gilt auch für mutig (mutige) und billig (billige).' },

    { id: 'de-strategie-019', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'truefalse', bild: '🌲',
      frage: 'Bei „Wald“ hört man am Ende ein t. Trotzdem schreibt man d, weil man es in „Wälder“ hört.',
      loesung: true,
      erklaerung: 'Am Wortende klingen d und t gleich. Mit dem Verlängern (Wäl-der) findest du den richtigen Buchstaben.' },

    { id: 'de-strategie-020', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'choice',
      frage: 'In welchem Wort steckt ein Fehler?',
      optionen: ['Wald', 'Korb', 'Berk', 'Zwerg'],
      loesung: 2,
      erklaerung: 'Richtig ist „Berg“. Verlängere: die Ber-ge. Bei Wald (Wälder), Korb (Körbe) und Zwerg (Zwerge) stimmt alles.' },

    { id: 'de-strategie-021', thema: 'rechtschreibung_strategien', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist richtig geschrieben? „Die Ameise ___ schnell.“',
      optionen: ['leuft', 'läuft', 'läuvt'],
      loesung: 1,
      erklaerung: '„läuft“ kommt von „laufen“. Weil die Grundform au hat, schreibt man äu.' },

    { id: 'de-strategie-022', thema: 'rechtschreibung_strategien', stufe: 2, typ: 'input', eingabe: 'text', bild: '🧺',
      frage: 'Verlängere „Korb“: Schreibe die Mehrzahl (ohne Artikel).',
      loesung: 'Körbe', alternativen: ['die Körbe'],
      erklaerung: 'In „Kör-be“ hörst du das b deutlich. Darum schreibt man auch „Korb“ mit b.' },

    { id: 'de-strategie-023', thema: 'rechtschreibung_strategien', stufe: 3, typ: 'choice', bild: '🚲',
      frage: 'Warum schreibt man „Fahrrad“ am Ende mit d?',
      optionen: ['Ableiten: von „fahren“', 'Verlängern: die Fahrräder', 'Merkwort: immer mit d', 'Weil es ein langes Wort ist.'],
      loesung: 1,
      erklaerung: 'Bei zusammengesetzten Wörtern verlängerst du das letzte Wort: Rad – Rä-der, also Fahrräder. „fahren“ erklärt nur das h, nicht das d.' },

    // =====================================================================
    // s, ss oder ß
    // =====================================================================
    { id: 'de-ss-001', thema: 'ss_s_sz', stufe: 1, typ: 'choice', bild: '🏞️',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['der Fluß', 'der Fluss', 'der Flus'],
      loesung: 1,
      erklaerung: 'Das u in „Fluss“ ist kurz. Nach einem kurzen Selbstlaut schreibt man ss. Das hörst du auch in der Mehrzahl: Flüs-se.' },

    { id: 'de-ss-002', thema: 'ss_s_sz', stufe: 1, typ: 'choice', bild: '🛣️',
      frage: 'Welches Wort ist richtig geschrieben?',
      optionen: ['die Strasse', 'die Strase', 'die Straße'],
      loesung: 2,
      erklaerung: 'Das a in „Straße“ ist lang, und das s klingt scharf (zischend). Nach einem langen Selbstlaut schreibt man dann ß.' },

    { id: 'de-ss-003', thema: 'ss_s_sz', stufe: 2, typ: 'choice', bild: '🦶',
      frage: '„Fuß“ oder „Fus“? Wie prüfst du es?',
      optionen: ['Ableiten: von „Fass“', 'Verlängern: die Füße – das s zischt nach langem ü.', 'Weil es ein Nomen ist, schreibt man ß.', 'Am Wortende schreibt man immer ß.'],
      loesung: 1,
      erklaerung: 'Verlängere: die Fü-ße. Das ü ist lang und das s zischt scharf wie eine Schlange. Darum ß.' },

    { id: 'de-ss-004', thema: 'ss_s_sz', stufe: 2, typ: 'choice', bild: '🌱',
      frage: '„Gras“ oder „Graß“? Welche Probe hilft?',
      optionen: ['Weil das a lang ist, schreibt man immer ß.', 'Nomen schreibt man immer mit s.', 'Verlängern: die Gräser – das s summt weich, also s.', 'Nach r steht immer ß.'],
      loesung: 2,
      erklaerung: 'In „Grä-ser“ klingt das s weich und summend wie eine Biene. Dann schreibt man s. Hörst du den Unterschied schwer, merke dir das Wort.',
      tipp: 'Summt das s (Biene) oder zischt es (Schlange)?' },

    { id: 'de-ss-005', thema: 'ss_s_sz', stufe: 1, typ: 'choice', bild: '🌧️',
      frage: 'Welches Wort ist richtig geschrieben? „Das Gras ist ___.“',
      optionen: ['naß', 'nas', 'nass'],
      loesung: 2,
      erklaerung: 'Das a in „nass“ ist kurz. Nach einem kurzen Selbstlaut schreibt man ss. Verlängern hilft: nas-se Füße.' },

    { id: 'de-ss-006', thema: 'ss_s_sz', stufe: 2, typ: 'choice',
      frage: 'Welche Form ist richtig? „Ich ___ es nicht.“ (wissen)',
      optionen: ['weis', 'weiß', 'weiss'],
      loesung: 1,
      erklaerung: 'Nach dem Doppellaut ei klingt das s scharf. Dann schreibt man ß: ich weiß. Nach au, ei und eu steht nie ss.' },

    { id: 'de-ss-007', thema: 'ss_s_sz', stufe: 1, typ: 'choice',
      frage: 'Welche Form ist richtig? „Wir ___ den Weg.“ (wissen)',
      optionen: ['wißen', 'wissen', 'wisen'],
      loesung: 1,
      erklaerung: 'In „wis-sen“ ist das i kurz. Nach einem kurzen Selbstlaut schreibt man ss. Bei „ich weiß“ steht dagegen ein Doppellaut, deshalb ß.' },

    { id: 'de-ss-008', thema: 'ss_s_sz', stufe: 3, typ: 'choice',
      frage: '„fließen“ und „Fluss“ gehören zu einer Wortfamilie. Warum schreibt man „Fluss“ mit ss, aber „fließen“ mit ß?',
      optionen: ['Fluss ist ein Nomen, fließen ein Verb.', 'In „Fluss“ ist das u kurz, in „fließen“ ist das ie lang.', 'Weil Flüsse groß sind.', 'Das ist reiner Zufall.'],
      loesung: 1,
      erklaerung: 'Es kommt auf den Selbstlaut davor an: kurz → ss (Fluss), lang → ß (fließen). Deshalb wechselt die Schreibung in einer Wortfamilie.' },

    { id: 'de-ss-009', thema: 'ss_s_sz', stufe: 3, typ: 'truefalse',
      frage: 'Nach den Doppellauten au, ei und eu steht nie ss.',
      loesung: true,
      erklaerung: 'Doppellaute zählen wie lange Laute. Danach steht ß (heiß, draußen) oder s (Maus, Preis) – aber nie ss.' },

    { id: 'de-ss-010', thema: 'ss_s_sz', stufe: 1, typ: 'truefalse', bild: '💧',
      frage: 'Nach einem kurz gesprochenen Selbstlaut schreibt man ss, zum Beispiel in „Wasser“.',
      loesung: true,
      erklaerung: 'Das a in „Was-ser“ ist kurz. Darum schreibt man ss – genau wie in Tasse, essen und Nuss.' },

    { id: 'de-ss-011', thema: 'ss_s_sz', stufe: 2, typ: 'choice', bild: '🌰',
      frage: 'Welches Wort ist falsch geschrieben?',
      optionen: ['der Gruß', 'groß', 'süß', 'die Nuß'],
      loesung: 3,
      erklaerung: 'Richtig ist „Nuss“: Das u ist kurz, also ss (Nüs-se). In Gruß, groß und süß ist der Selbstlaut lang, darum ß.' },

    { id: 'de-ss-012', thema: 'ss_s_sz', stufe: 2, typ: 'choice', bild: '🐜',
      frage: 'Was fehlt? „Die Ameise bei_t in das Blatt.“',
      optionen: ['s', 'ss', 'ß'],
      loesung: 2,
      erklaerung: 'Bilde die Grundform: bei-ßen. Nach dem Doppellaut ei klingt das s scharf, also ß.' },

    { id: 'de-ss-013', thema: 'ss_s_sz', stufe: 3, typ: 'choice', bild: '🏰',
      frage: '„schließen – schloss – das Schloss“: Was zeigt diese Wortfamilie?',
      optionen: ['Alle Formen schreibt man mit ß.', 'Nach langem ie steht ß, nach kurzem o steht ss.', 'Alle Formen schreibt man mit ss.'],
      loesung: 1,
      erklaerung: 'In „schließen“ ist das ie lang → ß. In „schloss“ und „Schloss“ ist das o kurz → ss.' },

    // =====================================================================
    // das oder dass
    // =====================================================================
    { id: 'de-dass-001', thema: 'das_dass', stufe: 1, typ: 'truefalse',
      frage: 'Wenn du „das“ durch „dieses“ oder „welches“ ersetzen kannst, schreibst du es mit einem s.',
      loesung: true,
      erklaerung: 'Das ist die Ersatzprobe: „Das (dieses) Blatt ist grün.“ Passt „dieses“ oder „welches“, schreibst du „das“.' },

    { id: 'de-dass-002', thema: 'das_dass', stufe: 2, typ: 'choice', bild: '🌧️',
      frage: 'Welches Wort fehlt? „Ich hoffe, ___ es morgen nicht regnet.“',
      optionen: ['das', 'dass'],
      loesung: 1,
      erklaerung: '„dieses“ oder „welches“ passen hier nicht. Also schreibst du „dass“. Es leitet einen Nebensatz ein, oft nach hoffen, wissen, sagen oder glauben.' },

    { id: 'de-dass-003', thema: 'das_dass', stufe: 1, typ: 'choice', bild: '🍃',
      frage: 'Welches Wort fehlt? „___ Blatt ist grün.“',
      optionen: ['Dass', 'Das'],
      loesung: 1,
      erklaerung: 'Ersatzprobe: „Dieses Blatt ist grün.“ Das passt! Hier ist „das“ ein Artikel vor dem Nomen „Blatt“.' },

    { id: 'de-dass-004', thema: 'das_dass', stufe: 3, typ: 'choice', bild: '🍁',
      frage: 'Welches Wort fehlt? „Das Blatt, ___ im Wind flattert, ist rot.“',
      optionen: ['dass', 'das'],
      loesung: 1,
      erklaerung: 'Ersatzprobe: „Das Blatt, welches im Wind flattert …“ – das passt. Darum schreibst du „das“, obwohl ein Komma davor steht.' },

    { id: 'de-dass-005', thema: 'das_dass', stufe: 2, typ: 'choice', bild: '💪',
      frage: 'Welches Wort fehlt? „Weißt du, ___ Ameisen sehr stark sind?“',
      optionen: ['dass', 'das'],
      loesung: 0,
      erklaerung: '„Weißt du, dieses/welches Ameisen …“ ergibt keinen Sinn. Also schreibst du „dass“.' },

    { id: 'de-dass-006', thema: 'das_dass', stufe: 2, typ: 'choice',
      frage: 'Wie prüfst du, ob du „das“ oder „dass“ schreibst?',
      optionen: ['Nach einem Komma steht immer „dass“.', 'Ich schaue, ob das Wort am Satzanfang steht.', 'Ich ersetze es durch „dieses“ oder „welches“. Passt das, schreibe ich „das“.', '„dass“ schreibt man, wenn man es laut spricht.'],
      loesung: 2,
      erklaerung: 'Die Ersatzprobe ist das sicherste Werkzeug: Passt „dieses“ oder „welches“, schreibst du „das“. Sonst schreibst du „dass“.' },

    { id: 'de-dass-007', thema: 'das_dass', stufe: 2, typ: 'truefalse',
      frage: 'Nach einem Komma steht immer „dass“.',
      loesung: false,
      erklaerung: 'Auch nach einem Komma kann „das“ stehen: „Das Nest, das im Baum hängt, ist leer.“ Mach immer die Ersatzprobe mit „welches“.' },

    { id: 'de-dass-008', thema: 'das_dass', stufe: 2, typ: 'choice',
      frage: 'In welchem Satz ist „dass“ richtig?',
      optionen: ['Dass Nest ist leer.', 'Mama sagt, dass wir leise sein sollen.', 'Ich sehe dass Nest.'],
      loesung: 1,
      erklaerung: 'Nach „Mama sagt“ folgt ein Nebensatz mit „dass“. Vor dem Nomen „Nest“ steht dagegen der Artikel „das“.' },

    { id: 'de-dass-009', thema: 'das_dass', stufe: 3, typ: 'choice',
      frage: 'Welcher Satz ist richtig?',
      optionen: ['Ich glaube, das dass Nest leer ist.', 'Ich glaube, dass das Nest leer ist.', 'Ich glaube, dass dass Nest leer ist.', 'Ich glaube, das das Nest leer ist.'],
      loesung: 1,
      erklaerung: 'Nach „Ich glaube“ folgt „dass“. Vor „Nest“ steht der Artikel „das“ – Probe: dieses Nest.' },

    // =====================================================================
    // GROSS ODER KLEIN
    // =====================================================================
    { id: 'de-gross-001', thema: 'gross_klein', stufe: 1, typ: 'choice',
      frage: 'Welches Wort musst du großschreiben?',
      optionen: ['krabbeln', 'schnell', 'ameise', 'unter'],
      loesung: 2,
      erklaerung: '„Ameise“ ist ein Nomen: die Ameise. Nomen schreibt man groß.',
      tipp: 'Mach die Artikelprobe.' },

    { id: 'de-gross-002', thema: 'gross_klein', stufe: 1, typ: 'truefalse',
      frage: 'Das erste Wort eines Satzes schreibt man groß.',
      loesung: true,
      erklaerung: 'Jeder Satz beginnt mit einem großen Buchstaben – egal, welche Wortart das erste Wort hat.' },

    { id: 'de-gross-003', thema: 'gross_klein', stufe: 2, typ: 'choice',
      frage: 'Welches Wort musst du großschreiben?',
      optionen: ['freundlich', 'befreundet', 'freundlicher', 'freundschaft'],
      loesung: 3,
      erklaerung: 'Wörter mit dem Nachbaustein -schaft sind Nomen: die Freundschaft. Darum schreibt man sie groß.' },

    { id: 'de-gross-004', thema: 'gross_klein', stufe: 2, typ: 'choice',
      frage: 'Welche Nachbausteine zeigen dir, dass ein Wort ein Nomen ist?',
      optionen: ['-ig, -lich, -isch', '-ung, -heit, -keit', '-en, -st, -t'],
      loesung: 1,
      erklaerung: 'Wörter mit -ung, -heit, -keit, -nis und -schaft sind Nomen und werden großgeschrieben: die Hoffnung, die Freiheit, die Fröhlichkeit.' },

    { id: 'de-gross-005', thema: 'gross_klein', stufe: 2, typ: 'choice',
      frage: 'Welches Wort schreibt man klein?',
      optionen: ['ehrlichkeit', 'ehrlich', 'ehre', 'ehrung'],
      loesung: 1,
      erklaerung: '„ehrlich“ ist ein Adjektiv mit dem Nachbaustein -lich. Adjektive schreibt man klein. Die anderen sind Nomen: die Ehrlichkeit, die Ehre, die Ehrung.' },

    { id: 'de-gross-006', thema: 'gross_klein', stufe: 1, typ: 'choice', bild: '⛈️',
      frage: 'Welcher Satz ist richtig geschrieben?',
      optionen: ['Die Ameisen haben große angst vor dem Regen.', 'Die Ameisen haben Große Angst vor dem Regen.', 'Die Ameisen haben große Angst vor dem Regen.'],
      loesung: 2,
      erklaerung: '„Angst“ ist ein Nomen (die Angst) und wird großgeschrieben. „große“ ist ein Adjektiv und wird kleingeschrieben.' },

    { id: 'de-gross-007', thema: 'gross_klein', stufe: 3, typ: 'choice',
      frage: 'Welcher Satz ist richtig geschrieben?',
      optionen: ['Beim graben findet die Ameise einen Kern.', 'Beim Graben findet die Ameise einen Kern.', 'Beim Graben findet die ameise einen Kern.'],
      loesung: 1,
      erklaerung: 'In „beim“ steckt der Artikel „dem“ (bei dem Graben). Darum wird „Graben“ hier wie ein Nomen großgeschrieben.' },

    { id: 'de-gross-008', thema: 'gross_klein', stufe: 3, typ: 'choice', bild: '📚',
      frage: 'Welcher Satz ist richtig geschrieben?',
      optionen: ['Das lesen macht mir Spaß.', 'Das Lesen macht mir spaß.', 'Das Lesen macht mir Spaß.'],
      loesung: 2,
      erklaerung: 'Vor „Lesen“ steht der Artikel „das“ – so wird das Verb zum Nomen und großgeschrieben. Auch „Spaß“ ist ein Nomen.' },

    { id: 'de-gross-009', thema: 'gross_klein', stufe: 1, typ: 'choice',
      frage: 'Welches Wort ist ein Name und wird deshalb großgeschrieben?',
      optionen: ['schön', 'stuttgart', 'schnell', 'schwimmen'],
      loesung: 1,
      erklaerung: 'Namen von Orten, Flüssen und Menschen schreibt man groß: Stuttgart, Rhein, Baden-Württemberg.' },

    { id: 'de-gross-010', thema: 'gross_klein', stufe: 2, typ: 'truefalse',
      frage: 'Gefühle wie „Freude“ und „Wut“ schreibt man klein, weil man sie nicht anfassen kann.',
      loesung: false,
      erklaerung: 'Freude und Wut sind Nomen: die Freude, die Wut. Die Artikelprobe zeigt es – darum schreibt man sie groß.' },

    { id: 'de-gross-011', thema: 'gross_klein', stufe: 3, typ: 'choice', bild: '💎',
      frage: '„Sie hat etwas Schönes gefunden.“ Woran erkennst du, dass „Schönes“ großgeschrieben wird?',
      optionen: ['An dem Wort „hat“ davor.', 'Weil es ein Adjektiv ist.', 'An dem Wort „etwas“ davor.', 'Weil es am Satzende steht.'],
      loesung: 2,
      erklaerung: 'Nach Wörtern wie „etwas“, „nichts“ oder „viel“ wird ein Adjektiv zum Nomen: etwas Schönes, nichts Neues.' },

    { id: 'de-gross-012', thema: 'gross_klein', stufe: 2, typ: 'choice',
      frage: 'Wie viele Wörter musst du großschreiben? „im sommer sammeln die ameisen viele samen.“',
      optionen: ['2', '3', '4', '5'],
      loesung: 2, nichtMischen: true,
      erklaerung: 'Groß schreibt man: Im (Satzanfang), Sommer, Ameisen und Samen (Nomen). Das sind vier Wörter.' },

    { id: 'de-gross-013', thema: 'gross_klein', stufe: 1, typ: 'choice', bild: '🌙',
      frage: 'Welcher Satz ist richtig geschrieben?',
      optionen: ['Am abend kriechen die Ameisen in den Bau.', 'am Abend kriechen die Ameisen in den Bau.', 'Am Abend kriechen die Ameisen in den Bau.'],
      loesung: 2,
      erklaerung: '„Am“ steht am Satzanfang. In „am“ steckt „an dem“, deshalb ist „Abend“ ein Nomen und wird großgeschrieben.' },

    { id: 'de-gross-014', thema: 'gross_klein', stufe: 1, typ: 'choice',
      frage: 'Mit welcher Probe findest du heraus, ob ein Wort ein Nomen ist?',
      optionen: ['Ableiten: ein verwandtes Wort mit a suchen', 'Artikelprobe: der, die oder das davorsetzen', 'Silben schwingen', 'Steigern: groß – größer'],
      loesung: 1,
      erklaerung: 'Passt ein Artikel davor, ist es ein Nomen: die Ameise, der Mut. Das Steigern zeigt dir dagegen Adjektive.' },

    // =====================================================================
    // WORTFAMILIEN & WORTFELDER
    // =====================================================================
    { id: 'de-wortfamilie-001', thema: 'wortfamilien_wortfelder', stufe: 1, typ: 'choice', bild: '🚲',
      frage: 'Welches Wort gehört zur Wortfamilie „fahren“?',
      optionen: ['Farbe', 'Fahrrad', 'Feder', 'fallen'],
      loesung: 1,
      erklaerung: 'In „Fahrrad“ steckt der Wortstamm „fahr“. Farbe, Feder und fallen klingen nur ähnlich – sie haben einen anderen Stamm.' },

    { id: 'de-wortfamilie-002', thema: 'wortfamilien_wortfelder', stufe: 2, typ: 'choice',
      frage: 'Welches Wort gehört nicht zur Wortfamilie „spielen“?',
      optionen: ['Spieler', 'spitz', 'Spielplatz', 'verspielt'],
      loesung: 1,
      erklaerung: 'In Spieler, Spielplatz und verspielt steckt der Stamm „spiel“. „spitz“ beginnt nur ähnlich.' },

    { id: 'de-wortfamilie-003', thema: 'wortfamilien_wortfelder', stufe: 2, typ: 'choice',
      frage: 'Was haben die Wörter einer Wortfamilie gemeinsam?',
      optionen: ['denselben Anfangsbuchstaben', 'dieselbe Wortart', 'denselben Wortstamm', 'ähnliche Bedeutung, aber verschiedene Stämme'],
      loesung: 2,
      erklaerung: 'Wörter einer Wortfamilie haben denselben Wortstamm: lesen, Leser, Lesebuch, vorlesen. Sie können verschiedene Wortarten sein.' },

    { id: 'de-wortfamilie-004', thema: 'wortfamilien_wortfelder', stufe: 2, typ: 'choice',
      frage: 'Was ist ein Wortfeld?',
      optionen: ['Wörter mit demselben Wortstamm, z. B. gehen, Gang, vergehen', 'Wörter mit ähnlicher Bedeutung, z. B. gehen, schleichen, rennen', 'Wörter, die sich reimen', 'Wörter mit demselben Anfangsbuchstaben'],
      loesung: 1,
      erklaerung: 'Ein Wortfeld sammelt Wörter mit ähnlicher Bedeutung, zum Beispiel alle Arten, sich fortzubewegen. Wörter mit gleichem Stamm bilden dagegen eine Wortfamilie.' },

    { id: 'de-wortfamilie-005', thema: 'wortfamilien_wortfelder', stufe: 1, typ: 'choice',
      frage: 'Welches Wort gehört zum Wortfeld „sagen“?',
      optionen: ['schreiben', 'hören', 'flüstern', 'lesen'],
      loesung: 2,
      erklaerung: '„flüstern“ ist eine Art zu sprechen – genau wie rufen, murmeln oder brüllen.' },

    { id: 'de-wortfamilie-006', thema: 'wortfamilien_wortfelder', stufe: 3, typ: 'choice',
      frage: 'Welches Wort passt nicht ins Wortfeld „gehen“?',
      optionen: ['schleichen', 'Gehweg', 'rennen', 'humpeln'],
      loesung: 1,
      erklaerung: '„Gehweg“ hat zwar denselben Stamm wie „gehen“ (Wortfamilie), beschreibt aber keine Art, sich zu bewegen. Schleichen, rennen und humpeln sind Arten zu gehen.',
      tipp: 'Wortfeld = ähnliche Bedeutung, nicht gleicher Stamm.' },

    { id: 'de-wortfamilie-007', thema: 'wortfamilien_wortfelder', stufe: 2, typ: 'choice',
      frage: 'Wie heißt der gemeinsame Wortstamm von „Fahrer, fahren, Fahrt“?',
      optionen: ['fah', 'fahr', 'fahre', 'ahr'],
      loesung: 1,
      erklaerung: 'Der Wortstamm ist der Teil, der in allen Wörtern gleich bleibt: fahr-er, fahr-en, Fahr-t.' },

    { id: 'de-wortfamilie-008', thema: 'wortfamilien_wortfelder', stufe: 3, typ: 'choice',
      frage: 'Welche Wörter gehören zu einer Wortfamilie?',
      optionen: ['Fluss, Bach, Strom', 'Fluss, fließen, flüssig', 'Flasche, Flagge, Fliege', 'fließen, laufen, rinnen'],
      loesung: 1,
      erklaerung: 'Fluss, fließen und flüssig haben denselben Stamm, auch wenn sich der Selbstlaut verändert. Fluss, Bach und Strom bilden dagegen ein Wortfeld.' },

    { id: 'de-wortfamilie-009', thema: 'wortfamilien_wortfelder', stufe: 1, typ: 'choice', bild: '🐜',
      frage: 'Welches Wort ist der Oberbegriff für Ameise, Biene und Käfer?',
      optionen: ['Vögel', 'Insekten', 'Pflanzen', 'Fische'],
      loesung: 1,
      erklaerung: 'Ameise, Biene und Käfer sind Insekten. Ein Oberbegriff fasst mehrere Wörter zusammen.' },

    { id: 'de-wortfamilie-010', thema: 'wortfamilien_wortfelder', stufe: 2, typ: 'choice', bild: '🕷️',
      frage: 'Welches Wort passt nicht zum Oberbegriff „Insekten“?',
      optionen: ['Ameise', 'Biene', 'Spinne', 'Marienkäfer'],
      loesung: 2,
      erklaerung: 'Spinnen haben acht Beine und gehören zu den Spinnentieren. Insekten haben sechs Beine.' },

    { id: 'de-wortfamilie-011', thema: 'wortfamilien_wortfelder', stufe: 1, typ: 'choice', bild: '🐭',
      frage: 'Teekesselchen: Welches Wort bedeutet ein Tier und ein Gerät am Computer?',
      optionen: ['Hund', 'Maus', 'Tastatur', 'Igel'],
      loesung: 1,
      erklaerung: 'Die „Maus“ ist ein kleines Tier – und auch das Gerät, mit dem man am Computer klickt. Solche Wörter mit zwei Bedeutungen heißen Teekesselchen.' },

    { id: 'de-wortfamilie-012', thema: 'wortfamilien_wortfelder', stufe: 2, typ: 'choice', bild: '🏰',
      frage: '„Das Schloss ist alt.“ Warum weißt du nicht sicher, was gemeint ist?',
      optionen: ['„Schloss“ ist falsch geschrieben.', '„Schloss“ kann ein Gebäude oder ein Türschloss sein.', '„Schloss“ ist ein Verb.', 'Der Satz hat kein Prädikat.'],
      loesung: 1,
      erklaerung: '„Schloss“ hat zwei Bedeutungen. Erst die anderen Sätze drumherum (der Zusammenhang) verraten, was gemeint ist.' },

    { id: 'de-wortfamilie-013', thema: 'wortfamilien_wortfelder', stufe: 1, typ: 'choice', bild: '🐻',
      frage: 'Welches Verb passt? „Der Bär ___ so laut, dass alle Tiere erschrecken.“',
      optionen: ['flüstert', 'brüllt', 'murmelt', 'tuschelt'],
      loesung: 1,
      erklaerung: '„brüllen“ bedeutet sehr laut rufen. Flüstern, murmeln und tuscheln sind leise Arten zu sprechen.' },

    { id: 'de-wortfamilie-014', thema: 'wortfamilien_wortfelder', stufe: 3, typ: 'truefalse',
      frage: '„gehen“, „Gang“ und „Fußgänger“ gehören zu einer Wortfamilie.',
      loesung: true,
      erklaerung: 'Alle drei gehören zur Wortfamilie „gehen“. Der Stamm verändert sich dabei: geh – Gang – gäng.' },

    // =====================================================================
    // WÖRTER BAUEN (Wortbildung)
    // =====================================================================
    { id: 'de-wortbildung-001', thema: 'wortbildung', stufe: 2, typ: 'choice', bild: '⛰️',
      frage: 'Welches zusammengesetzte Nomen entsteht aus „die Ameise“ und „der Hügel“?',
      optionen: ['das Ameisenhügel', 'der Ameisenhügel', 'der Ameisehügel'],
      loesung: 1,
      erklaerung: 'Das letzte Wort (Grundwort) bestimmt den Artikel: der Hügel → der Ameisenhügel. Zwischen den Wörtern steht hier ein Fugen-n.' },

    { id: 'de-wortbildung-002', thema: 'wortbildung', stufe: 1, typ: 'choice', bild: '🌻',
      frage: 'Welcher Artikel passt zu „Sonnenblume“?',
      optionen: ['der', 'die', 'das'],
      loesung: 1, nichtMischen: true,
      erklaerung: 'Das Grundwort ist „Blume“: die Blume → die Sonnenblume.' },

    { id: 'de-wortbildung-003', thema: 'wortbildung', stufe: 1, typ: 'choice', bild: '🪴',
      frage: 'Welcher Artikel passt zu „Blumentopf“?',
      optionen: ['der', 'die', 'das'],
      loesung: 0, nichtMischen: true,
      erklaerung: 'Das Grundwort ist „Topf“: der Topf → der Blumentopf. Das erste Wort (die Blume) bestimmt den Artikel nicht.' },

    { id: 'de-wortbildung-004', thema: 'wortbildung', stufe: 2, typ: 'truefalse',
      frage: 'Bei zusammengesetzten Nomen bestimmt das letzte Wort (das Grundwort) den Artikel.',
      loesung: true,
      erklaerung: 'Das Grundwort steht hinten und bestimmt den Artikel: das Haus + die Tür → die Haustür.' },

    { id: 'de-wortbildung-005', thema: 'wortbildung', stufe: 2, typ: 'choice',
      frage: 'Welches Grundwort steckt in „Schreibtisch“?',
      optionen: ['schreiben', 'Tisch', 'Schreib', 'Tischler'],
      loesung: 1,
      erklaerung: 'Das Grundwort steht am Ende: Tisch. Das Bestimmungswort „schreib“ (von schreiben) sagt, was für ein Tisch es ist.' },

    { id: 'de-wortbildung-006', thema: 'wortbildung', stufe: 3, typ: 'choice',
      frage: 'Aus welchen Wortarten ist „Schreibtisch“ zusammengesetzt?',
      optionen: ['Nomen + Nomen', 'Verb + Nomen', 'Adjektiv + Nomen', 'Adjektiv + Verb'],
      loesung: 1,
      erklaerung: '„schreib“ kommt vom Verb „schreiben“, „Tisch“ ist ein Nomen. Zusammen entsteht ein neues Nomen.' },

    { id: 'de-wortbildung-007', thema: 'wortbildung', stufe: 1, typ: 'choice', bild: '🙈',
      frage: 'Welcher Vorbaustein passt? „Die Ameise will sich vor dem Vogel ___stecken.“',
      optionen: ['be', 'ver', 'vor', 'ent'],
      loesung: 1,
      erklaerung: '„sich verstecken“ bedeutet: sich so hinsetzen, dass niemand einen findet. Der Vorbaustein ver- verändert die Bedeutung von „stecken“.' },

    { id: 'de-wortbildung-008', thema: 'wortbildung', stufe: 1, typ: 'choice',
      frage: 'Wie schreibt man die Vorbausteine richtig?',
      optionen: ['fer- und for-', 'ver- und vor-', 'vehr- und vohr-'],
      loesung: 1,
      erklaerung: 'Die Vorbausteine ver- und vor- schreibt man immer mit v: verstecken, vorlesen. Das muss man sich merken.' },

    { id: 'de-wortbildung-009', thema: 'wortbildung', stufe: 1, typ: 'choice', bild: '🏠',
      frage: 'Bilde mit dem Nachbaustein -ung ein Nomen aus „wohnen“.',
      optionen: ['die Wohnheit', 'die Wohnung', 'die Wohnkeit', 'die Wohnnis'],
      loesung: 1,
      erklaerung: 'wohn + ung = die Wohnung. Mit -ung entstehen aus Verben Nomen: hoffen → Hoffnung, ordnen → Ordnung.' },

    { id: 'de-wortbildung-010', thema: 'wortbildung', stufe: 2, typ: 'choice',
      frage: 'Welcher Nachbaustein macht aus „frei“ ein Nomen?',
      optionen: ['-lich', '-heit', '-ig', '-isch'],
      loesung: 1,
      erklaerung: 'frei + heit = die Freiheit. Mit -heit oder -keit werden aus Adjektiven Nomen: gesund → Gesundheit, fröhlich → Fröhlichkeit.' },

    { id: 'de-wortbildung-011', thema: 'wortbildung', stufe: 2, typ: 'choice', bild: '🌲',
      frage: '„Im Wald hat sich Paul verlaufen.“ Was bedeutet „sich verlaufen“?',
      optionen: ['sehr schnell laufen', 'den Weg nicht mehr finden', 'zurücklaufen', 'mit anderen mitlaufen'],
      loesung: 1,
      erklaerung: 'Der Vorbaustein ver- verändert die Bedeutung: laufen → sich verlaufen (falsch gehen und den Weg nicht mehr finden).' },

    { id: 'de-wortbildung-012', thema: 'wortbildung', stufe: 3, typ: 'choice', bild: '🗺️',
      frage: 'Aus wie vielen Wörtern ist „Ameisenstraßenkarte“ zusammengesetzt?',
      optionen: ['2', '3', '4'],
      loesung: 1, nichtMischen: true,
      erklaerung: 'Ameise + Straße + Karte = drei Wörter. Das letzte Wort „Karte“ bestimmt den Artikel: die Ameisenstraßenkarte.' },

    { id: 'de-wortbildung-013', thema: 'wortbildung', stufe: 2, typ: 'input', eingabe: 'text', bild: '🚪',
      frage: 'Setze zusammen: „das Haus“ + „die Tür“. Schreibe das neue Nomen ohne Artikel.',
      loesung: 'Haustür', alternativen: ['die Haustür'],
      erklaerung: 'Haus + Tür = die Haustür. Der Artikel kommt vom Grundwort: die Tür → die Haustür.' },

    { id: 'de-wortbildung-014', thema: 'wortbildung', stufe: 2, typ: 'choice', bild: '🍄',
      frage: 'Welches Wort ist ein Adjektiv mit dem Nachbaustein -bar?',
      optionen: ['Essen', 'Esstisch', 'essbar', 'gegessen'],
      loesung: 2,
      erklaerung: '„essbar“ heißt: Man kann es essen. Mit -bar entstehen aus Verben Adjektive: essbar, trinkbar, lesbar.' },

    { id: 'de-wortbildung-015', thema: 'wortbildung', stufe: 3, typ: 'truefalse', bild: '🏢',
      frage: '„Hochhaus“ ist aus einem Adjektiv und einem Nomen zusammengesetzt.',
      loesung: true,
      erklaerung: '„hoch“ ist ein Adjektiv, „Haus“ ist ein Nomen. Zusammen ergeben sie das Nomen „das Hochhaus“.' },

    // =====================================================================
    // ABC & NACHSCHLAGEN
    // =====================================================================
    { id: 'de-abc-001', thema: 'alphabet_nachschlagen', stufe: 1, typ: 'order',
      frage: 'Ordne nach dem Alphabet!',
      teile: ['Ameise', 'Biene', 'Käfer', 'Spinne'],
      erklaerung: 'Achte auf den ersten Buchstaben: A – B – K – S.' },

    { id: 'de-abc-002', thema: 'alphabet_nachschlagen', stufe: 2, typ: 'order',
      frage: 'Ordne nach dem Alphabet! Alle Wörter beginnen mit B – achte auf den zweiten Buchstaben.',
      teile: ['Bach', 'Berg', 'Blatt', 'Boden', 'Busch'],
      erklaerung: 'Wenn der erste Buchstabe gleich ist, entscheidet der zweite: a – e – l – o – u.' },

    { id: 'de-abc-003', thema: 'alphabet_nachschlagen', stufe: 3, typ: 'order',
      frage: 'Ordne nach dem Alphabet! Achte auf den dritten Buchstaben.',
      teile: ['Saft', 'Salz', 'Same', 'Sand'],
      erklaerung: 'Die ersten beiden Buchstaben (Sa) sind gleich. Der dritte entscheidet: f – l – m – n.' },

    { id: 'de-abc-004', thema: 'alphabet_nachschlagen', stufe: 1, typ: 'choice',
      frage: 'Welcher Buchstabe steht im Alphabet direkt nach M?',
      optionen: ['L', 'N', 'O', 'P'],
      loesung: 1,
      erklaerung: 'Im Alphabet folgt auf M das N: … K, L, M, N, O, P …' },

    { id: 'de-abc-005', thema: 'alphabet_nachschlagen', stufe: 2, typ: 'choice', bild: '📖',
      frage: 'Unter welchem Wort findest du „lief“ im Wörterbuch?',
      optionen: ['lief', 'laufen', 'Lauf', 'läuft'],
      loesung: 1,
      erklaerung: 'Verben stehen im Wörterbuch in der Grundform. „lief“ ist eine Form von „laufen“.' },

    { id: 'de-abc-006', thema: 'alphabet_nachschlagen', stufe: 2, typ: 'choice', bild: '🌳',
      frage: 'Unter welchem Wort schlägst du „Bäume“ nach?',
      optionen: ['Bäume', 'Baume', 'Baum', 'Bäumchen'],
      loesung: 2,
      erklaerung: 'Nomen stehen im Wörterbuch in der Einzahl: der Baum. Dort findest du oft auch die Mehrzahl.' },

    { id: 'de-abc-007', thema: 'alphabet_nachschlagen', stufe: 2, typ: 'choice',
      frage: 'Unter welchem Wort findest du „größer“ im Wörterbuch?',
      optionen: ['größer', 'Größe', 'groß', 'grob'],
      loesung: 2,
      erklaerung: 'Adjektive stehen in der Grundstufe im Wörterbuch: groß. „größer“ ist die Vergleichsstufe.' },

    { id: 'de-abc-008', thema: 'alphabet_nachschlagen', stufe: 3, typ: 'choice',
      frage: 'Auf einer Wörterbuchseite stehen oben die Leitwörter „Mond“ und „Mut“. Welches Wort findest du auf dieser Seite?',
      optionen: ['Mann', 'Moos', 'Nest', 'Mai'],
      loesung: 1,
      erklaerung: 'Leitwörter zeigen das erste und das letzte Wort der Seite. „Moos“ (Mo-o) liegt zwischen „Mond“ (Mo-n) und „Mut“ (Mu). Mann und Mai stehen weiter vorne, Nest weiter hinten.' },

    { id: 'de-abc-009', thema: 'alphabet_nachschlagen', stufe: 2, typ: 'choice',
      frage: 'Welches Wort steht im Wörterbuch am weitesten vorne?',
      optionen: ['Apfel', 'Ast', 'Ameise', 'Auge'],
      loesung: 2,
      erklaerung: 'Alle beginnen mit A. Der zweite Buchstabe entscheidet: m (Ameise) kommt vor p, s und u.' },

    { id: 'de-abc-010', thema: 'alphabet_nachschlagen', stufe: 1, typ: 'choice', bild: '🐱',
      frage: 'Wie trennst du „Katze“ richtig?',
      optionen: ['Ka-tze', 'Kat-ze', 'Katz-e'],
      loesung: 1,
      erklaerung: 'Schwinge die Silben: Kat-ze. Bei tz kommt das t zur ersten und das z zur zweiten Silbe.' },

    { id: 'de-abc-011', thema: 'alphabet_nachschlagen', stufe: 2, typ: 'choice', bild: '🍬',
      frage: 'Wie trennst du „Zucker“ richtig?',
      optionen: ['Zuc-ker', 'Zuck-er', 'Zu-cker'],
      loesung: 2,
      erklaerung: 'Das ck bleibt beim Trennen zusammen und kommt in die neue Zeile: Zu-cker, Bä-cker, He-cke.' },

    { id: 'de-abc-012', thema: 'alphabet_nachschlagen', stufe: 3, typ: 'choice', bild: '🪟',
      frage: 'Wie trennst du „Fenster“ richtig?',
      optionen: ['Fen-ster', 'Fens-ter', 'Fenst-er'],
      loesung: 1,
      erklaerung: 'Wenn mehrere Mitlaute aufeinanderfolgen, kommt nur der letzte in die neue Zeile: Fens-ter, Kis-te, Wes-pe.' },

    { id: 'de-abc-013', thema: 'alphabet_nachschlagen', stufe: 1, typ: 'input', eingabe: 'zahl', bild: '🦋',
      frage: 'Wie viele Silben hat das Wort „Schmetterling“?',
      loesung: 3,
      erklaerung: 'Schwinge mit: Schmet-ter-ling. Das sind drei Silben. Jede Silbe hat einen Selbstlaut oder Doppellaut.' },

    { id: 'de-abc-014', thema: 'alphabet_nachschlagen', stufe: 2, typ: 'input', eingabe: 'zahl', bild: '🐞',
      frage: 'Wie viele Silben hat das Wort „Marienkäfer“?',
      loesung: 5,
      erklaerung: 'Schwinge mit: Ma-ri-en-kä-fer. Das sind fünf Silben.' },

    { id: 'de-abc-015', thema: 'alphabet_nachschlagen', stufe: 1, typ: 'truefalse',
      frage: 'Das Alphabet hat 26 Buchstaben (ohne ä, ö, ü und ß).',
      loesung: true,
      erklaerung: 'Von A bis Z sind es 26 Buchstaben. Im Wörterbuch werden ä, ö und ü meist wie a, o und u einsortiert.' },

    { id: 'de-abc-016', thema: 'alphabet_nachschlagen', stufe: 2, typ: 'choice', bild: '⛰️',
      frage: 'Wie trennst du „Ameisenhügel“ zwischen den beiden zusammengesetzten Wörtern?',
      optionen: ['Ameisenh-ügel', 'Ameisen-hügel', 'Ameise-nhügel'],
      loesung: 1,
      erklaerung: 'Zusammengesetzte Wörter trennst du zwischen ihren Bausteinen: Ameisen-hügel. Das Fugen-n gehört zum ersten Teil.' },

    // =====================================================================
    // LESEDETEKTIVE (Leseverstehen)
    // =====================================================================
    // Text 1: Blattschneiderameisen (Sachtext)
    { id: 'de-lesen-001', thema: 'leseverstehen', stufe: 1, typ: 'choice', bild: '🌿', text: TEXT_BLATTSCHNEIDER,
      frage: 'Wo leben Blattschneiderameisen?',
      optionen: ['in den Wäldern von Baden-Württemberg', 'in den Regenwäldern Mittel- und Südamerikas', 'in der Wüste Afrikas', 'im Eis der Antarktis'],
      loesung: 1,
      erklaerung: 'Das steht gleich im ersten Satz des Textes. Bei solchen Fragen findest du die Antwort direkt im Text.',
      tipp: 'Suche im Text nach dem Wort „leben“.' },

    { id: 'de-lesen-002', thema: 'leseverstehen', stufe: 2, typ: 'choice', bild: '🍄', text: TEXT_BLATTSCHNEIDER,
      frage: 'Was machen die Ameisen im Bau mit den Blättern?',
      optionen: ['Sie fressen die Blätter sofort auf.', 'Sie bauen daraus Betten für die Larven.', 'Sie zerkauen sie, und darauf wächst ein Pilz.', 'Sie werfen sie wieder hinaus.'],
      loesung: 2,
      erklaerung: 'Im Text steht: „Doch die Ameisen fressen die Blätter nicht! Im Bau zerkauen sie die Blätter zu einem Brei. Auf diesem Brei wächst ein Pilz.“',
      tipp: 'Achte auf das Wort „Doch“ – danach kommt eine Überraschung.' },

    { id: 'de-lesen-003', thema: 'leseverstehen', stufe: 3, typ: 'choice', bild: '👩‍🌾', text: TEXT_BLATTSCHNEIDER,
      frage: 'Warum heißt der Text „Die Gärtner im Regenwald“?',
      optionen: ['Weil im Regenwald viele Menschen Gärten haben.', 'Weil die Ameisen einen Pilz pflegen wie Gärtner ihren Garten.', 'Weil die Ameisen Blumen pflanzen.', 'Weil die Ameisen den Rasen mähen.'],
      loesung: 1,
      erklaerung: 'Die Überschrift ist ein Vergleich: Die Ameisen kümmern sich um ihren Pilz, so wie Gärtner um ihren Garten. Das steht im zweiten Abschnitt.' },

    { id: 'de-lesen-004', thema: 'leseverstehen', stufe: 2, typ: 'truefalse', bild: '🪰', text: TEXT_BLATTSCHNEIDER,
      frage: 'Die winzige Ameise auf dem Blattstück fährt nur mit, weil sie zu faul zum Laufen ist.',
      loesung: false,
      erklaerung: 'Im Text steht, dass sie nicht nur gemütlich mitfährt: Sie verjagt Fliegen, die die Trägerin angreifen wollen. Sie ist also eine Wächterin.' },

    // Text 2: Lotta und die lebende Brücke (Erzählung)
    { id: 'de-lesen-005', thema: 'leseverstehen', stufe: 1, typ: 'choice', bild: '👧', text: TEXT_BRUECKE,
      frage: 'Wer entdeckt die Ameisen am Wassergraben zuerst?',
      optionen: ['Opa', 'Lotta', 'ein Forscher', 'Lottas Mutter'],
      loesung: 1,
      erklaerung: 'Lotta zeigt auf den Boden und ruft: „Opa, schau mal!“ Also hat sie die Ameisen zuerst gesehen.' },

    { id: 'de-lesen-006', thema: 'leseverstehen', stufe: 2, typ: 'choice', bild: '🌉', text: TEXT_BRUECKE,
      frage: 'Wie kommen die Ameisen über den Graben?',
      optionen: ['Sie schwimmen hinüber.', 'Sie fliegen hinüber.', 'Sie bilden mit ihren Körpern eine Brücke.', 'Sie warten, bis der Graben austrocknet.'],
      loesung: 2,
      erklaerung: 'Eine Ameise hält sich an der nächsten fest, bis eine Kette über den Graben reicht. Lotta sagt: „Sie bauen eine Brücke aus ihren eigenen Körpern!“' },

    { id: 'de-lesen-007', thema: 'leseverstehen', stufe: 3, typ: 'choice', bild: '🤝', text: TEXT_BRUECKE,
      frage: 'Was meint Opa mit dem Satz: „Zusammen schaffen sie, was eine allein nie könnte.“?',
      optionen: ['Ameisen sind gern allein.', 'Eine einzelne Ameise ist stärker als viele.', 'Gemeinsam sind die Ameisen stark.', 'Opa möchte nach Hause gehen.'],
      loesung: 2,
      erklaerung: 'Eine einzelne Ameise könnte den Graben nicht überwinden. Erst zusammen bilden sie eine Brücke. Opa meint: Gemeinsam schafft man mehr.' },

    { id: 'de-lesen-008', thema: 'leseverstehen', stufe: 2, typ: 'order', bild: '📓', text: TEXT_BRUECKE,
      frage: 'Bringe die Ereignisse der Geschichte in die richtige Reihenfolge!',
      teile: ['Lotta entdeckt die Ameisen.', 'Eine Ameise krallt sich am Rand fest.', 'Eine Kette wächst über den Graben.', 'Viele Ameisen laufen über die Brücke.'],
      erklaerung: 'Achte auf Signalwörter im Text: „Plötzlich“, „Dann“, „Langsam“ und „nun“ zeigen die Reihenfolge.' },

    // Text 3: Igel im Winter (Sachtext)
    { id: 'de-lesen-009', thema: 'leseverstehen', stufe: 1, typ: 'choice', bild: '🍂', text: TEXT_IGEL,
      frage: 'Woraus baut der Igel sein Nest?',
      optionen: ['aus Steinen und Sand', 'aus Blättern und Moos', 'aus Federn', 'aus Zweigen und Lehm'],
      loesung: 1,
      erklaerung: 'Im ersten Abschnitt steht: „baut er sich ein Nest aus Blättern und Moos“.' },

    { id: 'de-lesen-010', thema: 'leseverstehen', stufe: 2, typ: 'choice', bild: '🦔', text: TEXT_IGEL,
      frage: 'Warum hält der Igel Winterschlaf?',
      optionen: ['Weil er im Winter Angst vor Schnee hat.', 'Weil er im Winter kaum Futter findet und Energie sparen muss.', 'Weil er im Sommer zu wenig geschlafen hat.', 'Weil er im Winter Junge bekommt.'],
      loesung: 1,
      erklaerung: 'Im Text steht, dass es kaum noch Käfer, Raupen und Würmer gibt. Im Winterschlaf spart der Igel Energie und lebt von seinem Fett.' },

    { id: 'de-lesen-011', thema: 'leseverstehen', stufe: 2, typ: 'truefalse', bild: '⚖️', text: TEXT_IGEL,
      frage: 'Wenn der Igel im Frühling aufwacht, ist er schwerer als im Herbst.',
      loesung: false,
      erklaerung: 'Im letzten Satz steht, dass der Igel „viel Gewicht verloren“ hat. Er hat im Winter von seinem Fett gelebt.' },

    // Text 4: Glühwürmchen (Sachtext)
    { id: 'de-lesen-012', thema: 'leseverstehen', stufe: 1, typ: 'choice', bild: '✨', text: TEXT_GLUEHWUERMCHEN,
      frage: 'Was sind Glühwürmchen in Wirklichkeit?',
      optionen: ['Würmer', 'Käfer', 'Fliegen', 'Schmetterlinge'],
      loesung: 1,
      erklaerung: 'Im Text steht: „Obwohl sie so heißen, sind sie keine Würmer, sondern Käfer.“ Der Name kann also in die Irre führen.' },

    { id: 'de-lesen-013', thema: 'leseverstehen', stufe: 2, typ: 'choice', bild: '💡', text: TEXT_GLUEHWUERMCHEN,
      frage: 'Wozu leuchten die Glühwürmchen?',
      optionen: ['damit sie nachts den Weg nach Hause sehen', 'damit sich Männchen und Weibchen finden', 'damit sie sich wärmen können', 'um Vögel anzulocken'],
      loesung: 1,
      erklaerung: 'Im Text steht: „Mit dem Leuchten finden sich Männchen und Weibchen.“ Wärme scheidet aus, denn das Licht ist kalt.' },

    { id: 'de-lesen-014', thema: 'leseverstehen', stufe: 3, typ: 'choice', bild: '🏷️', text: TEXT_GLUEHWUERMCHEN,
      frage: 'Welche andere Überschrift passt auch gut zu diesem Text?',
      optionen: ['Würmer im Garten', 'Wie man eine Lampe baut', 'Käfer, die leuchten', 'Der Winter im Wald'],
      loesung: 2,
      erklaerung: 'Der Text erklärt, dass Glühwürmchen Käfer sind und selbst Licht erzeugen. „Käfer, die leuchten“ fasst das gut zusammen.' },

    // Text 5: Gedicht
    { id: 'de-lesen-015', thema: 'leseverstehen', stufe: 1, typ: 'choice', bild: '📜', text: TEXT_GEDICHT,
      frage: 'Wie viele Strophen hat das Gedicht?',
      optionen: ['1', '2', '4', '8'],
      loesung: 1, nichtMischen: true,
      erklaerung: 'Eine Strophe ist ein Abschnitt in einem Gedicht. Das Gedicht hat zwei Strophen mit je vier Versen.' },

    { id: 'de-lesen-016', thema: 'leseverstehen', stufe: 2, typ: 'choice', bild: '🎵', text: TEXT_GEDICHT,
      frage: 'Welches Wort reimt sich im Gedicht auf „schwer“?',
      optionen: ['Weg', 'her', 'weit', 'Last'],
      loesung: 1,
      erklaerung: '„her“ und „schwer“ klingen am Ende gleich – sie reimen sich. In diesem Gedicht reimen sich immer zwei Verse hintereinander.' },

    { id: 'de-lesen-017', thema: 'leseverstehen', stufe: 2, typ: 'choice', bild: '✍️', text: TEXT_GEDICHT,
      frage: 'Was ist ein Vers?',
      optionen: ['ein ganzer Abschnitt in einem Gedicht', 'eine Zeile in einem Gedicht', 'die Überschrift eines Gedichts', 'ein Reimwort'],
      loesung: 1,
      erklaerung: 'Ein Vers ist eine Zeile in einem Gedicht. Mehrere Verse zusammen bilden eine Strophe.' },

    // Text 6: Anleitung
    { id: 'de-lesen-018', thema: 'leseverstehen', stufe: 1, typ: 'choice', bild: '🔎', text: TEXT_ANLEITUNG,
      frage: 'Was für ein Text ist das?',
      optionen: ['ein Märchen', 'eine Anleitung', 'ein Gedicht', 'ein Brief'],
      loesung: 1,
      erklaerung: 'Eine Anleitung erklärt Schritt für Schritt, was man tun soll. Typisch sind Material, nummerierte Schritte und Aufforderungen wie „Suche …“ oder „Lege …“.' },

    { id: 'de-lesen-019', thema: 'leseverstehen', stufe: 2, typ: 'choice', bild: '⏱️', text: TEXT_ANLEITUNG,
      frage: 'Was tust du direkt, nachdem du den Tropfen Zuckerwasser hingelegt hast?',
      optionen: ['Du schreibst ins Heft.', 'Du suchst eine Ameisenstraße.', 'Du setzt dich leise daneben und wartest.', 'Du beobachtest mit der Lupe.'],
      loesung: 2,
      erklaerung: 'Das Zuckerwasser ist Schritt 2. Direkt danach kommt Schritt 3: „Setze dich leise daneben und warte ein paar Minuten.“',
      tipp: 'Achte auf die Nummern der Schritte.' },

    { id: 'de-lesen-020', thema: 'leseverstehen', stufe: 1, typ: 'choice', bild: '🌲', text: TEXT_ANLEITUNG,
      frage: 'Warum sollst du einen Ameisenhügel nie zerstören?',
      optionen: ['Weil der Hügel aus Zucker ist.', 'Weil Waldameisen unter Naturschutz stehen.', 'Weil die Lupe sonst kaputtgeht.', 'Weil man sonst nichts ins Heft schreiben kann.'],
      loesung: 1,
      erklaerung: 'Am Ende der Anleitung steht: „Waldameisen stehen unter Naturschutz.“ Der Hinweis ist mit „Wichtig“ besonders hervorgehoben.' },

    // Text 7: Fabel
    { id: 'de-lesen-021', thema: 'leseverstehen', stufe: 2, typ: 'choice', bild: '🦌', text: TEXT_FABEL,
      frage: 'Was für ein Text ist das?',
      optionen: ['ein Sachtext', 'eine Fabel', 'eine Anleitung', 'ein Gedicht'],
      loesung: 1,
      erklaerung: 'In einer Fabel sprechen und handeln Tiere wie Menschen. Am Ende steht oft eine Lehre – hier im letzten Satz.' },

    { id: 'de-lesen-022', thema: 'leseverstehen', stufe: 1, typ: 'choice', bild: '🪲', text: TEXT_FABEL,
      frage: 'Warum lacht der Hirschkäfer über die Ameisen?',
      optionen: ['Weil sie zu langsam arbeiten.', 'Weil sie seinen Ast abgebrochen haben.', 'Weil sie klein sind und er mächtige Zangen hat.', 'Weil sie laut singen.'],
      loesung: 2,
      erklaerung: 'Er prahlt: „Ihr seid so klein und schwach. Ich dagegen habe mächtige Zangen!“ Den Ast hat der Sturm abgebrochen, nicht die Ameisen.' },

    { id: 'de-lesen-023', thema: 'leseverstehen', stufe: 3, typ: 'choice', bild: '💡', text: TEXT_FABEL,
      frage: 'Welche Lehre steckt in der Fabel?',
      optionen: ['Große Tiere sind immer die Stärksten.', 'Man soll andere nicht wegen ihrer Größe verspotten.', 'Bei Sturm soll man auf Bäume klettern.', 'Ameisen arbeiten nur, wenn es regnet.'],
      loesung: 1,
      erklaerung: 'Der Käfer wird am Ende von den kleinen Ameisen gerettet und schämt sich. Der letzte Satz sagt es: Wer andere wegen ihrer Größe verspottet, unterschätzt sie.' },
  ],
};
