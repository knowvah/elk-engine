---
title: Visión general
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Visión general

`@knowvah/elk-engine` es un portado fiel a TypeScript del [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), la biblioteca de Java para el layout de grafos. No hay Java ni
WASM: los algoritmos de layout están reimplementados en TypeScript simple y verificados contra la
implementación de Java.

::: tip Versión 1.0
`@knowvah/elk-engine@1.0.0` está en npm. Todos los algoritmos de layout de ELK previstos están portados y verificados
contra el ELK compilado desde el código fuente; el [informe de paridad](/parity) recoge los resultados, y las
diferencias que siguen abiertas se siguen como issues. La API pública, 72 exportaciones, queda congelada en 1.0.0 y
las versiones siguen semver. Empieza por [Primeros pasos](/guide/getting-started). Consulta la
[hoja de ruta](/guide/roadmap) para saber qué viene después.
:::

## El Java es la especificación

El código fuente de Java en el commit fijado de ELK `8bca22f4afa3371562d2f702d59929818f7f7b71` es la
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

La API pública es la superficie de exportación aceptada en
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 exportaciones: el modelo de objetos ElkGraph y las
factorías de `ElkGraphUtil`, el motor de layout, el proveedor de metadatos y la clase de opciones de cada algoritmo,
los tipos de valor de las opciones centrales, el adaptador ELK JSON y la función asíncrona `layout`. ELK JSON es un
adaptador de E/S, no el modelo central. [Primeros pasos](/guide/getting-started) muestra la superficie en uso. La
superficie queda congelada en 1.0.0 y las versiones siguen semver: eliminar una exportación es una versión mayor.

## Restricciones de ejecución

- `src/` es seguro para el navegador: sin módulos integrados de Node, sin `process.env`, solo módulos ES.
- No hay dependencias en tiempo de ejecución.

## Siguientes pasos

- [Arquitectura](/es/guide/architecture): cómo encajan el oráculo, los bundles y el motor de layout.
- [Mapa de portado](/guide/port-map) e [inventario](/guide/inventory): qué paquetes de Java se asignan a qué
  módulos.
- [Contribuir](/es/guide/contributing): gates y flujo de trabajo.
