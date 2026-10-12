---
title: Vue d’ensemble
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Vue d’ensemble

`@knowvah/elk-engine` est un portage fidèle en TypeScript d’[Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), la bibliothèque Java de layout de graphes. Il n’y a ni Java ni
WASM : les algorithmes de layout sont réimplémentés en TypeScript simple et vérifiés par rapport à
l’implémentation Java.

::: warning Pré-alpha
Aucun algorithme de layout n’est encore porté. Le dépôt contient la chaîne d’outils, les documents d’architecture,
l’échafaudage de vérification et les shims du runtime Java. `src/index.ts` n’exporte encore rien de public.
Consultez la [feuille de route](/guide/roadmap) (en anglais) pour l’ordre d’arrivée des algorithmes.
:::

## Le Java est la spécification

Le code source Java au commit ELK épinglé `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` est la
spécification canonique. Le portage la suit de près :

- Les algorithmes ne sont ni optimisés ni simplifiés. Si le Java semble redondant, la redondance est conservée.
- Chaque branche est portée, et les frontières de méthodes sont conservées sauf si TypeScript impose un changement.
- Les tests JUnit sont portés avec le code qu’ils testent.
- Le comportement du runtime Java dont ELK dépend (arithmétique entière sur 32 bits, ordre d’itération de
  `HashMap`, séquences de `Random`) est reproduit par des shims. Voir [Fondations Java](/fr/guide/java-foundations).

Les [règles de traduction](/guide/translation-rules) (en anglais) listent la correspondance de chaque concept Java en TypeScript.

## Vérification par rapport à un oracle

L’oracle est l’ELK amont compilé depuis les sources, dans un worktree git détaché au commit épinglé.
Les sorties du portage sont comparées à celles de l’oracle :

- Les identifiants, le nombre d’éléments, la topologie des sections d’arêtes, le nombre de points de
  courbure et les valeurs non numériques doivent correspondre exactement.
- Les coordonnées et tailles numériques doivent correspondre à une tolérance absolue de `1e-6`.

Les sorties d’oracle sélectionnées sont versionnées comme références golden, si bien que l’exécution des tests ne
nécessite pas de JVM. La procédure complète se trouve sur la page [Conformité](/fr/conformance).

## Contrat public

L’API publique sera le modèle d’objets ElkGraph plus les fabriques `ElkGraphUtil`. ELK JSON est un adaptateur
d’E/S, pas le modèle central. La première publication npm fige cette surface.

## Contraintes d’exécution

- `src/` est sûr pour le navigateur : pas de module intégré de Node, pas de `process.env`, uniquement des modules ES.
- Il n’y a aucune dépendance d’exécution.

## Pour aller plus loin

- [Architecture](/fr/guide/architecture) : comment l’oracle, les bundles et le moteur de layout s’articulent.
- [Carte de portage](/guide/port-map) (en anglais) et [inventaire](/guide/inventory) (en anglais) : quels paquets Java
  correspondent à quels modules.
- [Contribuer](/fr/guide/contributing) : gates et processus de travail.
