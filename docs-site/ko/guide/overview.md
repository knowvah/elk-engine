---
title: 개요
sourceHash: bb2ac033ff5e11b5eeb097e9f6ec4fde43df251e5cde278b11990d2e9cd671aa
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# 개요

`@knowvah/elk-engine`은 Java 그래프 레이아웃 라이브러리인 [Eclipse Layout
Kernel](https://www.eclipse.org/elk)(ELK)을 충실하게 포팅한 TypeScript 구현입니다. Java도 WASM도 없습니다. 레이아웃
알고리즘을 일반 TypeScript로 다시 구현했으며 Java 구현과 대조하여 검증했습니다.

::: warning 프리알파
아직 포팅된 레이아웃 알고리즘이 없습니다. 저장소에는 툴체인, 아키텍처 문서, 검증 기반 구조, Java 런타임 심이 있습니다.
`src/index.ts`는 아직 공개 항목을 내보내지 않습니다. 알고리즘이 추가되는 순서는 [로드맵](/guide/roadmap)(영어)을
참고하십시오.
:::

## Java가 곧 명세입니다

고정된 ELK 커밋 `8aaa3c145c2a18a38aabbc725aa3791ddc517a76`의 Java 소스가 정본 명세입니다. 포팅은 이를 면밀히 따릅니다.

- 알고리즘을 최적화하거나 단순화하지 않습니다. Java가 중복처럼 보여도 그 중복을 그대로 유지합니다.
- 모든 분기를 포팅하며, TypeScript 때문에 불가피한 경우가 아니면 메서드 경계를 유지합니다.
- JUnit 테스트도 해당 테스트가 검증하는 코드와 함께 포팅합니다.
- ELK가 의존하는 Java 런타임 동작(32비트 정수 연산, `HashMap` 순회 순서, `Random` 시퀀스)은 심(shim)으로 재현합니다.
  [Java 기반](/ko/guide/java-foundations)을 참고하십시오.

[번역 규칙](/guide/translation-rules)(영어)은 각 Java 개념이 TypeScript로 어떻게 대응되는지 정리합니다.

## 오라클을 통한 검증

오라클은 고정된 커밋의 분리된 git 워크트리에서 소스로부터 빌드한 업스트림 ELK입니다. 포팅의 출력을 오라클의 출력과
비교합니다.

- ID, 요소 수, 엣지 섹션 토폴로지, 벤드 포인트 수, 숫자가 아닌 값은 정확히 일치해야 합니다.
- 숫자 좌표와 크기는 절대 허용 오차 `1e-6` 이내에서 일치해야 합니다.

선별한 오라클 출력은 골든 참조로 커밋되어 있으므로 테스트를 실행하는 데 JVM이 필요하지 않습니다. 전체 절차는
[적합성](/ko/conformance) 페이지에 있습니다.

## 공개 계약

공개 API는 ElkGraph 객체 모델과 `ElkGraphUtil` 팩토리가 됩니다. ELK JSON은 핵심 모델이 아니라 I/O 어댑터입니다. 첫 npm
게시와 함께 이 표면이 고정됩니다.

## 런타임 제약

- `src/`는 브라우저에서 안전하게 동작합니다. Node 내장 모듈과 `process.env`를 쓰지 않으며 ES 모듈만 사용합니다.
- 런타임 의존성은 없습니다.

## 다음으로 볼 곳

- [아키텍처](/ko/guide/architecture): 오라클, 번들, 레이아웃 엔진이 어떻게 맞물리는지 설명합니다.
- [포팅 맵](/guide/port-map)(영어)과 [인벤토리](/guide/inventory)(영어): 어떤 Java 패키지가 어떤 모듈에 대응되는지
  설명합니다.
- [기여하기](/ko/guide/contributing): 게이트와 작업 흐름을 설명합니다.
