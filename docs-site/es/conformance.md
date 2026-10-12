---
title: Conformidad
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Conformidad: qué significa "coincidir"

@knowvah/elk-engine se valida contra el Eclipse ELK (Java) upstream compilado desde el código
fuente. Un layout de TypeScript es **conforme** con el oráculo cuando, tras parsear ambos como ELK
JSON, la estructura y cada valor no numérico son exactamente iguales y cada número finito coincide
dentro de una tolerancia absoluta de `1e-6`.
El comparador es [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts);
este documento describe lo que implementa. Las reglas de portado están en
[`docs/translation-rules.md`](/guide/translation-rules).

| #   | Sección                                                       | Responde                                         |
| --- | ------------------------------------------------------------- | ------------------------------------------------ |
| 1   | [Oráculo](#1-oráculo)                                         | ¿Qué es "correcto", y en qué commit?             |
| 1a  | [Unidad de conformidad](#1a-unidad-de-conformidad)            | ¿Qué es un caso, y qué casos existen?            |
| 2   | [Criterio de conformidad](#2-criterio-de-conformidad)         | ¿Qué cuenta como igual?                          |
| 3   | [Goldens y corpus](#3-goldens-y-corpus)                       | ¿De dónde salen las salidas de referencia?       |
| 4   | [Patches de seam](#4-patches-de-seam)                         | ¿Cómo cambiamos el oráculo?                      |
| 5   | [Operaciones del oráculo](#5-operaciones-del-oráculo-runbook) | ¿Qué hago cuando falla?                          |
| 6   | [Gates](#6-gates)                                             | ¿Qué debe pasar antes de que un cambio aterrice? |

## 1. Oráculo

El oráculo (AD-3) es el ELK upstream **compilado desde el código fuente** en un worktree de git
desacoplado de `$ELK_SOURCE_DIR`, que `tools/oracle/build.sh` crea en `$ELK_ORACLE_DIR`.
Ambos están fuera de este repositorio; ninguno se incluye en él.

| Elemento                  | Dónde                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Commit de ELK fijado      | `tools/oracle/ELK_COMMIT` (actualmente `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)  |
| Serie de patches          | `tools/oracle/patches/*.patch`, aplicados en orden léxico con `git am --3way`       |
| Compilación               | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho descarga artefactos p2)        |
| Ejecutor por lotes        | `tools/oracle/run.sh <outDir> <input>...` o `run.sh --cases <cases.jsonl> <outDir>` |
| Harness                   | `tools/oracle/harness/ElkOracle.java`                                               |
| Manifiesto de compilación | `$ELK_ORACLE_DIR/oracle-build.json` (commit, patches, JDK, jar por bundle)          |

**Compilación.** `build.sh` ejecuta `mvn -P elk-meta clean install -DskipTests` (el compilador
melk) y después `mvn clean install -DskipTests -Dmaven.test.skip=true` desde `build/` en el
worktree, y a continuación registra en `oracle-build.json` el jar de cada bundle incluido en el
alcance (`core`, `graph`, `graph.json`, `alg.common` y los algoritmos `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`, `vertiflex`). Un worktree
existente solo se reutiliza si desciende de `ELK_COMMIT`, lleva exactamente los asuntos de patch de
`tools/oracle/patches/` y está limpio salvo por la salida de compilación; de lo contrario,
`build.sh` termina con `2` y lo deja intacto.

**Ejecución.** `run.sh` compila `ElkOracle.java` contra los jars de los bundles más los bundles de
terceros (Gson, Guava, EMF, bibliotecas de Xtext/Xtend) de la caché p2 de Tycho (`P2_BUNDLES`, por
defecto `~/.m2/repository/p2/osgi/bundle`; se usa la versión más reciente de cada uno). Una JVM
calcula el layout de cada entrada con `RecursiveGraphLayoutEngine` y escribe
`<outDir>/<input basename>.json` con el layout, las dimensiones cero y las posiciones cero
incluidos, y las opciones de layout desconocidas omitidas. Una entrada que falla imprime
`ERROR <input>: <message>`; la JVM termina con `1` si alguna entrada falló. Los nombres base de las
entradas deben ser únicos dentro de una misma ejecución, porque el nombre de la salida es el nombre
base.

**Semántica de la serie de patches.** Hoy la serie contiene un patch:

| Patch                                                                   | Efecto                                                                                                                                                                                                                                                        | Seam de TS emparejado                                                                                                                                          |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter` resuelve las colisiones de id con `"_g" + Random.nextInt(1000000)`; el patch inicializa ese `Random` con la propiedad del sistema `org.eclipse.elk.graph.json.exportSeed` (sin definir = comportamiento de ELK). `run.sh` pasa `EXPORT_SEED=1` | `Random` inyectable en el portado de `graph.json`; pendiente de ese portado (el shim `Random` de TS ya reproduce la secuencia: la semilla 1 da 548985, 764588) |

Los patches existen solo para añadir seams muy acotados que hagan comparable el comportamiento de
la JVM y de JS; cada uno se empareja con un seam del lado de TS (sección 4).

**¿Por qué no elkjs?** elkjs es ELK compilado con GWT. No puede llevar nuestra serie de patches, y
la emulación de la JRE de GWT difiere de la JVM desde la que portamos. No se consulta como oráculo.

## 1a. Unidad de conformidad

Un **caso** es `(algorithm, model, variant)` (D1). El panel de paridad tiene una fila por
algoritmo de layout; la carpeta de elk-models y las características del censo son filtros, no filas.

**Id de caso.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, por ejemplo
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix` es el id del algoritmo
sin `org.eclipse.elk.`. Para los modelos generados, `modelId` es `generated/<name>`.

**Id y fuente del modelo (D3).** El id del modelo es la ruta en elk-models sin la extensión.
Un caso lee el `.json` cuando existe, y si no el `.elkt`; el `.elkg` (EMF XMI) nunca se lee.

**Variantes (D6).** Superposiciones de opciones con nombre en `test/corpus/variants.json`, aplicadas en la raíz:
`default` (ninguna), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Tier         | Algoritmo                                         | Modelos                        | Variantes             |
| ------------ | ------------------------------------------------- | ------------------------------ | --------------------- |
| native       | el `rootAlgorithm` propio del modelo              | todo modelo del censo          | las siete             |
| retarget     | todo algoritmo listado salvo el propio del modelo | todo modelo del censo          | solo `default` (OR-1) |
| generated    | el algoritmo indicado por el prefijo del archivo  | `test/corpus/generated/*.json` | las siete             |
| ported JUnit | según la misión de cada algoritmo                 | casos JUnit upstream (AD-13)   | según se portaron     |

`tools/oracle/run.sh --list-algorithms` es la lista de ids de algoritmo (14 hoy).

**Retarget (D2).** El harness define `org.eclipse.elk.algorithm` en **cada nodo que tiene
hijos**, sustituyendo cualquier valor declarado, y `org.eclipse.elk.randomSeed = 1` en la raíz. ELK
resuelve el algoritmo por nodo, y un nodo sin definir recurre a layered. Una raíz sin
hijos recibe solo la semilla. El tier retarget omite el `rootAlgorithm` propio de cada modelo (el
tier native lo cubre).

## 2. Criterio de conformidad

AD-4, exactamente como lo implementa `compareLayout(expected, actual, { tol })`:

| Regla                      | Comportamiento                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerancia                 | Absoluta, `DEFAULT_TOLERANCE = 1e-6`; los números finitos pasan cuando `abs(e - a) <= tol`                                                                                                                          |
| Números no finitos         | `NaN` y `±Infinity` deben ser exactamente iguales (`Object.is` o `===`), incluso con `tol: Infinity`                                                                                                                |
| Strings, booleanos, `null` | Estrictamente iguales; si no, `value`                                                                                                                                                                               |
| Discrepancia de tipo       | Tipos JSON distintos (`null`, array, objeto, número, string, booleano) dan un único diff `type`                                                                                                                     |
| Claves de objeto           | El conjunto de claves debe ser idéntico: una clave solo en expected es `missing`, solo en actual es `extra`                                                                                                         |
| Arrays                     | Se emparejan **por `id`** cuando todos los elementos de ambos lados son objetos con un `id` de tipo string y los ids son únicos en cada lado (un array vacío cuenta como con clave); en otro caso, **por posición** |
| Arrays con clave           | Un id presente en un solo lado es un diff `structure` en `path[id=<id>]`; el orden se ignora                                                                                                                        |
| Arrays posicionales        | Una diferencia de longitud es un único diff `structure` y los elementos no se comparan más                                                                                                                          |
| Tipos de diff              | `structure`, `value`, `type`, `missing`, `extra`; `path` es similar a una ruta JSON (`children[id=n1].x`)                                                                                                           |

Consecuencias: los ids de elemento, el número de elementos, la topología de las secciones de arista
y el número de puntos de quiebre son exactos porque los ids y las longitudes de array son exactos;
las coordenadas y los tamaños reciben `1e-6`. `formatDiffs` imprime como máximo 20 diffs.

**Política de divergencias conocidas.** Una divergencia nunca se absorbe subiendo `tol`
ni editando un golden (AD-13). Cada una se registra aquí con su causa y la prueba o fixture a la
que afecta. Clases aceptadas:

- **Diferencias de `Math.*` a nivel de ulp.** V8 y la JVM pueden diferir en el último bit
  de `sin`, `cos`, `exp`, `log`, `pow` y similares; el `StrictMath` de Java está especificado
  bit a bit, `Math` no. El caso que ya se dio: `nextGaussian`
  está especificado para usar `StrictMath.log`, así que `src/java/util/Random.ts` incluye una
  implementación exacta de `StrictMath.log` en lugar de `Math.log`. Prefiere un portado bit a bit
  del algoritmo de `StrictMath` antes que ampliar la tolerancia.
- **Iteración por hash de identidad (AD-10).** Iterar un `HashMap`/`HashSet` con claves
  que usan hash de identidad no es determinista en el propio Java. Registra el sitio en el diario
  y porta con orden de inserción; los goldens no deben depender de ello.
  Las claves con hash por valor (String, Integer) deben reproducir el orden de Java.
- **`Random` con semilla de reloj.** Con `randomSeed = 0`, ELK usa el reloj como semilla
  (`core/Core.melk:608`), así que la salida no es reproducible. Las entradas golden deben
  dejar la semilla sin definir o distinta de cero (la semilla por defecto de layered es `1`).

Entradas concretas (añade una solo con la aprobación del usuario):

| #   | Divergencia                          | Causa                                                                        | Alcance                                                                                                                                                                           | Aprobada                |
| --- | ------------------------------------ | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| 1   | Texto del mensaje de error de parseo | Los mensajes de ANTLR son artefactos del parser generado, que nunca se porta | Entrada con gramática inválida (`.elkt`, `.elkj`, `.elkr`): solo debe coincidir la _presencia_ de un fallo de parseo, no el mensaje. La entrada válida debe coincidir exactamente | D8, usuario, 2026-10-11 |

**Veredictos.** Cada caso recibe un veredicto a partir de dos ejecuciones separadas del oráculo en la JVM (D4, D5, OR-2):

| Veredicto          | Significado                                                                                                                                                                     |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Ambas ejecuciones calcularon el layout del modelo y los archivos de salida son idénticos byte a byte                                                                            |
| `throws`           | Ambas ejecuciones lanzaron la misma excepción: clase exacta y mensaje exacto una vez que `@[0-9a-f]+` pasa a `@<hash>` (el mensaje puede ser null, p. ej. `StackOverflowError`) |
| `nondeterministic` | Las ejecuciones discrepan (bytes de salida, excepción, o una `ok` y otra `throws`)                                                                                              |
| `oracle-error`     | Fallo del harness (entrada ilegible, variante/algoritmo/opción desconocidos, línea de resultado perdida); nunca es aceptable                                                    |
| `timeout`          | Una ejecución superó `ELK_SWEEP_TIMEOUT_MS`                                                                                                                                     |

Precedencia: `oracle-error`, luego `timeout`, luego `ok`/`throws` cuando son iguales, y si no
`nondeterministic`. Antes de la comparación de bytes, cada token `@[0-9a-f]+` de ambas salidas se
sustituye por `@<hash>`, igual que en los mensajes de excepción (D5a; `sameOutput` en `tools/corpus/sweep.ts`).
Causa: la opción programática `debug.discoGraph` de disco exporta `...DCGraph@<identity hash>`,
que ninguna semilla puede fijar. El comparador de TS aplica la misma sustitución. Los casos no deterministas
se informan por separado y se excluyen de los recuentos de aprobados, en línea con la política de
hash de identidad anterior.

Fuentes genuinas restantes de `nondeterministic` (comportamiento de ELK, no fallos del harness; los recuentos están en
el informe de paridad): spore (`ElkGraphImporter.java:169` introduce jitter con `Math.random`) y `random`
(el `randomSeed` por defecto 0 no tiene semilla en los compuestos anidados; retarget solo siembra la raíz, D2,
mantenido por decisión del usuario). Los renombrados de id `_g<random>` del exportador no son una fuente: el patch
de seam los corrige.

## 3. Goldens y corpus

AD-5. Las salidas de referencia están versionadas para que la CI no necesite una JVM.

| Elemento              | Dónde                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------- |
| Corpus fijado         | `eclipse-elk/elk-models` en el `commit` de `test/corpus/manifest.json` (no se incluye)          |
| Directorio de modelos | `$ELK_MODELS_DIR`, por defecto `../../eclipse-elk/elk-models` relativo a este repositorio       |
| Conjunto curado       | `golden[]` en `test/corpus/manifest.json`: `{ id, path, note }`                                 |
| Refs                  | `test/golden/refs/elk/<id>.json`, uno por `id` del manifiesto                                   |
| Procedencia           | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**Correspondencia de id a ruta.** `golden[].path` es relativo a `$ELK_MODELS_DIR`, y
la entrada es `$ELK_MODELS_DIR/<path>`. `regen-goldens.sh` ejecuta el harness sobre
esas entradas y deja cada salida `<basename>.json` como `refs/elk/<id>.json`.
Ejemplo: el id `ptolemy-scrambler` es
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`.

**Regeneración** (`tools/oracle/regen-goldens.sh`):

1. Requiere que el clon de modelos esté exactamente en el commit del manifiesto (si no, sale con `1`).
2. Requiere un oráculo compilado (`run.sh` necesita `oracle-build.json`).
3. Prepara todos los refs y `_meta.json` en `test/golden/refs/.elk-staging.*`, y luego
   intercambia el directorio con dos renombrados, de modo que una ejecución fallida deja los refs antiguos.
4. `_meta.json` no tiene marcas de tiempo (`builtAt` se queda en `oracle-build.json`), así que una
   regeneración sin entradas cambiadas no produce ningún cambio byte a byte en git.

**Cuándo regenerar:** tras cambiar `ELK_COMMIT`, la serie de patches, el conjunto `golden[]`
o el `commit` del manifiesto, o el harness. Nunca en otro caso.

**Regla de diario.** Toda regeneración que cambie un ref se registra en el diario con la
causa (el id del patch o la subida de commit). Los refs nunca se editan a mano. Si una
aserción de TS o un golden solo puede pasar cambiándolo, detente y registra en el diario (AD-13).

**Censo.** `npx tsx tools/corpus/census.ts` no calcula ningún layout: ejecuta el oráculo en modo parseo
sobre todos los modelos y compara el resultado con el `test/corpus/census.json` versionado (898
modelos: id, formatos, fuente, algoritmo raíz, recuentos de características). Sale con `0` si son iguales y con `1` si hay deriva;
`--write` reescribe el archivo. Solo se ejecuta en el clon de modelos fijado y aborta ante un
fallo del harness.

**Corpus generado (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` contiene una
configuración grandom con semilla; su `.json` hermano es la entrada sin layout generada por el oráculo. Nueve configuraciones cubren
los ids de algoritmo que ningún modelo de elk-models usa: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Cada una tiene como máximo 50 nodos y
ninguna etiqueta de arista (`BlindTextGenerator` no tiene semilla). El harness llama `root` a la raíz generada,
porque el `JsonExporter` de ELK resuelve una colisión de id con un sufijo aleatorio sin semilla. Regenera
solo con `tools/oracle/regen-generated.sh` (directorio de staging y renombrado; una configuración que falla
deja los archivos antiguos); una nueva ejecución sin cambios no produce cambios en git. El portado de grandom a TS debe
reproducir estos archivos `.json` byte a byte; los goldens de algoritmos nunca dependen de ello.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` planifica todos los casos, ejecuta cada uno dos veces en JVM separadas (los shards
son por defecto `min(cpus, 8)` procesos `run.sh` concurrentes) y escribe
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`.
`--plan-only` imprime los recuentos de casos por tier y no ejecuta nada; `--filter` conserva los ids de caso que contienen
la subcadena; `--limit` toma una muestra con paso uniforme. Sale con `0` salvo que un caso sea `oracle-error`
(`1`); un fallo de la herramienta sale con `2`. Las salidas por caso se quedan en local (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(por defecto `30000`, leído solo por `tools/`) acota cada caso; `run.sh` reinicia una JVM tras un
timeout (código de salida de la JVM 75) para los casos sin línea de resultado.

**Informe de paridad (D9).** `docs/parity-report.md` se genera a partir de la caché del sweep y se versiona:
recuentos por algoritmo y veredicto, con los commits de ELK y de los modelos y sin marcas de tiempo. Regenera
con `npx tsx tools/corpus/parity-report.ts --write`; sin `--write` el comando sale con `1`
cuando el informe versionado está obsoleto. Nunca lo edites a mano.

**Pruebas del corpus.** `resolveModelsDir()` en `test/corpus/corpus.ts` devuelve un
motivo de `skip` cuando falta el clon o está en otro commit; las pruebas que lo necesitan
se omiten con el sha fijado en el mensaje. Hoy `test/golden/oracle-refs.test.ts`
comprueba solo los refs versionados: uno por id del manifiesto, geometría en cada nodo,
puerto, etiqueta y arista, autocomparación, y que `_meta.json` coincide con
`ELK_COMMIT`, el manifiesto y el generador. Todavía no hay ninguna prueba de layout de
TS contra el oráculo; llegará con el primer algoritmo portado.

## 4. Patches de seam

Los patches de seam cambian el oráculo; son poco frecuentes y siempre van emparejados con un seam de TS.

1. Edita y haz commit en el worktree del oráculo (`$ELK_ORACLE_DIR`), o crea el patch en un clon
   de trabajo en `ELK_COMMIT`. Para añadir un patch terminado al worktree existente en el sitio (conserva las
   cachés `census/` y `sweep/`, que se pierden al eliminar el worktree), aplícalo con la identidad
   de `build.sh`:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   `build.sh` entonces verifica la serie y recompila en el sitio (unos 3 minutos), así que los pasos 4-5
   se pueden omitir.
2. Exporta:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (o solo los commits nuevos). Los archivos se llaman `NNNN-<slug>.patch`; el prefijo
   numérico fija el orden de aplicación.
3. Añade el seam de TS correspondiente (mismo comportamiento, inyectable, en `src/`), con pruebas
   cuyos valores esperados provengan del oráculo con el patch aplicado (AD-13).
4. En otro caso, elimina el worktree: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (añade `--force` si la salida de compilación lo ensucia).
5. Recompila: `tools/oracle/build.sh` (vuelve a aplicar la serie desde cero).
6. Regenera: `tools/oracle/regen-goldens.sh`; revisa `git diff test/golden/refs`.
7. Registra en el diario una entrada que nombre el patch (`NNNN-<slug>.patch`) y liste cada
   ref que cambió. `patches` en `_meta.json` registra la serie automáticamente.

Nunca dejes una edición sin commit en el worktree: `build.sh` la trata como obsoleta
(salida `2`). Nunca edites el propio `ELK_SOURCE_DIR`.

## 5. Operaciones del oráculo (runbook)

| Fallo                                                                                          | Detección                                                                                                                                                                                                                                                                                   | Mitigación                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Falla la compilación de Tycho (p2 inaccesible, JDK, versión de Maven)                          | `tools/oracle/build.sh` termina con código distinto de cero; la salida completa de Maven está en `.oracle-build.log` en la raíz del repositorio. La salida `1` es una herramienta ausente o un Maven incorrecto; la salida `3` significa que no se produjo el jar de un bundle              | Maven debe ser **3.9.x**: Tycho 4.0.12 falla con Maven 3.10 (el 3.10.0 de Homebrew) con `ProvisionException: No implementation for MavenTargetLocationFactory was bound`. Hay un 3.9.11 local en `.tools/apache-maven-3.9.11/` (en gitignore): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. Usa JDK 21, o JDK 17 mediante `JAVA_HOME`. Comprueba la red (la primera ejecución descarga artefactos p2) y vuelve a ejecutar. `build.sh --record-only` omite Maven y solo reescribe `oracle-build.json` a partir de los jars ya compilados. Salida `2`: elimina el worktree (sección 4, paso 4) y recompila. En otro caso, escala con el final del log |
| `build.sh` sale con `2` justo después de aplicar un patch                                      | Worktree informado como obsoleto                                                                                                                                                                                                                                                            | `build.sh` desdobla los asuntos de patch partidos en varias líneas (`git format-patch` los parte a partir de unos 78 caracteres) e ignora las cachés sin seguimiento `census/` y `sweep/`; cualquier otra suciedad o un patch no listado sigue dando la salida `2`: arregla el worktree (sección 4)                                                                                                                                                                                                                                                                                                                                                                             |
| Deriva de goldens tras un patch o una subida de commit                                         | `tools/oracle/regen-goldens.sh` seguido de `git diff --exit-code test/golden/refs` no está vacío; `test/golden/oracle-refs.test.ts` falla con un `_meta.json` obsoleto (`elkCommit`, `modelsCommit`); una prueba de conformidad de TS, cuando exista, falla con un informe de `formatDiffs` | Recompila (`build.sh`), ejecuta `regen-goldens.sh`, revisa el diff y registra en el diario el id del patch. Nunca edites un ref a mano ni aflojes `tol`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Falta el jar de Xtext/ANTLR en la caché p2 (`.elkt`, `.elkr` o cualquier arranque de `run.sh`) | `run.sh` termina con código distinto de cero y `bundle <name> not in p2 cache <dir>` (p. ej. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                           | Define `P2_BUNDLES` con la caché p2 de Tycho que lo contenga, o ejecuta `build.sh` con acceso a la red para que Tycho lo obtenga; vuelve a ejecutar `run.sh`. No sustituyas jars de otro origen                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| El sweep se cuelga o se queda sin memoria                                                      | Un caso se ejecuta hasta el timeout e informa `timeout` (una línea de stderr lo nombra); una ejecución sin línea de resultado da `oracle-error` y `sweep: shard <n> run <A or B> exited <code>` en stderr; la máquina hace swap con 8 JVM concurrentes                                      | Reduce la concurrencia y el tamaño del lote: `sweep.sh --shards 2`, acota con `--filter` o `--limit`. Sube `ELK_SWEEP_TIMEOUT_MS` solo para un modelo que es lento pero correcto. Un `timeout` reproducible es un hallazgo: registra en el diario el id del caso, no amplíes el límite para ocultarlo                                                                                                                                                                                                                                                                                                                                                                           |
| Deriva del censo tras una subida de pin (`ELK_COMMIT` o `commit` de los modelos)               | `npx tsx tools/corpus/census.ts` sale con `1` y lista los modelos que difieren; `test/corpus/census.test.ts` falla                                                                                                                                                                          | Confirma que el clon y el oráculo están en los pines nuevos, vuelve a ejecutar `census.ts --write`, revisa `git diff test/corpus/census.json`, registra la causa en el diario, luego vuelve a ejecutar `sweep.sh` y regenera el informe de paridad. Nunca edites el censo a mano                                                                                                                                                                                                                                                                                                                                                                                                |
| Falta elk-models o el sha es incorrecto                                                        | Las pruebas del corpus se omiten con un mensaje que nombra el sha esperado; `regen-goldens.sh` sale con `1` (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                  | Ejecuta `test/corpus/fetch.sh` (clona y hace checkout del commit fijado). Sale con `2` si un clon existente está en otro commit y no lo toca: arregla ese clon tú mismo o apunta `ELK_MODELS_DIR` a una ruta nueva. Nunca muevas el HEAD de un clon existente desde un script                                                                                                                                                                                                                                                                                                                                                                                                   |

Otros fallos de `run.sh`: `oracle-build.json missing` u `oracle jar missing`
significa que primero debes ejecutar `build.sh`; `bundle <name> not in p2 cache` significa que debes definir
`P2_BUNDLES` con la caché p2 de Tycho o volver a ejecutar `build.sh` con acceso a la red.

## 6. Gates

Todo cambio:

| Gate                | Comando                                                        | Criterio                                                                               |
| ------------------- | -------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| Tipos               | `npm run typecheck`                                            | salida 0                                                                               |
| Pruebas y cobertura | `npm run coverage`                                             | todas las pruebas pasan; 90 % de sentencias, ramas, funciones y líneas sobre `src/**`  |
| Arquitectura        | `test/architecture/*.fitness.test.ts` (los ejecuta `npm test`) | límites de módulo, globales de módulo, sin built-ins de Node en `src/`, cabeceras SPDX |
| Refs del oráculo    | `test/golden/oracle-refs.test.ts`                              | refs versionados consistentes con el manifiesto y `ELK_COMMIT`                         |

Los cambios en `tools/oracle/`, el manifiesto o la serie de patches necesitan además:

| Gate                    | Comando                                                                        | Criterio                                                                     |
| ----------------------- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| Compilación del oráculo | `tools/oracle/build.sh`                                                        | salida 0                                                                     |
| Ejecución del oráculo   | `tools/oracle/run.sh <outDir> <input.json>...`                                 | salida 0, sin líneas `ERROR`                                                 |
| Estabilidad de goldens  | `tools/oracle/regen-goldens.sh`, luego `git diff --exit-code test/golden/refs` | sin diff, salvo que el cambio deba mover refs y esté registrado en el diario |
| Shell                   | `shellcheck tools/oracle/*.sh`                                                 | limpio                                                                       |

Los cambios en `tools/oracle/` o `tools/corpus/` necesitan además:

| Gate                     | Comando                                                                               | Criterio                                                     |
| ------------------------ | ------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Censo                    | `npx tsx tools/corpus/census.ts`                                                      | salida 0 (sin deriva)                                        |
| Estabilidad de generados | `tools/oracle/regen-generated.sh`, luego `git diff --exit-code test/corpus/generated` | sin diff                                                     |
| Sweep                    | `tools/oracle/sweep.sh` (o `--filter`/`--limit` para una muestra)                     | salida 0: sin `oracle-error`                                 |
| Informe de paridad       | `npx tsx tools/corpus/parity-report.ts`                                               | salida 0 (informe versionado al día); regenera con `--write` |
