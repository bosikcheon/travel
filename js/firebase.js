let pending;
export function connect() {
  if (!pending) pending = initialize().catch(error => { pending = null; throw error; });
  return pending;
}
async function initialize() {
  let config;
  try { config = await import('./firebase-config.js'); }
  catch { throw new Error('Firebase 설정이 필요합니다. docs/FIREBASE-SETUP.md를 확인하세요.'); }
  if (!config.firebaseConfig?.apiKey || config.firebaseConfig.apiKey.startsWith('YOUR_')) throw new Error('실제 Firebase 웹 설정을 입력하세요.');
  const base = 'https://www.gstatic.com/firebasejs/12.4.0/';
  const [appSDK, authSDK, dbSDK] = await Promise.all([import(base + 'firebase-app.js'), import(base + 'firebase-auth.js'), import(base + 'firebase-database.js')]);
  const app = appSDK.initializeApp(config.firebaseConfig);
  const auth = authSDK.getAuth(app);
  await auth.authStateReady();
  return { auth, db: dbSDK.getDatabase(app), authSDK, dbSDK, adminEmail: config.adminEmail, adminUid: config.adminUid };
}
export async function isAdmin(user) {
  if (!user) return false;
  const service = await connect();
  return Boolean(service.adminUid && user.uid === service.adminUid);
}
export async function memberProfile(service, user) {
  const snapshot = await service.dbSDK.get(service.dbSDK.ref(service.db, `members/${user.uid}`));
  if (!snapshot.exists() || snapshot.val().status !== 'active' || snapshot.val().withdrawn === true) throw new Error('회원 프로필이 없거나 이용 정지·탈퇴한 계정입니다. 운영자에게 문의하세요.');
  return snapshot.val();
}
