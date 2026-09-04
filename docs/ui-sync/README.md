# UI 동기화 가이드 (UI Sync Guide)

Swift 와 Kotlin 플랫폼 간 화면 디자인 및 기능 일관성을 유지하기 위한 프로세스

## 📚 목차

1. [개요](#개요)
2. [화면 매핑](#화면-매핑)
3. [동기화 프로세스](#동기화-프로세스)
4. [체크리스트](#체크리스트)
5. [DS 토큰 검증](#ds-토큰-검증)
6. [FAQ](#faq)

---

## 개요

### 목표
- Swift(iOS) 와 Kotlin(Android) 간 UI/UX 일관성 유지
- 디자인 시스템(DS) 토큰 준수
- 새로운 화면 구현 시 양쪽 동시 개발

### 접근법
1. **Swift를 기준**으로 설계
2. **Kotlin에서 대응 화면** 구현
3. **DS 토큰으로 일관성** 검증
4. **정기적으로 동기화** 확인

### 주요 원칙
```
"한 화면은 양쪽 플랫폼에서 동일한 사용자 경험을 제공해야 한다"

- 레이아웃은 플랫폼 관례 따르기 (Swift SwiftUI, Kotlin Compose)
- 디자인 토큰은 반드시 일치
- 기능/상태/에러 처리는 동일
```

---

## 화면 매핑

### 전체 화면 목록

| # | 화면명 | Swift 파일 | Kotlin 파일 | 상태 |
|---|--------|-----------|-----------|------|
| 1 | 로그인 | LoginView.swift | LoginScreen.kt | ❌ |
| 2 | 피드 목록 | FeedListView.swift | FeedScreen.kt | ✅ |
| 3 | 피드 상세 | FeedPostDetailView.swift | FeedScreen.kt | ✅ |
| 4 | 메시지 목록 | MessageListView.swift | MessagesScreen.kt | ✅ |
| 5 | 메시지 상세 | MessageConversationDetailView.swift | MessagesScreen.kt | ✅ |
| 6 | 프로필 | ProfileView.swift | ProfileScreen.kt | ✅ |
| 7 | 동문 검색 | AlumniSearchView.swift | AlumniScreen.kt | ✅ |
| 8 | 동문 상세 | AlumniDetailView.swift | AlumniDetailScreen.kt | ❌ |
| 9 | 기부 | DonationLinkView.swift | DonationWebSheet.kt | ✅ |

**범례**:
- ✅ 완전 동기화 (양쪽 모두 구현, DS 토큰 일치)
- ⚠️ 부분 구현 (기능은 있으나 UI 미세한 차이)
- ❌ 미구현 (한쪽이 없음)

---

## 동기화 프로세스

### Phase 1: 계획 (1시간)

새로운 화면을 구현하기 전:

```
[ ] 1. Swift의 기준 화면 분석
      - 레이아웃 구조 파악
      - 사용할 DS 토큰 식별
      - 상태/에러 케이스 정의

[ ] 2. Kotlin 구현 범위 결정
      - 필요한 파일 목록 작성
      - ViewModel/UI 분리 계획
      - 테스트 계획 수립

[ ] 3. 체크리스트 생성
      - 각 화면별 체크항목 정의
      - DS 토큰 검증 항목 추가
```

**산출물**: `docs/ui-sync/screens/[ScreenName]-plan.md`

---

### Phase 2: 개발 (N시간)

#### Swift 개발 (이미 완료된 것 기준)

```swift
// Sources/App/Feature/[Feature]/[ScreenName]View.swift

import SwiftUI

@MainActor
final class [ScreenName]ViewModel: ObservableObject {
    @Published var state: ViewState = .loading
    // ...
}

struct [ScreenName]View: View {
    @StateObject var viewModel = [ScreenName]ViewModel()
    
    var body: some View {
        VStack(spacing: DSSpace.M) {
            // DS 토큰 사용 필수
            Text("Title")
                .font(DSTextStyle.Headline1)
                .foregroundColor(DSColor.Text.primary)
            
            // 컴포넌트
            DSCard { }
            DSButton(action: {}) { }
        }
        .padding(DSSpace.L)
        .background(DSColor.Background)
    }
}
```

#### Kotlin 개발 (Kotlin 에 적용)

```kotlin
// app/src/main/kotlin/com/dflh/app/feature/[feature]/ui/[ScreenName]Screen.kt

@Composable
fun [ScreenName]Screen(
    viewModel: [ScreenName]ViewModel,
    modifier: Modifier = Modifier,
) {
    val uiState by viewModel.uiState.collectAsState()
    
    Column(
        modifier = modifier
            .fillMaxSize()
            .padding(DSSpace.L)
            .background(DSColor.Background)
        verticalArrangement = Arrangement.spacedBy(DSSpace.M)
    ) {
        // DS 토큰 사용 필수
        Text(
            text = "Title",
            style = DSTextStyle.Headline1,
            color = DSColor.Text.primary
        )
        
        // 컴포넌트
        DSCard { }
        DSButton(onClick = {}) { }
    }
}
```

**주의**: 플랫폼별 관례 따르기
- Swift: SwiftUI 문법
- Kotlin: Jetpack Compose 문법
- 하지만 레이아웃, 색상, 타이포는 **동일**

---

### Phase 3: 검증 (2시간)

#### 3.1 코드 리뷰

```
[ ] Swift 코드
    - DS 토큰만 사용 (하드코딩 없음)
    - 상태/에러 케이스 모두 처리
    - 접근성 고려

[ ] Kotlin 코드
    - DS 토큰만 사용
    - ViewModel 테스트 작성
    - Compose Preview 작성

[ ] 양쪽 비교
    - 레이아웃 일치 확인
    - 색상 일치 확인
    - 타이포 일치 확인
```

#### 3.2 UI 검증

```
[ ] 시뮬레이터/에뮬레이터에서 확인
    - 기본 상태 표시
    - 로딩 상태 표시
    - 에러 상태 표시
    
[ ] 스크린샷 비교
    - 글꼴 크기 비교
    - 여백 비교
    - 색상 비교 (색약자 고려)
    
[ ] 상호작용 검증
    - 버튼 클릭 반응
    - 입력 필드 동작
    - 스크롤 부드러움
```

#### 3.3 DS 토큰 검증

```
[ ] 색상 (DSColor)
    - 배경: DSColor.Background
    - 텍스트: DSColor.Text.primary/secondary
    - 버튼: DSColor.Primary/Secondary
    - 경계선: DSColor.Border
    
[ ] 타이포 (DSTextStyle)
    - 제목: DSTextStyle.Headline1/2/3
    - 본문: DSTextStyle.Body
    - 캡션: DSTextStyle.Caption
    
[ ] 간격 (DSSpace)
    - 패딩/마진 일치
    - 행 간격 일치
    
[ ] 컴포넌트 (DSCard, DSButton)
    - 스타일 일치
    - 크기 일치
    - 상태 표시 일치
```

---

## 체크리스트

### 화면 추가 시 체크리스트

```markdown
## [ScreenName] 화면

### Swift
- [ ] View 파일 생성: [ScreenName]View.swift
- [ ] Model 파일 생성: [ScreenName]Models.swift  
- [ ] Service/ViewModel 생성: [ScreenName]Service.swift
- [ ] DS 토큰만 사용 (하드코딩 금지)
- [ ] 모든 상태 처리 (로딩, 에러, 빈 상태)

### Kotlin
- [ ] ViewModel 생성: [ScreenName]ViewModel.kt
- [ ] Model 생성: [ScreenName]Models.kt
- [ ] Repository/API 생성: [ScreenName]Repository.kt, [ScreenName]Api.kt
- [ ] Screen 생성: [ScreenName]Screen.kt
- [ ] DS 토큰만 사용
- [ ] 모든 상태 처리

### 동기화 검증
- [ ] 레이아웃 구조 일치 (Column/Row 배치)
- [ ] 색상 일치 (DSColor)
- [ ] 타이포 일치 (DSTextStyle)
- [ ] 간격 일치 (DSSpace)
- [ ] 컴포넌트 일치 (DSCard, DSButton)
- [ ] 상태 메시지 동일
- [ ] 에러 메시지 동일

### 테스트
- [ ] Swift: UI Preview 작동
- [ ] Kotlin: Compose Preview 작동
- [ ] 실제 기기에서 시각적 일치 확인
```

---

## DS 토큰 검증

### 자동화 검증 (추후 구현)

```bash
# Kotlin 코드에서 하드코딩된 색상 검출
./gradlew checkDesignTokenCompliance

# Swift 코드에서 하드코딩된 색상 검출
swiftlint --config .swiftlint-design-system.yml
```

### 수동 검증 체크리스트

#### 색상 (DSColor)

```kotlin
// ❌ 금지
Color(0xFFFFFFFF)  // 하드코딩
Color.White        // 일반 색상

// ✅ 필수
DSColor.Background
DSColor.Text.primary
DSColor.Primary
```

#### 타이포 (DSTextStyle)

```kotlin
// ❌ 금지
fontSize = 16.sp
fontWeight = FontWeight.Bold

// ✅ 필수
style = DSTextStyle.Headline1
style = DSTextStyle.Body
```

#### 간격 (DSSpace)

```kotlin
// ❌ 금지
padding = 16.dp
spacedBy = 8.dp

// ✅ 필수
padding = DSSpace.L
spacedBy = DSSpace.S
```

---

## FAQ

### Q: Swift 수정 후 Kotlin은?
**A**: 
1. Swift 변경사항 확인
2. Kotlin 대응 파일 찾기
3. 동일한 변경 적용
4. DS 토큰 일치 확인

### Q: Kotlin만 추가된 UI는?
**A**:
1. 불가피한 경우 Kotlin만 추가
2. 이유를 `docs/ui-sync/exceptions.md`에 기록
3. 다음 버전에서 Swift에 추가 계획 수립

### Q: 레이아웃이 정확히 같을 수 없다면?
**A**:
- 플랫폼 관례 따르기 (iOS vs Android 스타일)
- **DS 토큰은 반드시 동일**
- 여백/크기는 상대적으로 일치
- 화면 캡처로 시각적 일치 확인

### Q: 스크린샷 비교는?
**A**:
1. Swift 에뮬레이터에서 캡처
2. Kotlin 에뮬레이터에서 캡처
3. 다음 항목 확인:
   - 글꼴 크기 비율
   - 여백 비율
   - 색상 (동일)
   - 컴포넌트 스타일 (동일)

---

## 관련 문서

- **화면 매핑**: `docs/ui-sync/screen-mapping.md` (자동 생성)
- **DS 가이드**: `../design-system/docs/IOS_ENGINEERING_GUIDE.md`
- **Kotlin DS**: `../design-system/docs/ANDROID_ENGINEERING_GUIDE.md`
- **아키텍처**: `app/docs/architecture/`

---

## 도구

### CLI Skill
```bash
/sync-ui-checklist              # 전체 화면 동기화 상태
/sync-ui-checklist feed         # 특정 화면만 확인
/generate-composable-from-swift # Kotlin 코드 자동 생성 (Phase 2)
```

---

**마지막 업데이트**: 2026-08-14  
**담당**: 개발팀  
**상태**: 초안 (매주 업데이트)
