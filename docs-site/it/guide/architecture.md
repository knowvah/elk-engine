---
title: Architettura
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Panoramica dell'architettura di elk-engine

| Documento                                                                                                              | Contenuto                                                                                                                                                    |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                                                                                       | Ogni bundle ELK: scopo, LOC, sorgenti generati, ambito                                                                                                       |
| [port-map.md](/guide/port-map)                                                                                         | Mappatura dei pacchetti Java sui moduli di `src/`                                                                                                            |
| [component-map.md](#mappa-dei-componenti)                                                                              | Dipendenze dei bundle in ambito; componenti centrali del runtime                                                                                             |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Regole da Java a TypeScript                                                                                                                                  |
| [../conformance.md](/conformance)                                                                                      | Soglia e procedura di confronto con l'oracolo (arriva più avanti in questa missione)                                                                         |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Porting di ELK Text (`.elkt`), il sottoinsieme di Xtext, runbook e rinvii                                                                                    |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Porting di ELK Textual JSON (`.elkj`), linking lazy, runbook e rinvii                                                                                        |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Porting del generatore di grafi casuali grandom (`.elkr`), evidenze e runbook                                                                                |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Il motore di layout e i provider fixed, box e random (missione 5a)                                                                                           |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | Il generatore `.melk`, tipi in sospeso, costanti lazy, rigenerazione                                                                                         |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Il gate di complessità che misura ogni funzione (`npm run complexity`)                                                                                       |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Framework layered (missione 7a): modello LGraph, trasformazione, classi a fasi, runbook                                                                      |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Posizionamento dei nodi layered (missione 7d): p4nodes, Brandes-Köpf, cinque processor, righe di geometria, runbook                                          |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Instradamento degli archi layered (missione 7e): p5edges orthogonal, polyline, spline, sei processor, righe di instradamento, runbook                        |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Pipeline layered (missione 7f): `ElkLayered`, `GraphConfigurator`, componenti, quattro processor, righe di layout completi, sottoinsieme del runner, runbook |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Etichette layered (missione 7f2): processor di etichette e commenti, unzipping, output di debug, visitor, righe di etichette, sweep, runbook                 |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Self loop, wrapping e compattazione layered (missione 7g): pacchetto loops, breaking point, compattazione 1D, `ComponentsCompactor`, righe, sweep, runbook   |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Grafi composti layered (missione 7h): pacchetto `compound`, driver gerarchico, stop sull'intero albero, golden, sweep, gemelli dell'ordine di hash, runbook  |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Sweep TS contro l'oracolo (riga 9): runner suddiviso in shard, contratto del riepilogo, annotazioni, report, runbook                                         |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Misurazione del testo delle etichette collegabile (riga 10): patch 0003, il gemello TS, modalità fissa, evidenze, runbook                                    |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Spostare il pin di ELK (riga 13): triage del diff netto, serie di patch, ricompilazione, ri-registrazione, sweep, triage dei ref-diff, modalità di prova     |

## Che cos'è elk-engine

`@knowvah/elk-engine` è un porting fedele in TypeScript dell'Eclipse Layout Kernel (ELK). Il Java
al commit fissato `8bca22f4afa3371562d2f702d59929818f7f7b71` è la specifica (AD-1, AD-2). È una
libreria: sicura per il browser, zero dipendenze di runtime, niente Java né WASM. Il suo contratto pubblico è il
modello a oggetti ElkGraph più le factory `ElkGraphUtil`; ELK JSON è un adattatore di I/O (AD-14). Tredici
bundle per circa 134.600 righe scritte a mano sono in ambito (vedi l'inventario). Stato attuale:
il motore di layout (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) e i tre
provider centrali `fixed`, `box` e `random` sono portati e coincidono con l'oracolo sui golden curati
(missione 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)).
Anche il resto di `core` è portato (missione 5b: pipeline dei processor, `LayoutConfigurator`, `ElkSpacings`,
`ElkMath`, spline, associazione dei commenti; vedi
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)).
Il bundle condiviso `alg.common` è portato per intero (missione 6a: geometria, network simplex, compattazione 1D,
sovrapposizioni, spore, polyomino; missione 6b: `nodespacing` e `NodeMicroLayout`, provati da una riproduzione
dell'oracolo di 326 righe; vedi [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Il framework layered è portato (missione 7a: il pacchetto delle opzioni, il modello LGraph, la trasformazione
ElkGraph ↔ LGraph e il guscio del provider, provati da due file di vettori dell'oracolo di 272 e 330 righe; le
fasi di layout seguono in 7b–7h; vedi [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)).
Le sue prime due fasi sono portate (missione 7b: gli undici cycle breaker, i nove layerer e i dieci processor
attorno a essi, provati da 651 righe di fase dell'oracolo e uno sweep di 32.652 casi;
[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)).
La sua terza fase è portata (missione 7c: minimizzazione degli incroci con i suoi contatori, il greedy switch, i
comparatori model-order e gli otto processor tra P2 e P3, provati da 808 righe di ordinamento dell'oracolo e uno
sweep di 6.728 casi;
[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)).
La sua quarta fase è portata (missione 7d: i quattro node placer con Brandes-Köpf e i cinque processor che
servono a uno stop P4, provati da 610 righe di posizionamento dell'oracolo con geometria e uno sweep di 8.410
casi;
[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)).
La sua quinta fase è portata (missione 7e: i router orthogonal, polyline e spline con i sei processor che servono
a un risultato instradato, provati da 950 righe di instradamento dell'oracolo con geometria degli archi e uno
sweep di 6.728 casi;
[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)).
La pipeline layered gira (missione 7f: il driver, il pacchetto delle componenti connesse, il transformer di
direzione, il router delle porte gerarchiche e tre processor, provati da 1.311 righe dell'oracolo di layout
completi e stop, una ri-riproduzione di 2.351 righe delle righe precedenti attraverso il driver reale, 28 suite
JUnit portate e uno sweep di 6.646 casi;
[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)).
Girano anche i layout con etichette e commenti, l'unzipping dei layer e un monitor di logging (missione 7f2: la
famiglia delle etichette, i processor dei commenti, `AlternatingLayerUnzipper`,
`InteractiveLayeredGraphVisitor` e le utility di debug, provati da 1.305 righe dell'oracolo di stop e layout
completi, le 11 suite JUnit di base e uno sweep di 1.105 casi i cui 935 casi ok coincidono esattamente;
[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)).
Girano anche self loop, graph wrapping e compattazione (missione 7g: il pacchetto loops, i quattro processor
per i self loop, i wrapper per breaking point e per arco singolo, `HorizontalGraphCompactor`, il pacchetto
layered `compaction` e `ComponentsCompactor`, provati da 1.642 righe dell'oracolo (`full` 731, `models` 307,
`scenarios` 525, `sites` 79), le 10 suite JUnit di base, uno sweep di 3.073 casi i cui 2.997 casi ok coincidono
esattamente e 76 eccezioni coincidono su entrambi i lati, e il cablaggio a nove rami che lascia 58 rami portati;
[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)).
Girano anche i grafi composti (missione 7h: il pacchetto `compound`, `HierarchicalNodeResizingProcessor` e
l'ultimo ramo, provati da 540 righe dell'oracolo (`full` 355, `models` 73 con stop sull'intero albero,
`scenarios` 88, `sites` 24), 24 golden layered, le nove suite di issue e tre metodi di graph.json, uno sweep di
1.169 casi i cui 1.164 casi ok coincidono esattamente e 5 eccezioni coincidono su entrambi i lati;
[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)).
L'algoritmo layered ora gira in ogni modalità di gestione della gerarchia: 59 rami di enum sono portati,
nessuno è in sospeso e l'elenco dei rami in staging è vuoto. I tre casi `elk.stress` dell'issue #58 attendevano la missione 8b e girano da quando la sua decisione è stata applicata (missione layered-stress-cases). Nessun altro algoritmo di layout gira ancora (mrtree, radial, force, disco,
rectpacking, spore, topdownpacking, vertiflex). Dalla missione 8a girano anche mrtree, radial e vertiflex
(provati da 1.181 righe dell'oracolo in quattro ref di layout completi e stop, un ref di vettori unitari di
2.656 righe, 40 golden `trees`, `MrTreeGraphSizeTest` e `CenterOnRootTest` a 6/6 e 2/2, e uno sweep di 906 casi
per algoritmo in cui ogni caso o coincide o è diagnosticato; due righe radial il cui risultato dipende
dall'ordine di un hash bin trasformato in albero sono classificate, non fatte coincidere;
[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Dalla missione
8b girano anche force, stress e disco (provati da 21.420 righe dell'oracolo in tre ref di layout completi e
stop, 45 golden `force-disco`, `ForceImportTest` e `TwoBitGridTest` a 3/3 ciascuno, e uno sweep per algoritmo in
cui ogni caso o coincide o è diagnosticato; il `Math.log` di Eades è un port fdlibm esatto al bit;
[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)).
Dalla missione 8c girano anche rectpacking, spore (`sporeOverlap`, `sporeCompaction`) e topdownpacking (provati
da 2.593 righe dell'oracolo in tre ref, 44 golden `packing`, le otto suite JUnit portate a 30 esecuzioni, e uno
sweep per algoritmo in cui ogni caso deterministico coincide o è diagnosticato;
[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Ogni
algoritmo in ambito è sottoposto a sweep contro l'oracolo, e il risultato per algoritmo è pubblicato nel report
di parità ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Relazione con ELK Java e con l'oracolo

![Relazione tra ELK Java, la compilazione dell'oracolo, i riferimenti golden ed elk-engine](/diagrams/overview-1.svg)

La serie di patch è vuota in questa missione (AD-3). I golden sono committati, quindi la CI non ha bisogno di una JVM
(AD-5). Confronto: struttura esatta, coordinate entro 1e-6 (AD-4).

## Flussi principali

Il layout in ELK, che elk-engine riproduce oggi per `fixed`, `box` e `random` (dettagli in
[component-map.md](#mappa-dei-componenti) e
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Flusso di una chiamata di layout attraverso il motore di layout ricorsivo](/diagrams/overview-2.svg)

Adattatore JSON (`graph.json`, `ElkGraphJson`): l'ELK JSON in ingresso diventa un ElkGraph tramite l'importatore
prima del layout; dopo il layout, le coordinate calcolate e le sezioni degli archi vengono trasferite di nuovo
nel JSON in uscita. L'harness dell'oracolo usa l'adattatore Java negli stessi due passaggi, quindi entrambi i lati
condividono il contratto JSON.

Adattatore di testo (`graph.text`, `ElkGraphText`): il testo `.elkt` viene caricato in un ElkGraph tramite un
parser, un linker e un validatore scritti a mano su un piccolo sottoinsieme di Xtext (`src/xtext`), e un ElkGraph
viene serializzato di nuovo in `.elkt`. Il punto di ingresso è interno; vedi
[elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Adattatore JSON testuale (`graph.json.text`, `ElkGraphJsonText`): il testo `.elkj` viene caricato attraverso lo
stesso sottoinsieme di Xtext con un parser scritto a mano, e collega in modo lazy come il `LazyLinker` di Xtext:
gli estremi degli archi sono proxy EMF (`src/emf`) che si risolvono alla lettura. Un ElkGraph viene serializzato
di nuovo in `.elkj` tramite un writer specifico della grammatica. Il punto di ingresso è interno; vedi
[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generatore di grafi casuali (`core.debug.grandom`, `GRandomText`): il testo `.elkr` viene analizzato da un lexer e
un parser scritti a mano sullo stesso sottoinsieme di Xtext (`src/xtext`), e `RandomGraphGenerator` trasforma una
configurazione in ElkGraph con l'esatta sequenza di `Random` della JVM. L'output con seed è identico al byte
all'oracolo e riproduce i nove file `test/corpus/generated/*.json`; i percorsi senza seed (testo delle etichette
degli archi, shuffle tra gerarchie, seed mancante) sono verificati solo tramite invarianti. Il punto di ingresso è
interno; vedi [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Toolchain di documentazione e rilascio

Aggiunta dalla riga 12 della roadmap; decisioni da DP1 a DP9 in
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md).
`1.0.0` è stata pubblicata il 2026-11-23.

| Elemento             | Che cos'è                                                                                                                                                                                                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Superficie di export | Accettata (2026-11-23), elencata in [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) e mantenuta uguale a `src/index.ts` da `src/index.test.ts`; congelata a `1.0.0`, la prima pubblicazione su npm (AD-14) |
| Riferimento API      | `npm run docs:api`: typedoc nel pacchetto privato `tools/typedoc/` con un proprio TypeScript 6 (typedoc non ha una release per TypeScript 7, AD-6), nella `/reference/` generata                                                                            |
| Esempi               | `test/docs/examples/*.ts`, mostrati come snippet nella pagina di avvio del sito e confrontati con i ref dell'oracolo (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                                  |
| Controllo dei link   | `npm run docs:linkcheck`: linkinator sul sito compilato, link interni e frammenti, in CI; link esterni ogni settimana (`links.yml`)                                                                                                                         |
| Prova del pacchetto  | `npm run pack:smoke`: crea il pacchetto, controlla l'elenco dei file, installa offline in un progetto pulito, importa, esegue il layout di un esempio e lo confronta con il suo ref dell'oracolo                                                            |
| Rilascio             | configurazione di semantic-release e `release.yml`, eseguiti a ogni push su `main`; runbook in [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                             |

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

Portati dalla missione 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)):
`RecursiveGraphLayoutEngine` (diviso con `RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver`, e le
sottoclassi di `AbstractLayoutProvider` `FixedLayoutProvider`, `BoxLayoutProvider` e `RandomLayoutProvider`.
`LayoutMetaDataService`, `LayoutAlgorithmData` e i tipi di proprietà sono arrivati prima (missioni 2 e 3). La
missione 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b))
ha completato il bundle: `AlgorithmAssembler` e `LayoutProcessorConfiguration` (la pipeline che ogni bundle di
algoritmo usa), `LayoutConfigurator`, `ElkSpacings`, le sezioni di `ElkMath`, `ElkGraphAdapters`,
`util/selection/*` e `comments/*`. I suoi shim JDK sono `src/java/awt/geom` (`Rectangle2D`) e
`src/java/util/regex` (`Pattern`, `WordBoundary`), accanto a `JavaCharacter` in `src/java/lang`; sono provati da
`awt.json`, `regex.json`, `character.json` e `regex-boundary.json`. Le missioni 6a e 6b
([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) hanno portato
tutto `alg.common`; la 6b ha aggiunto `nodespacing` e `NodeMicroLayout`, provati da una riproduzione dell'oracolo
di `NodeMicroLayout` di 326 righe.

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

In elk-engine il passaggio `.melk` è sostituito da un generatore (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) e ElkGraph
diventa semplici classi TS (AD-11). Mappatura sui file TS: [mappa del porting](/guide/port-map); regole:
[regole di traduzione](/guide/translation-rules).
