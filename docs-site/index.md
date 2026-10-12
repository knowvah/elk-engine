---
layout: home
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, in pure TypeScript
  tagline: A faithful TypeScript port of the Eclipse Layout Kernel. No Java, no WASM — the layout algorithms are
    re-implemented in plain TypeScript and verified against the Java implementation.
  actions:
    - theme: brand
      text: Overview
      link: /guide/overview
    - theme: alt
      text: Showcase
      link: /showcase/
    - theme: alt
      text: View on GitHub
      link: https://github.com/knowvah/elk-engine
features:
  - title: Faithful to ELK Java
    details:
      The Java at a pinned ELK commit is the specification. Every branch is ported, and the JUnit tests are ported
      with the code they test.
  - title: Verified against an oracle
    details: Outputs are compared with ELK built from source. Structure matches exactly; coordinates match within 1e-6.
  - title: Browser-native, zero runtime dependencies
    details: No Java, no WASM, no Node built-ins in the library code. Bundle it and ship.
  - title: Pre-alpha
    details: The toolchain, architecture, Java runtime shims, and verification scaffolding exist. No layout algorithm is
      ported yet.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
No layout algorithm is ported yet, and `src/index.ts` exports nothing public. The first npm publish
will freeze the public API. See the [roadmap](/guide/roadmap) for what comes next.
:::

## Choose your path

| I want to…                                  | Start here                                                  |
| ------------------------------------------- | ----------------------------------------------------------- |
| Understand what the project is and is not   | [Overview](/guide/overview)                                 |
| See how the pieces fit                      | [Architecture](/guide/architecture)                         |
| Know what "matches the Java" means          | [Conformance](/conformance)                                 |
| Find where a Java package lands in the port | [Port map](/guide/port-map) · [Inventory](/guide/inventory) |
| Learn the Java-to-TypeScript rules          | [Translation rules](/guide/translation-rules)               |
| See which Java runtime behavior is covered  | [Java foundations](/guide/java-foundations)                 |
| See what is planned                         | [Roadmap](/guide/roadmap)                                   |
| Contribute                                  | [Contributing](/guide/contributing)                         |
