---
title: Mimari
sourceHash: bd9497d352debbb8c889e45fc334c90f3e318451e38381e96d0a09fdce150fe5
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine mimarisine genel bakış

| Belge                                                                                                                  | İçerik                                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | Her ELK bundle'ı: amaç, LOC, üretilmiş kaynaklar, kapsam                                                                                                                   |
| [port-map.md](/guide/port-map)                                                                                         | Java paketlerinin `src/` modüllerine eşlenmesi                                                                                                                             |
| [component-map.md](#bileşen-haritası)                                                                                  | Kapsamdaki bundle bağımlılıkları; çekirdek çalışma zamanı parçaları                                                                                                        |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Java'dan TypeScript'e kurallar                                                                                                                                             |
| [../conformance.md](/conformance)                                                                                      | Oracle karşılaştırma ölçütü ve yöntemi (bu görevin ilerleyen aşamasında gelir)                                                                                             |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | ELK Text (`.elkt`) taşıması, Xtext alt kümesi, çalıştırma kılavuzu ve ertelenenler                                                                                         |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | ELK Textual JSON (`.elkj`) taşıması, tembel bağlama, çalıştırma kılavuzu ve ertelenenler                                                                                   |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | grandom (`.elkr`) rastgele grafik üreteci taşıması, kanıtlar ve çalıştırma kılavuzu                                                                                        |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | Yerleşim motoru ile fixed, box ve random sağlayıcıları (görev 5a)                                                                                                          |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk` üreteci, bekleyen türler, tembel sabitler, yeniden üretim                                                                                                          |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | Her işlevi ölçen karmaşıklık kapısı (`npm run complexity`)                                                                                                                 |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | Layered çatısı (görev 7a): LGraph modeli, dönüşüm, aşamalı sınıflar, çalıştırma kılavuzu                                                                                   |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | Layered düğüm yerleştirme (görev 7d): p4nodes, Brandes-Köpf, beş işlemci, geometri satırları, çalıştırma kılavuzu                                                          |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | Layered kenar yönlendirme (görev 7e): p5edges ortogonal, çoklu çizgi, spline'lar, altı işlemci, yönlendirme satırları, çalıştırma kılavuzu                                 |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | Layered hattı (görev 7f): `ElkLayered`, `GraphConfigurator`, bileşenler, dört işlemci, tam yerleşim satırları, runner alt kümesi, çalıştırma kılavuzu                      |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | Layered etiketleri (görev 7f2): etiket ve yorum işlemcileri, katman açma, hata ayıklama çıktısı, ziyaretçi, etiket satırları, tarama, çalıştırma kılavuzu                  |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | Layered kendi kendine döngüler, sarma, sıkıştırma (görev 7g): loops paketi, kırılma noktaları, 1B sıkıştırma, `ComponentsCompactor`, satırlar, tarama, çalıştırma kılavuzu |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | Layered bileşik grafikler (görev 7h): `compound` paketi, hiyerarşik sürücü, tüm ağaç durakları, golden'lar, tarama, hash sırası ikizleri, çalıştırma kılavuzu              |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | TS'nin oracle'a karşı taraması (satır 9): parçalı çalıştırıcı, özet sözleşmesi, ek açıklamalar, rapor, çalıştırma kılavuzu                                                 |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | Takılabilir etiket metni ölçümü (satır 10): yama 0003, TS ikizi, sabit mod, kanıtlar, çalıştırma kılavuzu                                                                  |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | ELK sabitlemesini taşıma (satır 13): net fark ayıklaması, yama serisi, yeniden derleme, yeniden kayıt, taramalar, referans farkı ayıklaması, prova modu                    |

## elk-engine nedir

`@knowvah/elk-engine`, Eclipse Layout Kernel'in (ELK) aslına sadık bir TypeScript taşımasıdır. Sabitlenmiş
`8bca22f4afa3371562d2f702d59929818f7f7b71` commit'indeki Java belirtimdir (AD-1, AD-2). Bir kütüphanedir:
tarayıcıda güvenle çalışır, sıfır çalışma zamanı bağımlılığı vardır, Java veya WASM içermez. Herkese açık sözleşmesi
ElkGraph nesne modeli ile `ElkGraphUtil` fabrikalarıdır; ELK JSON bir G/Ç bağdaştırıcısıdır (AD-14). Toplam yaklaşık
134.600 elle yazılmış satırlık on üç bundle kapsamdadır (envantere bakın). Mevcut durum:
yerleşim motoru (`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`) ve üç çekirdek sağlayıcı
`fixed`, `box` ve `random` taşınmıştır ve seçilmiş golden'larda oracle ile aynı sonucu verir (görev 5a,
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). `core`'un geri
kalanı da taşınmıştır (görev 5b: işlemci hattı, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, spline'lar, yorum
eklemesi; bkz. [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b)).
Paylaşılan `alg.common` bundle'ı tamamen taşınmıştır (görev 6a: geometri, network simplex, 1B sıkıştırma, örtüşmeler,
spore, polyomino; görev 6b: `nodespacing` ve `NodeMicroLayout`, 326 satırlık bir oracle yeniden oynatmasıyla
kanıtlandı; bkz. [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)).
Layered çatısı taşınmıştır (görev 7a: seçenekler paketi, LGraph modeli, ElkGraph ↔ LGraph dönüşümü ve sağlayıcı
kabuğu; 272 ve 330 satırlık iki oracle vektör dosyasıyla kanıtlandı; yerleşim aşamaları 7b–7h'de gelir; bkz.
[alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)). İlk iki aşaması
taşınmıştır (görev 7b: on bir döngü kırıcı, dokuz katmanlayıcı ve çevrelerindeki on işlemci; 651 oracle aşama satırı
ve 32.652 vakalık bir tarama ile kanıtlandı;
[alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)).
Üçüncü aşaması taşınmıştır (görev 7c: sayaçlarıyla çaprazlama en aza indirme, greedy switch, model sırası
karşılaştırıcıları ve P2 ile P3 arasındaki sekiz işlemci; 808 oracle sıra satırı ve 6.728 vakalık bir tarama ile
kanıtlandı; [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)).
Dördüncü aşaması taşınmıştır (görev 7d: Brandes-Köpf'lü dört düğüm yerleştirici ve bir P4 durağının ihtiyaç duyduğu
beş işlemci; geometrili 610 oracle yerleştirme satırı ve 8.410 vakalık bir tarama ile kanıtlandı;
[alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)).
Beşinci aşaması taşınmıştır (görev 7e: ortogonal, çoklu çizgi ve spline yönlendiriciler ile yönlendirilmiş bir
sonucun ihtiyaç duyduğu altı işlemci; kenar geometrili 950 oracle yönlendirme satırı ve 6.728 vakalık bir tarama ile
kanıtlandı; [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)).
Layered hattı çalışır (görev 7f: sürücü, bağlı bileşenler paketi, yön dönüştürücüsü, hiyerarşik port yönlendiricisi
ve üç işlemci; tam yerleşimler ve duraklardan oluşan 1.311 oracle satırı, önceki satırların gerçek sürücüden geçen
2.351 satırlık yeniden oynatması, 28 taşınmış JUnit takımı ve 6.646 vakalık bir tarama ile kanıtlandı;
[alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)).
Etiketli ve yorumlu yerleşimler, katman açma ve bir günlükleme izleyicisi de çalışır (görev 7f2: etiket ailesi, yorum
işlemcileri, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor` ve hata ayıklama yardımcıları; duraklar ve
tam yerleşimlerden oluşan 1.305 oracle satırı, 11 temel JUnit takımı ve 935 ok vakasının tam eşleştiği 1.105 vakalık
bir tarama ile kanıtlandı;
[alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)).
Kendi kendine döngüler, grafik sarma ve sıkıştırma da çalışır (görev 7g: loops paketi, dört kendi kendine döngü
işlemcisi, kırılma noktası ve tek kenar sarmalayıcıları, `HorizontalGraphCompactor`, layered `compaction` paketi ve
`ComponentsCompactor`; 1.642 oracle satırı (`full` 731, `models` 307, `scenarios` 525, `sites` 79), 10 temel JUnit
takımı, 2.997 ok vakasının tam eşleştiği ve 76 throw'un iki tarafta da eşleştiği 3.073 vakalık bir tarama ve 58 kolu
taşınmış bırakan dokuz kollu bağlantı ile kanıtlandı;
[alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)).
Bileşik grafikler de çalışır (görev 7h: `compound` paketi, `HierarchicalNodeResizingProcessor` ve son kol; 540 oracle
satırı (`full` 355, tüm ağaç duraklı `models` 73, `scenarios` 88, `sites` 24), 24 layered golden'ı, dokuz issue
takımı ve üç graph.json metodu, 1.164 ok vakasının tam eşleştiği ve 5 throw'un iki tarafta da eşleştiği 1.169 vakalık
bir tarama ile kanıtlandı;
[alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)).
Layered algoritması artık her hiyerarşi işleme kipini çalıştırır: 59 enum kolu taşınmıştır, hiçbiri beklemede değildir
ve aşamalı liste boştur. #58 numaralı issue'nun üç `elk.stress` vakası görev 8b'yi bekledi ve kararı uygulandığından beri çalışır (görev layered-stress-cases). Henüz başka hiçbir
yerleşim algoritması çalışmaz (mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). Görev
8a'dan beri mrtree, radial ve vertiflex de çalışır (tam yerleşimler ve duraklardan oluşan dört referans dosyasında
1.181 oracle satırı, 2.656 satırlık bir birim vektör referansı, 40 `trees` golden'ı, 6/6 ve 2/2 ile `MrTreeGraphSizeTest`
ve `CenterOnRootTest` ve algoritma başına 906 vakalık, her vakanın ya eşleştiği ya da teşhis edildiği bir tarama ile
kanıtlandı; sonucu ağaca dönüştürülmüş bir hash kutusunun sırasına bağlı olan iki radial satır eşleştirilmedi,
sınıflandırıldı; [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)).
Görev 8b'den beri force, stress ve disco da çalışır (tam yerleşimler ve duraklardan oluşan üç referans dosyasında
21.420 oracle satırı, 45 `force-disco` golden'ı, 3/3 ile `ForceImportTest` ve `TwoBitGridTest` ve algoritma başına her
vakanın ya eşleştiği ya da teşhis edildiği bir tarama ile kanıtlandı; Eades `Math.log` bit düzeyinde birebir bir
fdlibm taşımasıdır;
[alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). Görev
8c'den beri rectpacking, spore (`sporeOverlap`, `sporeCompaction`) ve topdownpacking da çalışır (üç referans dosyasında
2.593 oracle satırı, 44 `packing` golden'ı, 30 çalıştırmayla sekiz taşınmış JUnit takımı ve algoritma başına her
deterministik vakanın ya eşleştiği ya da teşhis edildiği bir tarama ile kanıtlandı;
[alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). Kapsamdaki her
algoritma oracle'a karşı taranır ve algoritma başına sonuç parite raporunda yayımlanır
([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## ELK Java ve oracle ile ilişki

![ELK Java, oracle derlemesi, golden referansları ve elk-engine arasındaki ilişki](/diagrams/overview-1.svg)

Yama serisi bu görevde boştur (AD-3). Golden'lar depoya eklenmiştir, bu yüzden CI'ın JVM'ye ihtiyacı yoktur
(AD-5). Karşılaştırma: yapı birebir, koordinatlar 1e-6 içinde (AD-4).

## Temel akışlar

elk-engine'in bugün `fixed`, `box` ve `random` için yeniden ürettiği ELK'daki yerleşim (ayrıntılar
[component-map.md](#bileşen-haritası) ve
[core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow) içinde):

![Bir yerleşim çağrısının özyinelemeli yerleşim motorundan geçen akışı](/diagrams/overview-2.svg)

JSON bağdaştırıcısı (`graph.json`, `ElkGraphJson`): içeri alınan ELK JSON, yerleşimden önce içe aktarıcı aracılığıyla
bir ElkGraph olur; yerleşimden sonra hesaplanan koordinatlar ve kenar bölümleri çıkış JSON'una geri aktarılır. Oracle
harness'ı Java bağdaştırıcısını aynı iki adımda kullanır, böylece her iki taraf da JSON sözleşmesini paylaşır.

Metin bağdaştırıcısı (`graph.text`, `ElkGraphText`): `.elkt` metni, küçük bir Xtext alt kümesi (`src/xtext`) üzerine
kurulu elle yazılmış bir ayrıştırıcı, bağlayıcı ve doğrulayıcı aracılığıyla bir ElkGraph'a yüklenir ve bir ElkGraph
yeniden `.elkt` olarak serileştirilir. Giriş noktası dahilidir; bkz.
[elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md).

Textual JSON bağdaştırıcısı (`graph.json.text`, `ElkGraphJsonText`): `.elkj` metni aynı Xtext alt kümesi üzerinden
elle yazılmış bir ayrıştırıcıyla yüklenir ve Xtext'in `LazyLinker`'ı gibi tembel bağlanır: kenar uç noktaları
okunduğunda çözülen EMF vekilleridir (`src/emf`). Bir ElkGraph, gramere özgü bir yazıcı aracılığıyla yeniden `.elkj`
olarak serileştirilir. Giriş noktası dahilidir; bkz.
[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md).

Rastgele grafik üreteci (`core.debug.grandom`, `GRandomText`): `.elkr` metni, aynı Xtext alt kümesi (`src/xtext`)
üzerinde elle yazılmış bir sözcük çözümleyici ve ayrıştırıcıyla ayrıştırılır ve `RandomGraphGenerator` bir
yapılandırmayı tam JVM `Random` dizisiyle ElkGraph'lara dönüştürür. Tohumlu çıktı oracle'a karşı bayt düzeyinde
birebirdir ve dokuz `test/corpus/generated/*.json` dosyasını yeniden üretir; tohumsuz yollar (kenar etiketi metni,
hiyerarşiler arası karıştırma, eksik tohum) yalnızca değişmezlerle denetlenir. Giriş noktası dahilidir; bkz.
[grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md).

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

## Belge ve sürüm araç zinciri

Yol haritasının 12. satırı tarafından eklendi; DP1 ile DP9 arası kararlar
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md)
içinde. `1.0.0`, 2026-11-23 tarihinde yayımlandı.

| Parça               | Nedir                                                                                                                                                                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dışa aktarım yüzeyi | Kabul edildi (2026-11-23), [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md) içinde listelenir ve `src/index.test.ts` ile `src/index.ts`'e eşit tutulur; ilk npm yayımı olan `1.0.0`'da dondurulmuştur (AD-14) |
| API başvurusu       | `npm run docs:api`: kendi TypeScript 6'sına sahip özel `tools/typedoc/` paketinde typedoc (typedoc'un TypeScript 7 sürümü yok, AD-6), üretilen `/reference/` içine                                                                                            |
| Örnekler            | `test/docs/examples/*.ts`, sitenin başlangıç sayfasında parçacıklar olarak gösterilir ve oracle referanslarıyla karşılaştırılır (`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)                                                         |
| Bağlantı denetimi   | `npm run docs:linkcheck`: derlenmiş site üzerinde linkinator, iç bağlantılar ve parçalar, CI'da; dış bağlantılar haftalık (`links.yml`)                                                                                                                       |
| Paket provası       | `npm run pack:smoke`: paketle, dosya listesini denetle, temiz bir projeye çevrimdışı kur, içe aktar, orada bir örneği yerleştir ve oracle referansıyla karşılaştır                                                                                            |
| Sürüm               | semantic-release yapılandırması ve `release.yml`, `main`'e her push'ta çalışır; çalıştırma kılavuzu [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md) içinde                                                                   |

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

Görev 5a ile taşındı ([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)):
`RecursiveGraphLayoutEngine` (`RecursiveGraphLayoutEngineTopdown` ile bölünmüş, M17), `LayoutAlgorithmResolver` ve
`AbstractLayoutProvider` alt sınıfları `FixedLayoutProvider`, `BoxLayoutProvider` ve `RandomLayoutProvider`.
`LayoutMetaDataService`, `LayoutAlgorithmData` ve özellik türleri daha önce geldi (görev 2 ve 3). Görev 5b
([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b))
bundle'ı tamamladı: `AlgorithmAssembler` ve `LayoutProcessorConfiguration` (her algoritma bundle'ının kullandığı hat),
`LayoutConfigurator`, `ElkSpacings`, `ElkMath` bölümleri, `ElkGraphAdapters`, `util/selection/*` ve `comments/*`. JDK
shim'leri `src/java/awt/geom` (`Rectangle2D`) ve `src/java/util/regex` (`Pattern`, `WordBoundary`) olup
`src/java/lang` içindeki `JavaCharacter`'ın yanındadır; `awt.json`, `regex.json`, `character.json` ve
`regex-boundary.json` ile kanıtlanmıştır. 6a ve 6b görevleri
([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md)) `alg.common`'ın
tamamını taşıdı; 6b `nodespacing` ve `NodeMicroLayout`'u ekledi, 326 satırlık bir `NodeMicroLayout` oracle yeniden
oynatmasıyla kanıtlandı.

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

elk-engine'de `.melk` adımının yerini bir üreteç alır (AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)) ve ElkGraph düz TS sınıflarına
dönüşür (AD-11). TS dosyalarına eşleme: [taşıma haritası](/guide/port-map); kurallar:
[çeviri kuralları](/guide/translation-rules).
