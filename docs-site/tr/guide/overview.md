---
title: Genel bakış
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Genel bakış

`@knowvah/elk-engine`, Java grafik yerleşim kütüphanesi olan [Eclipse Layout
Kernel](https://www.eclipse.org/elk)'in (ELK) aslına sadık bir TypeScript taşımasıdır. Java yok, WASM yok:
yerleşim algoritmaları düz TypeScript ile yeniden uygulanmıştır ve Java uygulamasına karşı doğrulanmıştır.

::: warning Pre-alpha
Henüz hiçbir yerleşim algoritması taşınmadı. Depo; araç zincirini, mimari belgelerini, doğrulama altyapısını ve
Java çalışma zamanı shim'lerini barındırır. `src/index.ts` henüz herkese açık hiçbir şey dışa aktarmaz.
Algoritmaların geliş sırası için [yol haritasına](/guide/roadmap) bakın.
:::

## Java belirtimdir

Sabitlenmiş ELK commit'i `8aaa3c145c2a18a38aabbc725aa3791ddc517a76` üzerindeki Java kaynağı, bağlayıcı
belirtimdir. Taşıma onu yakından izler:

- Algoritmalar ne optimize edilir ne de basitleştirilir. Java gereksiz görünüyorsa, gereksizlik korunur.
- Her dal taşınır ve TypeScript bir değişikliği zorunlu kılmadıkça metot sınırları korunur.
- JUnit testleri, test ettikleri kodla birlikte taşınır.
- ELK'nın dayandığı Java çalışma zamanı davranışı (32 bit tamsayı aritmetiği, `HashMap` yineleme sırası, `Random`
  dizileri) shim'lerle yeniden üretilir. Bkz. [Java temelleri](/tr/guide/java-foundations).

[Çeviri kuralları](/guide/translation-rules), her Java kavramının TypeScript'e nasıl eşlendiğini listeler.

## Bir oracle'a karşı doğrulama

Oracle, sabitlenmiş commit'teki ayrık bir git çalışma ağacında kaynaktan derlenmiş upstream ELK'dır.
Taşımanın çıktıları, oracle'ın çıktılarıyla karşılaştırılır:

- Kimlikler, öğe sayıları, kenar bölümü topolojisi, büküm noktası sayıları ve sayısal olmayan değerler birebir
  eşleşmelidir.
- Sayısal koordinatlar ve boyutlar `1e-6` mutlak toleransı içinde eşleşmelidir.

Seçilmiş oracle çıktıları golden referansları olarak depoya eklenmiştir; bu yüzden testleri çalıştırmak için JVM
gerekmez. Tam yöntem [uygunluk](/tr/conformance) sayfasındadır.

## Herkese açık sözleşme

Herkese açık API, ElkGraph nesne modeli ile `ElkGraphUtil` fabrikaları olacaktır. ELK JSON bir G/Ç
bağdaştırıcısıdır, çekirdek model değildir. İlk npm yayımı bu yüzeyi sabitler.

## Çalışma zamanı kısıtları

- `src/` tarayıcıda güvenle çalışır: Node yerleşikleri yok, `process.env` yok, yalnızca ES modülleri.
- Sıfır çalışma zamanı bağımlılığı vardır.

## Sonraki adımlar

- [Mimari](/tr/guide/architecture): oracle, bundle'lar ve yerleşim motoru nasıl bir araya gelir.
- [Taşıma haritası](/guide/port-map) ve [envanter](/guide/inventory): hangi Java paketleri hangi modüllere
  eşlenir.
- [Katkıda bulunma](/tr/guide/contributing): gate'ler ve iş akışı.
