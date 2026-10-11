# Android 인증 전체 목표 독립 검수

2026-10-10 KST. 최초 목표는 Android의 ID/PW·카카오 회원가입/로그인, 자동 로그인, 인증 세션 관리와 가입 실패·취소·로그아웃의 경계를 확인하는 것이었다. 후속 지시에 따라 회원 승인, 소셜 연결/해제, 회원 탈퇴도 포함한다. 정기결제와 iOS 기기 조작은 제외한다.

**Android 로컬 우선 로그아웃 수정은 완료됐지만, Android 인증 전체 목표를 모두 완료했다고 판정할 수 없다.** 정상 흐름과 주요 경계의 기존 실기기 근거는 충분하다. 이번 독립 검토에서 늦은 로그인 응답의 서버 정리 실패가 재시도되지 않는 별도 경계, 소셜 해제 후 가입 안내 결함, 탈퇴 최종 확인 시트의 버튼 겹침, 현재 비밀번호 오답의 불필요 refresh를 확인했다. 탈퇴 최종 완료 화면과 일부 장애 화면은 아직 완료 증거가 없다.

이 문서는 소스·검증 자료를 읽고 독립 JVM 회귀를 수행한 agent의 보고서다. 실기기 조작은 별도 Android QA agent가 수행한다. 운영 DB/설정·앱 소스·기존 제품 테스트를 수정하지 않았다.

## 기준과 검증 신선도

- Android 브랜치 `fix/auth-local-first-logout-20261010`, 기준 `00b8f26af7b20d6aefd7971d0f8eade3acf25f28`, 로컬 우선 로그아웃 변경은 미커밋 상태.
- 최신 minified release SHA-256 `5ce15a0a9e3a411fad9ab9a62d86af1548f2291f4e92f653a6829c32af790fee`의 실기기 설치·복원 결과는 [10월 10일 로그아웃 검수](android-local-first-logout-device-2026-10-10.md)에 있다. Play 배포 완료라는 의미는 아니다.
- 최신 전체 Gradle 단위 테스트 94 suite / 685 pass / 0 fail / 0 skip. 실제 XML을 다시 집계한 인증·탈퇴 부분집합은 25 suite / 195 pass다. 두 수치는 중복이므로 합산하지 않는다.
- 신규 회귀는 최신 Gradle `debug` 및 `debugUnitTest` 클래스에 연결했다. 최신 release QA의 `source-manifest.json`에 **기록된 16개 항목**의 해시가 현재 파일과 모두 일치함을 확인했다. 이는 전체 working tree의 모든 소스 해시 검증이 아니다. 전체 Gradle을 다시 실행하지 않았다.
- 20:26 KST에 이번 QA agent들이 수정하지 않은 `AuthScreens.kt` 및 design-system 파일의 추가 변경이 감지됐다. 기기 검수는 계속 고정 release 해시 `5ce15a…`를 대상으로 한다. 아래 로그인 UI 동시 입력 분석은 검수 시작 시점의 baseline `00b8f26` AuthScreens이며, 새 UI 변경을 검증한 결과가 아니다. 해당 baseline과 외부 변경 diff를 증거 폴더에 보관했다. 새로운 working tree 전체를 현재 설치 APK와 동일하다고 주장하지 않는다.
- [10월 9일 비결제 후속](android-auth-nonpayment-followup-2026-10-09.md), [최종 보완](auth-final-hardening-2026-10-09.md), [10월 10일 관리자 연계](auth-admin-followup-2026-10-10.md)의 실기기 검수는 서로 다른 당시 APK에서 수행됐다. 해당 시각과 범위를 유지하고 최신 APK로 재실행한 것처럼 표현하지 않는다.

## 목표별 판정

소스 링크는 현재 workspace 제품 파일이다. `달성`은 표에 적은 범위의 증거가 있다는 뜻이며 모든 가능한 장애를 기기에서 전수 재현했다는 뜻이 아니다.

| 목표/경계 | 현재 판정 | 실제 근거와 신선도 | 현재 소스 | 남은 범위 |
| --- | --- | --- | --- | --- |
| ID/PW 정상 로그인·오류 안내 | 달성 | 최신 release 12827 정상 로그인/cold restore; 기존 hardening의 잘못된 비밀번호·존재하지 않는 ID 오류. 이번 별도 기기 agent도 `native-wrong-password.xml`, `native-valid-login.xml` 확인 | [SessionRepository.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L133), [오류 문구](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L464) | 모든 서버 장애 문구를 실제 운영 UI에서 재현한 것은 아님 |
| ID/PW 신규 가입·SMS·필수 동의·인증 신청 | 최신 APK 실기기 달성 | 이번 최신 release에서 12829 신규 가입 10단계·중복 ID 차단·필수 동의 확인, register201/login200/me200, LOCAL ACTIVE·필수 동의·회원 소유 소비 phone grant·verification pending 확인. `native-new-submitted.xml` 등; 12827의 가입은 이전 설치 앱이므로 별도 구분 | [NativeSignUpViewModel.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/feature/auth/NativeSignUpViewModel.kt#L114), [가입 후 로그인·인증](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L279) | mobile 로그인 실패 재시도는 단위 증거. Native register commit 응답 유실 UI 복구는 별도 미검수 |
| 카카오 앱 우선 인증·로그인·자동 로그인 | 달성 | 최신 release에서 `KakaoTalk/CapriLoggedInActivity`, WebAuthActivity 관찰 없음, 동일 12827 및 cold auto 확인 | [KakaoLoginAdapter.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/KakaoLoginAdapter.kt#L33), [AuthApi.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/AuthApi.kt#L123) | 설치 안 됨/미연결·provider/config/network 오류는 현재 단위 회귀이며 이번 실제 제공자 장애 주입은 없음 |
| 신규 카카오 회원가입·승인·재로그인 | 기존 정상 흐름 달성 / 최신 APK 전체 제출 회귀는 별도 | 10/10 관리자 연계에서 12825 신규 생성·필수 동의·grant·KAKAO ACTIVE·승인·재로그인·자동복원. 최신 12827은 Native→카카오 연결이므로 신규 카카오 가입 전체 성공 증거를 대신하지 않음 | [SessionRepository.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L188), [completeSignUp](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L293) | fresh-provider 신규 가입 성공을 최신 APK로 반복했는지는 별도 device report 참고 |
| 실제 SMS 전달 및 앱 확인 | 달성 | 10/10 01:28:58 실제 요청→Android 알림 수신→코드 앱 확인→VERIFIED_YN=Y; 최신 signup은 허용된 임시 QA 번호/코드를 사용할 수 있음 | [PhoneVerificationController.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/feature/auth/phone/PhoneVerificationController.kt) | 최신 테스트 번호 검증을 실제 SMS 수신으로 표기하지 않음 |
| 승인 대기·승인 복귀·권한 차단 | 달성 | 기존 Native/Kakao 대기 cold restart, 커뮤니티403, 관리자 승인 후 자동복원; 최신 12827 사용자가 승인, 앱 정상 화면 및 대기 로그아웃 확인. 이번 12829 pending→offline cold restore 실패→온라인 재시도에서 같은 SID 보존 확인 | [SessionRepository.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L107), [MainActivity.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/MainActivity.kt#L308) | 반려→재신청/실제 알림 전달은 fixture/소스 근거이며 최신 운영 실기기 전체 회귀 아님 |
| 자동복원·access 만료·refresh rotation | 달성, 최신 실제 만료 대기는 별도 회귀 | 10/9 ID/PW·Kakao 각각 실제 16분 이상 대기 후 동일 family successor 및 오프라인 복구 확인. 최신 release cold auto + 실제 Keystore 계측2통과 | [TokenSessionManager.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/TokenSessionManager.kt#L94), [bootstrap](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L77) | 최신 APK의 실제 만료·동시401·기기 암호화 쓰기 실패는 일부 단위/계약 범위 |
| 서버에서 무효화한 세션의 cold restore 거절 | 최신 APK 실기기 달성 | QA12829의 별도 발급 API 로그인으로 회원 범위를 확인한 뒤 20:43:11 logout/all204. 기기 저장 bundle은 그대로 둔 상태에서 20:43:31 cold me401→refresh401→로그인 첫 화면, 두 번째 cold도 첫 화면. 변경한 비밀번호 재로그인200 확인 | [TokenSessionManager.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/TokenSessionManager.kt#L136), [LogoutAll](../../dflh-saf-v2/backend/internal/handler/auth_handler.go#L364), [전체 종료 범위](../../dflh-saf-v2/backend/internal/service/auth_session.go#L95) | logout/all에 의한 명시적 전체 세션 무효화 검수이며 password-change의 자동 전체 종료나 password-reset 실행 증거는 아님 |
| 카카오 제공자 동의 취소 | 최신 APK 실제 동의 화면 취소 달성 | 이번 탈퇴 요청31의 provider DELIVERED 뒤 실제 CapriLoggedInActivity 동의창에서 명시적으로 취소. foundation 로그인 첫 화면 및 cold 재실행의 같은 첫 화면 확인. `provider-real-cancel-result.json`, `kakao-provider-consent-cancel*.xml`; 기존 취소 경계6단위 통과 | [KakaoLoginAdapter.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/KakaoLoginAdapter.kt#L74) | 신규 서비스 세션0의 운영 observer 확인은 별도 최신 서버 보고를 따른다. 너무 빠른 Back 입력이나 이미 동의된 계정의 자동통과를 동의창 취소 증거로 사용하지 않음 |
| 소셜 가입 폼 명시적 취소·오프라인 재시도 | 달성 | 이전 release 운영 cancel204 및 offline/cold/reconnect204; 최신 release 가입 폼 취소/cold signedout. 이번 별도 기기 agent가 unlink 뒤 가입→offline취소→force-stop→재연결 cancel204 추가 확인 (`social-cancel-result.json`) | [취소 시작/결과](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L349), [취소 outbox](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SocialSignupCancellationOutbox.kt#L56) | 운영 provider credential 원문을 읽어 폐기를 확인하지 않음; TTL 만료/늦은취소/불확실응답은 단위 및 서버 계약 근거 |
| social 가입 실패·post-commit 복구·불확실 제출 | 코드/계약 달성 / 실제 장애 UI 미완료 | 동의/전화 증빙 rollback 및 post-commit 새 제공자 로그인은 격리 HTTP/MariaDB; current Android completion4·cancellation-review7통과. 기존 실제 전화번호 pending deletion 거부 후 서비스 세션0 및coldsignedout 확인 | [submitKakaoMember](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L201), [불확실 취소](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L362) | 운영 장애를 주입하지 않음; completed-login-required/processing/unconfirmed 실제 기기 렌더는 추가 제어 fixture 대상 |
| 카카오 연결·연결 해제·재연결·마지막 수단 보호 | 달성 | 기존 release unlink/relink동일회원; 최신12827카카오연결성공, 이번 별도 device agent unlink성공 (`unlink-confirm.xml`). 카카오만있는12825 마지막수단제한실기기 확인 | [AccountConnectionsRepository.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/AccountConnectionsRepository.kt#L37), [API](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/AuthApi.kt#L165) | 최신 release에서 같은 REVOKED provider 가입 8단계·SMS 후 최종409까지 재현. 아래 UX 결함 참고 |
| 정상·오프라인 로그아웃·process death·원격 정리 | 최신 실기기 달성 | 최신release Native/Kakao/profile/pending/cancel/cold 및 재연결 활성refresh1→0·등록1→0; hold fixture는 원래서버활성중signedout/cold 확인 | [SessionViewModel.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/feature/auth/SessionViewModel.kt#L327), [prepareSignOut](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L394), [deferred contract](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/AuthApi.kt#L188) | 저장 실패의 process-death 지속성은 보장 불가로 정확히 경고; 원격 즉시삭제를 offline이라고 주장하지 않음 |
| 같은/다른 계정 경합·다른 SID·root 보호 | 로그아웃 cleanup 경합 달성 / 로그인 응답 폐기 경합은 아래 결함 | 최신실기기 hold→same/newaccount→lateunconfirmed에서 새SID/UI/cold유지; 운영같은회원별도API SID보존/root4SID보존 | [operation guard](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L69), [TokenSessionManager.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/TokenSessionManager.kt#L141) | 늦은 **로그인** 성공 응답의 원격 정리 실패는 durable outbox 우회 |
| 탈퇴 접수·취소·이용 차단·영수증 복원 | 기존 실기기 달성 | 요청23취소/24재요청/관리자처리,26Kakao탈퇴·provider해제·회원identity세션삭제, processing후취소불가. 현재Repository16단위 | [AccountDeletionRepository.kt](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/feature/accountdeletion/AccountDeletionRepository.kt#L106), [별도 secret lookup](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/feature/accountdeletion/AccountDeletionRepository.kt#L163) | 최신APK의receipt최종complete렌더는없음 |
| 탈퇴 최종 completed·완료 화면 | 미완료 | 마지막본인확인가능보고서는10/10 01:35:54,24/25/26 processing/database_erased/SMS보관대기. 정책대기를제품결함으로단정하지않음 | [최종조회기록](auth-erasure-completion-2026-10-10.md) | 기한 이후 실제worker completed/COMPLETED_AT·기기완료화면확인 필요. 더최신운영상태는별도server agent판정 |
| 로그아웃/탈퇴 이후 실제 푸시 미전달 | 등록정리 달성 / 실제 전달 검수 미완료 | 최신운영device-registration0 및다른SID보존; 실제알림전송기능까지보증하지않음 | [push registration](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/MainActivity.kt#L293) | controlled actual delivery는별도허용범위에서전송검수필요 |

## 추가 발견: 늦은 로그인 응답 정리의 재시도 누락

**ANDROID-AUTH-AUDIT-01 — P2, 코드·독립 회귀로 확인한 계약 결함. 실제 사용자의 UI 발생 재현은 아직 별도다.**

**수정 전 검수 기준**의 [SessionRepository.kt:169–173](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/auth/SessionRepository.kt#L169) `discardSession`은 이전 로그인/가입 응답의 access token으로 `authApi.logout(access)`를 한 번 요청하고 `runCatching`으로 실패를 버렸다. 응답에 refresh token이 있어도 `logout/deferred`나 `LogoutRetryOutbox`를 사용하지 않았다. 오래된 응답은 현재 UI/암호화 bundle에 적용되지 않지만, 정리 요청이 통신 실패하면 원래 서버 family가 활성으로 남았다. 이후 승인된 코드 보완 결과는 문서 끝의 후속 구현 항목에 별도로 기록한다.

독립 회귀는 합성 1001·1002만 사용하며 실제 운영/기기/관리자/사용자 자격 증명에 접근하지 않는다. 현재 제품의 `AuthApi`, `DflhApiClient`, `TokenSessionManager`, `SessionRepository`를 사용하고 OkHttp interceptor가 외부 네트워크 없이 서버 상태·지연·IOException을 재현한다.

1. A 로그인 요청과 응답을 보류한다. B 로그인을 완료한다.
2. 이전 A 성공 응답이 뒤늦게 도착하여 현재 generation에서 폐기된다.
3. A 정리 요청만 IOException으로 실패시킨다. 새 B의 상태와 암호화 bundle은 보존된다.
4. 연결 복구를 모델링하고 실제 `drainPendingAuthCleanup()`을 호출한다.
5. A family 활성, B family 활성, outbox 0건, 정리 요청 총1회다. 재시도할 정리 intent가 없다.

독립 검사3개: 정상온라인대조 PASS, 현재결함관찰 PASS, 요구계약 “재연결 후 폐기한 A family 종료” RED. 이 RED는 기존685개 실패가 아니라 기존 suite에 없었던 새 경계다. 온라인 정상대조에서 A만 종료되고 B는 보존됨을 확인한다.

권장 보완은 **폐기한 응답 bundle만** encrypted outbox에 저장하고 원래 refresh proof로 정리하는 경로다. 기존 `enqueueForLogout`는 현재 token 제거까지 함께 commit하므로 B가 이미 로그인된 상황에 그대로 호출하면 B까지 지운다. 활성 bundle을 건드리지 않는 별도 enqueue가 필요하다. 버려진 응답의 cleanup에 현재 B의 기기 토큰을 캡처해서도 안 된다. app scope를 사용하고 재연결/process death와 같은계정 새SID까지 회귀해야 한다.

이 검토의 사용자 UI 도달성은 별도로 분석한다. 기존 SessionGenerationRegressionTest의 직접 Repository 경합만으로 사용자가 쉽게 재현한다고 단정하지 않는다. 로그인 UI 설명은 `AuthScreens-validated-release-baseline.kt`의 검수 시작 시점 코드이며 20:26에 감지된 외부 UI 변경은 현재 APK에 없다. `SessionViewModel.login`에 중복 submitting guard가 없고 ID 로그인 button/IME Go는 렌더 시점 `canSubmit`을 공유하지만, 다음 렌더에서는 입력/버튼이 비활성화된다. 실제 UI 연속 입력으로 늦은 성공 경합이 일어나는지는 아직 기기 재현 전이다. 단순 coroutine 취소는 DflhApiClient가 `call.cancel()`을 수행하고 비활성 callback을 무시하므로 “뒤로가기하면 반드시 늦은 응답이 적용된다”는 설명은 성립하지 않는다.

## 연결 해제 후 신규 가입의 기존 UX 경계

**ANDROID-AUTH-AUDIT-02 — P3, 최신 release 실기기에서 확인한 안내/진입 UX 결함. 소유권을 유지하고 새 가입을 차단하는 정책은 정상이며 보안 우회는 없다.**

현재 서버 [social_auth_service.go:105](../../dflh-saf-v2/backend/internal/service/social_auth_service.go#L105)는 [auth_repo.go:130](../../dflh-saf-v2/backend/internal/repository/auth_repo.go#L130)의 ACTIVE 연결만 조회한다. REVOKED 연결은 신규 continuation/가입 양식을 받는다. 최종 `CreateSocialAccount`에서 남아 있는 canonical identity 소유권 유일성이 새 회원 생성을 막고 [auth_social_link_handler.go:181](../../dflh-saf-v2/backend/internal/handler/auth_social_link_handler.go#L181)이 409 `SOCIAL_ACCOUNT_ALREADY_LINKED`를 반환한다. 명시적 재연결은 [account_connections_repo.go:51](../../dflh-saf-v2/backend/internal/repository/account_connections_repo.go#L51)에서 동일 소유자의 REVOKED identity만 ACTIVE로 되돌린다.

10/10 이번 device agent가 최신 release에서 12827의 카카오를 해제하고 동일 Talk provider의 신규 가입 양식으로 두 번 진입했다. 미가입 QA 번호의 SMS 잘못된 코드 거부·올바른 코드 확인을 거쳐 8단계 전체를 진행한 뒤 최종 제출에서 “이미 다른 계정에 연결된 소셜 계정입니다. 다시 로그인해주세요.” 409가 표시됐다. 서버 observer는 회원 생성 rollback과 새 회원0을 확인했다.

같은 카카오로 로그인하면 다시 신규 가입 양식에 진입하는 상태이므로 “다시 로그인”만으로 기존 계정에 돌아갈 수 없다. ID/PW로 로그인하고 카카오를 명시적으로 재연결해야 하는데, 현재 안내에는 이 경로가 없다. 입력/문자 인증 후에야 거절하는 점과 복구 안내 누락을 UX 결함으로 분리한다. 최종409 뒤 세 번째 카카오 로그인은 수행하지 않았으므로 그 반복을 별도 실기기 횟수로 주장하지 않는다.

최신 증거: `social-unlinked-signup.xml`, `social-conflict-start.xml`, `social-conflict-phone.xml`, `social-sms-wrong-error.xml`, `social-sms-correct.xml`, `social-final-review.xml`, `social-final-conflict-error.xml`, `social-conflict-cancel.xml`. 시작 단계에서 provider 검증 후 기존 ID/PW 로그인·재연결을 안내하고 신규 가입 양식을 열지 않는 보완이 적절하다.

## 탈퇴 최종 확인 시트의 취소 버튼 겹침

**ANDROID-AUTH-AUDIT-03 — P3, 최신 release / Galaxy Note9 Android 10의 3버튼 내비게이션에서 확인한 UI 결함.**

새 QA 회원 12829의 승인 대기 화면에서 계정 삭제 안내를 열고 최종 확인 시트까지만 진입했다. 실제 `delete-confirmation-preview.png`에서 하단 “취소” 글자와 시스템 Home 아이콘이 겹친다. `native-delete-confirmation-preview.xml`의 해당 텍스트 bounds는 `[0,0][0,0]`이고, “계정 삭제 요청”은 화면에 보인다. 본 agent도 이미지를 직접 확인했다. 이 관찰을 위해 탈퇴를 접수하지 않았다.

[AccountDeletionScreen.kt:151–159](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/feature/accountdeletion/AccountDeletionScreen.kt#L151)의 `ModalBottomSheet` 내부 `Column`에는 **이미 `navigationBarsPadding()`이 있다.** [MainActivity.kt:143](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/MainActivity.kt#L143)는 edge-to-edge를 적용한다. 그러므로 “navigationBarsPadding이 빠졌다”는 원인 설명은 틀리다. 해당 dialog의 실제 inset 값, inset 소비 여부, 시트 높이/부분 확장 상태는 아직 계측하지 않아 정확한 원인은 미확정이다. 내부 Column에는 스크롤 처리가 없다.

최종 취소 동작의 버튼이 시스템 영역에서 분리되지 않는 것은 현재 실기기 결함이다. 시스템 Back 또는 바깥 영역으로 시트를 닫을 수 있고 파괴적 요청 자체가 막힌 것은 아니므로 P1/P2 전체 탈퇴 불능으로 과장하지 않는다. dialog inset을 실측하고 안전 영역 안에 두 버튼을 완전히 배치해야 한다. 수정 시 3버튼/제스처 내비게이션, 작은 높이·큰 글자 크기에서도 확인하고 단순 padding 중복 추가로 해결됐다고 가정하지 않는다.

구조 확인 근거: `deletion-sheet-source-review.json`. 그림·XML의 개인정보는 새로 조회하지 않았고 원시 secret/SDK token을 읽지 않았다.

## 비밀번호 변경과 기존 세션 정책

최신 release의 QA 회원 12829가 승인된 뒤 실제 기기에서 비밀번호 변경을 추가 검수했다. 잘못된 현재 비밀번호는 거절되고 입력 화면이 유지됐다. 올바른 변경은 성공 안내를 표시했으며 현재 모바일 SID는 활성 상태로 유지됐다. 로그아웃 뒤 이전 비밀번호는 거절됐고 새 비밀번호 재로그인은200으로 성공했다. 기존 개인/root 비밀번호가 아닌 이번에 생성한 QA 자격 증명만 사용했다.

현재 [ProfileViewModel.kt:338–347](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/feature/profile/ProfileViewModel.kt#L338)은 변경 성공 후 입력을 지우고 화면을 닫으며 로그아웃하지 않는다. 서버 [password_change_handler.go:42](../../dflh-saf-v2/backend/internal/handler/password_change_handler.go#L42)는 계정 번호와 현재/새 비밀번호만 전달한다. [PasswordMutationRepository.ChangePasswordAtomically](../../dflh-saf-v2/backend/internal/repository/password_mutation_repo.go#L84)는 canonical/legacy 비밀번호를 같은 transaction에서 업데이트하고 commit한다. 모바일 refresh·canonical family·web session·push 등록을 종료하는 동작은 없다.

[MobileSessionIssuer.Rotate:54–94](../../dflh-saf-v2/backend/internal/service/mobile_session_issuer.go#L54)와 [auth middleware:44–58](../../dflh-saf-v2/backend/internal/middleware/auth.go#L44)은 token/family 활성·회원 자격을 확인하지만 비밀번호 변경 version을 비교하지 않는다. 따라서 비밀번호 변경 전에 발급된 다른 모바일 SID도 별도로 종료하지 않으면 현재 구현에서 계속 사용할 수 있다. 이번 운영 관찰은 현재 기기 SID 유지 확인이며, 비밀번호 변경 전의 다른 실기기 세션까지 직접 갱신했다는 주장은 아니다.

**판정은 명시적인 세션 정책 공백/보안 보완 후보다. 기존 요구 위반 결함으로 자동 집계하지 않는다.** 검토한 제품 문서에서 인증된 비밀번호 변경 후 다른 세션을 모두 종료한다는 계약은 찾지 못했다. 현재 기기 유지·다른 기기 종료, 전체 종료·재로그인, 모든 세션 유지 중 어느 정책인지 결정하고 UI에 설명해야 한다. 비밀번호 변경을 기존 토큰 접근을 끊는 수단으로 제공하려면 다른 SID에 대한 서버 종료를 검증해야 한다.

비밀번호를 잊었을 때의 **reset**은 다르다. [ConfirmResetAtomically:132–147](../../dflh-saf-v2/backend/internal/repository/password_reset_repo.go#L132)은 모바일 refresh와 canonical family를 모두 종료한다. 현행 reset-request는 `{email}`, reset-confirm은 `{token,newPassword}`이고 전화번호/SMS code를 통한 reset API는 없다. canonical verified EMAIL identity로 reset 이메일을 발송하므로 LOCAL_USERNAME 가입 회원의 단순 프로필 이메일이나 SMS grant를 reset 자격으로 바꿔 써서는 안 된다. 이 QA에서 확인한 change와 아직 실행하지 않은 reset을 같은 기능/정책으로 표현하지 않는다.

별도의 무효 세션 복원 검수는 비밀번호 reset 대신 표준 `POST /api/auth/logout/all`로 수행했다. root agent가 이번에 생성한 QA12829의 새 로그인 토큰만 사용하고 회원12829 확인 후 전체 종료를 호출했다. 서버204 및 해당 API 토큰401을 확인했고, 기기에서 기존 bundle을 보유한 채 cold bootstrap하자 me401→refresh401 이후 로그인 첫 화면으로 돌아갔다. 다시 cold restart해도 로그인 첫 화면이며 변경된 비밀번호 로그인200으로 복구됐다. 이로써 최신 release의 실제 서버 무효화 세션 거절은 확인됐다. 기존 root/개인 계정 자격 증명은 사용하지 않았다. 증거는 `qa-logout-all-result.json`, `native-server-revoked-cold.xml`, `native-server-revoked-second-cold.xml`과 별도 서버 observer의 최신 snapshot이다.

## 현재 비밀번호 오답의 불필요 refresh

**ANDROID-AUTH-AUDIT-04 — P3, 실제 운영 요청과 독립 분기 회귀로 확인한 오류 처리 결함.**

서버 observer는 20:38:45–46 KST의 `profile/password 401 WRONG_PASSWORD → auth/refresh 200 → 같은 profile/password 401`을 확인했다. 기기에는 올바른 현재 비밀번호 오류 안내가 표시됐고 로그인은 유지됐다. 이는 로그인 세션 만료가 아닌 비즈니스 검증 실패를 토큰 만료처럼 처리한 경우다.

[ProfileApi.kt:48–53](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/feature/profile/data/ProfileApi.kt#L48)은 기본 `retryUnauthorized=true`를 사용하고, [DflhApiClient.kt:375–390](../../dflh-saf-v2-kotlin/app/src/main/kotlin/com/dflh/app/core/network/DflhApiClient.kt#L375)은 응답 code를 보지 않고 인증된 모든401에서 refresh를 시도한다. 따라서 아직 유효한 access token도 refresh가 회전하며 동일한 오답 변경 요청을 다시 보낸다.

새 독립 회귀3개는 실제 ProfileApi/AuthApi/DflhApiClient/TokenSessionManager와 합성 OkHttp 응답만 사용했고 모두 통과했다. 기존685개와 별도 검사다.

| refresh 응답 | 관찰 | 세션 판정 |
| --- | --- | --- |
| 200 | password2회·refresh1회·불필요 access rotation | 로그인 유지, local clear0 |
| IOException | password1회·refresh1회; 최초 WRONG_PASSWORD 대신 network 예외가 호출자에 전달 | 원래 bundle 유지, local clear0 |
| 401 | password1회·refresh1회 | 서버가 refresh를 거절한 뒤 현재 generation의 bundle 제거/local clear1 |

잘못된 현재 비밀번호만으로 무조건 로그아웃되는 버그는 아니다. refresh401/403 뒤의 종료는 현재 세션이 서버에서 거절된 상황에 대한 정상 처리다. 다만 refresh가 없어도 될 business401에서 부가 네트워크 실패로 원래 비밀번호 오류가 가려지고 필요 없는 session rotation·중복 요청을 만든다. `WRONG_PASSWORD` 같은 business error와 실제 인증 세션401을 구분하여 전자는 refresh하지 않는 보완이 적절하다.

증거: `native-password-change-wrong-current-error.xml`, `native-password-change-success.xml`, `native-old-password-rejected.xml`, `PasswordBusiness401AuditTest.kt`, `password-business401-junit.log`, `password-business401-result.json`. 운영 호출/원시 토큰 읽기는 본 독립 agent가 수행하지 않았다.

## Kakao SDK의 제공자 토큰 캐시 범위

`KakaoLoginAdapter.kt:21–27`은 SDK의 `loginWithKakaoTalk`/`loginWithKakaoAccount`에서 받은 access token을 서비스 로그인 API에 전달한다. 현재 app 소스 전체에서 SDK의 `UserApiClient.logout` 또는 `TokenManagerProvider.clear` 호출은 없다. Kakao 공식 문서는 SDK가 이전 토큰의 존재를 조회할 수 있고, SDK `logout()`은 저장된 토큰을 요청 성공 여부와 관계없이 폐기한다고 설명한다. [Kakao Android SDK 문서](https://developers.kakao.com/docs/ko/kakaologin/android#logout).

따라서 지금 검수의 “로그아웃·가입 취소 후 세션 없음”은 **foundation 서비스 access/refresh 및 해당 가입 continuation 범위**다. SDK가 관리하는 제공자 캐시까지 완전히 비웠다는 검증은 아니다. 실제 기기의 SDK 토큰 원문·파일은 읽지 않았고, 현재 유효성/잔존 여부도 추출하지 않았다. 서비스 bootstrap은 foundation의 암호화 bundle과 auth/me를 사용하므로 이 소스 확인만으로 자동 로그인 우회나 악용을 주장하지 않는다.

KakaoTalk에 로그인된 계정 자체, 앱별 SDK provider OAuth 캐시, foundation 서비스 세션을 구분해야 한다. Talk 로그인 보존이 앱별 SDK 캐시 보존을 필수로 만드는 것은 아니다. 로그아웃/명시적 가입 취소 후 앱별 제공자 캐시도 지울지에 대한 명시적 제품 정책이 없어 **추가 자격 증명 정리 검토/검증 항목**으로 남긴다. 후속 결정 시 provider cache cleanup도 현재 auth generation에 한정하고 새 로그인 캐시를 뒤늦은 이전 정리가 지우지 않도록 해야 한다.

## 세션 보존을 결함으로 혼동하면 안 되는 경우

- 계정/소셜 identity 생성이 commit된 뒤 동문 인증 신청만 실패하면 계정과 로그인 세션을 유지하고 인증 신청을 재시도한다. 이는 “가입이 실패했으니 모든 계정 삭제”가 아니다. 소스는 pending/submitting-verification과 완료 후 fresh-login-required를 구분한다.
- 제출 전 validation 실패는 재시도를 위해 제한된 continuation을 유지할 수 있다. 명시적 취소는 cancel API로 정리한다. process death로 명시적 취소가 전송되지 않은 경우 원래5분TTL을 넘기지 않는 정책 근거와 현재 service session이 발급되지 않았는지를 함께 봐야 한다.
- foundation app 로그인과 KakaoTalk에 로그인된 제공자 계정 자체는 다르다. 앱 로그아웃이 Talk 계정을 강제 로그아웃해야 한다는 요구는 없었다.
- 탈퇴의 database_erased와 전체 completed는 다르다. SMS24시간 보관 대기를 완료라고 표기하거나 상태를 강제 바꾸지 않는다.

## 근거와 후속 우선순위

본 agent의 새 자료는 `build/android-auth-goal-audit-20261010/` 아래 `LateLoginCleanupAuditTest.kt`, `run-audit.py`, `compile.log`, `junit.log`, `result.json`, `auth-suite-evidence.json`이다. 같은 폴더에 별도 device agent의 신규 화면/결과가 추가될 수 있다. QA 자격 증명·원시 연락처·OTP·token 파일은 공유 대상이 아니다.

1. 최신 APK 신규 Native 가입/해제/소셜 취소 및 오류 검수가 추가 통과했다. 별도 device agent의 최종 결과를 함께 종합한다.
2. 늦은 로그인 응답의 durable cleanup 누락, 해제된 소셜 계정의 가입 진입/복구 안내, 탈퇴 시트 취소 버튼 겹침, 비밀번호 오답의 불필요 refresh를 각각 보완하고 해당 경합·화면을 재검수한다.
3. 처리 기한 이후 탈퇴 요청 24·25·26의 최종 완료와 기기 영수증 화면을 확인한다.
4. post-commit·처리 중·불확실 응답의 화면을 운영 장애 없이 제어 서버로 검수하고, 실제 푸시 미전달을 확인한다.

최초의 양 플랫폼 목표 전체 판정은 iOS 독립 증거와 서버 최신 운영 검토를 함께 봐야 한다. 이 Android 보고서만으로 양 플랫폼 전체완료를 선언하지 않는다.

## 후속 구현: 폐기된 로그인 응답의 지속 정리

사용자가 결함 보완을 승인한 뒤 ANDROID-AUTH-AUDIT-01을 제품 회귀로 옮겨 RED를 확인하고 코드를 수정했다. 초기 제품 테스트4개 중 온라인 대조1개는 통과했고 재연결·재시작·동일 회원 새SID3개는 실패했다. 결과는 `build/android-auth-remediation-20261010/discarded-login-red.log` 및 XML에 보존했다.

현재 `SessionRepository.discardSession`은 응답의 원래 bundle만 `LogoutRetryOutbox.enqueueDiscardedSession`에 저장한 뒤 기존 application scope로 정리한다. 이 저장은 `savePendingLogouts`를 사용하며 새 로그인의 bundle을 지우지 않는다. 현재 로그인의 push token도 폐기 응답에 캡처하지 않는다. 원래 refresh proof의 deferred cleanup, transient retry와 expiry 제한을 기존 outbox에서 재사용한다. 명시적 로그아웃의 atomic login-clear 계약은 유지한다. TokenStore 변경은 없다.

최종 targeted GREEN은6 suite / 41 tests / 0 failures / 0 errors / 0 skipped이며 01 신규 회귀10개와 기존 generation/offline/local-first logout, 별도 담당04 비밀번호 오류 회귀5개를 포함한다. 온라인, offline/reconnect, 새 manager/repository로 재시작한 B bootstrap 보존, 동일 회원 새SID, legacy access-only bearer, application scope, 취소 경계, atomic clear 분리, proof expiry, 저장 실패의 메모리 fallback을 확인했다. 집계와 XML·소스 해시는 `build/android-auth-remediation-20261010/discarded-login-remediation-result.json` 및 `green-TEST-*.xml`, 자세한 구현 기록은 같은 폴더의 `01-discarded-session-remediation.md`에 있다.

이 결과는 코드 보완과 해당 회귀의 완료다. 사용자 UI에서 late HTTP trigger를 실제 기기로 재현하거나 새 APK를 배포했다는 증거는 아니다. 전체 빌드와 수정 APK의 기기 검수는 root가 통합 진행한다. 최초 감사의 고정 release5ce 결과와 이 후속 working-tree 코드를 구분한다.

## 후속 구현: 최종 소셜 가입 충돌의 복구

독립 최종 리뷰에서 새 provider 로그인 preflight만 개선하면 기존 continuation이나 ownership 경합의 최종409에 기존 “다시 로그인해주세요” 안내가 남는 것을 확인했다. 서버의 안내·rollback/cancel 회귀는 별도 담당이 보완한다. Android는 추가 승인에 따라 `SOCIAL_ACCOUNT_ALREADY_LINKED`도 기존 `OWNERSHIP_CONFIRMATION_REQUIRED`와 같이 precommit 실패로 처리하도록 수정했다.

원래 continuation을 취소 outbox에 저장하고 해당 generation/revision이 현재일 때만 SignedOutWithError로 로그인 화면에 돌아간다. captured token 단독 취소 후 NotCompleted를 반환하며, 늦게 도착한 충돌은 새 로그인 bundle/UI를 바꾸지 않는다. 오류 안내는 apiMessage를 우선 사용하고, 없으면 “이미 연결된 소셜 계정입니다. 기존 로그인 방법으로 로그인한 뒤 계정 설정에서 소셜 계정 연결을 확인해주세요.”를 사용한다. 이전01 durable cleanup 보완은 유지한다.

제품 RED6개 중 기존 초기 거절 대조2개 PASS, 최종 제출 충돌4개 FAIL을 확인했다. 후속 GREEN은5 suite / 41 tests / 0 failures / 0 errors / 0 skipped: SocialRelinkRecovery6, 기존 SessionRepository14, SessionGeneration10, SignupCompletion4, DiscardedLoginCleanup7이다. 현재 충돌 복구·늦은 충돌 뒤 새 로그인 보존·오프라인 취소/reconnect·message 없는409를 actual AuthApi/DflhApiClient와 합성 HTTP로 검증했다. 이전01+04의41개와 겹치는 별도 집계이므로 합산하지 않는다.

로그/XML·최종 소스 해시는 `build/android-auth-remediation-20261010/social-conflict-recovery-result.json`, `social-conflict-recovery-red.*`, `social-conflict-recovery-green.log`, `social-green-TEST-*.xml`에 있고 자세한 기록은 `02-late-social-conflict-remediation.md`에 있다. 운영/기기/commit은 본 담당이 수행하지 않았다. 전체 빌드·배포·수정 APK 기기 결과와 별도로 해석해야 한다.
