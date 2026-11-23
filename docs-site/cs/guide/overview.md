---
title: Přehled
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Přehled

`@knowvah/elk-engine` je věrné portování [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), javové knihovny pro rozvržení grafů, do TypeScriptu. Neobsahuje žádnou
Javu ani WASM: algoritmy rozvržení jsou znovu implementovány v obyčejném TypeScriptu a ověřeny proti implementaci
v Javě.

::: tip Verze 1.0
`@knowvah/elk-engine@1.0.0` je na npm. Všechny algoritmy rozvržení ELK v rozsahu projektu jsou portovány a ověřeny
proti ELK sestavenému ze zdrojů; výsledky najdete ve [zprávě o shodě](/parity), rozdíly, které jsou stále otevřené,
se sledují jako issues. Veřejné API, 72 exportů, je od verze 1.0.0 zmrazeno a verze se řídí semver. Začněte
v [Začínáme](/guide/getting-started). Co přijde dál, najdete v [plánu vývoje](/guide/roadmap).
:::

## Java je specifikace

Zdrojový kód Javy v zafixovaném commitu ELK `8bca22f4afa3371562d2f702d59929818f7f7b71` je kanonickou
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

Veřejné API je exportní povrch schválený v
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 exportů: objektový model ElkGraph a továrny
`ElkGraphUtil`, engine rozvržení, poskytovatel metadat a třída voleb každého algoritmu, typy hodnot základních voleb,
adaptér ELK JSON a asynchronní funkce `layout`. ELK JSON je adaptér vstupu a výstupu, nikoli jádro modelu.
[Začínáme](/guide/getting-started) ukazuje povrch v praxi. Povrch je zmrazen ve verzi 1.0.0 a verze se řídí semver:
odebrání exportu je hlavní verze.

## Omezení běhového prostředí

- `src/` je bezpečný pro prohlížeč: žádné vestavěné moduly Node, žádné `process.env`, pouze moduly ES.
- Neexistují žádné závislosti za běhu.

## Kam dál

- [Architektura](/cs/guide/architecture): jak do sebe zapadají orákulum, bundly a engine rozvržení.
- [Mapa portování](/guide/port-map) a [inventář](/guide/inventory): které balíčky Javy se mapují na které
  moduly.
- [Jak přispívat](/cs/guide/contributing): gate a pracovní postup.
