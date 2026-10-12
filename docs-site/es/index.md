---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, en TypeScript puro
  tagline: Un portado fiel a TypeScript del Eclipse Layout Kernel. Sin Java, sin WASM — los algoritmos de layout están
    reimplementados en TypeScript simple y verificados contra la implementación de Java.
  actions:
    - theme: brand
      text: Visión general
      link: /es/guide/overview
    - theme: alt
      text: Galería
      link: /es/showcase/
    - theme: alt
      text: Ver en GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Fiel a ELK Java
    details:
      El Java en un commit fijado de ELK es la especificación. Se porta cada rama, y las pruebas JUnit se portan junto
      con el código que prueban.
  - title: Verificado contra un oráculo
    details: Las salidas se comparan con ELK compilado desde el código fuente. La estructura coincide exactamente; las
      coordenadas coinciden dentro de 1e-6.
  - title: Nativo del navegador, sin dependencias en tiempo de ejecución
    details: Sin Java, sin WASM, sin módulos integrados de Node en el código de la biblioteca. Empaquétala y publícala.
  - title: Pre-alpha
    details: Existen la cadena de herramientas, la arquitectura, los shims del runtime de Java y el andamiaje de
      verificación. Todavía no se ha portado ningún algoritmo de layout.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
Todavía no se ha portado ningún algoritmo de layout, y `src/index.ts` no exporta nada público. La primera publicación
en npm congelará la API pública. Consulta la [hoja de ruta](/guide/roadmap) para saber qué viene después.
:::

## Elige tu camino

| Quiero…                                                  | Empieza aquí                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------- |
| Entender qué es el proyecto y qué no es                  | [Visión general](/es/guide/overview)                                |
| Ver cómo encajan las piezas                              | [Arquitectura](/es/guide/architecture)                              |
| Saber qué significa «coincide con el Java»               | [Conformidad](/es/conformance)                                      |
| Encontrar dónde acaba un paquete de Java en el portado   | [Mapa de portado](/guide/port-map) · [Inventario](/guide/inventory) |
| Aprender las reglas de Java a TypeScript                 | [Reglas de traducción](/guide/translation-rules)                    |
| Ver qué comportamiento del runtime de Java está cubierto | [Fundamentos de Java](/es/guide/java-foundations)                   |
| Ver qué está planificado                                 | [Hoja de ruta](/guide/roadmap)                                      |
| Contribuir                                               | [Contribuir](/es/guide/contributing)                                |
