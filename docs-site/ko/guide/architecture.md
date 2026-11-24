---
title: 아키텍처
sourceHash: b28f7adf145c6e3ab8efc737a9e5e9bb883714a2c79e0811ade88704241f3c21
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine 아키텍처 개요

| 문서                                                                                                                   | 내용                                                                                                                          |
| ---------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| [inventory.md](/guide/inventory)                                                                                       | 모든 ELK 번들: 목적, LOC, 생성된 소스, 범위                                                                                   |
| [port-map.md](/guide/port-map)                                                                                         | Java 패키지와 `src/` 모듈의 대응                                                                                              |
| [component-map.md](#컴포넌트-맵)                                                                                       | 범위 내 번들 의존성, 핵심 런타임 구성 요소                                                                                    |
| [../translation-rules.md](/guide/translation-rules)                                                                    | Java에서 TypeScript로의 규칙                                                                                                  |
| [../conformance.md](/conformance)                                                                                      | 오라클 비교 기준과 절차(이 미션의 후반부에 추가됩니다)                                                                        |
| [elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)                           | ELK Text(`.elkt`) 포팅, Xtext 부분집합, 런북, 보류 사항                                                                       |
| [elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)                 | ELK Textual JSON(`.elkj`) 포팅, 지연 링킹, 런북, 보류 사항                                                                    |
| [grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)                             | grandom(`.elkr`) 랜덤 그래프 생성기 포팅, 근거, 런북                                                                          |
| [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)                     | 레이아웃 엔진과 fixed, box, random 프로바이더(미션 5a)                                                                        |
| [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)                   | `.melk` 생성기, 보류 중인 타입, 지연 상수, 재생성                                                                             |
| [complexity.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/complexity.md)                       | 모든 함수를 측정하는 복잡도 게이트(`npm run complexity`)                                                                      |
| [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md)                     | layered 프레임워크(미션 7a): LGraph 모델, 변환, 단계별 클래스, 런북                                                           |
| [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md) | layered 노드 배치(미션 7d): p4nodes, Brandes-Köpf, 프로세서 5개, 지오메트리 행, 런북                                          |
| [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)     | layered 엣지 라우팅(미션 7e): p5edges orthogonal, polyline, spline, 프로세서 6개, 라우팅 행, 런북                             |
| [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)   | layered 파이프라인(미션 7f): `ElkLayered`, `GraphConfigurator`, 컴포넌트, 프로세서 4개, 전체 레이아웃 행, 러너 부분집합, 런북 |
| [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)       | layered 레이블(미션 7f2): 레이블 및 주석 프로세서, 언집핑, 디버그 출력, 비지터, 레이블 행, 스윕, 런북                         |
| [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)         | layered 자기 루프, 래핑, 압축(미션 7g): loops 패키지, 브레이킹 포인트, 1D 압축, `ComponentsCompactor`, 행, 스윕, 런북         |
| [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)   | layered 복합 그래프(미션 7h): `compound` 패키지, 계층 드라이버, 트리 전체 중단점, 골든, 스윕, 해시 순서 쌍둥이, 런북          |
| [parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)           | 오라클에 대한 TS 스윕(행 9): 샤딩된 러너, 요약 계약, 주석, 보고서, 런북                                                       |
| [text-sizing-seam.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/text-sizing-seam.md)           | 교체 가능한 레이블 텍스트 측정(행 10): 패치 0003, TS 쌍둥이, 고정 모드, 근거, 런북                                            |
| [elk-upgrade.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-upgrade.md)                     | ELK 핀 이동(행 13): 순 diff 분류, 패치 시리즈, 재빌드, 재기록, 스윕, ref diff 분류, 리허설 모드                               |

## elk-engine이란

`@knowvah/elk-engine`은 Eclipse Layout Kernel(ELK)을 충실하게 포팅한 TypeScript 구현입니다. 고정된 커밋
`8bca22f4afa3371562d2f702d59929818f7f7b71`의 Java가 명세입니다(AD-1, AD-2). 이것은 라이브러리로서 브라우저에서 안전하게
동작하고, 런타임 의존성이 없으며, Java나 WASM도 쓰지 않습니다. 공개 계약은 ElkGraph 객체 모델과 `ElkGraphUtil`
팩토리이며, ELK JSON은 I/O 어댑터입니다(AD-14). 직접 작성된 코드 약 134,600줄에 해당하는 번들 13개가 범위에 포함됩니다
(인벤토리 참고). 현재 상태: 레이아웃 엔진(`RecursiveGraphLayoutEngine`, `LayoutAlgorithmResolver`, `GraphValidator`)과 핵심 프로바이더 세 개인 `fixed`, `box`, `random`이 포팅되어 있으며, 엄선한 골든에서 오라클과 일치합니다(미션 5a, [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)). `core`의 나머지도 포팅되었습니다(미션 5b: 프로세서 파이프라인, `LayoutConfigurator`, `ElkSpacings`, `ElkMath`, 스플라인, 주석 연결. [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b) 참고). 공유 `alg.common` 번들은 완전히 포팅되었습니다(미션 6a: 지오메트리, 네트워크 심플렉스, 1D 압축, 겹침, spore, polyomino. 미션 6b: `nodespacing`과 `NodeMicroLayout`, 326행 오라클 재생으로 증명. [alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md) 참고). layered 프레임워크가 포팅되었습니다(미션 7a: 옵션 패키지, LGraph 모델, ElkGraph ↔ LGraph 변환, 프로바이더 셸. 272행과 330행의 오라클 벡터 파일 두 개로 증명. 레이아웃 단계는 7b~7h에서 이어집니다. [alg-layered.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md) 참고). 처음 두 단계가 포팅되었습니다(미션 7b: 사이클 브레이커 11개, 레이어러 9개, 그 주변의 프로세서 10개. 오라클 단계 행 651개와 32,652건의 스윕으로 증명. [alg-layered.md § 8](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-b)). 세 번째 단계가 포팅되었습니다(미션 7c: 카운터를 갖춘 교차 최소화, greedy switch, 모델 순서 비교기, P2와 P3 사이의 프로세서 8개. 오라클 순서 행 808개와 6,728건의 스윕으로 증명. [alg-layered.md § 9](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered.md#part-c)). 네 번째 단계가 포팅되었습니다(미션 7d: Brandes-Köpf를 포함한 노드 배치기 4개와 P4 중단점에 필요한 프로세서 5개. 지오메트리가 있는 오라클 배치 행 610개와 8,410건의 스윕으로 증명. [alg-layered-placement.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-placement.md)). 다섯 번째 단계가 포팅되었습니다(미션 7e: orthogonal, polyline, spline 라우터와 라우팅된 결과에 필요한 프로세서 6개. 엣지 지오메트리가 있는 오라클 라우팅 행 950개와 6,728건의 스윕으로 증명. [alg-layered-routing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-routing.md)). layered 파이프라인이 동작합니다(미션 7f: 드라이버, 연결 컴포넌트 패키지, 방향 트랜스포머, 계층 포트 라우터, 프로세서 3개. 전체 레이아웃과 중단점의 오라클 행 1,311개, 실제 드라이버를 통한 이전 행의 2,351행 재재생, 포팅된 JUnit 스위트 28개, 6,646건의 스윕으로 증명. [alg-layered-pipeline.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-pipeline.md)). 레이블과 주석이 있는 레이아웃, 레이어 언집핑, 로깅 모니터도 동작합니다(미션 7f2: 레이블 계열, 주석 프로세서, `AlternatingLayerUnzipper`, `InteractiveLayeredGraphVisitor`, 디버그 유틸리티. 중단점과 전체 레이아웃의 오라클 행 1,305개, 기준선 JUnit 스위트 11개, 1,105건의 스윕(그중 ok 935건이 정확히 일치)으로 증명. [alg-layered-labels.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-labels.md)). 자기 루프, 그래프 래핑, 압축도 동작합니다(미션 7g: loops 패키지, 자기 루프 프로세서 4개, 브레이킹 포인트 래퍼와 단일 엣지 래퍼, `HorizontalGraphCompactor`, layered `compaction` 패키지, `ComponentsCompactor`. 오라클 행 1,627개(`full` 731, `models` 307, `scenarios` 525, `sites` 64), 기준선 JUnit 스위트 10개, 3,073건의 스윕(ok 2,997건이 정확히 일치하고 예외 76건이 양쪽에서 일치), 포팅된 arm 58개를 남기는 9-arm 배선으로 증명. [alg-layered-loops.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-loops.md)). 복합 그래프도 동작합니다(미션 7h: `compound` 패키지, `HierarchicalNodeResizingProcessor`, 마지막 arm. 오라클 행 540개(`full` 355, 트리 전체 중단점을 포함한 `models` 73, `scenarios` 88, `sites` 24), layered 골든 24개, 이슈 스위트 9개와 graph.json 메서드 3개, 1,169건의 스윕(ok 1,164건이 정확히 일치하고 예외 5건이 양쪽에서 일치)으로 증명. [alg-layered-compound.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-layered-compound.md)). 이제 layered 알고리즘은 계층 처리의 모든 모드에서 동작합니다. enum arm 59개가 포팅되었고, 보류 중인 것은 없으며, 스테이징 목록은 비어 있습니다. 이슈 #58의 `elk.stress` 케이스 세 건만 대기 중입니다(미션 8b). 다른 레이아웃 알고리즘은 아직 동작하지 않습니다(mrtree, radial, force, disco, rectpacking, spore, topdownpacking, vertiflex). 미션 8a부터 mrtree, radial, vertiflex도 동작합니다(전체 레이아웃과 중단점을 담은 ref 4개의 오라클 행 1,181개, 2,656행의 단위 벡터 ref, `trees` 골든 40개, 6/6과 2/2의 `MrTreeGraphSizeTest`와 `CenterOnRootTest`, 알고리즘마다 906건의 스윕(모든 케이스가 일치하거나 진단됨)으로 증명. 트리화된 해시 빈의 순서에 결과가 좌우되는 radial 행 두 개는 일치시키지 않고 분류했습니다. [alg-trees.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-trees.md)). 미션 8b부터 force, stress, disco도 동작합니다(전체 레이아웃과 중단점을 담은 ref 3개의 오라클 행 21,420개, `force-disco` 골든 45개, 각각 3/3인 `ForceImportTest`와 `TwoBitGridTest`, 알고리즘마다의 스윕(모든 케이스가 일치하거나 진단됨)으로 증명. Eades의 `Math.log`는 비트 단위로 정확한 fdlibm 포트입니다. [alg-force-disco.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-force-disco.md)). 미션 8c부터 rectpacking, spore(`sporeOverlap`, `sporeCompaction`), topdownpacking도 동작합니다(ref 3개의 오라클 행 2,593개, `packing` 골든 44개, 30회 실행에 해당하는 포팅된 JUnit 스위트 8개, 알고리즘마다의 스윕(결정적인 모든 케이스가 일치하거나 진단됨)으로 증명. [alg-packing.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-packing.md)). 범위 내 모든 알고리즘은 오라클에 대해 스윕되며, 알고리즘별 결과는 패리티 보고서에 게시됩니다([parity-dashboard.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/parity-dashboard.md)).

## ELK Java 및 오라클과의 관계

![ELK Java, 오라클 빌드, 골든 참조, elk-engine 사이의 관계](/diagrams/overview-1.svg)

패치 시리즈는 이 미션에서 비어 있습니다(AD-3). 골든은 커밋되어 있으므로 CI에 JVM이 필요하지 않습니다(AD-5). 비교
기준: 구조는 정확히 일치, 좌표는 1e-6 이내(AD-4).

## 주요 흐름

elk-engine이 현재 `fixed`, `box`, `random`에 대해 재현하는 ELK의 레이아웃 흐름입니다(자세한 내용은 [component-map.md](#컴포넌트-맵)와 [core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#engine-flow)).

![재귀 레이아웃 엔진을 거치는 레이아웃 호출의 흐름](/diagrams/overview-2.svg)

JSON 어댑터(`graph.json`, `ElkGraphJson`): 레이아웃 전에 임포터가 ELK JSON을 ElkGraph로 변환하고, 레이아웃 후에는 계산된
좌표와 엣지 섹션을 출력 JSON으로 되돌려 옮깁니다. 오라클 하니스도 Java 어댑터를 같은 두 단계로 사용하므로 양쪽이 같은 JSON
계약을 공유합니다.

텍스트 어댑터(`graph.text`, `ElkGraphText`): `.elkt` 텍스트는 작은 Xtext 부분집합(`src/xtext`) 위에 직접 작성한 파서, 링커,
검증기를 거쳐 ElkGraph로 로드되며, ElkGraph는 다시 `.elkt`로 직렬화됩니다. 진입점은 내부용입니다.
[elk-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-text.md)를 참고하십시오.

텍스트 JSON 어댑터(`graph.json.text`, `ElkGraphJsonText`): `.elkj` 텍스트는 같은 Xtext 부분집합과 직접 작성한 파서로 로드되며,
Xtext의 `LazyLinker`처럼 지연해서 링크합니다. 엣지 끝점은 읽을 때 해석되는 EMF 프록시(`src/emf`)입니다. ElkGraph는 문법 전용
라이터를 통해 다시 `.elkj`로 직렬화됩니다. 진입점은 내부용입니다.
[elk-json-text.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/elk-json-text.md)를 참고하십시오.

랜덤 그래프 생성기(`core.debug.grandom`, `GRandomText`): `.elkr` 텍스트는 같은 Xtext 부분집합(`src/xtext`) 위에 직접 작성한
렉서와 파서로 파싱되며, `RandomGraphGenerator`가 JVM `Random`과 정확히 같은 수열로 구성을 ElkGraph로 변환합니다. 시드가 있는
출력은 오라클과 바이트 단위로 일치하며 `test/corpus/generated/*.json` 파일 아홉 개를 재현합니다. 시드가 없는 경로(엣지 레이블
텍스트, 계층을 넘나드는 셔플, 시드 누락)는 불변 조건으로만 검사합니다. 진입점은 내부용입니다.
[grandom.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/grandom.md)를 참고하십시오.

## 기술 스택

| 관심사        | 선택                                                         |
| ------------- | ------------------------------------------------------------ |
| 언어          | TypeScript 7.0.2(네이티브 `tsc`), ES2022, NodeNext, `strict` |
| 테스트        | vitest 5.0.x와 `@vitest/coverage-v8`(임계값 90%)             |
| 번들링        | esbuild 0.28.x                                               |
| 스크립트 실행 | tsx                                                          |
| 런타임        | Node 22 이상. `src/` 자체는 브라우저에서 안전하게 동작합니다 |
| 오라클 전용   | ELK의 Tycho 빌드를 위한 Maven 3.9+와 JDK 21(대체로 JDK 17)   |

## 핏니스 제약 (AD-8)

번들 임포트 방향은 `test/architecture/bundle-deps.json`을 따릅니다. 모든 코드 파일에 SPDX 헤더가 있어야 하고, `src/`에는
Node 내장 모듈이나 `process.env`가 없어야 하며, 허용 목록 밖에는 모듈 수준의 변경 가능한 `let`이 없어야 합니다.

## 문서 및 릴리스 툴체인

로드맵 행 12에서 추가되었습니다. 결정 DP1부터 DP9는
[`plans/docs-publish-prep/decisions.md`](https://github.com/knowvah/elk-engine/blob/main/plans/docs-publish-prep/decisions.md)에
있습니다. `1.0.0`은 2026-11-23에 게시되었습니다.

| 구성 요소     | 설명                                                                                                                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 내보내기 표면 | 승인됨(2026-11-23). [public-api.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/public-api.md)에 나열되어 있으며 `src/index.test.ts`가 `src/index.ts`와 같게 유지합니다. 첫 npm 게시인 `1.0.0`에서 동결됩니다(AD-14) |
| API 레퍼런스  | `npm run docs:api`: 비공개 패키지 `tools/typedoc/`의 typedoc을 자체 TypeScript 6으로 실행합니다(typedoc에는 TypeScript 7 릴리스가 없습니다, AD-6). 출력은 생성되는 `/reference/`                                                           |
| 예제          | `test/docs/examples/*.ts`. 사이트의 시작하기 페이지에 스니펫으로 표시되며 오라클 ref(`test/golden/refs/elk-examples/`, `regen-goldens.sh --set examples`)와 비교됩니다                                                                     |
| 링크 검사     | `npm run docs:linkcheck`: 빌드된 사이트에 대한 linkinator. 내부 링크와 프래그먼트를 CI에서 검사하고, 외부 링크는 매주 검사합니다(`links.yml`)                                                                                              |
| 패키지 리허설 | `npm run pack:smoke`: 패키징하고, 파일 목록을 확인하고, 깨끗한 프로젝트에 오프라인으로 설치하고, 임포트하고, 그곳에서 예제를 레이아웃한 뒤 해당 오라클 ref와 비교합니다                                                                    |
| 릴리스        | semantic-release 구성과 `release.yml`. `main`에 push할 때마다 실행됩니다. 런북은 [`PUBLISHING.md`](https://github.com/knowvah/elk-engine/blob/main/PUBLISHING.md)                                                                          |

# 컴포넌트 맵

| 다이어그램     | 보여 주는 내용                               |
| -------------- | -------------------------------------------- |
| 1. 번들 의존성 | 범위 내 번들 13개와 그 `Require-Bundle` 엣지 |
| 2. 코어 런타임 | 레이아웃 알고리즘이 엔진에 연결되는 방식     |

이름에서는 `org.eclipse.elk.` 접두사를 생략합니다. 범위: [인벤토리](/guide/inventory)(영어).

## 1. 범위 내 번들 의존성

기준 자료: `test/architecture/bundle-deps.json`. 이 파일은 `tools/bundle-deps.ts`가 각 번들의 `META-INF/MANIFEST.MF`에서
도출하며 핏니스 테스트가 강제합니다(AD-8).
다이어그램의 엣지는 **32개**로, JSON의 `requires` 항목 32개와 같습니다(graph.json x 2,
core x 1, alg.common x 2, 알고리즘 아홉 개 x 3). 서드파티 요구 사항(Guava, EMF, Gson, Xtend 라이브러리)과 범위 밖 번들은
생략했습니다. 화살표 `A --> B`는 A가 B를 요구한다는 뜻이며, 따라서 A의 디렉터리가 B의 디렉터리를 임포트할 수 있습니다.
`src/java`는 어디서든 임포트할 수 있으므로 표시하지 않았습니다.

![범위 내 ELK 번들 13개 사이의 의존성](/diagrams/component-map-1.svg)

다른 알고리즘을 요구하는 알고리즘은 없습니다. 알고리즘 사이의 유일한 공통 의존성은 `alg.common`입니다. Java 매니페스트에 같은
엣지가 없는 한, 알고리즘 디렉터리 사이에 새 임포트를 추가하면 핏니스 테스트가 실패합니다.

## 2. 코어 런타임 구성 요소

클래스 위치는 별도 표기가 없으면 `$ELK_SOURCE_DIR/plugins/org.eclipse.elk.core/src/org/eclipse/elk/core` 아래이며,
고정된 커밋에서 확인했습니다.

| 클래스                            | 경로                                | 역할                                                                |
| --------------------------------- | ----------------------------------- | ------------------------------------------------------------------- |
| `IGraphLayoutEngine`              | `IGraphLayoutEngine.java`           | `layout(ElkNode, IElkProgressMonitor)`                              |
| `RecursiveGraphLayoutEngine`      | `RecursiveGraphLayoutEngine.java`   | 계층을 순회하며 각 수준에서 프로바이더를 실행합니다                 |
| `AbstractLayoutProvider`          | `AbstractLayoutProvider.java`       | 모든 알고리즘의 기반 클래스. `IGraphLayoutEngine`을 구현합니다      |
| `LayoutMetaDataService`           | `data/LayoutMetaDataService.java`   | 알고리즘, 옵션, 카테고리 데이터의 싱글턴 레지스트리                 |
| `ILayoutMetaDataProvider`         | `data/ILayoutMetaDataProvider.java` | `apply(Registry)`. 알고리즘 번들마다 하나씩 생성됩니다(`.melk`에서) |
| `LayoutAlgorithmData`             | `data/LayoutAlgorithmData.java`     | 알고리즘 ID와 프로바이더의 `getInstancePool()`                      |
| `IProperty` / `MapPropertyHolder` | `graph/.../graph/properties/`       | 타입이 지정된 옵션 키와 `getProperty` 뒤의 맵 홀더                  |
| `ElkNode` (ElkGraph)              | `graph/.../graph/ElkNode.java`      | 그래프 모델. 요소는 `EMapPropertyHolder`입니다                      |

미션 5a에서 포팅됨([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md)):
`RecursiveGraphLayoutEngine`(`RecursiveGraphLayoutEngineTopdown`과 분리, M17), `LayoutAlgorithmResolver`, 그리고
`AbstractLayoutProvider`의 서브클래스인 `FixedLayoutProvider`, `BoxLayoutProvider`, `RandomLayoutProvider`.
`LayoutMetaDataService`, `LayoutAlgorithmData`, 프로퍼티 타입은 먼저 포팅되었습니다(미션 2와 3). 미션 5b
([core-engine.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/core-engine.md#mission-5b))에서 번들이
완성되었습니다: `AlgorithmAssembler`와 `LayoutProcessorConfiguration`(모든 알고리즘 번들이 쓰는 파이프라인),
`LayoutConfigurator`, `ElkSpacings`, `ElkMath` 섹션, `ElkGraphAdapters`, `util/selection/*`, `comments/*`. 이 미션의 JDK
심은 `src/java/awt/geom`(`Rectangle2D`)과 `src/java/util/regex`(`Pattern`, `WordBoundary`)이며, `src/java/lang`의
`JavaCharacter`와 나란히 있습니다. 이들은 `awt.json`, `regex.json`, `character.json`, `regex-boundary.json`으로 증명됩니다.
미션 6a와 6b([alg-common.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/alg-common.md))에서 `alg.common`
전체를 포팅했으며, 6b에서는 `nodespacing`과 `NodeMicroLayout`이 추가되어 326행 `NodeMicroLayout` 오라클 재생으로 증명되었습니다.

![ELK 코어 런타임의 클래스 관계](/diagrams/component-map-2.svg)

알고리즘이 연결되는 방식은 다음과 같습니다.

1. 알고리즘 번들은 `AbstractLayoutProvider`의 서브클래스(예: `alg.layered`의 `LayeredLayoutProvider`)와, 알고리즘 ID,
   옵션, 지원 기능을 선언하는 `.melk` 파일을 제공합니다.
2. `.melk` 컴파일러가 `ILayoutMetaDataProvider`와 옵션 클래스를 생성합니다. 이 프로바이더의 `apply(Registry)`는
   `LayoutAlgorithmData`를 등록하며, 그 인스턴스 풀이 프로바이더를 생성합니다.
3. `LayoutMetaDataService`가 프로바이더를 수집합니다. `LayoutAlgorithmResolver`는 `algorithm` 옵션을 바탕으로 각 노드에
   알고리즘 ID를 설정합니다.
4. `RecursiveGraphLayoutEngine.executeAlgorithm`은 노드의 `LayoutAlgorithmData.getInstancePool()`에서 프로바이더를
   가져와 `layout(layoutNode, progressMonitor)`를 호출한 뒤 반환합니다(실패한 경우에는 `dispose()`를 호출합니다).

elk-engine에서는 `.melk` 단계를 생성기로 대체하고(AD-12, [melk-codegen.md](https://github.com/knowvah/elk-engine/blob/main/docs/architecture/melk-codegen.md)), ElkGraph는 일반 TS 클래스가 됩니다(AD-11). TS 파일과의
대응은 [포팅 맵](/guide/port-map)(영어), 규칙은 [번역 규칙](/guide/translation-rules)(영어)을 참고하십시오.
