---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
hero:
  name: '@knowvah/elk-engine'
  text: Eclipse ELK, saf TypeScript ile
  tagline: Eclipse Layout Kernel'in aslına sadık bir TypeScript taşıması. Java yok, WASM yok — yerleşim algoritmaları
    düz TypeScript ile yeniden uygulanmıştır ve Java uygulamasına karşı doğrulanmıştır.
  actions:
    - theme: brand
      text: Genel bakış
      link: /tr/guide/overview
    - theme: alt
      text: Galeri
      link: /tr/showcase/
    - theme: alt
      text: GitHub'da görüntüle
      link: https://github.com/knowvah/elk-engine
features:
  - title: ELK Java'ya sadık
    details: Sabitlenmiş bir ELK commit'indeki Java belirtimdir. Her dal taşınır ve JUnit testleri, test ettikleri kodla
      birlikte taşınır.
  - title: Bir oracle'a karşı doğrulanmış
    details: Çıktılar, kaynaktan derlenmiş ELK ile karşılaştırılır. Yapı birebir eşleşir; koordinatlar 1e-6 içinde
      eşleşir.
  - title: Tarayıcıya özgü, sıfır çalışma zamanı bağımlılığı
    details: Kütüphane kodunda Java yok, WASM yok, Node yerleşikleri yok. Paketleyin ve yayımlayın.
  - title: Pre-1.0
    details: Kapsamdaki tüm ELK yerleşim algoritmaları taşındı ve kaynaktan derlenmiş ELK'ya karşı denetlendi. 1.0'a
      kadar API değişebilir.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-1.0
Kapsamdaki tüm ELK yerleşim algoritmaları taşındı ve kaynaktan derlenmiş ELK'ya karşı denetlendi; sonuçlar
[eşdeğerlik raporunda](/parity) yer alır. Herkese açık dışa aktarım yüzeyi kabul edildi ancak henüz
`src/index.ts` içinde değil; bu yüzden paket girişi henüz herkese açık hiçbir şey dışa aktarmıyor. Sürümler 1.0'a
kadar 0.x kalır ve o zamana kadar API değişebilir. Sıradakiler için [yol haritasına](/guide/roadmap) bakın.
:::

## Yolunuzu seçin

| Şunu yapmak istiyorum…                                     | Buradan başlayın                                                  |
| ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Projenin ne olduğunu ve ne olmadığını anlamak              | [Genel bakış](/tr/guide/overview)                                 |
| Parçaların nasıl bir araya geldiğini görmek                | [Mimari](/tr/guide/architecture)                                  |
| "Java ile eşleşir"in ne demek olduğunu öğrenmek            | [Uygunluk](/tr/conformance)                                       |
| Bir Java paketinin taşımada nereye düştüğünü bulmak        | [Taşıma haritası](/guide/port-map) · [Envanter](/guide/inventory) |
| Java'dan TypeScript'e kuralları öğrenmek                   | [Çeviri kuralları](/guide/translation-rules)                      |
| Hangi Java çalışma zamanı davranışının kapsandığını görmek | [Java temelleri](/tr/guide/java-foundations)                      |
| Nelerin planlandığını görmek                               | [Yol haritası](/guide/roadmap)                                    |
| Katkıda bulunmak                                           | [Katkıda bulunma](/tr/guide/contributing)                         |
