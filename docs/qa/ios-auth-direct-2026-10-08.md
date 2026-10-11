# iOS 인증 실기기 QA — 직접 수행 (2026-10-08)

## 추가 작업 — QA 전화 인증 이력 즉시 정리 (2026-10-09)

사용자는 최종 대기의 해소 방법 중 QA 잔여 이력 즉시 정리를 선택했다. 01:39:22 KST에 iOS 전용 번호의 인증 이력 4행만 트랜잭션으로 삭제했다. 정확한 행 번호, 인증·사용 완료, 코드·grant 만료, 현 소유 회원·전화 claim 없음, 네 QA 회원의 인증·세션 삭제, 네 탈퇴 요청의 자동 처리 조건을 확인했다. 같은 조건의 dry-run 삭제·rollback을 먼저 통과했다. 다른 번호의 인증 이력은 트랜잭션 전후 전체 값 digest가 같았다.

탈퇴 완료 상태·검토 target·증거·재시도 시각을 직접 변경하지 않았다. 정상 탈퇴 작업이 잔여 식별값을 다시 검사한 뒤 네 요청을 모두 완료했다. 01:44:14 KST 조회에서 각 요청의 status/stage는 completed/completed이고, 검토 항목 4개 모두 실제 증거가 있는 complete/not_applicable이며 LAST_CODE는 비어 있었다. 완료 시각은 다음과 같다.

| 요청 | 최종 완료 시각 (2026-10-09 KST) |
| --- | --- |
| #17 | 01:43:08 |
| #18 | 01:44:08 |
| #19 | 01:42:08 |
| #20 | 01:41:08 |

최종 조회에서 원본 및 네 iOS QA 회원의 member·identity·phone claim·account state·legacy social·provider credential·mobile refresh·canonical session family·USER_SESSION은 모두 0이었다. iOS QA 인증 이력도 0이다. 완료 과정에서 요청의 USR_SEQ가 NULL이 되고 이전에 DELIVERED를 확인한 AP·KT 철회 outbox도 삭제되는 정상 후처리를 확인했다. 이번 작업은 QA 데이터 정리이며 전화번호·provider 식별자 재사용 검사 결함을 수정한 결과가 아니다.

01:39:53 KST 및 모든 탈퇴 완료 후 01:44:35 KST에 원본 이관 전 baseline과 현재 root 보존 데이터의 23개 표 전체 값 대조를 다시 통과했다. root 권한·ID/PW credential 및 이관한 실제 기부·게시글·파일 소유 정보는 유지됐다. Android 번호·회원·탈퇴 요청을 변경하는 SQL은 실행하지 않았다. 감사 기록은 비공개 `ios-phone-cleanup-applied-audit.json`, `ios-phone-cleanup-root-preservation.json`, `ios-phone-cleanup-root-final-preservation.json`, `ios-phone-cleanup-final-summary.json`에 보관했다. 아래의 이전 시각별 pending 관찰은 당시 상태이며 현재 완료 판정은 이 추가 작업을 따른다.

이 세션은 iPhone 15의 설치 앱 1.3.3과 Computer Use를 통한 iOS QA 관리자 작업을 담당한다. 주요 정상 경로는 실기기에서 통과했으나 재현된 연결 해제·인증 응답 순서·탈퇴 완료 검사 결함이 남아 출시 검수는 불합격이다. [최신 발견 및 수정 검토](ios-auth-findings-2026-10-09.md)를 함께 참조한다. Android 기기·가입 승인은 다른 세션의 담당이다. 앱을 재설치하거나 기존 계정 비밀번호를 읽지 않았다. 별도의 XCUITest runner에서 의도한 단일 테스트만 실행했다.

## 기능 구조와 세션 판정 기준

| 구분 | 구현 구조 | 이번 검수에서 구별한 상태 |
| --- | --- | --- |
| ID/PW | native 가입 및 전화 인증 → 회원·LOCAL credential 생성 → 로그인 → 최초 동문 인증 신청 | 가입 성공과 동문 승인은 별개다. pending 회원의 제한 화면과 승인 후 일반 화면을 확인했다. |
| Kakao·Apple | provider 인증 → 기존 회원 로그인 또는5분짜리 신규 가입 continuation → native 가입 → 서비스 세션 발급 | provider 인증 성공, 가입 취소, 회원 생성, 로그인 성공을 별도로 판정했다. |
| 기기 저장 | Keychain의 `AfterFirstUnlockThisDeviceOnly`로 token bundle 저장 | 재설치 없이 실제 앱 종료·재실행으로 자동 로그인과 로그아웃 유지 상태를 확인했다. Keychain 원문을 추출하지 않았다. |
| 자동 로그인·갱신 | `bootstrapSession` → 저장 bundle/필요 시 refresh → current user 조회. access 만료120초 이내면 갱신을 시도하고 동시 refresh는 하나의 작업으로 합친다. | 승인 전후 cold restart 통과. 지연 응답 세대 검증 결함은 소스 probe 결과로 별도 기록했다. |
| 오류 분류 | unauthorized/invalid session은 로컬 인증 해제, 그 밖의 restore 오류는 temporarilyUnavailable | 실제 iPhone 오프라인 전환은 Mac 핫스팟 의존 때문에 미실행이다. 소스 control 통과를 실기기 결과로 대체하지 않는다. |
| 서버 세션 | SID/JTI 및 회전하는 refresh, 회원 상태·폐기 여부 검증. 기존 서버 QA에서 기본 access15분/refresh회전 시점부터30일을 확인했다. | 일반 로그아웃은 현재 세션, 모든 기기 로그아웃·탈퇴 요청은 전체 세션 폐기를 직접 대조했다. |
| 소셜 연결·탈퇴 | 연결은 기존 서비스 회원에 identity를 추가. 탈퇴는 즉시 서비스 세션 폐기 → 제공자 철회 → DB 삭제 → 외부·백업·파일·간접 식별값 검증 | 연결 해제 버튼의 실제 요청 누락과 전체 탈퇴 완료 검사 오류를 구별했다. provider 로그인 저장소와 서비스 세션은 같은 것이 아니다. |

위 구조 설명은 확인한 소스와 서버 관측을 근거로 한다. 작업 중 다른 기능 변경으로 소스 HEAD가 바뀌었으며 최종 읽기 시 iOS는dad5cdf, backend/admin 저장소는4dee5fa였다. 설치 앱1.3.3을 재설치·수정하지 않았고, 이전 소스 probe의 실행 기준은 기존 통합 보고서에 따로 기록했다. 설치 앱의 정상 동작, 소스 probe, 운영 DB 관측은 각 항목에서 구분했다. 운영 journal의14:50–15:54 UTC 구간에 refresh200은15:22:55.141 UTC 1건이었다. 로그에 회원·클라이언트·SID 상관관계가 없어 이를 iOS 실기기 자동 갱신으로 단정하지 않는다. cold restart 자동 로그인과 실제 만료 시 갱신은 검증 범위가 다르다.

## 원본 회원과 탈퇴 요청 #14

원본 회원12787의 #14가 접수 상태일 때 재실행 후 signed-out 유지, 실제 Kakao 및 Apple 인증 완료 후 전용 탈퇴 안내 표시, 인증 탭 접근 차단을 직접 재확인했다. 이후 데이터 이전과 실제 탈퇴 완료는 아래에 기록했다. Apple 검사 첫 시도는 이전 테스트의 시스템 인증창이 유지될 것이라는 자동화 전제 때문에 실패했다. 인증 시작부터 완료까지 한 테스트 안에서 수행한 재검수는 통과했다.

사용자가 진행 중인 영수증 발급·정정·재발급·결과 전달 업무가 없다고 확인했다. 이 사실을 근거로 관리자 화면에서 #14만 `not_required`로 기록했다. 근거번호는 `QA-IOS-20261008-user-confirmed-no-open-receipt-work`이다. 최신 preview에서 영수증 blocker가 사라져 보류 항목은 5개에서 4개로 줄었다.

사용자가 실제 자료를 지우는 대신 새root12813으로 보존 이관한 뒤 원본을 탈퇴시키도록 지시했다. #14를 manual로 보류하고 백업·rollback dry-run·단일 transaction 이관·적용 후 전체 값 대조를 완료했다. 기부17건, 구독2건, 게시글32건, 댓글9건, 좋아요8건, 쪽지9건, 신고2건, 파일 소유권·프로필 이력·전화 claim·동문 인증 내용을12813으로 이전했다. 원본의 현재 파일·연락처 참조만 복사 후 분리했으며 파일을 삭제하지 않았다. 최신 preview는 blocker0개·파일0개다. 동일 소유자 이관으로 보존하는 파일·연락처 범위를 실제 증빙으로 기록하고 #14만 조기 처리했다. Apple·Kakao 실제 철회 후14:48:25 UTC에 #14 완료와 원본 member/identity/social/credential/refresh0건을 확인했다. 원본 삭제 후23개 표 재검증에서도12813의 모든 이전 내용과 root 권한이 보존됐다. #14를 취소하거나 새 root12813을 삭제하지 않았다. 상세 근거는 `member-data-transfer-2026-10-08.md`에 기록했다.

## 새 ID/PW 계정의 검수

새 QA 전용 ID `iosqa20261008new`, 이름 `AuthQAIOS`, 회원12815를 앱의 일반 ID/PW 가입 경로로 생성했다. 비밀번호는 QA용으로 새로 생성해 로컬 권한0600 파일과 임시 runner fixture에만 보관했다.

기존 review 번호·코드를 보존하며 iOS 전용 번호 하나만 기존 SMS review allowlist에 추가했다. 번호별 별도 코드 설정은 현재 구현에서 지원하지 않는다. 운영 백엔드 재시작1회 후 active 상태와 프로세스 설정 로드를 확인했다. 이 검수의 OTP는 실제 SMS 수신 검수가 아니라 허용된 테스트 번호/코드 경로다. 최종 읽기 대조에서도 iOS review 번호 등록 상태와 기존 모든 review 번호·기존 코드의 보존을 true로 확인했다. 재검수에 사용할 수 있도록 등록 상태를 유지했고 추가 서버 재시작은 수행하지 않았다.

| 검수 | 결과 |
| --- | --- |
| 빈 입력/짧은 ID를 통한 다음 단계 진입 | 차단 통과 |
| 비밀번호 확인 불일치 | 오류 표시·차단 통과 |
| 짧은 전화번호 | 오류 표시·차단 통과 |
| 가입 중단 후 재실행 | signed-out 통과 |
| 전화 인증 오답 | 오류 표시·인증 미완료 통과 |
| 전화 인증 정답 | 인증 완료 후 다음 단계 통과 |
| 필수 동의 체크 전 최종 제출 | 비활성 통과 |
| 실제 ID/PW 가입 및 최초 동문 인증 신청 | 생성·승인 대기 통과 |
| 가입 직후 재실행 | 승인 대기 세션 유지 통과 |
| 승인 대기에서 로그아웃→재실행→새 비밀번호 로그인 | signed-out 유지 후 기존 대기 회원으로 복귀 통과 |
| Computer Use 관리자 가입 승인 | 회원12815만 승인, DB verification approved 확인 |
| 승인 뒤 cold restart | 일반 회원 화면으로 전환 통과 |
| 새 회원의 로그아웃 확인창 취소 | 세션 유지 통과 |
| 새 회원의 로그아웃 및 cold restart | signed-out 통과 |
| 잘못된 비밀번호 및 cold restart | 인증 접근 없음·signed-out 통과 |
| 새 QA 비밀번호 정상 로그인 및 cold restart | 로그인·자동 로그인 통과 |
| 다른 회원 소유 Kakao/Apple 계정 연결 | 두 제공자 모두 충돌 거부, 기존 연결0/원본 연결2 유지 |
| 연결 충돌 후 재실행 | 새 ID/PW 회원의 서비스 세션 유지 통과 |
| 일반 로그아웃의 다른 기기 세션 영향 | 실기기 로그아웃 뒤 별도의 같은 QA 계정 세션 me·refresh200, 현재 기기만 종료 통과 |
| 모든 기기 로그아웃 취소·확인·재실행 | 취소 유지, 확인 후 signed-out, 재실행 signed-out 통과 |
| 모든 기기 로그아웃의 다른 세션 영향 | 별도 세션의 me·refresh 모두401 통과 |
| 새 ID/PW 회원 탈퇴 확인 취소·요청·재실행 | 취소 유지, 실제 요청#17 접수증 표시, 재실행 signed-out 통과 |
| 새 ID/PW 회원의 탈퇴 대기 중 올바른 비밀번호 로그인 | 전용 탈퇴 안내·저장된 현황 접근, 재실행 signed-out 통과 |

가입 폼 검수 첫 시도는 버튼 비활성화를 너무 이르게 가정해 실패했다. 실제로는 다음 버튼을 누를 때 검증한다. 이후 검수는 다음 단계 진입 차단을 확인했다. 새 가입 첫 시도는 설치 앱에 없는 consent-checkbox 식별자를 찾다가 검토 화면에서 중단됐다. 실제 표시된 동의 라벨을 사용한 후속 검수로 동의→가입→재실행을 완료했다. 이 두 자동화 실패를 앱 가입 실패로 계산하지 않는다.

모든 기기 로그아웃 첫 준비는 로그인 직후 프로필 탭 전환을 확인하지 못해 최종 버튼을 누르기 전에 중단됐다. 로그인 세션을 cold restart하고 QA 프로필을 확인한 후 실제 설정 화면에서 수행한 후속 검수는 통과했다. 이 준비 실패를 로그아웃 실패로 계산하지 않는다. 별도로 유지한 같은 QA 계정의 서버 세션도 실제 me·refresh401을 확인했다.

관리자 화면에서 새 QA 회원12815의 #17만 최신 preview를 검토해 조기 처리했다. 회원·identity·전화 claim·refresh token·legacy social은 모두0건이며 백업·외부 데이터·파일 검사가 완료됐다. 최종 상태는 `database_erased`와 `EXTERNAL_ERASURE_PENDING`이다. 전체 문자열 검사에서 소비·만료된 전화번호 인증 이력1행만 남았다. 인증 코드·grant는 만료됐으므로 로그인 세션 잔존이 아니다. 이력의24시간 보존 및 매시간 청소 때문에 공식 완료 상태가 다음날까지 지연될 수 있다. 실제 완료는 아직 확인하지 않았고 상태를 임의로 바꾸지 않았다. 같은 번호를 새 가입에 재사용하면 소유자를 구별하지 않는 전체 DB 검사에 다시 잡힐 수 있는 한계도 확인했다.

후속 실제 재가입에서 같은 테스트 번호를12817에 사용하자 #17의 전체358개 문자열 컬럼 검사에 `ALUMNI_PHONE_VERIFICATION.PHONE`2행 외에 `AUTH_PHONE_CLAIM.CANONICAL_PHONE`1행과 `WEO_MEMBER.USR_PHONE`1행이 잡혔다. 후자의 소유자는 동문 승인을 받은 새 회원12817이다. 원본12815의 member·identity·claim·account_state·refresh·social·legacy web·USER_SESSION은 모두0이다. 완료 검사가 이전 회원과 정상 재사용 회원을 구별하지 않아 #17의 `other_identifiers`를 계속 pending으로 둔다. 따라서 인증 이력의24시간 보존이 끝나도 정상 새 회원이 있는 동안 자동 완료를 보장할 수 없다. 실제 재가입으로 확인한 완료 검사 결함이며, 새 회원의 데이터를 삭제하거나 상태를 거짓 완료로 변경하지 않았다.

원본 #14 완료 후 실제 카카오 로그인은 `com.iwilab.KakaoTalk`을 foreground로 전환했고 새 서비스 동의 화면을 표시했다. 필수 동의만 선택한 새 인증에서 앱으로 정상 복귀해 신규 소셜 가입 화면을 열었다. 가입 취소 후 즉시·cold restart 모두 signed-out이며 회원 탭 접근이 없었다. 이 취소 검수 뒤 실제 가입 완료는 아래에 기록했다. 외부 앱 전환 후 원래 앱 snapshot을 기다린 자동화 시도, KakaoTalk의 일부 버튼 타입 불일치로 실패한 탐색, 여러 번 나눠 검수하며 외부 인증 유효 시간을 넘긴 시도는 제품 결함으로 계산하지 않는다. 유효 시간 안에 한 번에 수행한 실제 인증·앱 복귀 재검수는 통과했다.

## 새 카카오 계정의 검수

`AuthQAKakao` 회원12817을 실제 카카오 인증 후 native 가입으로 생성했다. 테스트 전화 인증, 제공자 이메일 prefill, 기수·학과·졸업연도, 사진 없이 계속 확인, 필수 동의 이전 제출 비활성화를 확인했다. 최초 동문 신청 및 cold restart 대기 세션이 통과했다. Computer Use에서12817의 이름·회원번호를 확인하고 해당 가입 신청만 승인했다. 승인 후 cold restart의 회원 화면 전환, 본인 QA 프로필, 로그아웃 취소 유지, 로그아웃 후 재실행 signed-out, 실제 카카오 재로그인으로 같은 QA 프로필 복귀 및 재실행 자동 로그인도 통과했다.

서버 구현상 회원 생성 전 provider 인증은5분짜리 linkToken과 제공자 credential/profile을 메모리에 보관하며 서비스 회원·refresh session을 발급하지 않는다. 가입 취소는 클라이언트를 signed-out으로 바꾸지만 서버 임시 정보의 즉시 폐기 API는 없다. 논리 만료5분과 cache cleanup10분을 구별하며, UI 취소 통과를 제공자 토큰 즉시 삭제 통과로 확장하지 않는다. Kakao SDK의 제공자 인증 저장소를 서비스 세션과 함께 명시적으로 정리하는 경로도 이번 소스에서 확인하지 못했다.

동일 제공자 이메일로 root를 자동 연결하지 않고 테스트 전화번호로 새 계정을 만든다. 실제12817과 root의 이메일 일치는 false, 전화번호도 다름을 확인했다. root의 ZZZ/root/LOCAL_USERNAME·social0·프로필과 일치하는 전화 claim1·기부17·구독2·게시글32는 유지됐다. 새 QA의 legacy KT·canonical KAKAO 각각 ACTIVE1, subject 매핑 일치, 계정 ACTIVE·전화 claim1·동문 승인도 확인했다. 같은 이메일이나 재사용 전화번호를 소유자 구별 없이 검색하는 탈퇴 검사 한계는 별도로 다룬다.

## Apple 후속 검수

새 카카오 QA12817에서 Apple 계정 연결을 시작하고 시스템 인증창을 취소했다. 기존 카카오 서비스 세션과 cold restart 본인 프로필 복귀가 유지됐다. 새 Apple 동의 화면의 Continue를 누른 뒤 시스템이 `Continue with Passcode`로 기기 암호 인증을 요구했다. 기기 암호를 읽거나 추측하지 않고 사용자에게 실기기에서 직접 인증하도록 요청했다. 이 시점에는 Apple 연결 완료·연결 해제·Apple 신규 가입을 통과로 기록하지 않는다.

사용자가 실기기 인증을 완료한 후12817의 Apple 연결 완료와 cold restart 두 소셜 연결 유지를 직접 확인했다. 카카오·Apple 두 연결 해제 버튼은 모두 활성화돼 마지막 로그인 수단 제한에 걸리지 않는 상태였다. 서버에서 AP/APPLE ACTIVE 각각1·암호화된 AP credential1·기존 KT/KAKAO 및 credential 유지·동문 승인도 확인했다. root12813의 소셜0·root 권한·기부17/구독2/게시글32는 변하지 않았다.

`testDirectBothSocialDisconnectOnOwnQA`에서 두 제공자의 확인창 취소는 연결을 유지했지만 실제 `연결 해제` 최종 확인 후에도 두 제공자가 연결된 상태로 남았다. 각 해제 후3초 관찰 및 서로 다른 제공자에서 재현했으며 실제 해제 기대값의 assertion2개가 실패했다. 원본 계정 대신 새 QA12817에서도 재현한 제품 결함이다. 서버 DELETE 관찰 결과는 바로 다음 문단에 기록했다. 소스상 alert dismiss의 Binding setter가 `.confirming`을 취소한 뒤 비동기 `confirmDisconnect`의 confirming guard가 return하는 경합과 일치한다.

서버 journal의 실제 테스트 구간15:23:21.291–15:23:38.747 UTC에는 HTTP request0건, 관측 최근15분의 social DELETE0건이었다. 정상 connections GET200은 직전과 직후에 있어 서비스 경계의 로그 수집과 연결 조회를 확인했다. 해제 후 DB의 두 소셜 ACTIVE·credential은 before와 같고 철회 outbox도 없었다. 네트워크 캡처로 과장하지 않고 서버 경계에서 요청 미수신을 확인한 증거로 기록한다. 서버의 마지막 로그인 수단 거부가 아니라 native 확인 후 요청 발송 이전의 실패를 지지한다.

두 소셜 연결이 있는 QA12817의 정상 로그아웃·cold restart signed-out 후 실제 Apple 로그인 버튼과 시스템 Sign In을 눌렀다. 시스템 Face ID 인증을 기다리는 단계에서는 검수를 skip으로 표시했고, 사용자의 실기기 인증 완료 후 같은 `AuthQAKakao` 프로필 복귀와 cold restart 자동 로그인을 직접 통과했다. 서버의15:27:36.821 UTC Apple/mobile200 및12817의 해당 시각 새 active refresh session1도 확인했다. Apple 재로그인을 새 계정 생성이나 카카오 로그인으로 혼동하지 않았다.

QA12817에서 실제 탈퇴 요청#18을 접수해 접수증과 재실행 signed-out을 확인했다. 서버에서 기존 refresh4건의 active0/revoked4도 일치했다. 해당 QA의 기부·구독·게시글·댓글·좋아요·업로드 소유권·프로필 파일 이력은 모두0이었다. 관리자의 최신 preview10개 표16건·파일0·blocker0·소셜 철회2건을 검토하고 #18만15:32:42 UTC에 조기 처리 승인했다. 실제 worker 철회·DB 삭제 및 최종 완료는 별도 확인하며 완료를 앞서 선언하지 않는다. 관리자 전용 창의 일시적 빈 본문은 새로고침 뒤 복구됐고 HTTP/정적 JS/CSS200 및 콘솔 error0을 확인했다. 다른 Chrome 탭·Android 요청에는 조작하지 않았다.

15:35:02 UTC에 #18의 AP·KT `ACCOUNT_DELETE`가 모두 DELIVERED이고 저장 provider credential2→0을 확인했다. 인증 제공자 철회가 회원 DB 삭제보다 선행하는 실제 동작이다. 회원·identity·phone claim 삭제와 최종 완료는 아직 다음 worker 재시도를 기다리는 상태였다.

15:38:30 UTC에12817의 member·identity·phone claim·social·credential·refresh·account state·web session이 모두0임을 확인했다. 두 제공자 철회와 DB erasure는 완료됐지만 #18은 `database_erased/EXTERNAL_ERASURE_PENDING`이다. 백업·외부 데이터·파일 targets는 실제 증거로 complete이고 `other_identifiers`만 pending이다. Apple 신규 가입의 provider binding 해제 전제는 충족됐으나 요청 전체 완료로 확대하지 않았다.

## Apple 전용 신규 가입 — 이메일 가리기

원본 QA12817의 AP 철회·삭제 후 Apple 시스템 인증은 새 계정 동의 화면을 다시 표시했다. `Hide My Email`을 선택하고 사용자 Face ID 인증 후 native 신규 가입 폼을 확인했다. 가입을 취소하고 cold restart해도 signed-out이며 회원 탭에 접근하지 않았다. 다시 Apple 인증을 수행하자 회원 화면 대신 신규 가입 폼으로 돌아왔다. 이 취소·재시도는15.514초 검수에서 통과했다. 서버의 가입 전 private AP subject 조회에서도 서비스 binding0을 확인했다. 임시 메모리 continuation의 TTL 한계는 앞서 설명한 대로 구분한다.

이후 `AuthQAApple` 회원12818을 전화 인증·제공자 이메일 prefill·기수/학과/졸업연도·사진 없이 계속·필수 동의로 실제 가입했다. 동의 전 제출 비활성화, 제출 후 동문 인증 대기 및 cold restart 대기 세션 유지는 통과했다. 새 가입 검수는34.551초였다. Computer Use에서 이름과 회원번호12818을 확인하고 이 최초 동문 신청만15:45:35 UTC에 승인했다. 서버에서 APPLE/AP ACTIVE 각1·LOCAL/KAKAO0·password credential0·승인 상태를 확인했다. 이메일 원문을 공개하지 않고 Apple private relay 형식만 true로 검증했다.

승인 후 cold restart 자동 로그인, 마지막 Apple 로그인 수단의 해제 비활성화와 안내, 로그아웃 취소 유지, 로그아웃 후 cold restart signed-out은 통과했다. Apple 재로그인은 시스템 Face ID 대기 때문에 첫 자동화 실행을 skip으로 구분했다. 사용자 인증 후 같은 AuthQAApple 프로필 및 cold restart 자동 로그인 검수는7.359초에 통과했다. 서버 Apple/mobile200(15:48:19.725 UTC)과12818의 새 refresh 생성 시각도 일치했다.

Apple 전용 회원에 카카오를 추가 연결하는 역방향 경로도34.704초에 통과했다. KakaoTalk 앱이 먼저 열리고 새 서비스 동의에서 필수 항목만 선택한 뒤 native 설정으로 복귀했다. cold restart 후 같은 AuthQAApple 프로필과 Apple·카카오 양쪽 연결을 확인했다. 역방향 연결을 다른 회원 생성으로 혼동하지 않았다. 서버에서도12818의 AP/KT·APPLE/KAKAO 각각 ACTIVE1, 암호화된 각 provider credential1과 기존 service SID 유지를 확인했다. 이어 로그아웃 취소·로그아웃·cold restart signed-out 후 카카오로 실제 재로그인했고 같은 AuthQAApple 프로필과 재실행 자동 로그인이24.134초에 통과했다. Apple 가입 계정과 카카오 연결 계정의 서비스 소유자가 일치했다.

## Apple 가입 QA 계정의 최종 탈퇴 #19

Apple로 가입하고 카카오를 연결한12818의 본인 AuthQAApple 프로필과 두 연결을 확인한 뒤 앱에서 탈퇴를 요청했다. 접수증 표시와 cold restart signed-out이15.355초에 통과했다. 정확한 요청은#19이며 접수15:53:38 UTC, refresh3건은 즉시 active0/revoked3이었다. 서버의 기부·구독·게시글·업로드 등 실사용 자료 및 프로필 파일은0이었다.

Computer Use 전용 iOS 관리자 창에서 #19/회원12818을 대조했다. 최신 preview10개 표15건·파일0·보류0·provider철회2건의 범위를 확인하고15:54:15 UTC에 이 요청만 조기 처리했다. 15:56:15 UTC에 AP·KT ACCOUNT_DELETE가 모두 실제 DELIVERED이고 encrypted provider credential2→0임을 확인했다. 16:01경 회원 기본 행도0이었다. 16:01:46–47 UTC에12818의 member·identity·social·credential·refresh·phone claim·account state·web session을 모두0으로 확인했다. #17/#18/#19 각각의358개 텍스트 컬럼 정확 식별값 검색은 ALUMNI_PHONE_VERIFICATION.PHONE3행만 남았다. 새 가입 전에 정상 재사용 회원·claim·provider subject 매칭이0인 baseline을 보존했다. 세 요청은 모두 processing/database_erased/EXTERNAL_ERASURE_PENDING이며 소비된 전화 인증 이력의 검사가 남아 있어 전체 완료로 계산하지 않는다. 다른 회원의 보존 자료 및 Android 요청을 처리하지 않았다.

## ID/PW 회원의 소셜 연결 성공 경로 추가 검수

최초 ID/PW QA12815에서는 다른 실사용 회원 소유의 Kakao·Apple 연결 충돌 거부를 확인했다. 이 결과를 실제 연결 성공으로 확대하지 않고, 앞선 QA의 DB 삭제와 새 가입 전 잔여 식별값 baseline을 확보한 뒤 별도 `iosqa20261009link`/`AuthQAIOSLink` 회원12819를 생성했다. 비밀번호는 별도의 QA용 값이며 기존 비밀번호를 사용하지 않았다.

실제 native 가입·필수 동의·전화 인증·동문 신청·pending cold restart는50.144초에 통과했다. 관리자 전용 창에서 이름·회원번호12819를 대조해 이 신청만 승인했다. 서버 baseline은 LOCAL_USERNAME ACTIVE1/password credential1·social0·phoneclaim1·account stateACTIVE1·service activeSID1이었다.

카카오 연결은30.759초에 통과했다. KakaoTalk 앱의 신규 서비스 동의에서 필수 항목만 동의했고, native 설정 복귀와 cold restart 본인 AuthQAIOSLink 프로필·카카오 연결 유지를 확인했다. 기존 native 회원에 같은 카카오 제공자가 연결되는 성공 경로를 실제 가입·승인 회원으로 구분해 검수했다. 연결 후 로그아웃·cold restart signed-out·카카오 재로그인·같은 AuthQAIOSLink 프로필 복귀 및 재실행 자동 로그인은24.262초에 통과했다. 서버16:03:55.430 UTC 연결200,16:04:37.693 UTC logout204,16:04:43.853 UTC Kakao/mobile200 및 정확12819의 새 refresh 생성 시각도 일치했다. LOCAL_USERNAME+KAKAO ACTIVE 각1·password credential1·KT legacy/암호화 credential 각1과 가입 fixture의 기존 usrId/name/email/phone 보존을 확인했다. Apple 연결 전 private HMAC baseline을 보존해 이후 프로필·password credential 내용 불변을 대조한다. Apple 시스템 새 동의 화면의 Face ID 대기에서는 자동화를 skip으로 기록하고 사용자 인증을 요청했다. 이 대기 상태를 연결 성공으로 집계하지 않는다.

사용자가 Apple 인증을 완료한 뒤 native12819의 Apple·카카오 연결과 cold restart 본인 프로필/양 연결 유지 검수는9.319초에 통과했다. 서버연결200(16:06:33.777 UTC) 및 LOCAL_USERNAME/KAKAO/APPLE ACTIVE 각1·password credential1·KT/AP legacy/암호화 credential 각1을 확인했다. private HMAC 대조에서 usrId/name/email/phone/password credential이 모두 불변이고 가입 fixture와 기존 프로필도 일치했다. root권한·LOCAL1·social0·이관 실사용 자료는 유지됐다. Apple 재로그인은 시스템 Face ID 대기(skip37.349초)로 사용자 인증을 요청했다. 사용자가 인증을 완료한 뒤 같은 AuthQAIOSLink 프로필·cold restart 자동 로그인이7.279초에 통과했다. 서버 logout204(16:07:39.088 UTC)→Apple/mobile200(16:08:10.425 UTC)과 정확12819의 새 refresh 생성 시각도 일치했다. LOCAL/KAKAO/APPLE·password·양 provider credential과 기존 프로필의 private HMAC이 모두 유지됐다.

양 소셜 연결 후 ID/PW 재로그인 검수도39.661초에 통과했다. 로그아웃 취소는 서비스 세션을 유지했고, 실제 로그아웃/재실행은 signed-out이었다. 오답 비밀번호에서16:15:48.343 UTC login401과activeSID0을 확인했고, 정답에서16:16:00.257 UTC login200과 정확12819의 새 refresh/activeSID1을 확인했다. 정답 뒤 cold restart 본인 프로필 복귀, LOCAL·양 소셜·password credential 및 기존 프로필 HMAC의 불변도 통과했다. 이 단계의 approvalForegroundReflected 로그는 이미 승인된 회원 화면의 유지 확인이며 최초 승인 반영 시간을 새로 측정한 결과가 아니다.

## ID/PW·양 소셜 QA의 최종 탈퇴 #20

세 로그인 수단을 확인한12819의 본인 프로필에서 앱 탈퇴를 요청했다. 접수증과 cold restart signed-out은15.338초에 통과했고 정확한 요청은#20(16:17:24 UTC)이었다. 접수 즉시 refresh4건의 activeSID0을 확인했다. 해당 QA의 주문·구독·게시글·업로드·프로필 파일 이력은0이었다.

Computer Use에서12819/#20의 최신 preview10개 표17건·파일0·보류0·provider철회2건을 검토했다. 첫16:18:08.518 UTC 확인은 관리자 PUT400으로 거부됐고 DB의 EXPEDITED도0이었다. 응답 본문을 확보하지 못해 대상 변경이나 특정 validation 원인으로 단정하지 않는다. 최신16:19:20 UTC preview를 다시 검토한 후16:19:34 UTC에 재시도했고, EXPEDITED1/operator12813·즉시 next_attempt 전환으로 성공을 확인했다. 범위에는 LOCAL password credential1·canonical identity3·양 legacy social2·provider credential2·refresh4 등이 포함됐다. 16:21:06 UTC 첫 worker 처리에서 AP·KT outbox PENDING, account PROVIDER_REVOCATION_PENDING을 확인했다. 제공자 worker가 처리한16:21:57 UTC에 AP·KT ACCOUNT_DELETE 모두 실제 DELIVERED이고 소셜 credential0을 확인했다. 16:25:10 UTC 계정 재시도 뒤 member·identity·LOCAL password credential·phone claim·social·모든 refresh·account state·web session이 각각0으로 삭제됐고 AP·KT DELIVERED는 유지됐다. 16:25:47 UTC 최종 대조에서 backups/external_data/historical_files는 실제 evidence로 complete이며 other_identifiers만 pending이었다. 원래12819 식별값의358개 텍스트 컬럼 검색은 공유 전화 인증 이력4행만 확인했다. 이4행은 모두 verified/consumed이고 유효code0·사용 가능한grant0이므로 서비스 인증 잔존으로 분류하지 않는다. 최종 실기기 상태는 signed-out이며 새 회원을 더 생성하지 않는다.

## 최종 서버 상태 — 2026-10-09 01:25:47 KST

| 대상 | 회원·인증·서비스 세션 | 실제 provider 철회 | 요청 전체 상태 |
| --- | --- | --- | --- |
| 원본12787 / #14 | 모두0 | AP·KT 완료 | completed |
| ID/PW12815 / #17 | 모두0 | 해당 없음 | processing / database_erased / EXTERNAL_ERASURE_PENDING |
| Kakao12817 / #18 | 모두0 | AP·KT DELIVERED | processing / database_erased / EXTERNAL_ERASURE_PENDING |
| Apple12818 / #19 | 모두0 | AP·KT DELIVERED | processing / database_erased / EXTERNAL_ERASURE_PENDING |
| ID/PW+양 소셜12819 / #20 | LOCAL password 포함 모두0 | AP·KT DELIVERED | processing / database_erased / EXTERNAL_ERASURE_PENDING |

위 QA 소셜 회원3개의 ACCOUNT_DELETE outbox6건은 모두 DELIVERED였다. 네 요청에 공유되는 전화 인증 이력은 총4건이며 요청별4건이라는 뜻이 아니다. 마지막 새 회원까지 DB에서 제거돼 정상 재사용 회원/claim/provider 매칭은 사라졌다. 남은 이력의24시간 보존·시간당 cleanup과, 정상 재가입이 있을 때 소유자를 구별하지 않는 검사 결함을 구분한다. 완료 플래그를 임의로 바꾸지 않았다.

root12813/jerryhwang018은 ZZZ/root, LOCAL_USERNAME·password credential ACTIVE 각1, social0을 유지했다. 이관된 주문17·구독2·게시글32·댓글9·좋아요8·쪽지9·전화claim1·업로드 소유권3·프로필 파일 이력4는 보존됐다. 전체 값/파일 보존은 원본 탈퇴 후23개 표 대조에서 확인했고, 후속 QA의 최종 서버 관찰에서도 보존 counts와 root 권한을 재확인했다. 최종 앱은 signed-out이며 운영 앱 코드 수정·배포는 수행하지 않았다.

## 제공자별 검수표

| 실제 경로 | ID/PW12815·12819 | Kakao12817 | Apple12818 |
| --- | --- | --- | --- |
| 신규 가입·필수 동의·전화 인증 | 통과 | 통과 | 통과·이메일 가리기 |
| 가입 취소 후 재실행 | 통과 | 통과 | 통과·재시도도 가입 필요 |
| 동문 신청·승인 대기 재실행·관리자 승인 | 통과 | 통과 | 통과 |
| 승인 후 자동 로그인·로그아웃 취소·확정·재실행 | 통과 | 통과 | 통과 |
| 본래 로그인 수단 재로그인 | 통과 | 통과 | 통과·사용자 Face ID 완료 |
| 다른 회원의 provider 연결 거부 | Kakao·Apple 모두 통과 | 해당 경로 아님 | 해당 경로 아님 |
| 추가 소셜 연결·대체 수단 재로그인 | 12819의 Kakao·Apple 연결 및 두 제공자 각각 동일 native회원 재로그인 통과 | Apple 연결→Apple 동일 회원 통과 | Kakao 연결→Kakao 동일 회원 통과 |
| 마지막 로그인 수단 보호 | ID/PW가 별도 수단 | 두 소셜 때 해제 허용 | Apple-only 때 해제 차단 통과 |
| 소셜 연결 해제 최종 확인 | 원본 ID/PW+소셜 회원에서도 결함 재현 | 두 제공자 모두 무반응 재현 | 역방향 연결 성공과 구분 |
| 탈퇴 접수·즉시 전체 세션 폐기·재실행 signed-out | 통과·#17/#20 | 통과·#18 | 통과·#19 |
| provider 철회·회원/auth DB 삭제 | 12815·12819 DB0, 12819 양 provider 실제 철회 | 양 provider 실제 철회·DB0 | 양 provider 실제 철회·DB0 |
| 요청 전체 완료 | pending·잔여 식별값 검사 결함 | pending·잔여 식별값 검사 결함 | pending·소비된 전화 인증 이력 |

오프라인, provider 서버 장애, Keychain 쓰기 실패, 앱 강제 종료의 모든 타이밍 조합은 미실행이다. 실제 토큰 만료 시 iPhone 자동 refresh도 클라이언트 상관관계 로그 부족으로 직접 통과 판정하지 않았다. 계정·삭제 요청 번호로 실기기 결과와 DB 증거를 연결한다.

## 재현된 구현 문제와 남은 범위

이전 실기기 검수의 iOS Kakao·Apple 연결 해제 최종 확인 무반응과 서버 DELETE 요청 미발생은 여전히 유효한 결함이다. 소스의 세션 경합 probes는 별도 증거이며 정상 UI에서 동일 경합을 유발했다는 뜻은 아니다. native ID/PW 가입은 짧은 비밀번호의 다음 단계 버튼이 활성화되며, 가입 서버에도 재설정 화면과 같은 강도 검증이 없다. 정책 불일치 검토 대상으로 기록하고 실제 약한 비밀번호 계정은 생성하지 않았다.

승인 직후 기존 화면에서 단순 activate 후12초 안에 승인 반영은 관찰하지 못했다. 실제 Home→복귀를 강제하지 않은 측정이므로 foreground 이벤트 처리 결함으로 확정하지 않는다. cold restart 이후 반영과 새 ID/PW 로그인·연결 충돌은 통과했다. 신규 QA 회원의 요청 전체 최종 삭제는 위 추가 작업으로 완료했다. 실제 오프라인·토큰 만료 후 iPhone 자동 갱신 및 발견한 결함의 수정 후 재검증은 미완료다. Apple 전용 신규 가입·취소·재시도·승인·재로그인은 완료했다. 카카오 신규 가입·Apple 연결/재로그인과 #14의 실제 완전 삭제는 확인했다. Mac의 기본 Wi-Fi 경로가 iPhone 핫스팟의 기본 대역과 일치하는 현재 조건에서는 연결 중단을 피하기 위해 실기기 오프라인 전환을 수행하지 않았다.

원시 로그·스크린샷·삭제 접수증에는 개인정보와 lookup secret이 포함될 수 있어 ignored build 디렉터리에만 보관한다. 이 문서에는 비밀번호·OTP·receipt secret을 포함하지 않는다.
