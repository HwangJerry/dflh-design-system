# 인증 QA — backend/API, 2026-10-08

모바일 인증의 서버 경계를 실제 HTTP 라우터와 MariaDB 10.1.38에서 검수했다. 인증 API Golden 23개와 추가 경계 테스트 9개가 모두 통과했다. 소셜 제공자의 실제 화면 및 사용자 인증은 각 기기의 QA 결과에서 별도로 확인해야 한다.

## 검증 결과

| 실행 | 결과 | 범위와 한계 |
| --- | --- | --- |
| 기존 `go test -json ./...` | run 1,578 / pass 1,509 / skip 66 / fail 3 | 하위 테스트 포함 이벤트 수. Docker 비활성화로 생략된 DB 검증은 통과로 계산하지 않았다. |
| `DFLH_DOCKER_TESTS=1 go test -json ./cmd/server -run '^TestGolden(Signup\|MobileSession\|AccountDeletion)$' -count=1` | run 23 / pass 23 / fail 0 / skip 0 | 회원가입, iOS·Android 헤더로 ID/PW 로그인 및 refresh, /me, 강제 업데이트, 회원 탈퇴 접수 및 영수증 조회. |
| `DFLH_DOCKER_TESTS=1 go test -json ./cmd/server -run '^TestAuthQAAPIRecoveryBoundaries$' -count=1` | run 9 / pass 9 / fail 0 / skip 0 | 아래 8개 시나리오와 상위 테스트. 최종 실행 78.381초. |

Apple Silicon에서 amd64 MariaDB를 실행하는 첫 Golden 시도는 schema import의 기본 15초 제한에 걸렸다. 위 실제 DB 실행에서는 테스트 하네스의 schema/query timeout을 일시적으로 120초로 늘렸고, 종료 후 원래 파일을 그대로 복구했다. 애플리케이션의 production timeout, DB, 서버 설정은 이 검증 때문에 변경하지 않았다.

전체 baseline의 세 실패는 `internal/contract`의 후보 migration 승인 목록과 현재 소스의 범위·지문 불일치다. 승인 manifest를 자동으로 고쳐 통과시키지 않았다.

- `TestCanonicalIdentityCandidateRangeCheck`
- `TestCanonicalIdentityCandidatePacketMatchesCurrentSource`
- `TestMigrationRunnerApprovesEveryFutureMigrationIncluding063`

## 추가 경계 시나리오

검증 코드: `cmd/server/auth_qa_edge_cases_test.go`. 전용 DB와 합성 사용자·전화·제공자 subject만 사용한다. DB 장애는 해당 테스트 DB에 임시 trigger를 넣어 재현한다.

| 시나리오 | 관찰한 결과 |
| --- | --- |
| 소비된 refresh 재사용 | `401 REFRESH_REPLAY_DETECTED`. 회전된 새 refresh와 access도 같은 SID 전체가 거부됨. 다른 디바이스의 별도 SID는 유지됨. |
| 현재 기기 로그아웃 / 전체 로그아웃 | 현재 SID 로그아웃은 다른 SID를 유지함. 전체 로그아웃은 다른 SID의 access와 refresh까지 거부함. 모두 `204`, 응답 본문 없음. |
| 인증 미제출 회원의 로그인 / refresh | 미제출 principal의 정상 서비스 세션 발급 가능. `/me`는 접근 가능하고 승인된 동문 목록은 `403 ALUMNI_APPROVAL_REQUIRED`. refresh로 승인 권한이 생기지 않음. |
| 로그인 후 정지 처리 | 기존 access로 `/me` 접근 불가. refresh는 `403 ACCOUNT_SUSPENDED`, 해당 세션 family가 폐기됨. |
| ID 중복으로 회원가입 실패 | `409 ID_TAKEN`. 신규 회원 및 로그인 세션 생성 없음. 인증된 전화 grant는 소비되지 않아 재시도 가능. |
| 소셜 회원 연결 transaction 실패 | `500 LINK_FAILED`. 회원 insert 및 관련 연결을 rollback. 전화 grant와 소셜 continuation을 재사용 가능. |
| 회원 생성 commit 후 세션 저장 실패 | `500 LOGIN_FAILED`. 회원은 존재하지만 서비스 refresh row는 0개. 전화 grant·소셜 continuation은 이미 소비됨. 같은 제출 재시도는 `400 PHONE_NOT_VERIFIED`. 새 제공자 로그인은 기존 회원을 찾아 정상 세션 발급 가능. |
| 회원 탈퇴 취소 | 요청 즉시 양 디바이스 세션 폐기 및 신규 로그인 거절. 잘못된 취소 비밀은 `404`. 정상 취소 후에도 이전 토큰은 거절하며 새 로그인만 허용. |

위 소셜 경계 테스트의 제공자 검증 결과는 fixture로 주입한다. 실제 Kakao·Apple 토큰 교환/동의 UI, biometric, 제공자 세션의 유효성까지 검증한 결과로 해석하면 안 된다.

## 인증 구조와 실패 시 세션

모바일 access는 15분, refresh는 회전 시점부터 다시30일이다. 따라서 지속적으로 갱신하는 세션은 동일 SID에서 만료가 연장되는 형태이며, 최초 로그인 시점의 고정30일과 구분해야 한다. refresh는 SID를 유지하며 JTI를 회전시키고, 이전 JTI가 소비되었는지 transaction으로 확인한다. 소비된 토큰의 재사용은 해당 SID의 family를 폐기한다. Bearer middleware는 JWT 서명·유효기간에 더해 현재 회원의 로그인 허용 상태와 SID의 유효 refresh row를 매 요청 확인한다. 회원의 인증 상태와 관리자 역할도 DB principal에서 다시 읽는다.

ID/PW는 canonical `AUTH_IDENTITY` 및 `AUTH_PASSWORD_CREDENTIAL`을 우선 사용한다. legacy 비밀번호를 지원하는 경로가 별도로 있다. 소셜 계정 식별은 제공자가 검증한 provider subject 기준이며 이메일을 같다는 이유로 자동 연결하지 않는다. 소셜 회원가입 continuation은 인증 완료 전의 자료를 5분 동안 보관하며 ready/processing/consumed lease로 중복 처리를 방지한다. 실패 전 account transaction이 rollback되면 lease를 반환하고, account가 생성되면 continuation을 소비한 뒤 모바일 세션을 발급한다.

확인된 서버 쪽 세션 잔류 문제는 없다. 다만 account commit 이후 세션 발급 실패는 회원 생성과 사용자에게 보이는 실패가 함께 발생하는 경계다. Android `signUpAsKakaoMember`와 iOS `completeSocialSignUp`의 일반 오류 처리에서는 가입 context를 그대로 남기므로, 이용자가 같은 폼에서 재시도하면 소비된 grant에 막힐 수 있다. 이 경계의 서버 응답·복구는 위 DB 장애로 재현했고, 실제 모바일 화면에서의 복구 UX는 별도 확인 대상으로 남긴다.

## 운영 계정 분리 확인

운영 DB에서 이메일·전화로 프로필을 대조하되 연락처, 비밀번호, 제공자 subject/token을 보고서에 남기지 않았다. Android 계정의 mapping은 실제 Kakao 인증 후 새로 캡처한 프로필에 기반한다.

| 용도 | usrSeq | usrId | 확인 당시 상태·권한 | 로그인 수단 |
| --- | --- | --- | --- | --- |
| 새 ID/PW root | 12813 | jerryhwang018 | ZZZ / root | LOCAL_USERNAME만 존재. Kakao 연결 없음. |
| iPhone에서 사용 중인 기존 root | 12787 | ghkdwp018 | ZZZ / root | ID/PW + Kakao + Apple |
| Android의 실제 Kakao 계정 | 12811 | K4895702339 | BBB / 관리자 권한 없음 | Kakao만 존재, password credential 없음. |

새 root의 legacy 및 canonical 비밀번호 credential은 사용자의 지시에 따라 기존 root의 저장된 값을 DB transaction 안에서 복사했다. 원래 계정은 변경하지 않았다. 새 root의 세션 refresh `200` 및 root 전용 관리자 `/api/admin/operators` 접근 `200`을 복사 이후 재확인했다. 새 root에는 제거할 Kakao 연결이 없다는 점도 legacy social 및 canonical identity 양쪽에서 확인했다.

관리자 API는 `adms.daeilfoundation.or.kr` host를 사용해야 한다. 회원 사이트 host의 `/api/admin/*` 거절을 인증 오류로 오판하지 않았다.

## 운영 탈퇴 QA의 처리 조건

확인한 활성 설정은 request/worker enabled, 대기 168시간, 전용 test-user 제한 없음, external mode `internal`이다. Kakao admin key, Apple private-key 경로, 소셜 credential encryption key가 설정되어 있으며 두 디바이스 계정의 legacy 암호화 credential도 존재한다.

반복 탈퇴·재가입은 운영의 일반 탈퇴 절차로 접수한 후 계정별 요청만 검토한다. 전역 7일 설정을 바꾸거나 SQL로 회원 테이블을 직접 지우지 않는다. root가 `/api/admin/account-deletions/{id}/preview`의 실제 대상·blocker를 검토하고 현재 `planDigest`로 `action=expedite`를 승인하면 그 요청에만 `EXPEDITED_AT`이 기록되어 대기 날짜 이전에도 worker 대상이 된다. 기존 scheduled/target 날짜는 그대로 남는다. worker는 결제/보존 결정, 제공자 철회, 파일, 외부 식별값 및 백업 증거를 계속 검사하며 증거를 임의로 성공 처리하지 않는다.

실기기의 운영 탈퇴 요청별 preview, 최종 처리 및 재가입 결과는 통합 QA 보고서에 후속 기록한다.

## 재현 로그

비공개 workspace의 `build/auth-qa-20261008/`에 baseline JSONL, `backend-auth-golden.jsonl`, 최종 `backend-auth-edge-api-final.jsonl`, 계정 mapping 및 root 권한 검증의 비밀값 없는 증거를 저장했다. production 세션 및 preview 원본은 별도 0600 파일로만 보관하며 커밋 대상이 아니다.

## 운영 실기기 요청의 서버 검증

첫 탈퇴·취소 사이클은 iPhone 요청 #11과 Android 요청 #12다. 접수 직후 두 원래 회원의 WEO 상태는 AAA, 관리자 역할은 없음, 폐기되지 않은 refresh row는 0개였다. 정상 취소 뒤 요청은 모두 cancelled로 바뀌고 요청의 usrSeq는 분리되었다. iPhone 회원 12787은 CCC로 복구되며 기존 root 권한은 복구되지 않았다. Android 회원 12811은 BBB로 복구되었다. 이전 iPhone의 refresh 10개와 Android의 7개는 계속 폐기 상태이고, 각 기기의 새 제공자 로그인으로 생긴 세션만 유효했다.

iPhone #11의 실제 erasure preview에는 BILLING_REVOCATION_REVIEW_REQUIRED, DONATION_RETENTION_REVIEW_REQUIRED, RECEIPT_CONTACT_REVIEW_REQUIRED, FILE_OWNERSHIP_REVIEW_REQUIRED, UNHANDLED_ACCOUNT_REFERENCE가 있었다. 기부/결제 주문 17개, 반복결제 관련 SUBSCRIPTION 2개 및 게시글 32개 등이 대상이다. 이 요청은 조기 처리하지 않았고 취소·복구했다. 실제 검토가 끝나기 전에는 이 기존 계정의 완전 삭제·재가입 QA를 완료로 보고하지 않는다.

Android의 두 번째 요청 #13은 blocker·미처리 참조·파일·결제·게시글이 모두 없었다. 새 root가 현재 planDigest로 표준 관리자 API의 per-request expedite를 승인했고 응답은204였다. 실제 worker 진행을 기다렸다. Kakao ACCOUNT_DELETE outbox의 DELIVERED 및 credential 제거를 먼저 확인했고, 22:26:51 관측 시 요청/status와 erasure/stage가 모두 completed였다. 원래 회원12811의 member·canonical identity·phone claim·social 연결·credential row는 모두0개였다. backups, external_data, historical_files, other_identifiers 네 target은 complete이고 각각 실제 evidence가 비어 있지 않음을 별도 boolean query로 확인했다. 백업 항목은 서비스의 승인된 순환 보존/복원 시 재삭제 정책에 따른 검증이며 모든 백업 바이트가 즉시 사라졌다는 뜻으로 표현하지 않는다. 취소된 #11/#12 및 새 root12813은 유지했다. 이 최종 상태 이후에만 Android 에이전트에 실제 재가입 진행을 알렸다. 전역 설정 변경, 직접 SQL purge, evidence 위조, 서비스 재시작은 없었다.

## iPhone 연결 해제 화면 버그에 대한 서버 증거

실기기 에이전트가 Kakao와 Apple의 최종 연결 해제 확인을 반복 탭했으나 화면에 성공·오류가 없고 계속 연결된 상태였다. 운영 DB에서도 원래12787의 legacy AP/KT와 canonical Apple/Kakao identity가 모두 ACTIVE였다. 같은 시간대 production HTTP journal에는 연결 현황 GET200이 기록되었으며, 실제 disconnect endpoint인 DELETE /api/auth/social/{provider} 요청은 없었다.

SwiftUI ProfileView의 alert Binding setter는 닫힐 때 cancelConfirmation을 호출해 phase를 idle로 바꾼다. 확인 버튼은 async Task에서 confirmDisconnect를 실행하며 이 메서드는 phase가 confirming인지 먼저 guard한다. alert가 먼저 닫히면 Task가 요청을 보내기 전에 조용히 반환하는 경합과 실기기 관찰이 일치한다. 서버 요청이 실패한 것으로 분류하지 않았다. 실제 UI 버그 및 소셜 signup-cancel의 추가 검수 제한은 iPhone 보고서에 함께 기록한다.

## 기존 DB 통합 검증 추가 실행

repository의 개별 opt-in flags도 실제로 켠 최종 실행은 6개 실행/6개 통과/0개 실패/0개 생략이었다. proxy intake의 transaction rollback, 회원 상태 변경·session 차단, 미검토/변경된 erasure plan 거절, 수동 탈퇴와 실제 완료의 구별, 두 password-reset token의 동시 처리 직렬화, social revocation outbox의 MariaDB claim을 검증했다. 환경 flags는 DFLH_DOCKER_TESTS=1, AUTOMATIC_ERASURE_DOCKER_INTEGRATION=1, MANUAL_DELETION_DOCKER_INTEGRATION=1, PASSWORD_RESET_DOCKER_INTEGRATION=1이다. ERASURE_ISOLATED_CONTAINER는 설정하지 않았으며 각 테스트가 자기 disposable localhost container를 생성/제거했다. 최종 로그는 backend-auth-repository-integration-final.jsonl이다. 첫 개별 opt-in 없는 시도는 1통과/5생략으로 별도 보존했으며 최종6통과로 명확히 구분했다. `go vet ./cmd/server`도 통과했다. 최종 실행 종료 후 MariaDB 하네스가 원본15초 제한으로 완전히 복원되었음을 byte 비교했다.

## 원본 iPhone 두 번째 완전 탈퇴 요청과 구현 공백

후속 사용자 지시에 따라 원본12787의 첫 취소 상태를 최종 복구로 유지하는 계획을 변경했다. iPhone은 실제 Kakao로 원본 계정을 확인하고 두 번째 standard 탈퇴 #14를 접수했다. #14는 취소하지 않고 pending/queued로 보존한다. 원본 WEO 상태 AAA이며 새 root12813은 ZZZ다. 현재 preview는 앞서 #11과 같은 다섯 blocker를 표시한다. 실제 정리 완료나 새 Kakao/Apple 가입 가능으로 보고하지 않았다.

실제 SUBSCRIPTION은 failed1/pending1, 저장 청구키0건이며 WEO_ORDER_PROFILE은0건이다. 삭제/preview 구현은 상태나 키 유무와 무관하게 참조 행 자체를 차단한다. SUBSCRIPTION은 code-owned 삭제 목록에도 없어 UNHANDLED_ACCOUNT_REFERENCE로 남는다. 구독 취소 라우트는 현재 서버에 연결되어 있지 않고 서비스의 로컬 취소 상태 전환도 참조 행을 제거하지 않으므로 기존 표준 관리 조작만으로 해소되지 않는 구현 공백이다.

기부17건은 completed2/pending15, 모두source other다. completed2는 순수령액 양수 및 PG 사본 각1건이고 pending15는 순수령액0/PG 사본0이다. 이 사실만으로 실제 원본 보존/영수증 업무의 완료를 확정하지 않았다. 개별 보존 검토는 기존 donation-retention CLI, 실제 영수증 업무는 standard admin receipt_work action을 통해 사실에 맞게 기록할 수 있다. 전역 법적 확인 template는 켜지 않았다.

원본32개 게시물 전체의 읽기 전용 HTML/base64/URL 인벤토리에서 로컬 관리파일후보3개가 등록 소유경로 집합37개와 일치하지 않았다. 실제 운영 저장루트에서 후보3개가 모두 일반 파일로 존재함을 lstat로 확인했다. 파일 소유자를 추정해 metadata를 추가하거나 실제 파일을 지우지 않았다. DB 삭제 이후에만 등록 가능한 기존 역사파일 CLI는 현재 파일 소유권 blocker를 직접 해소하는 경로가 아니다.

검토 가능한 최소 수정 계획과 실제 운영자에게 필요한 입력을 `original-iphone-erasure-resolution.md`에 분리 기록했다. code patch/deploy, 직접 SQL purge, 근거 없는 evidence/완료 flags 또는 #14 조기 처리는 아직 수행하지 않았다.

## 실제 Android 새 가입폼 취소의 서버 증거

원본12811의 완전 삭제 이후 실제 Kakao 새 제공자 동의 및 가입폼 취소를 검수했다. 가입 POST 이전 운영 조회에서 원본 회원·identity0, 새root 이후 회원0, 원본 또는 신규 회원의 서비스 refresh row0, 같은 phone claim0이었다. 실제 새 가입폼 취소가 서비스 인증·회원 생성 없이 끝난 사실은 `android-social-signup-cancel-server-proof.json`에 기록했다. 이후 실제 SMS 인증은 Android 실기기에서 성공했으며 아직 운영 OTP 테스트 allowlist 설정을 바꾸거나 서버를 재시작하지 않았다.

## 주 세션 직접 Android QA 후속

사용자 요청으로 iOS QA를 중단했다. Android는 주 세션이 실기기를 직접 조작하며 관리자 Computer Use로 신규 QA 회원 12814를 승인했다. 승인 전 제한 화면 유지와 승인 후 foreground/cold start, logout/cold start 및 Kakao 재로그인을 확인했다. 이어서 테스트 회원의 요청 15를 UI에서 접수하고 관리자 페이지에서 보류·파일 없는 10개 테이블/13건 삭제 계획을 검토해 그 요청만 조기 실행했다. Kakao revocation DELIVERED 뒤 DB 처리의 정식 재시도를 기다리고 있다. iOS 요청 14와 새 root 12813은 후속 조작 대상에서 제외했다.


## Android 직접 QA 후속 결과

실제 신규 Kakao 회원 12814 및 native 회원 12816은 Computer Use로 승인했고, 12816은 반려·학과 수정·재신청·재승인도 검수했다. 12814 요청 15는 provider revocation DELIVERED 및 DB 회원/identity/phone claim 삭제 후 other_identifiers/EXTERNAL_ERASURE_PENDING 상태다. SMS 인증 테이블 잔류와 삭제 preview 간 불일치가 AUTH-QA-11이다. 동일 전화번호 재가입으로 만들어진 정당한 새 레코드도 식별값 전역 검색에 잡힐 위험이 있으며 단독 영향은 분리하지 않았다. 전체 삭제 완료라고 기록하지 않는다.

12816의 최초 Kakao 연결·해제는 성공했다. 재연결은 실기기 2회 및 운영 sanitized 로그에서 canonical unique 충돌로 재현했다(AUTH-QA-12). 별도 MariaDB 기대 동작 probe 1개는 정확히 재연결 단계에서 1062 오류로 실패했다. 앞선 연결·해제·ID/PW 로그인 통제는 통과했다. 예상 실패 probe는 기본 suite 밖 문서 파일로 보관했고 임시 timeout과 복사한 기본 테스트 파일은 복구·제거했다.

12816 요청 16은 앱에서 접수되며 refresh 4개가 모두 폐기되고 올바른 비밀번호 로그인도 차단됐다. 관리자 UI에서 8개 테이블/12건, 파일 및 blocker 0건 계획을 검토해 해당 요청만 조기 실행했다. 2026-10-08 23:42 KST에는 해당 회원/identity/password/phone claim/소셜 자격정보가 모두 0건이고 processing/database_erased/EXTERNAL_ERASURE_PENDING이며 other_identifiers만 pending이다. 전체 완료로 집계하지 않는다. iOS는 사용자 요청으로 중지·인계했으며 이후 해당 계정에 조작하지 않았다. 새 root 12813은 유지했다. 운영 코드 수정·배포는 하지 않았다.
