import { connect } from './firebase.js';
let destinations = [];
let loaded = false;
let loadError = '';
const grid = document.querySelector('#destination-grid');
const searchInput = document.querySelector('#search-input');
const regionSelect = document.querySelector('#region-select');
const dialog = document.querySelector('#detail-dialog');
const dialogAction = document.querySelector('#dialog-action');
let previousFocus, selectedDestination;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function imageFor(item) {
  const image = element('img');
  if (/^https?:\/\//.test(item.imageUrl || '')) image.src = item.imageUrl;
  else image.hidden = true;
  image.alt = item.name;
  image.loading = 'lazy';
  image.addEventListener('error', () => { image.hidden = true; }, { once: true });
  return image;
}
function showDetail(item) {
  selectedDestination = item;
  previousFocus = document.activeElement;
  document.querySelector('#dialog-region').textContent = item.region;
  document.querySelector('#dialog-title').textContent = item.name;
  const image = document.querySelector('#dialog-image');
  image.hidden = true;
  image.removeAttribute('src');
  image.alt = item.name;
  image.onerror = () => { image.hidden = true; };
  if (/^https?:\/\//.test(item.imageUrl || '')) { image.src = item.imageUrl; image.hidden = false; }
  document.querySelector('#dialog-description').textContent = item.summary || '';
  const description = document.querySelector('#dialog-admin-description');
  description.textContent = item.description || item.summary || '등록된 소개 내용이 없습니다.';
  dialogAction.hidden = false;
  dialog.showModal();
}
function renderDestinations(announce = false) {
  const query = searchInput.value.trim().toLocaleLowerCase('ko');
  const region = regionSelect.value;
  const items = destinations.filter(item => (region === 'all' || item.region === region) && `${item.name} ${item.region} ${item.description}`.toLocaleLowerCase('ko').includes(query));
  if (announce) document.dispatchEvent(new CustomEvent('destination-stays-selected', { detail: { ids: items.map(item => item.id), label: region === 'all' ? (query || '선택한 여행지') : region, scroll: false } }));
  grid.replaceChildren();
  items.forEach(item => {
    const card = element('button', 'destination-card');
    card.type = 'button';
    card.setAttribute('aria-label', `${item.name} 여행지 소개 보기`);
    const cover = element('div', 'destination-image');
    cover.append(imageFor(item), element('span', 'image-tag', item.region));
    const title = element('h3', '', item.name);
    const arrow = element('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    title.append(arrow);
    card.append(cover, title, element('p', '', item.summary || item.description));
    card.addEventListener('click', () => showDetail(item));
    grid.append(card);
  });
  document.querySelector('#empty-state').hidden = !loaded || Boolean(loadError) || items.length > 0;
  document.querySelector('#search-status').textContent = loadError || (!loaded ? '등록된 여행지를 불러오는 중…' : `여행지 ${items.length}곳`);
  document.querySelectorAll('[data-region]').forEach(button => {
    const active = button.dataset.region === region;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
}
document.querySelector('#search-form').addEventListener('submit', event => {
  event.preventDefault();
  renderDestinations(true);
  document.querySelector('#destinations').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});
document.querySelector('.filter-row').addEventListener('click', event => {
  const button = event.target.closest('[data-region]');
  if (!button) return;
  regionSelect.value = button.dataset.region;
  renderDestinations(true);
});
document.querySelector('#reset-search').addEventListener('click', () => {
  searchInput.value = '';
  regionSelect.value = 'all';
  renderDestinations(true);
  searchInput.focus();
});
document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('close', () => previousFocus?.focus());
dialogAction.addEventListener('click', () => {
  dialog.close();
  if (selectedDestination) document.dispatchEvent(new CustomEvent('destination-stays-selected', { detail: { ids: [selectedDestination.id], label: selectedDestination.name, scroll: true } }));
});
renderDestinations();

async function loadDestinations() {
  try {
    const service = await connect();
    const { ref, query, orderByChild, equalTo, onValue } = service.dbSDK;
    onValue(query(ref(service.db, 'destinations'), orderByChild('status'), equalTo('published')), snapshot => {
      destinations = Object.entries(snapshot.val() || {}).map(([id, value]) => ({ ...value, id })).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0) || b.id.localeCompare(a.id));
      loaded = true; loadError = '';
      const selected = regionSelect.value;
      const regions = [...new Set(destinations.map(item => item.region).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'ko'));
      regionSelect.replaceChildren();
      document.querySelector('.filter-row').replaceChildren();
      for (const [value, label] of [['all', '전체'], ...regions.map(region => [region, region])]) {
        const option = element('option', '', value === 'all' ? '모든 지역' : label); option.value = value; regionSelect.append(option);
        const filter = element('button', 'filter', label); filter.type = 'button'; filter.dataset.region = value;
        document.querySelector('.filter-row').append(filter);
      }
      regionSelect.value = regions.includes(selected) ? selected : 'all';
      renderDestinations();
    }, () => {
      loaded = true; destinations = []; loadError = '여행지 조회에 실패했습니다. Firebase 연결과 공개 여행지 읽기 규칙을 확인하세요.'; renderDestinations();
    });
  } catch (error) { loaded = true; loadError = error.message; renderDestinations(); }
}
loadDestinations();

const backToTop = document.querySelector('.back-to-top');
function updateBackToTop() {
  backToTop.hidden = window.scrollY < 180;
}
window.addEventListener('scroll', updateBackToTop, { passive: true });
window.addEventListener('pageshow', updateBackToTop);
backToTop.addEventListener('click', event => {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
});
updateBackToTop();
