---
title: Überblick
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Überblick

`@knowvah/elk-engine` ist eine originalgetreue TypeScript-Portierung des [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), der Java-Bibliothek für Graphlayout. Es gibt kein Java und
kein WASM: Die Layoutalgorithmen sind in schlichtem TypeScript neu implementiert und gegen die
Java-Implementierung verifiziert.

::: warning Pre-1.0
Alle vorgesehenen ELK-Layoutalgorithmen sind portiert und gegen aus den Quellen gebautes ELK geprüft; die
Ergebnisse stehen im [Paritätsbericht](/parity). Die öffentliche Export-Oberfläche ist abgenommen, aber noch
nicht in `src/index.ts`, daher exportiert der Paketeinstieg noch nichts Öffentliches. Bis 1.0 kann sich die API
noch ändern. Was als Nächstes kommt, steht in der [Roadmap](/guide/roadmap).
:::

## Das Java ist die Spezifikation

Der Java-Quelltext am fixierten ELK-Commit `8bca22f4afa3371562d2f702d59929818f7f7b71` ist die
maßgebliche Spezifikation. Die Portierung folgt ihr eng:

- Algorithmen werden weder optimiert noch vereinfacht. Wirkt das Java redundant, bleibt die Redundanz erhalten.
- Jeder Zweig wird portiert, und Methodengrenzen bleiben erhalten, außer TypeScript erzwingt eine Änderung.
- Die JUnit-Tests werden zusammen mit dem Code portiert, den sie testen.
- Java-Laufzeitverhalten, auf das ELK sich stützt (32-Bit-Ganzzahlarithmetik, `HashMap`-Iterationsreihenfolge,
  `Random`-Sequenzen), wird durch Shims nachgebildet. Siehe [Java-Grundlagen](/de/guide/java-foundations).

Die [Übersetzungsregeln](/guide/translation-rules) listen auf, wie jedes Java-Konzept auf TypeScript abgebildet wird.

## Verifikation gegen ein Orakel

Das Orakel ist das Upstream-ELK, aus den Quellen gebaut, in einem losgelösten Git-Worktree am fixierten Commit.
Die Ausgaben der Portierung werden mit den Ausgaben des Orakels verglichen:

- IDs, Elementanzahlen, Kantenabschnitt-Topologie, Anzahl der Knickpunkte und nichtnumerische Werte müssen
  exakt übereinstimmen.
- Numerische Koordinaten und Größen müssen innerhalb einer absoluten Toleranz von `1e-6` übereinstimmen.

Ausgewählte Orakel-Ausgaben sind als Golden-Referenzen eingecheckt, sodass zum Ausführen der Tests keine JVM nötig ist.
Das vollständige Verfahren steht auf der Seite [Konformität](/de/conformance).

## Öffentlicher Vertrag

Die öffentliche API ist die in [#90](https://github.com/knowvah/elk-engine/issues/90) abgenommene
Export-Oberfläche: das ElkGraph-Objektmodell und die `ElkGraphUtil`-Factories, die Layout-Engine, der
Metadaten-Provider und die Optionen jedes Algorithmus samt ihren Werttypen sowie ELK JSON und die
textuellen Graphformate. ELK JSON ist ein E/A-Adapter, nicht das Kernmodell. [Erste Schritte](/guide/getting-started)
zeigt die Oberfläche im Einsatz. Die Versionen bleiben bis 1.0 bei 0.x; 1.0 friert die Oberfläche ein.

## Laufzeit-Einschränkungen

- `src/` ist browsersicher: keine Node-Built-ins, kein `process.env`, ausschließlich ES-Module.
- Es gibt keine Laufzeitabhängigkeiten.

## Wie es weitergeht

- [Architektur](/de/guide/architecture): wie das Orakel, die Bundles und die Layout-Engine zusammenspielen.
- [Portierungskarte](/guide/port-map) und [Inventar](/guide/inventory): welche Java-Pakete auf welche Module
  abgebildet werden.
- [Mitwirken](/de/guide/contributing): Gates und Arbeitsablauf.
