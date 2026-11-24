---
title: Architektur
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Architekturüberblick von elk-engine

| Dokument                                                                                                               | Inhalt                                                                                                                                                       |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                                                                                       | Jedes ELK-Bundle: Zweck, LOC, generierte Quellen, Umfang                                                                                                     |
| [port-map.md](/guide/port-map)                                                                                         | Abbildung der Java-Pakete auf Module in `src/`                                                                                                               |
| [component-map.md](#komponentenkarte)                                                                                  | Bundle-Abhängigkeiten im Umfang; Kernbestandteile der Laufzeit                                                                                               |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Regeln von Java zu TypeScript                                                                                                                                |
| [../conformance.md](/conformance)                                                                                      | Vergleichsmaßstab und Verfahren des Orakels (folgt später in dieser Mission)                                                                                 |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | ELK-Text-Portierung (`.elkt`), die Xtext-Teilmenge, Runbook und Zurückstellungen                                                                             |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | ELK-Textual-JSON-Portierung (`.elkj`), lazy Linking, Runbook und Zurückstellungen                                                                            |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portierung des grandom-Zufallsgraph-Generators (`.elkr`), Belege und Runbook                                                                                 |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Layout-Engine und die Provider fixed, box und random (Mission 5a)                                                                                            |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | Der `.melk`-Generator, ausstehende Typen, träge Konstanten, Neugenerierung                                                                                   |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Das Komplexitäts-Gate, das jede Funktion misst (`npm run complexity`)                                                                                        |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered-Framework (Mission 7a): LGraph-Modell, Transformation, gestufte Klassen, Runbook                                                                     |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered-Knotenplatzierung (Mission 7d): p4nodes, Brandes-Köpf, fünf Prozessoren, Geometriezeilen, Runbook                                                    |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered-Kantenführung (Mission 7e): p5edges orthogonal, polyline, splines, sechs Prozessoren, Routing-Zeilen, Runbook                                        |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered-Pipeline (Mission 7f): `ElkLayered`, `GraphConfigurator`, Komponenten, vier Prozessoren, Zeilen ganzer Layouts, Teilmenge des Runners, Runbook       |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered-Labels (Mission 7f2): Label- und Kommentarprozessoren, Unzipping, Debug-Ausgabe, Visitor, Label-Zeilen, Sweep, Runbook                               |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered-Selbstschleifen, Wrapping, Kompaktierung (Mission 7g): Paket loops, Breaking Points, 1D-Kompaktierung, `ComponentsCompactor`, Zeilen, Sweep, Runbook |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered-Verbundgraphen (Mission 7h): Paket `compound`, hierarchischer Treiber, Stopps über den ganzen Baum, Goldens, Sweep, Hash-Order-Zwillinge, Runbook    |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS-Sweep gegen das Orakel (Zeile 9): Runner mit Shards, Summary-Vertrag, Annotationen, Bericht, Runbook                                                      |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Austauschbare Messung von Label-Text (Zeile 10): Patch 0003, der TS-Zwilling, Fixed-Modus, Belege, Runbook                                                   |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Verschieben des ELK-Pins (Zeile 13): Netto-Diff-Triage, Patch-Serie, Neuaufbau, Neuaufzeichnung, Sweeps, Ref-Diff-Triage, Rehearsal-Modus                    |

## Was elk-engine ist

`@knowvah/elk-engine` ist eine originalgetreue TypeScript-Portierung des Eclipse Layout Kernel (ELK). Das Java
am fixierten Commit `8bca22f4afa3371562d2f702d59929818f7f7b71` ist die Spezifikation (AD-1, AD-2). Es ist eine
Bibliothek: browsersicher, ohne Laufzeitabhängigkeiten, ohne Java oder WASM. Ihr öffentlicher Vertrag ist das
ElkGraph-Objektmodell plus `ElkGraphUtil`-Factories; ELK JSON ist ein E/A-Adapter (AD-14). Dreizehn Bundles mit
insgesamt etwa 134.600 handgeschriebenen Zeilen liegen im Umfang (siehe das Inventar). Aktueller Stand:
die Layout-Engine (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) und die drei
Kernprovider `fixed`, `box` und `random` sind portiert und entsprechen dem Orakel an den kuratierten Goldens
(Mission 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Der Rest von `core` ist ebenfalls portiert (Mission 5b: Prozessor-Pipeline, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, Splines, Kommentaranbindung; siehe [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). Das gemeinsame Bundle `alg.common` ist vollständig portiert (Mission 6a: Geometrie, Netzwerk-Simplex, 1D-Kompaktierung, Überlappungen, spore, polyomino; Mission 6b: `nodespacing` und `NodeMicroLayout`, belegt durch einen Orakel-Replay mit 326 Zeilen; siehe [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Das Layered-Framework ist portiert (Mission 7a: das Optionspaket, das LGraph-Modell, die Transformation ElkGraph ↔ LGraph und die Provider-Hülle, belegt durch zwei Orakel-Vektordateien mit 272 und 330 Zeilen; die Layout-Phasen folgen in 7b–7h; siehe [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Seine ersten beiden Phasen sind portiert (Mission 7b: die elf Zyklenbrecher, die neun Layerer und die zehn Prozessoren darum, belegt durch 651 Orakel-Phasenzeilen und einen Sweep mit 32.652 Fällen; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Seine dritte Phase ist portiert (Mission 7c: Kreuzungsminimierung mit ihren Zählern, dem Greedy-Switch, den Model-Order-Komparatoren und den acht Prozessoren zwischen P2 und P3, belegt durch 808 Orakel-Reihenfolgezeilen und einen Sweep mit 6.728 Fällen; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Seine vierte Phase ist portiert (Mission 7d: die vier Knotenplatzierer mit Brandes-Köpf und die fünf Prozessoren, die ein P4-Stopp braucht, belegt durch 610 Orakel-Platzierungszeilen mit Geometrie und einen Sweep mit 8.410 Fällen; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Seine fünfte Phase ist portiert (Mission 7e: die orthogonalen, polyline- und Spline-Router mit den sechs Prozessoren, die ein geführtes Ergebnis braucht, belegt durch 950 Orakel-Routingzeilen mit Kantengeometrie und einen Sweep mit 6.728 Fällen; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). Die Layered-Pipeline läuft (Mission 7f: der Treiber, das Paket der zusammenhängenden Komponenten, der Richtungstransformator, der Router für hierarchische Ports und drei Prozessoren, belegt durch 1.311 Orakel-Zeilen ganzer Layouts und Stopps, einen Re-Replay der früheren Zeilen durch den echten Treiber mit 2.351 Zeilen, 28 portierte JUnit-Suiten und einen Sweep mit 6.646 Fällen; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). Layouts mit Labels und Kommentaren, Layer-Unzipping und ein Logging-Monitor laufen ebenfalls (Mission 7f2: die Label-Familie, die Kommentarprozessoren, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` und die Debug-Werkzeuge, belegt durch 1.305 Orakel-Zeilen von Stopps und ganzen Layouts, die 11 JUnit-Basis-Suiten und einen Sweep mit 1.105 Fällen, dessen 935 ok-Fälle exakt übereinstimmen; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). Auch Selbstschleifen, Graph-Wrapping und Kompaktierung laufen (Mission 7g: das Paket loops, die vier Selbstschleifen-Prozessoren, die Wrapper für Breaking Points und Einzelkanten, `HorizontalGraphCompactor`, das Layered-Paket `compaction` und `ComponentsCompactor`, belegt durch 1.642 Orakel-Zeilen (`full` 731, `models` 307, `scenarios` 525, `sites` 79), die 10 JUnit-Basis-Suiten, einen Sweep mit 3.073 Fällen, dessen 2.997 ok-Fälle exakt übereinstimmen und dessen 76 Würfe auf beiden Seiten übereinstimmen, und die Verdrahtung mit neun Armen, die 58 portierte Arme übrig lässt; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). Auch Verbundgraphen laufen (Mission 7h: das Paket `compound`, `HierarchicalNodeResizingProcessor` und der letzte Arm, belegt durch 540 Orakel-Zeilen (`full` 355, `models` 73 mit Stopps über den ganzen Baum, `scenarios` 88, `sites` 24), 24 Layered-Goldens, die neun Issue-Suiten und drei graph.json-Methoden, einen Sweep mit 1.169 Fällen, dessen 1.164 ok-Fälle exakt übereinstimmen und dessen 5 Würfe auf beiden Seiten übereinstimmen; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). Der Layered-Algorithmus läuft jetzt in jedem Modus der Hierarchiebehandlung: 59 Enum-Arme sind portiert, keiner steht aus, und die Liste der gestuften Arme ist leer. Die drei `elk.stress`-Fälle von Issue #58 warteten auf Mission 8b und laufen, seit deren Entscheidung umgesetzt wurde (Mission layered-stress-cases). Kein anderer Layoutalgorithmus läuft bisher (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Seit Mission 8a laufen auch mrtree, radial und vertiflex (belegt durch 1.181 Orakel-Zeilen in vier Refs ganzer Layouts und Stopps, eine Unit-Vektor-Ref mit 2.656 Zeilen, 40 `trees`-Goldens, `MrTreeGraphSizeTest` und `CenterOnRootTest` mit 6/6 und 2/2 sowie einen Sweep mit 906 Fällen je Algorithmus, in dem jeder Fall entweder übereinstimmt oder diagnostiziert ist; zwei radial-Zeilen, deren Ergebnis von der Reihenfolge eines treeifizierten Hash-Bins abhängt, sind klassifiziert, nicht abgeglichen; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Seit Mission 8b laufen auch force, stress und disco (belegt durch 21.420 Orakel-Zeilen in drei Refs ganzer Layouts und Stopps, 45 `force-disco`-Goldens, `ForceImportTest` und `TwoBitGridTest` mit je 3/3 sowie einen Sweep je Algorithmus, in dem jeder Fall entweder übereinstimmt oder diagnostiziert ist; das `Math.log` von Eades ist ein bitgenauer fdlibm-Port; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Seit Mission 8c laufen auch rectpacking, spore (`sporeOverlap`, `sporeCompaction`) und topdownpacking (belegt durch 2.593 Orakel-Zeilen in drei Refs, 44 `packing`-Goldens, die acht portierten JUnit-Suiten mit 30 Läufen und einen Sweep je Algorithmus, in dem jeder deterministische Fall übereinstimmt oder diagnostiziert ist; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Jeder Algorithmus im Umfang wird gegen das Orakel gesweept, und das Ergebnis je Algorithmus wird im Paritätsbericht veröffentlicht ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Beziehung zu ELK Java und zum Orakel

![Beziehung zwischen ELK Java, dem Orakel-Build, den Golden-Referenzen und elk-engine](/diagrams/overview-1.svg)

Die Patch-Serie ist in dieser Mission leer (AD-3). Goldens sind eingecheckt, daher braucht die CI keine JVM
(AD-5). Vergleich: Struktur exakt, Koordinaten innerhalb von 1e-6 (AD-4).

## Zentrale Abläufe

Layout in ELK, das elk-engine heute für `fixed`, `box` und `random` nachbildet (Details in
[component-map.md](#komponentenkarte) und [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Ablauf eines Layoutaufrufs durch die rekursive Layout-Engine](/diagrams/overview-2.svg)

JSON-Adapter (`graph.json`, `ElkGraphJson`): ELK JSON wird vor dem Layout vom Importer zu einem ElkGraph; nach dem
Layout werden die berechneten Koordinaten und Kantenabschnitte zurück in die JSON-Ausgabe übertragen. Das
Orakel-Harness nutzt den Java-Adapter in denselben zwei Schritten, sodass beide Seiten den JSON-Vertrag teilen.

Text-Adapter (`graph.text`, `ElkGraphText`): `.elkt`-Text wird durch einen handgeschriebenen Parser, Linker und
Validator, aufgebaut auf einer kleinen Xtext-Teilmenge (`src/xtext`), in einen ElkGraph geladen, und ein ElkGraph
wird zurück nach `.elkt` serialisiert. Der Einstiegspunkt ist intern; siehe [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Textual-JSON-Adapter (`graph.json.text`, `ElkGraphJsonText`): `.elkj`-Text wird über dieselbe Xtext-Teilmenge mit
einem handgeschriebenen Parser geladen und linkt lazy wie der `LazyLinker` von Xtext: Kantenendpunkte sind
EMF-Proxys (`src/emf`), die beim Lesen aufgelöst werden. Ein ElkGraph wird über einen grammatikspezifischen Writer
zurück nach `.elkj` serialisiert. Der Einstiegspunkt ist intern; siehe [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Zufallsgraph-Generator (`core.debug.grandom`, `GRandomText`): `.elkr`-Text wird durch einen handgeschriebenen Lexer
und Parser auf derselben Xtext-Teilmenge (`src/xtext`) geparst, und `RandomGraphGenerator` macht aus einer
Konfiguration ElkGraphs mit der exakten JVM-`Random`-Folge. Ausgabe mit Seed ist byteexakt gegen das Orakel und
reproduziert die neun Dateien `test/corpus/generated/*.json`; Pfade ohne Seed (Text von Kantenlabels,
hierarchieübergreifendes Mischen, ein fehlender Seed) werden nur durch Invarianten geprüft. Der Einstiegspunkt ist
intern; siehe [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Dokumentations- und Release-Werkzeugkette

Hinzugefügt durch Roadmap-Zeile 12; Entscheidungen DP1 bis DP9 in
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` wurde am 2026-11-23 veröffentlicht.

| Baustein          | Was es ist                                                                                                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Export-Oberfläche | Akzeptiert (2026-11-23), aufgelistet in [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) und durch `src/index.test.ts` gleich `src/index.ts` gehalten; eingefroren bei `1.0.0`, dem ersten npm-Publish (AD-14) |
| API-Referenz      | `npm run docs:api`: typedoc im privaten Paket `tools/typedoc/` mit eigenem TypeScript 6 (typedoc hat kein TypeScript-7-Release, AD-6), in das generierte `/reference/`                                                                                         |
| Beispiele         | `test/docs/examples/*.ts`, auf der Getting-started-Seite der Site als Snippets gezeigt und mit Orakel-Refs verglichen (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                    |
| Link-Prüfung      | `npm run docs:linkcheck`: linkinator über die gebaute Site, interne Links und Fragmente, in der CI; externe Links wöchentlich (`links.yml`)                                                                                                                    |
| Pack-Probelauf    | `npm run pack:smoke`: packen, die Dateiliste prüfen, offline in ein sauberes Projekt installieren, importieren, dort ein Beispiel layouten und mit seiner Orakel-Ref vergleichen                                                                               |
| Release           | semantic-release-Konfiguration und `release.yml`, bei jedem Push auf `main` ausgeführt; Runbook in [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                            |

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

Portiert durch Mission 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (aufgeteilt mit
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` und die `AbstractLayoutProvider`-Unterklassen
`FixedLayoutProvider`, `BoxLayoutProvider` und `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
und die Property-Typen kamen früher (Missionen 2 und 3). Mission 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) vervollständigte das Bundle: `AlgorithmAssembler` und
`LayoutProcessorConfiguration` (die Pipeline, die jedes Algorithmus-Bundle nutzt), `LayoutConfigurator`, `ElkSpacings`, die
`ElkMath`-Abschnitte, `ElkGraphAdapters`, `util/selection/*` und `comments/*`. Ihre JDK-Shims sind `src/java/awt/geom`
(`Rectangle2D`) und `src/java/util/regex` (`Pattern`, `WordBoundary`), neben `JavaCharacter` in `src/java/lang`;
sie sind durch `awt.json`, `regex.json`, `character.json` und `regex-boundary.json` belegt. Die Missionen 6a und 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portierten ganz `alg.common`; 6b fügte `nodespacing` und `NodeMicroLayout` hinzu, belegt durch einen `NodeMicroLayout`-Orakel-Replay mit 326 Zeilen.

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

In elk-engine wird der `.melk`-Schritt durch einen Generator ersetzt (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) und ElkGraph wird zu
schlichten TS-Klassen (AD-11). Abbildung auf TS-Dateien: [Portierungskarte](/guide/port-map); Regeln:
[Übersetzungsregeln](/guide/translation-rules).
