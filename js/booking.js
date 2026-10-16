import { connect, memberProfile, isAdmin } from './firebase.js';
import { quote, today, DAY } from './reservations.js';
const form = document.querySelector('#booking-form');
const message = document.querySelector('#booking-message');
const submit = form.querySelector('[type=submit]');
const selectedId = new URLSearchParams(location.search).get('stayId');
let service, stay, user, profile, reservationRef, saved = false;
form.elements.checkIn.min = today();
form.elements.checkOut.min = today();
form.elements.checkIn.max = new Date(Date.parse(today() + 'T00:00:00Z') + 365 * DAY).toISOString().slice(0, 10);
function updateDateRange() {
  const start = Date.parse(form.elements.checkIn.value + 'T00:00:00Z');
  if (!Number.isFinite(start)) return;
  const nextDay = new Date(start + DAY).toISOString().slice(0, 10);
  const lastDay = new Date(start + 30 * DAY).toISOString().slice(0, 10);
  form.elements.checkOut.min = nextDay;
  form.elements.checkOut.max = lastDay;
  if (!form.elements.checkOut.value || form.elements.checkOut.value < nextDay || form.elements.checkOut.value > lastDay) {
    form.elements.checkOut.value = nextDay;
  }
}
form.elements.checkIn.addEventListener('input', () => { updateDateRange(); preview(); });
function preview() {
  if (!stay) return;
  try {
    const q = quote(stay, form.elements.checkIn.value, form.elements.checkOut.value, Number(form.elements.guestCount.value));
    document.querySelector('#quote').textContent = `${q.nights}박 · ${q.guestCount}명 · ${q.totalPrice.toLocaleString('ko-KR')}원 (1박 ${q.nightlyPriceAtBooking.toLocaleString('ko-KR')}원)`;
    return q;
  } catch (error) { document.querySelector('#quote').textContent = error.message; }
}
form.addEventListener('input', preview);
try {
  service = await connect(); user = service.auth.currentUser;
  if (!user) { alert('로그인후 예약하시오'); location.replace('login.html'); }
  else {
    if (await isAdmin(user)) throw new Error('관리자 계정으로는 예약 신청할 수 없습니다. 회원 계정으로 로그인하세요.');
    profile = await memberProfile(service, user);
    if (!selectedId || /[.#$\[\]/]/.test(selectedId)) throw new Error('숙소를 먼저 선택하세요.');
    const snapshot = await service.dbSDK.get(service.dbSDK.ref(service.db, `stays/${selectedId}`));
    stay = snapshot.val();
    if (!stay || stay.status !== 'active') throw new Error('예약 가능한 숙소가 아닙니다.');
    document.querySelector('#stay-title').textContent = stay.name;
    document.querySelector('#stay-info').textContent = `${stay.address} · 최대 ${stay.maxGuests}명 · 문의 ${stay.phone}`;
    document.querySelector('#guest-info').textContent = `예약자: ${profile.name} · ${profile.phone}`;
    form.elements.guestCount.max = stay.maxGuests;
    reservationRef = service.dbSDK.push(service.dbSDK.ref(service.db, 'reservations'));
    submit.disabled = false; message.textContent = '';
  }
} catch (error) { message.textContent = error.message; }
form.addEventListener('submit', async event => {
  event.preventDefault(); if (saved || submit.disabled) return;
  const q = preview();
  if (!q) { message.textContent = document.querySelector('#quote').textContent; document.querySelector('#quote').scrollIntoView({ block: 'center' }); return; }
  submit.disabled = true; message.textContent = '예약 신청을 저장하고 있습니다…';
  try {
    if (service.auth.currentUser?.uid !== user.uid) throw new Error('로그인 상태가 변경되었습니다. 다시 로그인하세요.');
    await memberProfile(service, user);
    const { nights, ...amount } = q;
    const record = { ...amount, memberId: user.uid, stayId: selectedId, stayNameAtBooking: stay.name, status: 'requested', createdAt: service.dbSDK.serverTimestamp(), updatedAt: service.dbSDK.serverTimestamp() };
    // 같은 화면의 재시도는 동일 키를 사용합니다. 규칙은 중복 덮어쓰기를 차단합니다.
    await service.dbSDK.set(reservationRef, record);
    saved = true;
    message.textContent = `신청 접수 완료 · 예약번호 ${reservationRef.key}. 관리자 확인 전에는 확정되지 않습니다.`;
    alert('예약 신청이 완료되었습니다.\n관리자 확인 후 예약이 확정됩니다.');
    location.href = 'my-bookings.html';
  } catch (error) {
    message.textContent = error.code === 'PERMISSION_DENIED' || error.code === 'permission-denied' ? '저장이 거부되었습니다. 숙소 가격·상태 변경, 회원 상태 또는 최신 Database Rules 게시 여부를 확인하세요. 내 예약에서 접수 여부를 먼저 확인한 뒤 다시 시도하세요.' : error.message;
  } finally { if (!saved) submit.disabled = false; }
});
