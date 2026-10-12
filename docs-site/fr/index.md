---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pré-alpha
    details: La chaîne d’outils, l’architecture, les shims du runtime Java et l’échafaudage de vérification existent.
      Aucun algorithme de layout n’est encore porté.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pré-alpha
Aucun algorithme de layout n’est encore porté, et `src/index.ts` n’exporte rien de public. La première publication npm
figera l’API publique. Consultez la [feuille de route](/guide/roadmap) (en anglais) pour connaître la suite.
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
