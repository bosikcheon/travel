import { connect, memberProfile } from './firebase.js';
import { dateLabel, statusLabels, changeStatus } from './reservations.js';
const status = document.querySelector('#booking-status');
const list = document.querySelector('#booking-list');
const dialog = document.querySelector('#my-booking-dialog');
const detailBody = document.querySelector('#my-booking-detail');
let unsubscribe, version = 0, previousFocus;
function node(tag, text) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; }
function appliedAt(value) { return typeof value === 'number' ? new Date(value).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false }) : '신청일 정보 없음'; }
function badge(value) { const n = node('strong', statusLabels[value] || value); n.className = `reservation-badge state-${Object.hasOwn(statusLabels,value) ? value : 'unknown'}`; return n; }
function money(value) { return `${Number(value).toLocaleString('ko-KR')}원`; }
document.querySelector('#close-my-booking').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => previousFocus?.focus());
function showDetails(id, record, info, profile) {
  previousFocus = document.activeElement; detailBody.replaceChildren();
  const table = node('table'); table.className = 'detail-table';
  const head = node('thead'), heading = node('tr'); heading.append(node('th','제목'),node('th','내용')); head.append(heading); table.append(head);
  const tbody = node('tbody');
  const rows = [['예약번호',id],['지역',info.region],['숙소명',info.name],['신청일시',appliedAt(record.createdAt)],['예약 상태',badge(record.status)],['체크인',dateLabel(record.checkIn)],['체크아웃',dateLabel(record.checkOut)],['인원',`${record.guestCount}명`],['예약 당시 1박 가격',money(record.nightlyPriceAtBooking)],['예약 총액',money(record.totalPrice)],['예약자 성명',profile.name],['이메일',profile.email],['연락처',profile.phone],['숙소 주소',info.address],['숙소 연락처',info.phone],['최종 변경일시',appliedAt(record.updatedAt)]];
  for (const [label,value] of rows) { const tr = node('tr'), th = node('th',label), td = node('td'); th.scope = 'row'; if (typeof value === 'object') td.append(value); else td.textContent = value || '정보 없음'; tr.append(th,td); tbody.append(tr); }
  table.append(tbody); detailBody.append(table);
  detailBody.append(node('p','신청 접수는 확정 전 상태입니다. 관리자가 숙소 가능 여부를 확인한 뒤 확정합니다. 숙소 위치·연락처와 회원 연락처는 현재 등록 정보이며, 가격은 신청 당시 금액입니다.'));
  dialog.showModal();
}
try {
  const service = await connect();
  service.authSDK.onAuthStateChanged(service.auth, async user => {
    const currentVersion = ++version; unsubscribe?.(); list.replaceChildren(); dialog.close(); detailBody.replaceChildren();
    if (!user) { status.textContent = '로그인후 예약하시오'; return; }
    try {
      const profile = await memberProfile(service,user);
      const { get, ref, query, orderByChild, equalTo, onValue } = service.dbSDK;
      // 공개 카탈로그만 읽습니다. 비활성 숙소의 개인정보/권한을 확대하지 않습니다.
      const catalog = await Promise.allSettled([
        get(query(ref(service.db,'stays'),orderByChild('status'),equalTo('active'))),
        get(query(ref(service.db,'destinations'),orderByChild('status'),equalTo('published')))
      ]);
      if (version !== currentVersion) return;
      const stays = catalog[0].status === 'fulfilled' ? catalog[0].value.val() || {} : {};
      const destinations = catalog[1].status === 'fulfilled' ? catalog[1].value.val() || {} : {};
      unsubscribe = onValue(query(ref(service.db,'reservations'),orderByChild('memberId'),equalTo(user.uid)), snapshot => {
        if (version !== currentVersion) return;
        if (dialog.open) dialog.close();
        const items = Object.entries(snapshot.val() || {}).sort((a,b) => Number(b[1].createdAt || 0) - Number(a[1].createdAt || 0) || b[0].localeCompare(a[0]));
        status.textContent = items.length ? `예약 ${items.length}건 · 최근 신청 순` : '예약 내역이 없습니다.';
        list.replaceChildren();
        if (!items.length) return;
        const table = node('table'); table.className = 'admin-reservations-table my-bookings-table';
        const columns = node('colgroup');
        for (const width of ['5%','8%','18%','13%','9%','9%','5%','10%','11%','12%']) { const col = node('col'); col.style.width = width; columns.append(col); }
        table.append(columns);
        const thead = node('thead'), headings = node('tr');
        for (const label of ['번호','지역','숙소명','신청일시','체크인','체크아웃','인원','총액','예약 상태','상세·관리']) { const th=node('th',label); th.scope='col'; headings.append(th); }
        thead.append(headings); table.append(thead); const tbody=node('tbody');
        for (const [index,[id,record]] of items.entries()) {
          const stay = stays[record.stayId] || {};
          const info = { name:record.stayNameAtBooking || stay.name || '숙소 정보 없음', region: destinations[stay.destinationId]?.region || (stay.address ? stay.address.split(/\s+/).slice(0,2).join(' ') : '지역 정보 없음'), address:stay.address, phone:stay.phone };
          const row=node('tr');
          [items.length-index,info.region,info.name,appliedAt(record.createdAt),dateLabel(record.checkIn),dateLabel(record.checkOut),`${record.guestCount}명`,money(record.totalPrice)].forEach((value,column) => {
            const cell=node('td');
            if (column === 2) cell.classList.add('cell-align-left');
            if (column === 2) { const name=node('span',value); name.className='reservation-stay-name'; name.title=value; cell.append(name); }
            else cell.textContent=value;
            row.append(cell);
          });
          const stateCell=node('td'); stateCell.append(badge(record.status)); row.append(stateCell);
          const actions=node('td'), group=node('div'); group.className='booking-actions';
          const details=node('button','자세히'); details.type='button'; details.className='pastel-button action-detail'; details.setAttribute('aria-label',`${info.name} 예약 상세 보기`); details.addEventListener('click',() => showDetails(id,record,info,profile)); group.append(details);
          if (['requested','confirmed'].includes(record.status)) {
            const cancel=node('button','취소 요청'); cancel.type='button'; cancel.className='pastel-button state-cancel_requested';
            cancel.addEventListener('click',async () => {
              if (!confirm('관리자에게 취소를 요청할까요? 관리자 처리 후 취소가 완료됩니다.')) return;
              cancel.disabled=true;
              try { await changeStatus(service,id,record.status,'cancel_requested'); alert('취소 요청이 접수되었습니다.'); }
              catch(error) { alert(error.message || '취소 요청에 실패했습니다.'); cancel.disabled=false; }
            }); group.append(cancel);
          }
          actions.append(group); row.append(actions); tbody.append(row);
        }
        table.append(tbody); list.append(table);
      }, () => { if (version === currentVersion) { list.replaceChildren(); status.textContent='예약 정보를 읽지 못했습니다. 권한과 연결을 확인하세요.'; } });
    } catch(error) { if (version === currentVersion) status.textContent = error.code ? '예약 정보를 읽지 못했습니다. 권한과 연결을 확인하세요.' : error.message; }
  });
} catch(error) { status.textContent=error.message; }
