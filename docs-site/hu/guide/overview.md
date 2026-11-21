---
title: Áttekintés
sourceHash: ae706ea0c693889bbac9d0298ac9906f2282efda6d617acd987e7c3a37e406eb
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Áttekintés

A `@knowvah/elk-engine` az [Eclipse Layout Kernel](https://www.eclipse.org/elk) (ELK), a Java gráfelrendezési
könyvtár hű TypeScript-portolása. Nincs Java és nincs WASM: az elrendezési algoritmusok egyszerű
TypeScriptben vannak újraimplementálva, és a Java implementációval szemben ellenőrzöttek.

::: warning Pre-1.0
Az ELK összes hatókörbe tartozó elrendezési algoritmusa portolva van, és a forrásból fordított ELK-val szemben
ellenőrzött; az eredményeket a [paritásjelentés](/parity) tartalmazza. A nyilvános exportfelület elfogadott, de még
nincs a `src/index.ts`-ben, ezért a csomag belépési pontja még nem exportál semmi nyilvánosat. Az 1.0-s verzióig
az API még változhat. Hogy mi következik, azt az [ütemterv](/guide/roadmap) tartalmazza.
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
A teljes eljárás a [megfelelőség](/hu/conformance) oldalon található.

## Nyilvános szerződés

A nyilvános API a [#90](https://github.com/knowvah/elk-engine/issues/90) hibajegyben elfogadott exportfelület:
az ElkGraph objektummodell és az `ElkGraphUtil` factoryk, az elrendezési motor, az egyes algoritmusok
metaadat-szolgáltatója és opciói az értéktípusaikkal együtt, valamint az ELK JSON és a szöveges gráfformátumok.
Az ELK JSON I/O-adapter, nem a magmodell. Az [Első lépések](/guide/getting-started) oldal a felületet használat
közben mutatja be. A verziók 1.0-ig 0.x-ek maradnak; az 1.0 befagyasztja a felületet.

## Futásidejű megszorítások

- A `src/` böngészőbiztos: nincsenek Node beépített modulok, nincs `process.env`, kizárólag ES-modulok.
- Futásidejű függőség nincs.

## Merre tovább

- [Architektúra](/hu/guide/architecture): hogyan illeszkedik össze az orákulum, a bundle-ök és az elrendezési motor.
- [Portolási térkép](/guide/port-map) és [leltár](/guide/inventory): mely Java-csomagok mely modulokra
  képeződnek le.
- [Közreműködés](/hu/guide/contributing): kapuk és munkafolyamat.
