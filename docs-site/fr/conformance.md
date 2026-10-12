---
title: Conformité
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformité : ce que « correspondre » signifie

@knowvah/elk-engine est validé par rapport à Eclipse ELK (Java) en amont, compilé depuis les
sources. Un layout TypeScript est **conforme** à l’oracle lorsque, après analyse des deux comme
ELK JSON, la structure et chaque valeur non numérique sont exactement égales et que chaque nombre
fini concorde à une tolérance absolue de `1e-6`.
Le comparateur est [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts) ;
ce document décrit ce qu’il implémente. Les règles de portage se trouvent dans
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Section                                                        | Répond à                                                      |
| --- | -------------------------------------------------------------- | ------------------------------------------------------------- |
| 1   | [Oracle](#1-oracle)                                            | Qu’est-ce qui est « correct », et à quel commit ?             |
| 1a  | [Unité de conformité](#1a-unité-de-conformité)                 | Qu’est-ce qu’un cas, et quels cas existent ?                  |
| 2   | [Critère de conformité](#2-critère-de-conformité)              | Qu’est-ce qui compte comme égal ?                             |
| 3   | [Goldens et corpus](#3-goldens-et-corpus)                      | D’où viennent les sorties de référence ?                      |
| 4   | [Patchs de seam](#4-patchs-de-seam)                            | Comment modifions-nous l’oracle ?                             |
| 5   | [Exploitation de l’oracle](#5-exploitation-de-loracle-runbook) | Que faire quand il tombe en panne ?                           |
| 6   | [Gates](#6-gates)                                              | Que faut-il réussir avant qu’une modification soit intégrée ? |

## 1. Oracle

L’oracle (AD-3) est ELK en amont, **compilé depuis les sources** dans un worktree git détaché de
`$ELK_SOURCE_DIR`, créé à `$ELK_ORACLE_DIR` par `tools/oracle/build.sh`. Les deux se trouvent hors de
ce dépôt ; aucun n’est vendorisé.

| Élément            | Emplacement                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| Commit ELK épinglé | `tools/oracle/ELK_COMMIT` (actuellement `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)  |
| Série de patchs    | `tools/oracle/patches/*.patch`, appliqués par ordre lexical avec `git am --3way`     |
| Build              | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21 ; Tycho télécharge les artefacts p2)   |
| Exécuteur par lots | `tools/oracle/run.sh <outDir> <input>...` ou `run.sh --cases <cases.jsonl> <outDir>` |
| Harness            | `tools/oracle/harness/ElkOracle.java`                                                |
| Manifeste de build | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patchs, JDK, jar par bundle)            |

**Build.** `build.sh` exécute `mvn -P elk-meta clean install -DskipTests` (le compilateur melk), puis
`mvn clean install -DskipTests -Dmaven.test.skip=true` depuis `build/` dans le worktree, puis
enregistre dans `oracle-build.json` le jar de chaque bundle dans le périmètre (`core`, `graph`,
`graph.json`, `alg.common`, et les algorithmes `layered`, `mrtree`, `radial`, `force`, `disco`,
`rectpacking`, `spore`, `topdownpacking`, `vertiflex`). Un worktree existant n’est réutilisé que s’il
descend de `ELK_COMMIT`, porte exactement les lignes d’objet de patch présents dans `tools/oracle/patches/`
et est propre en dehors de la sortie de build ; sinon `build.sh` se termine avec le code `2` et le
laisse intact.

**Run.** `run.sh` compile `ElkOracle.java` avec les jars des bundles ainsi que les bundles tiers
(Gson, Guava, EMF, bibliothèques Xtext/Xtend) issus du cache p2 de Tycho (`P2_BUNDLES`, par défaut
`~/.m2/repository/p2/osgi/bundle` ; la version la plus récente de chacun est utilisée). Une seule JVM
dispose chaque entrée avec `RecursiveGraphLayoutEngine` et écrit `<outDir>/<input basename>.json`,
avec le layout, les dimensions à zéro et les positions à zéro inclus, et les options de layout
inconnues omises. Une entrée en échec affiche `ERROR <input>: <message>` ; la JVM se termine avec le
code `1` si une entrée a échoué. Les noms de base des entrées doivent être uniques au sein d’une
exécution, puisque le nom de sortie est le nom de base.

**Sémantique de la série de patchs.** La série contient aujourd’hui un patch :

| Patch                                                                   | Effet                                                                                                                                                                                                                                                            | Seam TS associé                                                                                                                                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` résout les collisions d’id avec `"_g" + Random.nextInt(1000000)` ; le patch initialise ce `Random` à partir de la propriété système `org.eclipse.elk.graph.json.exportSeed` (non définie = comportement d’ELK). `run.sh` transmet `EXPORT_SEED=1` | `Random` injectable dans le portage de `graph.json` ; en attente de ce portage (le shim `Random` en TS reproduit déjà la séquence : la graine 1 donne 548985, 764588) |

Les patchs n’existent que pour ajouter des seams étroitement ciblés qui rendent comparables les
comportements de la JVM et de JS ; chacun est associé à un seam côté TS (section 4).

**Pourquoi pas elkjs ?** elkjs est ELK compilé par GWT. Il ne peut pas porter notre série de patchs,
et l’émulation GWT de la JRE diffère de la JVM depuis laquelle nous portons. Il n’est pas consulté
comme oracle.

## 1a. Unité de conformité

Un **cas** est `(algorithm, model, variant)` (D1). Le tableau de bord de parité a une ligne par
algorithme de layout ; le dossier elk-models et les caractéristiques du census sont des filtres, pas
des lignes.

**Id de cas.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, par exemple
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` est l’id de l’algorithme
sans `org.eclipse.elk.`. Pour les modèles générés, `modelId` vaut `generated/<name>`.

**Id de modèle et source (D3).** L’id de modèle est le chemin dans elk-models sans l’extension.
Un cas lit le `.json` s’il existe, sinon le `.elkt` ; `.elkg` (EMF XMI) n’est jamais lu.

**Variantes (D6).** Surcouches d’options nommées dans `test/corpus/variants.json`, appliquées à la racine :
`default` (aucune), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algorithme                                        | Modèles                        | Variantes                  |
| ------------ | ------------------------------------------------- | ------------------------------ | -------------------------- |
| native       | le `rootAlgorithm` propre au modèle               | tous les modèles du census     | les sept                   |
| retarget     | tout algorithme listé sauf celui propre au modèle | tous les modèles du census     | `default` seulement (OR-1) |
| generated    | l’algorithme nommé par le préfixe du fichier      | `test/corpus/generated/*.json` | les sept                   |
| ported JUnit | selon la mission de l’algorithme                  | cas JUnit en amont (AD-13)     | tels que portés            |

`tools/oracle/run.sh --list-algorithms` donne la liste des ids d’algorithme (14 aujourd’hui).

**Retarget (D2).** Le harness définit `org.eclipse.elk.algorithm` sur **chaque nœud qui a des
enfants**, en remplaçant toute valeur déclarée, et `org.eclipse.elk.randomSeed = 1` sur la racine. ELK
résout l’algorithme nœud par nœud, et un nœud non défini retombe sur layered. Une racine sans
enfants ne reçoit que la graine. Le tier retarget ignore le `rootAlgorithm` propre à chaque modèle (le
tier native le couvre).

## 2. Critère de conformité

AD-4, exactement tel que `compareLayout(expected, actual, { tol })` l’implémente :

| Règle                     | Comportement                                                                                                                                                                                                   |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolérance                 | Absolue, `DEFAULT_TOLERANCE = 1e-6` ; les nombres finis passent lorsque `abs(e - a) <= tol`                                                                                                                    |
| Nombres non finis         | `NaN` et `±Infinity` doivent être exactement égaux (`Object.is` ou `===`), même avec `tol: Infinity`                                                                                                           |
| Chaînes, booléens, `null` | Strictement égaux, sinon `value`                                                                                                                                                                               |
| Type incompatible         | Des genres JSON différents (`null`, tableau, objet, nombre, chaîne, booléen) donnent une seule divergence `type`                                                                                               |
| Clés d’objet              | L’ensemble des clés doit être identique : une clé seulement dans expected est `missing`, seulement dans actual est `extra`                                                                                     |
| Tableaux                  | Appariés **par `id`** lorsque chaque élément des deux côtés est un objet avec un `id` de type chaîne et que les ids sont uniques de chaque côté (un tableau vide compte comme indexé) ; sinon **par position** |
| Tableaux indexés          | Un id d’un seul côté est une divergence `structure` à `path[id=<id>]` ; l’ordre est ignoré                                                                                                                     |
| Tableaux positionnels     | Une différence de longueur est une seule divergence `structure` et les éléments ne sont plus comparés                                                                                                          |
| Genres de divergence      | `structure`, `value`, `type`, `missing`, `extra` ; `path` ressemble à un chemin JSON (`children[id=n1].x`)                                                                                                     |

Conséquences : les ids d’éléments, le nombre d’éléments, la topologie des sections d’arête et le
nombre de points de pliure sont exacts parce que les ids et les longueurs de tableau sont exacts ;
les coordonnées et les tailles bénéficient de `1e-6`. `formatDiffs` affiche au plus 20 divergences.

**Politique des divergences connues.** Une divergence n’est jamais absorbée en augmentant `tol`
ni en modifiant un golden (AD-13). Chacune est consignée ici avec sa cause et le test ou la fixture
qu’elle affecte. Classes acceptées :

- **Différences `Math.*` au niveau de l’ulp.** V8 et la JVM peuvent différer sur le dernier bit
  de `sin`, `cos`, `exp`, `log`, `pow` et consorts ; le `StrictMath` de Java est spécifié au bit près,
  `Math` ne l’est pas. Le cas déjà rencontré : `nextGaussian` est spécifié pour utiliser
  `StrictMath.log`, donc `src/java/util/Random.ts` embarque une implémentation exacte de
  `StrictMath.log` au lieu de `Math.log`. Préférez un portage exact au bit près de l’algorithme de
  `StrictMath` à un élargissement de la tolérance.
- **Itération sur des hachages d’identité (AD-10).** Itérer sur une `HashMap`/un `HashSet` dont les clés
  sont des objets hachés par identité est non déterministe en Java même. Journalisez le site
  et portez avec l’ordre d’insertion ; les goldens ne doivent pas en dépendre.
  Les clés hachées par valeur (String, Integer) doivent reproduire l’ordre de Java.
- **`Random` initialisé par l’horloge.** Avec `randomSeed = 0`, ELK initialise depuis l’horloge
  (`core/Core.melk:608`), la sortie n’est donc pas reproductible. Les entrées des goldens doivent
  laisser la graine non définie ou non nulle (la graine par défaut de layered est `1`).

Entrées concrètes (n’en ajoutez une qu’avec l’accord de l’utilisateur) :

| #   | Divergence                          | Cause                                                                           | Portée                                                                                                                                                                                | Approuvée                   |
| --- | ----------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- |
| 1   | Texte du message d’erreur d’analyse | Les messages ANTLR sont des artefacts du parseur généré, qui n’est jamais porté | Entrée de grammaire invalide (`.elkt`, `.elkj`, `.elkr`) : seule la _présence_ d’un échec d’analyse doit correspondre, pas le message. Une entrée valide doit correspondre exactement | D8, utilisateur, 2026-10-11 |

**Verdicts.** Chaque cas reçoit un verdict à partir de deux exécutions JVM distinctes de l’oracle (D4, D5, OR-2) :

| Verdict            | Signification                                                                                                                                                                          |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Les deux exécutions ont disposé le modèle et les fichiers de sortie sont identiques octet pour octet                                                                                   |
| `throws`           | Les deux exécutions ont levé la même exception : classe exacte, et message exact une fois `@[0-9a-f]+` remplacé par `@<hash>` (le message peut être null, p. ex. `StackOverflowError`) |
| `nondeterministic` | Les exécutions divergent (octets de sortie, exception, ou un `ok` et un `throws`)                                                                                                      |
| `oracle-error`     | Défaut du harness (entrée illisible, variante/algorithme/option inconnu, ligne de résultat perdue) ; jamais acceptable                                                                 |
| `timeout`          | Une exécution a dépassé `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                         |

Priorité : `oracle-error`, puis `timeout`, puis `ok`/`throws` lorsqu’ils sont égaux, sinon
`nondeterministic`. Avant la comparaison octet par octet, chaque jeton `@[0-9a-f]+` des deux sorties est
remplacé par `@<hash>`, comme dans les messages d’exception (D5a ; `sameOutput` dans `tools/corpus/sweep.ts`).
Cause : l’option programmatique `debug.discoGraph` de disco exporte `...DCGraph@<identity hash>`,
qu’aucune graine ne peut fixer. Le comparateur TS applique le même remplacement. Les cas non déterministes
sont signalés à part et exclus des totaux de réussite, conformément à la politique sur les hachages
d’identité ci-dessus.

Sources réelles restantes de `nondeterministic` (comportement d’ELK, pas des défauts du harness ; les totaux figurent dans
le rapport de parité) : spore (`ElkGraphImporter.java:169` applique un jitter avec `Math.random`) et `random`
(la `randomSeed` par défaut 0 n’est pas initialisée sur les composites imbriqués ; retarget n’initialise que la racine, D2,
conservé sur décision de l’utilisateur). Les renommages d’id `_g<random>` de l’exporteur n’en sont pas une source : le patch de seam
les corrige.

## 3. Goldens et corpus

AD-5. Les sorties de référence sont committées pour que la CI n’ait pas besoin de JVM.

| Élément             | Emplacement                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| Corpus épinglé      | `eclipse-elk/elk-models` au `commit` de `test/corpus/manifest.json` (non vendorisé)              |
| Dossier des modèles | `$ELK_MODELS_DIR`, par défaut `../../eclipse-elk/elk-models` relatif à ce dépôt                  |
| Ensemble curé       | `golden[]` dans `test/corpus/manifest.json` : `{ id, path, note }`                               |
| Refs                | `test/golden/refs/elk/<id>.json`, une par `id` du manifeste                                      |
| Provenance          | `test/golden/refs/elk/_meta.json` : `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Correspondance id vers chemin.** `golden[].path` est relatif à `$ELK_MODELS_DIR`, et
l’entrée est `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` exécute le harness sur
ces entrées et dépose chaque sortie `<basename>.json` sous `refs/elk/<id>.json`.
Exemple : l’id `ptolemy-scrambler` correspond à
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Régénération** (`tools/oracle/regen-goldens.sh`) :

1. Exige que le clone des modèles soit exactement au commit du manifeste (sinon code de sortie `1`).
2. Exige un oracle compilé (`run.sh` a besoin de `oracle-build.json`).
3. Prépare toutes les refs et `_meta.json` dans `test/golden/refs/.elk-staging.*`, puis
   échange le dossier en deux renommages, de sorte qu’une exécution en échec laisse les anciennes refs.
4. `_meta.json` ne contient aucun horodatage (`builtAt` reste dans `oracle-build.json`), donc une
   régénération sans entrée modifiée est un no-op octet pour octet dans git.

**Quand régénérer :** après une modification de `ELK_COMMIT`, de la série de patchs, de l’ensemble
`golden[]` ou du `commit` du manifeste, ou du harness. Jamais autrement.

**Règle de journalisation.** Toute régénération qui modifie une ref est journalisée avec la
cause (l’id du patch, ou la montée de commit). Les refs ne sont jamais modifiées à la main. Si une
assertion TS ou un golden ne peut passer qu’en étant modifié, arrêtez-vous et journalisez (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` ne dispose rien : il exécute l’oracle en mode analyse
sur chaque modèle et compare le résultat au `test/corpus/census.json` committé (898
modèles : id, formats, source, algorithme racine, nombres de caractéristiques). Code de sortie `0` si égal, `1` en cas de dérive ;
`--write` réécrit le fichier. Il ne s’exécute que dans le clone des modèles épinglé et s’interrompt sur un
défaut du harness.

**Corpus généré (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` contient une configuration
grandom initialisée par graine ; son `.json` voisin est l’entrée non disposée générée par l’oracle. Neuf configurations couvrent
les ids d’algorithme qu’aucun modèle elk-models n’utilise : `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Chacune a au plus 50 nœuds et
aucune étiquette d’arête (`BlindTextGenerator` n’est pas initialisé par graine). Le harness nomme la racine générée `root`,
car le `JsonExporter` d’ELK résout une collision d’id avec un suffixe aléatoire non initialisé. Ne régénérez
qu’avec `tools/oracle/regen-generated.sh` (dossier de préparation et renommage ; une configuration en échec
laisse les anciens fichiers) ; une nouvelle exécution sans changement est un no-op dans git. Le portage TS de grandom doit
reproduire ces fichiers `.json` octet pour octet ; les goldens d’algorithme n’en dépendent jamais.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planifie chaque cas, exécute chacun deux fois dans des JVM distinctes (les shards valent
par défaut `min(cpus, 8)` processus `run.sh` simultanés) et écrit
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` affiche le nombre de cas par tier et n’exécute rien ; `--filter` conserve les ids de cas contenant
la sous-chaîne ; `--limit` prélève un échantillon à pas régulier. Code de sortie `0` sauf si un cas est `oracle-error`
(`1`) ; un échec d’outil se termine avec `2`. Les sorties par cas restent locales (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(par défaut `30000`, lu uniquement par `tools/`) borne chaque cas ; `run.sh` redémarre une JVM après un
timeout (code de sortie JVM 75) pour les cas sans ligne de résultat.

**Rapport de parité (D9).** `docs/parity-report.md` est généré depuis le cache du sweep et committé :
totaux par algorithme et par verdict, avec les commits d’ELK et des modèles et sans horodatage. Régénérez
avec `npx tsx tools/corpus/parity-report.ts --write` ; sans `--write`, la commande se termine avec `1`
lorsque le rapport committé est périmé. Ne le modifiez jamais à la main.

**Tests du corpus.** `resolveModelsDir()` dans `test/corpus/corpus.ts` renvoie une raison de
`skip` lorsque le clone est absent ou à un autre commit ; les tests qui en ont besoin
sont ignorés, avec le sha épinglé dans le message. Aujourd’hui, `test/golden/oracle-refs.test.ts`
ne vérifie que les refs committées : une par id du manifeste, la géométrie sur chaque nœud,
port, étiquette et arête, l’auto-comparaison, et que `_meta.json` correspond à
`ELK_COMMIT`, au manifeste et au générateur. Il n’existe pas encore de test de layout
TS contre oracle ; il arrivera avec le premier algorithme porté.

## 4. Patchs de seam

Les patchs de seam modifient l’oracle ; ils sont rares et toujours associés à un seam TS.

1. Modifiez et committez dans le worktree de l’oracle (`$ELK_ORACLE_DIR`), ou rédigez le patch dans un
   clone de travail à `ELK_COMMIT`. Pour ajouter un patch terminé au worktree existant sur place (conserve les
   caches `census/` et `sweep/`, que la suppression du worktree efface), appliquez-le avec l’identité de
   `build.sh` :
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>` ;
   `build.sh` vérifie ensuite la série et recompile sur place (environ 3 minutes), les étapes 4-5
   peuvent donc être sautées.
2. Exportez :
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (ou seulement les nouveaux commits). Les fichiers sont nommés `NNNN-<slug>.patch` ; le préfixe
   numérique fixe l’ordre d’application.
3. Ajoutez le seam TS correspondant (même comportement, injectable, dans `src/`), avec des tests
   dont les valeurs attendues proviennent de l’oracle patché (AD-13).
4. Sinon, supprimez le worktree : `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (ajoutez `--force` si la sortie de build le rend sale).
5. Recompilez : `tools/oracle/build.sh` (réapplique la série depuis zéro).
6. Régénérez : `tools/oracle/regen-goldens.sh` ; examinez `git diff test/golden/refs`.
7. Journalisez une entrée nommant le patch (`NNNN-<slug>.patch`) et listant chaque
   ref modifiée. `patches` dans `_meta.json` enregistre automatiquement la série.

Ne laissez jamais une modification non committée dans le worktree : `build.sh` la traite comme périmée
(code de sortie `2`). Ne modifiez jamais `ELK_SOURCE_DIR` lui-même.

## 5. Exploitation de l’oracle (runbook)

| Panne                                                                                | Détection                                                                                                                                                                                                                                                                              | Remède                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Échec du build Tycho (p2 injoignable, JDK, version de Maven)                         | `tools/oracle/build.sh` se termine avec un code non nul ; la sortie Maven complète se trouve dans `.oracle-build.log` à la racine du dépôt. Le code `1` signale un outil manquant ou un mauvais Maven ; le code `3` signifie qu’un jar de bundle n’a pas été produit                   | Maven doit être en **3.9.x** : Tycho 4.0.12 échoue avec Maven 3.10 (le 3.10.0 de Homebrew) avec `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Un 3.9.11 local se trouve dans `.tools/apache-maven-3.9.11/` (ignoré par git) : `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Utilisez JDK 21, ou JDK 17 via `JAVA_HOME`. Vérifiez le réseau (la première exécution télécharge des artefacts p2), puis relancez. `build.sh --record-only` saute Maven et ne réécrit que `oracle-build.json` à partir des jars déjà compilés. Code `2` : supprimez le worktree (section 4, étape 4) et recompilez. Sinon, escaladez avec la fin du log |
| `build.sh` se termine avec `2` juste après l’application d’un patch                  | Worktree signalé comme périmé                                                                                                                                                                                                                                                          | `build.sh` déplie les lignes d’objet de patch repliés (`git format-patch` les replie au-delà d’environ 78 caractères) et ignore les caches non suivis `census/` et `sweep/` ; toute autre saleté ou un patch non listé donne encore le code `2` : réparez le worktree (section 4)                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Dérive des goldens après un patch ou une montée de commit                            | `tools/oracle/regen-goldens.sh` suivi de `git diff --exit-code test/golden/refs` n’est pas vide ; `test/golden/oracle-refs.test.ts` échoue sur un `_meta.json` périmé (`elkCommit`, `modelsCommit`) ; un test de conformité TS, une fois présent, échoue avec un rapport `formatDiffs` | Recompilez (`build.sh`), lancez `regen-goldens.sh`, examinez le diff, journalisez l’id du patch. Ne modifiez jamais une ref à la main et ne relâchez jamais `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Jar Xtext/ANTLR absent du cache p2 (`.elkt`, `.elkr`, ou tout démarrage de `run.sh`) | `run.sh` se termine avec un code non nul et `bundle <name> not in p2 cache <dir>` (p. ex. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                         | Définissez `P2_BUNDLES` sur le cache p2 de Tycho qui le contient, ou lancez `build.sh` avec un accès réseau pour que Tycho le récupère ; relancez `run.sh`. Ne substituez pas des jars provenant d’ailleurs                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Blocage ou OOM du sweep                                                              | Un cas va jusqu’au timeout et signale `timeout` (une ligne stderr le nomme) ; une exécution sans ligne de résultat donne `oracle-error` et `sweep: shard <n> run <A or B> exited <code>` sur stderr ; la machine swappe avec 8 JVM simultanées                                         | Réduisez la concurrence et la taille des lots : `sweep.sh --shards 2`, restreignez avec `--filter` ou `--limit`. N’augmentez `ELK_SWEEP_TIMEOUT_MS` que pour un modèle lent mais correct. Un `timeout` reproductible est un constat : journalisez l’id du cas, n’élargissez pas la limite pour le masquer                                                                                                                                                                                                                                                                                                                                                                                          |
| Dérive du census après une montée d’épingle (`ELK_COMMIT` ou `commit` des modèles)   | `npx tsx tools/corpus/census.ts` se termine avec `1` et liste les modèles divergents ; `test/corpus/census.test.ts` échoue                                                                                                                                                             | Confirmez que le clone et l’oracle sont aux nouvelles épingles, relancez `census.ts --write`, examinez `git diff test/corpus/census.json`, journalisez la cause, puis relancez `sweep.sh` et régénérez le rapport de parité. Ne modifiez jamais le census à la main                                                                                                                                                                                                                                                                                                                                                                                                                                |
| elk-models absent ou mauvais sha                                                     | Les tests du corpus sont ignorés avec un message nommant le sha attendu ; `regen-goldens.sh` se termine avec `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                        | Lancez `test/corpus/fetch.sh` (clone et extrait le commit épinglé). Il se termine avec `2` si un clone existant est à un autre commit et n’y touche pas : réparez ce clone vous-même ou pointez `ELK_MODELS_DIR` vers un chemin neuf. Ne déplacez jamais le HEAD d’un clone existant depuis un script                                                                                                                                                                                                                                                                                                                                                                                              |

Autres échecs de `run.sh` : `oracle-build.json missing` ou `oracle jar missing`
signifie qu’il faut d’abord lancer `build.sh` ; `bundle <name> not in p2 cache` signifie qu’il faut
définir `P2_BUNDLES` sur le cache p2 de Tycho ou relancer `build.sh` avec un accès réseau.

## 6. Gates

Chaque modification :

| Gate                | Commande                                                     | Critère                                                                                           |
| ------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- |
| Types               | `npm run typecheck`                                          | code de sortie 0                                                                                  |
| Tests et couverture | `npm run coverage`                                           | tous les tests passent ; 90 % d’instructions, de branches, de fonctions et de lignes sur `src/**` |
| Architecture        | `test/architecture/*.fitness.test.ts` (lancé par `npm test`) | frontières de modules, globales de module, aucun builtin Node dans `src/`, en-têtes SPDX          |
| Refs de l’oracle    | `test/golden/oracle-refs.test.ts`                            | refs committées cohérentes avec le manifeste et `ELK_COMMIT`                                      |

Les modifications de `tools/oracle/`, du manifeste ou de la série de patchs exigent en plus :

| Gate                  | Commande                                                                      | Critère                                                                       |
| --------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Build de l’oracle     | `tools/oracle/build.sh`                                                       | code de sortie 0                                                              |
| Exécution de l’oracle | `tools/oracle/run.sh <outDir> <input.json>...`                                | code de sortie 0, aucune ligne `ERROR`                                        |
| Stabilité des goldens | `tools/oracle/regen-goldens.sh`, puis `git diff --exit-code test/golden/refs` | aucun diff, sauf si la modification doit déplacer des refs et est journalisée |
| Shell                 | `shellcheck tools/oracle/*.sh`                                                | propre                                                                        |

Les modifications de `tools/oracle/` ou `tools/corpus/` exigent en plus :

| Gate                | Commande                                                                             | Critère                                                               |
| ------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Census              | `npx tsx tools/corpus/census.ts`                                                     | code de sortie 0 (aucune dérive)                                      |
| Stabilité du généré | `tools/oracle/regen-generated.sh`, puis `git diff --exit-code test/corpus/generated` | aucun diff                                                            |
| Sweep               | `tools/oracle/sweep.sh` (ou `--filter`/`--limit` pour un échantillon)                | code de sortie 0 : aucun `oracle-error`                               |
| Rapport de parité   | `npx tsx tools/corpus/parity-report.ts`                                              | code de sortie 0 (rapport committé à jour) ; régénérez avec `--write` |
