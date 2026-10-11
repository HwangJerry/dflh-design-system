# Android 인증 서버 독립 검수 — 2026-10-10

최종 운영 조회: **2026-10-10 20:50:58–20:50:59 KST**.

Android 실기기 담당과 독립적으로 운영 서버의 배포·인증 자료를 읽기 전용으로 대조한다. iOS 기기와 결제·구독은 제외한다. 회원 생성·연결 해제·탈퇴는 실기기 또는 관리자 담당이 수행하며, 이 담당은 운영 SQL 쓰기·제공자 인증·설정 변경을 수행하지 않는다. 운영 DB에 오류를 주입하지 않는다.

## 배포와 검수 경계

20:10 KST 실행 중 `/proc/21531/exe`와 `/app/backend/server`의 SHA256은 모두 `55f483b80e0b5e26337a5edd13040be2a646443a897d917d4bb4ea8155a2f672`다. 기존 release `464ddda` 배포 기록과 일치한다. 현재 개발 HEAD `d1fdfedb7c7768c31e79de555eed1a56af8c8071`와 `464ddda`의 차이는 로그인 오류 golden fixture 한 곳이며 인증 실행 소스는 동일하다. 이번 검수에서 서버 바이너리·migration을 배포하지 않는다.

운영 프로세스의 실제 환경은 탈퇴 요청 true·worker true·privacy retention false·test user 0이다. `/etc/sysconfig/alumni-backend` 파일의 requests/worker false는 후속 systemd EnvironmentFile의 rollout 설정으로 덮어쓰인다. 파일 한 곳만 보고 기능이 꺼졌다고 판단하지 않는다. SMS QA 설정을 담당자가 임시 추가한 뒤 재시작한 PID 28065에서도 실제 환경 값이 정확히 유지됨을 확인했다.

## 운영 실기기 전후 대조

- 초기 QA 회원 12827: LOCAL_USERNAME/KAKAO ACTIVE, 활성 refresh·푸시 등록 0.
- root 관리자 12813: LOCAL_USERNAME ACTIVE·root 권한 유지, 기존 활성 세션 가족 4개 해시 모두 유지. 기존 비밀번호와 provider 식별자 원문은 읽지 않는다.
- 실기기 오답 ID/PW 로그인은 운영 API 401, 정상 로그인은 200.
- QA 12827 카카오 연결 해제는 200. Native 로그인 수단은 ACTIVE, Kakao 소유권은 REVOKED로 유지한다. 정상 로그아웃 뒤 해당 회원 활성 refresh·푸시 등록 모두 0.
- 동일 카카오 가입 시작은 202, prefill 200. 오프라인 취소 후 재연결에 취소 API 204를 20:11:07 KST 운영 로그에서 확인했다. 신규 회원 생성 없이 총 회원수 367·최대 회원번호 12827 유지.

- 같은 카카오 계정의 신규 가입을 마지막 단계까지 제출하면 20:17:34 KST 409로 기존 소유권 충돌이 반환됐다. 전화 인증 완료 Y·소비 N·소비 회원 0, 새 번호 소유권 0, 신규 회원·세션·동의 추가 0을 확인했다. 뒤이어 취소 API 204도 확인했다. 기존 회원 소유권을 유지하는 정상 정책이지만, 최종 입력 단계까지 진행한 뒤에야 안내하는 UX 개선 사항은 재현됐다.

- 신규 Native 전체 가입에서 회원 **12829 / AndroidAudit2610A / AndroidAuthQA**가 생성됐다. `auth/register` 201→mobile login 200→me 200이며, USR_STATUS BBB·동문 인증 pending·LOCAL_USERNAME ACTIVE·필수 개인정보 동의 accepted 1건이다. 새 전화번호 claim은 12829에 귀속되고 실제 제출에 사용한 인증권은 Y/Y·소비 회원 12829로 기록됐다. 활성 refresh 1가족 및 같은 SID의 푸시 등록을 확인했다. 이전에 social 신규 가입이 rollback되어 auto-increment 12828이 비었으므로 번호 간격을 부분 생성으로 판단하지 않는다.
- 신규 Native 오프라인 bootstrap 검수 시에도 서버 원래 세션 가족과 푸시 등록은 유지됐다. root의 기존 세션 가족 4개도 유지됐다. 오프라인이라는 이유로 서버 로그인 상태가 사라졌다고 판단하지 않는다.

- 기존 QA 12827에서 동일 소유자 카카오 재연결 API 200과 KAKAO ACTIVE 복귀를 확인했다. 최초 제공자 소유권 해시와 같고 Native 수단도 ACTIVE다. 새 Native 12829의 정상 로그아웃은 refresh·푸시 0으로 대조했다.
- 카카오 로그인 200 후 QA 12827의 탈퇴 **요청 30**을 202로 접수했다. pending/queued·KAKAO_REQUIRED 1, 회원 USR_STATUS AAA·서비스 refresh/푸시 0이며 root 세션은 보존됐다. 인증 수단 행의 ACTIVE 여부와 회원 이용 정지 lifecycle은 구분한다. 첫 요청은 취소 검수를 위해 담당자가 처리하므로 관리자가 조기 삭제하지 않는다. 자동처리 예정은 UTC 10월 17일 11:27:51 → KST 20:27:51이다.

- 첫 탈퇴 요청 30 취소는 API 200, request cancelled·stage cancelled·회원 BBB 복구를 확인했다. 탈퇴 대기중 카카오 로그인은 403이며, 저장된 접수증 조회는 200이다. 취소 뒤 Native/KAKAO 연결은 유지되고 예전 refresh·푸시는 다시 활성화되지 않았다.
- 취소 뒤 카카오 재로그인 200으로 동일 12827 복구를 확인하고, 두 번째 탈퇴 **요청31 / 회원12827**이 20:31:18 KST 202로 접수됐다. pending/queued·KAKAO_REQUIRED1·memberAAA·활성 refresh/푸시0이다. 현재 조기 처리 검토 대상은 요청31이며 취소된 요청30과 구분한다.

AUTH_SIGNUP_CONTINUATION 및 ALUMNI_SOCIAL_LINK_CONTINUATION의 DB 행은 이 경로에서 0이다. 실제 가입 토큰은 legacy in-memory store에 있으므로 DB 0만으로 제공자 credential 즉시 폐기를 증명하지 않는다. 운영 cancel 204와 같은 실행 소스의 Cancel credential 비우기·재사용 거부·lease 경쟁 검사를 함께 근거로 삼는다. 서비스 refresh 세션이 없는 것과 재시도용 임시 가입 인증의 TTL을 구분한다.

## 관리자 승인 후 비밀번호 변경 추가 검수

20:37 KST 사용자 승인 뒤 회원12829의 ALUMNI_VERIFICATION.STATUS=approved를 독립 확인했다. 회원 BBB·Native ACTIVE·필수 동의·phone claim은 유지됐다. 승인 후 로그인200과 auth/me200, 오프라인/재실행 뒤 복원을 운영 로그 및 실기기 담당 근거와 대조했다.

현재 비밀번호 오답은 20:38:45 KST profile/password401, 이어서 auth/refresh200과 같은 profile/password401 재전송으로 관측됐다. UI는 현재 비밀번호 오류를 표시하며 로그인은 유지됐다. **입력 자격 검증 실패를 access-token 만료로 오인해 불필요한 refresh rotation과 변경 요청 재전송을 하는 Android 보완 사항**이다. 운영 로그와 ProfileApi.changePassword의 기본 retryUnauthorized=true가 일치한다. 서비스 세션이 잘못 종료되는 결함은 이번에 재현하지 않았다.

올바른 비밀번호 변경은20:39:17 KST200이다. 비밀번호 값/해시를 읽지 않고 canonical credential의 UPDATED_AT이 같은 시각으로 갱신된 메타데이터만 확인했다. 동일12829 세션가족·같은 SID의 푸시는 활성 상태로 유지됐고 root4세션도 보존됐다.

서버 정책 구현은 두 경로가 다르다. 로그인 상태의 ChangePasswordAtomically는 canonical+legacy 비밀번호를 같은 트랜잭션에 바꾸며 기존 로그인 세션을 revoke하지 않는다. 반면 비밀번호 찾기 reset-confirm atomic 경로는 해당 회원의 모든 ALUMNI_MOBILE_REFRESH_TOKEN과 ACTIVE AUTH_SESSION_FAMILY를 revoke한다. 인증된 비밀번호 변경에서도 다른 기기를 종료해야 하는지는 별도 명시 정책이 없어 서버 결함으로 단정하지 않는다. 원래 세션을 유지하는 현행 동작은 확인됐으며, 다른 기기 로그아웃 선택 또는 강제 종료 정책을 정하면 계약·기기 재검수가 필요하다.

비밀번호 찾기는 verified EMAIL identity만 재설정 권한으로 인정하며 전화번호 기반 reset 경로는 현재 없다. 신규 Native12829는 LOCAL_USERNAME identity만 있어 전화93로 실제 비밀번호 찾기 정상 경로를 검수할 수 없다. 운영 DB에 reset 토큰이나 EMAIL 검증 상태를 직접 만들지 않았다.

대신 담당자가 자체 생성 QA12829 인증으로 20:43:11 KST logout/all204를 호출했고, 모든12829 활성 mobile family·푸시가0이 됐다. 실기기의 기존 cache로 cold bootstrap한20:43:31 auth/me401→refresh401을 관측하고 로그인 화면 복귀를 기기 담당이 확인했다. 두 번째 재실행도 로그인 화면을 유지했다. root4세션과 회원12829의 Native/전화번호 소유권은 보존됐다. 이는 외부 session 철회 후 앱 복구 경계 검수이며 실제 이메일 비밀번호 찾기를 수행했다고 표현하지 않는다.

추가로 동일 서버 소스의 격리 HTTP/MariaDB 정책 관찰 **4개 통과·실패/skip0**를 확인했다. 비밀번호 변경 전 두 mobile session을 발급하여 오답/정상 변경 후 둘 다 me200으로 유지되는 것을 증명했다. LOCAL 회원의 등록 이메일만으로 reset-request를 보내면200이지만 reset행은0이다. 이후 합성 reset proof를 **disposable 로컬 DB에만** 준비한 reset-confirm은 두 원래 session의 me/refresh를401로 차단하고 새 비밀번호 로그인을200으로 복구했다. 운영 계정의 재설정 token 삽입·EMAIL 검증 상태 추가는 수행하지 않았다. 관찰 assertion은 현행 정책을 확인하며 정책 보완 완료를 의미하지 않는다.

외부 철회 후 실제 재로그인에 성공한12829는 본인 기기에서 탈퇴 **요청32**를20:44:47KST202로 접수했다. KAKAO_REQUIRED0·pending/queued·memberAAA·refresh/푸시0,root4세션 보존을 확인했다. 관리자 검토 대상32/회원12829와 기존31/회원12827을 구분한다.

관리자 조기 처리한 요청31은 카카오 ACCOUNT_DELETE outbox DELIVERED를 선행 확인한 뒤20:45:21KST 정상 worker 재시도로 database_erased에 진입했다. 회원12827·Native/KAKAO identity·phone claim·서비스 세션이 삭제됐다.20:46 재조회에서 backups/external_data/historical_files는complete,other_identifiers는SMS3건 보관대기이며 예상Oct11 01:36:29KST다. completed가 아니므로 최종 완료로 표기하지 않는다.

기기에서 제공자 철회 후 다시 나타난 실제 카카오 동의창을 명시 취소한 경로도 확인했다.20:47 대조에서 추가 kakao/mobile·social/link 호출이 없고 새 회원/서비스 세션/삭제된12827 provider identity는0이다. 서비스 가입 continuation을 발급받기 전에 제공자 화면에서 취소된 경로와, continuation 발급 후 앱 취소API204 경로를 구분한다.

## 전화번호·탈퇴 대기

새 Android QA 전화번호는 기존 회원 USR_PHONE·AUTH_PHONE_CLAIM.CANONICAL_PHONE·ALUMNI_PHONE_VERIFICATION.PHONE 중복이 각각 0임을 확인한 뒤 담당자가 등록한다. 기존 탈퇴의 SMS 보관 기한을 연장하는 전화번호는 재사용하지 않는다. 전화번호·코드는 보고서에 기록하지 않는다.

20:09 KST 요청 24/25/26은 여전히 processing/database_erased이다. 다른 식별자 목표의 남은 SMS 행은 각각 3/1/3으로, 지난 보고서의 3/6/3에서 요청 25의 행이 정상 감소했다. WAIT_UNTIL은 UTC 저장이며, 한국시간 기한은 24/26이 10월 11일 01:36:29, 25가 02:34:58이다. worker가 켜져 있어도 보관 기한 전 완료로 판정하지 않는다. 날짜·기한·상태를 강제로 변경하거나 purge하지 않는다.

## 자동 검증 결과

현재 실행 소스의 서버 단위·계약 선택 검사는 leaf 101 통과, 실패 0이다. 첫 실행에서 skip된 전화번호 소유권 migration-lock 경쟁은 정확한 별도 opt-in `PASSWORD_RESET_DOCKER_INTEGRATION=1`로 disposable MariaDB에서 재검사하여 1 통과·실패/skip 0을 확인했다. 기존 migration 승인 계약 실패 3건은 현재 HEAD에서 새로 검사하여 3 통과·실패/skip 0이다. 운영 migration 배포가 필요했던 실패로 보지 않으며 승인 packet/source 계약 보완이 현재 소스에 반영된 결과다.

실제 HTTP/MariaDB 통합 검사는 운영 DSN을 사용할 수 없는 하네스의 전용 loopback 컨테이너를 사용한다. 첫 실행에서 전체 baseline DDL이 하네스의 15초 제한을 넘는 환경 실패가 반복됐다. 제품 assertion까지 도달한 실패로 분류하지 않는다. 원래 실행 로그를 남기고, HEAD git archive의 격리 복제에서 `internal/testsupport/mariadb/mariadb.go`의 queryTimeout만 15초→90초로 늘려 재검사한다. 제품 저장소나 테스트 assertion은 변경하지 않는다.

격리 실제 HTTP/MariaDB 최종 실행은 **leaf 56 통과·실패/skip 0**이다. 완료된 패키지 결과도 pass다. 회원가입 동의·전화 인증 증빙의 원자성/경쟁, 소셜 회원 생성 commit 후 세션 발급 장애와 재로그인 복구, 취소, 소셜 연결 해제/재연결, refresh 재사용 방어, 다른 세션 보존, 탈퇴 소유권/보관/worker 재시도, deferred logout의 응답 확인·장애 rollback·만료·경합, 세션별 푸시와 migration085 idempotence를 포함한다. 각 단위/DB/계약 검사는 범위가 겹치므로 하나의 총수로 합산하지 않는다. 테스트 전용 컨테이너는 정상 제거됐다.

신규 회원12829 승인은 완료됐다. QA12827 요청31의 관리자 조기 처리·제공자 철회·운영DB 삭제는 완료됐다. 새 카카오 가입 성공과 최종 탈퇴 완료 화면은 후속 단계다. Chrome 도구 접근 문제를 운영 DB 직접 쓰기로 우회하지 않는다. 이번 독립 서버 검수에서 새로 확정한 서버 기능 결함은 없지만, 이 문서만으로 Android 전체 목표 완료를 판정하지 않는다.

현재 QA12827의 조기 처리 준비를 위한 계정별 읽기 전용 집계는 회원1·canonical identity2·account state/phone claim/consent/password credential 각각1·legacy social/credential 각각1·verification1·회원 소유 소비 SMS1이다. 업로드/프로필 파일 이력은0이다. 이 집계는 **정식 관리자 preview·planDigest를 대체하지 않으며**, 요청/세션이 변하면 다시 검토해야 한다. 카카오 제공자 해제1건과 추가 SMS 보관대기3건이 예상되며 보관 종료에 정상 cleanup/recheck/poll 여유를 더한 예상은10월11일01:36:29KST다.

## 운영 원복 후 최종 상태

임시 SMS QA 설정의 원래 전화번호 목록·코드·동의 버전 복구는 root 담당이 수행했다. 원복 후 프로세스 PID 1550에서 실제 탈퇴 requests/worker true·retention false·test user 0을 독립 재확인했다. 실행/디스크 바이너리 SHA는 기존 `55f483...`와 같으며 앱·관리자 health는 200이다. root 권한 1건과 최초 세션 가족 4개가 모두 보존됐다.

QA 12827은 계정 DB 삭제·카카오 철회를 완료했다. 요청 31은 SMS 보관 대기로 전체 completed 전이다. QA 12829는 탈퇴 요청 32 pending/queued·이용 정지 AAA·Native identity/phone claim 보존 상태이며, 활성 서비스 refresh·푸시는 0이다. 요청 32의 관리자 조기 처리는 최종 조회 시 아직 반영되지 않았다. 전화번호 소유권이 남아 같은 새 QA 번호의 카카오 신규 가입 완료는 후속 검수다.

이번 검수에서 새로 확정한 서버 기능 결함은 없다. 인증된 비밀번호 변경의 세션 유지 정책과 Native의 전화번호 기반 비밀번호 찾기 미지원은 기능 정책 경계로 구분한다. 현재 비밀번호 오답 401에 대한 불필요한 refresh는 Android 클라이언트 보완 항목이다. 실제 SMS 전달, 제공자 SDK 개별 캐시 상태, 탈퇴 최종 완료 화면은 본 보고서의 서버 자료로 대체하지 않는다.

근거: `build/android-auth-goal-audit-20261010/server/`의 baseline, 전후 snapshot, API 안전 로그, 실행 바이너리/실제 환경 메타데이터와 테스트 JSONL. 인증 토큰·비밀번호·원문 연락처·제공자 식별자는 보고서에 포함하지 않는다.
