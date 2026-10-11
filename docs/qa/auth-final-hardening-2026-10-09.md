# Android 인증 및 서버 잔여 결함 수정·실기기 검수

> 2026-10-10 후속 검수: Computer Use로 관리자 연결·회원 승인을 수행했고 신규 카카오 가입 성공 경로를 추가 검수했다. 요청 23과 회원 12822의 상태도 변경됐으므로 최신 상태는 [관리자 연계 후속 보고서](auth-admin-followup-2026-10-10.md)를 참고한다. 아래 내용은 최초 검수 종료 당시의 기록이다.

2026-10-09부터 10일 자정까지 수행(한국시간). 이전 [현재 결함 재조사](auth-current-defects-verification-2026-10-09.md)에서 남아 있던 ID 로그인 안내, 가입 증빙 저장의 원자성, Android 오프라인 로그아웃 재시도를 수정했다. 서버는 운영 배포했고 Android는 연결된 Samsung Note9에 수정 release APK를 업데이트 설치했다. 정기결제 검수와 iOS 기기 조작은 제외했다.

## 수정 및 반영 상태

| 항목 | 변경 | 검증·반영 |
| --- | --- | --- |
| ID 로그인 오류에 이메일 표시 | ID 입력 누락은 “아이디와 비밀번호를 입력해주세요”, 인증 실패는 “아이디 또는 비밀번호가 올바르지 않습니다”. 이메일 로그인은 이메일 안내 유지 | HTTP 회귀 검사, 운영 응답, Android 잘못된 비밀번호 로그인에서 확인 |
| 가입 후 동의 저장 실패에도 회원 생성 | 필수 동의 기록을 회원·인증 수단 생성과 같은 DB 트랜잭션에 저장 | Native·소셜 각각 실제 MariaDB INSERT 장애 시 전체 rollback, 장애 제거 후 동일 요청 재시도 성공 |
| 전화 인증권 소비·소유권 저장 실패에도 회원 생성 | 동일 트랜잭션에서 인증권의 전화번호·미소비·인증 완료·만료를 재검사하고 회원 소유권을 함께 기록 | Native·소셜 각각 UPDATE 장애와 검증 이후 만료 경쟁을 검사. 실패 시 회원·세션 생성 없음, 인증권 상태 rollback |
| 오프라인 로그아웃 뒤 서버 세션 잔존 | 종료한 세션만 암호화된 재시도 큐에 기록하고 로컬 로그인 제거. 앱 시작·복귀·네트워크 복구 시 폐기 재시도 | 실기기 오프라인 로그아웃 → 강제 종료 → 재연결·앱 시작에서 서버 활성 refresh 1 → 0 |
| 기존 Android 취소·가입 복구 변경이 설치 앱에 없음 | 이전 수정 `cbbe0fd`를 포함해 release 빌드·설치 | 실제 Kakao 가입 취소 API 204, 오프라인 취소 큐 재시도 204 확인. 가입 commit 후 세션 발급 장애 계약은 격리 HTTP/DB·Android 회귀 검사로 검증 |

가입 증빙은 서버가 준비하는 내부 데이터이며 요청 JSON으로 직접 주입할 수 없다. DB 오류를 로그로만 남기는 가입 이후 보조 쓰기를 제거했다. 별도 migration이나 기존 회원 동의 데이터의 소급 생성은 수행하지 않았다.

로그아웃 큐는 새 로그인 토큰을 읽거나 갱신하지 않고 종료한 세션의 토큰으로만 서버 폐기를 요청한다. 원래 토큰 만료 범위를 넘겨 보관하지 않는다. 401/403과 성공은 종료하고, 통신 실패·429·5xx는 재시도 대상으로 남긴다. 취소된 코루틴은 취소를 전파하면서 큐를 유지한다. 암호화 저장소 쓰기가 실패하면 해당 프로세스 메모리에서 재시도를 유지하며, 이 경우 강제 종료를 넘는 지속성까지 보장하지 않는다.

## Red → Green 및 자동 검증

운영 DB에는 오류를 주입하지 않았다. DB 장애·경쟁 검사는 disposable MariaDB와 합성 제공자·SMS 응답을 사용했다.

| 검사 | 결과 | 범위 |
| --- | --- | --- |
| 서버 RED | 의도한 회귀 실패 확인 | Native·소셜의 동의/전화 증빙 rollback 4사례 및 ID 문구 |
| Android RED | 의도한 회귀 실패 2사례 | 로컬 logout 후 원격 폐기 재시도, 이전 logout이 새 로그인을 건드리지 않는 경계 |
| 서버 전체 Go 검사 | leaf 1,458 pass / 0 fail / 93 skip | opt-in DB·통합 검사의 skip 포함 |
| 실제 HTTP/MariaDB 선택 통합 검사 | leaf 26 pass / 0 fail / 0 skip | 새 원자성·만료 경쟁 10사례, 기존 가입·취소·복구·세션·승인 경계·사진 계약 |
| 서버 race 검사 | leaf 26 pass / 0 fail / 0 skip | 선택한 저장소·서비스·handler 계약 |
| Android 전체 단위 검사 | 673 pass / 0 fail / 0 skip | 로그아웃 재시도, 앱 재시작, 만료, 통신 오류, 동시 drain, 새 로그인 보호, 가입 취소·복구 등 |
| Android 디자인 시스템 검사 | 47 pass / 0 fail / 0 skip | 전체 해당 모듈 검사 |

Go 상위 그룹과 하위 사례를 중복 합산하지 않았다. 통합·race 검사도 전체 검사와 겹치므로 하나의 총 검사 수로 합산하지 않는다. APK는 validatePlayRelease와 assembleRelease를 통과했다. Play 업로드는 수행하지 않았다.

## 수정 APK의 Android 실기기 검수

| 시나리오 | 관찰 결과 |
| --- | --- |
| 기존 QA 계정 ID/PW 잘못된 비밀번호 | 아이디 기준 오류 안내, 로그인 안 됨 |
| 기존 QA 계정 ID/PW 정상 로그인 | 기존 회원 12822로 진입 |
| 오프라인 로그아웃 후 앱 강제 종료·재연결 | 로컬 로그아웃 유지, 서버 활성 refresh 1 → 0, 네트워크 원복 |
| 카카오 로그인 리디렉션 | 카카오톡 `CapriLoggedInActivity`가 먼저 열리고 앱으로 복귀. 웹 우선 리디렉션 재현 안 됨 |
| 카카오 연동 해제 | QA 회원의 Native 로그인 수단 유지, 다음 카카오 로그인은 새 가입 화면으로 진입 |
| 온라인 소셜 가입 취소 | 로그인 화면 복귀. 운영 cancel API 204: 23:20:28 KST |
| 오프라인 소셜 가입 취소 후 강제 종료·재연결 | 가입 화면 폐기·로그아웃 상태 유지. 운영 cancel API 204: 23:21:53 KST |
| 새 Native 가입 | 실기기에서 새 회원 12823 생성, 필수 동의 1건·회원 소유 소비 인증권 1건·승인 대기 확인 |
| 비밀번호 확인 불일치 | 다음 단계 이동 차단 |
| OTP를 입력만 하고 검증하지 않음 | 다음 단계 차단·인증 확인 안내 |
| 필수 개인정보 동의 미체크 | 가입 제출 차단; 체크 후 가입 성공 |
| 새 Native 승인 대기에서 앱 재시작·ID/PW 재로그인 | 승인 대기 유지. 커뮤니티 API 403 / ALUMNI_APPROVAL_REQUIRED |
| 승인 대기 Native 회원 탈퇴 요청 | 기기에서 요청 23 접수, 계정 이용 중지·로컬 로그아웃·서버 활성 refresh 0 |
| 탈퇴 대기 전화번호로 카카오 가입 제출 | “탈퇴 처리 중인 전화번호입니다. 탈퇴 처리가 끝난 뒤 다시 가입해주세요”. 새 회원·카카오 연동·서비스 refresh 생성 없음 |
| 위 가입 실패 뒤 앱 강제 종료·재시작 | 로그인 화면으로 복귀; 로그인 세션 복원 없음 |
| 기존 QA 카카오 재연동 | Native 로그인 후 기기에서 재연결 성공 |
| 재연동 후 카카오 로그인·앱 재시작 | 동일 회원 12822 확인, 자동 로그인 유지 |
| 마지막 로그아웃 | 기기 로그인 화면, QA 회원의 활성 refresh 0 |
| 탈퇴 회원의 올바른 ID/PW 재로그인 | 일반 회원 화면 대신 탈퇴 안내. 저장된 접수증으로 요청 23 조회 성공 |
| 탈퇴 처리 현황 | “자동 탈퇴 예약 대기”, 자동 처리 예정 2026-10-16 23:37 KST. DB 일정과 일치 |

가입 실패 시 서비스 로그인 세션이 없는 것과, 재시도용 임시 가입 인증을 즉시 폐기하는 것은 구분한다. 명시적 취소는 cancel API로 정리된다. 제출 실패 후 앱 강제 종료처럼 취소 요청을 보내지 못한 경로의 임시 가입 인증은 서버의 5분 TTL에 따른다. 강제 종료 순간에 서버 인증을 즉시 폐기했다고 주장하지 않는다.

전화번호 검수에는 사용자 지시에 따라 임시 Android 테스트번호와 기존 고정 QA 코드를 사용했다. 실제 문자 전달·기기 문자 읽기 검수로 대체하지 않는다. 카카오 신규 가입의 입력·인증·실패 경계는 실제 제공자를 사용했지만, 신규 소셜 회원 생성 성공→관리자 승인→탈퇴 완료 전체 흐름을 이번 기기 검수에서 완료하지 않았다. 신규 소셜 생성 정상·DB 장애 rollback·재시도는 격리 HTTP/MariaDB에서 검증했다.

## 배포·소스·APK 식별

- 서버 branch: `fix/auth-atomic-signup-20261009`, commit `d470410a00429daaf66ad88f5249dc1639c9dbc6`.
- Android branch: `fix/auth-logout-outbox-20261009`, commit `c0490c31bb6a0d04b560b4bd22ab7cdf72115666`.
- 별도 worktree: `build/auth-final-hardening-20261009/backend`, `build/auth-final-hardening-20261009/android`. 모두 clean. 기존 다른 작업의 수정은 보존했다. 원본 작업 branch로 병합·원격 push는 수행하지 않았다.
- 서버 release: `20261009T141004Z-d470410a0042`. 실행 중 바이너리와 `/app/backend/server` SHA256: `e812ff027289832d58eb28ce0f7043d6dcca9de7cc5f3d296e54776f00e70c14`.
- 최종 앱·관리자 HTTPS `/api/health`: 각각 200. 삭제 요청/worker 활성, 전체 회원 rollout 유지. privacy retention rollout은 기존 false 유지.
- Android: Samsung Note9, Android 10, package `com.dflh.saf.v2`, versionName 1.3.3 / versionCode 1. 기존 QA 서명과 동일해 데이터 삭제 없이 `adb install -r`로 업데이트했다.
- APK: `build/auth-final-hardening-20261009/android/app/build/outputs/apk/release/app-release.apk`.
- APK SHA256: `33cbd51111f34f87eed11813eb6e9f7f384ba18bcdb264d182b2518f4f779a3d`. 마지막에 기기 설치 APK를 다시 읽어 동일 해시를 확인했다. release·R8 minified·debuggable=false·운영 API·기존 Kakao scheme 확인.

## 남은 검수와 최종 상태

1. **신규 회원 관리자 승인 후 앱 전환:** Chrome은 실행 중이고 확장·native host 설치 상태도 정상이나 Browser는 `Browser is not available: chrome`, Computer Use는 `cgWindowNotFound`를 반환했다. 사용자에게 연결된 관리자 창 활성화를 요청했고, 이미 허용된 추가 창 재연결도 시도했으나 해결되지 않았다. 이번 실행에서 관리자 승인을 수행하지 않았다. 승인 대기 접근 제한과 기존 승인 회원 로그인은 각각 검수했다.
2. **요청 23 최종 삭제:** 운영 대기 기간 7일에 따라 2026-10-16 23:37 KST 이후 worker 처리 대상이다. 회원 12823은 이용 중지 상태로 남아 있으며 최종 삭제 완료로 기록하지 않는다. 요청/세션 차단·접수증·일정 조회는 통과했다.
3. **이전 요청 15/16/22 최종 완료:** 회원 데이터는 이미 0건이고 processing/database_erased 상태다. 전화 인증 기록 5건의 보관 대기는 2026-10-10 04:03:02 KST까지다. 기한 및 cleanup/worker 실행 이후 completed와 COMPLETED_AT을 추가 확인해야 한다. 완료 표시를 강제로 변경하지 않았다.
4. **실제 SMS 전달, 신규 Kakao 가입 성공 이후 전체 흐름:** 별도 잔여 실기기 검수. 가입 commit 후 세션 발급 장애는 운영 장애를 만들지 않고 격리 검사로 확인했다.

임시 Android 번호 추가 설정은 원래 SMS_REVIEW_TEST_PHONES의 정확한 문자열로 복구했고 서버 재시작·health·실행 해시를 재확인했다. 기존 review 번호 2개와 QA 코드를 유지했다. 기기 Wi-Fi/mobile data는 원래 상태로 복구했다. root 회원 12813과 root 권한 1건, 기존 Android QA 회원 12822의 LOCAL_USERNAME/KAKAO ACTIVE 연동, 기존 iOS QA 데이터를 보존했다. 최종 QA 회원 12822와 탈퇴 요청 회원 12823의 활성 refresh는 0건이다.

## 근거 파일

원시 로그·집계·배포 식별은 `build/auth-final-hardening-20261009/`에 있다. 주요 파일은 `summary.json`, `server-red.jsonl`, `server-final-unit.jsonl`, `server-final-db.jsonl`, `server-race.jsonl`, `android-red.log`, `android-final.log`, `test-summary.json`, `apk-provenance.json`, `production-final.txt`, `production-final-health.json`, `physical-offline-logout-result.json`, `physical-offline-signup-cancel-result.json`, `physical-native-signup-records.txt`, `physical-native-pending-api.json`, `physical-social-failure-records.txt`, `physical-final-device.json`, `physical-final-records.txt`이다. 최종 읽기 전용 회원/세션 snapshot은 `build/auth-nonpayment-qa-20261009/hardening-final.json`이다. UI 근거는 `build/auth-device-qa-20261009/hardening-*.xml`에 있다.

자체 생성 QA 비밀번호·고정 인증코드·API 토큰 파일과 연락처가 포함된 원시 기기 자료는 비공개 로컬 근거이며 보고서·커밋에 포함하지 않는다. 사용자의 기존 비밀번호는 조회하거나 사용하지 않았다.
