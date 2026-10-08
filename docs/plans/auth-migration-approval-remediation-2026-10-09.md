# 인증 수정 migration 승인 계약 실패 해결안 — 2026-10-09

현재 실패 3개를 재현하고, 별도 검토용 worktree에서 해결 패치를 검증했다. **운영 승인·migration 실행·서버 배포는 하지 않았다.** 기존 수정 브랜치의 승인값도 유지했다.

## 실패 원인

| 계약 테스트 | 재현된 원인 | 해결 |
| --- | --- | --- |
| `TestCanonicalIdentityCandidateRangeCheck` | 후보 manifest 44개, SQL 45개. 기존 082번 항목 누락 | 실제 082 소스 checksum을 manifest에 추가 |
| `TestCanonicalIdentityCandidatePacketMatchesCurrentSource` | 같은 manifest/source 개수 불일치 | 위 변경으로 해결 |
| `TestMigrationRunnerApprovesEveryFutureMigrationIncluding063` | 계약·환경 예시가 이전 040–081 패킷의 고정 승인 hash와 42개를 기대 | 082·083·084를 포함한 정확한 후보를 검토한 뒤 새 고정 hash와 45개로 갱신 |

082는 `2794871`에서 추가한 로그인 보안 관측 테이블이다. 083은 SMS 소비 회원 소유권 및 탈퇴 대기 메타데이터, 084는 구독 외부 종료 검토 감사 기록이다. 083은 기존 SMS의 소유자를 추정해 backfill하지 않는다. 두 신규 migration은 서버 적용 전에 필요한 additive 확장이다.

## 운영 이력 읽기 전용 대조

2026-10-09 QA에서 `_migration_history`의 82건 모두 현재 SQL 파일과 checksum이 일치했다. 078–082도 동일하다. 083·084의 이력 및 신규 스키마는 아직 없다. 이 검수에서 운영 이력을 seed하거나 checksum을 수정하지 않았다.

## 검토 가능한 패치

- worktree: `build/auth-migration-review-20261009`
- branch: `review/auth-migration-packet-20261009`, 기준 `a1a6f63`
- 변경: 후보 manifest의 082 한 줄, `.env.example`의 주석 hash, 승인 계약 테스트의 고정 hash 및 기대 개수
- 패치: [migration-candidate-review.patch](../../build/auth-device-qa-20261009/migration-candidate-review.patch)
- 후보 범위: 040–084 / **45개**
- 제안 manifest SHA-256: `ca85fbdfb58c56ce038eb0094b21a00739c6513588e4f2a343295249a632a183`

이 hash는 검토용 후보값이다. 테스트 실행에 주입한 로컬 값은 운영의 외부 승인을 대신하지 않는다. 파일이나 manifest 주석이 바뀌면 후보 hash도 다시 계산·검토해야 한다. 기존 028–039 authoritative lineage, schema contract pin 및 runner의 fail-closed 동작은 변경하지 않는다.

## 검증 결과

- 기존 수정 worktree: 해당 3개 실패 재현.
- 검토 worktree: `go test ./internal/contract -count=1` 통과. Docker opt-in 계약은 이 명령만으로 실행됐다고 주장하지 않는다.
- source approval `--check-source-approval`: PASS / `future_migrations=45`, DB 접근 없음.
- 검토 worktree 전체 Go 검증: **1,521 pass / 78 skip / fail 0** (상위·하위 테스트 이벤트 수). 기존 3개 실패가 모두 통과했다.
- 실제 runner 부정 통제 8개: 승인 누락, 이전 hash, `.env` 자체 승인, 082 누락, 미승인 추가 소스, 번호 중복, SQL 변조, SQL+manifest 동시 변조가 모두 거부됨. 정상 통제와 합쳐 **9/9** 통과.
- 이전 작업에서 083·084를 적용한 실제 MariaDB 기능 회귀는 [수정 3–5 검수](../qa/auth-fixes-steps-3-5-2026-10-09.md)에 기록했다.

검증 로그: `build/auth-device-qa-20261009/migration-proposed-contract.log`, `migration-proposal-negative-controls.json`.

## 적용 순서

1. 이 패킷의 082·083·084 소스와 위 결과를 검토하고 수정 브랜치에 패치를 통합한다. 고정 승인 hash를 실행할 manifest와 함께 묶어 보존한다.
2. 승인된 hash를 migration을 호출하는 **외부 shell 환경**에 전달한다. `.env` 값만 바꾸어서는 승인되지 않는다. 먼저 `migrate.sh --check-source-approval`이 위 PASS 45를 출력하는지 확인한다.
3. 운영 worker를 중지하고 백업·실제 적용 이력·스키마를 재확인한 뒤 083, 084 순서로 적용한다. 001–082를 재실행하거나 이력을 덮지 않는다. 083의 ALTER는 부분 DDL 실패 시 컬럼·인덱스와 journal을 대조해 복구한다.
4. 신규 schema 확인 후 backend 및 관리자 웹을 배포하고 worker를 재개한다. Android QA 계정으로 재연결, SMS 대기 표시, 재가입 소유권 보호, 구독 종료 검토를 검수한다. 운영 요청 15·16 등의 완료는 실제 저장소별 상태를 보고 판단한다.

실패 테스트를 삭제하거나 동적 hash로 무조건 자기 승인시키는 방식은 해결안에 포함하지 않는다.
