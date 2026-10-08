# 인증 결함 작업 3·4·5 — red → green → refactoring

2026-10-09. Android AUTH-QA-09·13, 공통 backend/관리자 AUTH-QA-10·11을 보완했다. 작업 1·2의 격리 worktree/브랜치를 이어 사용했다. iOS 작업은 재개하지 않았다. 운영 DB·계정·관리자 페이지에는 변경을 하지 않았다.

## 변경 결과

| 작업 | 보완한 동작 |
| --- | --- |
| 3 — Kakao 취소 | Talk 사용 가능 시 앱 인증을 우선한다. 사용자 취소와 `access_denied / User denied access`는 웹 fallback 없이 종료한다. 다른 AccessDenied(연령 제한 등), 네트워크·설정 오류를 취소로 오인하지 않는다. Talk 미지원/계정 미연결처럼 허용한 경우만 웹 경로를 사용한다. 취소·중복 callback은 늦게 도착해도 새 인증을 만들거나 웹 로그인으로 이어지지 않는다. 로그인 취소는 SignedOut, 연결 취소는 기존 프로필·미연결 상태로 돌아간다. |
| 3 — 탈퇴 안내 | 최종 확인은 처리 시작 전까지만 취소 가능하다고 설명한다. 접수증에서는 서버의 `canCancel`과 저장된 취소 토큰에 따라 버튼·안내를 표시한다. |
| 4 — 완료 대기 | SMS 보유 건수와 제거 예상 시각을 preview 및 `other_identifiers` 결과에 표시한다. DB 단계의 보류와 전체 완료 대기를 구분한다. 24시간 보관, 시간당 cleanup, 5분 재시도 및 1분 worker polling을 고려한다. cleanup 장애 시 계속 대기한다. |
| 4 — 소유권 | native/social 가입 후 grant 소비 시 회원 소유권과 소비 시각을 원자적으로 저장한다. 전화번호 불일치에는 grant를 소비하지 않는다. 해당 회원 소유가 증명된 행만 삭제한다. 소유 불명 SMS는 기존 TTL을 따른다. 현재 다른 회원의 typed identity/claim/grant는 행 단위로 제외하고, revoked·orphan·자유 텍스트 잔류는 계속 보류한다. |
| 5 — 구독 참조 | root가 현재 source fingerprint, 공급자의 최종 실패·취소 상태, 외부 종료 확인 및 근거를 기록하는 공식 경로를 추가했다. 종료 확인이 없는 pending, active, 청구키 잔류, 미확정·소유 불명 주문은 계속 보류한다. 외부 종료가 확인됐지만 로컬에 pending으로 남은 참조도 조건을 충족하면 처리할 수 있다. |
| 5 — 거래 경계 | 구독·관련 주문·PG 기록의 전체 원본과 검토 근거를 승인에 묶는다. 변경 후 기존 승인은 거절한다. worker는 같은 판정으로 참조를 삭제하고 operator·근거는 보존한다. 현재 locking read로 판단해 오래된 repeatable-read snapshot이 활성 청구를 삭제 대상으로 승인하지 못하게 했다. |

Kakao SDK 2.20.1의 실제 오류 모델을 확인했다. 동의 거절과 다른 AccessDenied를 구분하는 근거는 [Kakao 오류 문서](https://developers.kakao.com/docs/en/kakaologin/trouble-shooting), Talk 우선 인증·사용자 취소 중단은 [Android 공식 문서](https://developers.kakao.com/docs/en/kakaologin/android)와 대조했다. 연결된 실기기에서 관측한 콜백 클래스라는 의미는 아니다.

## RED — 수정 전 실패

| 범위 | 실제 실패 증거 |
| --- | --- |
| SDK/세션·연결 취소 | 회귀 6개 중 5개 실패: 취소 fallback, 설정/네트워크 오류 fallback, 폐기 callback, SignedOut 복귀, 연결 취소 분류 |
| 탈퇴 화면 | 원래 화면 구현으로 계측 테스트 3개 모두 실패: 최종 안내, 취소 가능 안내, 처리 시작 후 안내 |
| 서버 | MariaDB에서 재가입 회원 식별값 충돌, 가입 grant 소유권 부재, SMS preview 대기 정보 부재, 유효 grant의 cleanup 삭제, 구독 공식 검토 경로 부재 — 5개 실패 |
| 관리자 웹 | 기존 3개 정상 테스트를 유지하면서 SMS 대기 표시·종료 검토·청구키 잔류 보호 3개 실패 |
| API 오류 | 구독 종료 미확인을 500으로 반환. actionable 409 회귀 테스트 실패 |
| 거래 snapshot | 다른 DB 연결이 구독을 active/청구키 있음으로 바꿨는데 기존 snapshot으로 삭제를 승인하는 회귀 테스트 실패 |
| 확인된 pending | 공급자의 취소 완료가 확인되고 청구키·미확정 주문이 없는 pending 참조에도 공식 경로가 없는 회귀 테스트 실패 |

private 원시 로그는 `build/auth-fix-20261009/step3-red.log`, `step3-ui-red.log`, `step45-red.log`, `step45-admin-red.log`, `step5-http-red.log`, `step5-snapshot-red.log`, `step5-confirmed-pending-red.log`에 있다. 컴파일 오류나 계약을 잘못 가정한 실험은 결함 재현 건수에 넣지 않았다.

## GREEN 및 회귀 검증

- Android 전체 단위 테스트 **639개, 실패·skip 0개**. `assembleDebug` 통과. 자체 Android 35 emulator에서 탈퇴 화면 계측 **7개 통과**. 리팩터링 후 단위 테스트와 빌드를 다시 통과했다.
- 관리자 웹 **31개 파일 / 166개 테스트 통과**, production build 통과. 종료 확인은 근거·최종 공급자 상태·외부 종료 확인을 모두 입력해야 활성화된다.
- 실제 MariaDB 10.1.38의 전체 server/Golden **98개 통과**. 초기 전체 실행에서 메시지 전송 500을 발견했고, 기존 migration 081이 빠진 테스트 하네스를 081·082 포함 현재 소스 순서로 보완한 후 통과했다.
- 마지막 인증·탈퇴 실제 API/worker 검증 **22개 통과**. 이전 회원 삭제 → 같은 ID/이메일/전화번호로 실제 재가입 API 실행 → 새 grant 소유권 저장 → cleanup 실패/TTL 정리 → 이전 worker 재시도 → 이전 요청 완료와 새 회원/claim/grant 보존을 확인했다. 별도 fixture에서 카카오 subject 재사용의 소유권 및 revoked 잔류도 검증했다.
- 기존 탈퇴·보존·파일·복구·cleanup MariaDB 회귀 **52개 통과**. 오래된 schema fixture와 기존 legal retention 보호를 함께 확인했다.
- 두 연결의 snapshot 경합 테스트는 수정 후 통과했다. 관련 Go race 검증과 `go vet`도 통과했다.

- 최종 결제 fixture 2개도 통과했다. 공급자에서 종료가 확인된 pending 참조의 worker 완료, 미확정 결제 차단, 주문 상태 변경 후 오래된 승인 거절, PG 기록 추가 후 승인 무효화 및 결제 기록 보존을 확인했다.
- 전체 Go: **1,518개 통과 / 78개 skip / 기존 승인 계약 3개 실패** (subtest 포함). 관련 경합 검사 및 `go vet` 통과. 마지막 명명·상수 리팩터링 후 관련 패키지 컴파일/단위 검증도 통과했다.

확장 Golden 실행과 최종 변경 검증은 범위가 중복되므로 통과 건수를 합산하지 않는다. legacy MariaDB 회귀의 별도 환경 스위치도 켜서 52개 실제 실행을 확인했다. ARM Mac에서 amd64 MariaDB 초기 fixture import의 기존 15초 제한은 검사 중에만 120초로 늘렸고 원상복구했다. 해당 helper 변경은 커밋에 없다.

최종 증거는 `step3-final-green.log`, `step3-full-green.log`, `step45-admin-verified.log`, `step45-admin-focused-final.log`, `step45-admin-build-completion.log`, `step45-golden-final.jsonl`, `step45-auth-final.jsonl`, `step45-erasure-db-final.jsonl`, `step5-snapshot-final.log`, `step5-payment-and-pending-green.log`, `step45-go-completion.jsonl`, `step45-race-release-check.log`, `step45-vet-completion.log`에 있다.

## 적용 조건과 남은 검수

서버의 nullable grant 소유권/대기 메타데이터 migration 083, 구독 종료 검토 migration 084는 additive이며 실제 MariaDB에서 적용·실행했다. 후보 manifest에는 이 두 파일만 추가했다. 운영 승인 digest와 기존 승인 계약 기대값은 바꾸지 않았다.

기존 migration 계약 테스트 `TestCanonicalIdentityCandidateRangeCheck`, `TestCanonicalIdentityCandidatePacketMatchesCurrentSource`, `TestMigrationRunnerApprovesEveryFutureMigrationIncluding063`가 남아 있다. 기존 082 lineage 불일치와 확장된 후보 packet의 승인 계약을 검토해야 운영 반영할 수 있다. migration runner의 fail-closed 승인 검사는 유지한다.

공급자의 종료 상태는 root 담당자의 명시적 검증·근거 기록이다. 공급자 조회 API를 새로 연동해 자동 확인했다고 주장하지 않는다. 조회 실패나 종료 미확인은 완료 근거로 사용하지 않는다. 관련 주문의 법정 보존·영수증 및 제3자 기록 보호는 별도로 유지한다.

적용 순서와 rollback 조건은 [서버 검토 메모](../../build/auth-fix-20261009/backend/docs/auth-erasure-remediation-20261009.md)에 있다. 스키마 승인·확장 → backend/관리자 → 수정 Android 앱 → 실기기 검수 순서다.

Android 실기기가 연결되지 않아 실제 KakaoTalk redirect·하단 취소·Back, 수정 앱의 재연결 및 자동 로그인 검수는 남아 있다. release minification의 SDK 동작도 이 debug 검사로 확정하지 않는다. 운영 요청 15·16에 대한 migration 적용 및 완료 확인은 수행하지 않았다. 원본 root/iOS 계정은 유지했다.

Android 커밋: `6bf4c61` (`fix/auth-session-generation-20261009`). 서버/관리자 커밋: `a1a6f63` (`fix/social-relink-20261009`). 두 worktree는 변경 없이 정리됐다. 운영 배포·push·원본 기능 브랜치 merge는 수행하지 않았다.
