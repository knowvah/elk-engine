---
title: Prezentare generală
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prezentare generală

`@knowvah/elk-engine` este o portare fidelă în TypeScript a [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), biblioteca Java pentru layout de grafuri. Nu există Java și nu există
WASM: algoritmii de layout sunt reimplementați în TypeScript simplu și verificați față de implementarea Java.

::: warning Pre-alfa
Încă nu a fost portat niciun algoritm de layout. Depozitul conține lanțul de unelte, documentele de arhitectură,
infrastructura de verificare și shim-urile runtime-ului Java. `src/index.ts` nu exportă încă nimic public.
Consultați [foaia de parcurs](/guide/roadmap) pentru ordinea în care sosesc algoritmii.
:::

## Java este specificația

Codul sursă Java de la commit-ul ELK fixat `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` este specificația
canonică. Portarea o urmează îndeaproape:

- Algoritmii nu sunt optimizați și nici simplificați. Dacă Java pare redundant, redundanța este păstrată.
- Fiecare ramură este portată, iar limitele metodelor sunt păstrate, cu excepția cazurilor în care TypeScript
  impune o schimbare.
- Testele JUnit sunt portate odată cu codul pe care îl testează.
- Comportamentul runtime-ului Java pe care se bazează ELK (aritmetica pe întregi de 32 de biți, ordinea de iterare
  din `HashMap`, secvențele `Random`) este reprodus prin shim-uri. Consultați
  [Fundamente Java](/ro/guide/java-foundations).

[Regulile de traducere](/guide/translation-rules) listează modul în care fiecare concept Java se asociază cu
TypeScript.

## Verificare față de un oracol

Oracolul este ELK din upstream, compilat din surse, într-un worktree git detașat la commit-ul fixat. Ieșirile
portării sunt comparate cu ieșirile oracolului:

- Id-urile, numărul de elemente, topologia secțiunilor de muchie, numărul de puncte de îndoire și valorile
  nenumerice trebuie să corespundă exact.
- Coordonatele și dimensiunile numerice trebuie să corespundă în limita unei toleranțe absolute de `1e-6`.

Ieșirile oracolului alese cu grijă sunt comise ca referințe golden, astfel că rularea testelor nu necesită JVM.
Procedura completă se găsește pe pagina [Conformitate](/ro/conformance).

## Contract public

API-ul public va fi modelul de obiecte ElkGraph plus fabricile `ElkGraphUtil`. ELK JSON este un adaptor de I/O, nu
modelul de bază. Prima publicare pe npm îngheață această suprafață.

## Restricții de runtime

- `src/` este sigur pentru browser: fără module încorporate Node, fără `process.env`, doar module ES.
- Nu există dependențe de runtime.

## Unde mergeți mai departe

- [Arhitectură](/ro/guide/architecture): cum se îmbină oracolul, bundle-urile și motorul de layout.
- [Harta portării](/guide/port-map) și [inventarul](/guide/inventory): ce pachete Java se asociază cu ce
  module.
- [Contribuire](/ro/guide/contributing): gate-uri și flux de lucru.
