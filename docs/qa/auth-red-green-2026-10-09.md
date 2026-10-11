# 인증 결함 수정·재검수 — 2026-10-09

현재 진행 중이다. 수정 전 실패, 수정 후 단위 테스트, 실기기 결과, 운영 서버 적용을 각각 구분해 기록한다. 기존 root 계정과 이관한 실제 자료를 보존하고 Android 세션의 활성 작업 영역을 변경하지 않는다.

## 담당과 작업 범위

사용자가 이 세션의 우선 담당을 iOS 수정 및 통합 재검수로 지정했다. 다른 세션의 공통 서버 작업이 끝난 뒤 이번 iOS QA에서 발견한 모든 공통 서버 문제의 해결 여부를 검증하고, 남은 문제는 이 세션에서 추가 회귀 테스트와 함께 수정한다.

iOS 작업 브랜치는 `fix/ios-auth-red-green-20261009`이며 시작점은 main `dad5cdf`다. 기존 `ObservableObject` 및 Xcode 프로젝트는 DebugBridge 코드 생성과 호환되지 않는다. 기존 XCUITest 실기기 증거와 결정적으로 응답 순서를 제어하는 XCTest를 사용한다. 설치된 앱을 대체하지 않는 별도 QA bundle 및 테스트 하네스를 준비했다. Apple의 실제 외부 인증 성공은 해당 등록 client/audience로 수행한 경우에만 통과로 기록한다.

## RED — 수정 전 실제 실패

- 최초 선택 단위 테스트 17건 중 7개 테스트 케이스 실패: 세션 응답 경합 6개와 연결 해제 확인창 dismiss 경합 1개. 기존 정상 경로와 오프라인 bootstrap 통제는 통과했다.
- 인접한 소유권 경계 5개를 추가한 RED 22건 중 12개 실패. 이전 refresh 성공·강제 refresh 실패와 새 로그인, 원격 로그아웃 진행 중 늦은 비밀번호 로그인, 이전 비밀번호 로그인 완료와 새 로그인, 이전 가입 취소와 새 세션을 포함한다.
- 설치 앱 1.3.3의 실기기 비밀번호 RED: 새 회원 ID의 중복 확인 → 비밀번호 단계에서 짧은 테스트 값 입력 → 다음 버튼 → 확인 단계로 이동하는 문제가 17.797초의 회귀 테스트에서 실제 실패했다. 계정 생성이나 전화 인증은 하지 않았다. 첫 하네스 실행은 잘못된 가입 버튼 식별자 때문에 실패했으므로 제품 결함 증거에서 제외하고, 식별자를 바로잡은 실행만 RED로 계산한다.

비공개 원시 증거는 `build/auth-ios-fix-20261009/red.log`, `Red.xcresult`, `red-extended.log`, `RedExtended.xcresult`, `weak-password-device-red-corrected.log`, `device-runner/WeakPasswordRedCorrected.xcresult`다. 원시 로그·스크린샷·QA 비밀번호·문자 인증값은 공개 문서에 포함하지 않는다.

## 진행 중인 수정

- 사용자 또는 세션이 바뀐 뒤 도착한 인증·refresh 결과의 저장과 UI 반영을 차단한다.
- 연결 해제 최종 확인은 동기적으로 수락하고 비동기 요청을 이어가도록 변경한다.
- native 가입 비밀번호 검증을 기존 서버의 변경·재설정 정책에 맞추고, 짧은 값·누락 문자 종류·UTF-8 경계를 검증한다. 서버의 가입 정책 통일은 공통 서버 작업 완료 후 확인한다.

## 최초 GREEN과 추가 경계 검수

첫 집중 GREEN은 72개 테스트, 실패 0건이었다. 수정 전 세션·확인창 회귀, 기존 token manager·소셜 가입·세션 경계 통제 및 native 비밀번호 정책 테스트를 포함한다. 증거는 `green-focused.log`와 `GreenFocused.xcresult`다.

검토에서 지연된 토큰 저장, 이전 가입 인증 요청의 retry와 새 계정, 지연된 HTTP401 및 이전 인증 POST의 새 계정 재전송 경계도 확인해 추가 RED/GREEN을 수행 중이다. 서버의 실제 Apple audience 설정은 기존 bundle을 허용하고 별도 QA bundle은 허용하지 않음을 읽기 전용으로 확인했다. 별도 QA 빌드의 결과를 실제 Apple 제공자 성공으로 확대하지 않는다.

전체 빌드, 실기기 재검수 및 공통 서버 고정 commit 검증 결과는 확인 후 추가한다. 아직 수정 완료·출시 통과로 판정하지 않는다.

## 실기기 비밀번호 GREEN

기존 앱을 보존한 별도 `com.daeil.dflhsafv2.authqa` 빌드를 실제 iPhone15에 설치했다. 같은 짧은 비밀번호 입력 후 다음 버튼을 눌러도 비밀번호 단계가 유지되고, 확인 필드가 나타나지 않으며, 최소 길이 안내가 표시되는 회귀 테스트가 19.526초에 통과했다. 해당 테스트에서는 회원 생성·SMS 요청이 없다. 증거는 `weak-password-device-green-qa.log`와 `device-runner/WeakPasswordGreenQA.xcresult`다. 별도 앱 빌드도 `qa-device-build-corrected.log`에서 성공했다.

이 빌드는 첫 집중 GREEN 소스 스냅샷이다. 추가 세션·HTTP·Apple 상태 경계 수정 후 최종 소스로 다시 빌드하고 재검수한다. 카카오 callback URL 및 Apple entitlement는 기존 앱과의 간섭을 피하려고 별도 빌드에서 제외했으므로 제공자 인증의 최종 통과 증거로 사용하지 않는다.

새 회원 `AuthQAIOSRegression`/12820은 이 별도 앱에서 정상 비밀번호로 ID/PW 회원가입을 했다. iOS 전용 테스트 전화번호의 인증, 필수 동의, 가입 제출, 승인 대기 상태 cold restart가 50.603초에 통과했다(`native-signup-first-green-qa.log`, `device-runner/NativeSignupFirstGreenQA.xcresult`). QA 관리자 탭에서 이름과 회원 번호를 확인하고 이 회원만 승인했으며, ‘승인이 완료되었습니다’와 빈 가입 신청 목록을 확인했다. 원본 root 및 다른 세션의 Android 회원은 변경하지 않았다. 해당 QA 회원은 후속 재검수에 사용한 뒤 정상 탈퇴 절차로 정리한다.

승인 후 실기기 ID/PW 회귀도 51.117초에 통과했다. 승인 후 cold start, 로그아웃 취소 시 세션 유지, 확정 후 cold start signed-out, 오답 비밀번호 차단, 정답 재로그인 및 본인 프로필 cold start 복귀를 확인했다(`native-cycle-first-green-qa.log`, `device-runner/NativeCycleFirstGreenQA.xcresult`). 별도 읽기 전용 DB 검수에서 해당 QA의 사용 가능한 refresh1건과 로그아웃으로 철회된 refresh1건을 확인했다. 이 서버는 `REVOKED_AT`/`CONSUMED_AT`가 실제 판정 컬럼이므로 legacy `MRT_REVOKED_AT`의 NULL을 활성 세션으로 계산하지 않는다. root의 활성 LOCAL identity1·social identity0은 유지됐다.

## 추가 통합 GREEN 및 최종 검토

HTTP lane의 RED는 7개 테스트 중 3개 케이스가 실패했고, 수정 후 기존 retry·no-content 통제와 함께 30개 테스트가 모두 통과했다(`network-green.log`, `network-green.xcresult`). 새 로그인 뒤 이전 GET/POST/optional/multipart 응답·재시도·invalid-session callback이 새 계정에 적용되지 않고, 같은 세션 회전의 재전송과 본문은 보존됨을 검증했다.

Apple 식별정보 지연 조회 RED는 5개 테스트 중 3개 케이스가 실패했다. 이전 식별값 조회, 같은 Apple ID의 재로그인 및 Apple과 무관한 native 세션을 포함한다. 수정 후 실패한 binding 조회와 지연 binding 조회를 포함한 7개 통제가 통과했다. Apple 인증 결과가 로그아웃 또는 새 native 로그인 뒤 식별값을 저장하는 두 경계도 추가 RED에서 확인하고 소유권을 적용했다. 만료된 이전 access token의 같은 SID 회전은 현재 token을 사용하도록 보완했다.

이 시점 전체 iOS unit 테스트 641건이 실패 0건으로 통과했다(`green-full.log`, `GreenFull.xcresult`). 후속 독립 검토에서 회원 탈퇴·소셜 연결의 시작 세션 소유권 경계를 추가 발견해 RED/GREEN을 수행 중이다. 이 추가 변경 후 전체 테스트와 iOS SDK build를 다시 고정해 검증한다. 첫 641건 통과를 후속 미검증 변경의 통과 증거로 확대하지 않는다.

## 최종 iOS 소스 검증

추가 경계를 모두 포함한 최종 전체 unit 테스트는 **658/658 통과, 실패0·skip0**이다(`GreenFinal.xcresult`, `green-final.log`). generic iOS Simulator SDK build도 `generic-build.log`에서 **BUILD SUCCEEDED**로 완료됐다. 두 에이전트의 50개 집중 검수는 전체 658건에 포함되므로 합산하지 않는다.

소셜 연결은 시작 세션을 명시적으로 `withSessionAuthorizationContext`에 전달해 제공자 인증 뒤 repository/API actor 경계를 넘어갈 때도 새 계정의 헤더를 사용하지 못하게 했다. 세션 변경 시 연결 캐시·확인창·진행 상태를 초기화하고, 초기 인증 정보 조회의 일시 실패는 재시도 가능한 오류 상태로 정리한다. 탈퇴·일반 세션 무효화 중에는 새 인증을 직렬화하고, 탈퇴 승인 후 정리는 당시 세션에 한정한다. 요청 전 자동 refresh의 terminal 실패도 당시 UI 세션만 정리하며 오프라인·이전 세션 오류는 새 로그인에 적용하지 않는다.

Swift 소스 103개의 SHA-256을 `qa-final-source-manifest.json`으로 고정하고, 격리 QA와 등록 bundle QA의 두 빌드 snapshot이 모두 일치함을 확인했다. 실제 제공자·운영 서버 통합 검수는 아직 별도 진행 상태다. 공통 서버의 다른 세션 작업은 완료 신호를 받기 전 변경하지 않는다.

최종 코드 commit은 **`b36bca8`**이며, 검증된 작업 브랜치를 local main에 fast-forward로 통합했다. 외부 push·TestFlight 업로드·운영 서버 배포는 하지 않았다. 두 실제 기기용 서명 빌드는 `qa-final-device-build.log`와 `primary-qa-final-device-build.log`에서 모두 **BUILD SUCCEEDED**다. 등록 bundle 빌드의 Apple entitlement, callback 등록1개, 운영 API URL, Sentry 비활성화를 확인했다.

최종 격리 QA 빌드의 기기 설치를 시도한 2026-10-09 02:33 KST에 iPhone15가 `unavailable`이고 ‘specified device was not found’가 반환됐다(`qa-final-device-install.log`). 설치되지 않았으며 기존 본앱 및 첫 GREEN 격리 QA 앱은 대체하지 않았다. 기기 재연결 후 최종 실기기 token 만료·오프라인·소셜 연결 해제·재연결 검수를 이어간다. iPhone 핫스팟의 다른 기기 사용 여부와 공통 서버 담당 세션의 완료 commit도 사용자에게 확인 요청한 상태다.

새 QA12820은 후속 실기기 검수에 필요한 활성 테스트 회원으로 유지한다. 실제 root와 원본의 이관 자료는 변경하지 않았다. 후속 QA 완료 후 정상 탈퇴·관리자 검토 절차로 이 새 회원도 정리하며, 이전 #17~20의 완료 이력과 혼동하지 않는다.
