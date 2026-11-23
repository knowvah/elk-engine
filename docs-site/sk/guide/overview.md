---
title: Prehľad
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prehľad

`@knowvah/elk-engine` je verný port [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), javovej knižnice na rozloženie grafov, do TypeScriptu. Neobsahuje Javu
ani WASM: algoritmy rozloženia sú znovu implementované v obyčajnom TypeScripte a overené voči implementácii
v Jave.

::: tip Verzia 1.0
`@knowvah/elk-engine@1.0.0` je na npm. Všetky algoritmy rozloženia ELK v rozsahu projektu sú portované a overené voči
ELK zostavenému zo zdrojov; výsledky nájdete v [správe o zhode](/parity) a stále otvorené rozdiely sa sledujú ako
issues. Verejné API, 72 exportov, je zmrazené vo verzii 1.0.0 a verzie sa riadia semver. Začnite stránkou
[Začíname](/guide/getting-started); čo príde ďalej, nájdete v [pláne vývoja](/guide/roadmap).
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
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 exportov: objektový model ElkGraph a továrne
`ElkGraphUtil`, engine rozloženia, poskytovateľ metadát a trieda volieb každého algoritmu, typy hodnôt základných
volieb, adaptér ELK JSON a asynchrónna funkcia `layout`. ELK JSON je I/O adaptér, nie jadro modelu.
[Začíname](/guide/getting-started) ukazuje povrch v praxi. Povrch je zmrazený vo verzii 1.0.0 a verzie sa riadia
semver: odstránenie exportu znamená hlavnú verziu.

## Obmedzenia behového prostredia

- `src/` je bezpečné pre prehliadač: bez vstavaných modulov Node, bez `process.env`, iba moduly ES.
- Neexistujú žiadne runtime závislosti.

## Kam ďalej

- [Architektúra](/sk/guide/architecture): ako do seba zapadajú orákulum, bundly a engine rozloženia.
- [Mapa portovania](/guide/port-map) a [inventár](/guide/inventory): ktoré balíky Javy sa mapujú na ktoré
  moduly.
- [Ako prispievať](/sk/guide/contributing): brány a pracovný postup.
