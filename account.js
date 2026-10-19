import { connect, isAdmin, memberProfile } from './firebase.js';
import { openProfile } from './profile.js';
const prefix = location.pathname.includes('/html/') ? '../' : '';
const menu = document.querySelector('#account-menu');
if (menu) {
  menu.addEventListener('click', event => {
    if (event.target.closest('[data-guest-booking]')) { event.preventDefault(); alert('로그인후 예약하시오'); }
  });
  const draw = async user => {
    const admin = await isAdmin(user);
    menu.replaceChildren();
    if (user?.email) {
      const email = document.createElement(admin ? 'span' : 'button');
      email.className = 'account-email';
      email.textContent = user.email;
      email.title = user.email;
      if (!admin) { email.type='button'; email.title='내 회원정보 수정'; email.addEventListener('click',()=>openProfile().catch(error=>alert(error.message))); }
      menu.append(email);
    }
    function link(text, url, action) {
      const a = document.createElement('a'); a.textContent = text; a.href = url;
      if (action) a.addEventListener('click', action);
      menu.append(a);
    }
    if (admin) link('대시보드', prefix + 'html/admin.html');
    else {
      link(user ? '예약/확인' : '예약', prefix + 'html/my-bookings.html?v=20261019-layout3', !user ? event => { event.preventDefault(); alert('로그인후 예약하시오'); } : null);
      if (!user) {
        link('회원가입', prefix + 'html/signup.html');
        link('로그인', prefix + 'html/login.html');
        link('관리자', prefix + 'html/login.html?mode=admin');
      }
    }
    if (user) link(admin ? '관리자로그아웃' : '로그아웃', '#', async event => {
      event.preventDefault();
      try { const s = await connect(); await s.authSDK.signOut(s.auth); alert('로그아웃되었습니다'); location.href = prefix + 'index.html'; }
      catch { alert('로그아웃에 실패했습니다. 다시 시도하세요.'); }
    });
  };
  draw(null);
  connect().then(s => s.authSDK.onAuthStateChanged(s.auth, user => { draw(user).catch(() => { draw(null); }); })).catch(() => draw(null));
}
const form = document.querySelector('#auth-form');
if (form) {
  const signup = form.dataset.mode === 'signup';
  const adminMode = new URLSearchParams(location.search).get('mode') === 'admin';
  if (adminMode) {
    document.querySelector('h1').textContent = '관리자 로그인';
    const identity = form.elements.email;
    identity.type = 'password'; identity.value = 'admin'; identity.readOnly = true;
    identity.setAttribute('aria-label', '관리자 아이디 (숨김)');
    identity.autocomplete = 'off';
    document.querySelector('#identity-label').textContent = '관리자 아이디';
  }
  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = form.querySelector('[type=submit]'); button.disabled = true;
    const status = document.querySelector('#auth-status'); status.textContent = '처리 중…';
    let createdUser;
    let service;
    try {
      service = await connect();
      const { auth, authSDK, db, dbSDK } = service;
      const password = form.elements.password.value;
      if (signup) {
        if (password !== form.elements.confirmPassword.value) throw new Error('비밀번호가 일치하지 않습니다.');
        const credential = await authSDK.createUserWithEmailAndPassword(auth, form.elements.email.value.trim(), password);
        createdUser = credential.user;
        await dbSDK.set(dbSDK.ref(db, `members/${createdUser.uid}`), { name: form.elements.name.value.trim(), email: createdUser.email, phone: form.elements.phone.value.trim(), status: 'active', withdrawn: false, createdAt: dbSDK.serverTimestamp(), updatedAt: dbSDK.serverTimestamp() });
        await authSDK.signOut(auth);
        alert('가입 완료되었습니다.'); location.href = 'login.html';
      } else {
        if (adminMode && (!service.adminEmail || !service.adminUid)) throw new Error('관리자 이메일과 UID 설정이 필요합니다.');
        const credential = await authSDK.signInWithEmailAndPassword(auth, adminMode ? service.adminEmail : form.elements.email.value.trim(), password);
        const admin = await isAdmin(credential.user);
        if (adminMode && !admin) { await authSDK.signOut(auth); throw new Error('관리자 권한이 없습니다.'); }
        if (!admin) {
          try { await memberProfile(service, credential.user); }
          catch (error) { await authSDK.signOut(auth); throw error; }
        }
        alert(admin ? '관리자 로그인 성공' : '로그인 되었습니다.');
        location.href = admin ? 'admin.html' : '../index.html';
      }
    } catch (error) {
      if (createdUser) {
        try { await service.authSDK.deleteUser(createdUser); }
        catch { await service.authSDK.signOut(service.auth).catch(() => {}); status.textContent = '인증 계정만 생성되었습니다. 운영자에게 프로필 복구를 요청하세요.'; }
      }
      if (!signup) alert('로그인 실패되었습니다.');
      else if (error.code === 'auth/email-already-in-use') alert('이미 가입중이거나, 탈퇴회원입니다. 메일주소로 가입하세요');
      else alert('회원가입에 실패했습니다.');
      status.textContent = status.textContent.includes('프로필 복구') ? status.textContent : error.code ? '이메일·비밀번호, 계정 중복 여부 및 네트워크를 확인하세요.' : error.message;
    } finally { button.disabled = false; form.elements.password.value = ''; if (signup) form.elements.confirmPassword.value = ''; }
  });
}
