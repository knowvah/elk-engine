---
title: Panoramica
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Panoramica

`@knowvah/elk-engine` è un porting fedele in TypeScript dell'[Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), la libreria Java per il layout di grafi. Non c'è Java e non c'è
WASM: gli algoritmi di layout sono reimplementati in semplice TypeScript e verificati rispetto
all'implementazione Java.

::: tip Versione 1.0
`@knowvah/elk-engine@1.0.0` è su npm. Tutti gli algoritmi di layout di ELK previsti sono portati e verificati rispetto
all'ELK compilato dai sorgenti; il [report di parità](/parity) riporta i risultati, e le differenze ancora aperte sono
tracciate come issue. L'API pubblica, 72 export, è congelata alla 1.0.0 e le versioni seguono semver. Inizia da
[Per iniziare](/guide/getting-started) e per quello che arriva dopo vedi la [roadmap](/guide/roadmap).
:::

## Il Java è la specifica

Il sorgente Java al commit ELK fissato `8bca22f4afa3371562d2f702d59929818f7f7b71` è la specifica
canonica. Il porting la segue da vicino:

- Gli algoritmi non vengono ottimizzati né semplificati. Se il Java sembra ridondante, la ridondanza viene mantenuta.
- Ogni ramo viene portato, e i confini dei metodi restano invariati a meno che TypeScript non imponga una modifica.
- I test JUnit vengono portati insieme al codice che verificano.
- Il comportamento del runtime Java su cui ELK fa affidamento (aritmetica intera a 32 bit, ordine di iterazione di `HashMap`,
  sequenze di `Random`) è riprodotto da shim. Vedi [Fondamenti Java](/it/guide/java-foundations).

Le [regole di traduzione](/guide/translation-rules) elencano come ogni concetto Java si mappa su TypeScript.

## Verifica rispetto a un oracolo

L'oracolo è l'ELK upstream compilato dai sorgenti, in un git worktree scollegato al commit fissato.
Gli output del porting vengono confrontati con gli output dell'oracolo:

- Id, numero di elementi, topologia delle sezioni degli archi, numero di punti di piegatura e valori non numerici
  devono coincidere esattamente.
- Le coordinate e le dimensioni numeriche devono coincidere entro una tolleranza assoluta di `1e-6`.

Gli output selezionati dell'oracolo sono committati come riferimenti golden, quindi per eseguire i test non serve una JVM.
La procedura completa è nella pagina [Conformità](/it/conformance).

## Contratto pubblico

L'API pubblica è la superficie di esportazione accettata in
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 export: il modello a oggetti ElkGraph e le factory
`ElkGraphUtil`, il motore di layout, il provider di metadati e la classe delle opzioni di ogni algoritmo, i tipi di
valore delle opzioni di base, l'adattatore ELK JSON e la funzione asincrona `layout`. ELK JSON è un adattatore di I/O,
non il modello centrale. [Per iniziare](/guide/getting-started) mostra la superficie in uso. La superficie è congelata
alla 1.0.0 e le versioni seguono semver: rimuovere un export è una versione major.

## Vincoli di runtime

- `src/` è sicuro per il browser: nessun built-in di Node, nessun `process.env`, solo moduli ES.
- Non ci sono dipendenze di runtime.

## Dove andare dopo

- [Architettura](/it/guide/architecture): come si incastrano l'oracolo, i bundle e il motore di layout.
- [Mappa del porting](/guide/port-map) e [inventario](/guide/inventory): quali pacchetti Java corrispondono a quali
  moduli.
- [Contribuire](/it/guide/contributing): gate e flusso di lavoro.
