'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logout, watchAuthState } from '@/lib/firebase';
import { storeApi, callApi, calendarApi } from '@/lib/api';
import { startCalendarConnect } from '@/lib/calendarOAuth';

const C = {
  navy:      '#343659',
  bg:        '#5F6071',
  white:     '#FFFFFF',
  gray100:   '#F1F1F1',
  gray400:   '#99A1B0',
  gray600:   '#7E7E7E',
  grayBg:    '#E0E0E0',
  blue:      '#1C6BD4',
  blueLight: '#DBEAFE',
  green:     '#0D8061',
  red:       '#D94038',
};

const CALENDAR_PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'naver',  label: 'Naver'  },
  { id: 'kakao',  label: 'Kakao'  },
];

const CATEGORY_LABELS = {
  reservation: '예약', order: '주문', cancel_refund: '취소/환불',
  complaint: '불만', hours_location: '문의', price: '가격',
  ingredients_allergy: '알레르기', catering_bulk: '단체',
  positive: '칭찬', other: '기타',
};

function parseInfo(call) {
  let info = call?.extracted_info;
  if (typeof info === 'string') { try { info = JSON.parse(info); } catch { info = {}; } }
  return info && typeof info === 'object' ? info : {};
}

function isReservation(call) {
  const info = parseInfo(call);
  const code = info.category_code || call.category;
  return code === 'reservation' || call.category === '예약' || Boolean(info.date && info.time);
}

function formatDateTime(value) {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatTime(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec) {
  if (!sec) return '-';
  const n = Number(sec);
  const m = Math.floor(n / 60);
  const s = n % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function formatMenu(menu) {
  if (!menu) return '';
  if (Array.isArray(menu)) return menu.map(item => typeof item === 'object' ? item.name || '' : String(item)).join(', ');
  return String(menu);
}

// ── 섹션 헤더 ──
function SH({ title, onAll }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0 8px', borderBottom:`1px solid ${C.navy}`, marginBottom: 8 }}>
      <span style={{ fontSize:12, fontWeight:700, color:C.navy }}>{title}</span>
      {onAll && <button onClick={onAll} style={{ fontSize:10, color:C.navy, background:'none', border:'none', cursor:'pointer' }}>전체보기 →</button>}
    </div>
  );
}

// ── 미니 캘린더 ──
function MiniCalendar() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const today = now.getDate();
  const thisYear = now.getFullYear();
  const thisMonth = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days = ['일','월','화','수','목','금','토'];
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  const prevMonth = () => { if (month === 0) { setYear(y=>y-1); setMonth(11); } else setMonth(m=>m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y=>y+1); setMonth(0); } else setMonth(m=>m+1); };
  return (
    <div style={{ padding:'6px 0' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'0 8px', marginBottom:4 }}>
        <button onClick={prevMonth} style={{ background:'none', border:'none', fontSize:14, cursor:'pointer', color:C.navy }}>‹</button>
        <span style={{ fontSize:11, fontWeight:700, color:C.navy }}>{year}년 {month+1}월</span>
        <button onClick={nextMonth} style={{ background:'none', border:'none', fontSize:14, cursor:'pointer', color:C.navy }}>›</button>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)' }}>
        {days.map((d,i) => (
          <div key={d} style={{ textAlign:'center', fontSize:9, fontWeight:500, paddingBottom:2, color: i===0?C.red:i===6?C.blue:C.gray400 }}>{d}</div>
        ))}
        {cells.map((d,i) => {
          const isToday = d===today && year===thisYear && month===thisMonth;
          const col = i%7;
          return (
            <div key={i} style={{ height:19, display:'flex', alignItems:'center', justifyContent:'center' }}>
              {d && (
                <div style={{
                  width:17, height:17, borderRadius:'50%',
                  background: isToday ? C.navy : 'transparent',
                  display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:9, fontWeight: isToday?700:400,
                  color: isToday?C.white : col===0?C.red : col===6?C.blue : C.navy,
                }}>{d}</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display:'flex', gap:8, marginTop:5 }}>
        <div style={{ display:'flex', alignItems:'center', gap:3 }}><div style={{ width:5, height:5, borderRadius:'50%', background:C.blue }} /><span style={{ fontSize:9, color:C.gray400 }}>통화 자동등록</span></div>
        <div style={{ display:'flex', alignItems:'center', gap:3 }}><div style={{ width:5, height:5, borderRadius:'50%', background:C.green }} /><span style={{ fontSize:9, color:C.gray400 }}>수동 등록</span></div>
      </div>
    </div>
  );
}

// ── 통화 카드 ──
function CallCard({ call, connections, defaultProvider, onCreateCalendarEvent, onDelete }) {
  const info = parseInfo(call);
  const category = info.category_code || call.category || 'other';
  const label = CATEGORY_LABELS[category] || '기타';
  const reservation = isReservation(call);
  const menuText = formatMenu(info.menu || info.items);
  return (
    <article style={{ background:C.white, border:`1px solid ${C.gray100}`, borderRadius:12, padding:14, transition:'box-shadow 0.2s' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
          <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:6, background:C.blueLight, color:C.blue }}>{label}</span>
          <span style={{ fontSize:10, color:C.gray400 }}>{formatDateTime(call.created_at)}</span>
          <span style={{ fontSize:10, color:C.gray400 }}>· {formatDuration(call.duration)}</span>
        </div>
        <div style={{ display:'flex', gap:5 }}>
          <Link href={`/calls/${call.id}`} style={{ fontSize:10, border:`1px solid ${C.gray100}`, borderRadius:7, padding:'4px 8px', color:C.navy, textDecoration:'none' }}>상세</Link>
          <button onClick={() => onDelete(call.id)} style={{ fontSize:10, border:`1px solid #FCA5A5`, borderRadius:7, padding:'4px 8px', background:'none', cursor:'pointer', color:C.red }}>삭제</button>
        </div>
      </div>
      <p style={{ fontSize:16, fontWeight:700, color:C.navy, marginBottom:8 }}>{call.caller_number || '발신번호 없음'}</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'4px 16px', fontSize:12, marginBottom:8 }}>
        {info.customer_name && <div style={{ display:'flex', gap:6 }}><span style={{ color:C.gray400, width:48, flexShrink:0 }}>성명</span><span style={{ fontWeight:500, color:C.navy }}>{info.customer_name}</span></div>}
        {info.date         && <div style={{ display:'flex', gap:6 }}><span style={{ color:C.gray400, width:48, flexShrink:0 }}>날짜</span><span style={{ fontWeight:500, color:C.navy }}>{info.date}</span></div>}
        {info.time         && <div style={{ display:'flex', gap:6 }}><span style={{ color:C.gray400, width:48, flexShrink:0 }}>시간</span><span style={{ fontWeight:500, color:C.navy }}>{info.time}</span></div>}
        {info.party_size   && <div style={{ display:'flex', gap:6 }}><span style={{ color:C.gray400, width:48, flexShrink:0 }}>인원</span><span style={{ fontWeight:500, color:C.navy }}>{info.party_size}명</span></div>}
        {menuText          && <div style={{ display:'flex', gap:6 }}><span style={{ color:C.gray400, width:48, flexShrink:0 }}>메뉴</span><span style={{ fontWeight:500, color:C.navy }}>{menuText}</span></div>}
        {info.special_notes && <div style={{ display:'flex', gap:6 }}><span style={{ color:C.gray400, width:48, flexShrink:0 }}>특이사항</span><span style={{ fontWeight:500, color:C.navy }}>{info.special_notes}</span></div>}
      </div>
      {call.summary && (
        <div style={{ background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, padding:'8px 12px', marginBottom:8 }}>
          <p style={{ fontSize:10, fontWeight:700, color:'#15803D', marginBottom:3 }}>AI 요약</p>
          <p style={{ fontSize:12, color:'#14532D', lineHeight:1.55 }}>{call.summary}</p>
        </div>
      )}
      {reservation && (
        <div style={{ display:'flex', flexWrap:'wrap', alignItems:'center', gap:6, paddingTop:8, borderTop:`1px solid ${C.gray100}` }}>
          <span style={{ fontSize:10, color:C.gray400 }}>캘린더 등록:</span>
          <button onClick={() => onCreateCalendarEvent(call.id, defaultProvider)} disabled={!connections.length} style={{ fontSize:10, background:C.blue, color:C.white, border:'none', borderRadius:7, padding:'4px 8px', cursor:'pointer', opacity:connections.length?1:0.5 }}>기본 캘린더</button>
          {connections.map(conn => (
            <button key={conn.provider} onClick={() => onCreateCalendarEvent(call.id, conn.provider)} style={{ fontSize:10, border:`1px solid ${C.gray100}`, borderRadius:7, padding:'4px 8px', background:'none', cursor:'pointer', color:C.navy }}>{conn.provider}</button>
          ))}
          {!connections.length && <span style={{ fontSize:10, color:C.red }}>먼저 캘린더를 연결하세요.</span>}
        </div>
      )}
    </article>
  );
}

// ── 메인 ──
export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [nickname, setNickname]       = useState('사장님');
  const [stores, setStores]           = useState([]);
  const [calls, setCalls]             = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading]         = useState(false);
  const [uploading, setUploading]     = useState(false);
  const [error, setError]             = useState('');
  const [message, setMessage]         = useState('');
  const [activeNav, setActiveNav]     = useState('home');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') setMessage('캘린더 연결 완료');
    if (params.get('calendar_error')) setError(`캘린더 연결 실패: ${params.get('calendar_error')}`);
  }, []);

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) { setAuthLoading(false); router.replace('/login'); return; }
      setNickname(localStorage.getItem('user_nickname') || '사장님');
      setAuthLoading(false);
      await loadAll();
    });
    return () => unsub();
  }, [router]);

  async function loadAll() {
    setLoading(true); setError('');
    try {
      const [storesRes, callsRes, calRes] = await Promise.all([
        storeApi.list(),
        callApi.list({ limit: 200 }),
        calendarApi.listConnections().catch(() => ({ data: { connections: [] } })),
      ]);
      setStores(storesRes.data?.stores || []);
      setCalls(callsRes.data?.calls || []);
      setConnections(calRes.data?.connections || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message || '데이터를 불러오지 못했습니다.');
    } finally { setLoading(false); }
  }

  async function handleConnect(provider) {
    setError('');
    try { await startCalendarConnect(provider); }
    catch (err) { setError(err.message || '캘린더 연결 실패'); }
  }

  async function handleCreateCalendarEvent(callId, provider = null) {
    setError(''); setMessage('');
    try {
      const res = await callApi.createCalendarEvent(callId, provider);
      setMessage(`${res.data?.provider || provider || '기본'} 캘린더에 일정 등록 완료`);
    } catch (err) { setError(err.message || '캘린더 일정 등록 실패'); }
  }

  async function handleDelete(callId) {
    if (!confirm('이 통화를 삭제할까요?')) return;
    try { await callApi.delete(callId); setCalls(prev => prev.filter(c => c.id !== callId)); }
    catch (err) { setError(err.message || '삭제 실패'); }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowed = ['.mp3','.m4a','.wav','.ogg','.mp4'];
    if (!allowed.includes(ext)) { setError('지원하지 않는 파일 형식입니다.'); e.target.value=''; return; }
    const MIME = { m4a:'audio/mp4', mp4:'audio/mp4', mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg' };
    const fmt = ext.slice(1);
    const mime = MIME[fmt] || file.type || 'audio/mp4';
    setUploading(true); setError(''); setMessage('');
    try {
      const uploadRes = await callApi.requestUpload({ storeId: stores[0]?.id || '', fileName: file.name, fileFormat: fmt, mimeType: mime });
      const { call_id, upload_url, upload_headers } = uploadRes.data;
      await callApi.uploadToS3(upload_url, file, upload_headers || { 'Content-Type': mime });
      await callApi.startProcessing(call_id);
      setMessage(`업로드 완료: ${file.name}. AI 분석 중입니다.`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || '업로드 실패');
    } finally { setUploading(false); e.target.value=''; }
  }

  const handleNavSelect = (key) => {
    setActiveNav(key);
    const routes = { calls:'/calls', customers:'/customers', calendar:'/calendar', settings:'/settings' };
    if (routes[key]) router.push(routes[key]);
  };

  const defaultProvider = connections.find(c => c.is_default)?.provider || connections[0]?.provider || null;
  const recentCalls = calls.slice(0, 3);
  const upcomingEvents = useMemo(() =>
    calls.filter(isReservation).slice(0, 5).map(call => {
      const info = parseInfo(call);
      return { time: info.time || '-', title: (info.customer_name || call.caller_number || '발신번호 없음') + ' ' + (call.category || '예약'), sub: info.date || formatDateTime(call.created_at), color: C.blue };
    }), [calls]);

  const navItems = [
    { key:'home',      label:'홈',    icon:'🏠' },
    { key:'calls',     label:'통화관리', icon:'📞' },
    { key:'customers', label:'고객관리', icon:'👥' },
    { key:'calendar',  label:'일정관리', icon:'📅' },
    { key:'settings',  label:'설정',   icon:'⚙️' },
  ];

  const today = new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  if (authLoading) return (
    <main style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:C.bg }}>
      <span style={{ color:C.white, fontSize:14 }}>로딩 중...</span>
    </main>
  );

  return (
    <main style={{ minHeight:'100vh', background:C.bg, fontFamily:'Inter,-apple-system,sans-serif' }}>

      {/* 상단 전체 너비 */}
      <div style={{ padding:'0 20px' }}>
        <div style={{ height:52, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontSize:16, color:'rgba(255,255,255,0.5)', cursor:'pointer' }} onClick={() => router.back()}>←</span>
          <span style={{ fontSize:16, fontWeight:500, color:C.white }}>AI 통화비서</span>
          <button onClick={() => {}} style={{ background:'none', border:'none', fontSize:18, cursor:'pointer', color:C.white }}>🔔</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, paddingBottom:20 }}>
          <p style={{ color:C.white, fontSize:16, fontWeight:700 }}>{today}</p>
          <input ref={fileInputRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.mp4" onChange={handleFileSelect} style={{ display:'none' }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
            width:'100%', padding:'18px', borderRadius:18,
            border:'1.5px dashed rgba(255,255,255,0.5)',
            background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            cursor:'pointer', color:C.white,
          }}>
            <span style={{ fontSize:18 }}>📎</span>
            <span style={{ fontSize:15, fontWeight:700 }}>{uploading ? '업로드 중...' : '통화파일을 추가해주세요.'}</span>
          </button>
          <button style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:C.white }}>
            <span style={{ fontSize:14 }}>☑</span>
            <span style={{ fontSize:12, fontWeight:700 }}>중요 통화 필터링 ON</span>
          </button>
        </div>
      </div>

      {/* 하단: 사이드 네비 + 카드 겹치기 */}
      <div style={{ position:'relative' }}>

        {/* 사이드 네비 */}
        <div style={{ position:'absolute', left:0, top:0, width:68, padding:'16px 0', display:'flex', flexDirection:'column', gap:8, zIndex:1 }}>
          {navItems.map(({ key, label, icon }) => {
            const isActive = activeNav === key;
            return (
              <div key={key} onClick={() => handleNavSelect(key)} style={{
                marginLeft:4, padding: isActive ? '16px 8px' : '13px 8px',
                background: isActive ? C.white : C.grayBg,
                borderRadius:20,
                display:'flex', flexDirection:'column', alignItems:'center', gap:5,
                cursor:'pointer', transition:'all 0.2s',
              }}>
                <span style={{ fontSize:16, opacity: isActive ? 1 : 0.45 }}>{icon}</span>
                <span style={{ fontSize:10, fontWeight: isActive ? 500 : 400, color: isActive ? C.navy : C.gray600 }}>{label}</span>
              </div>
            );
          })}
        </div>

        {/* 콘텐츠 카드 */}
        <div style={{ position:'relative', zIndex:2, marginLeft:48, background:C.white, borderTopLeftRadius:24, borderBottomLeftRadius:24, padding:16, minHeight:440 }}>

          {/* 알림 */}
          {error   && <div style={{ marginBottom:10, padding:'10px 14px', background:'#FEF2F2', border:'1px solid #FCA5A5', borderRadius:8, fontSize:12, color:'#991B1B' }}>{error}</div>}
          {message && <div style={{ marginBottom:10, padding:'10px 14px', background:'#F0FDF4', border:'1px solid #BBF7D0', borderRadius:8, fontSize:12, color:'#15803D' }}>{message}</div>}

          {/* 상단 2열 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

            {/* 최근 분석 통화 */}
            <div>
              <SH title="최근 분석 통화" onAll={() => router.push('/calls')} />
              {recentCalls.length === 0 ? (
                <div style={{ padding:'20px 0', textAlign:'center', color:C.gray400, fontSize:12 }}>분석된 통화가 없어요</div>
              ) : recentCalls.map(call => {
                const name = call.caller_number || '발신번호 없음';
                const first = name.replace(/[^가-힣a-zA-Z0-9]/g,'').slice(0,1) || '?';
                return (
                  <div key={call.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 0' }}>
                    <div style={{ width:30, height:30, borderRadius:'50%', background:C.gray100, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#5F5F5F', flexShrink:0 }}>{first}</div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:4 }}>
                        <span style={{ fontSize:11, fontWeight:700, color:C.navy }}>{name}</span>
                        <span style={{ padding:'2px 6px', borderRadius:999, background:C.gray100, color:'#5F5F5F', fontSize:9 }}>수신</span>
                      </div>
                      <p style={{ fontSize:9, color:C.navy, opacity:0.7, marginTop:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {call.summary ? call.summary.slice(0,20)+'...' : '분석 중'}
                      </p>
                    </div>
                    <span style={{ fontSize:9, color:C.gray400, flexShrink:0 }}>{formatTime(call.created_at)}</span>
                  </div>
                );
              })}
            </div>

            {/* 캘린더 연동 */}
            <div>
              <SH title="캘린더 연동" />
              <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
                {CALENDAR_PROVIDERS.map(p => {
                  const conn = connections.find(c => c.provider === p.id);
                  return (
                    <div key={p.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:C.navy }}>{p.label}</span>
                      {conn ? (
                        <span style={{ fontSize:10, padding:'2px 8px', borderRadius:999, background:'#DCFCE7', color:'#15803D' }}>연결됨</span>
                      ) : (
                        <button onClick={() => handleConnect(p.id)} style={{ fontSize:10, background:C.blue, color:C.white, border:'none', borderRadius:7, padding:'4px 8px', cursor:'pointer' }}>연결</button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* 하단 2열 */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <SH title="캘린더" onAll={() => router.push('/calendar')} />
              <MiniCalendar />
            </div>
            <div>
              <SH title="다가오는 일정" onAll={() => router.push('/calendar')} />
              <div style={{ display:'flex', flexDirection:'column', gap:10, paddingTop:6 }}>
                {upcomingEvents.length === 0 ? (
                  <div style={{ color:C.gray400, fontSize:12, padding:'8px 0' }}>예정된 일정이 없어요</div>
                ) : upcomingEvents.map((ev, i) => (
                  <div key={i} style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:4, width:42, flexShrink:0 }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:ev.color, flexShrink:0 }} />
                      <span style={{ fontSize:10, fontWeight:700, color:ev.color }}>{ev.time}</span>
                    </div>
                    <div>
                      <p style={{ fontSize:10, fontWeight:700, color:C.navy, marginBottom:2 }}>{ev.title}</p>
                      <p style={{ fontSize:9, color:C.gray400 }}>{ev.sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 전체 통화 목록 */}
          {calls.length > 0 && (
            <div style={{ marginTop:16 }}>
              <SH title="전체 통화" onAll={() => router.push('/calls')} />
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginTop:10 }}>
                {loading && !calls.length ? (
                  <div style={{ textAlign:'center', padding:'24px 0', color:C.gray400, fontSize:12 }}>불러오는 중...</div>
                ) : calls.map(call => (
                  <CallCard key={call.id} call={call} connections={connections} defaultProvider={defaultProvider} onCreateCalendarEvent={handleCreateCalendarEvent} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {!loading && calls.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 16px', borderRadius:12, border:`1px dashed ${C.gray100}`, marginTop:16 }}>
              <div style={{ fontSize:28, marginBottom:10 }}>📭</div>
              <p style={{ fontSize:14, fontWeight:700, color:C.navy, marginBottom:4 }}>아직 통화가 없어요</p>
              <p style={{ fontSize:12, color:C.gray400 }}>녹음 파일을 업로드하거나 앱에서 자동 동기화를 시작하세요.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}