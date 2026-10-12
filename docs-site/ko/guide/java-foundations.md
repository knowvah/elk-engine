---
title: Java 기반
sourceHash: c7954cf57f261df3e6e03a8fae3dba0bf0eec8b9b945c1f54f1f40e4903a0a6a
---

<!-- SPDX-License-Identifier: EPL-2.0 -->

# Java 기반

ELK의 결과는 Java 런타임 동작에 좌우됩니다. 32비트 정수 랩어라운드, `float` 반올림, `HashMap`
순회 순서, `Random` 수열, 숫자를 텍스트로 변환하는 방식이 그것입니다. java-foundations 미션
(2026-10-11 완료)은 이러한 동작을 재현하는 심(shim)과, 이를 증명하는 JVM에서 기록한 벡터를
제공했습니다.

심은 Javadoc의 명세만으로 구현합니다. OpenJDK 소스는 읽거나 복사하지 않습니다(AD-9). 각 심은 실제
JVM에서 생성한 벡터로 검증합니다.

## 심

| 영역          | 위치                     | 내용                                                                                                                                                                                                   |
| ------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 숫자와 텍스트 | `src/java/lang/`         | `Int64`, `Float32`, `JavaString`, `JavaInteger`, `JavaDouble`, `DoubleToString`                                                                                                                        |
| Math          | `src/java/lang/JavaMath` | `l2i` (`long`의 `(int)`)                                                                                                                                                                               |
| 예외          | `src/java/lang/`         | 예외 클래스 여섯 개                                                                                                                                                                                    |
| 컬렉션        | `src/java/util/`         | `HashStrategy`, `JavaHashMap`, `JavaHashSet`, `PriorityQueue`                                                                                                                                          |
| Guava 대체    | `src/guava/`             | 파일 20개: `Lists`, `Iterables`, `Iterators`, `Strings`, `DoubleMath`, `Joiner`, `Splitter`, `Range`, `Table`, `ImmutableMap`, `ImmutableSet`, `Sets`, `Maps`, `HashBiMap`, `Multimap` 및 구현 다섯 개 |

`Math.log10`은 심이 필요하지 않습니다. 네이티브 V8 함수가 기록된 1264개 행과 모두 일치합니다. Guava는
의존성이 아니며, `src/guava/`에는 작은 로컬 헬퍼가 있습니다.

## JVM 벡터

벡터는 `tools/vectors/JavaVectors.java`가 기록합니다(Guava 33.3.0-jre는 `GuavaVectors.java`). 벡터는
고정되어 있으며, 다시 생성하면 바이트 단위로 동일한 파일이 만들어집니다.

| 그룹   | 행 또는 스크립트                                                                                           |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| 숫자   | `l2i` 78, `Float32` 2704, double에서 float 72, `log10` 1264, 0으로 나누기 40, `Int64` 4056                 |
| 해시   | `String.hashCode` 229, `Double.hashCode` 65, `doubleToLongBits` 65, `Integer.reverse` 36, KVector 해시 256 |
| 텍스트 | `Double.toString` 14,939, `parseDouble` 96, `Integer.valueOf` 33                                           |
| Random | 수열 중간의 `setSeed`: 시드 4개, 각각 연산 25개                                                            |
| 컬렉션 | `HashMap` 1206개, `HashSet` 1172개, `PriorityQueue` 231개 스크립트                                         |
| Guava  | 스크립트 1518개, 단계 25,611개                                                                             |

## 알려진 한계

- 키의 해시 코드가 같고 `Comparable`이 아닌 `HashMap` 항목의 JVM 순서는 객체 아이덴티티를 따르므로
  재현할 수 없습니다. 이에 의존하는 적합성 케이스에는 알려진 차이 항목이 필요합니다.
- 아이덴티티에 의존하는 `HashMap` 및 `HashSet` 스크립트는 벡터에서 건너뛰며,
  `PriorityQueue(Collection)` 스크립트는 ELK에 호출하는 곳이 없으므로 건너뜁니다.
- `Sets.newTreeSet`은 스냅샷을 반환합니다. `ScanlineOverlapCheck`와 `ScanlineConstraintCalculator`를
  포팅하기 전에 라이브 `TreeSet` 심이 필요합니다.

컬렉션 변환 규칙은 [컬렉션 규칙](/guide/collections-rules) 페이지에 있습니다. [로드맵](/guide/roadmap)의
다음 미션은 속성 시스템과 ElkGraph 모델입니다.
