'use strict';

// 화면 미리보기용 콘텐츠. 실제 판매 상품이나 예약 가능 재고가 아닙니다.
const destinations = [
  { name: '제주', region: '제주', tag: '바다와 오름', description: '바람을 따라 걷는 초록빛 섬', image: 'photo-1579169326371-ccb4e63f7889' },
  { name: '강릉', region: '강원', tag: '바다와 커피', description: '파도 소리와 커피 향이 머무는 곳', image: 'photo-1519046904884-53103b34b206' },
  { name: '여수', region: '전남', tag: '낭만과 야경', description: '푸른 바다 위로 번지는 저녁빛', image: 'photo-1476514525535-07fb3b4ae5f1' },
  { name: '경주', region: '경북', tag: '역사와 산책', description: '오래된 시간 사이로 느리게 걷기', image: 'photo-1548115184-bc6544d06a58' }
];
const grid = document.querySelector('#destination-grid');
const searchInput = document.querySelector('#search-input');
const regionSelect = document.querySelector('#region-select');
const dialog = document.querySelector('#detail-dialog');
const dialogAction = document.querySelector('#dialog-action');
let previousFocus;

function photo(id) { return `https://images.unsplash.com/${id}?auto=format&fit=crop&w=800&q=80`; }
function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function imageFor(item) {
  const image = element('img');
  image.src = photo(item.image);
  image.alt = `${item.name} 분위기 참고 이미지 (실제 장소·숙소 사진 아님)`;
  image.loading = 'lazy';
  image.addEventListener('error', () => { image.hidden = true; }, { once: true });
  return image;
}
function showDetail(item, isStay = false) {
  previousFocus = document.activeElement;
  document.querySelector('#dialog-region').textContent = item.region;
  document.querySelector('#dialog-title').textContent = item.name;
  document.querySelector('#dialog-description').textContent = item.description;
  dialogAction.hidden = isStay;
  dialog.showModal();
}
function renderDestinations(announce = false) {
  const query = searchInput.value.trim().toLocaleLowerCase('ko');
  const region = regionSelect.value;
  const items = destinations.filter(item => (region === 'all' || item.region === region) && `${item.name} ${item.region} ${item.description}`.toLocaleLowerCase('ko').includes(query));
  grid.replaceChildren();
  items.forEach(item => {
    const card = element('button', 'destination-card');
    card.type = 'button';
    card.setAttribute('aria-label', `${item.name} 예시 여행지 소개 보기`);
    const cover = element('div', 'destination-image');
    cover.append(imageFor(item), element('span', 'image-tag', item.tag));
    const title = element('h3', '', item.name);
    const arrow = element('span', '', '↗');
    arrow.setAttribute('aria-hidden', 'true');
    title.append(arrow);
    card.append(cover, title, element('p', '', item.description));
    card.addEventListener('click', () => showDetail(item));
    grid.append(card);
  });
  document.querySelector('#empty-state').hidden = items.length > 0;
  document.querySelector('#search-status').textContent = announce ? `예시 여행지 ${items.length}곳을 찾았어요.` : '';
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
  document.querySelector('#stays').scrollIntoView();
});
renderDestinations();

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
