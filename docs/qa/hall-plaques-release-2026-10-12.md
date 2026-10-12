# 명예의 전당 최종 심사 제출 · 2026-10-12

양쪽 앱에 이름과 소속이 없는 5개 금액 구간 현판을 구현하고, 감사 문구를 삭제했다.

| 플랫폼 | 버전 / 빌드 | 확인한 상태 |
| --- | --- | --- |
| Android | 1.3.5 / 1861012004 | alpha · IN_REVIEW |
| iOS | 1.3.5 / 202610121616 | WAITING_FOR_REVIEW · 수동 출시 |

두 플랫폼 모두 로컬 main의 검증된 소스를 Fastlane으로 빌드하고 업로드했다.
이전 현판 빌드(Android 1861012003, iOS 202610121532)는 감사 문구가 포함되어 있어 최종 빌드로 대체했다.
iOS 기부 스크린샷도 감사 문구 없는 실제 화면으로 갱신했으며 나머지 4개 스크린샷은 보존했다.

- [현판 화면과 UI 검증](../../design-system/verification/hall-of-fame/README.md)
- Android 소스: `dec17c50d39d6a09563092db1415ec069b1e5e94`
- iOS 소스: `1323c8d6c8f9218992733ab40632acd72d1bcc8a`
- iOS 심사 ID: `f2df9ef1-4feb-4341-9765-6cd7000f9625`
- 로컬 증빙: `build/hall-no-gratitude-release-20261012/`의 배포 로그, API 응답, 스크린샷, 서명 검사 및 아티팩트 해시.

공개 출시 완료를 의미하지 않는다. Android는 alpha 심사 중이며 iOS는 심사 대기 중이다.
