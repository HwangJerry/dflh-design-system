# Android 인증 목표 실기기 재검수

2026-10-10. Galaxy Note9 SM-N960N / Android 10 / ADB serial 279b4638fc217ece. 설치된 운영 서버용 minified release 1.3.3, SHA-256 `5ce15a0a9e3a411fad9ab9a62d86af1548f2291f4e92f653a6829c32af790fee` 기준이다. 도중 작업 공간에 추가된 디자인 소스 변경을 재빌드하거나 검수한 결과가 아니다. iOS 기기는 조작하지 않았고 결제는 제외했다.

기기 조작은 이 실기기 담당 agent만 수행했다. 별도 agents는 제품 소스/테스트 및 운영 DB 읽기 전용 관측을 담당했다. 개인/root 비밀번호, 운영 Access/Refresh 토큰, 원시 provider subject를 출력하지 않았다. 실제 카카오톡 앱에 등록된 Android 계정과 생성한 QA 전용 ID/PW만 사용했다.

## 이번 실기기 검수에서 통과한 항목

| 시나리오 | 실제 결과 | 주요 증거(XML, build/android-auth-goal-audit-20261010) |
| --- | --- | --- |
| ID/PW 둘 다 빈값 또는 PW 빈값 | 로그인 버튼 비활성; 서버 인증 실행 없음 | native-empty-submit, native-password-empty-submit |
| 잘못된 비밀번호 → 올바른 비밀번호 | `아이디 또는 비밀번호가 올바르지 않습니다` 표시; 이어 정상 로그인 | native-wrong-password, native-valid-login |
| 기존 ID 중복 | `이미 사용 중입니다`로 진행 차단 | native-duplicate-id |
| 비밀번호 확인 불일치 | `비밀번호가 일치하지 않습니다`로 진행 차단; 수정 완료 후 정상 진행 | native-sms-start, native-correct-confirm-next |
| SMS 잘못된 인증번호 → 정답 | 불일치 안내 후 인증 완료 | social-sms-wrong-error, social-sms-correct |
| ID/PW 전체 10단계 및 필수 개인정보 동의 | 동의 전 submit 비활성; 동의 후 실제 신규 가입/로그인/동문 신청 성공 | native-final-review, native-new-submitted |
| 신규 ID/PW 가입의 서버 원자성 | 회원12829 / AndroidAudit2610A / AndroidAuthQA, LOCAL ACTIVE, 동의 accepted, 전화 소유권12829, 검증 grant 소비12829, 동문 신청 pending | server observer 보고서 |
| 로그인 상태의 오프라인 cold start | 로그아웃하지 않고 복원 실패/다시 시도 화면 | native-pending-offline-bootstrap |
| 오프라인 복원 재시도 → 재연결 | 오프라인 재시도 실패해도 기존 세션 유지; 재연결 재시도로 같은 pending회원 복원 | native-pending-offline-retry, native-pending-reconnected-retry |
| 카카오 연결 해제 | QA12827 연결 해제 성공, Native identity 유지 | unlink-confirm |
| 연결 해제된 동일 카카오 신규 가입 취소 | 가입 1/8 표시 → 오프라인 취소 경고 → 강제 종료 → cold start 로그아웃 유지 → 재연결 후 실제 cancel204 | social-unlinked-signup, social-offline-cancel, social-offline-cancel-cold, social-offline-cancel-reconnected |
| 소셜 가입 최종 실패 | 실제 8단계/SMS/동의 후409; 신규 회원·전화 소유권·인증 세션 부분 생성 없음, 전화 검증 미소비 | social-final-conflict-error, server observer 보고서 |
| 소셜 가입 최종 실패 후 취소 | 로그인 화면 복귀, cancel 처리 | social-conflict-cancel |
| 동일 소유자 카카오 재연결 | REVOKED→ACTIVE, 최초와 같은 소유권 해시; 카카오 로그인으로 동일12827 복원 | original-12827-relink, relinked-kakao-member-confirmation |
| 삭제 접수 전 안내/확인 취소 | 뒤로/돌아가기 가능, 신규12829 삭제 접수하지 않음 | native-delete-confirmation-preview, native-pending-delete-preview-cancelled |
| 탈퇴 접수 및 즉시 로그아웃 | QA12827 요청30 pending/queued, 회원AAA·서비스 refresh/푸시0 | original-12827-delete-requested |
| 탈퇴 접수 후 cold start 및 재로그인 차단 | 카카오 로그인403, 탈퇴 안내; 접수증이 기기에 보관됨 | original-delete-receipt-cold, original-delete-relogin-block, original-delete-saved-selector |
| 접수증 조회 및 탈퇴 취소 | 요청30 조회200→취소200; cancelled·회원BBB 복구, 이전 세션 재활성화 없음 | original-delete-request30-status, original-delete-cancel-success |
| 탈퇴 취소 후 재로그인 | 실제 카카오로 같은12827 로그인 성공 | original-delete-cancel-relogin |
| 취소 이후 재접수 | 회원12827 요청31 pending/queued, 로그아웃 및 세션0 | original-12827-delete-request2 |
| 신규 승인 완료 회원 복원 | 사용자 관리자 승인 후12829 정상 프로필 및 cold 자동 로그인 | native-12829-approved, native-12829-approved-cold |
| 비밀번호 변경 잘못된 현재값 | 오류 표시, 로그인 유지; credential 변경 없음 | native-password-change-wrong-current-error |
| 비밀번호 변경 성공 | 생성 QA 현재값으로 변경 성공; 같은 세션가족/푸시 유지 | native-password-change-success, native-password-changed-profile |
| 변경 후 기존/새 비밀번호 회귀 | 로그아웃 후 기존값 거부401, 새 값 로그인200·동일12829 프로필 | native-old-password-rejected, native-changed-password-login-success |
| 서버에서 전체 세션 무효화 후 기기 cold start | 별도 QA세션의 표준 logout/all204 후 기기 me401/refresh401, 로그인 화면 복귀; 두번째cold도로그인 유지 | native-server-revoked-cold, native-server-revoked-second-cold |
| 무효화 뒤 정상 재로그인 | 같은 QA새 비밀번호로12829 정상 복원 | native-relogin-after-server-revoke |
| 신규 Native회원 탈퇴 접수 및 로그인 차단 |12829 요청32 pending/queued,로그아웃·서비스세션0;정확한ID/PW로도삭제안내403 | native-12829-delete-requested, native-pending-deletion-login-block |
| 실제 카카오 제공자 동의 취소 | 외부철회DELIVERED 이후실제Capri 동의화면명시취소→앱로그인화면→cold로그인유지;서비스모바일login/continuation추가0 | kakao-after-provider-erase, kakao-provider-consent-cancel, kakao-provider-consent-cancel-cold |

이전 로그아웃 검수의 ID/PW·카카오 정상/오프라인 로그아웃, cold 자동 로그인, 별도 SID/root 보존, 지연/계정 전환 경합, 실제 Keystore 테스트는 [이전 보고서](android-local-first-logout-device-2026-10-10.md)를 참고한다. 이번에 필요 없이 전체를 반복하지 않고 누락된 실기기 경계를 추가했다. 로그인 화면에는 자동 로그인 on/off 선택 항목이 없으며 저장 세션 복원 방식이다.

## 현재 실기기로 확인한 결함

1. **P3 — 연결 해제한 카카오 소유권 충돌 안내가 가입 마지막에 표시됨.** 동일 provider 재로그인이 신규 가입 폼으로 진입하고, 이름·미가입 전화번호·SMS·학적·사진 선택·필수 동의까지 진행한 뒤에야 `이미 다른 계정에 연결된 소셜 계정입니다. 다시 로그인해주세요.`가 표시된다. 같은 계정의 재로그인은 다시 가입 폼으로 들어간다. 다른 회원 소유권을 거부하는 서버 보안 정책은 정상이며, 늦은 충돌 발견과 복구 안내가 문제다. 최종 실패에서 신규 회원/연동/세션 부분 생성은 없었다.
2. **P3 — 삭제 최종 확인 sheet의 취소가 시스템 navigation bar와 겹침.** Galaxy Android10 3버튼 navigation 상태에서 `취소`가 Home 아이콘 위치에 나타나며 접근성 bounds는 `[0,0][0,0]`이다. `계정 삭제 요청` 버튼은 보이고 Back/배경으로 닫기는 가능하다. 신규12829와 기존12827 확인 sheet에서 반복 관찰했다. 증거 `delete-confirmation-preview.png`, `native-delete-confirmation-preview.xml`, `original-12827-delete-confirm-before-request.xml`. 소스에는 navigationBarsPadding이 이미 있어 원인을 단순 누락으로 단정하지 않는다.

3. **P3 — 현재 비밀번호 오답에 불필요한 refresh 재시도.** 서버401 WRONG_PASSWORD인데 운영 요청이 `profile/password401 → refresh200 → profile/password401`로 재전송됐다. 사용자 로그인은 유지하고 최종 오류는 올바르지만 비밀번호 검증 실패에 불필요한 토큰 rotation이 발생한다. refresh I/O 실패가 원래 오답 안내를 가리는 분기는 별도 agent의 합성 회귀 결과이며 실기기 I/O 장애를 재현했다고 주장하지 않는다. 세션 만료와 비밀번호 검증 오류를 구분하는 개선이 필요하다.

다른 agent의 독립 합성 회귀에서 발견한 늦은 로그인 응답의 세션 정리 누락은 [목표/소스 audit](android-auth-goal-audit-2026-10-10.md)에 별도로 기록하며, 이 기기에서 직접 재현했다고 주장하지 않는다.

## 아직 진행 중이거나 확인하지 않은 항목

- 신규12829의 동문 승인·정상 복원·비밀번호 변경·서버 무효화 복원 회귀를 완료했다. 본인 기기 탈퇴요청32는 관리자 조기 처리 전 pending이다.
- QA12827 요청31은 사용자 관리자 조기 처리 후 제공자 철회DELIVERED 및 database_erased로 진행했다(회원/identity삭제). 최종completed 영수증과12829전화소유권해제후카카오신규가입성공은아직완료하지않았다.
- 서버 logout/all에 따른 무효화 세션 복원은 실기기로 통과했다. 자연적인 장기 refresh expiry는 이번 기기 재현으로 확인하지 않았다. 이전 단위/서버 계약 검증과 구분한다.
- 초기Capri자동승인에서Back취소시도는입력대상을확정하지못했다(provider-back-cancel-routing2.json). 후속외부철회뒤실제동의화면의명시취소로제공자취소경계를확정검수했으며앞표에별도로기록했다.
- 실제 일반 SMS 배송은 검수하지 않았다. 허가된 전용 테스트 전화번호/fixed code를 사용했다.
- iOS/Apple 실기기 검수와 결제는 별도 단계다.

## 최종 기기 상태

- 로그인 landing이며 Wi-Fi·모바일 데이터 모두 원래1/1로 복원했다. `final-signed-out.xml`, `final-device-state.json`에 마지막 상태를 기록했다.
- 기기에서 다시 회수한 설치APK SHA가 위release와 정확히 일치한다(`device-installed-provenance.json`). 재설치·초기화·탈퇴 영수증 삭제는 하지 않았다.
- 접수증30(취소됨),31(회원12827),32(회원12829)을 기기에 남겼다. 최신 카카오 신규 가입 full success는 아직 완료하지 않았고 요청32의 관리자 조기 처리/전화 소유권 해제가 다음 조건이다.
- root12813의 역할·기존4세션은 서버 observer 전후 조회로 보존했다. 원래 계정/iOS/결제에는 접근하지 않았다.
- 부모/서버 observer는20:50:58KST에임시SMS테스트전화번호원복·원래인증코드/동의버전보존·backend health200·root4세션보존을확인했다. 최종보존기간후completed는 [서버 audit](android-auth-server-audit-2026-10-10.md)를참고한다. 이실기기담당은제품소스나운영서버설정을수정하지않았다.

