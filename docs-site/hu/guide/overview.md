---
title: Áttekintés
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Áttekintés

A `@knowvah/elk-engine` az [Eclipse Layout Kernel](https://www.eclipse.org/elk) (ELK), a Java gráfelrendezési
könyvtár hű TypeScript-portolása. Nincs Java és nincs WASM: az elrendezési algoritmusok egyszerű
TypeScriptben vannak újraimplementálva, és a Java implementációval szemben ellenőrzöttek.

::: warning Pre-alfa
Egyetlen elrendezési algoritmus sincs még portolva. A repository a toolchaint, az architektúradokumentumokat,
az ellenőrzési vázat és a Java futtatókörnyezeti shimeket tartalmazza. A `src/index.ts` még nem exportál semmi nyilvánosat.
Az algoritmusok érkezésének sorrendjét az [ütemterv](/guide/roadmap) tartalmazza.
:::

## A Java a specifikáció

A rögzített ELK-commit, `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` Java forráskódja a mérvadó
specifikáció. A portolás szorosan követi:

- Az algoritmusokat nem optimalizáljuk és nem egyszerűsítjük. Ha a Java feleslegesnek tűnik, a redundanciát megtartjuk.
- Minden ág portolva van, a metódushatárok pedig megmaradnak, kivéve ha a TypeScript változtatást kényszerít ki.
- A JUnit-teszteket az általuk tesztelt kóddal együtt portoljuk.
- Az ELK által használt Java futtatókörnyezeti viselkedést (32 bites egész aritmetika, `HashMap`-bejárási sorrend,
  `Random`-sorozatok) shimek állítják elő. Lásd: [Java-alapok](/hu/guide/java-foundations).

A [fordítási szabályok](/guide/translation-rules) felsorolják, hogyan képeződik le az egyes Java-fogalmak TypeScriptre.

## Ellenőrzés orákulummal szemben

Az orákulum a forrásból fordított upstream ELK, egy különálló (detached) git worktree-ben a rögzített commitnál.
A portolás kimeneteit az orákulum kimeneteivel vetjük össze:

- Az azonosítóknak, az elemszámoknak, az éltöredékek topológiájának, a töréspontok számának és a nem numerikus
  értékeknek pontosan egyezniük kell.
- A numerikus koordinátáknak és méreteknek `1e-6` abszolút tűrésen belül kell egyezniük.

A kurált orákulum-kimenetek golden referenciaként vannak commitolva, így a tesztek futtatásához nincs szükség JVM-re.
A teljes eljárás a [megfelelőség](/hu/conformance) oldalon található.

## Nyilvános szerződés

A nyilvános API az ElkGraph objektummodell és az `ElkGraphUtil` factoryk lesz. Az ELK JSON I/O-adapter,
nem a magmodell. Az első npm-publikálás befagyasztja ezt a felületet.

## Futásidejű megszorítások

- A `src/` böngészőbiztos: nincsenek Node beépített modulok, nincs `process.env`, kizárólag ES-modulok.
- Futásidejű függőség nincs.

## Merre tovább

- [Architektúra](/hu/guide/architecture): hogyan illeszkedik össze az orákulum, a bundle-ök és az elrendezési motor.
- [Portolási térkép](/guide/port-map) és [leltár](/guide/inventory): mely Java-csomagok mely modulokra
  képeződnek le.
- [Közreműködés](/hu/guide/contributing): kapuk és munkafolyamat.
