---
layout: home
sourceHash: 06b24b3367eb169498f37ff49ece535367d39841a44c96a6599e894ec6caaadf
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
  - title: Sürüm 1.0
    details: Kapsamdaki tüm ELK yerleşim algoritmaları taşındı ve kaynaktan derlenmiş ELK'ya karşı denetlendi. Herkese
      açık API 1.0.0'da dondurulmuştur.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: tip Sürüm 1.0
`@knowvah/elk-engine@1.0.0` npm'de yayımlandı. Kapsamdaki tüm ELK yerleşim algoritmaları taşındı ve kaynaktan
derlenmiş ELK'ya karşı denetlendi; sonuçlar [eşdeğerlik raporunda](/parity) yer alır, hâlâ açık olan farklar ise
issue olarak izlenir. Herkese açık API, 72 dışa aktarım, 1.0.0'da dondurulmuştur ve sürümler semver'i izler.
[Başlangıç](/guide/getting-started) ile başlayın; sıradakiler için [yol haritasına](/guide/roadmap) bakın.
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
