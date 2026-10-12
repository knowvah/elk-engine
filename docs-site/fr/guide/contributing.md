---
title: Contribuer
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Contribuer

Lisez d’abord la [Vue d’ensemble](/fr/guide/overview) et les [Règles de traduction](/guide/translation-rules) (en anglais). Le Java
au commit épinglé est la spécification ; en cas de doute, lisez le Java.

## Gates

Exécutez-les avant chaque commit. Chacune doit réussir.

| Commande               | Vérifie                                                                         |
| ---------------------- | ------------------------------------------------------------------------------- |
| `npm run format:check` | Le formatage Prettier                                                           |
| `npm run typecheck`    | La vérification de types TypeScript (`tsc --noEmit` natif)                      |
| `npm test`             | La suite vitest, y compris la suite golden                                      |
| `npm run coverage`     | La suite avec 90 % de couverture de lignes, branches, fonctions et instructions |

Nécessite Node 22 ou plus récent. Installez les dépendances avec `npm ci`.

## Les tests sont immuables

Les valeurs attendues proviennent de l’oracle, des vecteurs JVM ou du code source Java avant l’écriture de
l’implémentation (AD-13). Une fois écrite, une assertion est figée : un test qui échoue signifie que
l’implémentation est fausse.

Si un test ne peut réussir qu’en modifiant son assertion, un vecteur ou un golden, arrêtez-vous et consignez le cas
dans le journal de décisions de la mission. N’assouplissez pas une tolérance, ne supprimez pas un cas et ne
régénérez pas une référence pour obtenir un résultat vert. Les références golden sont régénérées par script, jamais à la main.

## Processus de travail

1. Créez une branche de fonctionnalité, par exemple `feature/<short-description>`.
2. Rédigez les messages de commit comme des [Conventional Commits](https://www.conventionalcommits.org), par exemple
   `feat(java): add JavaHashMap`. Les sujets sont en minuscules et font au plus 72 caractères.
3. Ouvrez une pull request vers `main`. La CI vérifie que le titre de la pull request est un Conventional Commit.
4. Les commits doivent être signés ; le ruleset du dépôt l’exige.
5. Les pull requests sont fusionnées avec un commit de fusion.

Chaque fichier de code porte un en-tête SPDX, `// SPDX-License-Identifier: EPL-2.0`. Un test de fitness
l’impose. Les dépendances doivent être compatibles avec EPL-2.0.

## Commandes de documentation

| Commande               | Objet                                                              |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run docs:dev`     | Démarre le site de documentation avec rechargement à chaud         |
| `npm run docs:build`   | Compile le site ; un lien interne mort fait échouer la compilation |
| `npm run docs:preview` | Sert localement le site compilé                                    |

La plupart des pages de référence incluent des fichiers de `docs/`. Modifiez le fichier dans `docs/`, pas la page sous
`docs-site/`. Les diagrammes PlantUML des fichiers inclus sont rendus en SVG et versionnés sous
`docs-site/public/diagrams/`.

## Répertoires externes

Les scripts et les tests localisent les checkouts voisins grâce à des variables d’environnement. Les valeurs par défaut sont
relatives à la racine du dépôt. Seuls `tools/` et `test/` lisent ces variables ; le code de `src/` ne le fait jamais.

| Variable         | Par défaut                     | Contenu                                                   |
| ---------------- | ------------------------------ | --------------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Code source Java d’Eclipse ELK au commit épinglé          |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Worktree détaché et oracle compilé                        |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Le corpus elk-models, épinglé dans le manifeste du corpus |

La compilation de l’oracle nécessite Maven 3.9 ou plus récent et JDK 21 (JDK 17 en repli). Voir
[Conformité](/fr/conformance) pour la procédure de l’oracle.
