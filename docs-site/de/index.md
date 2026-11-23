---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
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
  - title: Version 1.0
    details: Alle vorgesehenen ELK-Layoutalgorithmen sind portiert und gegen aus den Quellen gebautes ELK geprüft.
      Die öffentliche API ist ab 1.0.0 eingefroren.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Version 1.0
`@knowvah/elk-engine@1.0.0` ist auf npm. Alle vorgesehenen ELK-Layoutalgorithmen sind portiert und gegen aus den
Quellen gebautes ELK geprüft; die Ergebnisse stehen im [Paritätsbericht](/parity), noch offene Abweichungen werden
als Issues verfolgt. Die öffentliche API, 72 Exporte, ist ab 1.0.0 eingefroren, und die Versionen folgen semver.
Beginnen Sie mit [Erste Schritte](/guide/getting-started). Was als Nächstes kommt, steht in der
[Roadmap](/guide/roadmap).
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
