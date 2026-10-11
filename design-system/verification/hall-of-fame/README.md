# 명예의 전당 준비중 · 2026-10-12

실제 후원자 데이터가 준비될 때까지 두 네이티브 앱은 공통 스타일의 준비중 상태를 표시한다.
기부 탭 이름, 알림, 기존 해피나눔 CTA를 유지한다. 버튼은 내비게이션 위에 고정한다.

- [Figma · 현재 적용 시안 5종](https://www.figma.com/design/6XaX36E3p7uGWo0WMNYzX1/?node-id=79-8950)
- [Figma 화면 비교](figma-preparing.png)
- [iOS 밝음](ios-light.png), [iOS 어두움](ios-dark.png): Codex iPhone 15, iOS 26.0, visual fixture의 기부 탭.
- [Android 밝음](android-light-360x640.png), [Android 어두움](android-dark-360x640.png): API 36, 360×640, 실제 공통 내비게이션을 사용한 Compose 검증 호스트.

Figma의 P1–P5는 현재 프로젝트 토큰을 따른다: 공통 배경, 24pt 헤더, 40pt 상태 아이콘,
16pt 상태 제목, 52pt/radius 8 CTA, 56pt 플랫 탭. 기존 D 시안은 데이터 연결 후 사용할
명예의 전당 현판 구상의 참고 자료이며 현재 앱 화면으로 배포하지 않는다.

검증:

- iOS Simulator Debug `xcodebuild build`: 통과.
- iOS 기부 상태/UX 관련 단위 테스트: 8개 통과.
- Android `:app:assembleDebug`: 통과.
- Android 기부·내비게이션 단위 테스트: 통과.
- Android `DonationPreparingScreenTest`: 360×640 에뮬레이터에서 밝음/어두움,
  CTA와 하단 탭의 겹침 방지, 해피나눔 시트 열기/닫기 후 복귀 통과.
- `npm run verify-design-system`: 통과.
- `npm run visual-check-ios`: 기존 4개 공통 화면 baseline guard 통과.
  준비중 화면은 위의 별도 시뮬레이터 캡처로 검수했다.

기부 결제를 진행하지 않았으며, 명예의 전당 순환 목록이나 후원자 데이터는 활성화하지 않았다.
