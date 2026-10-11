# iOS 비밀번호 오답과 인증 만료 구분 보완 — 2026-10-11

IOS-AUTH-01을 수정했고, 자동 검증과 수정 앱의 iPhone 오답·세션 보존·재시작 회귀 검수를 통과했다. 검수 후 정상 로그아웃과 원래 카카오 QA 계정 복귀도 완료했다. 이전 앱의 실패 기록은 [기존 iOS 검수 보고서](ios-auth-device-audit-2026-10-11.md)에 보존한다.

## 변경 동작

| 응답 | 처리 |
|---|---|
| 현재 비밀번호 오답: HTTP401 + `WRONG_PASSWORD` | 토큰 갱신·세션 삭제 없이 서버의 비밀번호 오류 안내를 전달한다. 변경 화면과 로그인 상태를 유지한다. |
| 실제 인증 만료: HTTP401 | 기존 토큰 갱신과 한 번의 재시도를 유지한다. 갱신 자격 증명도 만료됐다면 해당 세션을 종료한다. |
| 인증 만료 복구 후 재시도에서 비밀번호 오답 | 갱신된 세션을 유지하고 비밀번호 오류를 안내한다. |
| 알 수 없는 코드·해석 불가능한 HTTP401 | 기존 인증 복구 정책을 적용한다. |
| 이전 계정 요청의 늦은 응답 | 기존 세션 소유권 검사를 먼저 수행해 새 로그인 세션을 보존한다. |

`APIClient`에서 정확한 `WRONG_PASSWORD`만 구분하며 JSON·선택 응답·업로드의 최종 오류 처리에도 동일한 기준을 적용했다. `PasswordChangeSettingsView`는 비밀번호 오류와 실제 인증 만료를 별도 문구로 안내한다. 비밀번호 오류 문구가 비어 있으면 ‘현재 비밀번호가 올바르지 않습니다.’를 사용한다. 실제 인증 만료는 ‘인증이 만료되었습니다. 다시 로그인해 주세요.’다.

제품 변경 파일은 `Sources/App/Network/APIClient.swift`, `Sources/App/Feature/Profile/ProfileModels.swift`, `Sources/App/ProfileView.swift`다. 서버·DB·서명·앱 버전·디자인 토큰은 수정하지 않았다.

## 자동 검증

| 검증 | 결과 |
|---|---|
| 수정 전 RED: 실제 ProfileService→APIClient→SessionManager의 격리 전송 | 9개 중 오답 관련4개 실패, 대조5개 통과. 컴파일 오류 없이 기존 결함 재현 |
| 수정 후 GREEN: 전체 iOS 단위 테스트 | **731개 통과, 실패0, 건너뜀0** |
| Xcode Debug 시뮬레이터 앱 빌드 | `** BUILD SUCCEEDED **`, 오류0 |
| 실제 iPhone용 Debug 앱·검수 실행기 빌드 | 통과, 동일 서명·bundle·권한·운영 API 확인 |
| 새 네트워크 회귀 | 10개 통과: 오답 시 갱신0·세션 종료0, 갱신 서버 오프라인/만료, 갱신 후 오답, 정상 만료 복구, 실제 만료 종료, 코드/본문 경계, 늦은 응답, HTTP 상태 래퍼 |
| 새 오류 안내 계약 | 5개 통과: 서버 문구, 빈 문구 대체, 실제 인증 만료, 다른 서버 오류, 전송 실패 |
| 디자인 시스템 검증 | `npm run verify-design-system` 통과 |
| 기존 시각 회귀 근거 검사 | `npm run visual-check-ios` 통과. 이번 작업에서 새 스크린샷을 촬영하거나 기준 이미지를 변경한 것은 아님 |

자동 회귀는 `.invalid` 호스트와 격리 URLProtocol을 사용한다. 단위 테스트에서 실제 비밀번호 변경·운영 인증 요청은 수행하지 않았다. 순수 문구 테스트의 통과를 실제 화면·기기 세션 검수로 확대하지 않는다.

## 실기기 회귀

iPhone 15/iOS27.0의 같은 bundle과 서명으로 수정 앱을 업데이트했다. 설치한 빌드의 실제 Swift 코드가 연결된 `DflhSafV2Swift.debug.dylib` SHA256은 `ec90931c3312a78df0ab9a28656ff65bc409e15b34a4d169a545b89492039715`다. 원래 버전1.3.3/build1·운영 API·서명 권한은 보존했다. 앱 삭제·Keychain 초기화는 수행하지 않았다. 사전 candidate 메타데이터와 실제 설치 성공·후속 기기 실행 증거를 함께 확인했다.

| 실기기 검수 | 결과 |
|---|---|
| 기존 카카오 QA12831 승인 대기 관찰 | PASS, 1.121초 |
| 수정 앱 업데이트 후 동일 승인 대기 보존 | PASS, 2.798초 |
| 표준 대기 계정 로그아웃→승인된 Native QA12829 로그인·재시작 | PASS, 31.567초 |
| 현재 비밀번호 오답 1회→정확한 안내·입력 화면·로그인 유지→재시작 후 동일 회원 복원 | **PASS, 27.854초** |
| 검수 후 Native 현재 기기 로그아웃→원래 카카오 QA12831 복귀·재시작 | PASS, 21.818초 |

오답 제출은 UTC09:32:15/KST18:32:15 한 번이다. 기기의 실제 안내는 서버 문구 ‘현재 비밀번호가 올바르지 않습니다’와 일치했고 입력 화면은 유지됐으며 로그인 화면으로 이동하지 않았다. 실제 앱 종료·재실행 후 UTC09:32:24 같은 QA12829로 복원됐다.

서버 대조에서도 `POST /api/profile/password`401 정확히1회·`auth/refresh`0·로그아웃0이었다. 새 iPhone 세션 family 해시 `28a3ff352fc1`, 푸시 등록1, 갱신 메타정보 및 기존 비밀번호 변경 시각15:36:59가 오답 전후 동일했다. 재시작의 me200을 확인했다. 준비 단계의 다른 시각에 관측한 전역 refresh를 이 오답 요청에 귀속하지 않았다.

실제 정상 비밀번호 변경·새 회원 생성·Android 기기 조작·계정 연결 변경은 수행하지 않았다. Android 기기는 로그아웃 상태를 유지했고, 원래 개인/root의 정확한 세션4 집합도 보존됐다. 원래 개인/root 비밀번호와 기기 Keychain 토큰은 조회하지 않았다. 전체 인증 목표의 미검수 항목은 기존 보고서에 별도로 남아 있다.

최종 정리에서 Native QA12829의 현재 기기 표준 로그아웃204 및 세션/푸시0을 확인했다. 원래 카카오 QA12831은 로그인200·재시작 me200과 승인 대기 화면으로 복귀했다. 승인 대기 서비스 세션/푸시 각1은 의도된 정상 로그인 상태다. 기존 카카오 세션은 표준 로그아웃으로 종료되고 재로그인으로 새 family가 생성된 것이므로 원래 SID까지 보존됐다고 주장하지 않는다.

## 소스 반영

작업 커밋 `df4073848eb1628e74053a35fd8781f4b9a82d6a`를 `main`의 `c5976b07a13a65503ec2631caae5d350cfc4813b`에 병합하고 원격 `origin/main`에 반영했다. 병합 후 필수 Xcode 시뮬레이터 빌드도 `** BUILD SUCCEEDED **`다. 검증 당시 제품·테스트 및 project/config/권한 파일8개의 해시가 병합 후 파일과 모두 일치하며, 로컬·원격 HEAD도 동일하다. 운영 서버 배포·DB migration·App Store/TestFlight 배포는 이번 변경에 포함되지 않는다.

검수 정본은 [전체 단위 테스트 결과](../../build/ios-wrong-password-remediation-20261011/green-xcresult-summary.json), [실기기 실행 결과](../../build/ios-auth-remediation-20261011/device-qa/device-runtime-report.md), [최종 서버 대조](../../build/ios-wrong-password-remediation-20261011/server/final-server-verdict.json), [독립 검토](../../build/ios-wrong-password-remediation-20261011/audit.md), [병합 후 검증](../../build/ios-wrong-password-remediation-20261011/final-integration-result.json)에 기록했다.

실행 근거: `build/ios-wrong-password-remediation-20261011/`, 기기 실행 준비: `build/ios-auth-remediation-20261011/device-qa/`.
