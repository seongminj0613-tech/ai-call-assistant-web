'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logout, watchAuthState } from '@/lib/firebase';
import { storeApi, callApi, calendarApi } from '@/lib/api';
import { startCalendarConnect } from '@/lib/calendarOAuth';
import Logo from '../../app/components/Logo';

// ── 색상 토큰 (피그마 기준) ──────────────────────────
const C = {
  navy:      '#343659',
  bg:        '#5F6071',
  white:     '#FFFFFF',
  gray100:   '#F1F1F1',
  gray400:   '#99A1B0',
  gray600:   '#7E7E7E',
  grayBg:    '#E4E4E4',
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
  reservation:         '예약',
  order:               '주문',
  cancel_refund:       '취소/환불',
  complaint:           '불만',
  hours_location:      '문의',
  price:               '가격',
  ingredients_allergy: '알레르기',
  catering_bulk:       '단체',
  positive:            '칭찬',
  other:               '기타',
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
  if (Array.isArray(menu)) {
    return menu.map(item => {
      if (typeof item === 'object' && item) return [item.name, item.qty ? `${item.qty}` : null].filter(Boolean).join(' ');
      return String(item);
    }).join(', ');
  }
  return String(menu);
}

// ── 사이드 네비 ──────────────────────────────────────
function SideNav({ active, onSelect }) {
  const items = [
    { key: 'home',      label: '홈',    icon: '🏠' },
    { key: 'calls',     label: '통화관리', icon: '📞' },
    { key: 'customers', label: '고객관리', icon: '👥' },
    { key: 'calendar',  label: '일정관리', icon: '📅' },
    { key: 'settings',  label: '설정',   icon: '⚙️' },
  ];
  return (
    <nav style={{
      width: 88, paddingTop: 24, paddingBottom: 24, paddingLeft: 6,
      display: 'flex', flexDirection: 'column', gap: 12, flexShrink: 0,
    }}>
      {items.map(({ key, label, icon }) => {
        const isActive = active === key;
        return (
          <button key={key} onClick={() => onSelect(key)} style={{
            width: '100%', padding: '20px 6px 20px 12px',
            background: isActive ? C.white : C.grayBg,
            borderTopRightRadius: 20, borderBottomRightRadius: 20,
            border: 'none', cursor: 'pointer',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            transition: 'all 0.2s',
          }}>
            <span style={{ fontSize: 18, opacity: isActive ? 1 : 0.45 }}>{icon}</span>
            <span style={{
              fontSize: 12, fontWeight: 500,
              color: isActive ? C.navy : C.gray600,
            }}>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// ── 섹션 헤더 ──────────────────────────────────────
function SectionHeader({ title, onViewAll }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: 8, borderBottom: `1px solid ${C.navy}`,
    }}>
      <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{title}</span>
      {onViewAll && (
        <button onClick={onViewAll} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: 11, fontWeight: 500, color: C.navy,
        }}>전체보기 →</button>
      )}
    </div>
  );
}

// ── 통화 항목 ──────────────────────────────────────
function CallItem({ call }) {
  const name = call.caller_number || '발신번호 없음';
  const first = name.replace(/[^가-힣a-zA-Z0-9]/g, '').slice(0, 1) || '?';
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      padding: '12px 16px 12px 12px',
    }}>
      <div style={{
        width: 34, height: 34, borderRadius: '50%',
        background: C.gray100, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 700, color: '#5F5F5F', flexShrink: 0,
      }}>{first}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: C.navy }}>{name}</span>
          <span style={{
            padding: '3px 8px', borderRadius: 999,
            background: C.gray100, color: '#5F5F5F',
            fontSize: 10, fontWeight: 500,
          }}>수신</span>
        </div>
        <p style={{ fontSize: 11, color: C.navy, margin: '2px 0 0', opacity: 0.7,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {call.summary ? call.summary.slice(0, 18) + '...' : '분석 중'}
        </p>
      </div>
      <span style={{ fontSize: 11, color: C.gray400, flexShrink: 0 }}>
        {formatTime(call.created_at)}
      </span>
    </div>
  );
}

// ── 일정 항목 ──────────────────────────────────────
function ScheduleItem({ time, title, sub, color }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '0 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 52, flexShrink: 0 }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 700, color }}>{time}</span>
      </div>
      <div>
        <p style={{ fontSize: 12, fontWeight: 700, color: C.navy, marginBottom: 3 }}>{title}</p>
        <p style={{ fontSize: 10, color: C.gray400 }}>{sub}</p>
      </div>
    </div>
  );
}

// ── 미니 캘린더 ─────────────────────────────────────
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

  const prevMonth = () => { if (month === 0) { setYear(y => y-1); setMonth(11); } else setMonth(m => m-1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y+1); setMonth(0); } else setMonth(m => m+1); };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '0 16px', marginBottom: 6,
      }}>
        <button onClick={prevMonth} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.navy }}>‹</button>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.navy }}>{year}년 {month+1}월</span>
        <button onClick={nextMonth} style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: C.navy }}>›</button>
      </div>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(7,1fr)',
        padding: '8px 4px', background: C.white, borderRadius: 14,
      }}>
        {days.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center', fontSize: 10, fontWeight: 500, paddingBottom: 4,
            color: i === 0 ? C.red : i === 6 ? C.blue : C.gray400,
          }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const isToday = d === today && year === thisYear && month === thisMonth;
          const col = i % 7;
          return (
            <div key={i} style={{ height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {d && (
                <div style={{
                  width: 22, height: 22, borderRadius: '50%',
                  background: isToday ? C.navy : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: isToday ? 700 : 400,
                  color: isToday ? C.white : col === 0 ? C.red : col === 6 ? C.blue : C.navy,
                }}>{d}</div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 12, padding: '6px 4px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.blue }} />
          <span style={{ fontSize: 10, color: C.gray400 }}>통화 자동등록</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: C.green }} />
          <span style={{ fontSize: 10, color: C.gray400 }}>수동 등록</span>
        </div>
      </div>
    </div>
  );
}

// ── 캘린더 연동 모달 ─────────────────────────────────
function CalendarSection({ connections, onConnect, onSetDefault, onDisconnect, loading, onRefresh }) {
  return (
    <div style={{
      background: C.white, borderRadius: 16,
      padding: 20, marginBottom: 12,
      border: `1px solid ${C.gray100}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div>
          <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, margin: 0 }}>캘린더 연동</p>
          <p style={{ fontSize: 12, color: C.gray400, margin: '2px 0 0' }}>Google / Naver / Kakao 캘린더를 연결합니다.</p>
        </div>
        <button onClick={onRefresh} disabled={loading} style={{
          fontSize: 11, border: `1px solid ${C.gray100}`, borderRadius: 8,
          padding: '6px 10px', background: 'none', cursor: 'pointer', color: C.navy,
        }}>새로고침</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
        {CALENDAR_PROVIDERS.map(p => {
          const conn = connections.find(c => c.provider === p.id);
          return (
            <div key={p.id} style={{ border: `1px solid ${C.gray100}`, borderRadius: 12, padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <span style={{ fontWeight: 700, color: C.navy, fontSize: 13 }}>{p.label}</span>
                <span style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 999,
                  background: conn ? '#DCFCE7' : C.gray100,
                  color: conn ? '#15803D' : C.gray600,
                }}>{conn ? '연결됨' : '미연결'}</span>
              </div>
              {conn && <p style={{ fontSize: 11, color: C.gray400, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {conn.provider_email || conn.provider_nickname || '-'}
              </p>}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {!conn ? (
                  <button onClick={() => onConnect(p.id)} style={{
                    fontSize: 11, background: C.blue, color: C.white,
                    border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
                  }}>연결</button>
                ) : (
                  <>
                    <button onClick={() => onSetDefault(p.id)} disabled={conn.is_default} style={{
                      fontSize: 11, border: `1px solid ${C.gray100}`, borderRadius: 8,
                      padding: '6px 10px', background: 'none', cursor: 'pointer', color: C.navy,
                      opacity: conn.is_default ? 0.5 : 1,
                    }}>{conn.is_default ? '기본' : '기본 설정'}</button>
                    <button onClick={() => onDisconnect(p.id)} style={{
                      fontSize: 11, border: `1px solid #FCA5A5`, borderRadius: 8,
                      padding: '6px 10px', background: 'none', cursor: 'pointer', color: C.red,
                    }}>해제</button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── 통화 카드 (기존 기능 유지) ─────────────────────────
function CallCard({ call, connections, defaultProvider, onCreateCalendarEvent, onDelete }) {
  const info = parseInfo(call);
  const category = info.category_code || call.category || 'other';
  const label = CATEGORY_LABELS[category] || CATEGORY_LABELS.other;
  const reservation = isReservation(call);
  const menuText = formatMenu(info.menu || info.items);

  return (
    <article style={{
      background: C.white, border: `1px solid ${C.gray100}`,
      borderRadius: 14, padding: 16,
      transition: 'box-shadow 0.2s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
            background: C.blueLight, color: C.blue, border: `1px solid ${C.blueLight}`,
          }}>{label}</span>
          <span style={{ fontSize: 11, color: C.gray400 }}>{formatDateTime(call.created_at)}</span>
          <span style={{ fontSize: 11, color: C.gray400 }}>· {formatDuration(call.duration)}</span>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <Link href={`/calls/${call.id}`} style={{
            fontSize: 11, border: `1px solid ${C.gray100}`, borderRadius: 8,
            padding: '6px 10px', color: C.navy, textDecoration: 'none',
          }}>상세</Link>
          <button onClick={() => onDelete(call.id)} style={{
            fontSize: 11, border: `1px solid #FCA5A5`, borderRadius: 8,
            padding: '6px 10px', background: 'none', cursor: 'pointer', color: C.red,
          }}>삭제</button>
        </div>
      </div>

      <p style={{ fontSize: 18, fontWeight: 700, color: C.navy, marginBottom: 10 }}>
        {call.caller_number || '발신번호 없음'}
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 24px', fontSize: 13, marginBottom: 10 }}>
        {info.customer_name && <InfoRow label="성명" value={info.customer_name} />}
        {info.date         && <InfoRow label="날짜" value={info.date} />}
        {info.time         && <InfoRow label="시간" value={info.time} />}
        {info.party_size   && <InfoRow label="인원" value={`${info.party_size}명`} />}
        {menuText          && <InfoRow label="메뉴" value={menuText} />}
        {info.special_notes && <InfoRow label="특이사항" value={info.special_notes} />}
      </div>

      {call.summary && (
        <div style={{
          background: '#F0FDF4', border: '1px solid #BBF7D0',
          borderRadius: 10, padding: '10px 14px', marginBottom: 10,
        }}>
          <p style={{ fontSize: 11, fontWeight: 700, color: '#15803D', marginBottom: 4 }}>AI 요약</p>
          <p style={{ fontSize: 13, color: '#14532D', lineHeight: 1.55 }}>{call.summary}</p>
        </div>
      )}

      {reservation && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8,
          paddingTop: 10, borderTop: `1px solid ${C.gray100}`,
        }}>
          <span style={{ fontSize: 11, color: C.gray400 }}>캘린더 등록:</span>
          <button onClick={() => onCreateCalendarEvent(call.id, defaultProvider)}
            disabled={!connections.length} style={{
              fontSize: 11, background: C.blue, color: C.white,
              border: 'none', borderRadius: 8, padding: '6px 10px', cursor: 'pointer',
              opacity: connections.length ? 1 : 0.5,
            }}>기본 캘린더</button>
          {connections.map(conn => (
            <button key={conn.provider} onClick={() => onCreateCalendarEvent(call.id, conn.provider)} style={{
              fontSize: 11, border: `1px solid ${C.gray100}`, borderRadius: 8,
              padding: '6px 10px', background: 'none', cursor: 'pointer', color: C.navy,
            }}>{conn.provider}</button>
          ))}
          {!connections.length && <span style={{ fontSize: 11, color: C.red }}>먼저 캘린더를 연결하세요.</span>}
        </div>
      )}
    </article>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <span style={{ width: 64, flexShrink: 0, color: C.gray400 }}>{label}</span>
      <span style={{ fontWeight: 500, color: C.navy, wordBreak: 'break-all' }}>{value}</span>
    </div>
  );
}

// ── 메인 페이지 ──────────────────────────────────────
export default function DashboardPage() {
  const router     = useRouter();
  const fileInputRef = useRef(null);

  const [authLoading, setAuthLoading]   = useState(true);
  const [nickname, setNickname]         = useState('사장님');
  const [stores, setStores]             = useState([]);
  const [calls, setCalls]               = useState([]);
  const [connections, setConnections]   = useState([]);
  const [loading, setLoading]           = useState(false);
  const [uploading, setUploading]       = useState(false);
  const [error, setError]               = useState('');
  const [message, setMessage]           = useState('');
  const [activeNav, setActiveNav]       = useState('home');
  const [showCalendar, setShowCalendar] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar') === 'connected') setMessage('캘린더 연결 완료');
    if (params.get('calendar_error')) setError(`캘린더 연결 실패: ${params.get('calendar_error')}`);
  }, []);

  useEffect(() => {
    const unsubscribe = watchAuthState(async (firebaseUser) => {
      if (!firebaseUser) { setAuthLoading(false); router.replace('/login'); return; }
      setNickname(localStorage.getItem('user_nickname') || '사장님');
      setAuthLoading(false);
      await loadAll();
    });
    return () => unsubscribe();
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

  async function handleLogout() { await logout(); router.replace('/'); }

  async function handleConnect(provider) {
    setError('');
    try { await startCalendarConnect(provider); }
    catch (err) { setError(err.message || '캘린더 연결을 시작하지 못했습니다.'); }
  }

  async function handleSetDefault(provider) {
    try { await calendarApi.setDefault(provider); await loadAll(); }
    catch (err) { setError(err.message || '기본 캘린더 설정 실패'); }
  }

  async function handleDisconnect(provider) {
    if (!confirm(`${provider} 캘린더 연결을 해제할까요?`)) return;
    try { await calendarApi.disconnect(provider); await loadAll(); }
    catch (err) { setError(err.message || '캘린더 연결 해제 실패'); }
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
    try {
      await callApi.delete(callId);
      setCalls(prev => prev.filter(c => c.id !== callId));
    } catch (err) { setError(err.message || '삭제 실패'); }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowed = ['.mp3','.m4a','.wav','.ogg','.mp4'];
    if (!allowed.includes(ext)) {
      setError('지원하지 않는 파일 형식입니다. m4a, mp3, wav, ogg, mp4만 가능해요.');
      e.target.value = ''; return;
    }
    const MIME = { m4a:'audio/mp4', mp4:'audio/mp4', mp3:'audio/mpeg', wav:'audio/wav', ogg:'audio/ogg' };
    const fmt  = ext.slice(1);
    const mime = MIME[fmt] || file.type || 'audio/mp4';
    setUploading(true); setError(''); setMessage('');
    try {
      const uploadRes = await callApi.requestUpload({
        storeId:    stores[0]?.id || '',
        fileName:   file.name,
        fileFormat: fmt,
        mimeType:   mime,
      });
      const { call_id, upload_url, upload_headers } = uploadRes.data;
      await callApi.uploadToS3(upload_url, file, upload_headers || { 'Content-Type': mime });
      await callApi.startProcessing(call_id);
      setMessage(`업로드 완료: ${file.name}. AI 분석 중입니다.`);
      await loadAll();
    } catch (err) {
      setError(err.response?.data?.error || err.response?.data?.message || err.message || '업로드 실패');
    } finally { setUploading(false); e.target.value = ''; }
  }

  const handleNavSelect = (key) => {
    setActiveNav(key);
    const routes = { calls:'/calls', customers:'/customers', calendar:'/calendar', settings:'/settings' };
    if (routes[key]) router.push(routes[key]);
  };

  const defaultProvider = connections.find(c => c.is_default)?.provider || connections[0]?.provider || null;
  const recentCalls = calls.slice(0, 3);

  const stats = useMemo(() => ({
    total:        calls.length,
    summarized:   calls.filter(c => c.status === 'summarized').length,
    reservations: calls.filter(isReservation).length,
  }), [calls]);

  // 다가오는 일정 (예약 통화에서 추출)
  const upcomingEvents = useMemo(() =>
    calls.filter(isReservation).slice(0, 5).map(call => {
      const info = parseInfo(call);
      return {
        time:  info.time || '-',
        title: (info.customer_name || call.caller_number || '발신번호 없음') + ' ' + (call.category || '예약'),
        sub:   info.date || formatDateTime(call.created_at),
        color: C.blue,
      };
    }), [calls]);

  if (authLoading) return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <span style={{ color: C.white, fontSize: 14 }}>로딩 중...</span>
    </main>
  );

  return (
    <main style={{ minHeight: '100vh', background: C.bg, fontFamily: 'Inter, -apple-system, sans-serif', display: 'flex' }}>

      {/* ── 사이드 네비 (좌측) ── */}
      <SideNav active={activeNav} onSelect={handleNavSelect} />

      {/* ── 메인 콘텐츠 ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>

        {/* 헤더 */}
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
          <div style={{ width: 32 }} />
          <span style={{ fontSize: 18, fontWeight: 500, color: C.white }}>AI 통화비서</span>
          <button onClick={handleLogout} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 8,
            padding: '6px 12px', color: C.white, fontSize: 12, cursor: 'pointer',
          }}>로그아웃</button>
        </div>

        {/* 날짜 + 업로드 + 필터 */}
        <div style={{ padding: '16px 24px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <p style={{ color: C.white, fontSize: 18, fontWeight: 700, margin: 0 }}>
            {new Date().toLocaleDateString('ko-KR', { year:'numeric', month:'long', day:'numeric', weekday:'long' })}
          </p>

          <input ref={fileInputRef} type="file" accept="audio/*,.m4a,.mp3,.wav,.ogg,.mp4"
            onChange={handleFileSelect} style={{ display: 'none' }} />
          <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
            width: '100%', maxWidth: 520, padding: '20px 24px',
            borderRadius: 24, border: '1px solid rgba(255,255,255,0.7)',
            background: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            cursor: 'pointer', color: C.white,
          }}>
            <span style={{ fontSize: 20 }}>📎</span>
            <span style={{ fontSize: 17, fontWeight: 700 }}>
              {uploading ? '업로드 중...' : '통화파일을 추가해주세요.'}
            </span>
          </button>

          <button style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'none', border: 'none', cursor: 'pointer', color: C.white, fontSize: 14, fontWeight: 700,
          }}>
            ✅ 중요 통화 필터링 ON
          </button>
        </div>

        {/* 화이트 카드 영역 */}
        <div style={{
          flex: 1, background: C.white,
          borderTopLeftRadius: 24, borderTopRightRadius: 24,
          padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
        }}>

          {/* 알림 */}
          {error   && <div style={{ padding: '12px 16px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 10, fontSize: 13, color: '#991B1B' }}>{error}</div>}
          {message && <div style={{ padding: '12px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: 13, color: '#15803D' }}>{message}</div>}

          {/* 상단 2열: 최근 통화 + 캘린더 연동 토글 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* 최근 분석 통화 */}
            <div>
              <SectionHeader title="최근 분석 통화" onViewAll={() => router.push('/calls')} />
              {recentCalls.length === 0 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: C.gray400, fontSize: 13 }}>
                  분석된 통화가 없어요
                </div>
              ) : recentCalls.map(call => <CallItem key={call.id} call={call} />)}
            </div>

            {/* 고객 히스토리 & 캘린더 연동 */}
            <div>
              <SectionHeader title="캘린더 연동" onViewAll={() => setShowCalendar(v => !v)} />
              {showCalendar ? (
                <CalendarSection
                  connections={connections}
                  onConnect={handleConnect}
                  onSetDefault={handleSetDefault}
                  onDisconnect={handleDisconnect}
                  loading={loading}
                  onRefresh={loadAll}
                />
              ) : (
                <div style={{ padding: '16px 8px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {CALENDAR_PROVIDERS.map(p => {
                    const conn = connections.find(c => c.provider === p.id);
                    return (
                      <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 600, color: C.navy }}>{p.label}</span>
                        {conn ? (
                          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 999, background: '#DCFCE7', color: '#15803D' }}>연결됨</span>
                        ) : (
                          <button onClick={() => handleConnect(p.id)} style={{
                            fontSize: 11, background: C.blue, color: C.white,
                            border: 'none', borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
                          }}>연결</button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 하단 2열: 캘린더 + 다가오는 일정 */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

            {/* 미니 캘린더 */}
            <div>
              <SectionHeader title="캘린더" onViewAll={() => router.push('/calendar')} />
              <MiniCalendar />
            </div>

            {/* 다가오는 일정 */}
            <div>
              <SectionHeader title="다가오는 일정" onViewAll={() => router.push('/calendar')} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '14px 0' }}>
                {upcomingEvents.length === 0 ? (
                  <div style={{ padding: '16px 12px', color: C.gray400, fontSize: 13 }}>예정된 일정이 없어요</div>
                ) : upcomingEvents.map((ev, i) => (
                  <ScheduleItem key={i} {...ev} />
                ))}
              </div>
            </div>
          </div>

          {/* 전체 통화 목록 */}
          {calls.length > 0 && (
            <div>
              <SectionHeader title="전체 통화" onViewAll={() => router.push('/calls')} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                {loading && !calls.length ? (
                  <div style={{ textAlign: 'center', padding: '32px 0', color: C.gray400, fontSize: 13 }}>불러오는 중...</div>
                ) : calls.map(call => (
                  <CallCard
                    key={call.id}
                    call={call}
                    connections={connections}
                    defaultProvider={defaultProvider}
                    onCreateCalendarEvent={handleCreateCalendarEvent}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 빈 상태 */}
          {!loading && calls.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '48px 20px',
              background: C.white, borderRadius: 14,
              border: `1px dashed ${C.gray100}`,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
              <p style={{ fontSize: 15, fontWeight: 700, color: C.navy, marginBottom: 4 }}>아직 통화가 없어요</p>
              <p style={{ fontSize: 13, color: C.gray400 }}>녹음 파일을 업로드하거나 앱에서 자동 동기화를 시작하세요.</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}