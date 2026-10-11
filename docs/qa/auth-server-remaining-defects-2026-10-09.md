# 공통 서버 잔여 인증 결함 확인 — 2026-10-09

앞서 보고한 세 항목은 최신 공통 서버 `567b6e1cc31f7d39f13b779bf3846cee537b5702`에도 남아 있다. 해당 commit의 배포 산출물과 운영 실행 중인 바이너리의 SHA-256도 일치한다. 아래 동작 재현은 운영이 아닌 격리 HTTP 서버와 MariaDB 10.1.38에서 수행했다. 운영 계정·DB·환경·배포 파일은 변경하지 않았다.

## 운영 코드 확인

- 최신 수정 worktree `build/auth-fix-20261009/backend`는 HEAD `567b6e1`, 변경 없음이다.
- 운영 release는 `20261008T183421Z-567b6e1cc31f`이다. 다른 세션이 운영 배포를 완료했다는 [보고서](auth-production-rollout-2026-10-09.md)를 확인했다. 이전의 배포 미확인 설명은 이 조사 결과로 갱신한다.
- `alumni-backend` 서비스 active, MainPID 29880을 확인했다. `/app/backend/server`, 실행 중인 `/proc/29880/exe`, 로컬 release 산출물 세 파일의 SHA-256은 모두 `45ea781930b54220af325c9c26001d773c3b277c5fa100c781f63472e8b5fb5f`다.
- 운영에서 장애를 주입하거나 신규 회원가입을 시도하지 않았다. 운영 동작 판단은 배포 산출물 대조와 해당 소스의 격리 재현에 근거한다.

## 1. 소셜 가입 취소 시 서버 임시 인증 정보 즉시 폐기 경로 없음

`backend/cmd/server/routes.go:172`에는 소셜 가입 완료, prefill, photo 경로가 있고 가입 취소 경로는 없다. `backend/internal/service/social_link_token_store.go:20`의 유효 기간은 5분이며, 상태는 ready/processing/consumed뿐이다. `backend/internal/service/social_auth_service.go:117`은 제공자 토큰·Apple revocation token·프로필을 continuation 데이터에 저장한다.

격리 probe에서 합성 제공자 credential을 가진 continuation을 저장한 뒤 `/api/auth/social/link/cancel`에 요청하면 404가 반환된다. 이후 Snapshot과 Begin이 성공하며 제공자 credential도 남아 있었다. 이 URL은 추가 가능한 취소 경로를 검사하기 위한 probe이며, 실제 iOS UI가 현재 해당 URL을 호출한다는 의미는 아니다. 등록된 경로와 전체 저장소 호출부 확인에서도 취소를 전달·처리하는 서버 구현은 발견되지 않았다.

취소 후에는 남은 5분 TTL 동안 continuation을 사용할 수 있다. 캐시의 주기적 삭제는 10분 간격이고, 만료된 항목은 조회 시에도 제거한다. 따라서 유효성 만료와 메모리에서의 즉시 삭제를 구분해야 한다. 성공적으로 Consume한 항목은 제공자 데이터를 비운다. 실패 후 Release는 재시도를 위해 기존 데이터를 유지한다.

이 문제는 **임시 제공자 인증 정보의 폐기 누락**이다. probe에서 서비스 refresh session은 0건이었다. 실제 서비스에 로그인한 세션이 남았다고 판단하지 않는다. Android 세션의 Kakao SDK 취소 callback 수정과 별도 서버 보완 사항이다.

## 2. ID/PW 회원가입의 서버 비밀번호 정책 누락

`backend/internal/handler/auth_handler.go:239`는 비밀번호가 비어 있는지만 확인한다. `backend/internal/service/registration_service.go:94`에도 강도 검증이 없고, `password_service.go:90`의 NewCredential은 입력을 해싱한다.

격리 서버에서 전화 인증과 개인정보 동의를 정상 완료하고 **한 글자 비밀번호**로 `/api/auth/register`를 호출하면 201이 반환됐다. 같은 비밀번호로 `/api/auth/mobile/login`도 200 및 해당 회원의 세션을 반환했다.

반면 비밀번호 변경 `password_change_service.go:53`과 재설정 `password_reset_service.go:156`은 최소 8자 및 영문·숫자·특수문자를 요구한다. iOS 가입 화면을 수정했어도 API를 직접 호출하거나 검증이 다른 클라이언트를 사용하면 서버 정책이 적용되지 않는다.

## 3. 소셜 회원 생성 후 세션 발급 실패의 응답·복구 처리 부족

`backend/internal/handler/auth_social_link_handler.go:196` 이후에는 이미 생성된 회원의 전화 인증을 소비하고 continuation도 Consume한다. 이어 `CompleteMobileLink`가 실패하면 `:211`에서 일반 `500 LOGIN_FAILED`를 반환한다. 바로 앞의 `LINK_STATE_FAILED`에는 계정 연결 완료 및 재로그인 안내가 있지만, 이 세션 발급 실패 응답에는 같은 복구 안내가 없다.

기존 `TestAuthQAAPIRecoveryBoundaries/social_session_issue_failure_leaves_no_service_session_and_recovers_by_login`을 최신 소스에서 다시 실행했다. 격리 DB에 합성 실패 trigger를 걸어 다음을 검증했다.

1. 회원 생성·소셜 연결이 commit된다.
2. refresh token 삽입 실패로 `500 LOGIN_FAILED`가 반환된다.
3. 생성된 회원의 refresh session은 0건이고 전화 인증과 continuation은 소비된 상태다.
4. 동일 가입 요청을 재전송하면 `400 PHONE_NOT_VERIFIED`가 반환된다.
5. 실패 trigger를 제거한 뒤 새로운 합성 제공자 인증으로 로그인하면 기존의 같은 회원에 정상 접근한다. 승인 대기 권한도 유지된다.

따라서 **회원·소셜 연결 rollback 누락을 무조건 결함으로 보는 것이 아니라, 가입 완료 상태와 로그인 실패를 구분하는 응답 및 클라이언트 복구 계약이 부족한 문제**다. 중복 회원이나 사용할 수 있는 서비스 로그인 세션이 생성되는 현상은 이 검사에서 없었다. 제공자 인증은 합성이며 실제 Kakao/Apple UI 재검수는 포함하지 않았다.

## 실행과 증거

정확한 commit을 `git archive`로 별도 디렉터리에 추출하고 관찰 probe만 추가했다. 기존 작업 worktree와 제품 소스는 수정하지 않았다.

```sh
DFLH_DOCKER_TESTS=1 go test -json -count=1 -timeout=10m ./cmd/server \
  -run '^(TestAuthQAAPIRecoveryBoundaries|TestInvestigationCurrentServerSignupGaps)$'
```

최종 실행은 두 상위 테스트와 하위 사례 10개 전부 통과, 실패·skip 0이다. 이 통과는 **현재 결함 동작을 재현하는 관찰 assertion과 기존 복구 경계 검사가 충족됐다는 뜻**이며 결함 수정 완료를 의미하지 않는다. 첫 관찰 probe에서는 공통 JSON helper가 404의 plain-text 응답을 거부했다. probe를 직접 HTTP 응답 검사로 고쳐 전체 대상 검사를 재실행했다. 제품 코드는 변경하지 않았다.

private 로컬 증거는 `build/auth-server-investigation-20261009/`의 `deployment-comparison.json`, `test-results.jsonl`, `test-results-final.jsonl`, `test-summary.json`, `source/backend/cmd/server/auth_investigation_test.go`다. 테스트 컨테이너와 데이터베이스는 하네스가 정리했다.

세 항목 모두 서버 수정 대상으로 확정한다. 카카오 재연결·탈퇴 SMS 소유권·구독 종료 검토는 이번 세 항목과 다른 수정이며, 이 세 항목을 해결하지 않는다.
