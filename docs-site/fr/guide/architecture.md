---
title: Architecture
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Vue d’ensemble de l’architecture d’elk-engine

| Document                                            | Contenu                                                                             |
| --------------------------------------------------- | ----------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Chaque bundle ELK : objet, LOC, sources générées, périmètre                         |
| [port-map.md](/guide/port-map)                      | Correspondance des paquets Java avec les modules de `src/`                          |
| [component-map.md](#carte-des-composants)           | Dépendances des bundles dans le périmètre ; éléments centraux du runtime            |
| [../translation-rules.md](/guide/translation-rules) | Règles de Java vers TypeScript                                                      |
| [../conformance.md](/fr/conformance)                | Barre de comparaison et procédure de l’oracle (arrive plus tard dans cette mission) |

## Ce qu’est elk-engine

`@knowvah/elk-engine` est un portage fidèle en TypeScript d’Eclipse Layout Kernel (ELK). Le Java
au commit épinglé `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` est la spécification (AD-1, AD-2). C’est une
bibliothèque : sûre pour le navigateur, sans dépendance d’exécution, sans Java ni WASM. Son contrat public est le
modèle d’objets ElkGraph plus les fabriques `ElkGraphUtil` ; ELK JSON est un adaptateur d’E/S (AD-14). Treize
bundles totalisant environ 134 600 lignes écrites à la main sont dans le périmètre (voir l’inventaire). Cette mission
ne livre que l’échafaudage : aucun algorithme de layout n’est encore porté.

## Relation avec ELK Java et l’oracle

![Relation entre ELK Java, la compilation de l’oracle, les références golden et elk-engine](/diagrams/overview-1.svg)

La série de patchs est vide dans cette mission (AD-3). Les goldens sont versionnés, la CI n’a donc pas besoin de JVM
(AD-5). Comparaison : structure exacte, coordonnées à 1e-6 près (AD-4).

## Flux principaux

Le layout dans ELK, que elk-engine reproduit (détails dans [component-map.md](#carte-des-composants)) :

![Déroulement d’un appel de layout à travers le moteur de layout récursif](/diagrams/overview-2.svg)

Adaptateur JSON (`graph.json`, `ElkGraphJson`) : l’ELK JSON en entrée devient un ElkGraph via l’importeur
avant le layout ; après le layout, les coordonnées calculées et les sections d’arêtes sont reportées dans
l’ELK JSON en sortie. Le harnais de l’oracle utilise l’adaptateur Java selon les deux mêmes étapes, si bien que les deux côtés partagent le
contrat JSON.

## Pile technique

| Sujet                | Choix                                                                  |
| -------------------- | ---------------------------------------------------------------------- |
| Langage              | TypeScript 7.0.2 (`tsc` natif), ES2022, NodeNext, `strict`             |
| Tests                | vitest 5.0.x avec `@vitest/coverage-v8` (seuils de 90 %)               |
| Empaquetage          | esbuild 0.28.x                                                         |
| Exécuteur de scripts | tsx                                                                    |
| Runtime              | Node 22 ou plus récent ; `src/` lui-même est sûr pour le navigateur    |
| Oracle seulement     | Maven 3.9+ et JDK 21 (JDK 17 en repli) pour la compilation Tycho d’ELK |

## Contraintes de fitness (AD-8)

Le sens des imports entre bundles suit `test/architecture/bundle-deps.json` ; en-tête SPDX dans chaque fichier de
code ; ni module intégré de Node ni `process.env` dans `src/` ; aucun `let` modifiable au niveau du module hors de la
liste d’autorisation.

# Carte des composants

| Diagramme                  | Montre                                                       |
| -------------------------- | ------------------------------------------------------------ |
| 1. Dépendances des bundles | Les 13 bundles du périmètre et leurs arêtes `Require-Bundle` |
| 2. Runtime central         | Comment un algorithme de layout se branche sur le moteur     |

Les noms omettent le préfixe `org.eclipse.elk.`. Périmètre : [inventaire](/guide/inventory).

## 1. Dépendances des bundles dans le périmètre

Source de vérité : `test/architecture/bundle-deps.json`, dérivé du `META-INF/MANIFEST.MF` de chaque bundle
par `tools/bundle-deps.ts` et imposé par le test de fitness (AD-8).
Le diagramme compte **32 arêtes**, soit les 32 entrées `requires` du JSON (graph.json x 2,
core x 1, alg.common x 2, neuf algorithmes x 3). Les exigences tierces (Guava, EMF, Gson, bibliothèques
Xtend) et les bundles hors périmètre sont omis. Une flèche `A --> B` signifie que A requiert B, donc le
répertoire de B peut être importé par le répertoire de A. `src/java` est importable partout et n’est pas représenté.

![Dépendances entre les 13 bundles ELK du périmètre](/diagrams/component-map-1.svg)

Aucun algorithme ne requiert un autre algorithme : la seule dépendance partagée entre algorithmes est
`alg.common`. Un nouvel import entre répertoires d’algorithmes fait échouer le test de fitness, sauf si le
manifeste Java a la même arête.

## 2. Éléments centraux du runtime

Les emplacements des classes se trouvent sous `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`
sauf indication contraire ; vérifiés au commit épinglé.

| Classe                            | Chemin                              | Rôle                                                                        |
| --------------------------------- | ----------------------------------- | --------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                      |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Parcourt la hiérarchie, exécute le fournisseur à chaque niveau              |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Classe de base de chaque algorithme ; implémente `IGraphLayoutEngine`       |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Registre singleton des données d’algorithmes, d’options et de catégories    |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)` ; un généré par bundle d’algorithme (à partir de `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Identifiant d’algorithme plus `getInstancePool()` des fournisseurs          |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Clés d’options typées et le conteneur à base de map derrière `getProperty`  |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Modèle de graphe ; les éléments sont des `EMapPropertyHolder`               |

![Relations entre classes du runtime central d’ELK](/diagrams/component-map-2.svg)

Comment un algorithme se branche :

1. Le bundle de l’algorithme fournit une sous-classe de `AbstractLayoutProvider` (par exemple
   `LayeredLayoutProvider` de `alg.layered`) et un fichier `.melk` déclarant son identifiant, ses options et ses
   fonctionnalités prises en charge.
2. Le compilateur `.melk` génère un `ILayoutMetaDataProvider` et une classe d’options. Son
   `apply(Registry)` enregistre un `LayoutAlgorithmData` dont le pool d’instances crée le fournisseur.
3. `LayoutMetaDataService` collecte les fournisseurs. `LayoutAlgorithmResolver` définit l’identifiant d’algorithme
   sur chaque nœud à partir de l’option `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` récupère un fournisseur dans le
   `LayoutAlgorithmData.getInstancePool()` du nœud et appelle `layout(layoutNode, progressMonitor)`, puis
   le libère (ou appelle `dispose()` après un échec).

Dans elk-engine, l’étape `.melk` est remplacée par un générateur (AD-12, mission future) et ElkGraph
devient de simples classes TS (AD-11). Correspondance avec les fichiers TS : [carte de portage](/guide/port-map) ; règles :
[règles de traduction](/guide/translation-rules).
