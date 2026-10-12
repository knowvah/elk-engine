---
title: Überblick
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Überblick

`@knowvah/elk-engine` ist eine originalgetreue TypeScript-Portierung des [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), der Java-Bibliothek für Graphlayout. Es gibt kein Java und
kein WASM: Die Layoutalgorithmen sind in schlichtem TypeScript neu implementiert und gegen die
Java-Implementierung verifiziert.

::: warning Pre-Alpha
Noch kein Layoutalgorithmus ist portiert. Das Repository enthält die Toolchain, die Architekturdokumente,
das Verifikationsgerüst und die Java-Laufzeit-Shims. `src/index.ts` exportiert noch nichts Öffentliches.
Die Reihenfolge, in der Algorithmen hinzukommen, steht in der [Roadmap](/guide/roadmap).
:::

## Das Java ist die Spezifikation

Der Java-Quelltext am fixierten ELK-Commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` ist die
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

Die öffentliche API wird das ElkGraph-Objektmodell plus die `ElkGraphUtil`-Factories sein. ELK JSON ist ein
E/A-Adapter, nicht das Kernmodell. Das erste npm-Publish friert diese Oberfläche ein.

## Laufzeit-Einschränkungen

- `src/` ist browsersicher: keine Node-Built-ins, kein `process.env`, ausschließlich ES-Module.
- Es gibt keine Laufzeitabhängigkeiten.

## Wie es weitergeht

- [Architektur](/de/guide/architecture): wie das Orakel, die Bundles und die Layout-Engine zusammenspielen.
- [Portierungskarte](/guide/port-map) und [Inventar](/guide/inventory): welche Java-Pakete auf welche Module
  abgebildet werden.
- [Mitwirken](/de/guide/contributing): Gates und Arbeitsablauf.
