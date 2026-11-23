---
title: Áttekintés
sourceHash: a7927ee742347e04a529a2939dfbcb685d8b1e32ba94b375d45da70747fd90f2
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Áttekintés

A `@knowvah/elk-engine` az [Eclipse Layout Kernel](https://www.eclipse.org/elk) (ELK), a Java gráfelrendezési
könyvtár hű TypeScript-portolása. Nincs Java és nincs WASM: az elrendezési algoritmusok egyszerű
TypeScriptben vannak újraimplementálva, és a Java implementációval szemben ellenőrzöttek.

::: tip 1.0-s verzió
A `@knowvah/elk-engine@1.0.0` elérhető az npm-en. Az ELK összes hatókörbe tartozó elrendezési algoritmusa portolva
van, és a forrásból fordított ELK-val szemben ellenőrzött; az eredményeket a [paritásjelentés](/parity) tartalmazza, a
még nyitott eltéréseket pedig issue-k követik. A nyilvános API, 72 export, az 1.0.0-s verziótól fagyasztott, és a
verziók a semvert követik. Kezdje az [Első lépések](/guide/getting-started) oldallal. Hogy mi következik, azt az
[ütemterv](/guide/roadmap) tartalmazza.
:::

## A Java a specifikáció

A rögzített ELK-commit, `8bca22f4afa3371562d2f702d59929818f7f7b71` Java forráskódja a mérvadó
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
A teljes eljárás a [megfelelőség](/conformance) oldalon található.

## Nyilvános szerződés

A nyilvános API a [#90](https://github.com/knowvah/elk-engine/issues/90) hibajegyben elfogadott exportfelület,
72 export: az ElkGraph objektummodell és az `ElkGraphUtil` factoryk, az elrendezési motor, az egyes algoritmusok
metaadat-szolgáltatója és opcióosztálya, a magopciók értéktípusai, az ELK JSON adapter és az aszinkron `layout`
függvény. Az ELK JSON I/O-adapter, nem a magmodell. Az [Első lépések](/guide/getting-started) oldal a felületet
használat közben mutatja be. A felület az 1.0.0-ban fagyasztott, a verziók a semvert követik: egy export
eltávolítása főverziót jelent.

## Futásidejű megszorítások

- A `src/` böngészőbiztos: nincsenek Node beépített modulok, nincs `process.env`, kizárólag ES-modulok.
- Futásidejű függőség nincs.

## Merre tovább

- [Architektúra](/hu/guide/architecture): hogyan illeszkedik össze az orákulum, a bundle-ök és az elrendezési motor.
- [Portolási térkép](/guide/port-map) és [leltár](/guide/inventory): mely Java-csomagok mely modulokra
  képeződnek le.
- [Közreműködés](/hu/guide/contributing): kapuk és munkafolyamat.
