---
title: Architecture
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Vue d’ensemble de l’architecture d’elk-engine

| Document                                                                                                               | Contenu                                                                                                                                                            |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                                                                                       | Chaque bundle ELK : objet, LOC, sources générées, périmètre                                                                                                        |
| [port-map.md](/guide/port-map)                                                                                         | Correspondance des paquets Java avec les modules de `src/`                                                                                                         |
| [component-map.md](#carte-des-composants)                                                                              | Dépendances des bundles dans le périmètre ; éléments centraux du runtime                                                                                           |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Règles de Java vers TypeScript                                                                                                                                     |
| [../conformance.md](/conformance)                                                                                      | Barre de comparaison et procédure de l’oracle (arrive plus tard dans cette mission)                                                                                |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Portage d’ELK Text (`.elkt`), sous-ensemble d’Xtext, runbook et reports                                                                                            |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Portage d’ELK Textual JSON (`.elkj`), liaison paresseuse, runbook et reports                                                                                       |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portage du générateur de graphes aléatoires grandom (`.elkr`), preuves et runbook                                                                                  |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Moteur de layout et fournisseurs fixed, box et random (mission 5a)                                                                                                 |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | Le générateur `.melk`, types en attente, constantes paresseuses, régénération                                                                                      |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Le portail de complexité qui mesure chaque fonction (`npm run complexity`)                                                                                         |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Cadre layered (mission 7a) : modèle LGraph, transformation, classes par phase, runbook                                                                             |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Placement des nœuds layered (mission 7d) : p4nodes, Brandes-Köpf, cinq processeurs, lignes de géométrie, runbook                                                   |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Routage des arêtes layered (mission 7e) : p5edges orthogonal, polyligne, splines, six processeurs, lignes de routage, runbook                                      |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Pipeline layered (mission 7f) : `ElkLayered`, `GraphConfigurator`, composantes, quatre processeurs, lignes de layout complet, sous-ensemble du runner, runbook     |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Étiquettes layered (mission 7f2) : processeurs d’étiquettes et de commentaires, dézippage, sortie de débogage, visiteur, lignes d’étiquettes, balayage, runbook    |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Boucles propres, wrapping et compactage layered (mission 7g) : paquet loops, points de rupture, compactage 1D, `ComponentsCompactor`, lignes, balayage, runbook    |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Graphes composés layered (mission 7h) : paquet `compound`, pilote hiérarchique, arrêts d’arbre entier, goldens, balayage, jumeaux d’ordre de hachage, runbook      |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Balayage TS contre l’oracle (ligne 9) : runner shardé, contrat de synthèse, annotations, rapport, runbook                                                          |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Mesure enfichable du texte des étiquettes (ligne 10) : patch 0003, le jumeau TS, mode fixed, preuves, runbook                                                      |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Déplacer l’épinglage d’ELK (ligne 13) : tri du diff net, série de patchs, reconstruction, réenregistrement, balayages, tri du diff des références, mode répétition |

## Ce qu’est elk-engine

`@knowvah/elk-engine` est un portage fidèle en TypeScript d’Eclipse Layout Kernel (ELK). Le Java
au commit épinglé `8bca22f4afa3371562d2f702d59929818f7f7b71` est la spécification (AD-1, AD-2). C’est une
bibliothèque : sûre pour le navigateur, sans dépendance d’exécution, sans Java ni WASM. Son contrat public est le
modèle d’objets ElkGraph plus les fabriques `ElkGraphUtil` ; ELK JSON est un adaptateur d’E/S (AD-14). Treize
bundles totalisant environ 134 600 lignes écrites à la main sont dans le périmètre (voir l’inventaire). État actuel :
le moteur de layout (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) et les trois
fournisseurs centraux `fixed`, `box` et `random` sont portés et égalent l’oracle sur les goldens choisis (mission 5a,
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). Le reste de
`core` est porté aussi (mission 5b : pipeline de processeurs, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines,
rattachement des commentaires ; voir
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)).
Le bundle partagé `alg.common` est entièrement porté (mission 6a : géométrie, simplexe de réseau, compactage 1D,
chevauchements, spore, polyomino ; mission 6b : `nodespacing` et `NodeMicroLayout`, prouvés par un rejeu d’oracle de
326 lignes ; voir [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Le cadre layered est porté (mission 7a : le paquet des options, le modèle LGraph, la transformation ElkGraph ↔ LGraph
et la coque du fournisseur, prouvés par deux fichiers de vecteurs d’oracle de 272 et 330 lignes ; les phases de layout
suivent en 7b–7h ; voir
[alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Ses deux
premières phases sont portées (mission 7b : les onze briseurs de cycles, les neuf algorithmes de couches et les dix
processeurs qui les entourent, prouvés par 651 lignes de phase de l’oracle et un balayage de 32 652 cas ;
[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)).
Sa troisième phase est portée (mission 7c : la minimisation des croisements avec ses compteurs, le greedy switch, les
comparateurs d’ordre du modèle et les huit processeurs entre P2 et P3, prouvés par 808 lignes d’ordre de l’oracle et
un balayage de 6 728 cas ;
[alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)).
Sa quatrième phase est portée (mission 7d : les quatre placeurs de nœuds avec Brandes-Köpf et les cinq processeurs
qu’exige un arrêt en P4, prouvés par 610 lignes de placement de l’oracle avec géométrie et un balayage de 8 410 cas ;
[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)).
Sa cinquième phase est portée (mission 7e : les routeurs orthogonal, polyligne et splines avec les six processeurs
qu’exige un résultat routé, prouvés par 950 lignes de routage de l’oracle avec géométrie des arêtes et un balayage de
6 728 cas ;
[alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)).
Le pipeline layered s’exécute (mission 7f : le pilote, le paquet des composantes connexes, le transformateur de
direction, le routeur de ports hiérarchiques et trois processeurs, prouvés par 1 311 lignes d’oracle de layouts
complets et d’arrêts, un rejeu de 2 351 lignes des lignes précédentes à travers le vrai pilote, 28 suites JUnit
portées et un balayage de 6 646 cas ;
[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)).
Les layouts avec étiquettes et commentaires, le dézippage des couches et un moniteur de journalisation s’exécutent
aussi (mission 7f2 : la famille des étiquettes, les processeurs de commentaires, `AlternatingLayerUnzipper`,
`InteractiveLayeredGraphVisitor` et les utilitaires de débogage, prouvés par 1 305 lignes d’oracle d’arrêts et de
layouts complets, les 11 suites JUnit de référence et un balayage de 1 105 cas dont les 935 cas ok concordent
exactement ;
[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)).
Les boucles propres, le wrapping du graphe et le compactage s’exécutent aussi (mission 7g : le paquet loops, les
quatre processeurs de boucles propres, les wrappers à points de rupture et à arête unique, `HorizontalGraphCompactor`,
le paquet layered `compaction` et `ComponentsCompactor`, prouvés par 1 642 lignes d’oracle (`full` 731, `models` 307,
`scenarios` 525, `sites` 79), les 10 suites JUnit de référence, un balayage de 3 073 cas dont les 2 997 cas ok
concordent exactement et dont les 76 exceptions concordent des deux côtés, et le câblage à neuf branches qui laisse 58
branches portées ;
[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)).
Les graphes composés s’exécutent aussi (mission 7h : le paquet `compound`, `HierarchicalNodeResizingProcessor` et la
dernière branche, prouvés par 540 lignes d’oracle (`full` 355, `models` 73 avec arrêts d’arbre entier, `scenarios` 88,
`sites` 24), 24 goldens layered, les neuf suites d’issues et trois méthodes graph.json, un balayage de 1 169 cas dont
les 1 164 cas ok concordent exactement et dont les 5 exceptions concordent des deux côtés ;
[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)).
L’algorithme layered exécute désormais tous les modes de gestion de la hiérarchie : 59 branches d’enum sont portées,
aucune n’est en attente et la liste d’étapes est vide. Les trois cas `elk.stress` de l’issue #58 attendaient la mission 8b et s’exécutent depuis que sa décision a été appliquée (mission layered-stress-cases). Aucun autre algorithme de layout ne s’exécute encore (mrtree, radial, force, disco, rectpacking, spore,
topdownpacking, vertiflex). Depuis la mission 8a, mrtree, radial et vertiflex s’exécutent aussi (prouvés par 1 181
lignes d’oracle dans quatre références de layouts complets et d’arrêts, une référence de vecteurs unitaires de 2 656
lignes, 40 goldens `trees`, `MrTreeGraphSizeTest` et `CenterOnRootTest` à 6/6 et 2/2, et un balayage de 906 cas par
algorithme dans lequel chaque cas concorde ou est diagnostiqué ; deux lignes radial dont le résultat dépend de l’ordre
d’un bac de hachage transformé en arbre sont classées, non concordantes ;
[alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Depuis la mission 8b,
force, stress et disco s’exécutent aussi (prouvés par 21 420 lignes d’oracle dans trois références de layouts complets
et d’arrêts, 45 goldens `force-disco`, `ForceImportTest` et `TwoBitGridTest` à 3/3 chacun, et un balayage par
algorithme dans lequel chaque cas concorde ou est diagnostiqué ; le `Math.log` d’Eades est un portage fdlibm exact au
bit près ;
[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Depuis la
mission 8c, rectpacking, spore (`sporeOverlap`, `sporeCompaction`) et topdownpacking s’exécutent aussi (prouvés par
2 593 lignes d’oracle dans trois références, 44 goldens `packing`, les huit suites JUnit portées en 30 exécutions, et
un balayage par algorithme dans lequel chaque cas déterministe concorde ou est diagnostiqué ;
[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Chaque algorithme
du périmètre est balayé contre l’oracle, et le résultat par algorithme est publié dans le rapport de parité
([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Relation avec ELK Java et l’oracle

![Relation entre ELK Java, la compilation de l’oracle, les références golden et elk-engine](/diagrams/overview-1.svg)

La série de patchs est vide dans cette mission (AD-3). Les goldens sont versionnés, la CI n’a donc pas besoin de JVM
(AD-5). Comparaison : structure exacte, coordonnées à 1e-6 près (AD-4).

## Flux principaux

Le layout dans ELK, que elk-engine reproduit aujourd’hui pour `fixed`, `box` et `random` (détails dans
[component-map.md](#carte-des-composants) et
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)) :

![Déroulement d’un appel de layout à travers le moteur de layout récursif](/diagrams/overview-2.svg)

Adaptateur JSON (`graph.json`, `ElkGraphJson`) : l’ELK JSON en entrée devient un ElkGraph via l’importeur
avant le layout ; après le layout, les coordonnées calculées et les sections d’arêtes sont reportées dans
l’ELK JSON en sortie. Le harnais de l’oracle utilise l’adaptateur Java selon les deux mêmes étapes, si bien que les deux côtés partagent le
contrat JSON.

Adaptateur de texte (`graph.text`, `ElkGraphText`) : le texte `.elkt` se charge en ElkGraph au moyen d’un parseur,
d’un linker et d’un validateur écrits à la main sur un petit sous-ensemble d’Xtext (`src/xtext`), et un ElkGraph se
sérialise de nouveau en `.elkt`. Le point d’entrée est interne ; voir
[elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Adaptateur de JSON textuel (`graph.json.text`, `ElkGraphJsonText`) : le texte `.elkj` se charge à travers le même
sous-ensemble d’Xtext avec un parseur écrit à la main, et se lie paresseusement comme le `LazyLinker` d’Xtext : les
extrémités d’arêtes sont des proxies EMF (`src/emf`) qui se résolvent à la lecture. Un ElkGraph se sérialise de nouveau
en `.elkj` au moyen d’un écrivain propre à la grammaire. Le point d’entrée est interne ; voir
[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Générateur de graphes aléatoires (`core.debug.grandom`, `GRandomText`) : le texte `.elkr` est analysé par un lexeur et
un parseur écrits à la main sur le même sous-ensemble d’Xtext (`src/xtext`), et `RandomGraphGenerator` transforme une
configuration en ElkGraphs avec la séquence exacte du `Random` de la JVM. La sortie avec graine est identique à
l’octet près à l’oracle et reproduit les neuf fichiers `test/corpus/generated/*.json` ; les chemins sans graine (texte
des étiquettes d’arêtes, mélange entre hiérarchies, graine manquante) ne sont vérifiés que par des invariants. Le
point d’entrée est interne ; voir
[grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Documentation et chaîne de publication

Ajouté par la ligne 12 de la feuille de route ; décisions DP1 à DP9 dans
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md).
`1.0.0` a été publié le 2026-11-23.

| Élément               | Ce que c’est                                                                                                                                                                                                                                           |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Surface d’export      | Acceptée (2026-11-23), listée dans [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) et maintenue égale à `src/index.ts` par `src/index.test.ts` ; figée à `1.0.0`, la première publication npm (AD-14) |
| Référence d’API       | `npm run docs:api` : typedoc dans le paquet privé `tools/typedoc/` avec son propre TypeScript 6 (typedoc n’a pas de version pour TypeScript 7, AD-6), vers le `/reference/` généré                                                                     |
| Exemples              | `test/docs/examples/*.ts`, montrés sur la page de démarrage du site sous forme d’extraits et comparés aux références de l’oracle (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                 |
| Vérification de liens | `npm run docs:linkcheck` : linkinator sur le site construit, liens internes et fragments, en CI ; liens externes chaque semaine (`links.yml`)                                                                                                          |
| Répétition de paquet  | `npm run pack:smoke` : empaqueter, vérifier la liste des fichiers, installer hors ligne dans un projet propre, importer, y exécuter un layout d’exemple et le comparer à sa référence de l’oracle                                                      |
| Publication           | configuration de semantic-release et `release.yml`, exécutés à chaque push sur `main` ; runbook dans [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                  |

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

Portés par la mission 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)) :
`RecursiveGraphLayoutEngine` (scindé avec `RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver`, et les
sous-classes d’`AbstractLayoutProvider` `FixedLayoutProvider`, `BoxLayoutProvider` et `RandomLayoutProvider`.
`LayoutMetaDataService`, `LayoutAlgorithmData` et les types de propriétés sont venus plus tôt (missions 2 et 3). La
mission 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b))
a complété le bundle : `AlgorithmAssembler` et `LayoutProcessorConfiguration` (le pipeline que tout bundle
d’algorithme utilise), `LayoutConfigurator`, `ElkSpacings`, les sections d’`ElkMath`, `ElkGraphAdapters`,
`util/selection/*` et `comments/*`. Ses shims JDK sont `src/java/awt/geom` (`Rectangle2D`) et `src/java/util/regex`
(`Pattern`, `WordBoundary`), à côté de `JavaCharacter` dans `src/java/lang` ; ils sont prouvés par `awt.json`,
`regex.json`, `character.json` et `regex-boundary.json`. Les missions 6a et 6b
([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) ont porté tout
`alg.common` ; 6b a ajouté `nodespacing` et `NodeMicroLayout`, prouvés par un rejeu d’oracle de `NodeMicroLayout` de
326 lignes.

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

Dans elk-engine, l’étape `.melk` est remplacée par un générateur (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) et ElkGraph
devient de simples classes TS (AD-11). Correspondance avec les fichiers TS : [carte de portage](/guide/port-map) ; règles :
[règles de traduction](/guide/translation-rules).
