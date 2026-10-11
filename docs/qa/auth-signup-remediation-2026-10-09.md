# 인증 잔여 결함 수정·재검수 — 2026-10-09

현재 단계 완료: 공통 서버와 두 앱의 잔여 결함을 RED → GREEN → refactor로 수정하고 시뮬레이터·에뮬레이터에서 재검수했다. Claude Opus 5.5 high CLI 최종 리뷰는 PASS이며 추가 수정이 필요한 P0–P3를 찾지 못했다. 공통 서버 운영 배포와 iOS 원격 main 통합도 완료했다. 실제 Kakao·Apple·SMS 및 실기기 통합 검수는 사용자 지시에 따라 다음 기기 연결 때 진행한다.

## 수정 결과

- 소셜 가입 취소: 멱등 `POST /api/auth/social/link/cancel`을 추가했다. 취소된 continuation의 제공자 credential·프로필을 지우고 재사용을 거부한다. 처리 중에는 409 `TOKEN_IN_PROGRESS`, 가입 완료에는 409 `SIGNUP_ALREADY_COMPLETED`를 반환한다. 제출·취소는 같은 상태 전이를 사용한다. 이는 가입을 이어가기 위한 임시 인증 정보의 처리다.
- 신규 비밀번호: 회원 저장·전화 인증 grant 소비 전에 변경·재설정과 동일한 정책을 검사한다. Go·Swift·Kotlin의 18개 golden case를 일치시켰다. 기존 짧은 비밀번호 로그인과 기존 해시 전환은 유지한다.
- 가입 commit 후 세션 발급 실패: `SIGNUP_COMPLETED_LOGIN_REQUIRED`로 가입 완료·재로그인 필요를 구분한다. 소비한 토큰 재전송으로 회원·세션을 중복 생성하지 않는다. commit 이후 오류에서도 전화 소유권·동의 처리를 수행한다.
- 두 앱: 완료된 가입 정보를 정리하고 같은 제공자의 새 인증을 안내한다. 제출 중 뒤로가기·가입 취소를 막고 로그아웃·계정 변경 이후 늦은 응답은 새 인증 상태를 바꾸지 못한다. 오프라인 취소는 토큰·원래 만료 시각만 암호화 저장하고 API origin별로 격리한다. 보안 저장 실패에는 제한된 메모리 재시도를 사용하고 만료를 연장하지 않는다.
- 불확실한 제출 결과: 취소 응답에 따라 완료·처리 중·확인 필요를 구분한다. 타임아웃 이후 204만으로 회원이 생성되지 않았다고 안내하지 않는다. iOS는 같은 토큰 재시도에서도 불확실성과 HTTP 상태·오류 코드를 유지한다. Android는 공유 요청 실행 코루틴만 취소되더라도 살아 있는 대기 코루틴의 정리를 계속한다.
- 임시 사진: 실제 추적된 업로드만 후보로 삼는다. 정확한 파일 PK 잠금 → 기존 참조 확인 → DB DELETE → COMMIT 성공 → 디스크 삭제 순서다. 공식 가입·프로필 업로드 연결도 같은 잠금에 참여한다. DELETE·commit 실패 또는 불확실한 commit에서는 파일을 지우지 않는다. 성공한 commit이 발급한 제한된 삭제 권한으로만 디스크 삭제를 재시도한다.
- 웹 로그인: 실패할 수 있는 로그인 기록·최근 로그인 DB 갱신을 쿠키 설정 전에 수행한다. 파일 정리 차단 이유에는 개인정보 없는 지표·로그를 추가했다.

## RED → GREEN과 최종 검증

기존 코드에서 취소 API 부재·약한 비밀번호 통과·commit 이후 일반 로그인 실패·소모된 가입 폼 재시도 등을 실패 테스트로 재현하고 같은 계약을 통과시켰다. 독립 리뷰 지적도 별도 실패 테스트를 먼저 만들고 수정했다. 마지막 세 보완은 사진 삭제·commit 순서, iOS 재시도 불확실성 유지, Android 공유 요청 취소 처리다.

| 최종 검증 | 결과 |
|---|---|
| Go 전체 일반 테스트 | 1,568 pass / 86 opt-in skip / 0 fail |
| 수정 영역 race 검사 | 52 pass / 5 DB opt-in skip / 0 fail |
| 격리 MariaDB 파일·탈퇴 회귀 | 41 pass / 0 skip / 0 fail |
| 격리 MariaDB HTTP·가입 commit 실패·사진 검증 | 11 pass / 0 skip / 0 fail |
| iOS 단위 테스트 | 686 pass / 0 skip / 0 fail |
| iOS Simulator SDK 및 main 통합 후 build | BUILD SUCCEEDED |
| Android 앱·디자인 시스템 단위 테스트 | 665 + 47 = 712 pass / 0 skip / 0 fail |
| Android debug APK build | 성공 |
| iOS 기존 XCUI 화면 흐름 | 2 pass / 0 skip / 0 fail |
| Android 에뮬레이터 계측 | 20 unique pass / 0 skip / 0 fail |
| iOS main CI — Design Token Drift Detection | 성공 |

그룹은 서로 겹치므로 합산하지 않는다. opt-in DB 그룹은 별도 gate를 켜서 실행했다. 광범위 race 시도에서 기존 password semaphore 시간 제한 테스트가 병렬 부하로 실패했으므로 전체 race 통과로 기재하지 않는다. 전체 일반 테스트와 수정 영역 race 검사는 위 수치로 통과했다.

18-case fixture SHA256: `24a8762920aaf13dd995b15be7f95f4ec0f78794ae13b998e5dc3717ea004678`.

## 시뮬레이터·에뮬레이터 범위

화면 검수는 loopback API origin과 모의 소셜·문자 응답을 사용했다. 실제 제공자·SMS·운영 회원·연결된 실기기를 사용하지 않았다.

iOS 최종 소스 `75f71cf`에서 기존 XCUI 2건을 통과했다. ID/PW 입력 화면·뒤로가기, 모의 소셜 가입 단계·SMS 확인·수정 시 값 보존을 확인했다. 실제 ID/PW 로그인 제출이나 소셜 가입 완료를 수행한 화면 검사는 아니다. 새 복구·제출 중 화면은 기존 fixture에서 노출되지 않아 실제 렌더링 확인은 남아 있으며 상태·응답·재시도는 단위 테스트로 검증했다.

Android `c055ba7`에서 실제 에뮬레이터 Keystore/디스크 세션 복원·로그아웃 2건, 로그인·모의 가입 11건, 모의 탈퇴 7건을 통과했다. 최종 `cbbe0fd` 취소 큐 수정은 UI 변경 없이 단위 회귀로 검증했다. 20건을 최종 커밋에서 실행한 계측으로 재표기하지 않는다. 정상 최종 계측은 52.385초, startup ANR 0회였다. 최초 fresh-AVD의 ART/OkHttp startup ANR·Messages 팝업 증거는 정상 결과와 구분해 보존했다.

화면 검수용 빌드 주소는 loopback이므로 향후 실기기 설치에는 정상 API 주소로 재빌드한다. iOS main 통합 후 별도 SDK 빌드의 기본 주소 `https://daeilfoundation.or.kr`을 확인했다. 앱 배포·TestFlight 업로드는 수행하지 않았다.

## 독립 구현 리뷰

Read/Grep/Glob만 허용한 immutable 소스 packet을 Claude CLI로 검토했다. 실제 결과에서 `claude-opus-5-5`, provider `firstParty`, effort `high`를 확인했다. 비밀번호·운영 credential은 packet에 포함하지 않았다.

- [1차 리뷰](../../build/auth-server-remediation-20261009/review/implementation-review.md): CHANGES_REQUIRED, P0/P1 없음. 잠금 범위·불확실한 취소·processing 응답·소유권 오류 뒤 취소·쿠키 순서·관측 개선을 반영했다.
- [2차 리뷰](../../build/auth-server-remediation-20261009/review/round2/implementation-review.md): PASS와 추가 P3 3건. 세 건 모두 RED → GREEN으로 수정했다.
- [최종 리뷰](../../build/auth-server-remediation-20261009/review/round3/implementation-review.md): PASS, 추가 수정이 필요한 P0–P3 없음. 최종 세 플랫폼 커밋을 검토했다.

최종 packet의 VALIDATION.md 생성기가 서버 요약 JSON의 잘못된 키를 읽어 null을 표기한 증거 표시 오류가 있었다. 원본 JSON·JSONL을 독립 재계산해 위 수치와 실패 0건을 확인하고 [validation-addendum.json](../../build/auth-server-remediation-20261009/review/round3/validation-addendum.json)에 기록했다. immutable packet·제품 소스는 바꾸지 않았다. 리뷰어는 코드만 검토했고 테스트 실행의 근거는 별도 검증 로그다.

## 통합·운영 배포

| 대상 | 최종 소스 |
|---|---|
| 공통 서버 | `8fc4a65c966486639f2cfdb14e9b837383930af7` — `fix/auth-signup-terminal-20261009` |
| iOS | `75f71cfaacf0ea6f52bef4375866b62af0860a6b` — `fix/auth-signup-recovery-20261009` |
| Android | `cbbe0fdd4f3a521b895bea7a2ad9f086f0d5e449` — `fix/auth-signup-recovery-20261009` |
| iOS 원격 main merge | `c29bd2f028be462cd1cbbda01cc9898282276282` |

소스는 `build/auth-server-remediation-20261009/{backend,ios,android}` 격리 worktree에 있으며 모두 clean이다. iOS는 main merge·통합 빌드·원격 push를 완료했고 [CI](https://github.com/HwangJerry/dflh-saf-v2-swift/actions/runs/37883639904)도 성공했다. 다른 세션의 Android 원본 작업과 공통 서버 원본의 기존 작업은 덮어쓰지 않았다. Android 변경은 위 branch/worktree를 통합 근거로 전달한다.

기존 `daeil-prod` 절차로 release `20261009T042044Z-8fc4a65c9664`를 운영 배포했다. 운영 바이너리 SHA256은 `a437ca2f0f137d52078b67a66170bbfcca3fe3c6c6b7f58675db12b176b4a53e`로 최종 묶음과 일치한다. 서비스 active, 앱·관리자 HTTPS `/api/health` 각각 200, 알려지지 않은 테스트 토큰의 취소 요청 2회 모두 204·빈 응답을 확인했다. 실제 회원 생성·소셜 인증·SMS는 실행하지 않았다.

백업은 `/app/releases/20261009T042044Z-8fc4a65c9664/backup`에 있다. 배포 result.json의 `DEPLOYED_ERASURE_PAUSED`는 교체 직후 상태이며 별도 rollout을 성공시켜 기존 설정을 복원했다. 최종 실제 설정은 requests/worker=true, test_user=0, retention=false다. root 회원 12813·root 권한 1개, LOCAL_USERNAME ACTIVE 1개, ACTIVE 소셜 연결 0개와 migration history 84개는 배포 전후 동일하다. migration이 없으며 DB 스키마 변경을 실행하지 않았다.

## 다음 실기기 검수·구현 범위

- 카카오톡 설치 상태의 앱 우선 이동·취소·복귀·실제 provider 재인증
- iOS Apple 신규 가입·취소·재로그인, fresh challenge·Face ID
- 실제 SMS·승인 후 자동 로그인·세션 갱신·로그아웃
- 오프라인 취소 후 강제 종료·재시작·재연결 정리, 지연 응답 중 계정 변경
- 새 가입 복구·제출 중 화면 렌더링과 실제 서버 통합 흐름

서버 continuation·사진 정리 이력·디스크 재시도 권한은 메모리 기반이다. 서버 재시작·불확실한 commit·제한된 재시도 종료 이후 고아 파일이 남을 수 있다. 기존 참조와 공식 연결은 보호하지만 같은 파일 잠금에 참여하지 않는 임의의 동시 legacy/copied URL 쓰기까지 원자적으로 보호하지는 않는다. 전체 참조 읽기 비용과 직렬 정리 큐 부하는 남는다.

상세 근거: [서버](../../build/auth-server-remediation-20261009/backend/backend/docs/qa/auth-signup-terminal-remediation-20261009.md), [iOS 단위·빌드](../../build/auth-server-remediation-20261009/ios-round3-report.md), [iOS 화면](../../build/auth-server-remediation-20261009/ios-round3-simulator-ui-report.md), [Android](../../build/auth-server-remediation-20261009/android/docs/history/2026-10-09-signup-remediation.md), [Android 화면](../../build/auth-server-remediation-20261009/android-emulator-round2-report.md), [운영 smoke](../../build/auth-server-remediation-20261009/production-postdeploy-smoke.json).
