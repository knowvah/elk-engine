---
title: Architettura
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Panoramica dell'architettura di elk-engine

| Documento                                           | Contenuto                                                                            |
| --------------------------------------------------- | ------------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                    | Ogni bundle ELK: scopo, LOC, sorgenti generati, ambito                               |
| [port-map.md](/guide/port-map)                      | Mappatura dei pacchetti Java sui moduli di `src/`                                    |
| [component-map.md](#mappa-dei-componenti)           | Dipendenze dei bundle in ambito; componenti centrali del runtime                     |
| [../translation-rules.md](/guide/translation-rules) | Regole da Java a TypeScript                                                          |
| [../conformance.md](/it/conformance)                | Soglia e procedura di confronto con l'oracolo (arriva più avanti in questa missione) |

## Che cos'è elk-engine

`@knowvah/elk-engine` è un porting fedele in TypeScript dell'Eclipse Layout Kernel (ELK). Il Java
al commit fissato `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` è la specifica (AD-1, AD-2). È una
libreria: sicura per il browser, zero dipendenze di runtime, niente Java né WASM. Il suo contratto pubblico è il
modello a oggetti ElkGraph più le factory `ElkGraphUtil`; ELK JSON è un adattatore di I/O (AD-14). Tredici
bundle per circa 134.600 righe scritte a mano sono in ambito (vedi l'inventario). Questa missione
consegna solo l'impalcatura: nessun algoritmo di layout è ancora portato.

## Relazione con ELK Java e con l'oracolo

![Relazione tra ELK Java, la compilazione dell'oracolo, i riferimenti golden ed elk-engine](/diagrams/overview-1.svg)

La serie di patch è vuota in questa missione (AD-3). I golden sono committati, quindi la CI non ha bisogno di una JVM
(AD-5). Confronto: struttura esatta, coordinate entro 1e-6 (AD-4).

## Flussi principali

Il layout in ELK, che elk-engine riproduce (dettagli in [component-map.md](#mappa-dei-componenti)):

![Flusso di una chiamata di layout attraverso il motore di layout ricorsivo](/diagrams/overview-2.svg)

Adattatore JSON (`graph.json`, `ElkGraphJson`): l'ELK JSON in ingresso diventa un ElkGraph tramite l'importatore
prima del layout; dopo il layout, le coordinate calcolate e le sezioni degli archi vengono trasferite di nuovo
nel JSON in uscita. L'harness dell'oracolo usa l'adattatore Java negli stessi due passaggi, quindi entrambi i lati
condividono il contratto JSON.

## Stack tecnologico

| Aspetto             | Scelta                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| Linguaggio          | TypeScript 7.0.2 (`tsc` nativo), ES2022, NodeNext, `strict`               |
| Test                | vitest 5.0.x con `@vitest/coverage-v8` (soglie del 90%)                   |
| Bundling            | esbuild 0.28.x                                                            |
| Esecutore di script | tsx                                                                       |
| Runtime             | Node 22 o successivo; `src/` stesso è sicuro per il browser               |
| Solo per l'oracolo  | Maven 3.9+ e JDK 21 (alternativa JDK 17) per la compilazione Tycho di ELK |

## Vincoli di fitness (AD-8)

La direzione degli import tra bundle segue `test/architecture/bundle-deps.json`; intestazione SPDX in ogni file di
codice; nessun built-in di Node né `process.env` in `src/`; nessun `let` mutabile a livello di modulo al di fuori
della allowlist.

# Mappa dei componenti

| Diagramma                | Mostra                                                |
| ------------------------ | ----------------------------------------------------- |
| 1. Dipendenze dei bundle | I 13 bundle in ambito e i loro archi `Require-Bundle` |
| 2. Runtime centrale      | Come un algoritmo di layout si innesta nel motore     |

I nomi omettono il prefisso `org.eclipse.elk.`. Ambito: [inventario](/guide/inventory).

## 1. Dipendenze dei bundle in ambito

Fonte di verità: `test/architecture/bundle-deps.json`, derivato dal `META-INF/MANIFEST.MF` di ciascun bundle
da `tools/bundle-deps.ts` e imposto dal test di fitness (AD-8).
Il diagramma ha **32 archi**, pari alle 32 voci `requires` nel JSON (graph.json x 2,
core x 1, alg.common x 2, nove algoritmi x 3). I requisiti di terze parti (Guava, EMF, Gson, librerie Xtend)
e i bundle fuori ambito sono omessi. Una freccia `A --> B` significa che A richiede B, quindi la
directory di B può essere importata dalla directory di A. `src/java` è importabile ovunque e non è
mostrato.

![Dipendenze tra i 13 bundle ELK in ambito](/diagrams/component-map-1.svg)

Nessun algoritmo richiede un altro algoritmo: l'unica dipendenza condivisa tra gli algoritmi è
`alg.common`. Un nuovo import tra directory di algoritmi fa fallire il test di fitness, a meno che il
manifesto Java non abbia lo stesso arco.

## 2. Componenti del runtime centrale

I percorsi delle classi sono sotto `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`
salvo diversa indicazione; verificati al commit fissato.

| Classe                            | Percorso                            | Ruolo                                                                     |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                    |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Percorre la gerarchia, esegue il provider a ogni livello                  |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Classe base di ogni algoritmo; implementa `IGraphLayoutEngine`            |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Registro singleton dei dati di algoritmi, opzioni e categorie             |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; uno generato per ogni bundle di algoritmo (da `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Id dell'algoritmo più `getInstancePool()` dei provider                    |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Chiavi di opzione tipizzate e il contenitore a mappa dietro `getProperty` |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Modello del grafo; gli elementi sono `EMapPropertyHolder`                 |

![Relazioni tra le classi del runtime centrale di ELK](/diagrams/component-map-2.svg)

Come si innesta un algoritmo:

1. Il bundle dell'algoritmo fornisce una sottoclasse di `AbstractLayoutProvider` (per esempio
   `LayeredLayoutProvider` di `alg.layered`) e un file `.melk` che dichiara il suo id, le opzioni e le
   funzionalità supportate.
2. Il compilatore `.melk` genera un `ILayoutMetaDataProvider` e una classe di opzioni. Il suo
   `apply(Registry)` registra un `LayoutAlgorithmData` il cui pool di istanze crea il provider.
3. `LayoutMetaDataService` raccoglie i provider. `LayoutAlgorithmResolver` imposta l'id dell'algoritmo
   su ogni nodo a partire dall'opzione `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` preleva un provider dal
   `LayoutAlgorithmData.getInstancePool()` del nodo e chiama `layout(layoutNode, progressMonitor)`, poi
   lo rilascia (o chiama `dispose()` dopo un fallimento).

In elk-engine il passaggio `.melk` è sostituito da un generatore (AD-12, missione futura) e ElkGraph
diventa semplici classi TS (AD-11). Mappatura sui file TS: [mappa del porting](/guide/port-map); regole:
[regole di traduzione](/guide/translation-rules).
