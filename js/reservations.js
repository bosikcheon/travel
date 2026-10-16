export const DAY = 86400000;
export const statusLabels = { requested: '신청 접수', confirmed: '예약 확정', rejected: '신청 거절', cancel_requested: '취소 요청', canceled: '취소 완료', completed: '이용 완료' };
export function dateLabel(value) {
  return typeof value === 'number' ? new Date(value).toISOString().slice(0, 10) : String(value || '');
}
export function today() { return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' }).format(new Date()); }
export function quote(stay, checkIn, checkOut, guests) {
  const start = Date.parse(checkIn + 'T00:00:00Z');
  const end = Date.parse(checkOut + 'T00:00:00Z');
  const nights = (end - start) / DAY;
  if (!Number.isFinite(start) || !Number.isFinite(end)) throw new Error('체크인과 체크아웃 날짜를 모두 입력하세요.');
  if (end <= start) throw new Error('체크아웃은 체크인 다음 날 이후로 선택하세요.');
  if (checkIn < today()) throw new Error('체크인은 오늘 이후 날짜로 선택하세요.');
  if (start > Date.parse(today() + 'T00:00:00Z') + 365 * DAY) throw new Error('체크인은 오늘부터 1년 이내로 선택하세요.');
  if (!Number.isInteger(nights) || nights > 30) throw new Error('숙박 기간은 최대 30박까지 신청할 수 있습니다.');
  if (!Number.isInteger(guests) || guests < 1 || guests > stay.maxGuests) throw new Error(`인원은 1~${stay.maxGuests}명으로 입력하세요.`);
  if (!Number.isSafeInteger(stay.pricePerNight) || stay.pricePerNight < 0) throw new Error('숙소 가격 설정을 확인해야 합니다.');
  return { checkIn: start, checkOut: end, guestCount: guests, nightlyPriceAtBooking: stay.pricePerNight, totalPrice: nights * stay.pricePerNight, nights };
}
export async function changeStatus(service, id, expected, next) {
  const { ref, onValue, runTransaction, serverTimestamp } = service.dbSDK;
  const reference = ref(service.db, `reservations/${id}`);
  let unsubscribe;
  try {
    // get()로 조회한 목록이 트랜잭션의 로컬 캐시에 없으면 첫 값은 null일 수 있습니다.
    // 대상 예약을 구독해 캐시를 채운 상태에서 트랜잭션을 시작합니다.
    const snapshot = await new Promise((resolve, reject) => {
      unsubscribe = onValue(reference, resolve, reject);
    });
    if (!snapshot.exists()) throw new Error('예약 정보가 없습니다. 목록을 새로고침하세요.');
    const result = await runTransaction(reference, current => {
      if (!current || current.status !== expected) return;
      return { ...current, status: next, updatedAt: serverTimestamp() };
    }, { applyLocally: false });
    if (!result.committed) throw new Error('예약 상태가 이미 변경되었습니다. 새로고침 후 확인하세요.');
  } catch (error) {
    if (/permission.denied/i.test(error.code || error.message || '')) throw new Error('예약 변경 권한이 거부되었습니다. 관리자 계정과 Firebase에 게시된 최신 보안 규칙을 확인하세요.');
    throw error;
  } finally { unsubscribe?.(); }
}
