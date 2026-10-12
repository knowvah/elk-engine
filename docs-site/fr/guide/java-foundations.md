---
title: Fondations Java
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Fondations Java

Les résultats d’ELK dépendent du comportement du runtime Java : débordement des entiers sur 32 bits,
arrondi des `float`, ordre d’itération de `HashMap`, séquences de `Random` et conversion des nombres
en texte. La mission java-foundations (terminée le 2026-10-11) a livré les shims qui reproduisent ce
comportement, ainsi que les vecteurs enregistrés sur la JVM qui les prouvent.

Les shims sont implémentés uniquement à partir de la spécification du Javadoc. Aucun code source
d’OpenJDK n’est lu ni copié (AD-9). Chaque shim est vérifié par rapport à des vecteurs générés sur une
vraie JVM.

## Shims

| Domaine                | Emplacement              | Contenu                                                                                                                                                                                                           |
| ---------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nombres et texte       | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                                   |
| Math                   | `src/java/lang/JavaMath` | `l2i` (le `(int)` d’un `long`)                                                                                                                                                                                    |
| Exceptions             | `src/java/lang/`         | Six classes d’exception                                                                                                                                                                                           |
| Collections            | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                                     |
| Remplacements de Guava | `src/guava/`             | 20 fichiers : `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` et cinq implémentations |

`Math.log10` n’a pas besoin de shim : la fonction native de V8 correspond aux 1264 lignes enregistrées.
Guava n’est jamais une dépendance ; `src/guava/` contient de petits utilitaires locaux.

## Vecteurs JVM

Les vecteurs sont enregistrés par `tools/vectors/JavaVectors.java` (et `GuavaVectors.java` pour Guava
33.3.0-jre). Ils sont figés : les régénérer produit des fichiers identiques octet pour octet.

| Groupe      | Lignes ou scripts                                                                                          |
| ----------- | ---------------------------------------------------------------------------------------------------------- |
| Numérique   | `l2i` 78, `Float32` 2704, double vers float 72, `log10` 1264, division par zéro 40, `Int64` 4056           |
| Hash        | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, hash KVector 256 |
| Texte       | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random      | `setSeed` en milieu de séquence : 4 graines de 25 opérations chacune                                       |
| Collections | 1206 scripts `HashMap`, 1172 scripts `HashSet` et 231 scripts `PriorityQueue`                              |
| Guava       | 1518 scripts, 25,611 étapes                                                                                |

## Limites connues

- L’ordre JVM des entrées de `HashMap` dont les clés ont des codes de hachage égaux et ne sont pas
  `Comparable` suit l’identité des objets et ne peut pas être reproduit. Les cas de conformité qui en
  dépendent nécessitent une entrée dans les divergences connues.
- Les scripts `HashMap` et `HashSet` dépendant de l’identité sont ignorés dans les vecteurs, et les
  scripts `PriorityQueue(Collection)` le sont aussi, car ELK n’a aucun appelant pour eux.
- `Sets.newTreeSet` renvoie un instantané. Un shim `TreeSet` dynamique est nécessaire avant le portage
  de `ScanlineOverlapCheck` et `ScanlineConstraintCalculator`.

Les règles de traduction des collections figurent sur la page [Règles des collections](/guide/collections-rules).
La prochaine mission de la [feuille de route](/guide/roadmap) est le système de propriétés et le modèle ElkGraph.
