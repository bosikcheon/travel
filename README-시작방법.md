# Codex 여행지·숙소 사이트 시작 파일

이 묶음에는 기획·개발 규칙 파일과 Firebase·배포 준비 예시가 포함되어 있습니다.

- .agents/skills/travel-site-planner/SKILL.md: 반복해서 사용할 여행 사이트 기획 작업 절차
- AGENTS.md: 이 프로젝트에서 항상 지킬 개발 규칙
- docs/PRD.md: 이번 여행지·숙소 예약 사이트가 만들 기능과 화면·테이블 설계
- js/firebase-config.example.js와 firebase/database.rules.json: 실제 프로젝트 값 입력 전 설정 예시
- firebase.json: Realtime Database 규칙 파일 경로
- docs/FIREBASE-SETUP.md와 docs/DEPLOYMENT.md: Firebase 연결, GitHub 업로드, Vercel 배포 절차

## 적용 방법

### 로컬 서버 실행

프로젝트 루트에서 `python -m http.server 8000 --bind 127.0.0.1`을 실행한 뒤 브라우저에서 `http://127.0.0.1:8000`을 연다. Windows에서 python 명령이 없으면 `py -m http.server 8000 --bind 127.0.0.1`을 사용한다. 서버 종료는 `Ctrl+C`이다. HTML 파일을 직접 여는 대신 이 주소를 사용한다.

Python 정적 서버는 화면과 파일만 제공한다. 실제 인증·데이터 저장은 Firebase 연결이 필요하고, 예약 가격·상태 검증은 별도 신뢰 계층이 필요하다.

아래 내용은 초기 기획 묶음의 적용 안내다. 현재 메인 화면은 `index.html`에 있으며, 표시되는 여행지·숙소는 예시 데이터다.

1. 이 압축파일을 새 프로젝트의 최상위 폴더에 풉니다.
2. 최상위 폴더에 AGENTS.md, .agents, html, css, js, firebase, docs 폴더가 보이는지 확인합니다. html과 css는 파일을 넣을 자리만 준비되어 있습니다. index.html과 사이트 화면 소스는 다음 개발 단계에서 작성합니다.
3. 해당 프로젝트 폴더를 연 상태로 Codex를 시작합니다.
4. Codex에게 먼저 다음과 같이 요청합니다.

   AGENTS.md와 docs/PRD.md를 읽고 메뉴, 화면, Firebase 데이터 구조와 보안 규칙 예시를 검토해줘. 아직 구현하지 말고, Firebase 연결에 필요한 설정과 단계별 개발 계획을 알려줘.

5. 기획을 확정한 뒤 다음과 같이 요청합니다.

   확정된 기획에 따라 메인 화면부터 구현해줘. index.html은 루트, 나머지 HTML은 html 폴더, CSS는 css, JavaScript는 js 폴더에 작성해줘. 기존 파일 구조를 살펴보고 모바일 화면과 주요 링크를 점검해줘.

## 무엇을 어디에 적었나요?

- 스킬에는 다른 사이트 작업에도 재사용할 수 있는 기획 진행 순서와 출력·점검 기준을 적었습니다.
- AGENTS.md에는 HTML/CSS/순수 JavaScript, 정해진 폴더 규칙, Firebase 검증, GitHub 업로드와 Vercel 배포 순서를 적었습니다.
- PRD.md에는 사이트 메뉴, 화면 파일명, Firebase 데이터 경로와 최소 필드, 관리자 대시보드, 사용자 흐름을 적었습니다.

스킬은 여행 사이트 기획을 반복할 때 쓰고, 이번 사이트의 구체적인 요구사항은 docs/PRD.md에서 관리하면 됩니다. Firebase 프로젝트를 만든 뒤 웹 설정값과 관리자 UID를 예시에 입력하고 보안 규칙을 시험해야 실제 연동을 시작할 수 있습니다.


## 방문 통계와 로컬 서버

방문 통계 포함 실행은 프로젝트 루트에서 `py server/server.py` (또는 `python server/server.py`)를 사용한다. 기존 `py -m http.server` 서버는 Ctrl+C로 종료하고 새 명령으로 재시작한다. 접속 주소는 http://127.0.0.1:8000 이다. 기존 정적 서버에서도 화면과 Firebase 기능은 동작하지만 방문 통계 API는 제공되지 않는다.

통계는 한국 날짜 기준 동일 브라우저 하루 1회, 누적은 일별 방문 수 합계이다. 개인의 실제 인원이나 순수 사용자 수를 보장하지 않는다. 쿠키 삭제/다른 브라우저는 별도 방문으로 계산하며 봇 탐지 통계는 아니다. 관리자도 포함한다. 집계 시작 전 과거 방문은 복구하지 않는다. 서버 재시작 후에도 .local-data/visitors.sqlite3에 보존한다. 날짜와 임의 쿠키 식별자의 SHA-256 해시만 저장하며 IP·이메일·예약 기록은 수집하지 않는다. 이 폴더는 Git과 웹 공개 대상에서 제외한다. Firebase 경로·보안 규칙 및 기존 예약 데이터는 변경하지 않는다.

이 통계 API는 로컬 Python 서버 전용이다. Vercel 정적 배포에는 그대로 제공되지 않으므로 운영 배포 때는 영속 저장소와 서버 API를 별도로 연결한다. 브라우저에 전체 통계 쓰기 권한을 부여하지 않는다.
