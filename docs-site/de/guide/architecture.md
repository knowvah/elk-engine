---
title: Architektur
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Architekturüberblick von elk-engine

| Dokument                                            | Inhalt                                                                       |
| --------------------------------------------------- | ---------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Jedes ELK-Bundle: Zweck, LOC, generierte Quellen, Umfang                     |
| [port-map.md](/guide/port-map)                      | Abbildung der Java-Pakete auf Module in `src/`                               |
| [component-map.md](#komponentenkarte)               | Bundle-Abhängigkeiten im Umfang; Kernbestandteile der Laufzeit               |
| [../translation-rules.md](/guide/translation-rules) | Regeln von Java zu TypeScript                                                |
| [../conformance.md](/de/conformance)                | Vergleichsmaßstab und Verfahren des Orakels (folgt später in dieser Mission) |

## Was elk-engine ist

`@knowvah/elk-engine` ist eine originalgetreue TypeScript-Portierung des Eclipse Layout Kernel (ELK). Das Java
am fixierten Commit `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` ist die Spezifikation (AD-1, AD-2). Es ist eine
Bibliothek: browsersicher, ohne Laufzeitabhängigkeiten, ohne Java oder WASM. Ihr öffentlicher Vertrag ist das
ElkGraph-Objektmodell plus `ElkGraphUtil`-Factories; ELK JSON ist ein E/A-Adapter (AD-14). Dreizehn Bundles mit
insgesamt etwa 134.600 handgeschriebenen Zeilen liegen im Umfang (siehe das Inventar). Diese Mission liefert nur
das Gerüst: Noch kein Layoutalgorithmus ist portiert.

## Beziehung zu ELK Java und zum Orakel

![Beziehung zwischen ELK Java, dem Orakel-Build, den Golden-Referenzen und elk-engine](/diagrams/overview-1.svg)

Die Patch-Serie ist in dieser Mission leer (AD-3). Goldens sind eingecheckt, daher braucht die CI keine JVM
(AD-5). Vergleich: Struktur exakt, Koordinaten innerhalb von 1e-6 (AD-4).

## Zentrale Abläufe

Layout in ELK, das elk-engine nachbildet (Details in [component-map.md](#komponentenkarte)):

![Ablauf eines Layoutaufrufs durch die rekursive Layout-Engine](/diagrams/overview-2.svg)

JSON-Adapter (`graph.json`, `ElkGraphJson`): ELK JSON wird vor dem Layout vom Importer zu einem ElkGraph; nach dem
Layout werden die berechneten Koordinaten und Kantenabschnitte zurück in die JSON-Ausgabe übertragen. Das
Orakel-Harness nutzt den Java-Adapter in denselben zwei Schritten, sodass beide Seiten den JSON-Vertrag teilen.

## Technologie-Stack

| Belang         | Wahl                                                         |
| -------------- | ------------------------------------------------------------ |
| Sprache        | TypeScript 7.0.2 (natives `tsc`), ES2022, NodeNext, `strict` |
| Tests          | vitest 5.0.x mit `@vitest/coverage-v8` (Schwellen von 90 %)  |
| Bündelung      | esbuild 0.28.x                                               |
| Skript-Runner  | tsx                                                          |
| Laufzeit       | Node 22 oder neuer; `src/` selbst ist browsersicher          |
| Nur für Orakel | Maven 3.9+ und JDK 21 (Rückfall JDK 17) für ELKs Tycho-Build |

## Fitness-Beschränkungen (AD-8)

Die Importrichtung der Bundles folgt `test/architecture/bundle-deps.json`; SPDX-Header in jeder Codedatei; keine
Node-Built-ins oder `process.env` in `src/`; kein modulweites veränderliches `let` außerhalb der Allowlist.

# Komponentenkarte

| Diagramm                 | Zeigt                                                     |
| ------------------------ | --------------------------------------------------------- |
| 1. Bundle-Abhängigkeiten | Die 13 Bundles im Umfang und ihre `Require-Bundle`-Kanten |
| 2. Kernlaufzeit          | Wie sich ein Layoutalgorithmus in die Engine einklinkt    |

Namen lassen das Präfix `org.eclipse.elk.` weg. Umfang: [Inventar](/guide/inventory).

## 1. Bundle-Abhängigkeiten im Umfang

Maßgebliche Quelle: `test/architecture/bundle-deps.json`, abgeleitet aus der `META-INF/MANIFEST.MF` jedes Bundles
durch `tools/bundle-deps.ts` und vom Fitness-Test erzwungen (AD-8).
Das Diagramm hat **32 Kanten**, gleich den 32 `requires`-Einträgen im JSON (graph.json x 2,
core x 1, alg.common x 2, neun Algorithmen x 3). Fremdanforderungen (Guava, EMF, Gson, Xtend-Bibliotheken) und
Bundles außerhalb des Umfangs sind weggelassen. Ein Pfeil `A --> B` bedeutet, dass A B benötigt, sodass das
Verzeichnis von B vom Verzeichnis von A importiert werden darf. `src/java` ist überall importierbar und nicht
dargestellt.

![Abhängigkeiten zwischen den 13 ELK-Bundles im Umfang](/diagrams/component-map-1.svg)

Kein Algorithmus benötigt einen anderen Algorithmus: Die einzige gemeinsame Abhängigkeit unter den Algorithmen ist
`alg.common`. Ein neuer Import zwischen Algorithmus-Verzeichnissen lässt den Fitness-Test fehlschlagen, sofern das
Java-Manifest nicht dieselbe Kante hat.

## 2. Bestandteile der Kernlaufzeit

Klassenpfade liegen unter `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`,
sofern nicht anders angegeben; am fixierten Commit verifiziert.

| Klasse                            | Pfad                                | Rolle                                                                  |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                 |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Durchläuft die Hierarchie, führt den Provider je Ebene aus             |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Basisklasse jedes Algorithmus; implementiert `IGraphLayoutEngine`      |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Singleton-Registry für Algorithmus-, Options- und Kategoriedaten       |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; einer je Algorithmus-Bundle generiert (aus `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algorithmus-ID plus `getInstancePool()` der Provider                   |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Typisierte Optionsschlüssel und der Map-Halter hinter `getProperty`    |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Graphmodell; Elemente sind `EMapPropertyHolder`                        |

![Klassenbeziehungen der ELK-Kernlaufzeit](/diagrams/component-map-2.svg)

Wie sich ein Algorithmus einklinkt:

1. Das Algorithmus-Bundle liefert eine Unterklasse von `AbstractLayoutProvider` (zum Beispiel
   `LayeredLayoutProvider` aus `alg.layered`) und eine `.melk`-Datei, die ID, Optionen und unterstützte
   Funktionen deklariert.
2. Der `.melk`-Compiler generiert einen `ILayoutMetaDataProvider` und eine Optionsklasse. Dessen
   `apply(Registry)` registriert ein `LayoutAlgorithmData`, dessen Instanzpool den Provider erzeugt.
3. `LayoutMetaDataService` sammelt die Provider. `LayoutAlgorithmResolver` setzt die Algorithmus-ID
   auf jedem Knoten aus der Option `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` holt einen Provider aus dem
   `LayoutAlgorithmData.getInstancePool()` des Knotens und ruft `layout(layoutNode, progressMonitor)` auf, dann
   gibt sie ihn frei (oder ruft nach einem Fehler `dispose()` auf).

In elk-engine wird der `.melk`-Schritt durch einen Generator ersetzt (AD-12, künftige Mission) und ElkGraph wird zu
schlichten TS-Klassen (AD-11). Abbildung auf TS-Dateien: [Portierungskarte](/guide/port-map); Regeln:
[Übersetzungsregeln](/guide/translation-rules).
