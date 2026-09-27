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
| 1 기반 | TS02 iOS 공용 스텁·픽스처 로더 + 커버리지 스크립트 | swift | ✅ 머지 `7b6fc06` (TS05 재검증: 290 통과, Sources/App 라인 17.63%) |
| 1 기반 | TS03 Android 테스트 의존성 + Kover + MockWebServer 예시 | kotlin | ✅ 머지 `47c8716` (TS05 재검증: 415 통과, 라인 34.63%·분기 22.94%) |
| 1 기반 | TS04 백엔드 MariaDB 테스트 하네스 추출 + 골든 정규화 헬퍼 | backend | ✅ 머지 `71650d5` (914 통과·39 스킵, 커버리지 41.3%, 도커 격리 테스트 통과) |
| 1 기반 | TS05 통합 실행 스크립트 `test-all.sh` + 커버리지 요약 | umbrella | ✅ 머지 (3개 스위트 통과, 러너 검증 15개 통과) |
| 2 계약 | ✅ TS06 기준 스키마 반입 + 하네스 연결(`mariadb.ProdBaseline`, 운영 InnoDB·sql_mode 옵션 반영). ✅ TS07 Tier 1 골든 14개(`327ab31`, 실제 라우터·운영 스키마, 24 테스트, 커버리지 42.0→43.3%) → ✅ TS08 iOS/Android 계약 테스트(각 14개, 실제 저장소·API 클라이언트 경로, `sync-golden.sh --check`를 test-all 첫 단계로) | 전체 | ✅ 2단계 완료 |
| 3 구조 | ✅ TS10 iOS `AppState` 서비스 주입(`a359de3`, 322 통과, AppState 46→54%) → ✅ TS13 쪽지·피드 ViewModel 분리(380 통과, 쪽지 4.9→18.2%, 피드 3.4→13.2%, ViewModel 96–99%, 화면 픽셀 비교 동일) → 폼 ViewModel 분리, Android 앱 셸 상태 홀더, 백엔드 시계 주입 | 전체 | 진행 중 |
| 4 통합 | Tier 1 L4 백엔드 통합(TS07로 일부 완료), ✅ TS09 docker compose 로컬 백엔드(`03cc5c3`, smoke 4/4) | backend | ✅ |
| 5 E2E | ✅ TS11 Android Tier 1 E2E 6/6(`scripts/e2e-android.sh`, 에뮬레이터+로컬 백엔드, Claude 재실행으로 확인), TS12 iOS Tier 1 E2E(TS10 후), 쪽지 E2E | 전체 | 진행 중 |

## 5. 기록

- 2026-09-27: TS08 구현 완료(각 앱 `test/ts08-contract-tests`, umbrella `test/ts08-golden-sync`, 머지 전). TS07 골든 14개를 앱마다 실제 DTO/클라이언트로 검증한다. iOS 304 통과(기존 290 + 계약 14), Android 429 통과(기존 415 + 계약 14), 실패·스킵 0. `test-all.sh --only ios` / `--only android` 모두 첫 `contract-sync` 행 포함 통과. 동기화/무쓰기 검사·실패 후 러너 계속 실행 등 합성 스크립트 검증 6개 통과(`python3 docs/test-strategy/test-sync-golden.py -v`). 소비 중인 DTO 계약 불일치는 없다. 기존 가입 응답 무시 경로와 iOS 삭제 영수증 웹 시트 범위는 각 앱 `docs/operations/UNIT_TESTS.md`에 기록했다. 앱 동작·백엔드·디자인 시스템 변경 없음.
- 2026-09-27: 계획 작성, 1단계 작업 명세(TS01–TS05) 작성. TS01·TS03·TS04 Codex 실행.
- 2026-09-27: 출발점 커버리지 — 백엔드 41.3%(문장), Android 라인 34.6%·분기 22.9%, iOS Sources/App 라인 17.6%(Feed 3%, Message 4.5%, Alumni 8.6%, Shared 0%가 가장 낮음).
- 2026-09-27: TS11 머지. Android Tier 1 E2E 6개 통과(로그인·세션 유지, 비밀번호 오류, SMS 가입→승인 대기, 승인 대기 로그인, 계정 삭제, 강제 업데이트 화면). D13 때문에 Debug에서는 서버 426 경로 대신 정책 판정·차단 화면을 검증. 재실행 중 스크립트의 `rg` 의존을 발견해 `grep`으로 수정. **D5 조건(Tier 1 E2E 통과) 충족.**
- 2026-09-27: TS13 머지. ViewModel 4개로 로직 이동, 전송·재시도·실시간 흐름은 원본과 줄 단위로 동일함을 리뷰로 확인.
- 2026-09-27: TS10 머지. 주입은 됐지만 쪽지 4.9%·피드 3.4%로 거의 그대로 — 로직이 화면 코드 안에 있기 때문. TS13으로 ViewModel 분리.
- 2026-09-27: TS08 머지. iOS 304·Android 429 통과. 두 앱 모두 14개 골든을 실제 DTO로 디코딩 성공 — 현재 Tier 1 API 계약 불일치 없음. 2단계 완료.
- 2026-09-27: TS07 머지. Tier 1 골든 14개를 실제 라우터로 생성(가입→SMS→로그인→갱신→내 정보→426→계정 삭제). 두 번 실행해 안정성 확인. TS08 착수.
- 2026-09-27: TS06 머지. 운영 스키마(테이블 103, 트리거 7, 마이그레이션 001–077)를 테스트 DB에 그대로 재현. 운영 마이그레이션 해시 77개가 저장소 파일과 모두 일치함을 확인. 컨테이너를 운영과 같은 `innodb_file_format=Barracuda`, `innodb_large_prefix=ON`, `sql_mode`로 기동하도록 수정(기본값으로는 DYNAMIC 테이블의 긴 인덱스 생성 실패).
- 2026-09-27: O1 해결. 운영 스키마를 읽기 전용으로 추출(테이블 103, 데이터 0, 마이그레이션 077까지).
- 2026-09-27: TS05 전체 실행 통과(도커 비활성). 백엔드 최상위 테스트 914 통과·39 스킵, 하위 테스트 포함 1,400 통과·46 스킵, 문장 41.3%. Android 415 통과, 라인 34.63%(4,466/12,896)·분기 22.94%(2,079/9,062). iOS 290 통과, Sources/App 라인 17.63%(4,546/25,786). 순서·실패 후 계속 실행·선택 실행·도커 플래그·오래된 보고서 거부 등 합성 러너 검증 15개 통과.

## 6. 전체 테스트 실행 (TS05)

워크스페이스 루트에서 실행한다. 스크립트는 다른 작업 디렉터리에서도 호출할 수 있다.

```bash
docs/test-strategy/test-all.sh
docs/test-strategy/test-all.sh --only android
docs/test-strategy/test-all.sh --only backend --docker
```

- 백엔드 → Android → iOS 순서로 실행하고 실패해도 다음 스위트를 실행한다. 테스트 실패나 현재 실행의 테스트 수·커버리지 보고서 누락 시 종료 코드는 1, 잘못된 인자는 2다. `--only`로 제외한 스위트는 `NOT RUN`으로 표시한다.
- TS08: 모든 실행은 `sync-golden.sh --check`를 먼저 실행하고 `contract-sync` 행에 기록한다. 골든 불일치가 있어도 선택한 테스트는 계속 실행하며 최종 종료 코드는 1이다. 백엔드 골든을 의도적으로 갱신한 뒤 `docs/test-strategy/sync-golden.sh`로 두 앱의 복사본과 `SOURCE.md`를 함께 갱신한다. `--check`는 JSON 파일 목록·바이트와 `SOURCE.md` 존재 여부만 검사하므로 날짜 변경이나 무관한 백엔드 커밋만으로 실패하지 않는다. 동기화 시 제거된 골든의 앱 복사본도 정리한다.
- 결과는 `docs/test-strategy/logs/summary-<날짜-시간>.<실행ID>.md`, 원본 로그는 같은 디렉터리의 `run-<날짜-시간>.<실행ID>/`에 저장한다. 기존 실행 기록을 덮어쓰지 않으며 `logs/`는 Git에서 제외한다. Go 테스트 수는 하위 테스트를 포함한다.
- 의존성이 미리 캐시되어 있어야 한다. Go 모듈 다운로드와 Gradle 온라인 해석을 비활성화하고, iOS는 TS02 스크립트의 패키지 업데이트 금지 옵션을 사용한다. Python 3, Go, Android SDK/JDK 17, Xcode와 `iPhone 17` 시뮬레이터가 필요하다.
- Android SDK는 `fastlane/.env.default`의 `ANDROID_HOME` 한 줄만 추출한다(파일을 source하지 않음). 없으면 환경변수, `~/Library/Android/sdk` 순으로 사용한다. macOS에서는 JDK 17을 선택하고, 로컬 서명 속성이 있으면 `sandbox-exec`로 keystore 디렉터리 읽기를 차단한다. 차단 도구가 없으면 Android 실패로 기록한다.
- `--docker`는 `DFLH_DOCKER_TESTS=1`로 TS04 공용 MariaDB 하네스를 켠다. Docker가 없으면 해당 테스트만 스킵한다. 기존 개별 통합 테스트 opt-in, 외부 DB DSN, 골든 갱신 환경변수는 전달하지 않는다.
