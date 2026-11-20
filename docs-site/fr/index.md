---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, en TypeScript pur
  tagline: Un portage fidèle en TypeScript d’Eclipse Layout Kernel. Ni Java ni WASM — les algorithmes de layout sont
    réimplémentés en TypeScript simple et vérifiés par rapport à l’implémentation Java.
  actions:
    - theme: brand
      text: Vue d’ensemble
      link: /fr/guide/overview
    - theme: alt
      text: Galerie
      link: /fr/showcase/
    - theme: alt
      text: Voir sur GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Fidèle à ELK Java
    details:
      Le Java à un commit ELK épinglé est la spécification. Chaque branche est portée, et les tests JUnit sont portés
      avec le code qu’ils testent.
  - title: Vérifié par rapport à un oracle
    details: Les sorties sont comparées à ELK compilé depuis les sources. La structure correspond exactement ; les
      coordonnées correspondent à 1e-6 près.
  - title: Natif pour le navigateur, sans dépendance d’exécution
    details: Ni Java, ni WASM, ni module intégré de Node dans le code de la bibliothèque. Empaquetez et livrez.
  - title: Pré-1.0
    details: Tous les algorithmes de layout d’ELK prévus sont portés et vérifiés par rapport à ELK compilé depuis les
      sources. Jusqu’à la 1.0, l’API peut encore changer.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pré-1.0
Tous les algorithmes de layout d’ELK prévus sont portés et vérifiés par rapport à l’ELK compilé depuis les sources ;
le [rapport de parité](/parity) (en anglais) donne les résultats. La surface d’export publique est acceptée, mais ne
figure pas encore dans `src/index.ts` : le point d’entrée du paquet n’exporte donc encore rien de public. Les versions
restent en 0.x jusqu’à la 1.0, et d’ici là l’API peut encore changer. Consultez la [feuille de route](/guide/roadmap)
(en anglais) pour connaître la suite.
:::

## Choisissez votre parcours

| Je veux…                                             | Commencer ici                                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Comprendre ce qu’est le projet et ce qu’il n’est pas | [Vue d’ensemble](/fr/guide/overview)                                                           |
| Voir comment les éléments s’articulent               | [Architecture](/fr/guide/architecture)                                                         |
| Savoir ce que signifie « correspond au Java »        | [Conformité](/fr/conformance)                                                                  |
| Trouver où atterrit un paquet Java dans le portage   | [Carte de portage](/guide/port-map) (en anglais) · [Inventaire](/guide/inventory) (en anglais) |
| Apprendre les règles de Java vers TypeScript         | [Règles de traduction](/guide/translation-rules) (en anglais)                                  |
| Voir quel comportement du runtime Java est couvert   | [Fondations Java](/fr/guide/java-foundations)                                                  |
| Voir ce qui est prévu                                | [Feuille de route](/guide/roadmap) (en anglais)                                                |
| Contribuer                                           | [Contribuer](/fr/guide/contributing)                                                           |
