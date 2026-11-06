# 보안 설계

## Electron
- nodeIntegration: false
- contextIsolation: true
- sandbox: true
- preload에서 필요한 IPC 함수만 allowlist 방식으로 노출
- IPC 입력은 main process에서 스키마 검증
- renderer에 파일 시스템, 임의 shell, SQLite 연결 객체를 노출하지 않음
- 외부 URL은 허용 목록과 안전한 새 창 정책 적용
- 자동 업데이트 패키지 서명 및 배포 무결성 검증

## 인증 및 권한
- Supabase Auth로 사용자 인증
- 매장 권한은 store_memberships/roles/permissions 기반으로 서버에서 재검증
- JWT 만료/갱신/로그아웃 처리
- 기기 등록 및 분실 기기 비활성화 절차
- 관리자 권한 변경은 감사 로그 기록

## 데이터 격리
- 주요 테이블에 tenant_id/store_id 적용
- RLS를 기본 거부 방식으로 설계
- 클라이언트 전달 tenant/store ID만으로 권한을 인정하지 않음
- service_role 및 서버 비밀키는 Edge Function/Worker Secret에만 저장

## 로컬 데이터
- Windows 사용자 계정 권한과 디스크 접근 권한 제한
- 민감 설정/토큰은 OS 보안 저장소 사용 검토
- 로컬 DB 백업 및 복구 절차 제공
- 로그에 인증 토큰, 카드 정보, 비밀번호, 개인정보를 기록하지 않음

## 운영
- 의존성 보안 업데이트
- 배포 환경별 Secret 분리
- 감사 로그 및 관리자 작업 이력
- 정기 백업과 복구 리허설
- 침해/기기 분실 대응 절차
- 개인정보 보유 기간과 파기 정책 수립
