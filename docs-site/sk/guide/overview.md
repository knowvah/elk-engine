---
title: Prehľad
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prehľad

`@knowvah/elk-engine` je verný port [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), javovej knižnice na rozloženie grafov, do TypeScriptu. Neobsahuje Javu
ani WASM: algoritmy rozloženia sú znovu implementované v obyčajnom TypeScripte a overené voči implementácii
v Jave.

::: warning Pre-1.0
Všetky algoritmy rozloženia ELK v rozsahu projektu sú portované a overené voči ELK zostavenému zo zdrojov;
výsledky nájdete v [správe o zhode](/parity). Verejný exportný povrch je schválený, no zatiaľ nie je v `src/index.ts`,
takže vstupný bod balíka zatiaľ neexportuje nič verejné. Do verzie 1.0 sa API ešte môže zmeniť.
Čo príde ďalej, nájdete v [pláne vývoja](/guide/roadmap).
:::

## Java je špecifikácia

Zdrojový kód Javy na pripnutom commite ELK `8bca22f4afa3371562d2f702d59929818f7f7b71` je kanonická
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

Verejné API je exportný povrch schválený v
[#90](https://github.com/knowvah/elk-engine/issues/90): objektový model ElkGraph a továrne `ElkGraphUtil`, engine
rozloženia, poskytovateľ metadát každého algoritmu a jeho voľby s typmi hodnôt a tiež formáty ELK JSON a textové
formáty grafov. ELK JSON je I/O adaptér, nie jadro modelu. [Začíname](/guide/getting-started) ukazuje povrch
v praxi. Verzie zostávajú 0.x do verzie 1.0; verzia 1.0 povrch zmrazí.

## Obmedzenia behového prostredia

- `src/` je bezpečné pre prehliadač: bez vstavaných modulov Node, bez `process.env`, iba moduly ES.
- Neexistujú žiadne runtime závislosti.

## Kam ďalej

- [Architektúra](/sk/guide/architecture): ako do seba zapadajú orákulum, bundly a engine rozloženia.
- [Mapa portovania](/guide/port-map) a [inventár](/guide/inventory): ktoré balíky Javy sa mapujú na ktoré
  moduly.
- [Ako prispievať](/sk/guide/contributing): brány a pracovný postup.
