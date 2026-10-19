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

방문 통계는 api/visits.py의 Vercel Python Function을 사용한다. 서버 인증 정보는 Vercel 환경변수로만 설정한다.


## travel-plum-zeta.vercel.app 방문 통계 설정

- GitHub에 api/visits.py, server/__init__.py, server/visit_store.py, server/requirements.txt, requirements.txt, vercel.json 및 수정된 js/visitors.js를 올린다.
- Vercel 프로젝트 → Settings → Environment Variables에서 Production 대상에 FIREBASE_SERVICE_ACCOUNT_JSON을 등록한다. 값은 Firebase 프로젝트 설정 → 서비스 계정에서 발급한 JSON의 전체 내용이다. 이 JSON은 GitHub 파일로 업로드하거나 브라우저 JavaScript에 넣지 않는다. Vercel의 Sensitive 옵션이 제공되면 사용한다. Preview에서도 시험하려면 해당 환경에도 별도로 설정한다.
- FIREBASE_DATABASE_URL에 Firebase Realtime Database의 실제 전체 URL을 넣는다. js/firebase-config.js의 databaseURL과 동일해야 한다.
- 환경변수 저장 후 Deployments → Redeploy한다. 루트 requirements.txt가 있어야 Python 종속성이 설치된다. 환경변수는 재배포 후 실행 함수에 반영된다.
- https://travel-plum-zeta.vercel.app/api/visits 를 열면 서비스 이름과 available 안내 JSON이 표시되어야 한다. GET 확인은 방문 수를 늘리지 않으며 Firebase 인증 성공을 보장하지 않는다.
- 회원으로 사이트에 로그인한 뒤 하단 경고가 사라지고 방문 수가 표시되는지 확인한다. Firebase에 visitSummary, visitStatistics 및 members/{uid}/visitCount·lastVisitedAt이 생기는지 확인한다. 같은 회원은 하루 1회만 횟수가 증가한다.
- 404면 함수 배포/프로젝트 루트 설정을 확인하고, POST 503이면 두 서버 환경변수와 서비스 계정의 DB 접근 권한을 확인한다. 서버 비밀키나 토큰은 오류 출력에 포함하지 않는다.
- PC에서 py server/server.py를 실행할 필요는 없다. 로컬 통계 이관 옵션은 과거 SQLite 집계가 필요할 때만 로컬에서 실행한다.
