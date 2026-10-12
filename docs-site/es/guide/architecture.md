---
title: Arquitectura
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Visión general de la arquitectura de elk-engine

| Documento                                           | Contenido                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                    | Cada bundle de ELK: propósito, LOC, fuentes generadas, alcance                          |
| [port-map.md](/guide/port-map)                      | Asignación de paquetes de Java a módulos de `src/`                                      |
| [component-map.md](#mapa-de-componentes)            | Dependencias de los bundles en el alcance; piezas centrales del runtime                 |
| [../translation-rules.md](/guide/translation-rules) | Reglas de Java a TypeScript                                                             |
| [../conformance.md](/es/conformance)                | Criterio y procedimiento de comparación del oráculo (llega más adelante en esta misión) |

## Qué es elk-engine

`@knowvah/elk-engine` es un portado fiel a TypeScript del Eclipse Layout Kernel (ELK). El Java en el commit fijado
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76` es la especificación (AD-1, AD-2). Es una biblioteca: segura para el
navegador, sin dependencias en tiempo de ejecución, sin Java ni WASM. Su contrato público es el modelo de objetos
ElkGraph más las factorías de `ElkGraphUtil`; ELK JSON es un adaptador de E/S (AD-14). Trece bundles con un total de
unas 134.600 líneas escritas a mano están en el alcance (consulta el inventario). Esta misión entrega solo el
andamiaje: todavía no se ha portado ningún algoritmo de layout.

## Relación con ELK Java y el oráculo

![Relación entre ELK Java, la compilación del oráculo, las referencias golden y elk-engine](/diagrams/overview-1.svg)

La serie de parches está vacía en esta misión (AD-3). Los goldens están versionados, así que la CI no necesita una
JVM (AD-5). Comparación: estructura exacta, coordenadas dentro de 1e-6 (AD-4).

## Flujos principales

Layout en ELK, que elk-engine reproduce (detalles en [component-map.md](#mapa-de-componentes)):

![Flujo de una llamada de layout a través del motor de layout recursivo](/diagrams/overview-2.svg)

Adaptador JSON (`graph.json`, `ElkGraphJson`): antes del layout, el importador convierte ELK JSON en un ElkGraph;
después del layout, las coordenadas calculadas y las secciones de arista se transfieren de vuelta a la salida JSON. El
arnés del oráculo usa el adaptador de Java en los mismos dos pasos, de modo que ambos lados comparten el contrato JSON.

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

En elk-engine, el paso de `.melk` se sustituye por un generador (AD-12, misión futura) y ElkGraph pasa a ser clases
TS simples (AD-11). Asignación a archivos TS: [mapa de portado](/guide/port-map); reglas:
[reglas de traducción](/guide/translation-rules).
