---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
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
  - title: Pre-1.0
    details: Tutti gli algoritmi di layout di ELK previsti sono portati e verificati rispetto a ELK compilato dai
      sorgenti. Fino alla 1.0 l'API può ancora cambiare.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Tutti gli algoritmi di layout di ELK previsti sono portati e verificati rispetto all'ELK compilato dai sorgenti; il
[report di parità](/parity) riporta i risultati. La superficie di esportazione pubblica è accettata, ma non è ancora
in `src/index.ts`, quindi l'entry del pacchetto non esporta ancora nulla di pubblico. Le versioni restano 0.x fino
alla 1.0, e fino ad allora l'API può ancora cambiare. Che cosa verrà dopo è nella [roadmap](/guide/roadmap).
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
