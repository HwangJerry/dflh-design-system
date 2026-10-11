# 공통 서버 인증 잔여 결함 수정안

2026-10-09. 조사 기준은 운영과 동일한 backend `567b6e1`, iOS의 로컬 수정 코드, Android 수정 worktree `6bf4c61`이다. [조사와 재현 결과](../qa/auth-server-remaining-defects-2026-10-09.md)에 근거한다. 이 문서는 구현 검토이며 이번 검토에서 제품 코드·운영 데이터·배포를 변경하지 않았다.

서버와 두 앱을 함께 보완한다. 정상 로그인·가입의 기존 응답 형식을 유지하고, 실패·취소의 결과를 명시한다. 세 항목을 해결하기 위해 새 인증 시스템이나 별도의 계정 삭제 흐름을 도입할 필요는 없다.

## 1. 소셜 가입 취소

`POST /api/auth/social/link/cancel`을 추가한다. 인증은 현재 가입 흐름의 추측하기 어려운 linkToken으로 제한한다. 가입 전이므로 서비스 access token을 요구하지 않는다. 요청 본문에 토큰을 보내고 로그에는 토큰·제공자 credential·프로필을 남기지 않는다.

SocialLinkTokenStore에 Cancel과 cancelled 상태를 추가하고 Begin/Cancel/Consume을 동일한 mutex로 직렬화한다. 취소 tombstone에는 상태·만료 시각만 남기고 제공자 credential, revocation token, 개인정보를 비운다. 기존 TTL을 연장하지 않는다.

| 취소 시점의 상태 | 서버 결과 |
|---|---|
| ready | cancelled로 전환하고 데이터를 비운 뒤 204 |
| cancelled / 만료 / 존재하지 않음 | 멱등 204, 다시 사용할 수 없음 |
| processing | 409 TOKEN_IN_PROGRESS. 가입 제출의 최종 결과를 확인해야 함 |
| consumed / 회원 생성 완료 | 409 SIGNUP_ALREADY_COMPLETED, 기존 회원 유지·재로그인 안내 |

처리 중인 가입을 무조건 취소 성공으로 응답하면 서버에서 회원이 생성돼도 앱이 가입 취소로 오인한다. Cancel이 먼저 승리하면 Begin·prefill·photo가 거부되고 회원이 생기지 않아야 한다. Begin이 먼저 승리하면 취소 완료를 보장하지 않으며, 진행 중인 가입 결과를 안내한다. 서버가 취소 성공을 응답한 토큰으로 이후 회원·세션을 생성해서는 안 된다.

iOS AuthRepository/AppState와 Android AuthApi/SessionRepository/ViewModel에 취소 호출을 연결한다. 제출 중에는 취소 버튼·뒤로가기·interactive dismiss를 제어하고 처리 상태를 표시한다. 단순 앱 백그라운드 진입을 가입 취소로 해석하지 않는다.

앱은 명시적 취소 시 기존 인증 시도 세대를 무효화하고 로컬 가입 폼·전화 인증·staged Apple identifier 및 앱이 가진 가입용 인증 정보를 정리한다. 늦게 도착한 prefill/upload/login 결과가 화면이나 새 세션을 되살릴 수 없어야 한다. 서버 취소 응답도 이전 linkToken의 작업으로 묶어 새 로그인 상태를 변경하지 않는다.

오프라인에서는 서버 즉시 폐기를 보장할 수 없다. 앱의 로컬 취소는 먼저 완료하고, 유효 기간 안에서 최소한의 취소 토큰만 보안 저장소에 한정 보관하여 재연결 시 정리 요청을 재시도한다. 만료 시 삭제한다. 제공자 토큰·프로필·비밀번호를 이 재시도 큐에 보관하지 않는다. 서버 TTL은 요청 전달 실패와 앱 강제 종료에 대한 보완 수단으로 유지한다. 제공자 계정의 권한 해제는 별도의 사용자 요청이며 가입 취소 때문에 자동으로 실행하지 않는다.

사진 업로드도 같은 토큰 수명을 따른다. 현재 photo handler는 업로드 완료 후 token Update가 실패하면 파일이 남을 수 있다. 이 경우 기존 UploadOrchestrator.Discard로 해당 업로드 결과를 정리한다. 취소·만료 시 삭제 대상은 이 흐름에서 실제 생성한 UploadResult/FSeq로 추적하며, 제공자 사진 URL이나 클라이언트가 입력한 임의 URL을 삭제 대상으로 삼지 않는다. 회원 생성이 완료된 파일은 정리 대상에서 제외한다. 만료·정리 실패에 대한 재시도는 회원 파일 소유권을 확인한 뒤 수행해야 한다.

## 2. 가입 비밀번호 정책

RegistrationService의 저장·해싱·중복 확인 전에 공통 ValidateNewPassword를 적용한다. HTTP handler에서도 동일 오류를 `400 INVALID_PASSWORD`와 읽기 쉬운 안내로 변환한다. 비밀번호 변경·재설정도 같은 validator를 사용해 중복된 규칙을 제거한다. 해시 함수는 기존 credential 검증·전환에도 사용되므로 그 안에서 신규 비밀번호 정책을 강제하지 않는다.

첫 보완에서는 현행 서버 변경·재설정 정책의 의미를 유지한다: UTF-8 최소 8바이트, ASCII 영문과 숫자를 각각 포함하고 `[^a-zA-Z0-9]`에 해당하는 문자를 포함한다. 공백·Unicode의 기존 판정까지 계약 테스트에 명시한다. 현재 정책을 '문자 8개' 또는 '공백 제외 기호' 규칙으로 바꾸는 것은 별도의 정책 변경으로 구분해야 한다.

서버/Swift/Kotlin에서 같은 입력·결과를 쓰는 golden case를 만든다. iOS는 현재 서버와 같은 바이트·정규식 판정이고, Android는 문자열 길이·Unicode letter/digit·공백 판정이 달라 이 기준에 맞춘다. 안내도 실제 길이·문자 판정과 맞춰 작성한다.

신규 가입·변경·재설정만 검사한다. 기존 짧은 비밀번호의 로그인과 MySQL legacy → Argon2id 전환은 유지한다. 입력을 trim/정규화하여 다른 비밀번호로 저장하지 않는다. 실패 시 회원·전화 claim·credential·consent·세션을 만들거나 전화 인증 grant를 소비하지 않아야 한다.

## 3. 회원 생성 완료와 세션 발급 실패 분리

회원·소셜 identity 생성 transaction의 commit을 기준으로 결과를 구분한다. commit 전 실패는 기존 rollback 및 재시도 가능한 continuation/grant를 유지한다. commit 후에는 회원을 유지하고 가입 완료를 알린다.

현재 iOS의 SocialAuthResponse enum과 Android SessionRepository는 authenticated/linkRequired/pending/rejected만 처리한다. 따라서 서버만 먼저 배포하면서 임의의 새 성공 status나 세션 없는 201을 추가하면 구버전 앱의 파싱·세션 적용이 실패한다. 첫 보완은 기존 `{code,message}` 오류 형식을 사용한다.

- 회원 생성 후 CompleteMobileLink 실패: 기존 HTTP 500 경로에서 code를 `SIGNUP_COMPLETED_LOGIN_REQUIRED`로 바꾸고, '가입은 완료되었습니다. 같은 소셜 계정으로 다시 로그인해주세요.'를 반환한다. 세션을 발급했다는 성공 상태는 반환하지 않는다.
- commit 후 continuation Consume 실패도 같은 가입 완료 복구 분류로 맞춘다. 인증 정보는 terminal 처리에서 즉시 비운다. 만료된 토큰을 되살리지 않는다.
- terminal token에는 제공자 credential 없이 최소한의 가입 완료 상태를 기존 TTL 동안 유지한다. 기존 소비된 grant 검사가 먼저 실행돼 PHONE_NOT_VERIFIED로 가려지지 않도록 Begin/terminal 검사를 전화 인증 검증 앞에 배치한다. grant 실패 등 commit 전 오류에서는 lease를 Release한다.
- 같은 token의 재전송은 409 `SIGNUP_ALREADY_COMPLETED`로 가입 완료·재로그인을 안내한다. 신규 회원을 만들거나 전화 인증을 다시 요구하지 않는다. terminal token으로 서비스 로그인 세션을 발급하지 않는다.
- 성공 응답을 전달하다 연결이 끊긴 경우에도 소비된 token은 동일한 가입 완료 결과를 준다. 이 재전송은 성공 응답/로그인 token 재발급이 아니라 완료 상태 확인이다.
- cache 만료·서버 재시작 후 완료 상태를 확인할 수 없으면 INVALID_TOKEN과 새 제공자 인증 안내를 반환한다. 확인할 수 없는 상태를 가입 취소/미가입으로 단정하지 않는다. 새 제공자 인증의 기존 회원 lookup으로 복구한다.

두 앱에는 가입 완료·로그인 필요 상태를 추가한다. 이 상태에서 소모된 폼·linkToken·전화 인증을 정리하고, 같은 제공자로 다시 로그인하는 버튼을 표시한다. Apple은 새 challenge와 사용자 인증을 거친다. 확인되지 않은 기존 credential이나 소비된 grant로 자동 로그인하지 않는다.

Android는 SocialSignUpException으로 원래 API 오류를 감싸므로 cause까지 검사해야 한다. 두 앱 모두 terminal 오류를 일반 5xx 자동 재시도에서 제외한다. 로그인 성공 후 동문 승인/초기 검증 상태는 서버에서 다시 읽는다. 기존 인증 시도 세대 보호와 새 세션 격리는 유지한다.

## RED → GREEN → refactoring 및 재검수

아래 desired contract를 먼저 실패하는 테스트로 작성한다. 기존 관찰 probe의 통과를 수정 완료 증거로 사용하지 않는다.

| 테스트 그룹 | 주요 기준 |
|---|---|
| 취소 | 취소 204 후 데이터 비움, Begin/prefill/photo 거부, 반복 취소 멱등, 가입/취소 동시 실행에서 한 결과만 승리, 새 로그인에 늦은 취소 응답 무영향 |
| 사진 | 업로드 중 취소·만료·가입 commit 시 해당 업로드의 소유권 및 정확한 정리 여부, 다른 회원/제공자 사진 보존 |
| 비밀번호 | 한 글자·경계 길이·영문/숫자/기타 문자 누락·공백/Unicode golden, 거부 시 DB 쓰기/전화 grant 소비 0, 정상 가입과 legacy 로그인 유지 |
| commit 전 실패 | 실제 MariaDB rollback, 전화 grant/continuation 재사용 가능, 회원·identity·session 없음 |
| commit 후 실패 | 실제 MariaDB refresh 삽입 실패 주입, 가입 완료 코드 반환, 같은 token 재전송에도 같은 회원 1개, 서비스 refresh session 0, 새 인증 후 같은 회원 복구 |
| 응답 유실·재시작 | 재전송에서 완료 분류, 만료/재시작 후 fresh provider login 복구, 소비된 token으로 세션 발급 금지 |
| 클라이언트 계약 | Swift/Kotlin 오류 파싱과 완료 상태 전환, 자동 POST 재시도 방지, 지연 결과·로그아웃·다른 계정 로그인과의 충돌 |

최소 수정으로 GREEN을 만든 뒤 공통 password validator와 terminal 결과 처리만 책임에 맞게 정리한다. 격리 MariaDB API/transaction, token store 동시성/race, Swift/Kotlin 계약 테스트를 실행한다. 그 다음 각 실기기에서 카카오 가입 취소·실패·재시도, ID/PW 가입, 자동 로그인·로그아웃을 재검수하고 iOS Apple 인증도 확인한다.

배포는 계약 검증 → 서버 → iOS/Android 순서다. 새 취소 API는 additive이고 정상 응답은 유지한다. 구버전 앱도 가입 완료 안내를 읽을 수 있지만 자동 화면 전환은 앱 업데이트 후 제공된다. 운영 장애 주입은 하지 않으며 실제 회원의 탈퇴·데이터 이동을 다시 수행할 필요는 없다. 동작 변경에 별도 DB migration은 현재 세 결함의 기본 수정만으로 필요하지 않다. 사진 정리 이력의 영속화가 필요하면 기존 업로드 소유권 모델과 함께 별도로 설계한다.
