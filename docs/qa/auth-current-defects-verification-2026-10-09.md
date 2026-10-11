# 기존 인증 결함의 현재 상태 재조사

2026-10-09 22:46–22:49 KST에 운영 실행 파일, 운영 실패 응답, 연결된 Android 설치 APK, 최신 수정 소스 및 격리 MariaDB 재현을 확인했다. 정기결제는 제외했고 iOS 기기를 조작하지 않았다. 제품 소스 수정·운영 배포·운영 회원 생성/삭제·기기 앱 업데이트를 수행하지 않았다. 운영 DB는 읽기 전용으로 조회했다.

## 판정

| 기존 항목 | 운영 서버 / 최신 서버 코드 | 현재 연결된 Android |
| --- | --- | --- |
| 1. ID 로그인 오류 문구가 이메일로 표시 | **남아 있음.** 존재하지 않는 ID는 401/INVALID_CREDENTIALS와 “이메일 또는 비밀번호가 올바르지 않습니다”, 빈 ID는 400/INVALID_REQUEST와 “이메일과 비밀번호를 입력하세요”를 실제 운영에서 재현 | 동일 오류를 받는 기존 QA APK 유지 |
| 2. 가입 서버 비밀번호 정책 누락 | **해결·운영 반영.** 약한 비밀번호는 400/INVALID_PASSWORD, 회원 생성 0건 및 전화 인증권 미소비를 격리 HTTP/MariaDB에서 확인. 공통 비밀번호 golden 18건 통과 | 새 클라이언트 공통 정책도 단위 검사 통과. 새 APK는 미설치 |
| 3. 소셜 가입 취소 시 서버 임시 인증 폐기 없음 | **서버 해결·운영 반영.** 취소 API, credential 제거, 취소·제출 동시성, 반복 취소, 처리 중/완료 응답을 검사 | **현재 설치 앱에는 취소 API 호출이 없음.** 새 Android 코드의 취소 큐·복구 계약은 통과했으나 해당 버전 설치 및 실제 제공자 통합 검수 필요 |
| 4. 가입 commit 후 세션 발급 실패의 안내/재시도 구분 없음 | **서버 해결·운영 반영.** SIGNUP_COMPLETED_LOGIN_REQUIRED, 재전송 SIGNUP_ALREADY_COMPLETED, 서비스 세션 0건, 새 제공자 로그인으로 동일 회원 복구 확인 | 새 Android 복구 계약은 통과했으나 현재 설치 앱은 이전 버전. 새 화면·실기기 서버 통합 검수 필요 |
| 5. 가입 후 필수 동의/전화 인증권 기록 저장 실패 복구 없음 | **남아 있음.** 최신 운영 소스의 실제 DB 쓰기 오류를 주입해 각각 재현. 아래 설명 참조 | 서버 결함이며 새 앱 설치만으로 해결되지 않음 |

추가 제한인 **오프라인 로그아웃 후 서버 세션 폐기 재시도 누락**도 최신 Android 코드에 남아 있다. 가입 취소 전용 outbox가 생긴 것과 logout 재시도는 별개다. signOut은 로컬 토큰을 지우고 이전 세션으로 logout을 요청하지만, 네트워크 실패를 넘기며 해당 세션을 재연결 시 폐기할 큐가 없다. 이번에는 오프라인 실기기 시나리오를 반복하지 않았다. 설치 APK가 이전 실기기 재현의 파일과 동일하며 최신 코드에서도 경로가 유지됨을 확인했다.

## 배포·설치 기준

- 서버 최신 수정: `8fc4a65c966486639f2cfdb14e9b837383930af7`, `build/auth-server-remediation-20261009/backend`, clean.
- 운영 systemd 서비스 active. 실행 중 `/proc/10243/exe`와 `/app/backend/server`의 SHA256은 모두 `a437ca2f0f137d52078b67a66170bbfcca3fe3c6c6b7f58675db12b176b4a53e`. [배포 기록](auth-signup-remediation-2026-10-09.md)의 최종 산출물과 일치한다. 앱·관리자 HTTPS health 각 200.
- Android 최신 수정: `cbbe0fdd4f3a521b895bea7a2ad9f086f0d5e449`, `build/auth-server-remediation-20261009/android`, clean.
- 연결된 Samsung Note9의 `com.dflh.saf.v2`는 versionName 1.3.3 / code 1, 마지막 설치 시각 12:09:45. 설치 APK SHA256 `7ef04105b1b2f9eae0e2a7a17c50f1ba46662a81d5d5dfb18e9a25240e58d4f6`로 [이전 실기기 검수](android-auth-nonpayment-followup-2026-10-09.md)의 `6bf4c61` R8 release QA APK와 일치한다. 버전명만으로 최신 수정 여부를 판단하지 않았다.

## 항목 5의 최신 소스 재현

최신 서버 commit을 별도 source archive로 추출하고 이전 관찰 테스트만 추가했다. 합성 회원·전화번호·동의·SMS 응답과 disposable MariaDB 10.1.38을 사용했다. 원본 worktree와 운영 DB에 오류를 주입하지 않았다. 최신 제품 소스 및 테스트 하네스의 timeout을 변경하지 않았다.

1. 전화 인증과 필수 동의를 정상 완료한 뒤 AUTH_CONSENT INSERT에 trigger 오류를 주입했다. 가입 201, 회원 존재, 동의 기록 0건을 확인했다. 오류를 제거한 뒤 로그인 200이었으며 동의 기록은 여전히 0건이다.
2. 동일한 정상 사전 조건에서 ALUMNI_PHONE_VERIFICATION UPDATE에 trigger 오류를 주입했다. 가입 201, 회원 존재, 인증권 CONSUMED_YN=N 및 CONSUMED_USR_SEQ=NULL을 확인했다. 오류를 제거한 뒤 로그인 200이었으며 소비/회원 소유권 정보가 복구되지 않았다.

최신 `auth_handler.go`의 recordPrivacyConsent/spendPhoneVerification은 해당 오류를 로그로만 남긴다. NativeRegister와 소셜 가입의 finalizeSocialSignup이 이 helper를 호출한다. 이번 DB 장애 재현은 ID/PW 가입 경로에서 실행했다. 소셜 가입 경로에 같은 helper가 있다는 것은 소스 확인 결과이며 소셜 경로에서 두 오류를 별도로 재현했다고 주장하지 않는다.

새 수정은 **continuation finalization 또는 세션 발급 오류가 나더라도 동의/전화 인증권 처리를 시도**하도록 개선했다. 그러나 **그 처리 자체가 실패할 때의 원자성·지속 가능한 복구**는 아직 구현하지 않았다. 운영에서 실제 기록 유실이 발생했다는 증거와는 구분한다.

## 이번 재실행 검사

- Go 서비스·handler 계약: 세부 사례 **35 pass**, 실패/skip 0. 비밀번호 golden 18건, 취소 경쟁, continuation 재시도/소비/만료, 가입 동의 및 연결 경계를 포함한다.
- 실제 HTTP/MariaDB 정상 계약·장애 복구: 세부 사례 **10 pass**, 실패/skip 0. 서버 취소 API, 약한 비밀번호 거부, 회원 commit 이후 세션 발급 실패 안내·terminal 재전송·새 로그인 복구, refresh replay, 기기별/전체 로그아웃, 승인 대기 권한, 정지 회원, 탈퇴 취소 비밀값, 실제 사진 commit을 포함한다. 제공자 검증은 합성이다.
- 남아 있는 결함을 관찰하는 별도 DB 사례 **2건 재현**. 관찰 테스트의 pass는 결함이 남아 있음을 뜻하므로 해결된 검사 수와 합산하지 않는다.
- 최신 Android 복구·취소 outbox·재시도 정책·취소 응답 처리 단위 검사 **25 pass**, 실패/오류/skip 0. Gradle BUILD SUCCESSFUL. 실제 새 앱 설치·제공자·SMS 검수로 대체하지 않는다.

Go 상위 그룹과 하위 사례를 중복 합산하지 않았다. 이번에는 긴 실기기 자동 갱신 검수 및 관리자 UI를 다시 실행하지 않았다.

## 탈퇴 및 QA 데이터 현재 상태

22:46 KST 읽기 전용 확인에서 요청 15/16/22는 processing/database_erased이며 other_identifiers만 PHONE_VERIFICATION_RETENTION_PENDING이다. SMS 5건의 대기 시각은 UTC `2026-10-09 19:03:02`, 한국시간 `2026-10-10 04:03:02`. 아직 보관 기한 전이므로 이번 상태를 최종 완료 실패로 판정하지 않는다. 실제 completed 및 COMPLETED_AT 확인은 기한과 cleanup/worker 실행 이후 남아 있다.

기존 탈퇴 회원 12814/12816/12821은 0건, 새 QA 회원 12822와 phone claim 및 LOCAL_USERNAME/KAKAO는 유지, root 12813 권한 1개 유지, QA 회원의 활성·미소비·미만료 refresh는 0건이다. 사용자 비밀번호·연락처·인증 credential을 조회하거나 보고서에 넣지 않았다.

원시 근거는 `build/auth-current-defects-verification-20261009/`의 운영 실행 파일 SHA, 현재 HTTP 응답, 설치 APK SHA, JSONL/요약에 있다. DB 상태 원본은 `build/auth-nonpayment-qa-20261009/current-defects-recheck.json`. Android 이번 로그는 `build/auth-server-remediation-20261009/current-android-contract-tests.log`.
