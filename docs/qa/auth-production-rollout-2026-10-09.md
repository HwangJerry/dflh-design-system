# 인증 보완 운영 배포 — 2026-10-09

사용자의 “그렇게 진행해.” 지시에 따라 기존 운영 서버 `daeil-prod`에 migration 083·084, backend, 관리자 웹을 배포했다. Android만 실기기 재검수했고 iOS UI 작업은 재개하지 않았다. 신규 QA 계정은 12822, 보존 root 계정은 12813이다.

## 승인과 스키마

검토 패치를 수정 브랜치에 통합해 `19a1736`으로 커밋했다. 승인 manifest SHA-256은 `ca85fbdfb58c56ce038eb0094b21a00739c6513588e4f2a343295249a632a183`, 040–084 / 45개다. 실행 shell의 외부 승인값으로 전달했고 `MIGRATION_SOURCE_APPROVAL=PASS future_migrations=45`를 로컬과 운영에서 확인했다. runner의 승인·checksum·journal 검사는 유지했다.

운영 이력 82건의 소스 checksum을 다시 대조했다. 신규 컬럼·테이블이 부분 적용되지 않았고 runner lock이 없음을 확인했다. 기존 001–082는 재실행하거나 이력 checksum을 덮지 않았다. 기존 history 82건 중 journal에 없던 이력은 runner의 기존 INSERT IGNORE 절차가 동기화했다. `--seed`는 사용하지 않았다.

웹/API를 중지한 상태에서 DB 및 두 업로드 저장소를 백업하고 checksum을 검증했다. 로그인 보안 이벤트는 기존 배포 백업 정책대로 빈 schema만 보존했다. 이후 기존 `migrate.sh`로 **083 → 084**를 개별 적용했다. 결과는 history 84건, journal APPLIED 84건, runner lock 0건이다. 083의 소유권 컬럼 2개와 대기 메타데이터 2개, 084의 감사 테이블을 확인했다. 과거 SMS 소유자를 추정해 backfill하지 않았다.

복구 자료: `/app/releases/auth-migration-20261009-19a1736/backup`. DB dump 및 upload archive들의 checksum이 일치했다. 부분 DDL 실패는 없었다.

## 서버·관리자 배포

기존 `deploy.sh`로 clean commit의 backend/admin 산출물을 로컬 준비한 뒤 검증한 bundle을 배포했다. 기존 frontend는 배포 대상에 넣지 않았다. 운영 Apache 설정은 후보와 동일함을 먼저 확인했다. 배포 도구는 이전 서버·관리자 파일·rollout 설정과 DB/uploads 복구 자료를 보존했다. 운영 비밀 환경값은 출력하거나 교체하지 않았다.

첫 release: `20261008T182726Z-19a17367958c`. backend 실행 파일과 관리자 index가 검증한 artifact hash와 일치했다. 서버 내부 및 외부 HTTPS API health를 확인했다. worker를 일시 중지한 상태로 배포한 뒤 기존 운영 설정인 requests=true / worker=true / test_user=0 / retention=false로 재개했다.

## 배포 중 발견한 예상 시각 오류 — red → green

새 관리자 화면에서 SMS 건수는 정확했지만 정리 예상 시각이 9시간 늦었다. `WAIT_UNTIL`에 time.Time을 바인딩할 때 운영 driver의 `loc=Asia/Seoul`이 값을 서울 시각으로 변환했는데, 조회부는 탈퇴 DATETIME의 기존 UTC 저장 규칙에 따라 재해석한 것이 원인이었다. 보관 기간·실제 cleanup 조건을 바꾸는 문제가 아니라 저장/표시 경계의 오류다.

실제 MariaDB 10.1.38에서 UTC와 Asia/Seoul driver로 `RecordErasureTargets` → `ErasureTargets`를 실행하는 회귀를 추가했다. 수정 전 UTC는 통과, Asia/Seoul은 **정확히 9시간 이동해 실패**했다. UTC wall-clock 문자열로 저장하도록 수정해 두 연결의 round trip 모두 통과했다. 전역 DB 시간대나 기존 탈퇴 날짜 처리, SMS TTL은 변경하지 않았다.

보완 커밋: `567b6e1`. 전체 Go는 **1,521 pass / 79 skip / fail 0**이며 새 opt-in MariaDB 회귀는 별도로 실제 실행해 두 시간대 모두 통과했다. backend만 후속 배포했다. migration SQL 및 승인 manifest는 동일하여 신규 DDL을 다시 실행하지 않는다.

## Android 및 관리자 재검수

- 실제 Note9에서 ID/PW 로그인 후 기존 REVOKED 카카오 정보를 다시 연결했다. **기존 AUTH-QA-12 재연결 실패가 해소됐다.** 서버의 회원 12822에는 LOCAL_USERNAME ACTIVE / KAKAO ACTIVE가 확인됐다.
- 연결 후 로그아웃 → 실제 Kakao 로그인으로 같은 회원과 `AndroidQA1009` 프로필에 접근했다. 별도 회원으로 분리되지 않았다.
- 로그인된 관리자 Chrome에서 새 bundle을 새로고침하고 요청 16·22의 SMS 인증 기록 5건 및 정리 예상 시각 안내가 나오는 것을 확인했다. 작업용으로 새 탭을 사용했고 사용자의 다른 탭은 변경하지 않았다.
- 요청 16·22는 `database_erased`이며 `other_identifiers`가 `PHONE_VERIFICATION_RETENTION_PENDING`이다. 새 회원 12822는 기존 탈퇴 요청의 재검증 후에도 유지됐다. 보관 기한을 건너뛰거나 자료 없음으로 강제 완료하지 않았다.
- 요청 15도 후속 worker가 재검증한 뒤 SMS 기록 5건의 보관 대기로 분류됐다. 요청 15·16·22 모두 최종 완료까지 실제 보관 기한과 cleanup/recheck를 기다려야 한다.
- 구독 종료 검토의 schema·서버·관리자 기능을 배포했다. 실제 공급자 종료 증거 없이 재무 참조를 강제 승인/삭제하지 않았다. 관련 기능의 실제 MariaDB 기능 검증은 [작업 3–5 보고서](auth-fixes-steps-3-5-2026-10-09.md)에 있다.

## 최종 확인

후속 backend release는 `20261008T183421Z-567b6e1cc31f`이며 관리자는 첫 release의 동일 파일을 유지한다. 실제 실행 바이너리 hash가 후속 산출물과 일치하고 backend/httpd 모두 active다. worker 설정은 배포 전 값과 같다. 후속 배포 이후에도 Android cold start는 같은 회원으로 자동 로그인했다. 최종 로그아웃과 cold start는 로그인 화면으로 확인했다. Wi-Fi/모바일 데이터는 QA 전 설정과 같고 수정 QA 앱은 유지했다. root 12813의 권한과 LOCAL_USERNAME ACTIVE, 신규 QA 회원 12822의 LOCAL_USERNAME/KAKAO ACTIVE도 유지된다.

배포 전후 두 origin `https://daeilfoundation.or.kr`, `https://adms.daeilfoundation.or.kr`의 API health는 200 / ok다. 실제 공개 관리자 index와 JS도 준비한 파일 hash와 일치했다.

실제 worker의 정상 재시도 뒤 요청 15·16·22 모두 `WAIT_COUNT=5`, `WAIT_UNTIL=2026-10-09 19:03:02`(UTC 저장값)로 갱신됐다. 관리자 표시 시각은 **2026-10-10 04:03:02 KST**다. 실제 보관 기한을 기다리는 상태이며 이 예상 시각은 cleanup 실패나 처리 지연 시 늦어질 수 있다. 현재 각 요청은 processing/database_erased로 전체 완료까지는 검증하지 않았다.

신규 구독 검토 감사 테이블은 컬럼 7개로 생성된 것을 확인했다. 운영 공급자 종료 증거를 새로 입력하거나 실제 재무 참조를 강제 처리한 검수는 하지 않았다. 아이디 로그인 오류 문구의 기존 P3 결함도 이번 배포 범위 밖으로 남는다.

복구 시에는 worker를 중지하고 저장한 이전 application 파일로 복원한다. 적용된 additive schema를 자동 제거하거나 운영 DB 백업을 덮어 복원하지 않는다. 배포 도구도 자동 rollback 시 schema는 보존하도록 구성돼 있다. 모든 임시 Docker 테스트 컨테이너는 테스트 하네스가 정리했다. 다른 사용자의 Docker 컨테이너와 iOS 파일 변경은 건드리지 않았다.

## 증거

private 로컬 증거: `build/auth-prod-rollout-20261009/`. `migration-apply.log`, `migration-result.json`, `backup-proof.json`, `deployment-proof.json`, `worker-resume.log`, `schema-and-relink-postflight.txt`, `timezone-red.log`, `timezone-green.log`, `timezone-full-go-summary.json`, `admin-processing-ui-private.txt`, `final-deployment-proof.json`, `public-final-health.json`, `final-wait-time-check.txt`, `admin-wait-time-corrected-private.txt`. 회원 연락처·접수증·보안 값이 들어갈 수 있는 원시 화면과 서버 로그는 공개 문서에 첨부하지 않았다.
