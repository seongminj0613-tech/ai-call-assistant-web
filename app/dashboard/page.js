'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { storeApi, callApi, calendarConnectApi } from '@/lib/api';

// ── 색상 (앱과 동일) ──
const DarkNavy    = '#3D4D6B';
const DarkNavy2   = '#4A5A78';
const AccentBlue  = '#3B7DD8';
const LightBg     = '#F0F2F5';
const White       = '#FFFFFF';

const CATEGORY_INFO = {
  reservation:   { label: '예약', bg: '#E3EEFB', fg: '#2563B5' },
  order:         { label: '주문', bg: '#E3EEFB', fg: '#2563B5' },
  cancel_refund: { label: '취소', bg: '#FBE3E3', fg: '#C23B3B' },
  complaint:     { label: '불만', bg: '#FBE3E3', fg: '#C23B3B' },
  hours_location:{ label: '문의', bg: '#EBE9FB', fg: '#5B4FC2' },
  price:         { label: '문의', bg: '#EBE9FB', fg: '#5B4FC2' },
  positive:      { label: '칭찬', bg: '#E3FBED', fg: '#1A7A3C' },
  other:         { label: '기타', bg: '#E8EBF0', fg: '#6B7889' },
};

const KO_MAP = {
  '예약':'reservation','주문':'order','취소':'cancel_refund',
  '불만':'complaint','문의':'hours_location','기타':'other','칭찬':'positive',
};

const WEEKDAYS = ['일','월','화','수','목','금','토'];
const MONTHS = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];

function getCatInfo(call) {
  let info = call.extracted_info;
  if (typeof info === 'string') { try { info = JSON.parse(info); } catch { info = null; } }
  const code = info?.category_code || KO_MAP[call.category] || 'other';
  return CATEGORY_INFO[code] || CATEGORY_INFO.other;
}

function formatTime(s) {
  if (!s) return '';
  const d = new Date(s);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function formatDuration(sec) {
  if (!sec) return '';
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}

function buildCustomers(calls) {
  const map = {};
  calls.filter(c => c.caller_number).forEach(c => {
    const p = c.caller_number;
    if (!map[p]) map[p] = [];
    map[p].push(c);
  });
  return Object.entries(map).map(([phone, cs]) => {
    const sorted = [...cs].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const latest = sorted[0];
    let info = latest.extracted_info;
    if (typeof info==='string'){try{info=JSON.parse(info);}catch{info=null;}}
    const name = cs.map(c=>{let i=c.extracted_info;if(typeof i==='string'){try{i=JSON.parse(i);}catch{i=null;}}return i?.customer_name;}).find(n=>n&&n.trim());
    return { phone, name: name||null, callCount: cs.length, lastCall: latest, summary: latest.summary };
  }).sort((a,b)=>b.callCount-a.callCount).slice(0,5);
}

// ── 사이드 네비 ──
const NAV = [
  { href:'/dashboard', label:'홈',   icon:'🏠' },
  { href:'/calls',     label:'통화',  icon:'📞' },
  { href:'/customers', label:'고객',  icon:'👥' },
  { href:'/calendar',  label:'일정',  icon:'📅' },
  { href:'/settings',  label:'설정',  icon:'⚙️' },
];

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [nickname, setNickname] = useState('사용자');
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [stores, setStores] = useState([]);
  const [events, setEvents] = useState([]);
  const [autoSummary, setAutoSummary] = useState(false);
  const [importantFilter, setImportantFilter] = useState(true);
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [selectedDay, setSelectedDay] = useState(new Date().getDate());
  const now = new Date();

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) { setTimeout(()=>router.push('/login'),3000); return; }
      setNickname(localStorage.getItem('user_nickname')||'사용자');
      await loadData();
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stRes, callRes] = await Promise.all([
        storeApi.list(),
        callApi.list({ limit: 200 }),
      ]);
      setStores(stRes.data.stores||[]);
      const allCalls = callRes.data.calls||[];
      setCalls(allCalls);
      // 이번달 일정
      const from = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      const last = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
      const to   = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${last}`;
      calendarConnectApi.getEvents(from, to).then(r=>setEvents(r.data?.events||[])).catch(()=>{});
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || stores.length===0) { e.target.value=''; return; }
    const ext = '.'+file.name.split('.').pop().toLowerCase();
    if (!['.mp3','.m4a','.wav','.ogg','.mp4'].includes(ext)) { e.target.value=''; return; }
    setUploading(true); setUploadProgress(0);
    try {
      const fmt = ext.replace('.','');
      const MIME = {m4a:'audio/mp4',mp4:'audio/mp4',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg'};
      let mime = file.type || MIME[fmt] || 'audio/mp4';
      if (['m4a','mp4'].includes(fmt)) mime='audio/mp4';
      setUploadProgress(15);
      const { data:{ call_id, upload_url } } = await callApi.requestUpload({ storeId:stores[0].id, fileName:file.name, fileFormat:fmt, mimeType:mime });
      setUploadProgress(40);
      await fetch(upload_url,{ method:'PUT', headers:{'Content-Type':mime}, body:file });
      setUploadProgress(80);
      await callApi.startProcessing(call_id);
      setUploadProgress(100);
      await loadData();
    } catch(e){ console.error(e); }
    finally { setUploading(false); setUploadProgress(0); e.target.value=''; }
  };

  // 통계
  const pendingCount = useMemo(()=> calls.filter(c=>c.status==='uploaded').length, [calls]);
  const recentCalls  = useMemo(()=> calls.filter(c=>c.status==='summarized').slice(0,5), [calls]);
  const customers    = useMemo(()=> buildCustomers(calls), [calls]);

  // 캘린더
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const lastDate = new Date(calYear, calMonth+1, 0).getDate();
  const eventsByDay = useMemo(()=>{
    const m={};
    events.forEach(ev=>{
      const d=ev.day_of_month||(ev.start_datetime?new Date(ev.start_datetime).getDate():null);
      if(d){if(!m[d])m[d]=[];m[d].push(ev);}
    });
    return m;
  },[events]);

  const todayEvents = useMemo(()=>{
    const today = now.getDate();
    return (eventsByDay[today]||[]).slice(0,3);
  },[eventsByDay]);

  const prevMonth = ()=>{ if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1); };
  const nextMonth = ()=>{ if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1); };

  const todayStr = `${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:LightBg, fontFamily:"'Pretendard Variable',Pretendard,sans-serif" }}>

      {/* ── 사이드바 ── */}
      <aside style={{ width:72, background:DarkNavy, display:'flex', flexDirection:'column', alignItems:'center', paddingTop:20, paddingBottom:20, flexShrink:0, position:'sticky', top:0, height:'100vh' }}>
        {/* 로고 */}
        <div style={{ width:40, height:40, background:'rgba(255,255,255,0.15)', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:28, fontSize:20 }}>📞</div>
        {NAV.map(item => (
          <Link key={item.href} href={item.href} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'10px 0', width:'100%', textDecoration:'none', color: item.href==='/dashboard' ? White : 'rgba(255,255,255,0.55)', background: item.href==='/dashboard' ? 'rgba(255,255,255,0.12)' : 'transparent', marginBottom:4, transition:'all 0.2s' }}>
            <span style={{ fontSize:20 }}>{item.icon}</span>
            <span style={{ fontSize:10, fontWeight:500 }}>{item.label}</span>
          </Link>
        ))}
      </aside>

      {/* ── 메인 콘텐츠 ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'auto' }}>

        {/* 상단 헤더 */}
        <header style={{ background:DarkNavy, padding:'16px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>router.back()} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:18 }}>←</button>
            <span style={{ color:White, fontWeight:700, fontSize:16 }}>AI 통화비서</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <span style={{ color:'rgba(255,255,255,0.8)', fontSize:13 }}>{nickname}님</span>
            <button style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:20 }}>🔔</button>
          </div>
        </header>

        {/* 날짜 + 통화 대기 */}
        <div style={{ background:DarkNavy, padding:'0 24px 20px', textAlign:'center' }}>
          <p style={{ color:'rgba(255,255,255,0.7)', fontSize:13, marginBottom:12 }}>{todayStr}</p>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
            <button
              onClick={()=>fileInputRef.current?.click()}
              disabled={uploading||stores.length===0}
              style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.15)', border:'none', borderRadius:24, padding:'10px 20px', color:White, fontWeight:600, fontSize:14, cursor:'pointer' }}>
              <span>🔄</span>
              {uploading ? `업로드 중 ${uploadProgress}%` : `통화 분석 대기 ${pendingCount}건`}
            </button>
            <input ref={fileInputRef} type="file" accept="audio/*,.m4a,.mp3,.wav" onChange={handleFileSelect} disabled={uploading} style={{ display:'none' }} />
            <button
              onClick={()=>fileInputRef.current?.click()}
              disabled={uploading||stores.length===0}
              style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:24, padding:'10px 14px', color:White, cursor:'pointer', fontSize:16 }}>
              📤
            </button>
          </div>

        </div>

        {/* 콘텐츠 그리드 */}
        <div style={{ flex:1, padding:20, display:'flex', flexDirection:'column', gap:16 }}>

          {/* 상단 2단 그리드 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* 최근 분석 통화 */}
            <div style={{ background:White, borderRadius:16, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontWeight:700, fontSize:14, color:'#1F2A3D' }}>최근 분석 통화</span>
                <Link href="/calls" style={{ fontSize:12, color:AccentBlue, textDecoration:'none' }}>전체보기 →</Link>
              </div>
              {loading ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:13 }}>불러오는 중...</div>
              ) : recentCalls.length===0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:13 }}>통화가 없어요</div>
              ) : recentCalls.map(call => {
                const cat = getCatInfo(call);
                let info = call.extracted_info;
                if (typeof info==='string'){try{info=JSON.parse(info);}catch{info=null;}}
                const name = info?.customer_name;
                const phone = call.caller_number || '발신번호 없음';
                const direction = call.direction === 'outgoing' ? '발신' : '수신';
                return (
                  <Link key={call.id} href={`/calls/${call.id}`} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F0F2F5', textDecoration:'none', cursor:'pointer' }}>
                    {/* 아바타 */}
                    <div style={{ width:36, height:36, borderRadius:'50%', background:DarkNavy2, display:'flex', alignItems:'center', justifyContent:'center', color:White, fontWeight:700, fontSize:14, flexShrink:0 }}>
                      {(name||phone).slice(0,1).toUpperCase()}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                        <span style={{ fontWeight:600, fontSize:13, color:'#1F2A3D', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                          {name || phone}
                        </span>
                        <span style={{ fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:4, background:cat.bg, color:cat.fg, flexShrink:0 }}>{cat.label}</span>
                        <span style={{ fontSize:10, color:'#9AA5B5', flexShrink:0 }}>{direction}</span>
                      </div>
                      {call.summary && <p style={{ fontSize:11, color:'#6B7889', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{call.summary}</p>}
                    </div>
                    <span style={{ fontSize:11, color:'#9AA5B5', flexShrink:0 }}>{formatTime(call.created_at)}</span>
                  </Link>
                );
              })}
            </div>

            {/* 최근 관리 고객 */}
            <div style={{ background:White, borderRadius:16, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontWeight:700, fontSize:14, color:'#1F2A3D' }}>최근 관리 고객</span>
                <Link href="/customers" style={{ fontSize:12, color:AccentBlue, textDecoration:'none' }}>전체보기 →</Link>
              </div>
              {loading ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:13 }}>불러오는 중...</div>
              ) : customers.length===0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:13 }}>고객이 없어요</div>
              ) : customers.map(c => (
                <Link key={c.phone} href="/customers" style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F0F2F5', textDecoration:'none' }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:AccentBlue, display:'flex', alignItems:'center', justifyContent:'center', color:White, fontWeight:700, fontSize:14, flexShrink:0 }}>
                    {(c.name||c.phone).slice(0,1).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:600, fontSize:13, color:'#1F2A3D', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {c.name || c.phone}
                    </div>
                    {c.summary && <p style={{ fontSize:11, color:'#6B7889', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.summary}</p>}
                  </div>
                  <span style={{ fontSize:10, color:'#9AA5B5', flexShrink:0 }}>{c.callCount}회</span>
                </Link>
              ))}
            </div>
          </div>

          {/* 하단 2단 그리드 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* 캘린더 */}
            <div style={{ background:White, borderRadius:16, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
                <span style={{ fontWeight:700, fontSize:14, color:'#1F2A3D' }}>캘린더</span>
                <Link href="/calendar" style={{ fontSize:12, color:AccentBlue, textDecoration:'none' }}>전체보기 →</Link>
              </div>
              {/* 월 네비 */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <button onClick={prevMonth} style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7889', fontSize:16 }}>‹</button>
                <span style={{ fontWeight:600, fontSize:14, color:'#1F2A3D' }}>{calYear}년 {MONTHS[calMonth]}</span>
                <button onClick={nextMonth} style={{ background:'none', border:'none', cursor:'pointer', color:'#6B7889', fontSize:16 }}>›</button>
              </div>
              {/* 요일 헤더 */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', marginBottom:4 }}>
                {WEEKDAYS.map((d,i)=>(
                  <div key={d} style={{ fontSize:10, fontWeight:600, color: i===0?'#E53E3E':i===6?AccentBlue:'#9AA5B5', padding:'2px 0' }}>{d}</div>
                ))}
              </div>
              {/* 날짜 */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
                {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
                {Array.from({length:lastDate}).map((_,i)=>{
                  const day=i+1;
                  const isToday=calYear===now.getFullYear()&&calMonth===now.getMonth()&&day===now.getDate();
                  const isSel=day===selectedDay;
                  const hasEv=eventsByDay[day]?.length>0;
                  const col=(firstDay+i)%7;
                  return (
                    <button key={day} onClick={()=>setSelectedDay(day)} style={{
                      width:'100%', aspectRatio:'1', border:'none', cursor:'pointer', borderRadius:'50%',
                      background: isToday?DarkNavy:isSel?'#EFF6FF':'transparent',
                      color: isToday?White:col===0?'#E53E3E':col===6?AccentBlue:'#1F2A3D',
                      fontWeight: isToday||isSel?700:400, fontSize:11, position:'relative',
                      display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:1,
                    }}>
                      {day}
                      {hasEv&&<div style={{ width:4, height:4, borderRadius:'50%', background:isToday?'rgba(255,255,255,0.8)':AccentBlue }}/>}
                    </button>
                  );
                })}
              </div>
              {/* 범례 */}
              <div style={{ display:'flex', gap:12, marginTop:8 }}>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#6B7889' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:AccentBlue }}/> 통화 자동등록
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, color:'#6B7889' }}>
                  <div style={{ width:6, height:6, borderRadius:'50%', background:'#3BA876' }}/> 수동 등록
                </div>
              </div>
            </div>

            {/* 다가오는 일정 */}
            <div style={{ background:White, borderRadius:16, padding:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                <span style={{ fontWeight:700, fontSize:14, color:'#1F2A3D' }}>다가오는 일정</span>
                <Link href="/calendar" style={{ fontSize:12, color:AccentBlue, textDecoration:'none' }}>전체보기 →</Link>
              </div>
              {todayEvents.length===0 ? (
                <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:13 }}>
                  오늘 등록된 일정이 없어요
                </div>
              ) : todayEvents.map((ev,i)=>{
                const colors=['#3B7DD8','#3BA876','#B56B8A'];
                const color=colors[i%colors.length];
                const time = ev.time || (ev.start_datetime?new Date(ev.start_datetime).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'');
                return (
                  <div key={ev.id||i} style={{ display:'flex', gap:12, padding:'10px 0', borderBottom:'1px solid #F0F2F5' }}>
                    <div style={{ flexShrink:0, textAlign:'right' }}>
                      <span style={{ fontSize:13, fontWeight:700, color }}>
                        {time}
                      </span>
                    </div>
                    <div style={{ flex:1, borderLeft:`3px solid ${color}`, paddingLeft:10 }}>
                      <div style={{ fontWeight:600, fontSize:13, color:'#1F2A3D', marginBottom:2 }}>{ev.title}</div>
                      {ev.description&&<div style={{ fontSize:11, color:'#6B7889' }}>{ev.description}</div>}
                    </div>
                  </div>
                );
              })}
              {/* 빠른 업로드 */}
              <button
                onClick={()=>fileInputRef.current?.click()}
                disabled={uploading||stores.length===0}
                style={{ marginTop:16, width:'100%', padding:'10px 0', background:DarkNavy, border:'none', borderRadius:10, color:White, fontWeight:600, fontSize:13, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                📤 녹음 파일 업로드
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
