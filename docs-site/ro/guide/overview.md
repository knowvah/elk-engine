---
title: Prezentare generală
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Prezentare generală

`@knowvah/elk-engine` este o portare fidelă în TypeScript a [Eclipse Layout
Kernel](https://www.eclipse.org/elk) (ELK), biblioteca Java pentru layout de grafuri. Nu există Java și nu există
WASM: algoritmii de layout sunt reimplementați în TypeScript simplu și verificați față de implementarea Java.

::: tip Versiunea 1.0
`@knowvah/elk-engine@1.0.0` este pe npm. Toți algoritmii de layout ELK prevăzuți sunt portați și verificați față de
ELK compilat din surse; [raportul de paritate](/parity) conține rezultatele, iar diferențele încă deschise sunt
urmărite ca issue-uri. API-ul public, cu 72 de exporturi, este înghețat la 1.0.0, iar versiunile urmează semver.
Începeți cu [Primii pași](/guide/getting-started) și consultați [foaia de parcurs](/guide/roadmap) pentru ce urmează.
:::

## Java este specificația

Codul sursă Java de la commit-ul ELK fixat `8bca22f4afa3371562d2f702d59929818f7f7b71` este specificația
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

API-ul public este suprafața de export acceptată în
[#90](https://github.com/knowvah/elk-engine/issues/90), 72 de exporturi: modelul de obiecte ElkGraph și fabricile
`ElkGraphUtil`, motorul de layout, furnizorul de metadate și clasa de opțiuni ale fiecărui algoritm, tipurile
valorilor opțiunilor de bază, adaptorul ELK JSON și funcția asincronă `layout`. ELK JSON este un adaptor de I/O, nu
modelul de bază. [Primii pași](/guide/getting-started) arată suprafața în uz. Suprafața este înghețată la 1.0.0, iar
versiunile urmează semver: eliminarea unui export înseamnă o versiune majoră.

## Restricții de runtime

- `src/` este sigur pentru browser: fără module încorporate Node, fără `process.env`, doar module ES.
- Nu există dependențe de runtime.

## Unde mergeți mai departe

- [Arhitectură](/ro/guide/architecture): cum se îmbină oracolul, bundle-urile și motorul de layout.
- [Harta portării](/guide/port-map) și [inventarul](/guide/inventory): ce pachete Java se asociază cu ce
  module.
- [Contribuire](/ro/guide/contributing): gate-uri și flux de lucru.
