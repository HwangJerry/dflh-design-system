# iOS 인증 수정 후 실기기 회귀 검수 — 2026-10-10

이번 인증 수정 범위의 iOS 실기기 회귀 검수와 QA 회원 정리를 완료했다. 검수 범위에서 추가 제품 결함은 발견하지 않았다. iPhone 15(iOS 27.0)의 실제 등록된 앱 `com.daeil.dflhsafv2`를 사용했으며, Android는 다른 세션에서 담당한다. App Store 배포 승인이나 실제 APNs/SMS 전달 검수 판정은 포함하지 않는다.

초기 검수 iOS 코드는 `c29bd2f028be462cd1cbbda01cc9898282276282`이며 이전 인증 수정 `75f71cf`를 포함한다. 초기 운영 서버 기준은 `d470410a00429daaf66ad88f5249dc1639c9dbc6`, 실행 바이너리 SHA256은 `e812ff027289832d58eb28ce0f7043d6dcca9de7cc5f3d296e54776f00e70c14`였다. 아래 초기 실기기 결과는 이 조합의 근거다. 03:03 KST 최종 iOS `c0bb5c0`를 업데이트 설치했고 서버 `464ddda`·migration085를 운영에 적용해 추가 검수 중이다. 앱 삭제로 Keychain을 초기화하지 않았다.

## 확인한 결과

| 검사 | 결과와 근거 |
| --- | --- |
| 잘못된 ID/PW | 실제 서버 401과 로그인 오류 안내, 인증 화면 진입 없음 |
| 정상 ID/PW 로그인 | QA 회원 12820의 내정보를 확인 |
| 앱 강제 종료 후 자동 로그인 | 같은 QA 회원 내정보 복원 |
| 로그아웃 취소 | 기존 로그인 유지 |
| 로그아웃 확정 후 앱 재실행 | 로그인 시작 화면 유지. 위 ID/PW 전체 순서는 `NativeCycleRetry.xcresult` 49.471초 PASS |
| 짧은 비밀번호로 신규 가입 진행 | 전화번호 인증 전 다음 단계 차단. `NativeAndWeakPasswordFrameCorrected.xcresult`의 해당 검사 24.222초 PASS |
| 실제 카카오 제공자 | 설치된 카카오톡 앱으로 이동해 필수 동의만 선택, 등록된 원래 앱의 신규 가입 화면으로 복귀 |
| 카카오 신규 가입 취소 | 로그인 시작 화면 복귀 및 cold restart signed-out. `KakaoSignupCancel.xcresult` 8.883초 PASS |
| 카카오 가입 취소 서버 확인 | 해당 검수 시간의 mobile202 → prefill200 → cancel204 확인. QA12820에는 소셜 identity 추가 없음 |
| Apple 실제 인증 후 가입 취소 | Face ID 완료 후 신규 가입 화면 진입, 취소·cold restart signed-out. `AppleFreshAuthRetry.xcresult` 183.222초 PASS. 서버 challenge201 → mobile202 → prefill200 → cancel204 |
| 카카오 기존 ID/PW 회원 연결·해제·재연결 | 해제 취소는 연결 유지, 최종 확인은 실제 해제, 같은 identity 재연결과 재실행 후 연결 유지. `KakaoLinkReconnectCycle.xcresult` 64.273초 PASS |
| 연결된 카카오 재로그인 | 같은 native QA12820의 내정보 확인. 서버 link200 → DELETE200 → link200 → kakao mobile200 및 LOCAL_USERNAME·KAKAO ACTIVE 상태 대조 |
| Apple 기존 ID/PW 회원 연결 | 제공자 인증 취소 시 기존 로그인 유지, cold restart 같은 QA 회원 확인, 실제 인증 완료 후 Apple ACTIVE 저장. `AppleOwnedLinkColdStart.xcresult` 234.053초 PASS |
| Apple 해제·재연결 | 해제 취소는 연결 유지, 확정 후 해제, 같은 identity 재연결과 cold restart 연결 유지. `AppleDisconnectReconnect.xcresult` 120.270초 PASS |
| Apple 재로그인·ID/PW 보존 | 동일 QA 회원으로 Apple 로그인, cold restart 자동 로그인, 기존 생성된 QA 비밀번호로 ID/PW 재로그인. `AppleSameMemberRelogin.xcresult` 59.650초 PASS |
| 자연 만료된 access·refresh 갱신 | 이전 분리 설치 QA 앱에서 같은 QA 회원 복원. `NaturallyExpiredAccessBootstrap.xcresult` 6.326초 PASS, 실제 refresh200 → me200 및 기존 family의 보존 행1→2·유효 행1 확인. 새 로그아웃 후보의 기기 검증 근거로는 사용하지 않음 |
| 실제 오프라인 bootstrap·복구 | 기기 저장 marker에서 Wi-Fi·cellular Off와 인증 시작 화면으로 버리지 않는 연결 안내 확인. 호스트 bundle은 CoreDevice 연결 오류로 실패; 별도 `DataControlsRestoreAfterDeviceProof.xcresult` 7.855초 PASS, `OfflineDeviceProofRecovery.xcresult` 16.421초 PASS로 같은 QA 회원 자동 로그인 복구·정상 로그아웃 확인. 전체 단일 bundle PASS로 합산하지 않음 |
| 회원 탈퇴 신청·취소 | 확인 취소는 기존 인증 유지, 신청 후 cold restart signed-out 및 pending 카카오 재로그인 차단. 저장된 접수 화면으로 신청 취소 후 같은 QA 회원 ID/PW 재로그인. `OwnedWithdrawalCancellation.xcresult` 79.818초 PASS |
| 가입 폼 중복·비밀번호 불일치·중단 | 기존 QA 아이디와 전화번호로 다음 단계 진입 차단, 비밀번호 확인 불일치 차단. 가입 중 앱 종료·재실행은 signed-out 유지. `NativeSignupFormEdges.xcresult` 40.446초 PASS |
| 관리자 브라우저 연결 | Computer Use로 QA 전용 Chrome 창에서 로그인된 관리자 화면 확인. 이 단계에서는 승인·삭제 수행 없음 |

서버 요청 로그에는 기기·회원 구분이 없으므로 시간 구간만으로 모든 요청을 iOS 요청으로 귀속하지 않는다. 기기 화면·해당 QA 회원의 DB 상태를 함께 대조한다. 탈퇴 신청 검사에서 과거 분리 설치 앱의 세션도 폐기됐고 취소 후 새 ID/PW 세션을 만들었다. 각 검사 시점의 family 상태로 판정하며 단순 전체 행 수를 유효 세션 수로 해석하지 않는다.

## 새로 확인한 로그아웃 결함과 수정 검수

초기 검수 코드 `c29bd2f`는 원격 로그아웃과 push 정리를 기다린 다음 로컬 세션을 지웠다. 오프라인 또는 앱 종료로 서버 세션 종료가 실패하면 재실행 후 재시도할 영속 정보가 없다. 지연된 이전 로그아웃이 새 로그인 토큰을 지울 수 있는 순서도 결정적 회귀 테스트의 RED로 확인했다. 원인 재현은 소스와 순서를 제어한 테스트의 근거이며, 최종 수정의 실기기 결과는 아래에서 별도로 판정한다.

별도 iOS·서버 worktree에서 로컬 세션 우선 종료와 Keychain 기반 정리 대기열, 원래 refresh proof로 해당 세션 family만 폐기하는 서버 경로를 구현했다. 이전 자격으로 새 토큰을 발급하거나 지연된 전체 기기 로그아웃을 재생하지 않는 계약이다. 아래는 초기 후보에서 최종 리뷰·운영 적용까지의 이력이며, 현재 적용 상태는 다음 절에 기록한다.

첫 구현 `e4bfe315`(iOS702 단위 테스트·Simulator SDK 빌드 통과)와 `db7a773`(서버1608 일반 테스트, race61, 실제 DB HTTP32 및 동시성·업데이트 차단 HTTP 통과)에 실제 Claude Opus5.5 high CLI 읽기 전용 리뷰를 실행했다. 리뷰는 서버의 원래 세션 한정 종료를 통과시켰지만 다음 iOS 결함으로 **CHANGES_REQUIRED**를 반환했다. 이 후보는 배포·설치하지 않았으며 release에 HOLD를 기록했다.

| 우선순위 | 1차 리뷰 당시 추가 발견 | 당시 보완 방향 |
| --- | --- | --- |
| P1 | 만료된 access 토큰 또는 오프라인에서 푸시 해제가 실패하면 서버 푸시 행이 남고 기존 계정 알림 대상이 될 수 있음 | 소스와 독립 리뷰 근거. 실제 APNs 수신 검수와는 구분. 원래 세션으로 제한한 푸시 종료를 보완 중 |
| P2 | 만료된 access 토큰으로 전체 기기 로그아웃이 실패함 | 기존 refresh 경로를 제거하면서 발생한 회귀. 로컬 종료를 먼저 유지하는 원래 refresh proof 기반 일회성 전체 종료로 보완 중 |
| P3 | 느린 이전 푸시 해제가 같은 계정의 새 푸시 등록을 삭제할 수 있음 | 새 인증 토큰에는 영향 없음. 직렬화와 서버 등록의 세션 소유권을 함께 보완 중 |

추가 서버 계획은 nullable SID 소유권을 새 푸시 등록에 기록하고, 종료된 원래 SID만 정리하며 최신 등록·다른 기기는 보존하는 것이다. 기존 SID 미지정 등록을 임의로 기존 로그인에 연결하지 않는다. 해당 기존 등록은 확인된 새 등록까지 발송에서 제외하는 보수적 설계로 검토하며, 구버전 앱은 재시작 전까지 알림이 지연될 수 있다. iOS 2차 수정 `42d3b7e`는 관련77개·전체711개 테스트와 Simulator SDK 빌드를 통과했다. 서버 2차 수정 `b596966`는 전체1630개·관련race123개와 실제 DB HTTP·경합·기존 가입 회귀 검사를 통과했다. migration085가 포함된 배포 후보도 준비했으나, 당시 Opus5.5 high 재리뷰 호출이 사용량 한도로 거절돼 HOLD였다(02:50 KST 초기화 안내). 해당 시점에는 운영 적용·기기 설치를 하지 않았다.

후속 Codex 독립 리뷰는 만료 경계의 추가 P3를 확인했다. 서버의 무변경 204를 로컬 시계로 종료 성공이라고 추론할 수 있었으며, 요청 중 proof가 만료되고 같은 family의 rotation successor가 유효한 경우가 실제 DB 테스트로 재현됐다. 최종 서버 `464ddda`는 commit 이후에만 `X-Session-Logout-Result: confirmed`를 응답하고 만료·누락 proof는 `unconfirmed`를 응답한다. 최종 iOS `c0bb5c0`는 실제204와 정확한confirmed만 인정한다. 관련 RED 후 iOS90·전체716, 서버전체1639 및 실제DB 만료 경계·경합 검사가 통과했다. 추가 Codex 읽기 전용 재리뷰는 신규P0–P3 없음/PASS였으나, 요청한 Opus 재리뷰를 대신하지 않았다. 당시 운영 적용·기기 설치는 HOLD였다.

02:50:15 KST 사용량 초기화 후 실제 Opus5.5 high CLI 재리뷰를 실행했다. 434.053초 후 **PASS**, 신규 actionable P0–P3 없음으로 반환했다. 리뷰는 소스 읽기 전용이며 테스트·실기기·실제 provider 발송을 리뷰어가 실행한 것은 아니다. 배포 전 root 보존 집계와 기존 rollout, access TTL15분을 확인했다. 전체 기기 검수용 두 번째 QA 설치의 로그인도 준비했다.

## 최종 수정의 운영 적용·추가 검수

최종 서버 release는 `20261009T175846Z-464ddda7ce1c`이며 실행·디스크 바이너리 SHA256은 `55f483b80e0b5e26337a5edd13040be2a646443a897d917d4bb4ea8155a2f672`로 일치한다. 기존84개 migration 이력의 해시를 대조한 뒤085만 적용했다. 두 HTTPS 도메인의 API health200, 원래 탈퇴 요청/worker true·전체 회원 scope·retention false 복구와 root 자료 집계 보존을 확인했다. root canonical 상태 행은 원래0이며 임의로 ACTIVE를 추가하지 않았다. 파일 집계도 업로드 소유권3/게시글 연결32/고유 합집합35를 각각 기존 기준과 대조했다.

원본 iOS·서버 작업 폴더도 최종 검토 commit으로 fast-forward했다. 서버의 기존 미추적 QA 테스트는 비공개 근거 폴더에 전체 보존하고, 수정된 가입 응답 계약을 검사하는 검토된 추적 파일로 반영했다. 기존 다른 QA 문서는 보존했다.

| 최종 설치·운영 서버의 실기기 검사 | 결과와 근거 |
| --- | --- |
| ID/PW 오류·정상 로그인·자동 로그인·로그아웃 취소/확정 | `FinalCandidateNativeCycleCorrected.xcresult` 54.596초 PASS. 잘못 지정한 첫 선택자는 0개 검사 실행으로 제외 |
| 오프라인 카카오 신규 가입 취소 | 실제 카카오톡 인증 후 신규 가입 첫 화면 진입, Wi-Fi·cellular Off에서 약1.44초 내 취소, cold restart signed-out을 기기 저장 근거로 확인 |
| 가입 취소 온라인 복구·같은 회원 재연결 | `FinalOfflineSocialNetworkRestore.xcresult` 9.836초, `FinalOfflineKakaoRecoveryAndRelink.xcresult` 40.213초 PASS. cancel204 및 같은 QA 회원의 LOCAL_USERNAME·APPLE·KAKAO ACTIVE 대조 |
| 오프라인 로그아웃·재실행 | 기기 저장 근거의 전체 단계 완료, 약1.81초 내 로컬 로그아웃, cold restart·온라인 복구 signed-out. `FinalOfflineLogoutNetworkRestore.xcresult` 8.906초 PASS |
| 로그아웃 온라인 후속 검수 | `FinalOfflineLogoutOnlineRecovery.xcresult` 3.854초 PASS. 해당 family 유효 행0, 다른 QA 설치본 family 유효 행1 및 서버 deferred204 대조 |
| 자연 만료된 access로 전체 로그아웃 | `FinalExpiredAccessGlobalLogout.xcresult` 1004.583초 PASS. foreground에서 실제16분 대기, 대기 중 refresh 없음·access TTL15분 대조. 취소 시 로그인 유지, 확정 후 주 앱과 분리 QA 설치본 모두 cold restart signed-out. 서버 두 family가 같은 시각 종료되어 유효 세션2→0 |
| 전체 종료 후 같은 회원 새 로그인 보존 | `FinalPostGlobalFreshLogin.xcresult` 53.968초 PASS. 새 로그인·두 번 cold restart·20초 유지 후 같은 QA 회원 보존, 서버 새 family만 유효1 확인 |
| 탈퇴 후 재로그인 차단·처리 현황 보존 | 요청28 접수·세션0 확인, `FinalOwnedQAPendingReceipt.xcresult` 15.429초 PASS. cold restart 후 ID/PW 재로그인은 탈퇴 안내로 이동하고 기기에 보관한 처리 현황을 열 수 있음. 첫 bundle의 landing 화면 버튼 가정 실패는 별도 기록 |
| 기존 iOS QA 회원 정상 최종 삭제 | Computer Use에서 요청28·회원12820·10개 테이블46건·파일0을 검토하고 승인. Apple·카카오 해제 성공 후 worker가07:23:10 KST completed/completed. 회원·identity·전화번호·refresh·소셜 자격·동문 인증 모두0, 저장소 검증4개 complete 및 root 보존 guard 통과 |
| 탈퇴 후 같은 ID·전화번호로 새 ID/PW 가입 | `FinalFreshNativeSignup.xcresult` 50.083초 PASS. 잘못된 코드 차단·올바른 테스트 코드 인증·필수 동의 이전 제출 차단·가입 완료·cold restart 승인 대기. 새 회원12826의 LOCAL_USERNAME ACTIVE·전화번호 소유권1·동의1·동문 인증pending 대조 |
| 관리자 승인 후 자동 로그인 | Computer Use로 회원12826의 이름·번호를 확인해 승인. `FinalFreshNativeApproved.xcresult` 12.637초 PASS, 두 번 cold restart 같은 QA 회원 확인 및 서버 동문 인증approved 대조 |
| 새 회원의 ID/PW 재로그인·로그아웃 | `FinalFreshNativeLoginLogout.xcresult` 57.930초 PASS. 잘못된 비밀번호 거절, 정상 재로그인, 자동 로그인, 로그아웃 취소와 확정, 재실행 signed-out |
| 새 QA 회원의 탈퇴·처리 현황 | `FinalFreshQAWithdrawalRequest.xcresult` 43.189초 PASS. 요청29·회원12826 접수, cold restart signed-out, 재로그인 시 탈퇴 안내·처리 현황 접근 확인 |
| 마지막 QA 회원 정상 최종 삭제 | Computer Use로 요청29·회원12826·9개 테이블11건·파일0 검토 후 승인. worker가07:30:11 KST completed/completed. 회원·로그인 수단·전화번호·refresh·소셜 자격·동문 인증 모두0, 저장소4개 complete 및 root 보존 guard 통과 |
| 최종 기기 상태 | `FinalSignedOutLanding.xcresult` 3.795초 PASS, cold restart 로그인 시작 화면 유지·마이페이지 미노출 |

두 오프라인 원본 bundle은 CoreDevice 호스트 연결 오류로 실패했다. 위 판정은 같은 실행의 기기 저장 근거와 별도 온라인 복구 검사를 결합한 결과이며 원본 bundle 전체 PASS로 기록하지 않는다. 비행기 모드는 Off, Wi-Fi·cellular는 원래 On 상태로 복구했으며 VPN·핫스팟 설정은 변경하지 않았다. 이 QA 회원의 push 등록 행은0이므로 실제 APNs 알림 수신·차단을 검수했다고 주장하지 않는다. 푸시 소유권·최종 전송 직전 검사는 단위 및 실제 DB 경합 검사 근거다.

공개 HTTPS 검사는 자체 생성 QA 비밀번호로 만든 별도 세션만 사용했다. refresh rotation 후 원래 proof로 해당 family 종료204/confirmed, 종료된 successor의 me401, 새 same-account 로그인 뒤 이전 proof 재전송204/confirmed에도 새 세션 me200을 확인했다. probe에서 만든 두 세션은 마지막에 정확한 proof로 종료했다. 개인 비밀번호나 기기 Keychain 토큰은 읽지 않았고 토큰을 파일에 저장하지 않았다. 실제 access 만료 후 전체 종료 검수도 위 후속 검사로 완료했다.

## 오프라인 자동화의 제한

첫 비행기 모드 전환에서는 Xcode의 원격 프로세스 연결이 재설정됐다. 별도 복구 검사로 비행기 모드 Off·Wi-Fi On을 확인했다. 이후 별도 단계로 오프라인 준비는 통과했지만, 오프라인에서 새 테스트 실행기를 시작할 때 iOS가 개발자 인증서의 인터넷 확인을 요구해 앱 검수에 진입하지 못했다. 사용자가 네트워크를 복구했다. 이 초기 결과는 앱의 오프라인 bootstrap 실패나 통과로 기록하지 않는다. 이후 한 실행 안에서 실제 offline bootstrap의 연결 안내·인증 시작 화면 미노출은 확인했다. AirplaneOff 복구 때 호스트 CoreDevice 연결이 끊겨 전체 bundle은 실패했다. 기기에서는 같은 시간대 me200·의도된 최종 logout204까지 이어진 흔적이 있어, 다음 검사에서 로그아웃 상태였던 것을 자동 로그인 결함으로 판정하지 않았다. 무선 데이터만 끄는 방식도 cellular data Off 때 CoreDevice 연결이 끊겨 전체 검사를 완료하지 못했다. `DataControlsRestore.xcresult` 7.655초 PASS로 Wi-Fi·모바일 데이터 On / AirplaneOff 복구를 확인했다. 시스템 제어 UI의 AX 선택자 실패도 제품 결함으로 포함하지 않는다.

## 완료 판정과 보호 범위

실제 access 만료 후 전체 기기 종료와 새 로그인 보존, 신규 가입·동문 승인·회원 탈퇴 및 이번 iOS QA 회원 정리를 모두 확인했다. 요청28과29는 정상 worker에서 completed이며 SMS 보관 대기는 남지 않았다. 새 가입 때 소비한 전화 인증 기록은 회원 소유 기록으로 정상 삭제했다. 07:01 KST 사용자가 새 iOS QA용 Chrome 창에 로그인해 Computer Use로 관리자 권한을 확인했고, 이번 세션의 회원12826 승인과 요청28·29만 처리했다. 다른 세션의 Android 삭제 요청은 변경하지 않았다.

실제 SMS 전달은 포함하지 않으며 사용자 지시에 따른 기존 iOS QA 전화번호·코드를 사용했다. 서버 설정을 변경하지 않고 기존 코드와 두 기기용 번호 구성이 유지되는지 읽기 전용으로 대조했다. 실제 APNs 전달과 이미 제공자에 인계된 알림 취소는 검수 범위 밖이다. 푸시 소유권·발송 직전 재확인은 테스트 근거이며, 이미 인계된 알림을 회수한다고 주장하지 않는다.

root12813의 권한·ID/PW identity·소셜 미연결 상태를 읽기 전용 조회로 확인했다. 개인 비밀번호를 읽지 않았다. Android QA 회원과 다른 요청은 수정하지 않았다. 원시 XCResult·스크린샷·자체 생성 QA 비밀번호·코드는 비공개 `build/auth-ios-device-regression-20261010/`에 보관하고 이 보고서에 포함하지 않는다.

임시 분리 QA 앱 `com.daeil.dflhsafv2.authqa`와 UI 검사 실행기를 제거했다. 정확한 bundle ID를 지정한 기기 조회로 두 앱 부재와 원래 앱 `com.daeil.dflhsafv2` 보존을 확인했다. 검토한 최종 iOS·서버 HEAD도 유지된다. 정상 완료된 탈퇴 요청의 감사 이력과 비공개 검수 근거는 보존한다.
