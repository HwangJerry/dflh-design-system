# QA 회원 탈퇴 최종 완료 확인

최종 서버 조회: 2026-10-10 20:23:06 KST.

요청 24·25·26을 읽기 전용으로 다시 확인했다. **세 요청 모두 processing/database_erased이며, SMS 보관 기한 이후 전체 완료 확인이 남아 있다.** 상태·보관 기한·worker를 변경하지 않았다.

| 요청 | 상태 | 단계 | 완료일(KST) | 남은 SMS 기록 | 정리 예상(KST) |
| --- | --- | --- | --- | --- | --- |
| 24 | processing | database_erased | — | 3 | 2026-10-11 01:36:29 |
| 25 | processing | database_erased | — | 1 | 2026-10-11 02:34:58 |
| 26 | processing | database_erased | — | 3 | 2026-10-11 01:36:29 |

이전 대상 회원 12822·12823·12825의 회원·canonical identity·refresh 기록은 각각 0이다. 백업·외부 데이터·과거 파일 단계도 모두 complete이며, other_identifiers의 SMS 기록 보관이 남았다. 새 Android 검수는 다른 테스트 전화번호를 사용해 이 요청들의 보관 기한을 연장하지 않았다.

운영 프로세스의 실제 환경에서 탈퇴 요청 및 worker는 활성이다. systemd 후속 EnvironmentFile이 적용되므로 `/etc/sysconfig/alumni-backend` 한 파일만 읽어 비활성이라고 판정하지 않는다. 20:13 KST SMS QA 설정을 임시 등록한 뒤 재시작한 프로세스도 동일한 요청/worker 설정을 유지했다.

현재 로컬의 기존 일회성 모니터 프로세스는 실행 중이 아니다. 위 결과는 이번 검수의 새 조회이며, 기한 이후 자동 관측이나 completed·기기 완료 화면을 확인했다고 주장하지 않는다. 기한 이후 실제 worker 결과와 탈퇴 접수증 화면을 추가 확인해야 한다.

실제 SMS 전달은 2026-10-10 01:28:58 KST 요청 후 Android 알림 수신·앱 인증·서버 VERIFIED_YN=Y로 기존에 확인했다. 새 허용 테스트 번호/고정 코드 검수와는 구분한다.

최신 근거: `build/android-auth-goal-audit-20261010/server/erasure-current.json`, `old-qa-erase-residue.txt`, `runtime-erasure-flags-after-sms.json`. 이전 수신 근거: `build/auth-admin-followup-20261010/actual-sms-result.json`.

관련: [서버 독립 검수](android-auth-server-audit-2026-10-10.md), [기존 관리자 연계](auth-admin-followup-2026-10-10.md).
