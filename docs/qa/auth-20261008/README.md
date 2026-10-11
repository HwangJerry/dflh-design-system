# 인증 QA 재현 자료

공유용 정리본과 합성 fixture다. 실제 비밀번호·OTP·토큰·공급자 식별값·연락처 원문은 포함하지 않는다. 최신 결함 및 운영 삭제 관측은 [전체 보고서](../auth-2026-10-08.md)를 따른다.

Android `AuthEdgeCaseProbeTest.kt`는 소스 세션 저장소의 지연 응답과 네트워크 실패를 제어한다. disposable checkout의 `app/src/test/kotlin/com/dflh/app/core/auth/`에 임시 복사하고 `./gradlew :app:testDebugUnitTest --tests com.dflh.app.core.auth.AuthEdgeCaseProbeTest`를 실행한다. 기존 동일 package fixture가 필요하다. 검수 소스에서 6 fail / 2 pass이며 복사 파일을 제거하면 기본 suite는 유지된다.

Backend 추가 정상 경계 fixture `auth_qa_edge_cases_test.go`를 disposable backend checkout의 `cmd/server/`에 넣고, `SocialRelinkProbe_test.go`를 `cmd/server/auth_qa_relink_probe_test.go`로 임시 복사한다. `DFLH_DOCKER_TESTS=1 go test -json ./cmd/server -run '^TestAuthQASocialRelinkAfterDisconnect$' -count=1`을 실행한다. 기존 golden server fixtures도 필요하다. 최초 연결·해제·ID/PW 통제 뒤 재연결 assertion이 1062 unique 충돌로 실패한다. 복사한 probe를 제거한다. Apple Silicon에서 MariaDB 10.1.38 schema import에 120초 테스트 전용 timeout을 임시 적용했고 실행 뒤 원복했다.

이 자료는 기본 suite에 자동 등록되지 않는다. 실기기 결과와 합성 공급자 검증 fixture를 구분한다. 운영 코드·배포 수정은 없다.
