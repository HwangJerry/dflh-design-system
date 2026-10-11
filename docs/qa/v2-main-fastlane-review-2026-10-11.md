# v2 main 통합 및 Fastlane 심사 제출 결과

2026-10-11, 마지막 스토어 확인 약 19:15 KST.

사용자가 승인한 세 v2 저장소의 main 통합·push와 두 앱의 심사 제출을 완료했다.

| 저장소 | 최종 main | 원격 확인 | 작업 폴더 |
|---|---|---|---|
| dflh-saf-v2 | f559001071289c8aa840dd514b7363662cf23ec4 | origin/main 및 원격 main 일치 | clean |
| dflh-saf-v2-kotlin | c9946d956a81d835c6093ebe649c073d67c6ac90 | origin/main 및 원격 main 일치 | clean |
| dflh-saf-v2-swift | 7cf888253cee48026972b699b38f1eb139d1ab80 | origin/main 및 원격 main 일치 | clean |

| 앱 | 버전 / 빌드 | 제출 대상 | 확인한 상태 |
|---|---|---|---|
| Android | 1.3.4 / 1861011001 | Google Play alpha | RELEASE_LIFECYCLE_STATE_IN_REVIEW |
| iOS | 1.3.4 / 202610111859 | App Store | WAITING_FOR_REVIEW / MANUAL |

Android는 `fastlane android deploy`로 서명된 AAB를 업로드했다. 저장만 하고
심사를 생략하는 자동 fallback을 껐으며, exact version code가 alpha에 반영된
후 Play release lifecycle API로 실제 심사 중 상태를 확인했다. 이전 1.3.3은
alpha에 공개된 상태이며 internal 1.3.2와 빈 production 트랙도 그대로 확인했다.
상태 해석 기준은 [Google Play ReleaseSummary 공식 문서](https://developers.google.com/android-publisher/api-ref/rest/v3/applications.tracks.releases)다.

iOS는 `fastlane ios beta`로 아카이브·서명·업로드 후 빌드 처리 `VALID`,
암호화 선언 `false`를 확인했다. Fastlane Precheck를 통과한 뒤 Deliver로
정확한 빌드를 제출했으며, 버전·빌드·심사 제출 관계를 다시 조회했다.
심사 제출 ID는 `44eedd68-5e5e-41a9-a4cf-086e08091f4b`다.
기존 설명, 한국어 iPhone 스크린샷 5개와 심사 계정 정보의 이전을 확인했다.
심사 비밀번호 필드는 요청하지 않았고 변경하지 않았다. 기존 수동 출시
설정은 유지했다. 현재 공개된 iOS 버전은 1.3.3이며 1.3.4는 심사 대기다.

Android 앱 단위 테스트는 새로 실행한 709개 모두 통과했다. 서버 단위 검증은
1,216 leaf case를 통과했고, 별도 MariaDB HTTP 통합 검증 12개도 통과했다.
iOS 인증 수정 시 731개 테스트와 실기기 회귀 검증이 통과했으며 이번 통합의
Simulator 빌드는 병합 전·후와 최종 main에서 모두 통과했다. 양쪽 서명된
배포 파일의 버전·패키지·디버깅 비활성 상태를 확인했다. Android의 Kakao
축소 후 타입 서명, iOS 운영 push 및 Apple 로그인 권한도 확인했다.

배포된 Android 코드의 통합 시점은 `0ac3396`, iOS는 `8053b8a`다. 최종 main과
그 이후 차이는 각 앱의 `docs/releases/1.3.4.md` 결과 기록뿐이다.
서브에이전트가 Android 검토 파일 26개의 해시와 스토어·배포 파일의 연결을
독립 확인했다. 브랜치 및 21개 작업 폴더 감사에서도 추가 통합할 제품 코드는
발견하지 않았다. 오래된 Android release 브랜치의 패치는 main에 동일하게
반영돼 있고, iOS의 별도 Match 서명 이력은 앱 코드 저장 이력과 분리돼 있다.

서버 검증 빌드는 이미 운영에 적용된 바이너리와 일치했다. 이번에는 서버
재배포·DB migration·회원 데이터 변경을 수행하지 않았다. 일회성 관리자
생성 스크립트는 Git 외부의 비공개 QA 보관 폴더에 보존했다. 과거 QA 탐색
파일은 역사적 기록임을 명시하여 보관하고 현재 테스트 결과와 구분했다.

이 결과는 main 통합과 심사 접수 완료를 증명한다. 스토어 심사 승인·신규
버전 공개 출시나 원래 인증 QA의 모든 미검수 시나리오 완료를 뜻하지 않는다.
정기 결제 검수는 이번 배포 범위에 포함하지 않았다.

배포 산출물과 API 확인 결과는
`build/v2-release-integration-20261011/release-final-result.json`에 기록했다.

- Android AAB SHA-256: `7d5d22eebf7ea8a1e5685091099ca4bfc63a7a71d45380e49b1e35de2d203672`
- iOS IPA SHA-256: `30c0da2bcb988bbaa231a4695e5bce2add6c0fa2917e126e3208cbb54c1cfa11`
