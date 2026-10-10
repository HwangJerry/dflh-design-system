# Android 인증 수정 실기기 QA — 2026-10-09

Samsung Galaxy Note9(SM-N960N), Android 10에서 수정 앱으로 실제 회원가입·로그인·로그아웃·연동·탈퇴를 검수했다. **Android 수정 경로는 아래 범위에서 통과했지만, 운영 서버의 재연결 및 탈퇴 최종 완료 결함은 남아 있다.** iOS는 사용자의 요청대로 재개하지 않았다.

이 보고서는 운영 배포 전 검수 결과다. 이후 사용자가 승인한 운영 migration·서버/관리자 배포와 재연결 재검수는 [운영 배포 보고서](auth-production-rollout-2026-10-09.md)에 기록했다.

## 검수 앱과 환경

- Android 소스: `6bf4c61`, `fix/auth-session-generation-20261009`.
- 운영 API: `https://daeilfoundation.or.kr`. 서버/관리자 수정 `a1a6f63` 및 migration 083·084는 운영 미반영.
- 사용자가 승인한 뒤 기존 Play 앱을 삭제하고 수정 APK를 설치했다. 기존 설치 APK 4개는 private 증거 폴더에 백업했다. 삭제 전 앱은 로그아웃 상태였다.
- 검수 APK: `build/auth-device-qa-20261009/app-fix-upload-signed.apk`. debug APK를 로컬 release/upload 인증서로 다시 서명한 버전이다. SHA-256: `f02344a0f12abbcc11ae737f9d459973a7b146b7b11ca28132a532581b71a56f`.
- Play 배포 서명, 기본 debug 서명, upload 서명이 서로 다르다. 기본 debug APK는 Talk로 이동했지만 인증을 끝내지 못했다. 같은 APK를 upload 인증서로 서명한 뒤 실제 인증이 성공했다. 잘못된 key hash의 SDK 오류 원문까지 확보한 것은 아니므로 정확한 실패 코드는 확정하지 않는다.
- 실제 Android Kakao 계정과 실제 수신 SMS를 사용했다. 요청 이후 대일외고장학회 인증 문자만 읽고 코드를 직접 입력했다. 테스트 전화번호/코드 우회는 추가하지 않았다. 새 ID/PW QA 계정에는 별도 생성한 비밀번호를 사용했다. 비밀번호·인증코드·토큰·실제 연락처는 보고서에 넣지 않는다.
- Android 회원만 관리자 페이지에서 개별 승인·탈퇴 처리했다. 기존 root `jerryhwang018`(12813)과 iOS 계정에는 이 검수로 변경을 하지 않았다.

## 실제 UI 검수 결과

| 경로 | 결과와 확인 내용 |
| --- | --- |
| Kakao 앱 우선 인증 | 통과. 실제 Talk 인증 Activity가 열렸고 동의 이후 앱으로 돌아왔다. 웹 우선 이동은 재현되지 않았다. |
| 신규 Kakao 가입 | 통과. 실제 SMS 확인, 필수 앱 동의, 선택 사진 생략, 가입 신청까지 진행했다. SMS 숫자 입력만 하고 인증확인을 누르지 않으면 다음 단계가 차단된다. |
| 가입 대기/승인 | 통과. 대기 회원의 cold start는 제한 화면을 유지했다. 관리자 개별 승인 후 cold start는 커뮤니티로 자동 로그인했다. Kakao 회원 12821, ID/PW 회원 12822 모두 확인했다. |
| 로그인에서 Kakao 동의 취소 | 통과. 신규 동의 화면의 하단 취소와 시스템 Back 모두 로그인 화면으로 돌아왔다. Activity 추적에서 웹 fallback이 없었고 오류 안내·인증 세션도 남지 않았다. 재시작 후에도 로그아웃 상태였다. |
| ID/PW 신규 가입 | 통과. 실제 SMS 확인 및 가입 신청/승인을 거쳐 자동 로그인했다. 기존 삭제 대상이 남아 있을 때 동일 전화번호는 차단됐고, 기존 회원의 DB 삭제 이후에는 재가입할 수 있었다. |
| ID/PW 로그인 | 통과. 입력 ID가 QA fixture와 일치하는지 확인한 뒤 틀린 비밀번호는 거절됐고, 새 QA 비밀번호는 로그인에 성공했다. 비밀번호 저장 제안은 거절했다. 오류 문구 결함은 아래에 별도 기록했다. |
| 오프라인 자동 로그인 | 통과. 로그인 상태에서 네트워크를 끄고 재시작하자 복원 실패/재시도 화면이 나타났다. 연결 복구 후 다시시도는 자동 로그인했다. 일시적 실패로 토큰이 사라지는 현상은 재현되지 않았다. |
| 온라인 로그아웃 | 통과. 확인창 취소는 기존 로그인을 유지했다. 실제 로그아웃과 cold start 후에는 로그인 화면이었다. 이후 실제 Kakao 재로그인도 성공했다. |
| 오프라인 로그아웃 | 통과. 복원 실패 화면에서 로그아웃한 후 연결을 복구하고 재시작해도 로그인 화면이었다. |
| ID/PW 회원의 Kakao 연결 취소 | 통과. 동의 취소는 기존 ID/PW 회원 화면으로 돌아왔고 연결 버튼이 다시 활성화됐다. 오류 안내가 없었고 재시작 후에도 ID/PW 세션은 유지됐다. |
| ID/PW 회원의 Kakao 연결/로그인 | 통과. 필수 이메일 동의 후 연결했고, 로그아웃 후 Kakao 로그인으로 같은 회원 12822와 프로필에 접근했다. 별도 회원으로 분리되지 않았다. |
| Kakao 해제 후 ID/PW 유지 | 통과. 해제 후 서버에는 LOCAL_USERNAME ACTIVE / KAKAO REVOKED가 남았다. ID/PW 로그인 및 cold start가 가능했다. Kakao만 있는 회원은 마지막 로그인 수단 해제 불가 표시를 확인했다. |
| Kakao 재연결 | **운영 실패 재현 — AUTH-QA-12.** 해제 후 재연결 시 서버에서 revoked identity INSERT와 유일성 제약 오류 1062가 발생했다. 수정 서버가 미배포 상태다. 실패 후 기존 ID/PW 세션은 재시작해도 유지됐다. |
| 탈퇴 안내/취소 | 통과. 안내·최종 확인·접수증이 처리 시작 전까지만 취소 가능하다고 일치했다. 요청 21의 실제 취소는 cancelled로 바뀌었고 자동 로그인하지 않았다. 새 Kakao 로그인으로 회원에 다시 접근했다. |
| 탈퇴 처리/최종 완료 | **일부 완료, 전체 완료 대기.** 요청 22를 Android QA 회원에 한해 검토·처리했다. Kakao revoke outbox 전달 및 회원 DB 삭제가 완료됐다. 최종 상태는 processing / database_erased / EXTERNAL_ERASURE_PENDING이다. SMS/기타 식별자 대기 관련 서버 보완이 미배포여서 전체 완료를 통과로 판정하지 않는다. |

UI/Activity 증거: `fixed-kakao-routing.json`, `kakao-consent-bottom-cancel-trace.json`, `kakao-consent-back-cancel-trace.json`, `approved-cold-start-final.xml`, `offline-cold-start.xml`, `offline-cold-start-logout.xml`, `offline-logout-online-restart.xml`, `native-approved-cold-start.xml`, `native-kakao-connect-cancelled.xml`, `native-after-connect-cancel-restart.xml`, `linked-native-kakao-login-profile.xml`, `native-wrong-password.xml`, `unlinked-native-cold-start.xml`, `native-relink-production-failed.xml`, `failed-relink-native-cold-start.xml`, `final-signed-out-cold-start.xml`. 모두 private 폴더 `build/auth-device-qa-20261009`에 있으며 일부 화면에 회원 연락처가 있어 공개 문서에 이미지로 첨부하지 않는다.

## 실기기 계측 테스트

동일 Note9에서 `SessionRestoreDeviceTest`와 `AccountDeletionScreenTest`를 실행해 **9개 통과**했다. 실제 기기의 Keystore/디스크 복원 2개와 탈퇴 Compose 화면 7개다. HTTP 응답 및 화면 모델은 fixture이며 운영 요청을 실행하는 계측 테스트는 아니다. 로그는 `physical-instrumentation.log`에 있다. 이전 단위 테스트 639개 및 MariaDB 회귀 결과와 중복 합산하지 않는다.

## 남은 결함과 한계

1. **AUTH-QA-12:** 운영 Kakao 해제 후 재연결은 아직 실패한다. 실제 회원 12822의 오류 로그를 행 단위로 대조해 1062와 provider subject 중복을 확인했다. 기존 서버 수정과 신규 schema를 배포한 뒤 같은 회원에서 다시 검수해야 한다.
2. **탈퇴 최종 완료/구독 참조:** 요청 22의 `other_identifiers`는 pending이다. 기존 완료 대기·SMS 소유권 및 구독 종료 검토 수정은 실제 MariaDB에서 검증됐지만 운영 UI/worker 검수는 배포 후 필요하다. DB 삭제와 전체 탈퇴 완료를 혼동하지 않는다.
3. **새 P3 문구 결함:** 아이디 로그인에서 틀린 비밀번호를 입력하면 “이메일 또는 비밀번호가 올바르지 않습니다”라고 표시한다. 서버 `backend/internal/handler/auth_mobile_handler.go:43`가 이 문구를 반환하고 Golden fixture도 고정하고 있다. 아이디 로그인 문구와 fixture를 함께 보완해야 한다. 이번 수정에는 추가하지 않았다.
4. debug APK 검수로 release minification/R8까지 검증한 것은 아니다. 실제 액세스 토큰 만료를 기다린 refresh, 모든 callback 경합·강제 종료 시점·공급자 장애를 실기기에서 전수 확인했다고 주장하지 않는다. 관련 단위/서버 회귀와 수동 검수 범위는 구분한다.

## 종료 상태

최종 로그아웃 후 cold start에서 로그인 화면을 확인했다. 수정 QA 앱은 설치해 두었다. 임시 계측 APK 및 입력용 jar는 제거했다. Wi-Fi/모바일 데이터 설정은 검수 전 값으로 복원했다.

읽기 전용 최종 서버 확인: root 12813의 root 권한과 LOCAL_USERNAME ACTIVE 유지, 신규 QA 회원 12822 유지 및 LOCAL_USERNAME ACTIVE / KAKAO REVOKED, 요청 22의 기존 회원 12821 삭제 상태를 확인했다. 새 회원 12822는 서버 배포 후 재연결 및 이전 탈퇴 요청과의 재가입 소유권 보호 검수 대상으로 남겨 두었다. 새 회원을 삭제하면 해당 회귀를 검수하기 어렵다.

운영 코드·migration은 적용하지 않았다. [migration 승인 계약 실패 3건 해결안](../plans/auth-migration-approval-remediation-2026-10-09.md)의 별도 후보에서 전체 Go **1,521 pass / 78 skip / fail 0**, runner 정상·부정 통제 **9/9**를 확인했다. 다음 운영 검수는 후보 검토·승인 및 083/084 schema → 서버/관리자 배포 이후 진행한다.
