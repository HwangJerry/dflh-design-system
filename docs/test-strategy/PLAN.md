# 테스트 보강 계획 (앱 + 백엔드)

- 작성: 2026-09-27
- 범위: `dflh-saf-v2/backend`, `dflh-saf-v2-kotlin`, `dflh-saf-v2-swift`
- 진행 방식: Claude가 설계·작업 명세·리뷰, Codex가 단위 작업 구현(`run-task.sh`), 각 저장소 `test/*` 브랜치에서 작업 후 리뷰를 거쳐 main에 머지

## 0. 현재 상태 (2026-09-27 측정)

| | iOS | Android | 백엔드 |
|---|---|---|---|
| 단위 테스트 | 23파일 · 271개 | 59파일 · 404개 | 220파일 · 커버리지 41.4% (service 61.5, middleware 51.2, handler 34.4, repository 28.3) |
| UI/계측 | XCUITest 1파일(12 시나리오, 시각 모드 위주) | androidTest 31파일(에뮬레이터) | — |
| 앱↔백엔드 통합 | 없음 | 없음 | 일부 도커 MariaDB 통합(환경변수로 켤 때만) |
| 커버리지 도구 | 없음 | 없음 | `go test -cover` |

테스트 용이성 평가 요약: 네트워크 계층은 세 곳 모두 주입 가능(상). iOS `AppState`와 화면 속 로직, 백엔드 시계·외부 연동 주입이 약함. **최대 블로커는 백엔드 테스트 DB의 기준 스키마 부재**(레거시 `WEO_*` 테이블 DDL이 저장소에 없음).

## 1. 결정 사항 (2026-09-27, 사용자 "추천대로")

| # | 결정 |
|---|---|
| D1 | API 계약 검증은 **백엔드가 실제 응답을 골든 JSON 샘플로 저장**하고 두 앱이 실제 DTO로 디코딩하는 방식. OpenAPI는 도입하지 않음 |
| D2 | E2E는 **로컬 docker compose 백엔드**(MariaDB 10.1.38 + 서버 + 심사용 SMS 번호 + 합성 시드) |
| D3 | Android 화면 테스트는 **Robolectric(JVM)** 우선. 전체 앱·WebView·스크린샷 증거 테스트만 에뮬레이터 유지 |
| D4 | 구현: Claude 설계·리뷰, Codex 단위 구현 |
| D5 | **Tier 1 E2E 통과를 Android production 승격의 필수 조건**으로 둠 |
| O1 | **해결 (2026-09-27):** 로컬 `*production-schema*.sql` 파일은 쓰지 않는다(사용자 지시). 운영(`daeil-prod`)에서 읽기 전용 `mysqldump --no-data`로 스키마만 추출했다: MariaDB 10.1.38, 테이블 103개, 데이터 행 0, 적용 마이그레이션 001–077, `AUTO_INCREMENT` 값과 `DEFINER` 제거. 테스트 기준 스키마로 백엔드 `migrations/testdata/`에 두고(TS06), 이후 마이그레이션은 그 위에 적용한다 |

## 2. 테스트 층

| 층 | 검증 대상 | iOS | Android | 백엔드 |
|---|---|---|---|---|
| L1 앱 단위 | 상태 흐름, 디코딩, 에러 처리 | XCTest + 공용 `StubURLProtocol` | JUnit + MockWebServer + Turbine | service 단위(기존) |
| L2 앱 화면 | 상태별 렌더링, 상호작용 | XCUITest(핵심만) | Robolectric Compose | — |
| L3 API 계약 | 응답 형태 ↔ DTO | 골든 JSON 디코딩 | 골든 JSON 디코딩 | 실제 라우터로 골든 생성·정규화 |
| L4 백엔드 통합 | HTTP → 서비스 → 저장소 → 실제 DB | — | — | 도커 MariaDB 10.1.38, 컨테이너 1개·테스트별 DB |
| L5 E2E | 실제 앱 + 로컬 백엔드 | XCUITest(로컬 URL) | 계측 테스트(10.0.2.2) | docker compose |

## 3. 우선순위

| 등급 | 흐름 |
|---|---|
| Tier 1 | 가입 + SMS 인증 + 동의, ID 로그인·세션 유지·토큰 갱신, 소셜 연동, 계정 삭제, 강제 업데이트(426/게이트) |
| Tier 2 | 쪽지(송수신·실시간), 피드(조회·좋아요·댓글·신고), 동문 검색, 프로필·명함 |
| Tier 3 | 기부, 푸시 라우팅, 알림 설정, 레이아웃 |

목표(범위별): Tier 1은 API마다 L3 골든 + L4 통합, 앱 상태 로직 커버리지 70% 이상, 흐름마다 E2E 1개. Tier 2는 L3 + 상태 로직, E2E는 쪽지 1개.

## 4. 작업 단위

| 단계 | 작업 | 저장소 | 상태 |
|---|---|---|---|
| 1 기반 | TS01 iOS 테스트 실행 가드 + 로컬 base URL + ATS 예외 | swift | ✅ 머지 `b2bb707` (286 통과, Debug/Release Info.plist 검증) |
| 1 기반 | TS02 iOS 공용 스텁·픽스처 로더 + 커버리지 스크립트 | swift | 진행 중 |
| 1 기반 | TS03 Android 테스트 의존성 + Kover + MockWebServer 예시 | kotlin | ✅ 머지 (415 통과, 라인 34.6%·분기 22.9%) |
| 1 기반 | TS04 백엔드 MariaDB 테스트 하네스 추출 + 골든 정규화 헬퍼 | backend | ✅ 머지 `71650d5` (914 통과·39 스킵, 커버리지 41.3%, 도커 격리 테스트 통과) |
| 1 기반 | TS05 통합 실행 스크립트 `test-all.sh` + 커버리지 요약 | umbrella | 대기(TS01–04 후) |
| 2 계약 | TS06 기준 스키마 반입 + 하네스 연결, TS07 Tier 1 골든 샘플 생성(백엔드) → TS08 iOS/Android 디코딩 테스트 | 전체 | TS04 머지 후 |
| 3 구조 | iOS `AppState` 서비스 주입·폼 ViewModel 분리, Android 앱 셸 상태 홀더, 백엔드 라우터 export·시계 주입 | 전체 | 2단계와 병행 |
| 4 통합 | Tier 1 L4 백엔드 통합 테스트, docker compose 로컬 백엔드 | backend | TS06 후 |
| 5 E2E | Tier 1 E2E + 쪽지 | 전체 | 4단계 후 |

## 5. 기록

- 2026-09-27: 계획 작성, 1단계 작업 명세(TS01–TS05) 작성. TS01·TS03·TS04 Codex 실행.
- 2026-09-27: O1 해결. 운영 스키마를 읽기 전용으로 추출(테이블 103, 데이터 0, 마이그레이션 077까지).
