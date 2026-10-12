---
title: Közreműködés
sourceHash: 5c0bf7925cd221552657db1b1b71e2d110f23e71d27ebfc8eb7c84a9fc2db44c
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Közreműködés

Olvassa el először az [Áttekintés](/hu/guide/overview) és a [Fordítási szabályok](/guide/translation-rules) oldalt.
A rögzített commit Java kódja a specifikáció; kétség esetén olvassa el a Javát.

## Kapuk

Futtassa ezeket minden commit előtt. Mindegyiknek át kell mennie.

| Parancs                | Mit ellenőriz                                                  |
| ---------------------- | -------------------------------------------------------------- |
| `npm run format:check` | Prettier-formázás                                              |
| `npm run typecheck`    | TypeScript-típusellenőrzés (natív `tsc --noEmit`)              |
| `npm test`             | A vitest-csomag, a golden csomaggal együtt                     |
| `npm run coverage`     | A csomag 90%-os sor-, ág-, függvény- és utasításlefedettséggel |

Node 22 vagy újabb szükséges. A függőségeket az `npm ci` paranccsal telepítse.

## A tesztek megváltoztathatatlanok

A várt értékek az orákulumból, a JVM-vektorokból vagy a Java forráskódból származnak, még a megvalósítás
megírása előtt (AD-13). Megírás után az állítás (assertion) befagyasztott: egy elbukó teszt azt jelenti,
hogy a megvalósítás hibás.

Ha egy teszt csak az állításának, egy vektornak vagy egy goldennek a módosításával mehet át, álljon meg, és
rögzítse az esetet a misszió döntési naplójában. Ne lazítson tűrést, ne töröljön esetet, és ne generáljon újra
referenciát csak azért, hogy zöld legyen. A golden referenciákat szkript generálja újra, soha nem kézzel.

## Munkafolyamat

1. Hozzon létre egy feature branchet, például `feature/<short-description>`.
2. A commitüzeneteket [Conventional Commits](https://www.conventionalcommits.org) formában írja, például
   `feat(java): add JavaHashMap`. A tárgysorok kisbetűsek és legfeljebb 72 karakter hosszúak.
3. Nyisson pull requestet a `main` ellen. A CI a pull request címét Conventional Commitként ellenőrzi.
4. A commitoknak aláírtnak kell lenniük; a repository szabályrendszere megköveteli.
5. A pull requesteket merge committal olvasztjuk be.

Minden kódfájl SPDX-fejlécet visel, `// SPDX-License-Identifier: EPL-2.0`. Egy fitness-teszt kikényszeríti.
A függőségeknek EPL-2.0-kompatibilisnek kell lenniük.

## Dokumentációs parancsok

| Parancs                | Cél                                                                   |
| ---------------------- | --------------------------------------------------------------------- |
| `npm run docs:dev`     | Elindítja a dokumentációs oldalt élő újratöltéssel                    |
| `npm run docs:build`   | Felépíti az oldalt; egy halott belső hivatkozás megbuktatja a buildet |
| `npm run docs:preview` | Helyben kiszolgálja a felépített oldalt                               |

A legtöbb referenciaoldal a `docs/` könyvtárból von be fájlokat. A `docs/` könyvtárban lévő fájlt szerkessze,
ne a `docs-site/` alatti oldalt. A bevont fájlokban lévő PlantUML-diagramokat SVG-vé renderelve commitoljuk a
`docs-site/public/diagrams/` alá.

## Külső könyvtárak

A szkriptek és a tesztek környezeti változókon keresztül találják meg a mellettük lévő checkoutokat. Az alapértékek
a repository gyökeréhez képest relatívak. Csak a `tools/` és a `test/` olvassa ezeket a változókat; a `src/`
kódja soha.

| Változó          | Alapérték                      | Tartalom                                              |
| ---------------- | ------------------------------ | ----------------------------------------------------- |
| `ELK_SOURCE_DIR` | `../elk`                       | Az Eclipse ELK Java forráskódja a rögzített commitnál |
| `ELK_ORACLE_DIR` | `../elk-oracle`                | Különálló worktree és a megépített orákulum           |
| `ELK_MODELS_DIR` | `../../eclipse-elk/elk-models` | Az elk-models korpusz, a korpusz-manifestben rögzítve |

Az orákulum felépítéséhez Maven 3.9 vagy újabb és JDK 21 szükséges (tartalékként JDK 17). Az orákulum eljárását
lásd a [Megfelelőség](/hu/conformance) oldalon.
