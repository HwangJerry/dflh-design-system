# Android 인증 결함 보완 · 2026-10-10

## 범위와 상태

> 후속 상태(2026-10-11): 아래 배포·실기기 미완료 문구는 10월10일 종료 시점 기록이다. 승인된 서버 후보를 운영에 배포했고 갤럭시 검수를 진행 중이다. 현재 결과는 [10월11일 실기기 검수](android-auth-device-remediation-2026-10-11.md)를 따른다. 초기 SessionRestore 계측2의 저장소 격리는 추가 점검에서 입증되지 않아 격리 증거에서 제외했고, applicationContext/UUID 격리를 보완한 테스트로 재검수한다.

수정 전 [목표 검수](android-auth-objective-verdict-2026-10-10.md)에서 확인한 결함 01–04를 보완했다. Android와 공통 소셜 인증 서버가 대상이다. 초기 거절뿐 아니라 continuation 이후 최종409의 복구·정리 경계까지 포함했다. iOS 실기기·정기 결제는 이번 결과에 포함하지 않는다.

네 결함의 코드 수정, 자동 회귀, 전체 Android 빌드 및 격리 Android 런타임 계측을 완료했다. 사용자는 갤럭시를 지금 연결할 수 없다고 답변했다. 수정 APK를 갤럭시에 설치하거나 최신 실제 카카오 가입·승인·재연결 검수를 완료한 것으로 집계하지 않는다. 운영 서버 배포와 앱 배포도 아직 수행하지 않았다.

## 변경

| 결함 | 보완 | 보존한 동작 |
|---|---|---|
| 01 · 늦은 로그인 응답의 원격 세션 정리 유실 | 폐기할 응답의 원래 access/refresh/logout proof를 암호화된 정리 큐에 저장하고 application scope에서 정리한다. 실패하면 재연결·재시작 시 기존 제한 기한 안에 재시도한다. | 새로 로그인한 회원의 세션·기기 토큰·화면을 건드리지 않는다. 기존 명시적 로그아웃은 atomic clear를 유지한다. |
| 02 · 해제된 소셜 계정이 가입 마지막 단계에서 실패 | 제공자 검증 직후 canonical 소유권을 확인한다. REVOKED 계정은 가입 continuation 생성 전에 403 SOCIAL_ACCOUNT_RELINK_REQUIRED와 기존 로그인 방법을 통한 재연결 안내를 반환한다. 발급된 continuation 이후 소유권이 생기는 최종 409도 복구 방법을 안내하고 Android가 원래 continuation을 정리하여 로그인 화면으로 돌아간다. | 기존 소셜 로그인, 본인 계정의 명시적 재연결, 소유권 삭제 후 신규 가입은 유지한다. 탈퇴/정지/고아 identity를 차단한다. 새 migration은 없다. |
| 03 · 탈퇴 확인창 취소 버튼 접근 문제 | 확인창을 완전히 펼치고 가용 높이 안에서 내용이 스크롤되도록 한다. 기존 navigation inset 처리를 유지한다. | 취소하면 안내로 돌아가며 탈퇴 요청·로컬 로그아웃을 하지 않는다. |
| 04 · 잘못된 현재 비밀번호 401의 불필요 갱신 | 정확한 WRONG_PASSWORD 코드일 때 bearer refresh와 비밀번호 변경 재요청을 생략한다. 원래 오류·입력·세션을 유지한다. | 실제 UNAUTHORIZED와 refresh 거부는 기존 갱신·세션 종료 정책을 유지한다. |

소셜 안내는 "기존 로그인 방법으로 로그인한 뒤 계정 설정에서 같은 소셜 계정을 다시 연결해주세요."다. ID/PW 외의 로그인 방법만 보유한 Apple·카카오 회원도 고려했다. 기존 Android 오류 표시 경로가 이 안내를 표시하며 신규 가입 폼이나 세션을 만들지 않는 계약을 추가 검증했다.

## 검증 근거

- 01 수정 전 실제 HTTP 회귀는 정상 대조 1개 통과, 정리 큐를 요구하는 3개 실패였다. 수정 후 관련 6 suite 41개가 통과했다. 폐기 응답 7개·정리 큐 10개·기존 세션 generation/오프라인/로컬 우선 로그아웃·04 회귀가 포함된 부분집합이다.
- 04 수정 전 신규 5개 중 정상 세션 만료 대조 2개 통과, 비밀번호 오류 3개 실패였다. 수정 후 5개 모두 통과했다. refresh가 성공·통신 실패·거부로 설정된 경우에도 잘못된 현재 비밀번호는 변경 요청 1회, refresh 0회, 세션 유지다.
- 02 최종 서버 unit leaf 34개 및 실제 HTTP+격리 MariaDB leaf 12개 통과. 전체 service/repository/handler unit은 leaf 1,216개 통과, 기존 43개 skip이다. 최종 공통 문구 및 가입 최종409를 보완한 뒤 관련 unit/HTTP를 다시 통과했다. continuation 이후 ACTIVE/REVOKED 소유권이 생겨도 반복409에서 회원·identity·전화 claim·동의·세션이 남지 않고 전화 인증 grant가 소모되지 않으며 continuation 취소가 가능했다. 기본15초 DDL setup 시간 초과는 환경 실패로 보존하고, 제품/schema/assertion을 유지한 격리 복제의 하네스 DDL timeout만90초로 늘려 재검증했다. Linux amd64 정적 artifact와 격리 실행 release preflight도 통과했다.
- 02 Android는 실제 AuthApi/HTTP client/repository를 연결한 합성 응답 회귀를 추가했다. flat403과 structured rejection 안내 후 기존 ID 로그인 복구, 최종409의 continuation 취소·새 로그인 보존·오프라인 정리 재시도·message 누락 복구를 다룬다. 운영 계정·제공자 credential을 사용하지 않는다. 초기거절 대조2개 통과/최종충돌 신규4개 실패 RED를 확인했고, 수정 후 관련5 suite41개(신규6개 포함)가 통과했다.
- 03 최종 동일 Compose harness에서 수정 전 일반 세로 대조 1개 통과, 큰 글자·짧은 가로의 scroll ancestor 부재 2개 실패였다. 수정 후 3개 모두 통과했다. Robolectric touch 전달 한계는 semantic 취소와 분리했으며 실제 touch 성공으로 집계하지 않는다. Compose 단위 검증은 일반 세로·큰 글자·짧은 가로 화면을 다룬다. 실제 Android 계측은 dialog window와 시스템 navigation inset을 사용해 두 버튼 전체 경계 및 실제 취소 touch를 확인한다. 단위와 실제 touch 결과는 구분해서 기록한다.

최종 통합 결과:

| 검증 | 결과 |
|---|---|
| Android 전체 단위 | 98 suite / **709개 통과**, 실패·오류·skip 0 |
| debug / debug 계측 / release APK | assemble 3종 성공 |
| release 설정 및 lint | validatePlayRelease / lintVitalRelease 성공 |
| 실제 release 카카오 R8 계약 | minified checkAccessToken의 Call&lt;AccessTokenInfo&gt; 유지 PASS |
| Android API35 계측 · 탈퇴 화면 | 기존7개 통과, 신규2개 환경 복구 후 재실행 통과 |
| Android API35 계측 · 암호화 세션 복원 | 실제 Keystore/disk + 오프라인 복원/재시도/새 repository 복원/로그아웃 **2개 통과** |
| runtime / 최종 APK 일치 | 계측한 debug·계측 APK의 SHA가 최종 빌드 artifact와 동일 |
| source / artifact 일치 | Android main source manifest 및 서버 source manifest의 모든 file hash와 현재 source 일치 |

위 부분집합과 전체 검사를 합산하지 않는다. API35 런타임의 고유 검수는 총11개이며 갤럭시 Android10 검수로 집계하지 않는다. 최초 신규2 계측 실패는 격리 AVD SystemUI 응답 없음 창이 focused window를 가져간 환경 문제였다. 초기 실패·window focus·screenshot 근거를 보존했다. 시스템 환경 복구 후 제품/테스트 helper를 바꾸지 않고 같은 focused-dialog 및 nonzero navigation inset 검사를 다시 통과했다. 일반/글자2배 모두 취소 버튼 전체 경계가 실제 시스템 navigation 영역 위에 있고 실제 touch 후 Guide·탈퇴 요청0·로그아웃false를 확인했다. 일반 글꼴의 dialog screenshot은 시각 근거로 확인했다. 큰 글자 screenshot은 uiAutomation이 Guide buffer를 캡처하여 시각 근거에서 제외했으며, 큰 글자의 결과는 동일 계측에서 통과한 실제 window focus/inset/bounds/touch assertion에 근거한다.

최종 release 후보 APK SHA256: `fb7687fe85a41fa29edd13685254243917d6153705966c9892e621d2d09d2b3e`. 버전1.3.3이며 운영 서버 origin을 사용하는 QA 후보로 빌드했다. 배포하거나 갤럭시에 설치한 기록은 아니다. 빌드 상세와 debug/계측/mapping SHA는 android-build-summary.json에 기록했다.

## 남은 실제 검수

1. 갤럭시 재연결 후 같은 서명으로 수정 APK를 업데이트하고 일반/큰 글자에서 탈퇴 확인창의 버튼 경계·실제 터치·취소 요청 0회를 검수한다.
2. 승인된 QA 회원으로 잘못된 현재 비밀번호가 원래 안내를 유지하며 refresh/재요청을 발생시키지 않는지 확인한다.
3. 서버 후보 배포 후 Android 실제 카카오 로그인·해제·조기 재연결 안내·기존 로그인·본인 재연결·신규 가입과 승인 후 재로그인을 확인한다. 마지막 가입은 기존 QA 요청 32의 관리자 처리 및 전화 소유권 정리에 따라 진행한다.
4. 기존 탈퇴 요청의 최종 completed는 정상 SMS 보관 기한 이후 확인한다. database_erased와 completed를 구분한다. 기한/상태를 강제로 바꾸지 않는다.
5. 제공자 SDK 캐시 정리 정책과 실제 푸시 미전달 등 기존 추가 확인 범위는 네 결함의 코드 수정으로 검수 완료 처리하지 않는다.

원래 root/iOS 계정과 운영 SMS 설정을 이번 수정에서 변경하지 않았다. 운영 배포·migration·DB 쓰기·commit은 수행하지 않았다. 비공개 QA 비밀번호·인증 코드·접수증 확인번호를 보고서에 포함하지 않는다.

## 파일과 artifact

- Android: SessionRepository.kt, LogoutRetryOutbox.kt, DflhApiClient.kt, AccountDeletionScreen.kt 및 관련 테스트/설계 문서.
- [서버 상세 결과](android-social-relink-remediation-2026-10-10.md).
- 빌드·RED/GREEN 로그·XML·APK·서버 후보와 SHA256 메타데이터: build/android-auth-remediation-20261010/.
- 신규 APK는 이전 실기기 검수 APK와 구분한다. 수정 APK 실기기 검수가 없으면 수정 전 APK의 성공 기록을 새 APK 결과로 사용하지 않는다.

최종 서버 후보 SHA256: `c3ba6b246216b09879a5b50822d7619bf3e44271899f184cb1913a3862a79d4a`. 운영에 적용된 SHA가 아니다. 이전 운영 binary의 rollback 기대 SHA는 서버 후보 메타데이터에 기록했으며 실제 배포 시 다시 확인해야 한다.

## 공통 서버 변경의 iOS 정적 호환성

서버 error envelope를 기존 iOS APIClient가 code/message로 해석해 로그인 화면에 전달하고, 403에서 refresh를 시도하지 않는 구조를 확인했다. 정상 Apple authenticated 응답·세션 저장 경로는 그대로이며 실패 시 새 staged Apple identifier를 discard한다. iOS 파일 변경·테스트 실행·기기 조작은 없었고 실제 iOS 기기/SDK/UI 검수 결과를 의미하지 않는다. 근거는 Sources/App의 APIClient.swift, HTTP.swift, AppState.swift, LoginView.swift, AuthRepository.swift, AppleLoginAdapter.swift, SocialLoginCoordinator.swift다.

격리 QA 에뮬레이터는 계측 및 증거 회수 후 종료했다. 기존 AVD·갤럭시·iOS 데이터를 삭제하지 않았다. Android/backend 공백 검사도 통과했다.

[일반 글꼴 탈퇴 확인창 시각 근거](../../build/android-auth-remediation-20261010/emulator-v6-evidence/android-v6-confirm-cancel-safe.png) · [계측 상세 기록](../../build/android-auth-remediation-20261010/03-sheet-layout-remediation.md)
