---
title: Überblick
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Überblick

`@knowvah/elk-engine` ist eine originalgetreue TypeScript-Portierung des [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), der Java-Bibliothek für Graphlayout. Es gibt kein Java und
kein WASM: Die Layoutalgorithmen sind in schlichtem TypeScript neu implementiert und gegen die
Java-Implementierung verifiziert.

::: tip Version 1.0
`@knowvah/elk-engine@1.0.0` ist auf npm. Alle vorgesehenen ELK-Layoutalgorithmen sind portiert und gegen aus den
Quellen gebautes ELK geprüft; die Ergebnisse stehen im [Paritätsbericht](/parity), noch offene Abweichungen werden
als Issues verfolgt. Die öffentliche API, 72 Exporte, ist ab 1.0.0 eingefroren, und die Versionen folgen semver.
Beginnen Sie mit [Erste Schritte](/guide/getting-started). Was als Nächstes kommt, steht in der
[Roadmap](/guide/roadmap).
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
Das vollständige Verfahren steht auf der Seite [Konformität](/conformance).

## Öffentlicher Vertrag

Die öffentliche API ist die in [#90](https://github.com/knowvah/elk-engine/issues/90) abgenommene
Export-Oberfläche, 72 Exporte: das ElkGraph-Objektmodell und die `ElkGraphUtil`-Factories, die Layout-Engine, der
Metadaten-Provider und die Optionsklasse jedes Algorithmus, die Werttypen der Kernoptionen, der ELK-JSON-Adapter und
die asynchrone Funktion `layout`. ELK JSON ist ein E/A-Adapter, nicht das Kernmodell.
[Erste Schritte](/guide/getting-started) zeigt die Oberfläche im Einsatz. Die Oberfläche ist ab 1.0.0 eingefroren,
und die Versionen folgen semver: Das Entfernen eines Exports ist eine Hauptversion.

## Laufzeit-Einschränkungen

- `src/` ist browsersicher: keine Node-Built-ins, kein `process.env`, ausschließlich ES-Module.
- Es gibt keine Laufzeitabhängigkeiten.

## Wie es weitergeht

- [Architektur](/de/guide/architecture): wie das Orakel, die Bundles und die Layout-Engine zusammenspielen.
- [Portierungskarte](/guide/port-map) und [Inventar](/guide/inventory): welche Java-Pakete auf welche Module
  abgebildet werden.
- [Mitwirken](/de/guide/contributing): Gates und Arbeitsablauf.
