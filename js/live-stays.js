import { connect } from './firebase.js';
const grid = document.querySelector('#stay-grid');
const note = document.querySelector('.price-note');
grid.replaceChildren(); note.textContent = '등록된 숙소를 불러오는 중…';
function node(tag, text, className) { const n = document.createElement(tag); if (text) n.textContent = text; if (className) n.className = className; return n; }
try {
  const service = await connect();
  const { ref, query, orderByChild, equalTo, onValue } = service.dbSDK;
  onValue(query(ref(service.db, 'stays'), orderByChild('status'), equalTo('active')), snapshot => {
    grid.replaceChildren();
    const items = Object.entries(snapshot.val() || {});
    note.textContent = items.length ? '실제 등록 숙소 · 1박 기준 가격입니다. 신청 후 관리자가 가용성을 확인하며 실시간 재고와 온라인 결제는 제공하지 않습니다.' : '등록된 활성 숙소가 없습니다. 관리 화면의 숙소 상태를 확인하세요.';
    for (const [id, stay] of items) {
      const card = node('article', '', 'stay-card');
      if (/^https?:\/\//.test(stay.imageUrl || '')) {
        const image = node('img'); image.src = stay.imageUrl; image.alt = stay.name; image.loading = 'lazy'; image.addEventListener('error', () => { image.hidden = true; }, { once: true }); card.append(image);
      }
      const info = node('div', '', 'stay-info');
      info.append(node('p', stay.address, 'stay-region'), node('h3', stay.name), node('p', `${stay.description} · 최대 ${stay.maxGuests}명`, 'stay-description'));
      const bottom = node('div', '', 'stay-bottom');
      bottom.append(node('p', `${Number(stay.pricePerNight).toLocaleString('ko-KR')}원 / 1박`));
      const link = node('a', '예약 신청 ↗'); link.href = `html/booking-form.html?stayId=${encodeURIComponent(id)}`;
      link.addEventListener('click', event => { if (!service.auth.currentUser) { event.preventDefault(); alert('로그인후 예약하시오'); location.href = 'html/login.html'; } });
      bottom.append(link); info.append(bottom); card.append(info); grid.append(card);
    }
  }, () => { grid.replaceChildren(); note.textContent = '숙소 조회에 실패했습니다. Firebase 연결과 공개 숙소 읽기 규칙을 확인하세요.'; });
} catch (error) { note.textContent = error.message; }
