# Firebase 연결 준비 안내

## 현재 구현 연결 항목

- `js/firebase-config.example.js`를 `js/firebase-config.js`로 복사하고 실제 웹 설정을 입력한다. `adminEmail`에는 Authentication에 등록한 관리자 이메일, `adminUid`에는 해당 UID를 입력한다. 관리자 비밀번호는 파일에 넣지 않는다.
- 관리자 로그인 화면의 `admin`은 이메일의 별칭이다. 실제 비밀번호 검증은 Firebase Authentication이 수행한다. Database Rules의 관리자 UID도 같은 UID로 설정해야 실제 관리자 데이터 접근이 가능하다.
- Authentication 이메일/비밀번호 로그인을 활성화하고 로컬 및 배포 호스트의 승인된 도메인을 확인한다.
- 회원가입은 Authentication 계정 생성과 `/members/{uid}` 프로필 저장을 모두 마친 뒤 완료 메시지를 표시한다. 프로필 저장 실패 시 생성 계정 삭제를 시도하며 삭제도 실패하면 운영자의 복구가 필요하다.
- 메인 오른쪽 메뉴 → 회원가입 → 로그인 → 로그아웃을 확인하고, 관리자 로그인 → `/html/admin.html` → 여행지·숙소 등록/수정/비활성화 → 회원정보·예약 조회를 검증한다.
- 현재 규칙 예시는 운영 검증 전이다. 예약 생성·확정·취소 쓰기는 가격·상태 전이 검증 및 Emulator/Simulator 시험을 마치기 전까지 화면에서 제공하지 않는다. 관리자 예약 메뉴는 조회 기능이다.
- 신규 여행지·숙소는 Firebase에 저장된다. 메인 여행지·숙소 카드는 여전히 예시 데이터이며 관리자 등록 데이터와 아직 연동되지 않았다.
- 실제 프로젝트 설정이 제공되지 않아 회원가입·로그인·관리자 CRUD·권한의 실서비스 검증은 미완료 상태이다. 사용자 비밀번호를 수집하거나 브라우저 저장소에 자체 저장하지 않는다.

로컬 실행은 현재 Windows 환경에서 다음 명령을 권장한다: `py -m http.server 8000 --bind 127.0.0.1 --directory "P:\AI\바이브코딩\13_travel"`.

## 1. Firebase 프로젝트 만들기

1. Firebase Console에서 새 프로젝트를 만든다.
2. 프로젝트에 웹 앱을 추가한다.
3. 프로젝트 설정에서 웹 앱의 Firebase 설정 객체를 확인한다.
4. Firebase Authentication에서 이메일/비밀번호 로그인을 활성화한다.
5. Realtime Database를 만들고 리전을 선택한다. 실제 Database URL을 기록한다.

## 2. 웹 설정값 입력

js/firebase-config.example.js를 js/firebase-config.js로 복사한 다음 Firebase 콘솔의 실제 값으로 바꾼다. databaseURL은 Realtime Database 콘솔에서 확인한 주소를 사용한다.

Firebase 웹 설정은 브라우저에서 Firebase 프로젝트를 식별한다. 서비스 계정 JSON, Admin SDK 비공개 키, 비밀번호를 이 파일에 복사하지 않는다.

## 3. 최초 관리자 지정

### 회원 프로필 규칙 적용

`firebase/database.rules.json`의 전체 내용을 Realtime Database → 규칙 탭에 붙여넣는다. 그 전에 `ADMIN_UID_PLACEHOLDER`를 Authentication → Users에 표시된 실제 관리자 UID로 모두 바꾸고 Rules Playground 또는 Emulator에서 허용·차단을 확인한 뒤 게시한다. `admin` 문자열이나 이메일을 UID 대신 넣으면 안 된다.

회원가입 시 Authentication이 UID를 발급하고 로그인된 상태에서 `/members/{uid}`에 프로필을 저장한다. 비밀번호는 Database에 저장하지 않는다. 회원은 자신의 단일 프로필만 읽고 활성 상태에서 수정할 수 있으며, 전체 회원 목록은 관리자만 읽는다. 회원·관리자 모두 프로필 영구 삭제는 허용하지 않고 관리자는 status를 suspended로 변경할 수 있다. 기존 예약의 memberId와 회원 경로는 그대로 유지한다.

프로필은 name, email, phone, status, createdAt, updatedAt 여섯 필드를 사용한다. 추가 필드와 역할·비밀번호 저장은 차단한다. 기존 레코드에 추가 필드가 있거나 createdAt이 숫자가 아니면 수정이 차단되므로 기존 데이터를 확인한 뒤 적용한다. createdAt은 생성 시 서버 시각, updatedAt은 매 저장 시 서버 시각을 사용한다. 이메일은 본인의 인증 토큰 이메일과 일치해야 한다. 기존 이메일 변경 기능을 추가할 때는 인증 정보 갱신도 함께 처리해야 한다.

로컬 회원 권한 시험: `firebase emulators:exec --only database --project demo-travel-rules --config firebase/emulator-test.json "py firebase/test_members_rules.py"`. 테스트는 로컬 9009 포트만 사용하며 실제 프로젝트에 배포하지 않는다.

1. Firebase Authentication에서 운영자 계정을 만든다.
2. 해당 사용자의 UID를 Authentication 사용자 목록에서 확인한다.
3. firebase/database.rules.json 안의 ADMIN_UID_PLACEHOLDER를 실제 UID로 바꾼다.
4. 규칙을 적용하기 전 일반 회원이 관리자 전용 경로를 읽거나 쓸 수 없는지 Rules Simulator 또는 Firebase Emulator에서 확인한다.

초기 예시는 관리자 한 명의 UID를 확인하는 방식이다. 운영자가 여러 명이 되면 custom claims와 신뢰할 수 있는 관리자 계정 관리 방식으로 확장한다. 회원 프로필 데이터만 바꾸어 관리자 권한을 얻을 수 없어야 한다. 회원을 suspended로 바꾸면 Database 접근은 제한되지만 Firebase Authentication 로그인 계정 자체를 비활성화하지는 않는다. 로그인을 차단해야 한다면 신뢰할 수 있는 관리자 도구에서 Authentication 계정도 별도로 정지한다.

## 4. 초기 데이터 구조

- destinations/{destinationId}: 공개 여행지 정보
- stays/{stayId}: 숙소 정보, destinationId로 여행지 연결
- members/{uid}: Firebase Authentication 사용자 프로필
- reservations/{reservationId}: 신청·확정·취소 상태가 있는 예약 정보

Database Rules는 목록 검색에 필요한 쿼리 조건을 확인한다. 공개 여행지 목록은 status가 published인 쿼리, 숙소 목록은 status가 active인 쿼리로 읽는다. 회원 예약 목록은 memberId가 로그인 사용자 UID와 같은 쿼리로 읽는다.

## 5. 예약 확인 정책

첫 버전은 예약을 requested 상태로 신청하고 관리자가 숙소의 날짜별 가능 여부와 신청 금액을 확인한 뒤 confirmed로 바꾼다. 신청 화면은 예약 확정 전임을 알린다. 실시간 객실 수량 차감, 동시 예약 방지, 자동 결제는 첫 버전에서 보장하지 않는다.

이 설정과 보안 규칙은 시작용 예시다. 실제 프로젝트 UID와 URL을 입력하고 Firebase Rules Simulator 또는 Emulator로 읽기·쓰기 권한을 확인한 뒤 적용한다. 기본 차단 규칙을 유지하고 규칙 오류로 전체 데이터가 공개되지 않게 한다.


## 예약 기능 활성화

최신 firebase/database.rules.json 전체를 Firebase 규칙 탭에 반영하고 게시한다. 관리자 UID는 이미 반영되어 있다. 이전 회원 전용 규칙만 게시한 상태라면 새 예약의 가격 검증은 동작하지 않으므로 반드시 전체 최신 규칙을 적용한다.

기존 안내 중 예약 조회만 지원한다는 내용은 이전 단계 설명이다. 현재는 실제 active 숙소 표시 → 회원 예약 신청 → 관리자 확정/거절 → 내 예약 조회/취소 요청 → 관리자 취소 승인까지 연결되어 있다. 실제 데이터와 Authentication을 이용한 운영 프로젝트 통합 검증은 별도로 수행한다.


## 회원 수정·탈퇴 기능 규칙 업데이트

최신 firebase/database.rules.json 전체를 콘솔 규칙 탭에 교체 후 게시해야 withdrawn boolean 저장이 허용된다. 필드 추가를 제외한 기존 데이터 마이그레이션은 불필요하다. 이전 규칙은 이 필드를 미허용 필드로 차단한다. 관리자 UID는 기존 값을 유지한다. 로컬 검증: firebase emulators:exec --only database --project demo-travel-rules --config firebase/emulator-test.json "py firebase/test_withdrawal_rules.py".


## Firebase 방문 통계 (이전 로컬 SQLite 집계를 대체)

1. `py -m pip install -r server/requirements.txt`로 서버 SDK를 설치한다.
2. 서버에 Google Application Default Credentials를 설정한다. 로컬 서비스 계정 방식을 사용한다면 Firebase 프로젝트 설정 → 서비스 계정에서 받은 JSON을 **프로젝트 폴더 외부**에 저장하고 PowerShell에서 `$env:GOOGLE_APPLICATION_CREDENTIALS="C:\안전한폴더\서비스계정.json"`처럼 경로를 지정한다. JSON 내용은 채팅·브라우저·GitHub에 올리지 않는다. 운영 환경은 서비스 계정 연결/워크로드 인증을 우선 사용한다.
3. databaseURL은 js/firebase-config.js에서 읽는다. 필요하면 `$env:FIREBASE_DATABASE_URL="실제 Realtime Database URL"`로 지정한다. 실제 서비스 계정과 같은 프로젝트를 사용한다.
4. 최신 firebase/database.rules.json 전체를 콘솔에 게시하고 `py server/server.py`로 서버를 재시작한다. 단순 http.server는 집계를 저장하지 못한다.

추가 데이터: `/visitSummary/totalVisitCount`, `/visitSummary/dailyCounts/YYYY-MM-DD`는 공개 읽기·브라우저 쓰기 금지다. `/visitStatistics`는 중복 집계 방지용 비공개 서버 데이터이며 일반 회원·관리자 브라우저 모두 읽기/쓰기 금지다. 서버 Admin SDK만 기록한다. 회원 프로필에 `visitCount`(숫자), `lastVisitedAt`(서버 시각 밀리초)를 반영한다. 브라우저에서 회원 프로필을 수정할 때도 이 두 필드의 변경·삭제는 금지한다. 필드 없는 기존 회원은 0회/방문 기록 없음으로 표시한다. 회원 가입 시 브라우저에서 이 필드를 임의로 넣지 않는다.

사이트는 한국 날짜 기준 같은 브라우저 하루 1회, 회원은 같은 UID 하루 1회(기기 변경 중복 제외)다. 최종 방문일시는 인증된 방문 API 호출 시 갱신한다. 로그인된 관리자도 사이트 방문에 포함되지만 회원 프로필이 없는 관리자는 회원 통계 대상이 아니다. 탈퇴·정지 회원은 회원 통계를 증가시키지 않는다. 통계는 Firebase 트랜잭션으로 중복을 방지한다. 서로 다른 서버도 같은 Firebase 프로젝트를 사용하면 합산된다. 서버 저장 실패 시 로컬 수치로 대체하지 않고 기존 Firebase 집계만 표시한다.

기존 SQLite 방문 이력은 자동 이관하지 않는다. 기존 브라우저 쿠키 식별자를 서버에서만 읽고 해시를 Firebase 비공개 경로에 저장하며 원래 IP·이메일은 방문 이력에 저장하지 않는다. 집계는 새 Firebase 기능 활성화 시점부터 시작한다. 필요한 과거 집계 이관과 비공개 이력 보존 기간은 별도 확정한다. 서버 자격 증명 미설정 상태에서는 실제 저장 연동 검증을 완료할 수 없다. Vercel 정적 배포에는 Python API가 없으므로 별도 서버 배포가 필요하다.


### 기존 로컬 방문 수 이관

기존 방문 수를 유지하려면 서버 인증 설정 후 `py server/server.py --migrate-local-stats`로 실행한다. 기존 `.local-data/visitors.sqlite3`의 일별 브라우저 해시를 Firebase에 합치며 중복 키는 다시 더하지 않는다. 원본 파일은 삭제하지 않는다. 각 PC에 별도 로컬 이력이 있다면 동일 명령으로 각각 합칠 수 있다. 기존 회원별 방문 이력은 저장되지 않았으므로 과거 회원 방문횟수/최종 방문일은 추정해 만들지 않는다. 앞선 자동 이관 없음 안내와 달리, 이 명시적인 옵션으로만 이관할 수 있다.
