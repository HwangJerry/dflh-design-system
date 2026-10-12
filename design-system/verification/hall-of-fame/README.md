# 명예의 전당 · 빈 현판 · 2026-10-12

Figma HOF D 시안의 금액 구간별 현판을 iOS와 Android 기부 탭에 구현했다.
이전 중앙 하트와 `2026년 명예의 전당을 준비중입니다.` 문구를 대체한다.
후원자 이름과 소속은 완전히 비워두며, 예시 인명·로딩 막대·기부자 수를 표시하지 않는다.

- [Figma · HOF D1 현판](https://www.figma.com/design/6XaX36E3p7uGWo0WMNYzX1/?node-id=79-5330)
- [사용자가 확인해 준 Figma D1–D4 시안](figma-plaques.png)
- [iOS 밝음](ios-plaques-light.png), [iOS 어두움](ios-plaques-dark.png), [마지막 현판](ios-plaques-scrolled.png)
- [Android 밝음](android-plaques-light-360x640.png), [Android 어두움](android-plaques-dark-360x640.png), [마지막 현판](android-plaques-scrolled-360x640.png)

구간은 `5,000만원 이상`, `1,000만원 이상`, `500만원 이상`, `300만원 이상`,
`100만원 이상` 순서다. 한 구간당 한 개의 현판을 표시한다. 각 현판은 280pt/dp 높이,
24pt/dp 간격, 20pt/dp 좌우 여백을 사용한다. 아이보리/차콜 바탕, 얇은 테두리,
금빛 제목과 양옆의 선은 `hallPlaque*` 공통 토큰으로 구현했다.

현판 영역만 수동 스크롤되며 양 끝의 48/56pt/dp 페이드는 공통 배경으로 이어진다.
콘텐츠 여백으로 첫 구간과 마지막 구간도 페이드 밖에서 읽을 수 있다.
알림, 기존 기부 CTA와 앱 내비게이션은 기존 공통 컴포넌트를 사용한다.
상단 감사 문구는 사용자의 후속 요청으로 삭제했으며 헤더 아래에 현판 영역을 바로 배치한다.
기부 CTA는 내비게이션 위에 고정한다. 현판은 접근성 도구에 구간과 `빈 현판`을 함께 읽는다.

기부 요약·개인 기부 데이터를 요청하지 않는다. 실제 후원자 데이터 연결과 자동 아래 방향
흐름·마지막→처음 순환은 데이터 준비 후 연결한다. 현재 빈 현판은 수동 스크롤만 제공한다.

## 검증

- iOS Simulator Debug `xcodebuild build`: 통과.
- iOS 밝음/어두움: Codex iPhone 15, iOS 26.0, 실제 앱의 기부 fixture 캡처.
- `npm run verify-design-system`: 통과.
- `npm run visual-check-ios`: 기존 4개 공통 화면의 baseline guard 통과.

- iOS `testDonationBlankPlaquesScrollWithFixedCTA`: 통과(1개 시험, 실패 0개).
  실제 현판 영역을 끝까지/처음으로 스크롤하며 기부 CTA의 위치와 터치 가능 상태를 확인했다.
- Android `:app:assembleDebug`, `:app:assembleDebugAndroidTest`: 통과.
- Android `DonationHallOfFameScreenTest`: API 36, 360×640에서 통과(1개 시험, 실패 0개).
  밝음/어두움, 마지막 현판까지 스크롤, CTA와 하단 탭 겹침 방지, 기부 시트 열기·닫기 후 복귀를 확인했다.
  첫 cold boot 시험은 시작 전에 에뮬레이터 프로세스가 종료됐으며, 환경 복구 후 재시험해 통과했다.
- iOS/Android 로컬 main에 통합 후 Debug 빌드: 통과.

Android 캡처는 실제 공통 하단 내비게이션을 사용하는 Compose 검증 호스트다.
Gradle이 시험 후 앱과 외부 파일을 제거하므로, 동일 시험을 `am instrument`로 한 번 더 실행해
통과(1개 시험, 실패 0개) 후 밝음/어두움/마지막 현판 캡처를 추출했다.
감사 문구 삭제 후 iOS와 Android UI 시험을 다시 통과했으며 모든 현판 캡처를 갱신했다.
Android 재검증 중 메모리 부족으로 시험 시작 전 종료된 실행은 에뮬레이터 메모리를 4GB로 늘린 후 정상 통과했다.
모든 이미지에서 감사 문구·이름·소속이 없고 현판·CTA가 잘리지 않음을 확인했다.

## 이전 준비중 화면 기록

`figma-preparing.png`, `ios-light.png`, `ios-dark.png`, `ios-heartbeat.mp4`,
`android-light-360x640.png`, `android-dark-360x640.png`는 이전 준비중 화면의 역사적 검증 자료다.
현재 화면은 위의 현판 캡처를 기준으로 한다. Figma 원본의 로컬 백업은
`~/Downloads/DFLH-Hall-2026-20261012.fig`에 있다.
