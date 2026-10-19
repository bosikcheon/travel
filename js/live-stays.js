import { connect } from './firebase.js';
const grid = document.querySelector('#stay-grid');
const note = document.querySelector('.price-note');
let allItems = [], selection = null, ready = false, service;
const related = document.querySelector('#related-stays');
const relatedGrid = document.querySelector('#related-stay-grid');
function renderRelated() {
  if (!selection) return;
  related.hidden = false;
  document.querySelector('#related-title').textContent = `${selection.label} 주변 숙소`;
  relatedGrid.replaceChildren();
  const items = allItems.filter(([, stay]) => selection.ids.includes(stay.destinationId));
  document.querySelector('#related-note').textContent = !ready ? '숙소를 불러오는 중…' : items.length ? `연결된 숙소 ${items.length}곳 · 관리자 확인 후 예약 확정` : `현재 ${selection.label}에는 등록된 숙소가 없습니다. 추후 숙소를 추가할 예정입니다.`;
  for (const [id, stay] of items) relatedGrid.append(stayCard(id, stay));
}
document.addEventListener('destination-stays-selected', event => { selection = event.detail; renderRelated(); if (selection.scroll) related.scrollIntoView(); });
grid.replaceChildren(); note.textContent = '등록된 숙소를 불러오는 중…';
function node(tag, text, className) { const n = document.createElement(tag); if (text) n.textContent = text; if (className) n.className = className; return n; }
function stayCard(id, stay) {
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
      bottom.append(link); info.append(bottom); card.append(info); return card;
}
try {
  service = await connect();
  const { ref, query, orderByChild, equalTo, onValue } = service.dbSDK;
  onValue(query(ref(service.db, 'stays'), orderByChild('status'), equalTo('active')), snapshot => {
    grid.replaceChildren();
    const items = Object.entries(snapshot.val() || {}).sort((a, b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0) || b[0].localeCompare(a[0]));
    note.textContent = items.length ? '실제 등록 숙소 · 1박 기준 가격입니다. 신청 후 관리자가 가용성을 확인하며 실시간 재고와 온라인 결제는 제공하지 않습니다.' : '등록된 활성 숙소가 없습니다. 관리 화면의 숙소 상태를 확인하세요.';
    allItems = items; ready = true;
    for (const [id, stay] of items) grid.append(stayCard(id, stay));
    renderRelated();
  }, () => { grid.replaceChildren(); note.textContent = '숙소 조회에 실패했습니다. Firebase 연결과 공개 숙소 읽기 규칙을 확인하세요.'; });
} catch (error) { note.textContent = error.message; }
