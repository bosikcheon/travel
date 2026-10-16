// Firebase 콘솔 > 프로젝트 설정 > 내 앱 > SDK 설정에서 웹 앱 설정값을 복사하세요.
// 이 파일을 js/firebase-config.js로 복사해 실제 값으로 채운 뒤 사용합니다.
// Firebase 웹 설정은 클라이언트 식별 정보이며 보안은 Authentication과 Database Rules로 설정합니다.
export const firebaseConfig = {
  apiKey: "YOUR_FIREBASE_WEB_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT_ID-default-rtdb.REGION.firebasedatabase.app",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.firebasestorage.app",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
// 공개 식별 정보입니다. 비밀번호·서비스 계정 키를 입력하지 마세요.
// 실제 권한은 database.rules.json의 관리자 UID와 일치하도록 설정합니다.
export const adminEmail = 'admin@gmail.com';
export const adminUid = 'ipvSWG4VEuTCN932Iqo5BilNBqj1';
