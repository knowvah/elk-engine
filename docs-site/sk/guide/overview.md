---
title: Prehľad
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prehľad

`@knowvah/elk-engine` je verný port [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), javovej knižnice na rozloženie grafov, do TypeScriptu. Neobsahuje Javu
ani WASM: algoritmy rozloženia sú znovu implementované v obyčajnom TypeScripte a overené voči implementácii
v Jave.

::: warning Pre-alfa
Zatiaľ nie je portovaný žiadny algoritmus rozloženia. Repozitár obsahuje toolchain, architektonické dokumenty,
overovaciu kostru a shimy behového prostredia Javy. `src/index.ts` zatiaľ neexportuje nič verejné.
Poradie, v akom algoritmy pribúdajú, nájdete v [pláne vývoja](/guide/roadmap).
:::

## Java je špecifikácia

Zdrojový kód Javy na pripnutom commite ELK `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` je kanonická
špecifikácia. Port ju dôsledne sleduje:

- Algoritmy sa neoptimalizujú ani nezjednodušujú. Ak sa Java javí ako redundantná, redundancia sa zachová.
- Portuje sa každá vetva a hranice metód sa zachovávajú, pokiaľ zmenu nevynúti TypeScript.
- Testy JUnit sa portujú spolu s kódom, ktorý testujú.
- Správanie behového prostredia Javy, na ktoré sa ELK spolieha (32-bitová celočíselná aritmetika, poradie iterácie
  `HashMap`, postupnosti `Random`), reprodukujú shimy. Pozrite si [Základy Javy](/sk/guide/java-foundations).

[Pravidlá prekladu](/guide/translation-rules) uvádzajú, ako sa jednotlivé koncepty Javy mapujú na TypeScript.

## Overenie voči orákulu

Orákulum je upstreamové ELK zostavené zo zdrojov v odpojenom git worktree na pripnutom commite.
Výstupy portu sa porovnávajú s výstupmi orákula:

- Identifikátory, počty prvkov, topológia sekcií hrán, počty ohybových bodov a nenumerické hodnoty sa musia
  zhodovať presne.
- Numerické súradnice a veľkosti sa musia zhodovať v rámci absolútnej tolerancie `1e-6`.

Vybrané výstupy orákula sú commitnuté ako referenčné goldeny, takže spustenie testov nevyžaduje JVM. Úplný
postup je na stránke [Zhoda](/sk/conformance).

## Verejný kontrakt

Verejné API bude objektový model ElkGraph plus továrne `ElkGraphUtil`. ELK JSON je I/O adaptér, nie jadro
modelu. Prvé publikovanie na npm tento povrch zmrazí.

## Obmedzenia behového prostredia

- `src/` je bezpečné pre prehliadač: bez vstavaných modulov Node, bez `process.env`, iba moduly ES.
- Neexistujú žiadne runtime závislosti.

## Kam ďalej

- [Architektúra](/sk/guide/architecture): ako do seba zapadajú orákulum, bundly a engine rozloženia.
- [Mapa portovania](/guide/port-map) a [inventár](/guide/inventory): ktoré balíky Javy sa mapujú na ktoré
  moduly.
- [Ako prispievať](/sk/guide/contributing): brány a pracovný postup.
