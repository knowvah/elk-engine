---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, in reinem TypeScript
  tagline: Eine originalgetreue TypeScript-Portierung des Eclipse Layout Kernel. Kein Java, kein WASM — die
    Layoutalgorithmen sind in schlichtem TypeScript neu implementiert und gegen die Java-Implementierung verifiziert.
  actions:
    - theme: brand
      text: Überblick
      link: /de/guide/overview
    - theme: alt
      text: Galerie
      link: /de/showcase/
    - theme: alt
      text: Auf GitHub ansehen
      link: https://github.com/knowvah/elk-engine
features:
  - title: Originalgetreu zu ELK Java
    details:
      Das Java an einem fixierten ELK-Commit ist die Spezifikation. Jeder Zweig wird portiert, und die JUnit-Tests
      werden zusammen mit dem Code portiert, den sie testen.
  - title: Gegen ein Orakel verifiziert
    details: Die Ausgaben werden mit aus den Quellen gebautem ELK verglichen. Die Struktur stimmt exakt überein; die
      Koordinaten stimmen innerhalb von 1e-6 überein.
  - title: Browser-nativ, ohne Laufzeitabhängigkeiten
    details: Kein Java, kein WASM, keine Node-Built-ins im Bibliothekscode. Bündeln und ausliefern.
  - title: Pre-Alpha
    details: Toolchain, Architektur, Java-Laufzeit-Shims und Verifikationsgerüst sind vorhanden. Noch kein
      Layoutalgorithmus ist portiert.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-Alpha
Noch kein Layoutalgorithmus ist portiert, und `src/index.ts` exportiert nichts Öffentliches. Das erste npm-Publish
friert die öffentliche API ein. Was als Nächstes kommt, steht in der [Roadmap](/guide/roadmap).
:::

## Wählen Sie Ihren Weg

| Ich möchte…                                              | Hier beginnen                                                      |
| -------------------------------------------------------- | ------------------------------------------------------------------ |
| Verstehen, was das Projekt ist und was nicht             | [Überblick](/de/guide/overview)                                    |
| Sehen, wie die Teile zusammenpassen                      | [Architektur](/de/guide/architecture)                              |
| Wissen, was „stimmt mit dem Java überein“ bedeutet       | [Konformität](/de/conformance)                                     |
| Herausfinden, wo ein Java-Paket in der Portierung landet | [Portierungskarte](/guide/port-map) · [Inventar](/guide/inventory) |
| Die Regeln von Java zu TypeScript lernen                 | [Übersetzungsregeln](/guide/translation-rules)                     |
| Sehen, welches Java-Laufzeitverhalten abgedeckt ist      | [Java-Grundlagen](/de/guide/java-foundations)                      |
| Sehen, was geplant ist                                   | [Roadmap](/guide/roadmap)                                          |
| Mitwirken                                                | [Mitwirken](/de/guide/contributing)                                |
