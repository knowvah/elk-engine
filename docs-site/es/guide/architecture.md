---
title: Arquitectura
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Visión general de la arquitectura de elk-engine

| Documento                                                                                                              | Contenido                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Cada bundle de ELK: propósito, LOC, fuentes generadas, alcance                                                                                                    |
| [port-map.md](/guide/port-map)                                                                                         | Asignación de paquetes de Java a módulos de `src/`                                                                                                                |
| [component-map.md](#mapa-de-componentes)                                                                               | Dependencias de los bundles en el alcance; piezas centrales del runtime                                                                                           |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Reglas de Java a TypeScript                                                                                                                                       |
| [../conformance.md](/conformance)                                                                                      | Criterio y procedimiento de comparación del oráculo (llega más adelante en esta misión)                                                                           |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | Portado de ELK Text (`.elkt`), el subconjunto de Xtext, runbook y aplazamientos                                                                                   |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | Portado de ELK Textual JSON (`.elkj`), enlazado perezoso, runbook y aplazamientos                                                                                 |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | Portado del generador de grafos aleatorios grandom (`.elkr`), evidencia y runbook                                                                                 |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Motor de layout y los proveedores fixed, box y random (misión 5a)                                                                                                 |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | El generador de `.melk`, tipos pendientes, constantes perezosas, regeneración                                                                                     |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | La puerta de complejidad que mide cada función (`npm run complexity`)                                                                                             |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Framework layered (misión 7a): modelo LGraph, transformación, clases por fases, runbook                                                                           |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Colocación de nodos en layered (misión 7d): p4nodes, Brandes-Köpf, cinco procesadores, filas de geometría, runbook                                                |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Enrutado de aristas en layered (misión 7e): p5edges ortogonal, polyline, splines, seis procesadores, filas de enrutado, runbook                                   |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Pipeline de layered (misión 7f): `ElkLayered`, `GraphConfigurator`, componentes, cuatro procesadores, filas de layouts completos, subconjunto del runner, runbook |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Etiquetas en layered (misión 7f2): procesadores de etiquetas y comentarios, unzipping, salida de depuración, visitor, filas de etiquetas, sweep, runbook          |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Autobucles, wrapping y compactación en layered (misión 7g): paquete loops, puntos de ruptura, compactación 1D, `ComponentsCompactor`, filas, sweep, runbook       |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Grafos compuestos en layered (misión 7h): paquete `compound`, driver jerárquico, paradas en todo el árbol, goldens, sweep, gemelos de orden de hash, runbook      |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | Sweep de TS contra el oráculo (fila 9): runner fragmentado, contrato del resumen, anotaciones, informe, runbook                                                   |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Medición intercambiable del texto de etiquetas (fila 10): parche 0003, el gemelo en TS, modo fixed, evidencia, runbook                                            |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | Mover el pin de ELK (fila 13): triaje del diff neto, serie de parches, recompilación, regrabación, sweeps, triaje del diff de refs, modo de ensayo                |

## Qué es elk-engine

`@knowvah/elk-engine` es un portado fiel a TypeScript del Eclipse Layout Kernel (ELK). El Java en el commit fijado
`8bca22f4afa3371562d2f702d59929818f7f7b71` es la especificación (AD-1, AD-2). Es una biblioteca: segura para el
navegador, sin dependencias en tiempo de ejecución, sin Java ni WASM. Su contrato público es el modelo de objetos
ElkGraph más las factorías de `ElkGraphUtil`; ELK JSON es un adaptador de E/S (AD-14). Trece bundles con un total de
unas 134.600 líneas escritas a mano están en el alcance (consulta el inventario). Estado actual:
el motor de layout (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) y los tres
proveedores centrales `fixed`, `box` y `random` están portados e igualan al oráculo en los goldens curados
(misión 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). El resto de `core` también está portado (misión 5b: pipeline de procesadores, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, splines, asociación de comentarios; consulta [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)). El bundle compartido `alg.common` está portado por completo (misión 6a: geometría, simplex de red, compactación 1D, solapamientos, spore, polyomino; misión 6b: `nodespacing` y `NodeMicroLayout`, demostrados por una repetición del oráculo de 326 filas; consulta [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
El framework layered está portado (misión 7a: el paquete de opciones, el modelo LGraph, la transformación ElkGraph ↔ LGraph y la carcasa del proveedor, demostrados por dos archivos de vectores del oráculo de 272 y 330 filas; las fases de layout siguen en 7b–7h; consulta [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). Sus dos primeras fases están portadas (misión 7b: los once rompedores de ciclos, los nueve layerers y los diez procesadores que los rodean, demostrados por 651 filas de fases del oráculo y un sweep de 32.652 casos; [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). Su tercera fase está portada (misión 7c: minimización de cruces con sus contadores, el greedy switch, los comparadores model-order y los ocho procesadores entre P2 y P3, demostrados por 808 filas de orden del oráculo y un sweep de 6.728 casos; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). Su cuarta fase está portada (misión 7d: los cuatro colocadores de nodos con Brandes-Köpf y los cinco procesadores que necesita una parada en P4, demostrados por 610 filas de colocación del oráculo con geometría y un sweep de 8.410 casos; [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). Su quinta fase está portada (misión 7e: los enrutadores ortogonal, polyline y spline con los seis procesadores que necesita un resultado enrutado, demostrados por 950 filas de enrutado del oráculo con geometría de aristas y un sweep de 6.728 casos; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). El pipeline de layered funciona (misión 7f: el driver, el paquete de componentes conexas, el transformador de dirección, el enrutador de puertos jerárquicos y tres procesadores, demostrados por 1.311 filas del oráculo de layouts completos y paradas, una repetición de 2.351 filas de las filas anteriores a través del driver real, 28 suites JUnit portadas y un sweep de 6.646 casos; [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). También funcionan los layouts con etiquetas y comentarios, el unzipping de capas y un monitor de registro (misión 7f2: la familia de etiquetas, los procesadores de comentarios, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` y las utilidades de depuración, demostrados por 1.305 filas del oráculo de paradas y layouts completos, las 11 suites JUnit de referencia y un sweep de 1.105 casos cuyos 935 casos ok coinciden exactamente; [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). También funcionan los autobucles, el wrapping de grafos y la compactación (misión 7g: el paquete loops, los cuatro procesadores de autobucles, los wrappers de puntos de ruptura y de aristas individuales, `HorizontalGraphCompactor`, el paquete `compaction` de layered y `ComponentsCompactor`, demostrados por 1.627 filas del oráculo (`full` 731, `models` 307, `scenarios` 525, `sites` 64), las 10 suites JUnit de referencia, un sweep de 3.073 casos cuyos 2.997 casos ok coinciden exactamente y cuyas 76 excepciones coinciden en ambos lados, y el cableado de nueve brazos que deja 58 brazos portados; [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). También funcionan los grafos compuestos (misión 7h: el paquete `compound`, `HierarchicalNodeResizingProcessor` y el último brazo, demostrados por 540 filas del oráculo (`full` 355, `models` 73 con paradas en todo el árbol, `scenarios` 88, `sites` 24), 24 goldens de layered, las nueve suites de issues y tres métodos de graph.json, un sweep de 1.169 casos cuyos 1.164 casos ok coinciden exactamente y cuyas 5 excepciones coinciden en ambos lados; [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). El algoritmo layered ejecuta ahora todos los modos de manejo de jerarquía: 59 brazos del enum están portados, ninguno está pendiente y la lista de los diferidos está vacía. Solo esperan los tres casos `elk.stress` del issue #58 (misión 8b). Ningún otro algoritmo de layout funciona todavía (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Desde la misión 8a también funcionan mrtree, radial y vertiflex (demostrados por 1.181 filas del oráculo en cuatro refs de layouts completos y paradas, una ref de vectores unitarios de 2.656 filas, 40 goldens `trees`, `MrTreeGraphSizeTest` y `CenterOnRootTest` en 6/6 y 2/2, y un sweep de 906 casos por algoritmo en el que cada caso o coincide o está diagnosticado; dos filas de radial cuyo resultado depende del orden de un bin de hash convertido en árbol están clasificadas, no igualadas; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). Desde la misión 8b también funcionan force, stress y disco (demostrados por 21.420 filas del oráculo en tres refs de layouts completos y paradas, 45 goldens `force-disco`, `ForceImportTest` y `TwoBitGridTest` en 3/3 cada uno, y un sweep por algoritmo en el que cada caso o coincide o está diagnosticado; el `Math.log` de Eades es un port de fdlibm exacto al bit; [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Desde la misión 8c también funcionan rectpacking, spore (`sporeOverlap`, `sporeCompaction`) y topdownpacking (demostrados por 2.593 filas del oráculo en tres refs, 44 goldens `packing`, las ocho suites JUnit portadas en 30 ejecuciones y un sweep por algoritmo en el que cada caso determinista coincide o está diagnosticado; [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Todo algoritmo del alcance se somete a sweep contra el oráculo, y el resultado por algoritmo se publica en el informe de paridad ([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## Relación con ELK Java y el oráculo

![Relación entre ELK Java, la compilación del oráculo, las referencias golden y elk-engine](/diagrams/overview-1.svg)

La serie de parches está vacía en esta misión (AD-3). Los goldens están versionados, así que la CI no necesita una
JVM (AD-5). Comparación: estructura exacta, coordenadas dentro de 1e-6 (AD-4).

## Flujos principales

Layout en ELK, que elk-engine reproduce hoy para `fixed`, `box` y `random` (detalles en
[component-map.md](#mapa-de-componentes) y [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)):

![Flujo de una llamada de layout a través del motor de layout recursivo](/diagrams/overview-2.svg)

Adaptador JSON (`graph.json`, `ElkGraphJson`): antes del layout, el importador convierte ELK JSON en un ElkGraph;
después del layout, las coordenadas calculadas y las secciones de arista se transfieren de vuelta a la salida JSON. El
arnés del oráculo usa el adaptador de Java en los mismos dos pasos, de modo que ambos lados comparten el contrato JSON.

Adaptador de texto (`graph.text`, `ElkGraphText`): el texto `.elkt` se carga en un ElkGraph mediante un parser,
linker y validador escritos a mano sobre un pequeño subconjunto de Xtext (`src/xtext`), y un ElkGraph se serializa
de vuelta a `.elkt`. El punto de entrada es interno; consulta [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Adaptador de JSON textual (`graph.json.text`, `ElkGraphJsonText`): el texto `.elkj` se carga a través del mismo
subconjunto de Xtext con un parser escrito a mano y enlaza de forma perezosa como el `LazyLinker` de Xtext: los
extremos de las aristas son proxies de EMF (`src/emf`) que se resuelven al leerse. Un ElkGraph se serializa de vuelta
a `.elkj` mediante un writer específico de la gramática. El punto de entrada es interno; consulta [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Generador de grafos aleatorios (`core.debug.grandom`, `GRandomText`): el texto `.elkr` se analiza con un lexer y un
parser escritos a mano sobre el mismo subconjunto de Xtext (`src/xtext`), y `RandomGraphGenerator` convierte una
configuración en ElkGraphs con la secuencia exacta de `Random` de la JVM. La salida con semilla es idéntica byte a
byte al oráculo y reproduce los nueve archivos `test/corpus/generated/*.json`; las rutas sin semilla (texto de
etiquetas de aristas, barajado entre jerarquías, una semilla ausente) se comprueban solo por invariantes. El punto
de entrada es interno; consulta [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

## Pila tecnológica

| Aspecto             | Elección                                                                  |
| ------------------- | ------------------------------------------------------------------------- |
| Lenguaje            | TypeScript 7.0.2 (`tsc` nativo), ES2022, NodeNext, `strict`               |
| Pruebas             | vitest 5.0.x con `@vitest/coverage-v8` (umbrales del 90 %)                |
| Empaquetado         | esbuild 0.28.x                                                            |
| Ejecutor de scripts | tsx                                                                       |
| Runtime             | Node 22 o posterior; `src/` en sí es seguro para el navegador             |
| Solo el oráculo     | Maven 3.9+ y JDK 21 (alternativa JDK 17) para la compilación Tycho de ELK |

## Restricciones de fitness (AD-8)

La dirección de importación de los bundles sigue `test/architecture/bundle-deps.json`; cabecera SPDX en cada archivo
de código; sin módulos integrados de Node ni `process.env` en `src/`; sin `let` mutable a nivel de módulo fuera de la
lista de permitidos.

## Documentación y cadena de herramientas de publicación

Añadido por la fila 12 de la hoja de ruta; decisiones DP1 a DP9 en
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md). `1.0.0` se publicó el 2026-11-23.

| Pieza                   | Qué es                                                                                                                                                                                                                                                     |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Superficie exportada    | Aceptada (2026-11-23), listada en [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) y mantenida igual a `src/index.ts` por `src/index.test.ts`; congelada en `1.0.0`, la primera publicación en npm (AD-14) |
| Referencia de la API    | `npm run docs:api`: typedoc en el paquete privado `tools/typedoc/` con su propio TypeScript 6 (typedoc no tiene versión para TypeScript 7, AD-6), hacia el `/reference/` generado                                                                          |
| Ejemplos                | `test/docs/examples/*.ts`, mostrados en la página de primeros pasos del sitio como fragmentos y comparados con refs del oráculo (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                      |
| Comprobación de enlaces | `npm run docs:linkcheck`: linkinator sobre el sitio compilado, enlaces internos y fragmentos, en la CI; enlaces externos cada semana (`links.yml`)                                                                                                         |
| Ensayo de empaquetado   | `npm run pack:smoke`: empaquetar, comprobar la lista de archivos, instalar sin conexión en un proyecto limpio, importar, hacer allí el layout de un ejemplo y compararlo con su ref del oráculo                                                            |
| Publicación             | configuración de semantic-release y `release.yml`, ejecutados en cada push a `main`; runbook en [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                           |

# Mapa de componentes

| Diagrama                   | Muestra                                                     |
| -------------------------- | ----------------------------------------------------------- |
| 1. Dependencias de bundles | Los 13 bundles en el alcance y sus aristas `Require-Bundle` |
| 2. Runtime central         | Cómo se acopla un algoritmo de layout al motor              |

Los nombres omiten el prefijo `org.eclipse.elk.`. Alcance: [inventario](/guide/inventory).

## 1. Dependencias de bundles en el alcance

Fuente de verdad: `test/architecture/bundle-deps.json`, derivado del `META-INF/MANIFEST.MF` de cada bundle por
`tools/bundle-deps.ts` y exigido por la prueba de fitness (AD-8).
El diagrama tiene **32 aristas**, igual que las 32 entradas `requires` del JSON (graph.json x 2,
core x 1, alg.common x 2, nueve algoritmos x 3). Los requisitos de terceros (Guava, EMF, Gson, bibliotecas Xtend) y
los bundles fuera del alcance se omiten. Una flecha `A --> B` significa que A requiere B, de modo que el directorio de
A puede importar el directorio de B. `src/java` se puede importar desde cualquier parte y no se muestra.

![Dependencias entre los 13 bundles de ELK en el alcance](/diagrams/component-map-1.svg)

Ningún algoritmo requiere otro algoritmo: la única dependencia compartida entre algoritmos es
`alg.common`. Una nueva importación entre directorios de algoritmos hace fallar la prueba de fitness, a menos que el
manifiesto de Java tenga la misma arista.

## 2. Piezas centrales del runtime

Las ubicaciones de las clases están bajo `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`
salvo que se indique otra cosa; verificadas en el commit fijado.

| Clase                             | Ruta                                | Función                                                                       |
| --------------------------------- | ----------------------------------- | ----------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                        |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Recorre la jerarquía, ejecuta el proveedor en cada nivel                      |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Clase base de todo algoritmo; implementa `IGraphLayoutEngine`                 |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Registro singleton de datos de algoritmos, opciones y categorías              |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; uno generado por bundle de algoritmo (a partir de `.melk`) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Id del algoritmo más `getInstancePool()` de proveedores                       |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Claves de opción tipadas y el contenedor de mapa detrás de `getProperty`      |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Modelo del grafo; los elementos son `EMapPropertyHolder`                      |

Portado por la misión 5a ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)): `RecursiveGraphLayoutEngine` (dividido con
`RecursiveGraphLayoutEngineTopdown`, M17), `LayoutAlgorithmResolver` y las subclases de `AbstractLayoutProvider`
`FixedLayoutProvider`, `BoxLayoutProvider` y `RandomLayoutProvider`. `LayoutMetaDataService`, `LayoutAlgorithmData`
y los tipos de propiedades llegaron antes (misiones 2 y 3). La misión 5b ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)) completó el bundle: `AlgorithmAssembler` y
`LayoutProcessorConfiguration` (el pipeline que usa cada bundle de algoritmo), `LayoutConfigurator`, `ElkSpacings`, las
secciones de `ElkMath`, `ElkGraphAdapters`, `util/selection/*` y `comments/*`. Sus shims de JDK son `src/java/awt/geom`
(`Rectangle2D`) y `src/java/util/regex` (`Pattern`, `WordBoundary`), junto a `JavaCharacter` en `src/java/lang`;
están demostrados por `awt.json`, `regex.json`, `character.json` y `regex-boundary.json`. Las misiones 6a y 6b ([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) portaron todo `alg.common`; 6b añadió `nodespacing` y `NodeMicroLayout`, demostrados por una repetición del oráculo de `NodeMicroLayout` de 326 filas.

![Relaciones entre clases del runtime central de ELK](/diagrams/component-map-2.svg)

Cómo se acopla un algoritmo:

1. El bundle del algoritmo aporta una subclase de `AbstractLayoutProvider` (por ejemplo,
   `LayeredLayoutProvider` de `alg.layered`) y un archivo `.melk` que declara su id, sus opciones y las
   funciones admitidas.
2. El compilador de `.melk` genera un `ILayoutMetaDataProvider` y una clase de opciones. Su
   `apply(Registry)` registra un `LayoutAlgorithmData` cuyo pool de instancias crea el proveedor.
3. `LayoutMetaDataService` recopila los proveedores. `LayoutAlgorithmResolver` establece el id del algoritmo
   en cada nodo a partir de la opción `algorithm`.
4. `RecursiveGraphLayoutEngine.executeAlgorithm` obtiene un proveedor del
   `LayoutAlgorithmData.getInstancePool()` del nodo y llama a `layout(layoutNode, progressMonitor)`; después lo
   libera (o llama a `dispose()` tras un fallo).

En elk-engine, el paso de `.melk` se sustituye por un generador (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) y ElkGraph pasa a ser clases
TS simples (AD-11). Asignación a archivos TS: [mapa de portado](/guide/port-map); reglas:
[reglas de traducción](/guide/translation-rules).
