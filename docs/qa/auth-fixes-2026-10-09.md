# 인증 수정 1·2 구현 및 검증 — 2026-10-09

[수정 계획](../plans/auth-defect-remediation-2026-10-09.md)의 작업 1(Android 세션 경계·오프라인 복원)과 작업 2(공통 서버 소셜 재연결)의 코드 수정과 자동 검증을 완료했다. **실기기 검수와 운영 반영은 남아 있다.** Android 기기는 현재 연결할 수 없다는 사용자 답변에 따라 격리한 에뮬레이터를 사용했다.

## 수정 소스

기존 동문 필터 작업과 분리한 worktree에서 저장소별 커밋을 만들었다.

| 대상 | 기준 HEAD | 수정 브랜치 / 커밋 | worktree |
| --- | --- | --- | --- |
| Android | `f2f5996` | `fix/auth-session-generation-20261009` / `a64f38a` | `build/auth-fix-20261009/android` |
| backend | `4dee5fa` | `fix/social-relink-20261009` / `0eb9578` | `build/auth-fix-20261009/backend` |

수정 전 Android probe 8개 중 6개가 실패했다. 오프라인·503에서 토큰을 지우고, 로그아웃·가입 취소 뒤 늦은 bootstrap/로그인/가입/인증 응답이 세션을 복구하는 문제가 재현됐다. 서버에서는 같은 회원의 Kakao 재연결이 canonical identity 유일성 제약 오류 `1062`로 실패했다.

- [Android 수정 전 결과](../../build/auth-fix-20261009/android-before.log)
- [서버 수정 전 결과](../../build/auth-fix-20261009/backend-before.jsonl)

## 작업 1: Android

- 토큰 저장·삭제와 화면 상태 적용이 하나의 잠금 아래 세션 세대와 작업 revision을 확인한다. 로그아웃, 가입 취소, 탈퇴, 새 로그인 이후의 이전 성공·실패 응답을 적용하지 않는다.
- 오프라인·timeout·5xx·429 bootstrap 실패에는 토큰을 보존하고 `RestoreFailed` 화면에서 재시도 또는 로그아웃을 제공한다. 온라인 재시도로 `/auth/me`를 확인한 뒤 인증 상태로 복귀한다.
- refresh single-flight를 세대와 시작 토큰에 한정한다. 이전 refresh의 실패가 새 세션을 지우거나 회전 토큰이 새 세션을 덮어쓰지 않는다. 이전 계정 요청의 401 재시도에 새 계정 토큰을 사용하지 않는다.
- 로그아웃은 로컬 세션을 즉시 비운다. 원격 로그아웃에는 캡처한 이전 세션만 사용하며, access token 만료 시에도 그 이전 refresh token만 갱신한다. 늦게 도착한 로그인 결과의 SID는 가능한 경우 해당 access token으로 정리한다.
- 소셜 가입 완료, 최초 동문 인증 신청·재시도, ID/PW 가입 완료 후 로그인에 같은 경계를 적용한다. ID/PW 회원 생성 대기 중 로그아웃 또는 새 로그인으로 경계가 바뀌면 가입 후 자동 로그인을 시작하지 않는다.
- 일반 coroutine 취소를 전파하고, 현재 세션의 refresh rotation 저장 보장과 가입 후 동문 인증 신청 실패 시 제한된 재시도 세션을 유지한다. 이미 서버에서 생성된 회원을 취소만으로 삭제하지 않는다.

주요 구현: [SessionRepository](../../build/auth-fix-20261009/android/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt), [TokenSessionManager](../../build/auth-fix-20261009/android/app/src/main/kotlin/com/dflh/app/core/auth/TokenSessionManager.kt), [AuthApi](../../build/auth-fix-20261009/android/app/src/main/kotlin/com/dflh/app/core/auth/AuthApi.kt), [NativeSignUpViewModel](../../build/auth-fix-20261009/android/app/src/main/kotlin/com/dflh/app/feature/auth/NativeSignUpViewModel.kt).

## 작업 2: 공통 backend

- 현재 서비스 계정 인증과 공급자 재인증을 거친 연결 요청에서, **같은 회원의 `REVOKED` identity**만 잠금·조건부 갱신으로 재활성화한다. `REVOKED_AT`을 비우고 검증 시각과 자격정보를 갱신한다.
- legacy 연결, canonical identity, 암호화 자격정보를 한 트랜잭션으로 처리한다. 다른 회원의 ACTIVE·REVOKED·DISABLED identity는 이전하지 않는다. 기존 ID/PW·회원 정보·휴대폰 claim과 유일성 제약을 유지한다.
- 끝나지 않은 DISCONNECT outbox가 있으면 재연결을 거절한다. 충돌 및 대기 상태를 409 오류로 반환한다.
- worker는 연결 행 → outbox 행 순서로 잠금을 잡고 현재 claim과 연결 상태를 확인한 뒤 자격정보를 읽는다. 공급자 호출 동안 잠금을 유지해 재연결과 경합하지 않도록 했다. 공급자 호출의 context 제한은 30초다.
- 공급자 해제 성공의 `REVOKED` checkpoint를 먼저 commit하고, 로컬 정리는 별도 트랜잭션에서 claim을 다시 확인한다. checkpoint 이후 재시도에는 공급자를 다시 호출하지 않는다.
- 이전 worker의 만료된 claim은 공급자 호출·삭제를 시작하지 않는다. 실패/claim 해제 기록은 해당 claim만 변경하며, `DELIVERED`를 실패 상태로 되돌리지 않는다. 기존 finalization 경로에도 트랜잭션 안의 ACTIVE 연결 삭제 방지를 추가했다.

주요 구현: [연결 repository](../../build/auth-fix-20261009/backend/backend/internal/repository/account_connections_repo.go), [해제 repository](../../build/auth-fix-20261009/backend/backend/internal/repository/social_revocation_repo.go), [해제 worker](../../build/auth-fix-20261009/backend/backend/internal/job/social_revocation_worker.go).

스키마 migration은 추가하지 않았다. 이 구현은 공급자 호출 중 대상 행의 잠금을 유지하므로, 같은 회원·공급자에 대한 경합 요청이 호출 완료 또는 timeout까지 기다릴 수 있다. 운영 적용 시 이전 버전의 worker를 종료·배출한 뒤 새 연결 경로를 사용해야 한다.

## 검증 결과

Go 수치는 하위 테스트와 상위 테스트를 포함한 JSON 이벤트 수다. Docker opt-in 테스트의 기본 실행 skip과 실제 MariaDB 실행 결과를 구분했다.

| 검증 | 결과 | 근거 |
| --- | --- | --- |
| Android 전체 debug 단위 테스트 | **632 통과, 실패·skip 0**; 최초 probe 8/8 통과 | [빌드 로그](../../build/auth-fix-20261009/android-final-verification.log) / `android/app/build/test-results/testDebugUnitTest` |
| debug 앱·instrumentation APK 빌드 | 성공 | 동일 빌드 로그 |
| Android 35 격리 에뮬레이터 instrumentation | **2/2 통과** | [로그](../../build/auth-fix-20261009/android-emulator-tests.log) |
| 서버 관련 패키지 테스트 | **1,215 통과, 49 skip, 실패 0** | [로그](../../build/auth-fix-20261009/backend-final-unit.jsonl) |
| 관련 repository/service/handler/job race 검사 | **1,192 통과, 36 skip, 실패 0**; race 보고 없음 | [로그](../../build/auth-fix-20261009/backend-race.jsonl) |
| 실제 MariaDB 10.1.38 및 HTTP Golden/edge 검증 | **44/44 통과, skip 0** | [로그](../../build/auth-fix-20261009/backend-final-integration.jsonl) |
| 관련 패키지 `go vet`, 두 저장소 `git diff --check` | 통과 | 실행 exit 0 |
| 서버 전체 `go test ./...` | **1,517 통과, 70 skip, 기존 contract 실패 3개** | [로그](../../build/auth-fix-20261009/backend-full-suite.jsonl) |

에뮬레이터에서는 실제 Android Keystore·암호화 SharedPreferences와 Compose 재시도 화면을 사용했다. 저장소·repository 재생성 뒤 토큰 복원과 오프라인 로그아웃의 영속 삭제를 확인했다. HTTP 응답은 격리 fixture이며, 실제 Kakao 앱이나 운영 서버 인증을 대신 검수한 결과는 아니다.

MariaDB 검증은 Kakao·Apple의 반복 해제/재연결, 자격정보 교체, 기존 native 계정 보존, 다른 회원 identity 보호, 두 회원 동시 연결, pending/failed outbox 차단, 공급자 호출과 재연결 경합, checkpoint 재생, 만료 claim의 공급자 호출·삭제 차단, 늦은 실패의 DELIVERED 회귀 방지를 포함한다. 기존 가입·모바일 세션·탈퇴 Golden 및 API 복구 경계 테스트도 함께 통과했다. 외부 공급자는 합성 verifier/callback을 사용했다.

로컬 ARM 환경의 MariaDB schema import를 위해 테스트 harness의 query timeout을 실행 중에만 15초에서 120초로 늘렸다. 실행 후 원본으로 복원했고 수정 커밋에 포함하지 않았다.

서버 전체 검사에서 남은 기존 실패:

1. `TestCanonicalIdentityCandidateRangeCheck`
2. `TestCanonicalIdentityCandidatePacketMatchesCurrentSource`
3. `TestMigrationRunnerApprovesEveryFutureMigrationIncluding063`

manifest 기대값을 변경해서 이 실패를 숨기지 않았다. 전체 서버 테스트가 모두 통과한 상태로 보고하지 않는다.

## 재실행 및 남은 적용 검수

Android worktree에서 Java 17로 실행:

```sh
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-17.jdk/Contents/Home ./gradlew :app:testDebugUnitTest :app:assembleDebug :app:assembleDebugAndroidTest
```

backend worktree의 `backend/` 모듈에서 실행:

```sh
go test ./cmd/server ./internal/repository ./internal/service ./internal/handler ./internal/job
go test -race ./internal/repository ./internal/service ./internal/handler ./internal/job
DFLH_DOCKER_TESTS=1 go test -count=1 -timeout=12m ./cmd/server -run 'TestAuthQASocialRelinkAfterDisconnect|TestSocialRelinkBoundariesOnMariaDB|TestClaimedDisconnectCannotTouchReplacementCredential|TestAuthQAAPIRecoveryBoundaries|TestGoldenSignup|TestGoldenMobileSession|TestGoldenAccountDeletion'
```

수정 APK: [app-debug.apk](../../build/auth-fix-20261009/android/app/build/outputs/apk/debug/app-debug.apk).

남은 항목은 수정 소스 통합·서버 적용, 수정 앱 설치, 실제 기기에서 오프라인 cold start → 재시도, 로그아웃 → 재실행, native 회원의 Kakao 연결 → 해제 → 재연결 → Kakao/ID-PW 재로그인이다. 앱 서명이 다를 경우 기존 실기기 앱을 임의로 삭제해서 설치하지 않는다.

작업 3 이후의 카카오 취소/fallback·탈퇴 결함은 이 수정에 포함하지 않았다. iOS 작업은 중지 상태를 유지하며, Apple의 이번 결과는 공통 backend 경로의 합성 검증이다.
