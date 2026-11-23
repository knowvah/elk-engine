---
title: Vue d’ensemble
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Vue d’ensemble

`@knowvah/elk-engine` est un portage fidèle en TypeScript d’[Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), la bibliothèque Java de layout de graphes. Il n’y a ni Java ni
WASM : les algorithmes de layout sont réimplémentés en TypeScript simple et vérifiés par rapport à
l’implémentation Java.

::: tip Version 1.0
`@knowvah/elk-engine@1.0.0` est sur npm. Tous les algorithmes de layout d’ELK prévus sont portés et vérifiés par
rapport à l’ELK compilé depuis les sources ; le [rapport de parité](/parity) (en anglais) donne les résultats, et les
écarts encore ouverts sont suivis sous forme d’issues. L’API publique, 72 exports, est figée en 1.0.0 et les versions
suivent semver. Commencez par [Prise en main](/guide/getting-started) et consultez la [feuille de route](/guide/roadmap)
(en anglais) pour connaître la suite.
:::

## Le Java est la spécification

Le code source Java au commit ELK épinglé `8bca22f4afa3371562d2f702d59929818f7f7b71` est la
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

L’API publique est la surface d’export acceptée dans
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 exports : le modèle d’objets ElkGraph et les fabriques
`ElkGraphUtil`, le moteur de layout, le fournisseur de métadonnées et la classe d’options de chaque algorithme, les
types de valeurs des options centrales, l’adaptateur ELK JSON et la fonction `layout` asynchrone. ELK JSON est un
adaptateur d’E/S, pas le modèle central. [Prise en main](/guide/getting-started) (en anglais) montre la surface en
usage. La surface est figée en 1.0.0 et les versions suivent semver : retirer un export impose une version majeure.

## Contraintes d’exécution

- `src/` est sûr pour le navigateur : pas de module intégré de Node, pas de `process.env`, uniquement des modules ES.
- Il n’y a aucune dépendance d’exécution.

## Pour aller plus loin

- [Architecture](/fr/guide/architecture) : comment l’oracle, les bundles et le moteur de layout s’articulent.
- [Carte de portage](/guide/port-map) (en anglais) et [inventaire](/guide/inventory) (en anglais) : quels paquets Java
  correspondent à quels modules.
- [Contribuer](/fr/guide/contributing) : gates et processus de travail.
