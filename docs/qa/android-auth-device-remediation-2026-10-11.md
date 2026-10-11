# Android 인증 보완 — Galaxy 실기기 검증 · 2026-10-11

## 범위와 현재 상태

전날 보완한 인증 결함 01–04를 Galaxy Note9 SM-N960N(Android10/API29)에서 검수한다. 실제 운영 API를 사용하는 수정 release APK와 격리 계측 APK의 결과를 구분한다. 정기 결제 및 iOS 실기기는 이번 범위에 포함하지 않는다. 네 보완 사항의 이번 검수 경로는 모두 통과했다. 최초 전체 인증 QA가 모두 완료됐다는 의미는 아니며, 검수 범위와 잔여 항목은 아래에 구분한다. 최종 release 복원·로그아웃·설정·접수증 보존까지 확인했다.

## 운영 서버 배포

사용자 승인 후 15:29:34 KST에 검증 후보를 기존 release lock·snapshot·install·health 절차로 운영에 반영했다. 바이너리만 교체했으며 migration·환경·Apache 설정 변경은 없다.

- 실행·디스크 SHA256: `c3ba6b246216b09879a5b50822d7619bf3e44271899f184cb1913a3862a79d4a`.
- 교체 전 실행·디스크와 롤백 백업 SHA256: `55f483b80e0b5e26337a5edd13040be2a646443a897d917d4bb4ea8155a2f672`.
- 실제 유효 환경으로 release preflight 통과. 전체 환경 digest와 requests/worker=true·retention=false·testUser=0 보존.
- 외부 앱·관리자 health 각각 HTTP200/status=ok. root 활성 refresh family4 보존.
- 롤백 파일: `/app/backend/releases/auth-remediation-20261011-c3ba6b246216/server.rollback-55f483`.

배포 근거는 build/android-auth-device-remediation-20261011/server/의 deployment-result.json, deployment-public-health.json, deployment-prepared.json, pre-deployment.txt, post-deployment.txt다.

## 실제 탈퇴 처리 상태와 QA 계정 복구

기존 QA 요청24·25·26·31은 정상 worker 처리 후 최종 completed이며, 해당 회원·identity·phone claim·consumed SMS 행이 모두0인 것을 이번 서버 조회로 확인했다. database_erased와 최종 completed를 구분했다.

QA12829(AndroidAudit2610A / AndroidAuthQA)의 요청32는 시작 전 pending/취소 가능이었다. 15:31:32 KST에 앱 접수증의 표준 취소 기능으로 cancel200을 확인했다. 서버에서 request32=cancelled, 회원BBB·동문 인증approved·LOCAL_USERNAME ACTIVE1·전화 claim1·세션0을 확인했다. 취소는 기존 세션을 되살리지 않았으며 비밀번호 변경 시각과 root family4도 그대로다. 관리자를 통한 강제 삭제나 DB 복구는 하지 않았다.

## 플랫폼 및 앱 데이터 보존 검증

Galaxy Note9 SM_N960N(Android10/API29, serial279b4638fc217ece)에서 코드 변경 없이 검수했다. 기존 release1.3.3 SHA5ce15a0a9e3a411fad9ab9a62d86af1548f2291f4e92f653a6829c32af790fee는 로그아웃 상태였다. 기존/수정 APK의 서명 certificate SHA e046275bd66c9f2822a50290037a8359aa51c6528c3f198cb5bb987f9109b6db 일치를 확인하고 uninstall/clear 없이 update-r만 사용했다.

수정 debug/test APK에서 AccountDeletionScreenTest9/9 PASS(14.565초), SessionRestoreDeviceTest2/2 PASS(3.376초). 계정 삭제 확인창은 일반 글꼴과 fontScale2 각각 실제 focused dialog의 nonzero navigation inset 및 버튼 전체 bounds를 검사하고, 실제 취소 touch 후 Guide/request0/signoutfalse를 확인했다. 초기 실제 Keystore/disk를 사용하는 세션 복원은 오프라인 보존·다시 시도·새 Repository 복원·로그아웃 후 지속적 clear를 통과했다. 모두 합성 API/fixture 테스트이며 실제 회원 탈퇴 요청을 만들지 않았다. 단, AndroidX crypto1.1.0의 applicationContext unwrap 때문에 초기 SessionRestore2의 prefs 격리는 입증되지 않았다. 초기 signed-out 상태에서의 기능2 PASS만 기록하며 격리 증거에서 제외한다. getApplicationContext 및 UUID isolation을 보완한 별도 테스트 APK로 아래5개를 다시 검증했고 모두 통과했다.

정상 글꼴 확인창 screenshot은 취소 전체가 Samsung Home/navigation 위에 표시됨을 육안 확인했다. 큰 글꼴 uiAutomation screenshot은 Guide buffer를 담아 dialog 시각 근거에서 제외한다; 해당 strict bounds/touch 계측 통과와 구분한다. 이후 production release APK로 update-r했고 설치된 APK SHA fb7687fe85a41fa29edd13685254243917d6153705966c9892e621d2d09d2b3e를 직접 추출해 원본 artifact와 대조했다.

기기 설정(fontScale1.1, 자동회전1/user_rotation0, Wi-Fi1/모바일데이터1)을 전후 비교하여 그대로임을 확인했다. 실제 saved receipt 목록6개가 보존된 것도 UI로 확인했다. 초기 관찰에서 최신 요청32(10/10 20:44)는 처리 전/취소 가능 화면이었다. 서버 배포를 위해 잠시 API 입력을 중단했고, health 확인 후 위 표준 취소와 QA 계정 Native 로그인을 진행했다.

근거: build/android-auth-device-remediation-20261011/platform-result.json, galaxy-sheet-instrumentation.log, galaxy-session-instrumentation.log, galaxy-v6-evidence/android-v6-confirm-cancel-safe.png, receipt-list-preserved-redacted.xml, request32-before-cancel.xml. 원본/root 비밀번호와 기기 인증 토큰은 읽지 않았으며 비밀번호·전화·이메일·소셜ID·확인번호/JWT는 UI 근거에서 마스킹했다.


## 운영 API를 통한 Native 검수

- 생성된 QA 비밀번호로 승인된12829 로그인 성공. 실제 force-stop/cold start 후 동일 AndroidAuthQA 프로필 자동복원 확인.
- 잘못된 현재 비밀번호 제출 시 화면에 “현재 비밀번호가 올바르지 않습니다.” 표시. 비밀번호 변경 요청1회/401, refresh0, logout0. 같은 활성 session family 및 push상태 보존, credential 변경시각 그대로, root family4 보존.
- 올바른 현재 비밀번호와 새 생성 비밀번호로 변경 성공 UI 확인(15:36:55 KST). 기존 활성 세션은 유지됐고, 로그아웃 후 이전 생성 비밀번호401·새 생성 비밀번호200 및 동일 QA 프로필 복원을 확인했다.

실제04 근거: server/wrong-current-password-result.json과 before/after·기간별 sanitized log. 원래/root 비밀번호는 사용하지 않고 QA에서 생성한 비밀번호만 비공개600 파일에 보관했다.


온라인 로그아웃은 로그인 화면 복귀 후 서버 deferred logout204·활성 family0·기기 push행0을 확인했다. 오프라인에서는15:42:01 KST 확인 후 로그인 화면에 도달했으며, ADB/UIAutomator 관측을 포함한 상한2.093초였다(프레임 단위 지연 측정 아님). 오프라인 중 서버 family/push1은 정리 대기 기대값이고, 실제 force-stop/cold signed-out 후15:44:27 네트워크를 원복하자15:44:28 deferred logout204, 15:44:43 family0/push0이 됐다. root family4는 유지됐다. 이는 실제 앱의 명시적 로그아웃 outbox가 프로세스 재시작·재연결을 거쳐 정리된 증거이며, 신규01 폐기된 늦은 로그인 응답 시나리오와 구분한다.


## 실제 카카오 제공자와 운영 소유권 검수

실제 Android 카카오톡 계정으로 진행했다. `com.kakao.talk/com.kakao.sdk.CapriLoggedInActivity`가 우선 실행된 것을 연속 activity 관찰로 확인했다. 웹 우선 redirect는 이번 경로에서 재현되지 않았다. 카카오톡 계정 자체를 변경하거나 로그아웃하지 않았다.

1. 승인된 Native12829에서 카카오 연결200 → 로그아웃 → 카카오 동일회원 로그인200.
2. 카카오 연결 해제200. KAKAO=REVOKED, LOCAL_USERNAME=ACTIVE, 기존 회원·승인 보존, provider credential행0 확인.
3. 로그아웃204 → 카카오 로그인403. 앱은 “기존 로그인 방법으로 로그인한 뒤 계정 설정에서 같은 소셜 계정을 다시 연결해주세요.”를 로그인 화면에 표시하고 가입 폼을 열지 않았다. 실제 force-stop/cold start도 signed-out 유지.
4. 거절 후 서버 활성family0·push0, persistent canonical/legacy continuation행0, provider credential행0, 기존 QA회원·Native·전화claim 보존. 운영 in-memory SocialLinkTokenStore의 수량은 외부 introspection이 없어 직접 관측하지 않았다. REVOKED 반환이 Put 이전에 있는 코드와 기존 HTTP+MariaDB 검증을 보조 근거로 구분한다.
5. 기존 Native로그인200 → 같은 카카오 명시적 재연결200. 같은12829의 KAKAO ACTIVE와 LOCAL ACTIVE·승인 상태 유지 확인. 카카오 재로그인200에서 같은 AndroidAuthQA 프로필 확인 후 최종 로그아웃204, 서버 활성family0·push0까지 확인했다.

제공자 subject 안전 해시 비교로 전날 Android QA12827과 오늘12829가 같은 Android 카카오 계정을 사용한 것을 확인했다. 원래 root 활성family4는 개수와 해시 집합 모두 보존했다. 증거: server/qa-provider-and-root-family-hash-comparison.json, kakao-revoked-early-rejection-window.jsonl 및 after.txt. 제공자 토큰 원문·SDK cache는 추출하지 않았다.


## Galaxy 계측과 독립 검토

| 보완 | 결과와 근거 | 검증 한계 |
|---|---|---|
| 01 폐기된 늦은 로그인 응답 정리 | 신규 Galaxy 계측 PASS. 원래 토큰으로 정리 실패 → 실제 암호화 pending queue → 저장소·repository 재구성 후 정리 성공. 새 로그인B의 토큰·상태·기기 토큰을 건드리지 않음 | 합성 HTTP이며 동일 프로세스 재구성. 실제 UI 응답 경합·이 경합 직후 OS kill까지 검증한 것은 아님 |
| 02 소셜 소유권 충돌의 안내·정리 | 운영c3+실제Talk 연결/해제/early403/Native복구/재연결/카카오재로그인 통과. 신규 계측의 늦은 최종409·취소 실패·암호화 재시도·새B 보존도 PASS | 실제 제공자 신규가입 최종409를 다시 유발한 결과가 아님. 공급자 SDK cache는 추출하지 않음 |
| 03 탈퇴 확인창 취소 접근 | Galaxy AccountDeletionScreenTest9개 PASS. 일반/2배 글꼴 strict focused dialog/inset/bounds/touch, 취소 후 요청0·로그아웃false | 큰 글꼴 screenshot은 Guide buffer라 시각 근거 제외; runtime touch/bounds assertion은 통과 |
| 04 잘못된 현재 비밀번호 | 운영 release: 변경401 1회/refresh0/logout0/세션·입력 안내 보존. 정상변경/old401/new200도 통과. 신규 계측 PASS | 정확한 서버 오류 body는 읽지 않았으며 source exact-code 분기·UI·운영 요청 수로 대조 |

수정 `AuthRemediationDeviceTest`3개와 `SessionRestoreDeviceTest`2개는 총5/5 PASS(6.697초)다. 테스트별 runner STATUS_CODE0 및 최종 OK를 root와 독립 검토 agent가 확인했다. UUID-prefixed preferences와 applicationContext wrapper에 대한 실제 접근·파일 생성 assertions가 실행됐다. 운영 preference나 Keystore alias는 삭제하지 않는다. 기존 복원2는 기본 MemoryLogoutRetryStore를 사용하므로 원격 정리 큐 지속성 증거로 집계하지 않는다. 신규3이 실제 암호화 outbox 계약을 보강한다.

고유 계측 집계는 **14개(탈퇴9+격리auth5)**다. 보완 전 격리 미입증 초기SessionRestore2를 합산하지 않는다. 테스트 APK의 stale KDoc가 기존 SessionRestore를 피하라고 안내하지만, 이번에 보완한 UUID/applicationContext version의 두 클래스만 실행했다. 이전 unsafe APK와 구분한다.

신규 테스트 APK SHA256: `90ea5269f19f61150ad92508cadcb8809228a326558358c95f6eab9ad9232e60`. 검수 debug SHA256는 기존 검증본 `2f0ec8b320073a985ff0be76fcd74e8191dd429f7c5c6e2603c50bb8bf18dd01`와 동일하다. 현재 main source186개 해시와 이전 검증 manifest 일치, debug/test certificate도 동일하다. 이번 source 변경은 격리 보완 기존 계측1파일과 신규 계측1파일이며 앱 제품 source는 변경하지 않았다.

근거: galaxy-isolated-auth-five-instrumentation.log, instrumentation-candidates.json, source-artifact-verification.json. 기존 Android709 단위 PASS·release/lint/R8 계약 결과는 [전날 보완 결과](android-auth-remediation-2026-10-10.md)에 기록됐으며 오늘 계측과 합산하지 않는다.

## 최초 전체 인증 QA의 남은 범위

- 최신 release에서 실제 카카오 신규 가입 전체 → 동문 승인 → 재로그인. 오늘은 기존 Native QA12829의 전화 소유권을 유지하며 연결·로그인·해제·재연결을 검수했다. 신규 가입 성공으로 바꿔 집계하지 않는다.
- iOS/Apple 실기기 검수. 이번 공통 서버 배포를 iOS 실기기 통과로 집계하지 않는다.
- 실제 access/refresh 만료, 가입 commit 직후 연결 손실, 처리 중/불확실 응답 경계. 합성 unit/HTTP/계측 통과와 실제 운영 재현을 구분한다.
- 제공자 SDK cache 정리 정책·실행 검증 및 로그아웃 후 실제 푸시 미전달. 서버 push행0은 확인했지만 실제 전송 검수를 완료하지 않았다.

기존 탈퇴 완료 대기와 완료 접수증UI는 잔여가 아니다. 요청31 접수증은 ‘처리 완료’, 완료일10/11 00:53, 보존항목 없음, 취소버튼 없음, 완료 후30일 조회 안내를 실제 기기에서 확인했다. 접수증6개는 보존했다.


## 최종 단말 정리

수정 production-release APK로 `install -r` 복원 후 설치 APK를 다시 추출해 SHA256 `fb7687fe85a41fa29edd13685254243917d6153705966c9892e621d2d09d2b3e`와 일치함을 확인했다. 실제 force-stop/cold start는 로그인 화면이며 접수증6개 유지, fontScale1.1·자동회전1/userRotation0·Wi-Fi1/모바일데이터1 원래 설정 유지다. 앱 삭제·데이터 초기화는 하지 않았다. Play 배포나 commit은 수행하지 않았다.

이번 QA12829는 승인된 Native+Kakao 연결 회원으로 보존하고 로그아웃했다. 새 생성 QA 비밀번호는 비공개600 fixture만 갱신했으며 전날 비밀번호를 현재값으로 사용하지 않는다. 운영 테스트 SMS allowlist2개·고정코드·privacy version은 원래값 그대로다. 원래 root 계정의 비밀번호는 읽거나 사용하지 않았고 활성family4의 해시 집합도 보존했다.

최종 단말 근거: final-device-state.json, isolated-auth-five-result.json. 실기기 조작·서버 관찰·독립 계약 검토를 각각 담당 agent로 분리했고 root가 원본 로그와 hash·후속 상태를 대조했다. 이번 통과는 실제 제공자 happy path 및 조기 거절, 세션 정리, 엄격한 실제 터치, 합성 경합 계약을 포함하며 위 미검수 범위를 대체하지 않는다.


앱 복원 후15:51:53 KST 마지막 read-only 조회도 QA12829 family0/push0·Native/Kakao ACTIVE·승인 상태, root원래4해시집합 동일, 실행/디스크c3·전체환경·SMS/code/privacy원형·앱/관리자health200이었다. 15:49:20 이후 새 auth/deletion/phone API0도 대조했다. 기존 final49 기록은 보존하고 별도 server/post-device-restoration-summary.json 및 post-device-restoration-*에 추가 증거를 저장했다.
