---
title: Uygunluk
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Uygunluk: “eşleşme” ne demektir

@knowvah/elk-engine, kaynaktan derlenmiş upstream Eclipse ELK (Java) karşısında doğrulanır. Bir
TypeScript yerleşimi, her ikisi de ELK JSON olarak ayrıştırıldıktan sonra yapı ve sayısal olmayan her değer
birebir eşitse ve her sonlu sayı `1e-6` mutlak toleransı içinde uyuşuyorsa oracle ile **uyumludur**.
Karşılaştırıcı [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts)
dosyasıdır; bu belge onun neyi uyguladığını anlatır. Taşıma kuralları
[`docs/translation-rules.md`](/guide/translation-rules) içinde yer alır.

| #   | Bölüm                                          | Yanıtladığı soru                              |
| --- | ---------------------------------------------- | --------------------------------------------- |
| 1   | [Oracle](#1-oracle)                            | “Doğru” nedir ve hangi commit'te?             |
| 1a  | [Uygunluk birimi](#1a-uygunluk-birimi)         | Bir senaryo nedir ve hangi senaryolar vardır? |
| 2   | [Uygunluk ölçütü](#2-uygunluk-ölçütü)          | Neyin eşit sayıldığı                          |
| 3   | [Golden'lar ve derlem](#3-goldenlar-ve-derlem) | Referans çıktılar nereden gelir?              |
| 4   | [Seam yamaları](#4-seam-yamaları)              | Oracle'ı nasıl değiştiririz?                  |
| 5   | [Oracle işletimi](#5-oracle-işletimi-runbook)  | Bozulduğunda ne yapmalıyım?                   |
| 6   | [Kapılar](#6-kapılar)                          | Bir değişiklik girmeden önce ne geçmelidir?   |

## 1. Oracle

Oracle (AD-3), `$ELK_SOURCE_DIR` deposunun ayrık (detached) bir git worktree'sinde **kaynaktan
derlenmiş** upstream ELK'dir; `tools/oracle/build.sh` bunu `$ELK_ORACLE_DIR` altında oluşturur.
İkisi de bu deponun dışındadır; hiçbiri depoya dahil edilmez.

| Öğe                      | Konum                                                                                  |
| ------------------------ | -------------------------------------------------------------------------------------- |
| Sabitlenmiş ELK commit'i | `tools/oracle/ELK_COMMIT` (şu an `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)           |
| Yama serisi              | `tools/oracle/patches/*.patch`, sözlük sırasıyla `git am --3way` ile uygulanır         |
| Derleme                  | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho p2 yapıtlarını indirir)           |
| Toplu çalıştırıcı        | `tools/oracle/run.sh <outDir> <input>...` veya `run.sh --cases <cases.jsonl> <outDir>` |
| Harness                  | `tools/oracle/harness/ElkOracle.java`                                                  |
| Derleme manifesti        | `$ELK_ORACLE_DIR/oracle-build.json` (commit, yamalar, JDK, bundle başına jar)          |

**Derleme.** `build.sh`, worktree içindeki `build/` dizininden önce `mvn -P elk-meta clean install -DskipTests`
(melk derleyicisi), ardından `mvn clean install -DskipTests -Dmaven.test.skip=true` çalıştırır; sonra
kapsamdaki her bundle'ın (`core`, `graph`, `graph.json`, `alg.common` ile `layered`, `mrtree`,
`radial`, `force`, `disco`, `rectpacking`, `spore`, `topdownpacking`, `vertiflex`
algoritmaları) jar'ını `oracle-build.json` içine kaydeder. Mevcut bir worktree yalnızca `ELK_COMMIT`'ten
türemişse, `tools/oracle/patches/` içindeki yama konularını tam olarak taşıyorsa ve derleme çıktısı dışında
temizse yeniden kullanılır; aksi halde `build.sh` `2` koduyla çıkar ve worktree'ye dokunmaz.

**Çalıştırma.** `run.sh`, `ElkOracle.java` dosyasını bundle jar'larına ve Tycho p2 önbelleğindeki
üçüncü taraf bundle'lara (Gson, Guava, EMF, Xtext/Xtend kütüphaneleri) karşı derler (`P2_BUNDLES`,
varsayılan `~/.m2/repository/p2/osgi/bundle`; her birinin en yeni sürümü kullanılır). Tek bir JVM,
her girdiyi `RecursiveGraphLayoutEngine` ile yerleştirir ve `<outDir>/<input basename>.json` dosyasını
yazar; yerleşim, sıfır boyutlar ve sıfır konumlar dahildir, bilinmeyen yerleşim seçenekleri atlanır.
Başarısız bir girdi `ERROR <input>: <message>` yazdırır; herhangi bir girdi başarısız olursa JVM
`1` koduyla çıkar. Çıktı adı basename olduğundan, girdi basename'leri tek bir çalıştırma içinde
benzersiz olmalıdır.

**Yama serisi semantiği.** Seride bugün tek bir yama vardır:

| Yama                                                                    | Etki                                                                                                                                                                                                                             | Eşlenen TS seam'i                                                                                                                                                 |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter`, id çakışmalarını `"_g" + Random.nextInt(1000000)` ile çözer; yama bu `Random`'ı `org.eclipse.elk.graph.json.exportSeed` sistem özelliğinden tohumlar (ayarsız = ELK davranışı). `run.sh` `EXPORT_SEED=1` geçirir | `graph.json` taşımasında enjekte edilebilir `Random`; bu taşıma gelene kadar bekliyor (TS `Random` shim'i diziyi zaten üretiyor: tohum 1, 548985 ve 764588 verir) |

Yamalar yalnızca JVM ve JS davranışını karşılaştırılabilir kılan dar kapsamlı seam'ler eklemek için
vardır; her biri bir TS tarafı seam'iyle eşlenir (bölüm 4).

**Neden elkjs değil?** elkjs, GWT ile derlenmiş ELK'dir. Yama serimizi taşıyamaz ve JRE'nin GWT
emülasyonu, taşıdığımız JVM'den farklıdır. Oracle olarak danışılmaz.

## 1a. Uygunluk birimi

Bir **senaryo** `(algorithm, model, variant)` üçlüsüdür (D1). Parite panosunda yerleşim algoritması
başına bir satır vardır; elk-models klasörü ve census özellikleri filtredir, satır değildir.

**Senaryo id'si.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, örneğin
`native/layered/default/tickets/layered/546_borderGaps`. `algorithmSuffix`, `org.eclipse.elk.`
öneki olmadan algoritma id'sidir. Üretilmiş modellerde `modelId`, `generated/<name>` olur.

**Model id'si ve kaynak (D3).** Model id'si, elk-models içindeki yoldur; uzantı yazılmaz.
Bir senaryo varsa `.json` dosyasını, yoksa `.elkt` dosyasını okur; `.elkg` (EMF XMI) hiçbir zaman okunmaz.

**Varyantlar (D6).** `test/corpus/variants.json` içindeki adlandırılmış seçenek katmanlarıdır, kökte uygulanır:
`default` (yok), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate` (`SEPARATE_CHILDREN`), `hierarchy-include` (`INCLUDE_CHILDREN`).

| Katman       | Algoritma                                             | Modeller                           | Varyantlar                |
| ------------ | ----------------------------------------------------- | ---------------------------------- | ------------------------- |
| native       | modelin kendi `rootAlgorithm` değeri                  | her census modeli                  | yedisinin tümü            |
| retarget     | modelin kendisininki dışında listelenen her algoritma | her census modeli                  | yalnızca `default` (OR-1) |
| generated    | dosya önekinin adlandırdığı algoritma                 | `test/corpus/generated/*.json`     | yedisinin tümü            |
| ported JUnit | algoritma misyonuna göre                              | upstream JUnit senaryoları (AD-13) | taşındığı gibi            |

`tools/oracle/run.sh --list-algorithms`, algoritma id'lerinin listesidir (bugün 14).

**Retarget (D2).** Harness, **çocuğu olan her düğümde** `org.eclipse.elk.algorithm` değerini ayarlar,
bildirilmiş her değerin yerine geçer; kökte ise `org.eclipse.elk.randomSeed = 1` ayarlar. ELK
algoritmayı düğüm başına çözer ve ayarsız bir düğüm layered'a düşer. Çocuğu olmayan bir kökte yalnızca
tohum ayarlanır. Retarget katmanı her modelin kendi `rootAlgorithm` değerini atlar (native katman
onu kapsar).

## 2. Uygunluk ölçütü

AD-4, tam olarak `compareLayout(expected, actual, { tol })` fonksiyonunun uyguladığı şekilde:

| Kural                   | Davranış                                                                                                                                                                         |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tolerans                | Mutlak, `DEFAULT_TOLERANCE = 1e-6`; sonlu sayılar `abs(e - a) <= tol` olduğunda geçer                                                                                            |
| Sonlu olmayan sayılar   | `NaN` ve `±Infinity` birebir eşit olmalıdır (`Object.is` veya `===`), `tol: Infinity` ile bile                                                                                   |
| String, boolean, `null` | Kesin eşitlik, aksi halde `value`                                                                                                                                                |
| Tür uyuşmazlığı         | Farklı JSON türleri (`null`, dizi, nesne, sayı, string, boolean) tek bir `type` farkı verir                                                                                      |
| Nesne anahtarları       | Anahtar kümesi özdeş olmalıdır: yalnızca expected'daki anahtar `missing`, yalnızca actual'daki `extra` olur                                                                      |
| Diziler                 | Her iki tarafta da her öğe string `id` taşıyan bir nesneyse ve id'ler taraf başına benzersizse **`id`'ye göre** eşlenir (boş dizi anahtarlı sayılır); aksi halde **konuma göre** |
| Anahtarlı diziler       | Yalnızca bir tarafta bulunan id, `path[id=<id>]` konumunda bir `structure` farkıdır; sıra yok sayılır                                                                            |
| Konumsal diziler        | Uzunluk farkı tek bir `structure` farkıdır ve öğeler daha fazla karşılaştırılmaz                                                                                                 |
| Fark türleri            | `structure`, `value`, `type`, `missing`, `extra`; `path` JSON-yolu benzeridir (`children[id=n1].x`)                                                                              |

Sonuçlar: öğe id'leri, öğe sayıları, kenar-kesit topolojisi ve büküm noktası sayıları
birebirdir, çünkü id'ler ve dizi uzunlukları birebirdir; koordinatlar ve boyutlar `1e-6` alır. `formatDiffs`
en fazla 20 fark yazdırır.

**Bilinen sapmalar ilkesi.** Bir sapma hiçbir zaman `tol` değerini yükselterek veya bir golden'ı
düzenleyerek yutulmaz (AD-13). Her biri burada nedeniyle ve etkilediği test ya da fikstürle
kaydedilir. Kabul edilen sınıflar:

- **ulp düzeyindeki `Math.*` farkları.** V8 ve JVM, `sin`, `cos`, `exp`, `log`, `pow` ve benzerlerinin
  son bitinde farklılaşabilir; Java'nın `StrictMath`'i bit düzeyinde birebir tanımlıdır, `Math` değildir.
  Halihazırda karşılaşılan durum: `nextGaussian`'ın `StrictMath.log` kullandığı belirtilmiştir, bu yüzden
  `src/java/util/Random.ts`, `Math.log` yerine `StrictMath.log` ile birebir bir uygulama taşır.
  Toleransı genişletmek yerine `StrictMath` algoritmasının bit düzeyinde birebir taşımasını tercih edin.
- **Kimlik-hash'li yineleme (AD-10).** Kimlik-hash'li nesnelerle anahtarlanmış bir `HashMap`/`HashSet`
  üzerinde yineleme, Java'nın kendisinde bile belirsizdir. Konumu günlüğe kaydedin ve ekleme sırasıyla
  taşıyın; golden'lar buna bağlı olmamalıdır. Değer-hash'li anahtarlar (String, Integer) Java sırasını
  yeniden üretmelidir.
- **Zamanla tohumlanan `Random`.** `randomSeed = 0` iken ELK saatten tohumlar
  (`core/Core.melk:608`), dolayısıyla çıktı yeniden üretilebilir değildir. Golden girdileri tohumu
  ayarsız veya sıfırdan farklı bırakmalıdır (layered varsayılan tohumu `1`'dir).

Somut girdiler (yalnızca kullanıcının onayıyla ekleyin):

| #   | Sapma                           | Neden                                                                   | Kapsam                                                                                                                                                         | Onay                      |
| --- | ------------------------------- | ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| 1   | Ayrıştırma hatası iletisi metni | ANTLR iletileri, hiç taşınmayan üretilmiş ayrıştırıcının yapıntılarıdır | Geçersiz gramer girdisi (`.elkt`, `.elkj`, `.elkr`): yalnızca bir ayrıştırma hatasının _varlığı_ eşleşmelidir, ileti değil. Geçerli girdi birebir eşleşmelidir | D8, kullanıcı, 2026-10-11 |

**Kararlar.** Her senaryo, oracle'ın iki ayrı JVM çalıştırmasından tek bir karar alır (D4, D5, OR-2):

| Karar              | Anlamı                                                                                                                                                                    |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | Her iki çalıştırma da modeli yerleştirdi ve çıktı dosyaları bayt bayt özdeş                                                                                               |
| `throws`           | Her iki çalıştırma aynı istisnayı fırlattı: sınıf birebir, ileti de `@[0-9a-f]+` ifadesi `@<hash>` olduktan sonra birebir (ileti null olabilir, ör. `StackOverflowError`) |
| `nondeterministic` | Çalıştırmalar birbirinden ayrılıyor (çıktı baytları, istisna veya biri `ok`, diğeri `throws`)                                                                             |
| `oracle-error`     | Harness hatası (okunamayan girdi, bilinmeyen varyant/algoritma/seçenek, kayıp sonuç satırı); asla kabul edilemez                                                          |
| `timeout`          | Bir çalıştırma `ELK_SWEEP_TIMEOUT_MS` süresini aştı                                                                                                                       |

Öncelik: `oracle-error`, sonra `timeout`, sonra eşitse `ok`/`throws`, değilse
`nondeterministic`. Bayt karşılaştırmasından önce, her iki çıktıdaki her `@[0-9a-f]+` belirteci,
istisna iletilerinde olduğu gibi `@<hash>` ile değiştirilir (D5a; `tools/corpus/sweep.ts` içindeki `sameOutput`).
Neden: disco'nun programatik `debug.discoGraph` seçeneği `...DCGraph@<identity hash>` dışa aktarır;
hiçbir tohum bunu sabitleyemez. TS karşılaştırıcısı aynı değişimi uygular. Belirsiz senaryolar ayrı
raporlanır ve yukarıdaki kimlik-hash ilkesi doğrultusunda geçme sayılarından hariç tutulur.

`nondeterministic` için kalan gerçek kaynaklar (ELK davranışı, harness hatası değil; sayılar parite
raporundadır): spore (`ElkGraphImporter.java:169`, `Math.random` ile titreşim ekler) ve `random`
(varsayılan `randomSeed` 0, iç içe bileşiklerde tohumsuzdur; retarget yalnızca kökü tohumlar, D2,
kullanıcı kararıyla korundu). Dışa aktarıcının `_g<random>` id yeniden adlandırmaları kaynak değildir:
seam yaması bunları düzeltir.

## 3. Golden'lar ve derlem

AD-5. Referans çıktılar commit'lenir, böylece CI'nin JVM'e ihtiyacı olmaz.

| Öğe                | Konum                                                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------- |
| Sabitlenmiş derlem | `eclipse-elk/elk-models`, `test/corpus/manifest.json` içindeki `commit` noktasında (depoya dahil değil) |
| Modeller dizini    | `$ELK_MODELS_DIR`, varsayılan: bu depoya göre `../../eclipse-elk/elk-models`                            |
| Seçilmiş küme      | `test/corpus/manifest.json` içindeki `golden[]`: `{ id, path, note }`                                   |
| Refs               | `test/golden/refs/elk/<id>.json`, manifest `id`'si başına bir tane                                      |
| Köken              | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy`         |

**Id'den yola eşleme.** `golden[].path`, `$ELK_MODELS_DIR`'e göre göreli bir yoldur ve
girdi `$ELK_MODELS_DIR/<path>` dosyasıdır. `regen-goldens.sh` harness'i bu girdiler üzerinde çalıştırır
ve her `<basename>.json` çıktısını `refs/elk/<id>.json` olarak hazırlar.
Örnek: `ptolemy-scrambler` id'si
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json` yoluna karşılık gelir.

**Yeniden üretim** (`tools/oracle/regen-goldens.sh`):

1. Models klonunun tam olarak manifest commit'inde olmasını gerektirir (aksi halde çıkış `1`).
2. Derlenmiş bir oracle gerektirir (`run.sh`, `oracle-build.json` ister).
3. Tüm ref'leri ve `_meta.json` dosyasını `test/golden/refs/.elk-staging.*` içinde hazırlar, ardından
   dizini iki yeniden adlandırmayla değiştirir; böylece başarısız bir çalıştırma eski ref'leri bırakır.
4. `_meta.json` zaman damgası içermez (`builtAt`, `oracle-build.json` içinde kalır); bu yüzden hiçbir
   girdisi değişmemiş bir yeniden üretim git'te bayt bayt etkisizdir.

**Ne zaman yeniden üretilir:** `ELK_COMMIT`, yama serisi, manifestteki `golden[]` kümesi veya
`commit` ya da harness değiştikten sonra. Başka hiçbir zaman.

**Günlükleme kuralı.** Bir ref'i değiştiren her yeniden üretim, nedeniyle birlikte günlüğe kaydedilir
(yama id'si veya commit yükseltmesi). Ref'ler asla elle düzenlenmez. Bir TS assertion'ı ya da bir golden
yalnızca değiştirilerek geçebiliyorsa durun ve günlüğe kaydedin (AD-13).

**Census.** `npx tsx tools/corpus/census.ts` hiçbir şey yerleştirmez: oracle'ı ayrıştırma kipinde tüm
modeller üzerinde çalıştırır ve sonucu commit'lenmiş `test/corpus/census.json` ile karşılaştırır (898
model: id, biçimler, kaynak, kök algoritma, özellik sayıları). Eşitse çıkış `0`, kayma varsa `1`;
`--write` dosyayı yeniden yazar. Yalnızca sabitlenmiş models klonunda çalışır ve harness hatasında
iptal eder.

**Üretilmiş derlem (D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr` tohumlu bir
grandom yapılandırması tutar; yanındaki `.json` ise oracle'ın ürettiği, yerleştirilmemiş girdidir. Dokuz yapılandırma,
hiçbir elk-models modelinin kullanmadığı algoritma id'lerini kapsar: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. Her birinde en fazla 50 düğüm vardır ve
kenar etiketi yoktur (`BlindTextGenerator` tohumsuzdur). Harness, üretilen kökü `root` olarak adlandırır,
çünkü ELK'in `JsonExporter`'ı bir id çakışmasını tohumsuz rastgele bir sonekle çözer. Yalnızca
`tools/oracle/regen-generated.sh` ile yeniden üretin (hazırlama dizini ve yeniden adlandırma; başarısız bir yapılandırma
eski dosyaları bırakır); hiçbir şey değişmemişse yeniden çalıştırma git'te etkisizdir. TS grandom taşıması bu `.json`
dosyalarını bayt bayt yeniden üretmelidir; algoritma golden'ları buna asla bağlı değildir.

**Sweep.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]` her senaryoyu planlar, her birini ayrı JVM'lerde iki kez çalıştırır (shard sayısı
varsayılan olarak `min(cpus, 8)` eşzamanlı `run.sh` işlemidir) ve
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}` dosyalarını yazar.
`--plan-only` katman başına senaryo sayılarını yazdırır ve hiçbir şey çalıştırmaz; `--filter` alt dizeyi içeren
senaryo id'lerini tutar; `--limit` eşit adımlı bir örnek alır. Bir senaryo `oracle-error` değilse çıkış `0`
(`oracle-error` ise `1`); araç hatası `2` ile çıkar. Senaryo başına çıktılar yerel kalır (AD-5). `ELK_SWEEP_TIMEOUT_MS`
(varsayılan `30000`, yalnızca `tools/` tarafından okunur) her senaryoyu sınırlar; `run.sh`, zaman aşımından
(JVM çıkış kodu 75) sonra sonuç satırı olmayan senaryolar için bir JVM'i yeniden başlatır.

**Parite raporu (D9).** `docs/parity-report.md`, sweep önbelleğinden üretilir ve commit'lenir:
algoritma ve karar başına sayılar, ELK ve models commit'leriyle, zaman damgası olmadan. Şununla yeniden üretin:
`npx tsx tools/corpus/parity-report.ts --write`; `--write` olmadan komut, commit'lenmiş rapor eskiyse
`1` ile çıkar. Asla elle düzenlemeyin.

**Derlem testleri.** `test/corpus/corpus.ts` içindeki `resolveModelsDir()`, klon eksikse veya başka bir
commit'teyse bir `skip` nedeni döndürür; ona ihtiyaç duyan testler iletide sabitlenmiş sha ile atlanır.
Bugün `test/golden/oracle-refs.test.ts` yalnızca commit'lenmiş ref'leri denetler: manifest id'si başına bir tane,
her düğüm, port, etiket ve kenarda geometri, kendiyle karşılaştırma ve `_meta.json` dosyasının
`ELK_COMMIT`, manifest ve üreteçle uyuştuğu. Henüz TS-oracle yerleşim testi yoktur; ilk taşınan
algoritmayla birlikte gelecektir.

## 4. Seam yamaları

Seam yamaları oracle'ı değiştirir; nadirdir ve her zaman bir TS seam'i ile eşlenir.

1. Oracle worktree'sinde (`$ELK_ORACLE_DIR`) düzenleyip commit'leyin ya da yamayı `ELK_COMMIT` noktasındaki
   bir geçici klonda yazın. Tamamlanmış bir yamayı mevcut worktree'ye yerinde eklemek için (worktree'nin
   kaldırılması silineceğinden `census/` ve `sweep/` önbelleklerini korur) onu `build.sh`'ın kimliğiyle uygulayın:
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   ardından `build.sh` seriyi doğrular ve yerinde yeniden derler (yaklaşık 3 dakika); böylece 4-5.
   adımlar atlanabilir.
2. Dışa aktarın:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (veya yalnızca yeni commit'ler). Dosyalar `NNNN-<slug>.patch` olarak adlandırılır; sayısal
   önek uygulama sırasını belirler.
3. Eşleşen TS seam'ini ekleyin (aynı davranış, enjekte edilebilir, `src/` içinde); beklenen değerleri
   yamalı oracle'dan gelen testlerle birlikte (AD-13).
4. Aksi halde worktree'yi kaldırın: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (derleme çıktısı onu kirletiyorsa `--force` ekleyin).
5. Yeniden derleyin: `tools/oracle/build.sh` (seriyi baştan yeniden uygular).
6. Yeniden üretin: `tools/oracle/regen-goldens.sh`; `git diff test/golden/refs` çıktısını gözden geçirin.
7. Yamayı (`NNNN-<slug>.patch`) adlandıran ve değişen her ref'i listeleyen bir günlük girdisi yazın.
   `_meta.json` içindeki `patches` seriyi otomatik olarak kaydeder.

Worktree'de asla commit'lenmemiş bir düzenleme bırakmayın: `build.sh` bunu eskimiş sayar
(çıkış `2`). `ELK_SOURCE_DIR` dizininin kendisini asla düzenlemeyin.

## 5. Oracle işletimi (runbook)

| Hata                                                                                           | Tespit                                                                                                                                                                                                                                                                                       | Önlem                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho derlemesi başarısız (p2'ye erişilemiyor, JDK, Maven sürümü)                              | `tools/oracle/build.sh` sıfır olmayan kodla çıkar; Maven'ın tam çıktısı depo kökündeki `.oracle-build.log` dosyasındadır. Çıkış `1` eksik araç ya da yanlış Maven demektir; çıkış `3` bir bundle jar'ının üretilmediği anlamına gelir                                                        | Maven **3.9.x** olmalıdır: Tycho 4.0.12, Maven 3.10 (Homebrew'in 3.10.0'ı) üzerinde `ProvisionException: No implementation for MavenTargetLocationFactory was bound` ile başarısız olur. Yerel bir 3.9.11 `.tools/apache-maven-3.9.11/` içinde durur (gitignored): `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. JDK 21 kullanın veya `JAVA_HOME` ile JDK 17. Ağı denetleyin (ilk çalıştırma p2 yapıtlarını indirir), sonra yeniden çalıştırın. `build.sh --record-only` Maven'ı atlar ve `oracle-build.json` dosyasını yalnızca önceden derlenmiş jar'lardan yeniden yazar. Çıkış `2`: worktree'yi kaldırın (bölüm 4, adım 4) ve yeniden derleyin. Aksi halde günlüğün sonuyla birlikte yükseltin |
| `build.sh`, bir yama uygulandıktan hemen sonra `2` ile çıkar                                   | Worktree eskimiş olarak bildirildi                                                                                                                                                                                                                                                           | `build.sh`, sarılmış yama konularını açar (`git format-patch` bunları yaklaşık 78 karakterde sarar) ve izlenmeyen `census/` ile `sweep/` önbelleklerini yok sayar; başka kirlilik ya da listelenmemiş bir yama yine çıkış `2` verir: worktree'yi onarın (bölüm 4)                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Bir yama veya commit yükseltmesinden sonra golden kayması                                      | `tools/oracle/regen-goldens.sh` ve ardından `git diff --exit-code test/golden/refs` boş değildir; `test/golden/oracle-refs.test.ts` eskimiş bir `_meta.json` yüzünden başarısız olur (`elkCommit`, `modelsCommit`); bir TS uygunluk testi, varsa, bir `formatDiffs` raporuyla başarısız olur | Yeniden derleyin (`build.sh`), `regen-goldens.sh` çalıştırın, farkı gözden geçirin, yama id'sini günlüğe kaydedin. Bir ref'i asla elle düzenlemeyin ve `tol` değerini gevşetmeyin                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Xtext/ANTLR jar'ı p2 önbelleğinde yok (`.elkt`, `.elkr` veya herhangi bir `run.sh` başlangıcı) | `run.sh` sıfır olmayan kodla ve `bundle <name> not in p2 cache <dir>` iletisiyle çıkar (ör. `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                                             | `P2_BUNDLES` değerini onu barındıran Tycho p2 önbelleğine ayarlayın ya da Tycho'nun alması için `build.sh`'ı ağ erişimiyle çalıştırın; `run.sh`'ı yeniden çalıştırın. Başka bir yerden jar koymayın                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Sweep takılır veya OOM olur                                                                    | Bir senaryo zaman aşımına kadar çalışır ve `timeout` bildirir (bir stderr satırı onu adlandırır); sonuç satırı olmayan bir çalıştırma `oracle-error` ve stderr'de `sweep: shard <n> run <A or B> exited <code>` verir; makine 8 eşzamanlı JVM altında swap yapar                             | Eşzamanlılığı ve toplu boyutu düşürün: `sweep.sh --shards 2`, `--filter` veya `--limit` ile daraltın. `ELK_SWEEP_TIMEOUT_MS` değerini yalnızca yavaş ama doğru bir model için yükseltin. Yeniden üretilebilir bir `timeout` bir bulgudur: senaryo id'sini günlüğe kaydedin, onu gizlemek için sınırı genişletmeyin                                                                                                                                                                                                                                                                                                                                                                                                            |
| Bir sabit yükseltmesinden sonra census kayması (`ELK_COMMIT` veya models `commit`)             | `npx tsx tools/corpus/census.ts` `1` ile çıkar ve farklı modelleri listeler; `test/corpus/census.test.ts` başarısız olur                                                                                                                                                                     | Klonun ve oracle'ın yeni sabitlerde olduğunu doğrulayın, `census.ts --write` komutunu yeniden çalıştırın, `git diff test/corpus/census.json` çıktısını gözden geçirin, nedeni günlüğe kaydedin, sonra `sweep.sh`'ı yeniden çalıştırın ve parite raporunu yeniden üretin. Census'u asla elle düzenlemeyin                                                                                                                                                                                                                                                                                                                                                                                                                      |
| elk-models eksik veya yanlış sha                                                               | Derlem testleri beklenen sha'yı adlandıran bir iletiyle atlanır; `regen-goldens.sh` `1` ile çıkar (`elk-models at <sha>, expected pinned <sha>`)                                                                                                                                             | `test/corpus/fetch.sh` çalıştırın (sabitlenmiş commit'i klonlar ve checkout eder). Mevcut bir klon başka bir commit'teyse `2` ile çıkar ve ona dokunmaz: o klonu kendiniz düzeltin veya `ELK_MODELS_DIR`'i yeni bir yola yönlendirin. Mevcut bir klonun HEAD'ini asla bir betikten taşımayın                                                                                                                                                                                                                                                                                                                                                                                                                                  |

Diğer `run.sh` hataları: `oracle-build.json missing` veya `oracle jar missing`
önce `build.sh` çalıştırmanız gerektiği anlamına gelir; `bundle <name> not in p2 cache`
`P2_BUNDLES` değerini Tycho p2 önbelleğine ayarlamanız ya da `build.sh`'ı ağ erişimiyle yeniden çalıştırmanız gerektiği anlamına gelir.

## 6. Kapılar

Her değişiklik için:

| Kapı               | Komut                                                         | Ölçüt                                                                                    |
| ------------------ | ------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Türler             | `npm run typecheck`                                           | çıkış 0                                                                                  |
| Testler ve kapsama | `npm run coverage`                                            | tüm testler geçer; `src/**` üzerinde %90 statements, branches, functions ve lines        |
| Mimari             | `test/architecture/*.fitness.test.ts` (`npm test` çalıştırır) | modül sınırları, modül global'leri, `src/` içinde Node yerleşikleri yok, SPDX başlıkları |
| Oracle ref'leri    | `test/golden/oracle-refs.test.ts`                             | commit'lenmiş ref'ler manifest ve `ELK_COMMIT` ile tutarlı                               |

`tools/oracle/`, manifest veya yama serisindeki değişiklikler ayrıca şunları gerektirir:

| Kapı                | Komut                                                                             | Ölçüt                                                                                   |
| ------------------- | --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Oracle derlemesi    | `tools/oracle/build.sh`                                                           | çıkış 0                                                                                 |
| Oracle çalıştırması | `tools/oracle/run.sh <outDir> <input.json>...`                                    | çıkış 0, `ERROR` satırı yok                                                             |
| Golden kararlılığı  | `tools/oracle/regen-goldens.sh`, ardından `git diff --exit-code test/golden/refs` | fark yok; değişiklik ref'leri kaydırmak için tasarlanmış ve günlüğe kaydedilmişse hariç |
| Shell               | `shellcheck tools/oracle/*.sh`                                                    | temiz                                                                                   |

`tools/oracle/` veya `tools/corpus/` değişiklikleri ayrıca şunları gerektirir:

| Kapı                 | Komut                                                                                    | Ölçüt                                                              |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Census               | `npx tsx tools/corpus/census.ts`                                                         | çıkış 0 (kayma yok)                                                |
| Üretilmiş kararlılık | `tools/oracle/regen-generated.sh`, ardından `git diff --exit-code test/corpus/generated` | fark yok                                                           |
| Sweep                | `tools/oracle/sweep.sh` (veya örnek için `--filter`/`--limit`)                           | çıkış 0: `oracle-error` yok                                        |
| Parite raporu        | `npx tsx tools/corpus/parity-report.ts`                                                  | çıkış 0 (commit'lenmiş rapor güncel); `--write` ile yeniden üretin |
