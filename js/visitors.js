import { connect } from './firebase.js';
const container=document.querySelector('#visitor-stats');
function render(today,total){document.querySelector('#visitors-today').textContent=Number(today || 0).toLocaleString('ko-KR');document.querySelector('#visitors-total').textContent=Number(total || 0).toLocaleString('ko-KR');}
if(container){
 try {
  const service=await connect();
  const {ref,onValue}=service.dbSDK;
  onValue(ref(service.db,'visitSummary'),snapshot=>{
    const values=snapshot.val() || {};
    const day=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date());
    render(values.dailyCounts?.[day],values.totalVisitCount);
  },()=>{document.querySelector('#visitor-stats-note').textContent='Firebase 방문 통계 조회 권한을 확인하세요.';});
  let sequence=0;
  service.authSDK.onAuthStateChanged(service.auth,async user=>{
    const turn=++sequence;
    try {
      const headers={};if(user)headers.Authorization=`Bearer ${await user.getIdToken()}`;
      const response=await fetch('/api/visits',{method:'POST',credentials:'same-origin',cache:'no-store',headers});
      if(!response.ok)throw new Error('Statistics unavailable');
      const stats=await response.json();if(turn!==sequence)return;
      render(stats.today,stats.total);
      document.querySelector('#visitor-stats-note').textContent='Firebase 누적 통계 · 한국 날짜 기준 · 브라우저별 하루 1회 / 회원 계정별 하루 1회';
    }catch{if(turn===sequence)document.querySelector('#visitor-stats-note').textContent='저장된 Firebase 통계 표시 · 새 방문 집계에는 Python 서버의 Firebase 인증 설정이 필요합니다.';}
  });
 }catch{document.querySelector('#visitor-stats-note').textContent='Firebase 설정과 방문 통계 서버 연결을 확인하세요.';}
}
