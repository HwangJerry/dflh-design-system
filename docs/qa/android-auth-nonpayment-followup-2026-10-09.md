# Android 추가 인증 검수 — 정기결제 제외

2026-10-09 12:31 KST까지 확인 가능한 추가 검수를 수행한 기록이다. 정기후원·정기결제 청구·종료 검수는 제외했고, iOS 기기는 조작하지 않았다. 제품 소스 수정이나 운영 배포 없이 기존 수정 소스의 남은 인증 경계를 검수했다. 실제 운영 탈퇴의 최종 완료, release 동의 취소 화면, 관리자 화면 추가 검수는 아래에 미검수로 구분한다.

## 검수 기준

- Android: `fix/auth-session-generation-20261009`, `6bf4c611a1c4152af0a939696a82cbd83f41a090`.
- backend: `fix/social-relink-20261009`, `567b6e1cc31f7d39f13b779bf3846cee537b5702`.
- 실기기: Samsung Note9 / Android 10. 기존 QA 회원 12822와 별도 root 12813을 보존했다.
- release APK: R8 난독화 적용, debuggable=false, 기존 수정 QA 앱과 동일한 upload 인증서. SHA-256 `7ef04105b1b2f9eae0e2a7a17c50f1ba46662a81d5d5dfb18e9a25240e58d4f6`.
- 기존 앱을 삭제하지 않고 `adb install -r`로 업데이트했다. Play 배포/Play 서명의 검수가 아닌 로컬 release APK 검수다.

## 자동 검수

Android 세션·가입·인증번호·취소·탈퇴 repository의 집중 회귀 90개가 통과했다. 서버는 HTTP/실제 MariaDB 경계 16개, 가입·동의·소셜 연결·세션 계약 36개, 인증번호 경계 13개로 총 65개 세부 사례가 통과했다. Go 상위 테스트와 하위 테스트를 합친 출력 노드 수와 세부 사례 수를 구분했다. 실패와 skip은 0이다.

서버에서 확인한 경계는 refresh replay가 같은 세션 family만 폐기하는지, 현재 기기 로그아웃과 전체 로그아웃의 차이, 승인 대기 권한 제한, 정지 회원의 access/refresh 차단, 소셜 가입 DB 실패 rollback, 가입 후 세션 발급 실패 시 새 제공자 로그인으로 복구, 탈퇴 취소 비밀값 검증, 탈퇴 후 같은 번호로 재가입한 회원 보호, SMS 24시간 경계 및 cleanup 실패 후 재시도다.

별도로 기존 서버 가입 결함을 관찰하는 2개 사례를 격리 HTTP/MariaDB에서 재실행해 재현했다. 추가로 가입 후 필수 기록 저장 실패를 주입하는 2개 관찰 사례도 재현했다. 이 관찰 검사의 통과는 결함이 해결됐다는 의미가 아니다. 합성 제공자 인증을 사용했고 실제 iOS UI는 조작하지 않았다.

추가 관찰 검사의 첫 실행은 사업 로직에 도달하기 전에 baseline schema 로딩의 15초 제한으로 실패했다. 별도 source archive의 테스트 하네스 DB 타임아웃만 2분으로 늘린 뒤 두 사례 모두 실행했다. 제품 HTTP/사업 로직과 운영 설정은 변경하지 않았다. 첫 실패 로그도 보존했다.

## 실기기 검수

| 항목 | 결과 |
| --- | --- |
| ID 로그인의 잘못된 비밀번호 | 401/INVALID_CREDENTIALS. 화면의 이메일 오류 문구 결함 재현 |
| 존재하지 않는 ID | 동일한 401/INVALID_CREDENTIALS와 오류 문구. 두 경우 성공 세션 발급 없음 |
| ID/PW 세션의 실제 만료 후 오프라인 시작 | 16분 이상 force-stop 뒤 재시도/로그아웃 화면. 연결 복구 후 비밀번호 재입력 없이 같은 QA 회원으로 복구 |
| ID/PW refresh rotation | 서버에서 기존 refresh 소비 및 같은 family의 successor 발급 확인 |
| debug QA 앱 → R8 release 업데이트 | 앱 데이터 보존, 기존 암호화 저장소의 세션과 같은 QA 프로필 유지 |
| release Kakao 연결 해제·재연결 | native 세션을 유지하면서 재연결 성공 |
| release Kakao 앱 우선 호출 | 연결과 로그인 모두 실제 `com.kakao.talk` Activity 관측 |
| release 로그아웃 뒤 Kakao 로그인 | 같은 QA 회원 12822로 진입. 이전 native family는 서버에서도 revoke됨 |
| release Kakao 동의 화면의 취소 | 기존 동의가 유지되어 자동 통과했으므로 이번 release 실기기에서는 미검수. 이전 debug 실기기와 이번 취소 회귀의 증거를 구분 |
| release Kakao 세션의 실제 만료 후 cold start | 16분 이상 force-stop 뒤 비밀번호/카카오 재인증 없이 같은 QA 회원으로 자동 복구. 기존 refresh 소비와 같은 family의 successor 발급 확인 |
| release 오프라인 로그아웃 → 온라인 cold start | 단말은 로그인 화면을 유지. 서버 세션 폐기와 구분한 결과는 다음 항목에 기록 |

### 오프라인 로그아웃의 서버 세션 폐기 제한

단말의 로그아웃과 온라인 재시작은 통과했다. 다만 오프라인 로그아웃 직전 rotation된 서버 refresh family는 연결 복구 후에도 활성으로 남았다. 로컬 토큰은 삭제되어 앱이 해당 세션으로 자동 복구되지는 않았지만, 서버에서는 refresh 만료 전까지 남을 수 있다. 현재 Android signOut은 서버 logout 실패를 넘기며 연결 복구 시 해당 세션의 폐기를 재시도하는 경로가 없다. 이를 온라인 로그아웃의 즉시 서버 폐기와 동일한 보장으로 설명해서는 안 된다. 오프라인 즉시 원격 폐기가 가능하다고 요구하는 것이 아니라, 복구 후 폐기 재시도에 대한 정책/구현 보완 사항이다.

검수 후 별도 QA 회원 12822로 정상 API 로그인하고 `/api/auth/logout/all`을 실행해 시험에서 남긴 family와 cleanup용 family를 정리했다. 최종 전체 테이블 집계의 활성·미소비·미만료 refresh token은 **0건**이다. 기존 root 및 다른 회원의 세션을 정리하지 않았다.

실기기는 최종 cold start에서도 로그아웃 상태이며 Wi-Fi/모바일 데이터 설정을 검수 전 값으로 복구했다. R8 release QA 앱은 기기에 유지했다.

## 확인된 잔여 결함

1. **ID 로그인 오류 문구:** ID 경로에서도 “이메일 또는 비밀번호가 올바르지 않습니다”가 표시된다. 실제 선택한 ID/email 경로에 맞춰 수정해야 한다.
2. **회원가입의 서버 비밀번호 정책 누락:** 전화 인증·필수 동의를 완료한 요청에서 한 글자 비밀번호가 가입 201 및 로그인 200으로 허용된다. Android UI의 8자/영문·숫자·특수문자 검증만으로 서버 정책을 보장할 수 없다.
3. **소셜 가입 취소의 서버 폐기 경로 없음:** 취소를 서버에 전달하는 구현이 없고 continuation에 제공자 credential이 5분 TTL 동안 남는다. 이 재현에서는 서비스 refresh 세션은 생성되지 않았다. 재시도 가능한 실패와 사용자가 취소한 상황을 구분해 처리해야 한다.
4. **가입 완료 후 세션 발급 실패 안내 부족:** 회원·소셜 연결은 commit됐지만 세션 발급이 실패하면 일반 500/LOGIN_FAILED만 반환한다. 동일 가입 재전송은 소비된 전화 인증권 때문에 실패하고 새로운 제공자 로그인은 같은 회원으로 복구된다. 가입 완료 상태와 재로그인 안내를 제공해야 한다.
5. **가입 후 필수 기록 실패의 복구 누락:** 회원 생성 뒤 필수 동의 저장 또는 전화 인증권 소비에 DB 오류를 주입해도 가입 201과 이후 로그인 200이 반환된다. 오류를 제거한 뒤 로그인해도 동의 기록 누락, 인증권 미소비 및 회원 소유권 정보 누락이 복구되지 않는다. 회원 생성과 해당 기록 저장을 같은 transaction에 넣거나 복구를 보장하는 재시도 기록을 남겨야 한다. 사전 전화 인증·동의 요청 자체를 생략한 사례나 운영에서 발생한 장애로 주장하지 않는다.

공통 서버 2–4의 기존 조사와 원인은 [공통 서버 잔여 인증 결함](auth-server-remaining-defects-2026-10-09.md)에 있다. 이 보고서와 다른 세션의 원본 작업 파일은 변경하지 않았다.

## 운영 탈퇴 완료 확인

요청 15·16·22는 processing/database_erased다. 각 요청의 backups/external_data/historical_files는 complete이고 other_identifiers만 SMS 기록 5건의 보관 대기다. UTC 저장값 `2026-10-09 19:03:02`, 한국시간 예상 `2026-10-10 04:03:02`를 확인했다. 오래된 회원 12814·12816·12821은 DB에 없고 새 QA 회원 12822의 회원/phone claim/LOCAL_USERNAME·KAKAO와 root 12813의 권한/LOCAL_USERNAME은 유지된다.

12:31 KST 최종 읽기 전용 확인에서도 동일한 대기 상태다. 실제 운영의 최종 completed 및 COMPLETED_AT은 아직 검증하지 않았다. 실제 보관 기한을 단축하거나 완료 값을 직접 수정하지 않았다. 로컬 실제 MariaDB에서는 cleanup 실패 → 재시도 → SMS 제거 → worker 최종 completed와 새 회원 보호까지 통과했다. SMS cleanup은 정기결제 job과 별도로 session cleanup job에 연결되어 있다. 예상 시각은 cleanup/worker 실패나 지연이 있으면 늦어질 수 있다.

현재 Computer Use는 Chrome 상태 조회와 새 창 요청에서 `cgWindowNotFound`를 반환해 관리자 화면의 추가 확인을 수행하지 못했다. 운영 DB는 기존 SSH 연결의 인증 agent를 사용해 읽기 전용으로 확인했다.

## 증거

원시 화면에는 연락처가 포함될 수 있어 공개 문서에 첨부하지 않는다. `build/auth-nonpayment-qa-20261009/`에 테스트 로그·요약, APK provenance, 민감값을 조회하지 않는 `snapshot.py` 및 전후 상태, 실제 만료 대기 시각, 관찰 검사 결과가 있다. UI 증거는 기존 private 폴더 `build/auth-device-qa-20261009/`에 저장했다. 비밀번호/OTP/access/refresh/제공자 credential은 보고서에 넣지 않았다.
