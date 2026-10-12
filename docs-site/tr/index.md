---
layout: home
sourceHash: 6f88122550dfc00bb2332f343e3dff749434fa3d18c5c73a1f0457f5115d46dd
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
  - title: Pre-alpha
    details: Araç zinciri, mimari, Java çalışma zamanı shim'leri ve doğrulama altyapısı mevcut. Henüz hiçbir yerleşim
      algoritması taşınmadı.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning Pre-alpha
Henüz hiçbir yerleşim algoritması taşınmadı ve `src/index.ts` herkese açık hiçbir şey dışa aktarmıyor. İlk npm
yayımı herkese açık API'yi sabitleyecek. Sıradakiler için [yol haritasına](/guide/roadmap) bakın.
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
