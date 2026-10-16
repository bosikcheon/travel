# GitHub 업로드 및 Vercel 배포 순서

## 업로드 전 점검

- 여행지·숙소·회원·예약 흐름을 Firebase 테스트 프로젝트에서 확인한다.
- Rules Simulator 또는 Emulator에서 비로그인, 일반 회원, 관리자 권한을 각각 점검한다.
- 테스트 회원의 개인 정보와 테스트용 예약 자료를 제거한다.
- 서비스 계정 JSON, Admin SDK 비공개 키, 비밀번호, .env 파일이 Git에 포함되지 않게 한다.
- Firebase 웹 앱 설정과 서비스 계정 키를 구분하고, Database Rules를 따로 점검한다.
- Git 상태를 확인하고 필요한 소스와 설정 예시만 포함한다.

## GitHub

1. 기존 저장소가 있으면 저장소와 현재 브랜치를 먼저 확인한다.
2. 저장소가 없으면 프로젝트 이름으로 저장소를 만든다.
3. 소스와 설정 예시를 커밋하고 GitHub에 업로드한다.
4. 업로드한 브랜치의 파일과 민감한 파일 제외 상태를 확인한다.

## Vercel

1. Vercel에서 GitHub 저장소를 연결한다.
2. Framework Preset은 Other로 선택한다.
3. 빌드 과정이 없는 정적 HTML 프로젝트이므로 Build Command는 비워둔다.
4. Output Directory는 프로젝트 루트로 지정한다.
5. Preview 배포에서 메인 화면과 하위 HTML 링크, 모바일 레이아웃, Firebase 연결을 확인한다.
6. 검증을 마친 뒤 Production 배포를 진행하고 실제 주소에서도 같은 핵심 흐름을 확인한다.

Vercel 환경변수에 비밀키를 넣어야 하는 서버 기능은 현재 범위에 포함하지 않는다. 추후 Cloud Functions 등 서버 기능을 추가할 경우 해당 서버 배포 설정을 별도 설계한다.
