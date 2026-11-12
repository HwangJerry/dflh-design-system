# 회원가입 UI·업로드 수정 — 2026-11-12

## 변경

- iOS·Android 최종 확인 화면의 사진 텍스트 카드를 제거하고 상단에 원형 사진과 편집 아이콘을 표시한다. 마지막 사진 선택 페이지는 유지한다.
- SMS 입력은 한 입력창과 줄바꿈 없는 인라인 확인 버튼을 사용하며 재발송은 별도 동작으로 분리한다. iOS `oneTimeCode`는 유지한다.
- 인증 성공 시 다음 단계로 이동하고 인증번호 카드를 숨긴다. 전화번호에 체크와 `인증 완료`를 표시한다. 전화번호를 실제 변경할 때만 인증 상태와 후속 단계를 무효화한다.
- 가입 제출에서 기존 회원 충돌이 발생해도 가입 continuation을 자동 취소하지 않는다. 최종 확인 화면, 입력값, 동의, SMS 인증을 유지하고 오류를 표시한다. 다른 계정의 로그인이나 서버의 본인 확인을 생략하지 않는다.
- Android 최종 확인 화면에서 사진을 변경하면 업로드 성공 시 새 사진을 제출하고 실패 시 이전 선택을 보존한다. 업로드 중 제출은 막는다.

## 확인된 원인과 운영 조치

읽기 전용 서버 로그에서 `/api/auth/social/link/photo`의 500 응답 두 건과 `permission denied`를 확인했다. 서비스 실행 계정은 `alumni-backend`인데 `/var/www/daeil-launch/uploads/profile`은 `root:root`, 0755였다. 해당 폴더의 소유자를 `alumni-backend:alumni-backend`로 변경했다. 같은 서비스 계정으로 임시 파일 생성·삭제에 성공했다(`PROFILE_WRITE_OK`). 실제 회원 사진이나 계정은 변경하지 않았다.

최종 가입 POST의 409는 로그의 `social link failed / ownership confirmation required`와 일치했다. 기존 앱은 이 응답을 받으면 continuation을 자동 취소하고 가입 화면을 닫았다. iOS AppState·Android SessionRepository에서 이 자동 취소를 제거했다.

배포 파일 복사 도구 `deploy/launch_assets.py`는 가져온 사진 파일의 소유자만 변경하고 중간 폴더는 root 소유로 남겼다. 중간 폴더도 실행 계정 소유로 설정하도록 한 줄을 추가했다. 이 파일은 작업 시작 시부터 있던 미추적 작업 파일이므로 다른 배포 변경과 함께 임의로 커밋하지 않는다.

## 레퍼런스와 설계 선택

- [Twilio OTP input forms](https://www.twilio.com/en-us/blog/developers/best-practices/otp-input-forms-html): 하나의 자동완성 가능한 입력창과 재시도·재발송 경로.
- [Twilio resend retry guidance](https://www.twilio.com/en-us/blog/best-practices-retry-logic-sms-2fa): 재발송은 확인과 구분되는 보조 동작. 서버의 발송 제한은 유지한다.
- [Apple domain-bound SMS AutoFill](https://developer.apple.com/documentation/security/enabling-autofill-for-domain-bound-sms-codes): `oneTimeCode` 입력 속성 유지.

여섯 개 입력칸 대신 하나의 입력창을 유지하고 확인 버튼의 텍스트에 한 줄 제약을 적용했다. 성공한 인증번호는 가입 정보로 다시 편집하는 대상이 아니므로 완료 카드에서 제외했다.

## 검증

- iOS 단위 테스트 742개 통과(실제 API 대신 격리 stub).
- Android 전체 단위 테스트 720개 통과, Debug 앱 및 instrumentation 테스트 APK 빌드.
- 배포 도구 테스트 40개 통과. 새 권한 회귀 테스트는 수정 전 FAIL, 수정 후 PASS를 확인했다.
- `verify-ios-design-system`, `verify-android-design-system` 통과.
- 전체 `verify-design-system`은 기존 생성 산출물 불일치로 중단: frontend 생성 CSS와 platform manifest가 stale. 직접 통합 검사도 두 native DesignTokens 파일의 manifest hash 불일치를 보고한다. 이번 작업에서 생성 토큰은 변경하지 않았다.
- iOS 26 / iPhone 16 격리 시뮬레이터 UI 테스트 2개 통과: 원형 사진 표시·인증번호 카드 제거·제출 오류 시 최종 확인 유지, 인증 성공 후 자동 진행·동일 번호 수정 시 인증 보존·실제 번호 변경 시 재인증.
- 캡처: [최종 확인](ios-review.png), [인증번호 입력](ios-sms-code.png), [제출 오류](ios-submit-error.png), [전화번호 변경 후 재인증](ios-phone-edited.png).

운영 SMS 발송이나 실제 신규 회원 생성·가입 제출은 수행하지 않았다. 서버 계정으로 저장 가능한 것은 확인했지만 사진 선택→실제 운영 업로드의 종단 검수는 별도다. 앱 배포·스토어 업로드는 수행하지 않았다. Android 연결 기기가 없어 실제 기기 UI 검수는 수행하지 않았다.

## 승인 대기 dialog 후속 요청

회원가입의 인증 신청 성공 후, 승인 대기 회원 로그인 및 가입 재시도에 `가입 요청 완료` / `가입 요청이 정상적으로 처리되었습니다. 검토 후 승인됩니다.` / `확인` dialog를 추가했다. iOS 단위 744개와 새 시뮬레이터 dialog 테스트, Android 단위 722개 및 instrumentation APK 컴파일이 통과했다. [실제 시뮬레이터 dialog](ios-pending-dialog.png).

서버는 기존 중복 확인 응답에 승인 대기일 때만 `signupPending: true`를 추가하고, 가입 충돌 시 `SIGNUP_ALREADY_PENDING`을 반환한다. canonical ALUMNI_VERIFICATION과 ACTIVE 계정 상태를 함께 조회한다. 기존 앱 호환성을 위해 그 밖에는 기존 응답 형태를 유지한다. 실제 MariaDB/HTTP의 6가지 상태 구분, 반복 소셜 가입 무생성, 기존 가입·iOS/Android 세션 회귀가 통과했다. 개발 환경의 baseline SQL import가 15초 제한에 걸려 테스트 지원 코드의 제한만 실행 중 60초로 늘렸으며 테스트 후 원상복구했다. 제품 코드나 검증 조건은 완화하지 않았다.

서버 빌드 소스 `b5a7363`, SHA-256 `ece7f5333d3224fb29e54a92d32ab0f0fe748fde94e5612679357e6fa4966bf6`. 기존 환경·DB·라우팅을 보존하고 서버 실행 파일만 원자적으로 교체했다. 원격 실행 파일 hash 일치, systemd active, 공개 HTTPS `/api/health`의 `status: ok`를 확인했다. 기존 실행 파일은 서버에 rollback용으로 보존했다.

## Store submission — 1.3.8 (2026-11-12)

- iOS build `202611120831`: Fastlane `deliver` submitted successfully. API state `WAITING_FOR_REVIEW`, release `AFTER_APPROVAL`.
- Android code `1861112001`: Aside CLI owner Console submission accepted; production full rollout, managed publishing off. “Changes in review”, with automatic quick checks running before reviewer processing.
- A new synthetic approved member review account was created through normal registration, approved only for this purpose, and verified against production login/profile/alumni/messages/feed/hall-of-fame endpoints. No administrator role was granted. Both stores now use it; credentials remain outside Git.
- Backend binary `b5a7363` is deployed and healthy. Native sources are pushed to main; release branches were not pushed to avoid duplicate CI uploads.

Submission evidence: [Apple API state](asc-1.3.8-submission.json), [Google Play Console](play-1.3.8-submission.png).
