import { connect, memberProfile } from './firebase.js';
export async function openProfile() {
  let dialog = document.querySelector('#profile-dialog');
  if (dialog) { dialog.showModal(); return; }
  const service = await connect(), user = service.auth.currentUser;
  if (!user) return;
  const profile = await memberProfile(service,user);
  let busy = false;
  dialog = document.createElement('dialog'); dialog.id='profile-dialog'; dialog.className='admin-dialog';
  dialog.setAttribute('aria-labelledby','profile-title');
  // Only fixed markup here; member values are assigned through input.value.
  dialog.innerHTML = '<h2 id="profile-title">내 회원정보 수정</h2><form class="account-form"><label>이메일<input name="email" type="email" readonly></label><p>이메일은 로그인 계정 정보이므로 이 화면에서는 변경할 수 없습니다.</p><label>성명<input name="name" required maxlength="60" autocomplete="name"></label><label>연락처<input name="phone" type="tel" required maxlength="30" autocomplete="tel"></label><button type="submit" class="primary-button">저장</button></form><p class="account-status" role="status"></p><div class="withdrawal-section"><p>탈퇴해도 기존 예약 기록과 회원정보는 보관되며 관리자만 전체 조회할 수 있습니다. 진행 중인 예약은 자동 취소되지 않습니다.</p><button type="button" class="pastel-button state-rejected" data-withdraw>회원탈퇴</button></div><div class="dialog-footer"><button type="button" class="secondary-button" data-profile-close>창닫기</button></div>';
  const form=dialog.querySelector('form'), feedback=dialog.querySelector('[role=status]');
  form.elements.email.value=user.email || profile.email;
  form.elements.name.value=profile.name; form.elements.phone.value=profile.phone;
  const focus=document.activeElement;
  dialog.addEventListener('close',()=>{ if (!busy) { dialog.remove(); focus?.focus(); } });
  dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
  dialog.querySelector('[data-profile-close]').addEventListener('click',()=>dialog.close());
  async function save(withdraw) {
    if (busy) return;
    busy=true; dialog.querySelectorAll('button').forEach(b=>{b.disabled=true;});
    let unsubscribe;
    try {
      if (service.auth.currentUser?.uid !== user.uid) throw new Error('로그인 상태가 변경되었습니다. 다시 로그인하세요.');
      await new Promise((resolve,reject)=>{unsubscribe=service.dbSDK.onValue(service.dbSDK.ref(service.db,`members/${user.uid}`),resolve,reject);});
      const result=await service.dbSDK.runTransaction(service.dbSDK.ref(service.db,`members/${user.uid}`),current=>{
        if (!current || current.withdrawn === true || current.status !== 'active') return;
        return {...current,...(withdraw ? {withdrawn:true} : {name:form.elements.name.value.trim(),phone:form.elements.phone.value.trim()}),updatedAt:service.dbSDK.serverTimestamp()};
      },{applyLocally:false});
      if (!result.committed) throw new Error('회원 상태가 변경되었습니다. 다시 로그인해 확인하세요.');
      feedback.textContent=withdraw?'탈퇴 처리되었습니다.':'회원정보가 수정되었습니다.';
      if (withdraw) {
        // Persist first; Authentication account and reservation records are retained.
        await service.authSDK.signOut(service.auth); alert('탈퇴 처리되었습니다.'); location.href=new URL('../index.html',import.meta.url).href;
      } else alert('회원정보가 수정되었습니다.');
    } catch(error) { feedback.textContent=/permission.denied/i.test(error.code || '') ? '저장 권한이 거부되었습니다. 최신 회원정보 보안 규칙의 게시 여부를 확인하세요.' : error.message; }
    finally {unsubscribe?.();busy=false;dialog.querySelectorAll('button').forEach(b=>{b.disabled=false;});}
  }
  form.addEventListener('submit',event=>{event.preventDefault(); if(!form.elements.name.value.trim() || !form.elements.phone.value.trim()){feedback.textContent='성명과 연락처를 입력하세요.';return;}save(false);});
  dialog.querySelector('[data-withdraw]').addEventListener('click',()=>{if(confirm('탈퇴하시겠습니까?'))save(true);});
  document.body.append(dialog); dialog.showModal();
}
