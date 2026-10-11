# Android 소셜 계정 재연결 조기 안내 — 서버 보완

## 결과와 범위

해제된 소셜 계정이 가입 화면 전체를 거친 뒤 소유권 충돌로 실패하던 결함을 서버에서 보완했다. 제공자 검증 직후 canonical 소유권을 조회하여 `REVOKED`이면 가입 continuation을 만들기 전에 거절한다. 회원·인증 세션·제공자 credential은 생성하거나 변경하지 않는다.

10/10 작업 종료 시점에는 소스 수정과 로컬 검증, Linux 배포 후보 artifact 준비까지 완료했으며 운영 배포와 수정 서버 실기기 검수는 수행하지 않았다.

**10/11 후속 검증:** 사용자의 명시적 승인으로 같은 `c3ba6…` 후보를 15:29:34 KST 운영에 반영하고, 실제 Galaxy의 Kakao 연결·로그인·해제·초기403 거절·Native 로그인·동일 Kakao 재연결·재로그인·최종 로그아웃을 검증했다. 실제 유효 환경 preflight·실행 SHA·app/admin health200·원형 SMS 설정·원래 root family 4개의 해시 집합 보존을 확인했다. DB migration·운영 환경 변경은 없었다. 상세 근거는 [10/11 서버 배포 및 실기기 교차 검수](../../build/android-auth-device-remediation-20261011/server/deployment-server-section.md)에 기록했다. 이번 수정 검증은 Android 대상이며 Apple은 공통 서버 정책의 unit 회귀만 확인했다. iOS 실기기나 정기 결제 검수 결과를 포함하지 않는다.

## API 계약

`POST /api/auth/kakao/mobile` 및 동일 `SocialAuthService.Authenticate`를 사용하는 제공자 로그인 경로는 기존 rejected 오류 envelope를 사용한다.

```json
{
  "code": "SOCIAL_ACCOUNT_RELINK_REQUIRED",
  "message": "기존 로그인 방법으로 로그인한 뒤 계정 설정에서 같은 소셜 계정을 다시 연결해주세요."
}
```

HTTP 상태는 **403**이다. `status`, 회원 식별자, provider subject, 프로필, `linkToken`, access/refresh token을 추가하지 않는다. 새 handler 분기나 migration은 필요하지 않으며 기존 `writeMobileAuthResult`가 같은 envelope로 변환한다. Android의 새 코드 해석·복구 UI는 별도 담당 작업이다.

기존 continuation을 발급한 뒤 소유권이 바뀌거나 이전 서버에서 발급한 continuation으로 최종 가입을 요청할 경우, `POST /api/auth/social/link`의 기존 **409 `SOCIAL_ACCOUNT_ALREADY_LINKED`** 계약도 유지한다. 메시지는 **"이미 연결된 소셜 계정입니다. 기존 로그인 방법으로 로그인한 뒤 계정 설정에서 소셜 계정 연결을 확인해주세요."**로 보완했다. 다른 회원 소유라고 단정하거나 소유권 이전을 허용한다고 안내하지 않는다. 최종 transaction은 rollback하고 continuation lease를 release한다. Android는 해당 continuation을 취소한 뒤 복구 화면으로 돌아가는 별도 보완을 적용한다.

## 구현과 보존한 경계

- `internal/repository/social_auth_ownership.go`: canonical 제공자 변환 후 `(PROVIDER, SUBJECT_KEY)`로 소유권을 조회한다. 반환값은 identity 상태와 회원 상태뿐이다. `LEFT JOIN`으로 회원이 없는 고아 identity도 감지하여 가입을 차단한다. 기존 unique index를 사용하며 request context를 전달한다.
- `internal/service/social_auth_service.go`: 제공자 검증 성공 후 조회한다. 회원의 `AAA`/정지 상태를 우선 차단하고, `REVOKED`에는 재연결 오류를 반환한다. `DISABLED`/알 수 없는 상태/고아 identity는 fail closed로 `ACCOUNT_SUSPENDED`를 반환한다.
- `internal/handler/auth_social_link_handler.go`: 최종 소유권 충돌의 상태·code·rollback 정책은 유지하고 정확한 복구 메시지를 제공한다.
- canonical identity의 기존 cutover readiness가 활성화되기 전에는 기존 legacy 로그인 동작을 유지한다. 기존 startup의 `CanonicalPasswordWriteReady` 판정과 같은 범위를 사용한다. canonical 조회 장애는 가입으로 넘어가지 않는다.
- `ACTIVE`와 신규 제공자는 기존 로그인·가입 경로를 유지한다. 실제 삭제로 canonical 소유권이 사라진 제공자는 신규 가입을 시작할 수 있다. 본인 소유 계정에 대한 명시적 재연결은 기존 `LinkIdentity` transaction을 그대로 사용한다.
- 가입 최종 transaction의 중복 소유권 검사는 그대로 유지한다. 초기 조회 이후 동시 해제/연결이 발생할 수 있으므로 이 조기 안내는 최종 transaction의 소유권 제약을 대체하지 않는다.

## Red → Green 검증

원본 구현에 새 서비스 테스트를 실행했을 때 상위 3개 테스트가 실패했다. canonical 소유권 조회 없이 기존 ACTIVE legacy 연결 조회부터 실행했음을 확인했다. 로그는 `build/android-social-relink-remediation-20261010/red-unit.jsonl`에 보관했다.

| 검증 | 결과 | 근거 |
|---|---|---|
| 관련 서비스·repository·handler unit | 조기·최종 충돌 문구 확인 포함, 상위 17개 / leaf 34개 PASS, skip 0 | `green-final-conflict-unit.jsonl` |
| 관련 실제 HTTP + disposable MariaDB 10.1.38 | 조기·최종 HTTP 문구 및 실제 최종 rollback 확인 포함, 상위 5개 / leaf 12개 PASS, skip 0 | `green-final-conflict-http-mariadb.jsonl` |
| 전체 service·repository·handler unit | 소유권 보완 직후 상위 880개 / leaf 1,216개 PASS, 실패 0. 이후 문구 변경은 위 관련 검증으로 확인 | `broad-unit.jsonl` |
| 전체 unit의 미실행 항목 | DB opt-in 37개 및 기존 EMAIL/provider matrix 6개 skip | 위 전체 로그 |
| Linux amd64 정적 빌드 | PASS | 배포 후보 `backend/server` |
| 같은 Linux artifact의 `--check-release-config` 실행 | 기본 gates 및 운영형 synthetic gates 모두 PASS | 후보 `backend/preflight.json` |
| 코드 형식·공백 검사 | gofmt 및 `git diff --check` PASS | 로컬 검사 |

하위 케이스와 상위 테스트 수를 합산하지 않는다. Docker 통합 검증에서는 운영 DSN을 받지 않는 기존 테스트 harness를 사용했다. 초기 조기 거절 검증은 기본 15초 DDL timeout으로 통과했다. 최종 409 추가 검증에서는 DB baseline DDL가 이 제한을 넘겨 환경 setup 단계에서 실패했다(`initial-final-conflict-ddl-timeout.jsonl`). 현재 수정 소스를 격리 복제한 뒤 harness의 `internal/testsupport/mariadb/mariadb.go`에서만 `queryTimeout`을 15초→90초로 늘려 재검증했다. 제품 checkout·schema·assertion은 이 환경 조치로 변경하지 않았다. 차이는 `isolated-final-conflict-harness.json`에 기록했다.

최종 공통 문구는 추가 red → green으로 검증했다. 이전 "기존 아이디" 문구에서 카카오/Apple의 승인·대기 회원 4개 케이스가 문구 assertion에 실패했으며, 수정 후 모두 통과했다. `red-recovery-message.jsonl`에 실패 근거를 보관했다.

최종 409 메시지도 red → green으로 검증했다. 기존 rollback unit test에 정확한 복구 문구·continuation release assertion을 추가하여 이전 문구에서 실패함을 확인한 뒤 수정했다(`red-final-conflict-message.jsonl`). 새 실제 HTTP 테스트는 가입 continuation 발급 후 다른 요청으로 canonical ACTIVE/REVOKED 소유권을 만든 두 경우를 검증했다. 동일 신청을 두 번 제출해 모두 409를 확인하고 회원·account state·identity·검증 신청·소셜 연결·phone claim·consent·credential·refresh session의 부분 생성이 없으며 SMS grant가 미소모 상태임을 확인했다. 기존 소유권이 그대로 유지되고 continuation이 release되어 최종 취소 204도 가능한지 확인했다.

새 실제 HTTP 테스트는 제공자 응답만 synthetic으로 대체하고 handler·canonical 조회·명시적 재연결·세션 발급은 실제 MariaDB에서 실행했다. fresh provider 검증 1회 후 403을 확인하고 회원 수, REVOKED 소유권, service refresh 수, credential 수가 변하지 않음을 확인했다. 응답 개인정보/token 부재와 cache continuation 부재도 확인했다. 이어 본인 ID 로그인 → 제공자 명시적 재연결 → 소셜 인증 → `/api/auth/me` 200, 실제 canonical 소유권 제거 후 신규 가입 continuation 진입을 확인했다. 별도 기존 tests는 Kakao/Apple 재연결, 타인 소유권 탈취 차단, 처리 중 disconnect와 stale worker 경계를 확인했다.

첫 HTTP 검증의 cache 관측 assertion은 rate-limit counter 증가를 continuation 생성으로 오판했다. `initial-http-cache-observer-failure.jsonl`을 보존하고 실제 `SocialLinkTokenStore.Snapshot`이 성공하는 항목만 검사하도록 관측 코드를 수정했다. 이후 동일 API·DB 검증 전체가 통과했다. 제품 로직은 이 관측 수정 때문에 바뀌지 않았다.

## 배포 후보와 10/10 기준 검수 범위

후보 경로는 `build/android-auth-remediation-20261010/backend/`이다. `remediation.patch`, `source-manifest.json`, `artifact-metadata.json`, `preflight.json`을 함께 검토한다. 원래 존재하던 untracked QA 파일은 보존했으며 commit하지 않았다.

- 후보 binary SHA256: `c3ba6b246216b09879a5b50822d7619bf3e44271899f184cb1913a3862a79d4a`
- 빌드 대상: `CGO_ENABLED=0 GOOS=linux GOARCH=amd64`, `-trimpath -buildvcs=false`.
- 빌드 source manifest SHA256: `d5447cd51144b742e6a669e296689867293e45ee268dadc0bf6d0b030a4d17a0`.
- metadata의 `sourceManifestSha256`은 실제 `source-manifest.json` 파일 바이트의 SHA256이다. 기존 경로·file hash 목록의 canonical digest는 `sourceContentDigestSha256`에 별도 보존했다. 계산 기준 정정이며 manifest의 각 source hash와 binary는 변경하지 않았다.
- 신규 DB migration: 없음.
- 이전 운영 binary/rollback 기대 SHA256: `55f483b80e0b5e26337a5edd13040be2a646443a897d917d4bb4ea8155a2f672` (이전 읽기 전용 운영 검수 근거). 10/11 실제 배포 직전에 실행·디스크 SHA 일치 및 같은 SHA 백업을 다시 확인했다.

10/10 Linux 실행 preflight는 네트워크를 끈 scratch Docker와 synthetic key/경로만 사용했다. 운영 환경 파일의 유효성을 검증한 결과는 아니며 운영 배포 후 health 결과도 아니다. 소유한 컨테이너와 preflight 이미지는 제거했다.

10/11 root의 artifact 검토와 사용자 배포 승인 후 기존 binary backup → 실제 유효 환경 `--check-release-config` → binary만 교체/재시작 → 실행 SHA 및 앱·관리자 health200 → Android 해제 계정의 초기 오류·기존 Native 로그인·본인 재연결·정상 소셜 로그인·로그아웃을 검증했다. 원래 root family 해시 집합4개를 보존했고 원문 provider ID/token/password를 읽지 않았다. 기존 binary rollback 백업은 보존했다. iOS 실기기 검수는 수행하지 않았다. 데이터 rollback이나 migration은 필요하지 않았다.

공통 복구 안내는 "기존 로그인 방법"을 사용한다. Apple+Kakao만 연결되어 LOCAL ID/PW가 없는 회원도 보유한 정상 로그인 방법으로 기존 계정에 들어가 재연결할 수 있도록 안내한다. 카카오와 Apple unit 및 카카오 HTTP 응답에서 정확한 문구를 검증했다.
