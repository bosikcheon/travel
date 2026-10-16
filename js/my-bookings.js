import { connect, memberProfile } from './firebase.js';
import { dateLabel, statusLabels, changeStatus } from './reservations.js';
const status = document.querySelector('#booking-status');
const list = document.querySelector('#booking-list');
try {
  const s = await connect();
  s.authSDK.onAuthStateChanged(s.auth, async user => {
    list.replaceChildren();
    if (!user) { status.textContent = '로그인후 예약하시오'; return; }
    try {
      await memberProfile(s, user);
      const { get, ref, query, orderByChild, equalTo } = s.dbSDK;
      const snapshot = await get(query(ref(s.db, 'reservations'), orderByChild('memberId'), equalTo(user.uid)));
      if (s.auth.currentUser?.uid !== user.uid) return;
      const items = Object.entries(snapshot.val() || {});
      status.textContent = items.length ? `예약 ${items.length}건` : '예약 내역이 없습니다.';
      items.forEach(([id, record]) => {
        const article = document.createElement('article'); article.className = 'notice';
        article.textContent = `${id} · ${record.stayNameAtBooking || record.stayId} · ${dateLabel(record.checkIn)} ~ ${dateLabel(record.checkOut)} · ${record.guestCount}명 · ${Number(record.totalPrice).toLocaleString('ko-KR')}원 `;
        const state = document.createElement(record.status === 'confirmed' ? 'strong' : 'span');
        state.className = record.status === 'confirmed' ? 'booking-state booking-state-confirmed' : 'booking-state';
        state.textContent = statusLabels[record.status] || record.status;
        article.append(state);
        if (['requested', 'confirmed'].includes(record.status)) {
          const cancel = document.createElement('button'); cancel.textContent = '취소 요청'; cancel.className = 'text-button';
          cancel.addEventListener('click', async () => {
            if (!confirm('관리자에게 취소를 요청할까요? 관리자 처리 후 취소가 완료됩니다.')) return;
            cancel.disabled = true;
            try { await changeStatus(s, id, record.status, 'cancel_requested'); alert('취소 요청이 접수되었습니다.'); location.reload(); }
            catch (error) { alert(error.message || '취소 요청에 실패했습니다.'); cancel.disabled = false; }
          });
          article.append(cancel);
        }
        list.append(article);
      });
    } catch (error) { status.textContent = error.code ? '예약 정보를 읽지 못했습니다. 권한과 연결을 확인하세요.' : error.message; }
  });
} catch (error) { status.textContent = error.message; }
