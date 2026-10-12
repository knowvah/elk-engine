---
title: Konformität
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Konformität: was „Übereinstimmung“ bedeutet

@knowvah/elk-engine wird gegen das upstream Eclipse ELK (Java) validiert, das aus den
Quellen gebaut wird. Ein TypeScript-Layout ist mit dem Orakel **konform**, wenn nach dem Parsen beider
als ELK JSON die Struktur und jeder nicht numerische Wert exakt gleich sind und jede endliche Zahl
innerhalb einer absoluten Toleranz von `1e-6` übereinstimmt.
Der Komparator ist [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
dieses Dokument beschreibt, was er umsetzt. Die Portierungsregeln stehen in
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Abschnitt                                         | Beantwortet                                    |
| --- | ------------------------------------------------- | ---------------------------------------------- |
| 1   | [Orakel](#1-orakel)                               | Was ist „korrekt“, und bei welchem Commit?     |
| 1a  | [Konformitätseinheit](#1a-konformitätseinheit)    | Was ist ein Fall, und welche Fälle gibt es?    |
| 2   | [Konformitätskriterium](#2-konformitätskriterium) | Was gilt als gleich?                           |
| 3   | [Goldens und Korpus](#3-goldens-und-korpus)       | Woher stammen die Referenzausgaben?            |
| 4   | [Seam-Patches](#4-seam-patches)                   | Wie ändern wir das Orakel?                     |
| 5   | [Orakel-Betrieb](#5-orakel-betrieb-runbook)       | Was tue ich, wenn es kaputtgeht?               |
| 6   | [Gates](#6-gates)                                 | Was muss bestehen, bevor eine Änderung landet? |

## 1. Orakel

Das Orakel (AD-3) ist das upstream ELK, **aus den Quellen gebaut** in einem losgelösten
Git-Worktree von `$ELK_SOURCE_DIR`, den `tools/oracle/build.sh` unter `$ELK_ORACLE_DIR` anlegt.
Beide liegen außerhalb dieses Repositorys; keiner wird mitgeliefert.

| Element              | Ort                                                                                         |
| -------------------- | ------------------------------------------------------------------------------------------- |
| Fixierter ELK-Commit | `tools/oracle/ELK_COMMIT` (derzeit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)              |
| Patch-Serie          | `tools/oracle/patches/*.patch`, in lexikalischer Reihenfolge mit `git am --3way` angewendet |
| Build                | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho lädt p2-Artefakte herunter)            |
| Batch-Runner         | `tools/oracle/run.sh <outDir> <input>...` oder `run.sh --cases <cases.jsonl> <outDir>`      |
| Harness              | `tools/oracle/harness/ElkOracle.java`                                                       |
| Build-Manifest       | `$ELK_ORACLE_DIR/oracle-build.json` (Commit, Patches, JDK, Jar je Bundle)                   |

**Build.** `build.sh` führt `mvn -P elk-meta clean install -DskipTests` (den melk-Compiler) und
anschließend `mvn clean install -DskipTests -Dmaven.test.skip=true` aus `build/` im Worktree aus und
hält dann das Jar jedes Bundles im Umfang (`core`, `graph`, `graph.json`, `alg.common` sowie die
Algorithmen `layered`, `mrtree`, `radial`, `force`, `disco`, `rectpacking`, `spore`,
`topdownpacking`, `vertiflex`) in `oracle-build.json` fest. Ein vorhandener Worktree wird nur
wiederverwendet, wenn er von `ELK_COMMIT` abstammt, genau die Patch-Betreffzeilen aus
`tools/oracle/patches/` trägt und bis auf Build-Ausgaben sauber ist; andernfalls beendet sich
`build.sh` mit `2` und lässt ihn unberührt.

**Run.** `run.sh` kompiliert `ElkOracle.java` gegen die Bundle-Jars sowie die Fremdbundles (Gson,
Guava, EMF, Xtext/Xtend-Bibliotheken) aus dem Tycho-p2-Cache (`P2_BUNDLES`, Standard
`~/.m2/repository/p2/osgi/bundle`; jeweils die neueste Version wird verwendet). Eine JVM layoutet
jede Eingabe mit `RecursiveGraphLayoutEngine` und schreibt `<outDir>/<input basename>.json` mit
Layout, Nullmaßen und Nullpositionen; unbekannte Layoutoptionen werden weggelassen. Eine
fehlschlagende Eingabe gibt `ERROR <input>: <message>` aus; die JVM beendet sich mit `1`, wenn
irgendeine Eingabe fehlgeschlagen ist. Die Basisnamen der Eingaben müssen innerhalb eines Laufs
eindeutig sein, da der Ausgabename der Basisname ist.

**Semantik der Patch-Serie.** Die Serie enthält heute einen Patch:

| Patch                                                                   | Wirkung                                                                                                                                                                                                                                                   | Gepaarter TS-Seam                                                                                                                                                                    |
| ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` löst Id-Kollisionen mit `"_g" + Random.nextInt(1000000)` auf; der Patch initialisiert dieses `Random` aus der Systemeigenschaft `org.eclipse.elk.graph.json.exportSeed` (nicht gesetzt = ELK-Verhalten). `run.sh` übergibt `EXPORT_SEED=1` | Injizierbares `Random` in der `graph.json`-Portierung; steht aus, bis diese Portierung vorliegt (der TS-`Random`-Shim reproduziert die Folge bereits: Seed 1 liefert 548985, 764588) |

Patches gibt es nur, um eng umrissene Seams hinzuzufügen, die das Verhalten von JVM und JS
vergleichbar machen; jeder ist mit einem TS-seitigen Seam gepaart (Abschnitt 4).

**Warum nicht elkjs?** elkjs ist ein mit GWT kompiliertes ELK. Es kann unsere Patch-Serie nicht
tragen, und die GWT-Emulation der JRE weicht von der JVM ab, von der wir portieren. Es wird nicht
als Orakel herangezogen.

## 1a. Konformitätseinheit

Ein **Fall** ist `(algorithm, model, variant)` (D1). Das Paritäts-Dashboard hat eine Zeile pro
Layoutalgorithmus; der elk-models-Ordner und die Census-Merkmale sind Filter, keine Zeilen.

**Fall-Id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, zum Beispiel
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` ist die Algorithmus-Id
ohne `org.eclipse.elk.`. Bei generierten Modellen ist `modelId` gleich `generated/<name>`.

**Modell-Id und Quelle (D3).** Die Modell-Id ist der Pfad in elk-models ohne Erweiterung.
Ein Fall liest die `.json`, wenn eine existiert, sonst die `.elkt`; `.elkg` (EMF XMI) wird nie gelesen.

**Varianten (D6).** Benannte Optionsüberlagerungen in `test/corpus/variants.json`, an der Wurzel angewendet:
`default` (keine), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algorithmus                                                 | Modelle                        | Varianten            |
| ------------ | ----------------------------------------------------------- | ------------------------------ | -------------------- |
| native       | der eigene `rootAlgorithm` des Modells                      | jedes Census-Modell            | alle sieben          |
| retarget     | jeder aufgeführte Algorithmus außer dem eigenen des Modells | jedes Census-Modell            | nur `default` (OR-1) |
| generated    | der durch das Dateipräfix benannte Algorithmus              | `test/corpus/generated/*.json` | alle sieben          |
| ported JUnit | je Algorithmus-Mission                                      | upstream-JUnit-Fälle (AD-13)   | wie portiert         |

`tools/oracle/run.sh --list-algorithms` ist die Liste der Algorithmus-Ids (heute 14).

**Retarget (D2).** Das Harness setzt `org.eclipse.elk.algorithm` auf **jedem Knoten, der
Kinder hat**, und ersetzt dabei jeden deklarierten Wert, sowie `org.eclipse.elk.randomSeed = 1` an der Wurzel. ELK
löst den Algorithmus pro Knoten auf, und ein nicht gesetzter Knoten fällt auf layered zurück. Eine Wurzel ohne
Kinder erhält nur den Seed. Der Retarget-Tier überspringt den eigenen `rootAlgorithm` jedes Modells (der
native Tier deckt ihn ab).

## 2. Konformitätskriterium

AD-4, genau so, wie `compareLayout(expected, actual, { tol })` es umsetzt:

| Regel                     | Verhalten                                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Toleranz                  | Absolut, `DEFAULT_TOLERANCE = 1e-6`; endliche Zahlen bestehen, wenn `abs(e - a) <= tol`                                                                                                                |
| Nicht endliche Zahlen     | `NaN` und `±Infinity` müssen exakt gleich sein (`Object.is` oder `===`), auch mit `tol: Infinity`                                                                                                      |
| Strings, Booleans, `null` | Strikt gleich, sonst `value`                                                                                                                                                                           |
| Typabweichung             | Verschiedene JSON-Arten (`null`, Array, Objekt, Zahl, String, Boolean) ergeben ein einziges `type`-Diff                                                                                                |
| Objektschlüssel           | Die Schlüsselmenge muss identisch sein: ein Schlüssel nur in expected ist `missing`, nur in actual `extra`                                                                                             |
| Arrays                    | Zuordnung **per `id`**, wenn jedes Element auf beiden Seiten ein Objekt mit String-`id` ist und die Ids je Seite eindeutig sind (ein leeres Array gilt als schlüsselbasiert); sonst **positionsweise** |
| Schlüsselbasierte Arrays  | Eine Id nur auf einer Seite ist ein `structure`-Diff bei `path[id=<id>]`; die Reihenfolge wird ignoriert                                                                                               |
| Positionsbasierte Arrays  | Ein Längenunterschied ist ein einziges `structure`-Diff, und die Elemente werden nicht weiter verglichen                                                                                               |
| Diff-Arten                | `structure`, `value`, `type`, `missing`, `extra`; `path` ist JSON-Pfad-artig (`children[id=n1].x`)                                                                                                     |

Folgen: Element-Ids, Elementanzahlen, Kantenabschnitts-Topologie und die Anzahl der Knickpunkte sind
exakt, weil Ids und Array-Längen exakt sind; Koordinaten und Größen erhalten `1e-6`. `formatDiffs`
gibt höchstens 20 Diffs aus.

**Richtlinie zu bekannten Abweichungen.** Eine Abweichung wird nie durch Anheben von `tol` oder
Bearbeiten eines Goldens aufgefangen (AD-13). Jede wird hier mit ihrer Ursache und dem Test oder
Fixture, den sie betrifft, festgehalten. Akzeptierte Klassen:

- **`Math.*`-Unterschiede auf ulp-Ebene.** V8 und die JVM können sich im letzten Bit von `sin`,
  `cos`, `exp`, `log`, `pow` und Verwandten unterscheiden; Javas `StrictMath` ist bitgenau
  spezifiziert, `Math` nicht. Der bereits aufgetretene Fall: `nextGaussian` ist so spezifiziert, dass
  es `StrictMath.log` verwendet, daher enthält `src/java/util/Random.ts` eine
  `StrictMath.log`-exakte Implementierung statt `Math.log`. Ein bitgenauer Port des
  `StrictMath`-Algorithmus ist der Aufweitung der Toleranz vorzuziehen.
- **Iteration über Identitäts-Hashes (AD-10).** Das Iterieren über eine `HashMap`/ein `HashSet` mit
  identitätsgehashten Schlüsselobjekten ist in Java selbst nicht deterministisch. Die Stelle
  journalisieren und mit Einfügereihenfolge portieren; Goldens dürfen nicht davon abhängen.
  Wertgehashte Schlüssel (String, Integer) müssen die Java-Reihenfolge reproduzieren.
- **Zeitgeseedetes `Random`.** Bei `randomSeed = 0` seedet ELK aus der Uhr
  (`core/Core.melk:608`), die Ausgabe ist also nicht reproduzierbar. Golden-Eingaben müssen den
  Seed ungesetzt oder ungleich null lassen (der Standard-Seed von layered ist `1`).

Konkrete Einträge (nur mit Zustimmung des Nutzers hinzufügen):

| #   | Abweichung                   | Ursache                                                                       | Geltungsbereich                                                                                                                                                                    | Genehmigt              |
| --- | ---------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | Text der Parse-Fehlermeldung | ANTLR-Meldungen sind Artefakte des generierten Parsers, der nie portiert wird | Ungültige Grammatik-Eingabe (`.elkt`, `.elkj`, `.elkr`): nur das _Vorliegen_ eines Parse-Fehlers muss übereinstimmen, nicht die Meldung. Gültige Eingabe muss exakt übereinstimmen | D8, Nutzer, 2026-10-11 |

**Urteile.** Jeder Fall erhält ein Urteil aus zwei getrennten JVM-Läufen des Orakels (D4, D5, OR-2):

| Urteil             | Bedeutung                                                                                                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Beide Läufe haben das Modell gelayoutet, und die Ausgabedateien sind byteidentisch                                                                                                                    |
| `throws`           | Beide Läufe haben dieselbe Exception geworfen: exakt dieselbe Klasse und exakt dieselbe Meldung, nachdem `@[0-9a-f]+` zu `@<hash>` wurde (die Meldung darf null sein, z. B. bei `StackOverflowError`) |
| `nondeterministic` | Die Läufe weichen voneinander ab (Ausgabebytes, Exception, oder einmal `ok` und einmal `throws`)                                                                                                      |
| `oracle-error`     | Fehler des Harness (unlesbare Eingabe, unbekannte Variante/unbekannter Algorithmus/unbekannte Option, verlorene Ergebniszeile); nie akzeptabel                                                        |
| `timeout`          | Ein Lauf hat `ELK_SWEEP_TIMEOUT_MS` überschritten                                                                                                                                                     |

Vorrang: `oracle-error`, dann `timeout`, dann `ok`/`throws`, wenn gleich, sonst
`nondeterministic`. Vor dem Bytevergleich wird jedes `@[0-9a-f]+`-Token in beiden Ausgaben durch
`@<hash>` ersetzt, wie in Exception-Meldungen (D5a; `sameOutput` in `tools/corpus/sweep.ts`).
Ursache: Die programmatische Option `debug.discoGraph` von disco exportiert `...DCGraph@<identity hash>`,
was kein Seed festlegen kann. Der TS-Komparator wendet dieselbe Ersetzung an. Nichtdeterministische Fälle
werden gesondert berichtet und aus den Bestandszahlen ausgeschlossen, im Einklang mit der obigen
Richtlinie zu Identitäts-Hashes.

Echte verbleibende Quellen von `nondeterministic` (ELK-Verhalten, keine Harness-Fehler; die Anzahlen stehen im
Paritätsbericht): spore (`ElkGraphImporter.java:169` streut mit `Math.random`) und `random`
(der Standard-`randomSeed` 0 ist bei verschachtelten Composites ungeseedet; Retarget seedet nur die Wurzel, D2,
auf Nutzerentscheidung beibehalten). Die `_g<random>`-Id-Umbenennungen des Exporters sind keine Quelle: Der Seam-Patch
behebt sie.

## 3. Goldens und Korpus

AD-5. Referenzausgaben sind eingecheckt, damit die CI keine JVM braucht.

| Element           | Ort                                                                                             |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Fixierter Korpus  | `eclipse-elk/elk-models` beim `commit` in `test/corpus/manifest.json` (nicht mitgeliefert)      |
| Modellverzeichnis | `$ELK_MODELS_DIR`, Standard `../../eclipse-elk/elk-models` relativ zu diesem Repository         |
| Kuratierte Menge  | `golden[]` in `test/corpus/manifest.json`: `{ id, path, note }`                                 |
| Refs              | `test/golden/refs/elk/<id>.json`, eine je Manifest-`id`                                         |
| Provenienz        | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Abbildung von Id auf Pfad.** `golden[].path` ist relativ zu `$ELK_MODELS_DIR`, und
die Eingabe ist `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` führt das Harness auf diesen Eingaben aus
und legt jede `<basename>.json`-Ausgabe als `refs/elk/<id>.json` ab.
Beispiel: Die Id `ptolemy-scrambler` ist
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regenerierung** (`tools/oracle/regen-goldens.sh`):

1. Setzt voraus, dass der Models-Klon genau beim Manifest-Commit steht (sonst Exit `1`).
2. Setzt ein gebautes Orakel voraus (`run.sh` braucht `oracle-build.json`).
3. Legt alle Refs und `_meta.json` in `test/golden/refs/.elk-staging.*` ab und tauscht dann das
   Verzeichnis in zwei Umbenennungen aus, sodass ein fehlgeschlagener Lauf die alten Refs belässt.
4. `_meta.json` enthält keine Zeitstempel (`builtAt` bleibt in `oracle-build.json`), daher ist eine
   Regenerierung ohne geänderte Eingaben in Git byteweise ein No-op.

**Wann zu regenerieren ist:** nach Änderung von `ELK_COMMIT`, der Patch-Serie, der
`golden[]`-Menge oder des `commit` im Manifest oder des Harness. Sonst nie.

**Journal-Regel.** Jede Regenerierung, die einen Ref ändert, wird mit der Ursache journalisiert
(die Patch-Id oder die Commit-Anhebung). Refs werden nie von Hand bearbeitet. Kann eine
TS-Assertion oder ein Golden nur durch Änderung bestehen, anhalten und journalisieren (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` layoutet nichts: Es führt das Orakel im Parse-Modus
über alle Modelle aus und vergleicht das Ergebnis mit dem eingecheckten `test/corpus/census.json` (898
Modelle: Id, Formate, Quelle, Wurzelalgorithmus, Merkmalszahlen). Exit `0` bei Gleichheit, `1` bei Drift;
`--write` überschreibt die Datei. Es läuft nur im fixierten Models-Klon und bricht bei einem
Harness-Fehler ab.

**Generierter Korpus (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` enthält eine geseedete
grandom-Konfiguration; die danebenliegende `.json` ist die vom Orakel erzeugte, ungelayoutete Eingabe. Neun Konfigurationen decken
die Algorithmus-Ids ab, die kein elk-models-Modell verwendet: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Jede hat höchstens 50 Knoten und
keine Kantenbeschriftungen (`BlindTextGenerator` ist ungeseedet). Das Harness nennt die generierte Wurzel `root`,
weil der `JsonExporter` von ELK eine Id-Kollision mit einem ungeseedeten Zufallssuffix auflöst. Nur mit
`tools/oracle/regen-generated.sh` regenerieren (Staging-Verzeichnis und Umbenennung; eine fehlschlagende Konfiguration
belässt die alten Dateien); ein erneuter Lauf ohne Änderungen ist in Git ein No-op. Der TS-grandom-Port muss diese `.json`-Dateien
byteweise reproduzieren; Algorithmus-Goldens hängen nie davon ab.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` plant jeden Fall, führt jeden zweimal in getrennten JVMs aus (Shards
standardmäßig `min(cpus, 8)` gleichzeitige `run.sh`-Prozesse) und schreibt
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` gibt die Fallzahlen pro Tier aus und führt nichts aus; `--filter` behält Fall-Ids, die den
Teilstring enthalten; `--limit` zieht eine Stichprobe mit gleichmäßigem Abstand. Exit `0`, außer ein Fall ist `oracle-error`
(`1`); ein Werkzeugfehler beendet mit `2`. Ausgaben pro Fall bleiben lokal (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(Standard `30000`, nur von `tools/` gelesen) begrenzt jeden Fall; `run.sh` startet eine JVM nach einem
Timeout (JVM-Exit-Code 75) für die Fälle ohne Ergebniszeile neu.

**Paritätsbericht (D9).** `docs/parity-report.md` wird aus dem Sweep-Cache generiert und eingecheckt:
Anzahlen pro Algorithmus und Urteil, mit den ELK- und Models-Commits und ohne Zeitstempel. Regenerieren
mit `npx tsx tools/corpus/parity-report.ts --write`; ohne `--write` beendet sich der Befehl mit `1`,
wenn der eingecheckte Bericht veraltet ist. Nie von Hand bearbeiten.

**Korpus-Tests.** `resolveModelsDir()` in `test/corpus/corpus.ts` liefert einen
`skip`-Grund, wenn der Klon fehlt oder bei einem anderen Commit steht; Tests, die ihn brauchen,
werden übersprungen, mit dem fixierten sha in der Meldung. Heute prüft `test/golden/oracle-refs.test.ts`
nur die eingecheckten Refs: eines je Manifest-Id, Geometrie an jedem Knoten, Port, jeder Beschriftung und Kante,
Selbstvergleich, und dass `_meta.json` zu `ELK_COMMIT`, dem Manifest und dem Generator passt. Einen
TS-gegen-Orakel-Layouttest gibt es noch nicht; er kommt mit dem ersten portierten Algorithmus.

## 4. Seam-Patches

Seam-Patches ändern das Orakel; sie sind selten und immer mit einem TS-Seam gepaart.

1. Im Orakel-Worktree (`$ELK_ORACLE_DIR`) bearbeiten und committen, oder den Patch in einem Scratch-Klon bei
   `ELK_COMMIT` verfassen. Um einen fertigen Patch an Ort und Stelle zum bestehenden Worktree hinzuzufügen (erhält die
   Caches `census/` und `sweep/`, die das Entfernen des Worktrees löscht), wenden Sie ihn mit der Identität von
   `build.sh` an:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` verifiziert dann die Serie und baut an Ort und Stelle neu (etwa 3 Minuten), sodass die Schritte 4-5
   entfallen können.
2. Exportieren:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (oder nur die neuen Commits). Die Dateien heißen `NNNN-<slug>.patch`; das numerische
   Präfix legt die Anwendungsreihenfolge fest.
3. Den passenden TS-Seam hinzufügen (gleiches Verhalten, injizierbar, in `src/`), mit Tests,
   deren erwartete Werte aus dem gepatchten Orakel stammen (AD-13).
4. Andernfalls den Worktree entfernen: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (`--force` hinzufügen, wenn Build-Ausgaben ihn verschmutzen).
5. Neu bauen: `tools/oracle/build.sh` (wendet die Serie von Grund auf neu an).
6. Regenerieren: `tools/oracle/regen-goldens.sh`; `git diff test/golden/refs` prüfen.
7. Einen Journaleintrag verfassen, der den Patch (`NNNN-<slug>.patch`) nennt und jeden
   geänderten Ref auflistet. `patches` in `_meta.json` hält die Serie automatisch fest.

Nie eine nicht committete Änderung im Worktree belassen: `build.sh` behandelt sie als veraltet
(Exit `2`). Nie `ELK_SOURCE_DIR` selbst bearbeiten.

## 5. Orakel-Betrieb (Runbook)

| Fehler                                                                          | Erkennung                                                                                                                                                                                                                                                                                                   | Gegenmaßnahme                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho-Build schlägt fehl (p2 nicht erreichbar, JDK, Maven-Version)              | `tools/oracle/build.sh` beendet sich ungleich null; die vollständige Maven-Ausgabe steht in `.oracle-build.log` im Repo-Stammverzeichnis. Exit `1` ist ein fehlendes Werkzeug oder falsches Maven; Exit `3` bedeutet, dass ein Bundle-Jar nicht erzeugt wurde                                               | Maven muss **3.9.x** sein: Tycho 4.0.12 scheitert an Maven 3.10 (Homebrews 3.10.0) mit `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Ein lokales 3.9.11 liegt in `.tools/apache-maven-3.9.11/` (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. JDK 21 verwenden, oder JDK 17 über `JAVA_HOME`. Netzwerk prüfen (der erste Lauf lädt p2-Artefakte herunter), dann erneut ausführen. `build.sh --record-only` überspringt Maven und schreibt nur `oracle-build.json` aus bereits gebauten Jars neu. Exit `2`: den Worktree entfernen (Abschnitt 4 Schritt 4) und neu bauen. Andernfalls mit dem Log-Ende eskalieren |
| `build.sh` beendet sich mit `2` direkt nach dem Anwenden eines Patches          | Worktree als veraltet gemeldet                                                                                                                                                                                                                                                                              | `build.sh` entfaltet umbrochene Patch-Betreffzeilen (`git format-patch` bricht diese ab etwa 78 Zeichen um) und ignoriert die nicht verfolgten Caches `census/` und `sweep/`; anderer Schmutz oder ein nicht aufgeführter Patch ergibt weiterhin Exit `2`: den Worktree reparieren (Abschnitt 4)                                                                                                                                                                                                                                                                                                                                                                                             |
| Golden-Drift nach einem Patch oder einer Commit-Anhebung                        | `tools/oracle/regen-goldens.sh` gefolgt von `git diff --exit-code test/golden/refs` ist nicht leer; `test/golden/oracle-refs.test.ts` schlägt bei einer veralteten `_meta.json` fehl (`elkCommit`, `modelsCommit`); ein TS-Konformitätstest schlägt, sobald vorhanden, mit einem `formatDiffs`-Bericht fehl | Neu bauen (`build.sh`), `regen-goldens.sh` ausführen, den Diff prüfen, die Patch-Id journalisieren. Nie einen Ref von Hand bearbeiten oder `tol` lockern                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Xtext-/ANTLR-Jar fehlt im p2-Cache (`.elkt`, `.elkr` oder jeder `run.sh`-Start) | `run.sh` beendet sich ungleich null mit `bundle <name> not in p2 cache <dir>` (z. B. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                                                   | `P2_BUNDLES` auf den Tycho-p2-Cache setzen, der es enthält, oder `build.sh` mit Netzwerkzugriff ausführen, damit Tycho es holt; `run.sh` erneut ausführen. Keine Jars von anderswo einsetzen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Sweep hängt oder OOM                                                            | Ein Fall läuft bis zum Timeout und meldet `timeout` (eine stderr-Zeile nennt ihn); ein Lauf ohne Ergebniszeile ergibt `oracle-error` und `sweep: shard <n> run <A or B> exited <code>` auf stderr; die Maschine swappt bei 8 gleichzeitigen JVMs                                                            | Nebenläufigkeit und Batch-Größe senken: `sweep.sh --shards 2`, mit `--filter` oder `--limit` eingrenzen. `ELK_SWEEP_TIMEOUT_MS` nur für ein Modell anheben, das langsam, aber korrekt ist. Ein reproduzierbares `timeout` ist ein Befund: die Fall-Id journalisieren, das Limit nicht aufweiten, um ihn zu verbergen                                                                                                                                                                                                                                                                                                                                                                         |
| Census-Drift nach einer Pin-Anhebung (`ELK_COMMIT` oder `commit` der Models)    | `npx tsx tools/corpus/census.ts` beendet sich mit `1` und listet die abweichenden Modelle auf; `test/corpus/census.test.ts` schlägt fehl                                                                                                                                                                    | Bestätigen, dass Klon und Orakel bei den neuen Pins stehen, `census.ts --write` erneut ausführen, `git diff test/corpus/census.json` prüfen, die Ursache journalisieren, dann `sweep.sh` erneut ausführen und den Paritätsbericht regenerieren. Nie den Census von Hand bearbeiten                                                                                                                                                                                                                                                                                                                                                                                                           |
| elk-models fehlt oder falscher sha                                              | Korpus-Tests werden mit einer Meldung übersprungen, die den erwarteten sha nennt; `regen-goldens.sh` beendet sich mit `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                    | `test/corpus/fetch.sh` ausführen (klont und checkt den fixierten Commit aus). Es beendet sich mit `2`, wenn ein vorhandener Klon bei einem anderen Commit steht, und berührt ihn nicht: diesen Klon selbst reparieren oder `ELK_MODELS_DIR` auf einen frischen Pfad setzen. Nie den HEAD eines bestehenden Klons aus einem Skript verschieben                                                                                                                                                                                                                                                                                                                                                |

Weitere `run.sh`-Fehler: `oracle-build.json missing` oder `oracle jar missing`
bedeutet, zuerst `build.sh` auszuführen; `bundle <name> not in p2 cache` bedeutet, `P2_BUNDLES`
auf den Tycho-p2-Cache zu setzen oder `build.sh` mit Netzwerkzugriff erneut auszuführen.

## 6. Gates

Jede Änderung:

| Gate               | Befehl                                                            | Kriterium                                                                         |
| ------------------ | ----------------------------------------------------------------- | --------------------------------------------------------------------------------- |
| Typen              | `npm run typecheck`                                               | Exit 0                                                                            |
| Tests und Coverage | `npm run coverage`                                                | alle Tests bestehen; 90 % Statements, Branches, Functions und Lines über `src/**` |
| Architektur        | `test/architecture/*.fitness.test.ts` (von `npm test` ausgeführt) | Modulgrenzen, Modul-Globals, keine Node-Builtins in `src/`, SPDX-Header           |
| Orakel-Refs        | `test/golden/oracle-refs.test.ts`                                 | eingecheckte Refs konsistent mit Manifest und `ELK_COMMIT`                        |

Änderungen an `tools/oracle/`, dem Manifest oder der Patch-Serie brauchen zusätzlich:

| Gate              | Befehl                                                                          | Kriterium                                                                        |
| ----------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Orakel-Build      | `tools/oracle/build.sh`                                                         | Exit 0                                                                           |
| Orakel-Lauf       | `tools/oracle/run.sh <outDir> <input.json>...`                                  | Exit 0, keine `ERROR`-Zeilen                                                     |
| Golden-Stabilität | `tools/oracle/regen-goldens.sh`, danach `git diff --exit-code test/golden/refs` | kein Diff, es sei denn, die Änderung soll Refs verschieben und ist journalisiert |
| Shell             | `shellcheck tools/oracle/*.sh`                                                  | sauber                                                                           |

Änderungen an `tools/oracle/` oder `tools/corpus/` brauchen zusätzlich:

| Gate                  | Befehl                                                                                 | Kriterium                                                          |
| --------------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Census                | `npx tsx tools/corpus/census.ts`                                                       | Exit 0 (keine Drift)                                               |
| Generierte Stabilität | `tools/oracle/regen-generated.sh`, danach `git diff --exit-code test/corpus/generated` | kein Diff                                                          |
| Sweep                 | `tools/oracle/sweep.sh` (oder `--filter`/`--limit` für eine Stichprobe)                | Exit 0: kein `oracle-error`                                        |
| Paritätsbericht       | `npx tsx tools/corpus/parity-report.ts`                                                | Exit 0 (eingecheckter Bericht aktuell); mit `--write` regenerieren |
