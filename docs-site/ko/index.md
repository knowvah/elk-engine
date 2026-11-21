---
layout: home
sourceHash: 13520b5cd8cfe1522d01c0b3ec7b47afad3fce1879618a87194b477c8ef962ec
hero:
  name: '@knowvah/elk-engine'
  text: 순수 TypeScript로 만든 Eclipse ELK
  tagline:
    Eclipse Layout Kernel을 충실하게 포팅한 TypeScript 구현입니다. Java도 WASM도 없습니다. 레이아웃 알고리즘을 일반
    TypeScript로 다시 구현했으며 Java 구현과 대조하여 검증했습니다.
  actions:
    - theme: brand
      text: 개요
      link: /ko/guide/overview
    - theme: alt
      text: 쇼케이스
      link: /ko/showcase/
    - theme: alt
      text: GitHub에서 보기
      link: https://github.com/knowvah/elk-engine
features:
  - title: ELK Java에 충실
    details:
      고정된 ELK 커밋의 Java가 곧 명세입니다. 모든 분기를 포팅하며, JUnit 테스트도 해당 테스트가 검증하는 코드와 함께
      포팅합니다.
  - title: 오라클로 검증
    details: 출력을 소스에서 빌드한 ELK와 비교합니다. 구조는 정확히 일치하고, 좌표는 1e-6 이내에서 일치합니다.
  - title: 브라우저 네이티브, 런타임 의존성 없음
    details: 라이브러리 코드에 Java, WASM, Node 내장 모듈이 없습니다. 번들링하여 바로 배포할 수 있습니다.
  - title: 1.0 이전
    details: 범위에 포함된 모든 ELK 레이아웃 알고리즘을 포팅했으며, 소스에서 빌드한 ELK와 대조하여 검증했습니다. 1.0
      이전에는 API가 바뀔 수 있습니다.
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

::: warning 1.0 이전
범위에 포함된 모든 ELK 레이아웃 알고리즘을 포팅했으며, 소스에서 빌드한 ELK와 대조하여 검증했습니다. 결과는
[패리티 보고서](/parity)(영어)에 있습니다. 공개 내보내기 표면은 승인되었지만 아직 `src/index.ts`에 반영되지 않았으므로,
패키지 진입점은 아직 공개 항목을 내보내지 않습니다. 버전은 1.0까지 0.x를 유지하며, 그 전까지는 API가 바뀔 수 있습니다.
다음 계획은 [로드맵](/guide/roadmap)(영어)을 참고하십시오.
:::

## 경로 선택

| 하고 싶은 일                                | 시작할 곳                                                             |
| ------------------------------------------- | --------------------------------------------------------------------- |
| 프로젝트가 무엇이고 무엇이 아닌지 이해하기  | [개요](/ko/guide/overview)                                            |
| 구성 요소가 어떻게 맞물리는지 보기          | [아키텍처](/ko/guide/architecture)                                    |
| "Java와 일치한다"는 말의 의미 알기          | [적합성](/ko/conformance)                                             |
| Java 패키지가 포팅에서 어디에 놓이는지 찾기 | [포팅 맵](/guide/port-map)(영어) · [인벤토리](/guide/inventory)(영어) |
| Java에서 TypeScript로의 규칙 익히기         | [번역 규칙](/guide/translation-rules)(영어)                           |
| 어떤 Java 런타임 동작을 다루는지 보기       | [Java 기반](/ko/guide/java-foundations)                               |
| 계획된 작업 보기                            | [로드맵](/guide/roadmap)(영어)                                        |
| 기여하기                                    | [기여하기](/ko/guide/contributing)                                    |
