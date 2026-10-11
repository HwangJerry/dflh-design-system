# Android 로컬 우선 로그아웃 실기기 검수

2026-10-10. Galaxy Note9(SM-N960N), Android 10. Android 브랜치 `fix/auth-local-first-logout-20261010`, 기준 `00b8f26`, 미커밋 수정 소스. iOS 기기는 이번 작업에서 조작하지 않았다. 정기 결제는 검수 범위에서 제외했다.

**로그아웃 지연 수정의 Android 완료 조건을 통과했다.** 운영 서버용 minified release와 같은 소스의 제어 서버용 debug APK를 구분해 검수했다. 전체 인증 기능에서 모든 가능한 결함이 없어졌다는 판정은 아니다.

## 빌드와 테스트

| 검증 | 결과 |
| --- | --- |
| 정식 Gradle `:app:testDebugUnitTest :app:assembleDebug :app:assembleRelease` | BUILD SUCCESSFUL |
| 전체 Android 단위 테스트 | 94 suite, 685개 통과, 실패·오류·건너뜀 0개 |
| 수정 전 RED / 수정 후 인증 중심 직접 JVM 실행 | RED 확인, GREEN 149개 통과 |
| 서버 인증·로그아웃·푸시 소유권 계약 | 58개 통과 |
| Minified release Kakao R8 검사 | `checkAccessToken`의 `Call<AccessTokenInfo>` 유지 |
| 실기기 `SessionRestoreDeviceTest` | 2개 통과; 실제 Keystore·암호화 저장소 및 Compose 복원 재시도 |

Release APK: 버전 1.3.3, minified, debuggable=false, API `https://daeilfoundation.or.kr`. SHA-256 `5ce15a0a9e3a411fad9ab9a62d86af1548f2291f4e92f653a6829c32af790fee`.

## 운영 서버용 수정 release 검수

QA 회원은 12827 / `AndroidLogout2610` / `AndroidLogoutQA`다. 새 QA용 임의 비밀번호를 사용했으며 기존 실제 사용/root 비밀번호를 읽지 않았다. 가입·동문 인증 신청은 빌드 준비 중 기존 설치 앱에서 수행했고, 사용자가 관리자 승인했다. 따라서 가입 신청 전체를 수정 APK로 재검수했다는 의미는 아니다. 아래 로그인·로그아웃·연동은 수정 release 앱에서 수행했다.

| 시나리오 | 확인한 결과 |
| --- | --- |
| 데이터 삭제 없는 APK 업데이트 | 기존 설치와 서명 일치, `install -r` 성공 |
| ID/PW 로그인 및 강제 종료 후 자동 로그인 | 승인된 QA 회원의 내정보 복원 |
| 승인 대기 화면의 다른 계정 로그인 | 로그인 화면 전환, 이전 서버 세션·푸시 등록 정리 |
| 내정보 로그아웃 취소 | 로그인·원래 SID·푸시 등록 유지 |
| ID/PW 정상 로그아웃 | 로그인 화면 전환, cold restart 후 로그아웃 유지 |
| ID/PW 승인 대기/승인 완료의 오프라인 로그아웃 | 오프라인 로그인 화면 전환, 강제 종료 후에도 이전 로그인 복원 없음 |
| 카카오 신규 가입 화면 진입 후 취소 | 로그인 화면 복귀, 재실행 후 로그아웃 유지; 신규 회원/서비스 세션 생성 관찰 없음 |
| ID/PW 회원에 Android 카카오 연결 | 앱의 로그인 연동에서 연결 성공, 동일 QA 회원에 ACTIVE 카카오 identity |
| 카카오 로그인 리다이렉트 | `KakaoTalk/CapriLoggedInActivity`로 이동; 관찰 구간에 `WebAuthActivity` 없음 |
| 카카오 로그인 및 자동 로그인 | 연결한 QA 회원으로 로그인, cold restart 후 내정보 복원 |
| 카카오 정상/오프라인 로그아웃 | 로그인 화면 전환, 강제 종료 후 로그아웃 유지 |
| 오프라인 → 연결 복구 | 정리 전 QA 활성 refresh 1·기기 등록 1 → 복구 후 각각 0 |
| 같은 회원의 별도 API 세션 보존 | 기기 SID만 정리되고 별도 SID·푸시 등록 유지, 별도 세션의 `auth/me` 200 |
| root 관리자 보존 | 회원 12813의 root 역할 및 기존 활성 SID 4개 유지 |

별도 API 세션은 이 QA 회원의 새 세션이며 실제 다른 기기 자체를 조작한 검수는 아니다. 해당 세션도 검수 후 `logout/deferred`의 `204 + confirmed`로 정리했다. 이전/새 SID와 기기 등록을 운영 DB의 읽기 전용 조회로 대조했다. Access/Refresh 또는 원시 기기 토큰을 결과 로그에 출력하지 않았고, 운영 SID는 해시 일부로 기록했다.

정상 로그아웃의 로그인 화면은 확인 클릭 후 약 2.19초 이내 관찰됐다. 이는 ADB/UI dump를 포함한 관찰 상한이며 실제 화면 전환 시간 자체의 측정값은 아니다.

## 제어 서버를 사용한 갤럭시 검수

동일 수정 소스의 별도 debug APK가 USB reverse를 통해 Mac의 loopback 서버에 연결했다. 합성 계정 1001·1002와 합성 JWT만 사용했다. 실제 운영 계정/서버에 지연이나 오류를 주입하지 않았다.

| 시나리오 | 결과 |
| --- | --- |
| 이전 세션의 로그아웃 응답 보류 | 서버 세션이 활성인 동안 로그인 화면 관찰: 약 2.49초 이내, UI dump 포함 |
| 응답 보류 중 강제 종료·cold restart | 서버의 원래 세션이 아직 활성인데도 로그인 화면 유지 |
| 응답 보류 해제 | 원래 세션만 종료; 앱 재시도 기록으로 정리 재실행 관찰 |
| 푸시 해제 선행 요청 제거 | `/push/device/unregister` 호출 0개 |
| 종료 증명 경로 | `/auth/logout/deferred`, 캡처한 기기 토큰 전달, 현재 Authorization 없음, refresh 호출 0개 |
| A 로그아웃 → B 로그인 → 늦은 `204 unconfirmed` | B의 화면·새 SID 유지, cold restart 후 B 복원 |
| A 로그아웃 → 같은 A의 새 로그인 → 늦은 `204 unconfirmed` | 같은 회원의 새 화면·새 SID 유지, cold restart 후 복원 |
| 테스트 종료 | 합성 세션 모두 종료 |

새 로그인은 각각 약 5.90초/5.80초에 서버에서 관찰되어 20초 HTTP timeout 전에 기존 정리 응답을 반환했다. 단순히 timeout 후 로그인한 경우로 경합을 대신하지 않았다.

첫 cold-start UI dump가 화면 준비 전에 실패해 렌더 후 재시도했고, 같은 계정 경합의 첫 실행은 제어 서버 이벤트 JSON 쓰기 중 읽기로 중단됐다. JSON 읽기 재시도를 보완한 뒤 해당 검수를 새 로그인으로 다시 수행해 통과했다. 이 두 문제는 검수 도구 문제이며 제품 인증 결함으로 집계하지 않았다.

## 종료 상태와 후속 범위

- 운영 서버용 수정 release를 다시 설치했다. 기기에서 회수한 최종 APK 해시가 위 release와 정확히 일치하고, cold restart 후 로그인 화면을 확인했다.
- QA 회원 12827은 승인 및 ID/PW·카카오 연결을 유지하되, 활성 refresh/푸시 등록은 각각 0이다. root 12813의 계정·역할·4개 활성 SID는 보존했다.
- 임시 SMS 테스트 전화번호를 원래 설정으로 복구했으며 인증 코드와 개인정보 동의 버전도 원래 값과 일치한다. 운영 backend health는 HTTP 200이다.
- Wi-Fi·모바일 데이터는 검수 전 상태로 복구했다. 테스트 APK 패키지, USB reverse, 임시 기기 helper 및 로컬 제어 서버를 정리했다.
- 새 migration·서버 제품 코드·Play 배포는 수행하지 않았다. 앱 수정은 작업 브랜치에 남아 있다.

이번에 실제 푸시 알림 전달, iOS 신규 실기기 회귀, 탈퇴 요청 24·25·26의 보존기간 이후 최종 삭제를 완료했다고 주장하지 않는다. 저장 실패·Access 만료·동시 refresh 등 일부 경계는 단위/서버 계약 검증이며 이번 갤럭시에서 모두 재현한 것은 아니다.

증거는 workspace `build/auth-local-first-logout-20261010/`에 있다: `gradle-full-access-build.log`, `gradle-test-summary.json`, `kakao-r8.log`, `apk-provenance.json`, `device-instrumentation.log`, `release-*.xml`, `kakao-*-routing.json`, `*-server-*.txt`, `fixture-held-result.json`, `fixture-race-result.json`, `fixture-same-account-race-result.json`, `final-production-account-state.txt`, `final-device-state.json`, `sms-setting-state.json`. private 파일은 QA 자격 증명/기존 설정을 포함하므로 공유 대상에서 제외한다.

관련: [구현 결과](auth-local-first-logout-implementation-2026-10-10.md), [보완 계획](auth-logout-remediation-plan-2026-10-10.md).
