---
title: Mimari
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine mimarisine genel bakış

| Belge                                               | İçerik                                                                         |
| --------------------------------------------------- | ------------------------------------------------------------------------------ |
| [inventory.md](/guide/inventory)                    | Her ELK bundle'ı: amaç, LOC, üretilmiş kaynaklar, kapsam                       |
| [port-map.md](/guide/port-map)                      | Java paketlerinin `src/` modüllerine eşlenmesi                                 |
| [component-map.md](#bileşen-haritası)               | Kapsamdaki bundle bağımlılıkları; çekirdek çalışma zamanı parçaları            |
| [../translation-rules.md](/guide/translation-rules) | Java'dan TypeScript'e kurallar                                                 |
| [../conformance.md](/tr/conformance)                | Oracle karşılaştırma ölçütü ve yöntemi (bu görevin ilerleyen aşamasında gelir) |

## elk-engine nedir

`@knowvah/elk-engine`, Eclipse Layout Kernel'in (ELK) aslına sadık bir TypeScript taşımasıdır. Sabitlenmiş
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76` commit'indeki Java belirtimdir (AD-1, AD-2). Bir kütüphanedir:
tarayıcıda güvenle çalışır, sıfır çalışma zamanı bağımlılığı vardır, Java veya WASM içermez. Herkese açık sözleşmesi
ElkGraph nesne modeli ile `ElkGraphUtil` fabrikalarıdır; ELK JSON bir G/Ç bağdaştırıcısıdır (AD-14). Toplam yaklaşık
134.600 elle yazılmış satırlık on üç bundle kapsamdadır (envantere bakın). Bu görev yalnızca iskeleti teslim eder:
henüz hiçbir yerleşim algoritması taşınmadı.

## ELK Java ve oracle ile ilişki

![ELK Java, oracle derlemesi, golden referansları ve elk-engine arasındaki ilişki](/diagrams/overview-1.svg)

Yama serisi bu görevde boştur (AD-3). Golden'lar depoya eklenmiştir, bu yüzden CI'ın JVM'ye ihtiyacı yoktur
(AD-5). Karşılaştırma: yapı birebir, koordinatlar 1e-6 içinde (AD-4).

## Temel akışlar

elk-engine'in yeniden ürettiği ELK'daki yerleşim (ayrıntılar [component-map.md](#bileşen-haritası) içinde):

![Bir yerleşim çağrısının özyinelemeli yerleşim motorundan geçen akışı](/diagrams/overview-2.svg)

JSON bağdaştırıcısı (`graph.json`, `ElkGraphJson`): içeri alınan ELK JSON, yerleşimden önce içe aktarıcı aracılığıyla
bir ElkGraph olur; yerleşimden sonra hesaplanan koordinatlar ve kenar bölümleri çıkış JSON'una geri aktarılır. Oracle
harness'ı Java bağdaştırıcısını aynı iki adımda kullanır, böylece her iki taraf da JSON sözleşmesini paylaşır.

## Teknoloji yığını

| Konu              | Seçim                                                            |
| ----------------- | ---------------------------------------------------------------- |
| Dil               | TypeScript 7.0.2 (yerel `tsc`), ES2022, NodeNext, `strict`       |
| Testler           | vitest 5.0.x ve `@vitest/coverage-v8` (%90 eşikleri)             |
| Paketleme         | esbuild 0.28.x                                                   |
| Betik çalıştırıcı | tsx                                                              |
| Çalışma zamanı    | Node 22 veya daha yeni; `src/` kendisi tarayıcıda güvenlidir     |
| Yalnızca oracle   | ELK'nın Tycho derlemesi için Maven 3.9+ ve JDK 21 (yedek JDK 17) |

## Fitness kısıtları (AD-8)

Bundle içe aktarma yönü `test/architecture/bundle-deps.json` dosyasını izler; her kod dosyasında SPDX üstbilgisi;
`src/` içinde Node yerleşikleri veya `process.env` yok; izin listesi dışında modül düzeyinde değişebilir `let` yok.

# Bileşen haritası

| Diyagram                   | Gösterdiği                                         |
| -------------------------- | -------------------------------------------------- |
| 1. Bundle bağımlılıkları   | Kapsamdaki 13 bundle ve `Require-Bundle` kenarları |
| 2. Çekirdek çalışma zamanı | Bir yerleşim algoritmasının motora nasıl takıldığı |

İsimler `org.eclipse.elk.` önekini atlar. Kapsam: [envanter](/guide/inventory).

## 1. Kapsamdaki bundle bağımlılıkları

Doğruluk kaynağı: `test/architecture/bundle-deps.json`; her bundle'ın `META-INF/MANIFEST.MF` dosyasından
`tools/bundle-deps.ts` ile türetilir ve fitness testi tarafından zorunlu kılınır (AD-8).
Diyagramda **32 kenar** vardır; bu, JSON'daki 32 `requires` girdisine eşittir (graph.json x 2,
core x 1, alg.common x 2, dokuz algoritma x 3). Üçüncü taraf gereksinimleri (Guava, EMF, Gson, Xtend
kütüphaneleri) ve kapsam dışı bundle'lar dışarıda bırakılmıştır. Bir `A --> B` oku, A'nın B'yi gerektirdiği
anlamına gelir; dolayısıyla B'nin dizini A'nın dizininden içe aktarılabilir. `src/java` her yerden içe
aktarılabilir ve gösterilmemiştir.

![Kapsamdaki 13 ELK bundle'ı arasındaki bağımlılıklar](/diagrams/component-map-1.svg)

Hiçbir algoritma başka bir algoritmayı gerektirmez: algoritmalar arasındaki tek ortak bağımlılık
`alg.common`'dır. Algoritma dizinleri arasında yeni bir içe aktarma, Java manifestosunda aynı kenar yoksa
fitness testini başarısız kılar.

## 2. Çekirdek çalışma zamanı parçaları

Sınıf konumları, aksi belirtilmedikçe `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core`
altındadır; sabitlenmiş commit'te doğrulanmıştır.

| Sınıf                             | Yol                                 | Rol                                                                          |
| --------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                                       |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | Hiyerarşide gezinir, her düzeyde sağlayıcıyı çalıştırır                      |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | Her algoritmanın taban sınıfı; `IGraphLayoutEngine`'i uygular                |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | Algoritma, seçenek ve kategori verilerinin tekil kayıt defteri               |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`; algoritma bundle'ı başına bir tane üretilir (`.melk`'ten) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | Algoritma kimliği artı sağlayıcıların `getInstancePool()`'u                  |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | Türlenmiş seçenek anahtarları ve `getProperty`'nin arkasındaki map tutucusu  |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | Grafik modeli; öğeler `EMapPropertyHolder`'dır                               |

![ELK çekirdek çalışma zamanının sınıf ilişkileri](/diagrams/component-map-2.svg)

Bir algoritmanın nasıl takıldığı:

1. Algoritma bundle'ı bir `AbstractLayoutProvider` alt sınıfı (örneğin `alg.layered`'ın
   `LayeredLayoutProvider`'ı) ve kimliğini, seçeneklerini ve desteklenen özelliklerini bildiren bir `.melk`
   dosyası sağlar.
2. `.melk` derleyicisi bir `ILayoutMetaDataProvider` ve bir seçenek sınıfı üretir. Onun
   `apply(Registry)` metodu, örnek havuzu sağlayıcıyı oluşturan bir `LayoutAlgorithmData` kaydeder.
3. `LayoutMetaDataService` sağlayıcıları toplar. `LayoutAlgorithmResolver`, `algorithm` seçeneğinden her
   düğümdeki algoritma kimliğini ayarlar.
4. `RecursiveGraphLayoutEngine.executeAlgorithm`, düğümün `LayoutAlgorithmData.getInstancePool()`
   havuzundan bir sağlayıcı alır ve `layout(layoutNode, progressMonitor)` çağırır, ardından onu serbest bırakır
   (veya bir başarısızlıktan sonra `dispose()` çağırır).

elk-engine'de `.melk` adımının yerini bir üreteç alır (AD-12, gelecek görev) ve ElkGraph düz TS sınıflarına
dönüşür (AD-11). TS dosyalarına eşleme: [taşıma haritası](/guide/port-map); kurallar:
[çeviri kuralları](/guide/translation-rules).
