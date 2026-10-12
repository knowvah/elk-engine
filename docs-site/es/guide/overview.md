---
title: Visión general
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Visión general

`@knowvah/elk-engine` es un portado fiel a TypeScript del [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), la biblioteca de Java para el layout de grafos. No hay Java ni
WASM: los algoritmos de layout están reimplementados en TypeScript simple y verificados contra la
implementación de Java.

::: warning Pre-alpha
Todavía no se ha portado ningún algoritmo de layout. El repositorio contiene la cadena de herramientas, los documentos
de arquitectura, el andamiaje de verificación y los shims del runtime de Java. `src/index.ts` aún no exporta nada
público. Consulta la [hoja de ruta](/guide/roadmap) para conocer el orden en que llegan los algoritmos.
:::

## El Java es la especificación

El código fuente de Java en el commit fijado de ELK `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` es la
especificación canónica. El portado la sigue de cerca:

- Los algoritmos no se optimizan ni se simplifican. Si el Java parece redundante, la redundancia se conserva.
- Se porta cada rama, y se conservan los límites de los métodos salvo que TypeScript obligue a un cambio.
- Las pruebas JUnit se portan junto con el código que prueban.
- El comportamiento del runtime de Java en el que se apoya ELK (aritmética de enteros de 32 bits, orden de iteración
  de `HashMap`, secuencias de `Random`) se reproduce mediante shims. Consulta [Fundamentos de Java](/es/guide/java-foundations).

Las [reglas de traducción](/guide/translation-rules) enumeran cómo se asigna cada concepto de Java a TypeScript.

## Verificación contra un oráculo

El oráculo es el ELK original compilado desde el código fuente, en un worktree de git desacoplado en el commit fijado.
Las salidas del portado se comparan con las salidas del oráculo:

- Los ids, el número de elementos, la topología de las secciones de arista, el número de puntos de quiebre y los
  valores no numéricos deben coincidir exactamente.
- Las coordenadas y los tamaños numéricos deben coincidir dentro de una tolerancia absoluta de `1e-6`.

Las salidas del oráculo seleccionadas se versionan como referencias golden, de modo que ejecutar las pruebas no requiere
una JVM. El procedimiento completo está en la página de [conformidad](/es/conformance).

## Contrato público

La API pública será el modelo de objetos ElkGraph más las factorías de `ElkGraphUtil`. ELK JSON es un adaptador de
E/S, no el modelo central. La primera publicación en npm congela esta superficie.

## Restricciones de ejecución

- `src/` es seguro para el navegador: sin módulos integrados de Node, sin `process.env`, solo módulos ES.
- No hay dependencias en tiempo de ejecución.

## Siguientes pasos

- [Arquitectura](/es/guide/architecture): cómo encajan el oráculo, los bundles y el motor de layout.
- [Mapa de portado](/guide/port-map) e [inventario](/guide/inventory): qué paquetes de Java se asignan a qué
  módulos.
- [Contribuir](/es/guide/contributing): gates y flujo de trabajo.
