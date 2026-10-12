---
title: Mitwirken
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Mitwirken

Lesen Sie zuerst [Überblick](/de/guide/overview) und [Übersetzungsregeln](/guide/translation-rules). Das Java
am fixierten Commit ist die Spezifikation; im Zweifel lesen Sie das Java.

## Gates

Führen Sie diese vor jedem Commit aus. Jedes muss bestehen.

| Befehl                 | Prüft                                                                  |
| ---------------------- | ---------------------------------------------------------------------- |
| `npm run format:check` | Prettier-Formatierung                                                  |
| `npm run typecheck`    | TypeScript-Typprüfung (natives `tsc --noEmit`)                         |
| `npm test`             | Die vitest-Suite, einschließlich der Golden-Suite                      |
| `npm run coverage`     | Die Suite mit 90 % Zeilen-, Zweig-, Funktions- und Statement-Abdeckung |

Erfordert Node 22 oder neuer. Installieren Sie die Abhängigkeiten mit `npm ci`.

## Tests sind unveränderlich

Erwartete Werte stammen aus dem Orakel, den JVM-Vektoren oder dem Java-Quelltext, bevor die Implementierung
geschrieben wird (AD-13). Einmal geschrieben, ist eine Assertion eingefroren: Ein fehlschlagender Test bedeutet,
dass die Implementierung falsch ist.

Kann ein Test nur durch Ändern seiner Assertion, eines Vektors oder eines Goldens bestehen, halten Sie an und
halten Sie den Fall im Entscheidungsjournal der Mission fest. Lockern Sie keine Toleranz, löschen Sie keinen Fall
und erzeugen Sie keine Referenz neu, nur um grün zu werden. Golden-Referenzen werden per Skript neu erzeugt, nie von Hand.

## Arbeitsablauf

1. Legen Sie einen Feature-Branch an, zum Beispiel `feature/<short-description>`.
2. Schreiben Sie Commit-Nachrichten als [Conventional Commits](https://www.conventionalcommits.org), zum Beispiel
   `feat(java): add JavaHashMap`. Betreffzeilen sind kleingeschrieben und höchstens 72 Zeichen lang.
3. Öffnen Sie einen Pull Request gegen `main`. Die CI prüft den Titel des Pull Requests als Conventional Commit.
4. Commits müssen signiert sein; das Repository-Regelwerk verlangt es.
5. Pull Requests werden mit einem Merge-Commit gemergt.

Jede Codedatei trägt einen SPDX-Header, `// SPDX-License-Identifier: EPL-2.0`. Ein Fitness-Test erzwingt ihn.
Abhängigkeiten müssen mit EPL-2.0 kompatibel sein.

## Dokumentationsbefehle

| Befehl                 | Zweck                                                                |
| ---------------------- | -------------------------------------------------------------------- |
| `npm run docs:dev`     | Startet die Dokumentationsseite mit Live-Reload                      |
| `npm run docs:build`   | Baut die Seite; ein toter interner Link lässt den Build fehlschlagen |
| `npm run docs:preview` | Stellt die gebaute Seite lokal bereit                                |

Die meisten Referenzseiten binden Dateien aus `docs/` ein. Bearbeiten Sie die Datei in `docs/`, nicht die Seite
unter `docs-site/`. PlantUML-Diagramme in den eingebundenen Dateien werden zu SVG gerendert und unter
`docs-site/public/diagrams/` eingecheckt.

## Externe Verzeichnisse

Skripte und Tests finden danebenliegende Checkouts über Umgebungsvariablen. Die Standardwerte sind relativ zum
Repository-Stamm. Nur `tools/` und `test/` lesen diese Variablen; Code in `src/` tut es nie.

| Variable         | Standard                       | Inhalt                                            |
| ---------------- | ------------------------------ | ------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Eclipse-ELK-Java-Quelltext am fixierten Commit    |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Losgelöster Worktree und gebautes Orakel          |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Der elk-models-Korpus, im Korpus-Manifest fixiert |

Der Orakel-Build erfordert Maven 3.9 oder neuer und JDK 21 (als Rückfall JDK 17). Das Orakel-Verfahren steht unter
[Konformität](/de/conformance).
