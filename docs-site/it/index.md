---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, in puro TypeScript
  tagline: Un porting fedele in TypeScript dell'Eclipse Layout Kernel. Niente Java, niente WASM — gli algoritmi di
    layout sono reimplementati in semplice TypeScript e verificati rispetto all'implementazione Java.
  actions:
    - theme: brand
      text: Panoramica
      link: /it/guide/overview
    - theme: alt
      text: Galleria
      link: /it/showcase/
    - theme: alt
      text: Vedi su GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Fedele a ELK Java
    details:
      Il Java a un commit ELK fissato è la specifica. Ogni ramo viene portato, e i test JUnit vengono portati insieme
      al codice che verificano.
  - title: Verificato rispetto a un oracolo
    details: Gli output vengono confrontati con ELK compilato dai sorgenti. La struttura coincide esattamente; le
      coordinate coincidono entro 1e-6.
  - title: Nativo del browser, zero dipendenze di runtime
    details: Niente Java, niente WASM, niente built-in di Node nel codice della libreria. Impacchettalo e distribuiscilo.
  - title: Pre-alpha
    details: Esistono la toolchain, l'architettura, gli shim del runtime Java e l'impalcatura di verifica. Nessun
      algoritmo di layout è ancora portato.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
Nessun algoritmo di layout è ancora portato, e `src/index.ts` non esporta nulla di pubblico. La prima pubblicazione
su npm congelerà l'API pubblica. Che cosa verrà dopo è nella [roadmap](/guide/roadmap).
:::

## Scegli il tuo percorso

| Voglio…                                               | Inizia da qui                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------- |
| Capire che cos'è e che cosa non è il progetto         | [Panoramica](/it/guide/overview)                                      |
| Vedere come si incastrano i pezzi                     | [Architettura](/it/guide/architecture)                                |
| Sapere che cosa significa «coincide con il Java»      | [Conformità](/it/conformance)                                         |
| Trovare dove un pacchetto Java finisce nel porting    | [Mappa del porting](/guide/port-map) · [Inventario](/guide/inventory) |
| Imparare le regole da Java a TypeScript               | [Regole di traduzione](/guide/translation-rules)                      |
| Vedere quale comportamento del runtime Java è coperto | [Fondamenti Java](/it/guide/java-foundations)                         |
| Vedere che cosa è pianificato                         | [Roadmap](/guide/roadmap)                                             |
| Contribuire                                           | [Contribuire](/it/guide/contributing)                                 |
