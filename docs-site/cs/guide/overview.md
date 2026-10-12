---
title: Přehled
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Přehled

`@knowvah/elk-engine` je věrné portování [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), javové knihovny pro rozvržení grafů, do TypeScriptu. Neobsahuje žádnou
Javu ani WASM: algoritmy rozvržení jsou znovu implementovány v obyčejném TypeScriptu a ověřeny proti implementaci
v Javě.

::: warning Pre-alfa
Zatím není portován žádný algoritmus rozvržení. Repozitář obsahuje toolchain, architektonické dokumenty,
ověřovací kostru a shimy běhového prostředí Javy. `src/index.ts` zatím neexportuje nic veřejného.
Pořadí, v jakém algoritmy přibudou, najdete v [plánu vývoje](/guide/roadmap).
:::

## Java je specifikace

Zdrojový kód Javy v zafixovaném commitu ELK `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` je kanonickou
specifikací. Portování ji těsně následuje:

- Algoritmy se neoptimalizují ani nezjednodušují. Pokud Java působí nadbytečně, nadbytečnost zůstává zachována.
- Každá větev je portována a hranice metod zůstávají zachovány, pokud změnu nevynutí TypeScript.
- Testy JUnit se portují spolu s kódem, který testují.
- Chování běhového prostředí Javy, na které ELK spoléhá (32bitová celočíselná aritmetika, pořadí iterace
  `HashMap`, posloupnosti `Random`), reprodukují shimy. Viz [Základy Javy](/cs/guide/java-foundations).

[Pravidla překladu](/guide/translation-rules) uvádějí, jak se jednotlivé koncepty Javy mapují na TypeScript.

## Ověření proti orákulu

Orákulum je upstreamové ELK sestavené ze zdrojů v odpojeném git worktree v zafixovaném commitu.
Výstupy portování se porovnávají s výstupy orákula:

- ID, počty prvků, topologie úseků hran, počty ohybových bodů a nenumerické hodnoty se musí shodovat
  přesně.
- Numerické souřadnice a velikosti se musí shodovat v rámci absolutní tolerance `1e-6`.

Vybrané výstupy orákula jsou zapsány do repozitáře jako referenční goldeny, takže ke spuštění testů není potřeba JVM.
Úplný postup najdete na stránce [Shoda](/cs/conformance).

## Veřejný kontrakt

Veřejné API bude objektový model ElkGraph plus továrny `ElkGraphUtil`. ELK JSON je adaptér vstupu a výstupu,
nikoli jádro modelu. První publikace na npm tento povrch zafixuje.

## Omezení běhového prostředí

- `src/` je bezpečný pro prohlížeč: žádné vestavěné moduly Node, žádné `process.env`, pouze moduly ES.
- Neexistují žádné závislosti za běhu.

## Kam dál

- [Architektura](/cs/guide/architecture): jak do sebe zapadají orákulum, bundly a engine rozvržení.
- [Mapa portování](/guide/port-map) a [inventář](/guide/inventory): které balíčky Javy se mapují na které
  moduly.
- [Jak přispívat](/cs/guide/contributing): gate a pracovní postup.
