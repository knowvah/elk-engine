---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
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
  - title: Versión 1.0
    details: Todos los algoritmos de layout de ELK previstos están portados y verificados contra ELK compilado desde el
      código fuente. La API pública queda congelada en 1.0.0.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Versión 1.0
`@knowvah/elk-engine@1.0.0` está en npm. Todos los algoritmos de layout de ELK previstos están portados y verificados
contra el ELK compilado desde el código fuente; el [informe de paridad](/parity) recoge los resultados, y las
diferencias que siguen abiertas se siguen como issues. La API pública, 72 exportaciones, queda congelada en 1.0.0 y
las versiones siguen semver. Empieza por [Primeros pasos](/guide/getting-started). Consulta la
[hoja de ruta](/guide/roadmap) para saber qué viene después.
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
