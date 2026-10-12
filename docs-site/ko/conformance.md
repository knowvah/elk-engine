---
title: 적합성
sourceHash: 1c16c2c481111ebe772362128cf8f3e800f6e482a5ba14cadcb0f135f1872461
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 적합성: "일치"가 의미하는 것

@knowvah/elk-engine은 소스에서 빌드한 업스트림 Eclipse ELK(Java)를 기준으로 검증합니다. 두 결과를
ELK JSON으로 파싱한 뒤 구조와 모든 숫자가 아닌 값이 정확히 같고, 모든 유한한 숫자가 절대 허용 오차
`1e-6` 이내에서 일치하면 TypeScript 레이아웃은 오라클과 **적합**합니다.
비교기는 [`test/golden/compare-json.ts`](https://github.com/knowvah/elk-engine/blob/main/test/golden/compare-json.ts)이며,
이 문서는 비교기가 구현하는 내용을 설명합니다. 포팅 규칙은
[`docs/translation-rules.md`](/guide/translation-rules)에 있습니다.

| #   | 섹션                               | 답하는 질문                                  |
| --- | ---------------------------------- | -------------------------------------------- |
| 1   | [오라클](#1-오라클)                | "정답"은 무엇이며, 어느 커밋입니까?          |
| 1a  | [적합성 단위](#1a-적합성-단위)     | 케이스는 무엇이며, 어떤 케이스가 있습니까?   |
| 2   | [적합성 기준](#2-적합성-기준)      | 무엇을 같다고 봅니까?                        |
| 3   | [골든과 코퍼스](#3-골든과-코퍼스)  | 참조 출력은 어디서 옵니까?                   |
| 4   | [Seam 패치](#4-seam-패치)          | 오라클을 어떻게 변경합니까?                  |
| 5   | [오라클 운영](#5-오라클-운영-런북) | 고장 나면 무엇을 해야 합니까?                |
| 6   | [게이트](#6-게이트)                | 변경이 반영되기 전에 무엇을 통과해야 합니까? |

## 1. 오라클

오라클(AD-3)은 `$ELK_SOURCE_DIR`의 분리된 git 워크트리에서 **소스로부터 빌드한** 업스트림 ELK이며,
`tools/oracle/build.sh`가 이를 `$ELK_ORACLE_DIR`에 만듭니다.
둘 다 이 저장소 밖에 있으며, 어느 쪽도 저장소에 포함하지 않습니다.

| 항목            | 위치                                                                                   |
| --------------- | -------------------------------------------------------------------------------------- |
| 고정된 ELK 커밋 | `tools/oracle/ELK_COMMIT` (현재 `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`)            |
| 패치 시리즈     | `tools/oracle/patches/*.patch`, `git am --3way`로 사전순 적용                          |
| 빌드            | `tools/oracle/build.sh` (Maven 3.9.x + JDK 21; Tycho가 p2 아티팩트를 다운로드)         |
| 배치 러너       | `tools/oracle/run.sh <outDir> <input>...` 또는 `run.sh --cases <cases.jsonl> <outDir>` |
| 하네스          | `tools/oracle/harness/ElkOracle.java`                                                  |
| 빌드 매니페스트 | `$ELK_ORACLE_DIR/oracle-build.json` (커밋, 패치, JDK, 번들별 jar)                      |

**빌드.** `build.sh`는 `mvn -P elk-meta clean install -DskipTests`(melk 컴파일러)를 실행한 다음
워크트리의 `build/`에서 `mvn clean install -DskipTests -Dmaven.test.skip=true`를 실행하고, 범위에 포함된
각 번들(`core`, `graph`, `graph.json`, `alg.common`, 그리고 `layered`, `mrtree`, `radial`, `force`,
`disco`, `rectpacking`, `spore`, `topdownpacking`, `vertiflex` 알고리즘)의 jar를
`oracle-build.json`에 기록합니다. 기존 워크트리는 `ELK_COMMIT`에서 파생되었고, `tools/oracle/patches/`의
패치 제목을 정확히 그대로 가지며, 빌드 출력을 제외하고 깨끗한 경우에만 재사용합니다. 그렇지 않으면
`build.sh`는 `2`로 종료하고 워크트리를 건드리지 않습니다.

**실행.** `run.sh`는 번들 jar와 Tycho p2 캐시(`P2_BUNDLES`, 기본값 `~/.m2/repository/p2/osgi/bundle`;
각각 가장 최신 버전을 사용)의 서드파티 번들(Gson, Guava, EMF, Xtext/Xtend 라이브러리)을 대상으로
`ElkOracle.java`를 컴파일합니다. JVM 하나가 `RecursiveGraphLayoutEngine`으로 모든 입력을 레이아웃하고,
레이아웃, 0인 크기, 0인 위치를 포함하며 알 수 없는 레이아웃 옵션은 생략한
`<outDir>/<input basename>.json`을 작성합니다. 실패한 입력은 `ERROR <input>: <message>`를 출력하며,
입력이 하나라도 실패하면 JVM은 `1`로 종료합니다. 출력 이름이 기본 이름이므로, 한 번의 실행 안에서
입력의 기본 이름은 고유해야 합니다.

**패치 시리즈 의미.** 현재 시리즈에는 패치가 하나 있습니다.

| 패치                                                                    | 효과                                                                                                                                                                                                                                      | 짝이 되는 TS seam                                                                                                                                         |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `0001-graph.json-seedable-JsonExporter-id-collision-random.patch` (D5b) | `JsonExporter`는 id 충돌을 `"_g" + Random.nextInt(1000000)`으로 해결합니다. 이 패치는 시스템 속성 `org.eclipse.elk.graph.json.exportSeed`로 해당 `Random`에 시드를 지정합니다(미설정 = ELK 동작). `run.sh`는 `EXPORT_SEED=1`을 전달합니다 | `graph.json` 포팅의 주입 가능한 `Random`. 해당 포팅이 끝날 때까지 보류 중(TS `Random` 심은 이미 같은 수열을 재현합니다: 시드 1은 548985, 764588을 냅니다) |

패치는 JVM과 JS의 동작을 비교 가능하게 만드는, 범위가 좁은 seam을 추가하기 위해서만 존재하며,
각 패치는 TS 쪽 seam과 짝을 이룹니다(섹션 4).

**elkjs를 쓰지 않는 이유.** elkjs는 GWT로 컴파일한 ELK입니다. 우리의 패치 시리즈를 담을 수 없고,
JRE의 GWT 에뮬레이션은 우리가 포팅하는 원본인 JVM과 다릅니다. 오라클로 참조하지 않습니다.

## 1a. 적합성 단위

**케이스**는 `(algorithm, model, variant)`입니다(D1). 패리티 대시보드는 레이아웃 알고리즘마다 한 행을
가지며, elk-models 폴더와 census 특징은 행이 아니라 필터입니다.

**케이스 id.** `<tier>/<algorithmSuffix>/<variant>/<modelId>`, 예를 들어
`native/layered/default/tickets/layered/546_borderGaps`입니다. `algorithmSuffix`는 `org.eclipse.elk.`를
뺀 알고리즘 id입니다. 생성된 모델의 `modelId`는 `generated/<name>`입니다.

**모델 id와 소스(D3).** 모델 id는 elk-models의 경로에서 확장자를 뺀 것입니다.
케이스는 `.json`이 있으면 그것을, 없으면 `.elkt`를 읽으며, `.elkg`(EMF XMI)는 읽지 않습니다.

**변형(D6).** `test/corpus/variants.json`의 이름 붙은 옵션 오버레이이며 루트에 적용합니다.
`default`(없음), `direction-right`, `direction-left`, `direction-down`, `direction-up`,
`hierarchy-separate`(`SEPARATE_CHILDREN`), `hierarchy-include`(`INCLUDE_CHILDREN`).

| 티어         | 알고리즘                                     | 모델                           | 변형               |
| ------------ | -------------------------------------------- | ------------------------------ | ------------------ |
| native       | 모델 자신의 `rootAlgorithm`                  | 모든 census 모델               | 일곱 가지 모두     |
| retarget     | 모델 자신의 것을 제외한 나열된 모든 알고리즘 | 모든 census 모델               | `default`만 (OR-1) |
| generated    | 파일 접두사가 가리키는 알고리즘              | `test/corpus/generated/*.json` | 일곱 가지 모두     |
| ported JUnit | 알고리즘 미션별                              | 업스트림 JUnit 케이스 (AD-13)  | 포팅된 대로        |

`tools/oracle/run.sh --list-algorithms`는 알고리즘 id 목록입니다(현재 14개).

**Retarget(D2).** 하네스는 **자식이 있는 모든 노드**에 `org.eclipse.elk.algorithm`을 설정하며 선언된
값을 대체하고, 루트에는 `org.eclipse.elk.randomSeed = 1`을 설정합니다. ELK는 노드마다 알고리즘을
결정하며, 설정되지 않은 노드는 layered로 돌아갑니다. 자식이 없는 루트는 시드만 받습니다. retarget
티어는 각 모델 자신의 `rootAlgorithm`을 건너뜁니다(native 티어가 이를 다룹니다).

## 2. 적합성 기준

AD-4이며, `compareLayout(expected, actual, { tol })`이 구현하는 그대로입니다.

| 규칙                   | 동작                                                                                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 허용 오차              | 절대값, `DEFAULT_TOLERANCE = 1e-6`. 유한한 숫자는 `abs(e - a) <= tol`이면 통과합니다                                                                          |
| 유한하지 않은 숫자     | `NaN`과 `±Infinity`는 `tol: Infinity`일 때도 정확히 같아야 합니다(`Object.is` 또는 `===`)                                                                     |
| 문자열, 불리언, `null` | 엄격히 같아야 하며, 아니면 `value`입니다                                                                                                                      |
| 종류 불일치            | JSON 종류(`null`, 배열, 객체, 숫자, 문자열, 불리언)가 다르면 `type` diff 하나가 됩니다                                                                        |
| 객체 키                | 키 집합이 동일해야 합니다. expected에만 있는 키는 `missing`, actual에만 있는 키는 `extra`입니다                                                               |
| 배열                   | 양쪽의 모든 요소가 문자열 `id`를 가진 객체이고 각 쪽에서 id가 고유하면 **`id`로** 대응시킵니다(빈 배열은 키 기반으로 간주). 그렇지 않으면 **위치 기준**입니다 |
| 키 기반 배열           | 한쪽에만 있는 id는 `path[id=<id>]`의 `structure` diff이며, 순서는 무시합니다                                                                                  |
| 위치 기반 배열         | 길이 차이는 `structure` diff 하나이며, 요소는 더 이상 비교하지 않습니다                                                                                       |
| diff 종류              | `structure`, `value`, `type`, `missing`, `extra`. `path`는 JSON 경로와 비슷합니다(`children[id=n1].x`)                                                        |

결과적으로 요소 id, 요소 개수, 엣지 섹션 토폴로지, 꺾임점 개수는 id와 배열 길이가 정확하므로 정확히
일치해야 하고, 좌표와 크기에는 `1e-6`이 적용됩니다. `formatDiffs`는 최대 20개의 diff를 출력합니다.

**알려진 차이 정책.** 차이는 `tol`을 높이거나 골든을 수정해서 흡수하지 않습니다(AD-13). 각 차이는
원인, 그리고 영향을 받는 테스트나 픽스처와 함께 여기에 기록합니다. 허용하는 부류는 다음과 같습니다.

- **ulp 수준의 `Math.*` 차이.** V8과 JVM은 `sin`, `cos`, `exp`, `log`, `pow` 등의 마지막 비트에서
  다를 수 있습니다. Java의 `StrictMath`는 비트 단위로 정확하게 명세되어 있지만 `Math`는 그렇지
  않습니다. 이미 발생한 사례: `nextGaussian`은 `StrictMath.log`를 사용하도록 명세되어 있으므로,
  `src/java/util/Random.ts`는 `Math.log` 대신 `StrictMath.log`와 정확히 일치하는 구현을 가지고 있습니다.
  허용 오차를 넓히는 것보다 `StrictMath` 알고리즘의 비트 단위 정확한 포팅을 선호합니다.
- **아이덴티티 해시 순회(AD-10).** 아이덴티티 해시 객체를 키로 하는 `HashMap`/`HashSet`의 순회는
  Java 자체에서도 비결정적입니다. 해당 위치를 저널에 기록하고 삽입 순서로 포팅하며, 골든은 이에
  의존해서는 안 됩니다. 값 해시 키(String, Integer)는 Java의 순서를 재현해야 합니다.
- **시간으로 시드되는 `Random`.** `randomSeed = 0`이면 ELK는 시계로 시드를 정하므로
  (`core/Core.melk:608`) 출력을 재현할 수 없습니다. 골든 입력은 시드를 설정하지 않거나 0이 아닌
  값으로 두어야 합니다(layered의 기본 시드는 `1`입니다).

구체적인 항목(사용자의 승인이 있을 때만 추가):

| #   | 차이                    | 원인                                                               | 범위                                                                                                                                                       | 승인                   |
| --- | ----------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| 1   | 파싱 오류 메시지 텍스트 | ANTLR 메시지는 생성된 파서의 산물이며, 이 파서는 포팅하지 않습니다 | 잘못된 문법 입력(`.elkt`, `.elkj`, `.elkr`): 파싱 실패의 _존재 여부_만 일치하면 되고 메시지는 일치하지 않아도 됩니다. 올바른 입력은 정확히 일치해야 합니다 | D8, 사용자, 2026-10-11 |

**판정.** 각 케이스는 오라클의 별도 JVM 실행 두 번으로부터 판정 하나를 받습니다(D4, D5, OR-2).

| 판정               | 의미                                                                                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ok`               | 두 실행 모두 모델을 레이아웃했으며 출력 파일이 바이트 단위로 동일합니다                                                                                                |
| `throws`           | 두 실행이 같은 예외를 던졌습니다. 클래스가 정확히 같고, `@[0-9a-f]+`를 `@<hash>`로 바꾼 뒤 메시지도 정확히 같습니다(메시지는 null일 수 있음, 예: `StackOverflowError`) |
| `nondeterministic` | 두 실행이 일치하지 않습니다(출력 바이트, 예외, 또는 하나는 `ok`이고 하나는 `throws`)                                                                                   |
| `oracle-error`     | 하네스 결함(읽을 수 없는 입력, 알 수 없는 변형/알고리즘/옵션, 유실된 결과 줄). 허용되지 않습니다                                                                       |
| `timeout`          | 실행이 `ELK_SWEEP_TIMEOUT_MS`를 초과했습니다                                                                                                                           |

우선순위: `oracle-error`, 그다음 `timeout`, 그다음 같으면 `ok`/`throws`, 아니면
`nondeterministic`입니다. 바이트 비교 전에 두 출력의 모든 `@[0-9a-f]+` 토큰을 예외 메시지와 마찬가지로
`@<hash>`로 바꿉니다(D5a; `tools/corpus/sweep.ts`의 `sameOutput`).
원인: disco의 프로그램 방식 `debug.discoGraph` 옵션이 `...DCGraph@<identity hash>`를 내보내는데,
어떤 시드로도 이를 고정할 수 없습니다. TS 비교기도 같은 치환을 적용합니다. 비결정적 케이스는 별도로
보고하며, 위의 아이덴티티 해시 정책에 따라 통과 횟수에서 제외합니다.

`nondeterministic`의 실제로 남아 있는 원인(하네스 결함이 아닌 ELK의 동작이며, 개수는 패리티 보고서에
있음): spore(`ElkGraphImporter.java:169`가 `Math.random`으로 흔들림을 줍니다)와 `random`
(기본 `randomSeed` 0은 중첩된 복합 노드에서 시드가 지정되지 않습니다. retarget은 루트에만 시드를
지정하며(D2), 사용자 결정으로 유지합니다). 내보내기 도구의 `_g<random>` id 이름 변경은 원인이 아닙니다.
seam 패치가 이를 고정합니다.

## 3. 골든과 코퍼스

AD-5. CI에 JVM이 필요하지 않도록 참조 출력을 커밋합니다.

| 항목          | 위치                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------- |
| 고정된 코퍼스 | `test/corpus/manifest.json`의 `commit`에 있는 `eclipse-elk/elk-models` (저장소에 포함하지 않음) |
| 모델 디렉터리 | `$ELK_MODELS_DIR`, 기본값은 이 저장소 기준 상대 경로 `../../eclipse-elk/elk-models`             |
| 선별된 집합   | `test/corpus/manifest.json`의 `golden[]`: `{ id, path, note }`                                  |
| 참조(ref)     | `test/golden/refs/elk/<id>.json`, 매니페스트 `id`마다 하나                                      |
| 출처 정보     | `test/golden/refs/elk/_meta.json`: `elkCommit`, `patches`, `jdk`, `modelsCommit`, `generatedBy` |

**id와 경로의 대응.** `golden[].path`는 `$ELK_MODELS_DIR` 기준 상대 경로이며, 입력은
`$ELK_MODELS_DIR/<path>`입니다. `regen-goldens.sh`는 이 입력들에 하네스를 실행하고 각
`<basename>.json` 출력을 `refs/elk/<id>.json`으로 스테이징합니다.
예: id `ptolemy-scrambler`는
`realworld/ptolemy/hierarchical/comm_scrambler_Scrambler.json`입니다.

**재생성**(`tools/oracle/regen-goldens.sh`):

1. models 클론이 매니페스트 커밋과 정확히 일치해야 합니다(아니면 종료 코드 `1`).
2. 빌드된 오라클이 필요합니다(`run.sh`는 `oracle-build.json`이 필요합니다).
3. 모든 ref와 `_meta.json`을 `test/golden/refs/.elk-staging.*`에 스테이징한 다음 이름 변경 두 번으로
   디렉터리를 교체하므로, 실패한 실행은 기존 ref를 그대로 남깁니다.
4. `_meta.json`에는 타임스탬프가 없으므로(`builtAt`은 `oracle-build.json`에 남습니다), 입력이 바뀌지
   않은 재생성은 git에서 바이트 단위로 아무 변화가 없습니다.

**재생성해야 하는 시점:** `ELK_COMMIT`, 패치 시리즈, 매니페스트의 `golden[]` 집합이나 `commit`, 또는
하네스를 변경한 뒤입니다. 그 외에는 하지 않습니다.

**저널 규칙.** ref를 변경하는 모든 재생성은 원인(패치 id 또는 커밋 상향)과 함께 저널에 기록합니다.
ref는 직접 편집하지 않습니다. TS 어서션이나 골든이 변경해야만 통과할 수 있다면 멈추고 저널에
기록합니다(AD-13).

**Census.** `npx tsx tools/corpus/census.ts`는 레이아웃을 수행하지 않습니다. 파싱 모드로 모든 모델에
오라클을 실행하고 그 결과를 커밋된 `test/corpus/census.json`(898개 모델: id, 형식, 소스, 루트
알고리즘, 특징 개수)과 비교합니다. 같으면 종료 코드 `0`, 드리프트가 있으면 `1`이며,
`--write`는 파일을 다시 씁니다. 고정된 models 클론에서만 실행되고 하네스 결함이 있으면 중단합니다.

**생성된 코퍼스(D7).** `test/corpus/generated/<algorithmSuffix>-<shape>.elkr`에는 시드가 지정된
grandom 설정이 있고, 옆의 `.json`은 오라클이 생성한 레이아웃 전 입력입니다. 설정 아홉 개가 어떤
elk-models 모델도 쓰지 않는 알고리즘 id를 다룹니다: `disco`, `force`, `mrtree`, `radial`, `random`,
`sporeCompaction`, `sporeOverlap`, `topdownpacking`, `vertiflex`. 각 설정은 노드가 최대 50개이며
엣지 레이블이 없습니다(`BlindTextGenerator`는 시드가 없습니다). ELK의 `JsonExporter`는 id 충돌을
시드가 없는 무작위 접미사로 해결하므로, 하네스는 생성된 루트의 이름을 `root`로 지정합니다.
`tools/oracle/regen-generated.sh`로만 재생성하십시오(스테이징 디렉터리와 이름 변경을 사용하며, 실패한
설정이 있으면 기존 파일을 남깁니다). 변경 없이 다시 실행하면 git에서 아무 변화가 없습니다. TS grandom
포팅은 이 `.json` 파일을 바이트 단위로 재현해야 하며, 알고리즘 골든은 이에 의존하지 않습니다.

**스윕.** `tools/oracle/sweep.sh [--filter <substring>] [--limit <n>] [--shards <n>]
[--out <dir>] [--plan-only]`는 모든 케이스를 계획하고, 각 케이스를 별도 JVM에서 두 번 실행하며(샤드는
기본적으로 `min(cpus, 8)`개의 동시 `run.sh` 프로세스), 결과를
`$ELK_ORACLE_DIR/sweep/<elkCommit>-<modelsCommit>/{results.jsonl,summary.json,run-a/}`에 씁니다.
`--plan-only`는 티어별 케이스 수를 출력하고 아무것도 실행하지 않습니다. `--filter`는 부분 문자열을
포함하는 케이스 id만 유지하고, `--limit`은 균등 간격 표본을 취합니다. 케이스가 `oracle-error`이면
종료 코드 `1`이고 그렇지 않으면 `0`이며, 도구 오류는 `2`로 종료합니다. 케이스별 출력은 로컬에
남습니다(AD-5). `ELK_SWEEP_TIMEOUT_MS`(기본값 `30000`, `tools/`만 읽음)가 각 케이스를 제한하며,
`run.sh`는 타임아웃(JVM 종료 코드 75) 후 결과 줄이 없는 케이스에 대해 JVM을 다시 시작합니다.

**패리티 보고서(D9).** `docs/parity-report.md`는 스윕 캐시에서 생성하여 커밋합니다. 알고리즘과 판정별
개수를 ELK 및 models 커밋과 함께 담으며 타임스탬프는 없습니다. `npx tsx tools/corpus/parity-report.ts --write`로
재생성합니다. `--write` 없이 실행하면 커밋된 보고서가 오래된 경우 명령이 `1`로 종료합니다. 직접
편집하지 않습니다.

**코퍼스 테스트.** `test/corpus/corpus.ts`의 `resolveModelsDir()`는 클론이 없거나 다른 커밋에 있으면
`skip` 사유를 반환합니다. 클론이 필요한 테스트는 메시지에 고정된 sha를 담고 건너뜁니다. 현재
`test/golden/oracle-refs.test.ts`는 커밋된 ref만 검사합니다: 매니페스트 id마다 하나, 모든 노드, 포트,
레이블, 엣지의 기하 정보, 자기 비교, 그리고 `_meta.json`이 `ELK_COMMIT`, 매니페스트, 생성기와
일치하는지입니다. TS 대 오라클 레이아웃 테스트는 아직 없으며, 첫 번째로 포팅한 알고리즘과 함께
추가됩니다.

## 4. Seam 패치

Seam 패치는 오라클을 변경하며, 드물고 항상 TS seam과 짝을 이룹니다.

1. 오라클 워크트리(`$ELK_ORACLE_DIR`)에서 편집하고 커밋하거나, `ELK_COMMIT`의 스크래치 클론에서 패치를
   작성합니다. 완성된 패치를 기존 워크트리에 그 자리에서 추가하려면(워크트리를 제거하면 삭제되는
   `census/` 및 `sweep/` 캐시를 유지합니다) `build.sh`의 신원으로 적용합니다.
   `git -C "$ELK_ORACLE_DIR" -c user.name=elk-engine-oracle \
-c user.email=oracle@invalid am --3way <patch>`;
   그러면 `build.sh`가 시리즈를 검증하고 그 자리에서 다시 빌드하므로(약 3분), 4-5단계는
   건너뛸 수 있습니다.
2. 내보내기:
   `git -C "$ELK_ORACLE_DIR" format-patch -o tools/oracle/patches <ELK_COMMIT>..HEAD`
   (또는 새 커밋만). 파일 이름은 `NNNN-<slug>.patch`이며, 숫자 접두사가 적용 순서를 정합니다.
3. 대응하는 TS seam을 `src/`에 추가합니다(같은 동작, 주입 가능). 테스트의 기댓값은 패치된
   오라클에서 가져옵니다(AD-13).
4. 그렇지 않으면 워크트리를 제거합니다: `git -C "$ELK_SOURCE_DIR" worktree remove $ELK_ORACLE_DIR`
   (빌드 출력 때문에 더럽혀졌다면 `--force`를 추가).
5. 다시 빌드합니다: `tools/oracle/build.sh` (시리즈를 처음부터 다시 적용).
6. 재생성합니다: `tools/oracle/regen-goldens.sh`. `git diff test/golden/refs`를 검토합니다.
7. 패치(`NNNN-<slug>.patch`)를 명시하고 변경된 모든 ref를 나열한 저널 항목을 작성합니다.
   `_meta.json`의 `patches`가 시리즈를 자동으로 기록합니다.

워크트리에 커밋되지 않은 편집을 남기지 마십시오. `build.sh`는 이를 오래된 것으로 취급합니다
(종료 코드 `2`). `ELK_SOURCE_DIR` 자체는 편집하지 마십시오.

## 5. 오라클 운영 (런북)

| 장애                                                                      | 감지                                                                                                                                                                                                                                                           | 대응                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tycho 빌드 실패(p2에 연결할 수 없음, JDK, Maven 버전)                     | `tools/oracle/build.sh`가 0이 아닌 값으로 종료하며, 전체 Maven 출력은 저장소 루트의 `.oracle-build.log`에 있습니다. 종료 코드 `1`은 도구 누락 또는 잘못된 Maven이고, `3`은 번들 jar가 만들어지지 않았다는 뜻입니다                                             | Maven은 반드시 **3.9.x**여야 합니다. Tycho 4.0.12는 Maven 3.10(Homebrew의 3.10.0)에서 `ProvisionException: No implementation for MavenTargetLocationFactory was bound`로 실패합니다. 로컬 3.9.11이 `.tools/apache-maven-3.9.11/`(gitignore됨)에 있습니다: `ELK_MVN=$PWD/.tools/apache-maven-3.9.11/bin/mvn tools/oracle/build.sh`. JDK 21을 사용하거나 `JAVA_HOME`으로 JDK 17을 사용하십시오. 네트워크를 확인하고(첫 실행은 p2 아티팩트를 다운로드합니다) 다시 실행합니다. `build.sh --record-only`는 Maven을 건너뛰고 이미 빌드된 jar로 `oracle-build.json`만 다시 씁니다. 종료 코드 `2`: 워크트리를 제거하고(섹션 4의 4단계) 다시 빌드합니다. 그 외에는 로그 끝부분과 함께 에스컬레이션합니다 |
| `build.sh`가 패치를 적용한 직후 `2`로 종료                                | 워크트리가 오래된 것으로 보고됨                                                                                                                                                                                                                                | `build.sh`는 줄바꿈된 패치 제목을 펼치고(`git format-patch`는 약 78자를 넘으면 접습니다) 추적되지 않는 `census/` 및 `sweep/` 캐시를 무시합니다. 다른 더러움이나 나열되지 않은 패치는 여전히 종료 코드 `2`를 냅니다: 워크트리를 고치십시오(섹션 4)                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 패치 또는 커밋 상향 후 골든 드리프트                                      | `tools/oracle/regen-goldens.sh` 다음에 `git diff --exit-code test/golden/refs`가 비어 있지 않음. `test/golden/oracle-refs.test.ts`가 오래된 `_meta.json`(`elkCommit`, `modelsCommit`)에서 실패함. TS 적합성 테스트가 생기면 `formatDiffs` 보고서와 함께 실패함 | 다시 빌드하고(`build.sh`), `regen-goldens.sh`를 실행하고, diff를 검토하고, 패치 id를 저널에 기록합니다. ref를 직접 편집하거나 `tol`을 완화하지 마십시오                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| p2 캐시에 Xtext/ANTLR jar 없음(`.elkt`, `.elkr`, 또는 모든 `run.sh` 시작) | `run.sh`가 0이 아닌 값으로 종료하며 `bundle <name> not in p2 cache <dir>`를 출력함(예: `org.eclipse.xtext`, `org.antlr.runtime`, `org.eclipse.xtext.xbase`)                                                                                                    | `P2_BUNDLES`를 해당 jar가 있는 Tycho p2 캐시로 설정하거나, 네트워크가 연결된 상태에서 `build.sh`를 실행해 Tycho가 가져오게 한 뒤 `run.sh`를 다시 실행합니다. 다른 곳의 jar로 대체하지 마십시오                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 스윕 멈춤 또는 OOM                                                        | 케이스가 타임아웃까지 실행되어 `timeout`으로 보고됨(stderr 줄에 이름이 나옴). 결과 줄이 없는 실행은 `oracle-error`가 되고 stderr에 `sweep: shard <n> run <A or B> exited <code>`가 나옴. 동시 JVM 8개에서 머신이 스왑함                                        | 동시성과 배치 크기를 낮춥니다: `sweep.sh --shards 2`, `--filter` 또는 `--limit`으로 범위를 좁힙니다. `ELK_SWEEP_TIMEOUT_MS`는 느리지만 올바른 모델에만 높입니다. 재현 가능한 `timeout`은 발견 사항입니다: 케이스 id를 저널에 기록하고, 가리기 위해 제한을 늘리지 마십시오                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 고정 값 상향(`ELK_COMMIT` 또는 models `commit`) 후 census 드리프트        | `npx tsx tools/corpus/census.ts`가 `1`로 종료하며 달라진 모델을 나열함. `test/corpus/census.test.ts`가 실패함                                                                                                                                                  | 클론과 오라클이 새 고정 값에 있는지 확인하고, `census.ts --write`를 다시 실행하고, `git diff test/corpus/census.json`을 검토하고, 원인을 저널에 기록한 다음 `sweep.sh`를 다시 실행하고 패리티 보고서를 재생성합니다. census를 직접 편집하지 마십시오                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| elk-models 없음 또는 잘못된 sha                                           | 코퍼스 테스트가 기대하는 sha를 밝히는 메시지와 함께 건너뜀. `regen-goldens.sh`가 `1`로 종료함(`elk-models at <sha>, expected pinned <sha>`)                                                                                                                    | `test/corpus/fetch.sh`를 실행합니다(고정된 커밋을 클론하고 체크아웃). 기존 클론이 다른 커밋에 있으면 `2`로 종료하며 클론을 건드리지 않습니다: 해당 클론을 직접 고치거나 `ELK_MODELS_DIR`을 새 경로로 지정하십시오. 스크립트에서 기존 클론의 HEAD를 옮기지 마십시오                                                                                                                                                                                                                                                                                                                                                                                                                              |

그 밖의 `run.sh` 실패: `oracle-build.json missing` 또는 `oracle jar missing`은 먼저 `build.sh`를
실행하라는 뜻이고, `bundle <name> not in p2 cache`는 `P2_BUNDLES`를 Tycho p2 캐시로 설정하거나
네트워크가 연결된 상태에서 `build.sh`를 다시 실행하라는 뜻입니다.

## 6. 게이트

모든 변경:

| 게이트            | 명령                                                      | 기준                                                                    |
| ----------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| 타입              | `npm run typecheck`                                       | 종료 코드 0                                                             |
| 테스트와 커버리지 | `npm run coverage`                                        | 모든 테스트 통과. `src/**`의 statements, branches, functions, lines 90% |
| 아키텍처          | `test/architecture/*.fitness.test.ts` (`npm test`로 실행) | 모듈 경계, 모듈 전역 변수, `src/`에 Node 내장 모듈 없음, SPDX 헤더      |
| 오라클 ref        | `test/golden/oracle-refs.test.ts`                         | 커밋된 ref가 매니페스트 및 `ELK_COMMIT`과 일관됨                        |

`tools/oracle/`, 매니페스트, 패치 시리즈를 변경하면 다음도 필요합니다.

| 게이트      | 명령                                                                         | 기준                                                              |
| ----------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| 오라클 빌드 | `tools/oracle/build.sh`                                                      | 종료 코드 0                                                       |
| 오라클 실행 | `tools/oracle/run.sh <outDir> <input.json>...`                               | 종료 코드 0, `ERROR` 줄 없음                                      |
| 골든 안정성 | `tools/oracle/regen-goldens.sh` 다음 `git diff --exit-code test/golden/refs` | diff 없음. 변경이 ref를 옮기려는 것이고 저널에 기록된 경우는 예외 |
| 셸          | `shellcheck tools/oracle/*.sh`                                               | 경고 없음                                                         |

`tools/oracle/` 또는 `tools/corpus/`를 변경하면 다음도 필요합니다.

| 게이트        | 명령                                                                                | 기준                                                   |
| ------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Census        | `npx tsx tools/corpus/census.ts`                                                    | 종료 코드 0 (드리프트 없음)                            |
| 생성물 안정성 | `tools/oracle/regen-generated.sh` 다음 `git diff --exit-code test/corpus/generated` | diff 없음                                              |
| 스윕          | `tools/oracle/sweep.sh` (표본은 `--filter`/`--limit`)                               | 종료 코드 0: `oracle-error` 없음                       |
| 패리티 보고서 | `npx tsx tools/corpus/parity-report.ts`                                             | 종료 코드 0 (커밋된 보고서가 최신). `--write`로 재생성 |
