import { connect, isAdmin } from '../firebase.js';
import { dateLabel, statusLabels, changeStatus } from '../reservations.js';
const status = document.querySelector('#admin-status');
const root = document.querySelector('#admin-root');
const list = document.querySelector('#admin-list');
const dialog = document.querySelector('#record-dialog');
const body = document.querySelector('#record-body');
let service, section = 'overview', data = {};
let page = 1, pageSize = 10;
const titles = { overview: '운영 대시보드', destinations: '여행지 관리', stays: '숙소 관리', reservations: '예약 확인', members: '회원정보' };
const schemas = {
  destinations: [['name','여행지 이름'],['region','지역'],['address','주소'],['summary','한 줄 소개'],['description','상세 설명'],['imageUrl','이미지 URL'],['status','상태','draft,published,hidden']],
  stays: [['destinationId','여행지 ID'],['name','숙소 이름'],['address','주소'],['description','상세 설명'],['phone','연락처'],['pricePerNight','1박 가격','number'],['maxGuests','최대 인원','number'],['imageUrl','이미지 URL'],['status','상태','active,inactive']]
};
function node(tag, text) { const n = document.createElement(tag); if (text !== undefined) n.textContent = text; return n; }
async function authorized() { if (!await isAdmin(service.auth.currentUser)) throw new Error('관리자 권한이 필요합니다.'); }
async function load() {
  await authorized(); status.textContent = '데이터를 불러오는 중…';
  const paths = ['destinations','stays','members','reservations'];
  const snapshots = await Promise.all(paths.map(path => service.dbSDK.get(service.dbSDK.ref(service.db, path))));
  await authorized();
  data = Object.fromEntries(paths.map((path,i) => [path,snapshots[i].val() || {}]));
  status.textContent = '실제 Firebase 데이터 · 삭제는 비활성화로 처리됩니다.'; render();
}
function render() {
  document.querySelector('#section-title').textContent = titles[section];
  document.querySelectorAll('[data-section]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.section === section)));
  document.querySelector('#new-record').hidden = !schemas[section];
  const stats = document.querySelector('#stats'); stats.replaceChildren();
  stats.hidden = section !== 'overview';
  for (const [key,label] of [['members','회원'],['destinations','여행지'],['stays','숙소'],['reservations','예약']]) {
    const card = node('div'); card.className='stat'; card.append(node('span', label),node('strong',Object.keys(data[key] || {}).length)); stats.append(card);
  }
  const key = section === 'overview' ? 'reservations' : section;
  const search = document.querySelector('#admin-search').value.trim().toLowerCase();
  document.querySelector('#member-filter-control').hidden = key !== 'members';
  const memberFilter=document.querySelector('#member-filter').value;
  const statusFilter = document.querySelector('#reservation-status-filter').value;
  document.querySelector('#status-filter-control').hidden = key !== 'reservations';
  const stayName = r => r.stayNameAtBooking || data.stays?.[r.stayId]?.name || '숙소 정보 없음';
  const rows = Object.entries(data[key] || {}).filter(([id,r]) => (key !== 'members' || memberFilter === 'all' || (memberFilter === 'withdrawn' ? r.withdrawn === true : r.withdrawn !== true)) && (key !== 'reservations' || statusFilter === 'all' || r.status === statusFilter) && [id,r.name,r.email,r.memberId,r.stayId,key === 'reservations' ? stayName(r) : '',key === 'reservations' ? data.members[r.memberId]?.email : '',key === 'reservations' ? data.members[r.memberId]?.name : '',r.status,r.checkIn].some(v => String(v || '').toLowerCase().includes(search))).sort((a,b) => (b[1].createdAt || 0)-(a[1].createdAt || 0));
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  page = Math.min(page, totalPages);
  renderPagination(rows.length, totalPages);
  list.replaceChildren();
  if (!rows.length) { list.append(node('p','표시할 데이터가 없습니다.')); return; }
  const table = node('table'); const head=node('tr');
  if (key === 'reservations') {
    table.className = 'admin-reservations-table';
    const columns = node('colgroup');
    for (const width of ['5%','17%','24%','12%','21%','10%','11%']) { const col=node('col'); col.style.width=width; columns.append(col); }
    table.append(columns);
  }
  const headings = key === 'reservations' ? ['번호','예약번호','숙소명','상태','회원 이메일','성명','상세·관리'] : key === 'members' ? ['성명','회원 구분','이메일','누적 방문횟수','최종 방문일시','상세·관리'] : ['이름 / 예약번호','상태','이메일 / 연결 정보','상세·관리'];
  headings.forEach(t => head.append(node('th',t))); table.append(head);
  rows.slice((page - 1) * pageSize, page * pageSize).forEach(([id,r],index) => {
    const row=node('tr');
    if (key === 'reservations') {
      const state = node('strong',statusLabels[r.status] || r.status); state.className = `reservation-badge state-${Object.hasOwn(statusLabels,r.status) ? r.status : 'unknown'}`;
      const stateCell = node('td'); stateCell.append(state);
      const stayCell = node('td'), stayText = node('span',stayName(r)); stayText.className='reservation-stay-name'; stayText.title=stayName(r); stayCell.append(stayText);
      row.append(node('td',rows.length - (page - 1) * pageSize - index),node('td',id),stayCell,stateCell,node('td',data.members[r.memberId]?.email || '회원 정보 없음'),node('td',data.members[r.memberId]?.name || '—'));
    }
    else if (key === 'members') row.append(node('td',r.name || '—'),node('td',r.withdrawn === true ? '탈퇴회원' : r.status === 'suspended' ? '활동회원 · 이용 정지' : '활동회원'),node('td',r.email || '—'),node('td',`${Number(r.visitCount || 0).toLocaleString('ko-KR')}회`),node('td',typeof r.lastVisitedAt === 'number' ? new Date(r.lastVisitedAt).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'}) : '방문 기록 없음'));
    else row.append(node('td',r.name || id),node('td',statusLabels[r.status] || r.status),node('td',r.email || r.stayId || r.destinationId || r.region || '—'));
    const actions=node('td');
    function action(label, handler) { const b=node('button',label); b.addEventListener('click', () => Promise.resolve().then(handler).catch(error => alert(error.message || '처리 실패'))); actions.append(b); }
    action('자세히',() => details(key,id,r));
    if (schemas[key]) {
      action('수정',() => edit(key,id,r));
      action('삭제(비활성화)',async () => {
        if (!confirm('예약 기록을 보존하기 위해 영구 삭제하지 않고 비활성화합니다. 계속할까요?')) return;
        await authorized(); await service.dbSDK.update(service.dbSDK.ref(service.db,`${key}/${id}`),{status:key === 'stays'?'inactive':'hidden',updatedAt:service.dbSDK.serverTimestamp()}); await load();
      });
    }
    row.append(actions);
    if (key === 'reservations') { row.children[1].classList.add('cell-align-left'); row.children[2].classList.add('cell-align-left'); }
    else if (key === 'stays') row.children[0].classList.add('cell-align-left');
    table.append(row);
  }); list.append(table);
}
function renderPagination(total, totalPages) {
  const nav = document.querySelector('#pagination'); nav.replaceChildren();
  const summary = node('span', total ? `총 ${total}건 · ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, total)}건` : '총 0건');
  summary.className = 'page-summary'; summary.setAttribute('role','status'); nav.append(summary);
  function button(label, target, disabled = false) {
    const b = node('button',label); b.type = 'button'; b.disabled = disabled;
    if (target === page && /^\d+$/.test(label)) b.setAttribute('aria-current','page');
    b.addEventListener('click', () => { page = target; render(); }); nav.append(b);
  }
  const blockSize = 5;
  const first = Math.floor((page - 1) / blockSize) * blockSize + 1;
  const last = Math.min(totalPages,first + blockSize - 1);
  button('첫페이지',1,page === 1);
  if (first > 1) button('이전블록',first - blockSize);
  for (let number = first; number <= last; number++) button(String(number),number);
  if (last < totalPages) button('다음블록',last + 1);
  button('마지막페이지',totalPages,page === totalPages);
}
const fieldLabels = { visitCount:'누적 방문횟수', lastVisitedAt:'최종 방문일시', withdrawn:'탈퇴 여부', id:'식별번호', name:'이름', region:'지역', address:'주소', summary:'한 줄 소개', description:'상세 설명', imageUrl:'이미지 URL', status:'상태', createdAt:'등록 일시', updatedAt:'수정 일시', destinationId:'연결 여행지', stayId:'숙소 ID', memberId:'회원 UID', email:'이메일', phone:'연락처', pricePerNight:'1박 가격', maxGuests:'최대 인원', checkIn:'체크인', checkOut:'체크아웃', guestCount:'예약 인원', nightlyPriceAtBooking:'예약 당시 1박 가격', totalPrice:'예약 총액', stayNameAtBooking:'예약 당시 숙소명', member:'예약자 성명', memberEmail:'예약자 이메일', stay:'숙소명', reservations:'예약 이력' };
function detailTable(values) {
  const table = node('table'); table.className = 'detail-table';
  const head = node('thead'), heading = node('tr'); heading.append(node('th','제목'),node('th','내용')); head.append(heading); table.append(head);
  const tbody = node('tbody');
  for (const [field,value] of Object.entries(values)) {
    const row = node('tr'), title = node('th',fieldLabels[field] || field), cell = node('td'); title.scope = 'row';
    if (value && typeof value === 'object') {
      if (Object.keys(value).length) {
        for (const [id,record] of Object.entries(value)) { cell.append(node('h3',`예약번호 ${id}`),detailTable(record)); }
      } else cell.textContent = '내역이 없습니다.';
    } else {
      let display = value ?? '—';
      if (['createdAt','updatedAt','lastVisitedAt'].includes(field) && typeof value === 'number') display = new Date(value).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'});
      if (['checkIn','checkOut'].includes(field)) display = dateLabel(value);
      if (['pricePerNight','nightlyPriceAtBooking','totalPrice'].includes(field) && typeof value === 'number') display = `${value.toLocaleString('ko-KR')}원`;
      if (field === 'status') display = statusLabels[value] || ({active:'활성',inactive:'비활성',draft:'임시저장',published:'공개',hidden:'숨김',suspended:'이용 정지'}[value]) || value;
      if(field === 'withdrawn') display=value === true ? '탈퇴' : '활동';
      cell.textContent = display;
    }
    row.append(title,cell); tbody.append(row);
  }
  table.append(tbody); return table;
}
function details(key,id,record) {
  document.querySelector('#record-title').textContent = '상세 정보'; body.replaceChildren();
  const values = { id, ...record };
  // 회원 상세에는 같은 회원의 예약 이력을 함께 표시합니다.
  if (key === 'members') values.reservations = Object.fromEntries(Object.entries(data.reservations || {}).filter(([,r]) => r.memberId === id));
  if (key === 'reservations') { values.member = data.members[record.memberId]?.name || '회원 정보 없음'; values.memberEmail = data.members[record.memberId]?.email || '회원 정보 없음'; values.phone = data.members[record.memberId]?.phone || '연락처 없음'; values.stay = record.stayNameAtBooking || data.stays[record.stayId]?.name || '숙소 정보 없음'; }
  if (key === 'stays') values.destinationId = data.destinations[record.destinationId]?.name || record.destinationId;
  body.append(detailTable(values));
  if (key === 'reservations') {
    body.append(node('p','확정 전 숙소에 직접 가능 여부를 확인하세요. 신청 당시 금액은 보존되며 실시간 재고는 보장되지 않습니다.'));
    const options = record.status === 'requested' ? [['confirmed','예약 확정'],['rejected','신청 거절']] : record.status === 'cancel_requested' ? [['canceled','취소 승인']] : record.status === 'confirmed' && typeof record.checkOut === 'number' && record.checkOut <= Date.now() + 32400000 ? [['completed','이용 완료']] : [];
    const actionGroup = node('div'); actionGroup.className = 'reservation-actions';
    const feedback = node('p'); feedback.setAttribute('role','status');
    body.append(actionGroup,feedback);
    for (const [next,label] of options) {
      const button=node('button',label); button.className=`pastel-button state-${next}`;
      button.addEventListener('click',async () => {
        if (!confirm(`${label} 처리할까요?`)) return;
        actionGroup.querySelectorAll('button').forEach(b => { b.disabled=true; });
        feedback.textContent='예약 상태를 저장하고 있습니다…';
        try { await authorized(); await changeStatus(service,id,record.status,next); dialog.close(); await load(); alert('예약 상태가 변경되었습니다.'); }
        catch (error) { feedback.textContent=error.message || '처리에 실패했습니다.'; alert(feedback.textContent); actionGroup.querySelectorAll('button').forEach(b => { b.disabled=false; }); }
      }); actionGroup.append(button);
    }
  }
  dialog.showModal();
}
function edit(key,id,record={}) {
  document.querySelector('#record-title').textContent = id ? '정보 수정' : '새로 등록'; body.replaceChildren();
  const form=node('form'); form.className='account-form';
  schemas[key].forEach(([field,label,type]) => {
    const wrapper=node('label',label); let input;
    if (type?.includes(',')) { input=node('select'); type.split(',').forEach(value => { const option=node('option',value); option.value=value; input.append(option); }); }
    else { input=node(field === 'description' ? 'textarea' : 'input'); if (input.tagName === 'INPUT') input.type=type === 'number'?'number':field === 'imageUrl'?'url':'text'; }
    input.name=field; input.required=true; input.value=record[field] ?? (type?.includes(',')?type.split(',')[0]:'');
    if (type === 'number') { input.min=field === 'maxGuests'?'1':'0'; input.step='1'; }
    if (input.tagName !== 'SELECT') input.maxLength=field === 'description'?5000:500;
    wrapper.append(input); form.append(wrapper);
  });
  const submit=node('button','저장'); submit.type='submit'; submit.className='primary-button'; form.append(submit);
  form.addEventListener('submit',async event => {
    event.preventDefault(); submit.disabled=true;
    try {
      await authorized();
      const values=Object.fromEntries(new FormData(form));
      if (key === 'stays') {
        if (!data.destinations[values.destinationId]) throw new Error('존재하는 여행지 ID를 입력하세요.');
        for (const field of ['pricePerNight','maxGuests']) { values[field]=Number(values[field]); if (!Number.isSafeInteger(values[field]) || values[field] < (field === 'maxGuests'?1:0)) throw new Error('가격·인원을 확인하세요.'); }
      }
      if (!/^https?:\/\//.test(values.imageUrl)) throw new Error('이미지는 http 또는 https URL을 입력하세요.');
      const reference=id?service.dbSDK.ref(service.db,`${key}/${id}`):service.dbSDK.push(service.dbSDK.ref(service.db,key));
      await service.dbSDK.update(reference,{...values,createdAt:record.createdAt ?? service.dbSDK.serverTimestamp(),updatedAt:service.dbSDK.serverTimestamp()});
      dialog.close(); await load(); alert('저장되었습니다.');
    } catch(error) { alert(error.message || '저장에 실패했습니다.'); } finally { submit.disabled=false; }
  }); body.append(form); dialog.showModal();
}
document.querySelector('#close-record').addEventListener('click',() => dialog.close());
document.querySelector('.admin-sidebar').addEventListener('click',event => { const b=event.target.closest('[data-section]'); if(b) { section=b.dataset.section; page=1; if(section === 'members') document.querySelector('#member-filter').value='active'; document.querySelector('#admin-search').value=''; render(); } });
document.querySelector('#admin-search').addEventListener('input',() => { page=1; render(); });
document.querySelector('#member-filter').addEventListener('change',()=>{page=1;render();});
document.querySelector('#page-size').addEventListener('change',event => { pageSize=Number(event.target.value); page=1; render(); });
document.querySelector('#reservation-status-filter').addEventListener('change',() => { page=1; render(); });
document.querySelector('#new-record').addEventListener('click',() => edit(section));
document.querySelector('#refresh-data').addEventListener('click',() => load().catch(error => { status.textContent=error.message; }));
try {
  service=await connect();
  service.authSDK.onAuthStateChanged(service.auth,async user => {
    root.hidden=true; data={}; list.replaceChildren(); dialog.close();
    if (!await isAdmin(user)) { status.textContent='관리자 로그인이 필요합니다.'; return; }
    try { await load(); root.hidden=false; } catch { status.textContent='관리자 데이터를 읽지 못했습니다. Firebase 연결과 Database Rules를 확인하세요.'; }
  });
} catch(error) { status.textContent=error.message; }
