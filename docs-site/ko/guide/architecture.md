---
title: 아키텍처
sourceHash: 1cec2d8ec875e99d0f3569836b83ae0639eb68e0219f99b1193d90a8c503b9a0
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# elk-engine 아키텍처 개요

| 문서                                                | 내용                                                   |
| --------------------------------------------------- | ------------------------------------------------------ |
| [inventory.md](/guide/inventory)                    | 모든 ELK 번들: 목적, LOC, 생성된 소스, 범위            |
| [port-map.md](/guide/port-map)                      | Java 패키지와 `src/` 모듈의 대응                       |
| [component-map.md](#컴포넌트-맵)                    | 범위 내 번들 의존성, 핵심 런타임 구성 요소             |
| [../translation-rules.md](/guide/translation-rules) | Java에서 TypeScript로의 규칙                           |
| [../conformance.md](/ko/conformance)                | 오라클 비교 기준과 절차(이 미션의 후반부에 추가됩니다) |

## elk-engine이란

`@knowvah/elk-engine`은 Eclipse Layout Kernel(ELK)을 충실하게 포팅한 TypeScript 구현입니다. 고정된 커밋
`8aaa3c145c2a18a38aabbc725aa3791ddc517a76`의 Java가 명세입니다(AD-1, AD-2). 이것은 라이브러리로서 브라우저에서 안전하게
동작하고, 런타임 의존성이 없으며, Java나 WASM도 쓰지 않습니다. 공개 계약은 ElkGraph 객체 모델과 `ElkGraphUtil`
팩토리이며, ELK JSON은 I/O 어댑터입니다(AD-14). 직접 작성된 코드 약 134,600줄에 해당하는 번들 13개가 범위에 포함됩니다
(인벤토리 참고). 이 미션은 기반 구조만 제공하며, 아직 포팅된 레이아웃 알고리즘은 없습니다.

## ELK Java 및 오라클과의 관계

![ELK Java, 오라클 빌드, 골든 참조, elk-engine 사이의 관계](/diagrams/overview-1.svg)

패치 시리즈는 이 미션에서 비어 있습니다(AD-3). 골든은 커밋되어 있으므로 CI에 JVM이 필요하지 않습니다(AD-5). 비교
기준: 구조는 정확히 일치, 좌표는 1e-6 이내(AD-4).

## 주요 흐름

elk-engine이 재현하는 ELK의 레이아웃 흐름입니다(자세한 내용은 [component-map.md](#컴포넌트-맵)).

![재귀 레이아웃 엔진을 거치는 레이아웃 호출의 흐름](/diagrams/overview-2.svg)

JSON 어댑터(`graph.json`, `ElkGraphJson`): 레이아웃 전에 임포터가 ELK JSON을 ElkGraph로 변환하고, 레이아웃 후에는 계산된
좌표와 엣지 섹션을 출력 JSON으로 되돌려 옮깁니다. 오라클 하니스도 Java 어댑터를 같은 두 단계로 사용하므로 양쪽이 같은 JSON
계약을 공유합니다.

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

elk-engine에서는 `.melk` 단계를 생성기로 대체하고(AD-12, 향후 미션), ElkGraph는 일반 TS 클래스가 됩니다(AD-11). TS 파일과의
대응은 [포팅 맵](/guide/port-map)(영어), 규칙은 [번역 규칙](/guide/translation-rules)(영어)을 참고하십시오.
