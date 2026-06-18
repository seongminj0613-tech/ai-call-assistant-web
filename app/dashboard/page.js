'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logout, watchAuthState } from '@/lib/firebase';
import { storeApi, callApi } from '@/lib/api';

const CATEGORY_LABELS = {
  reservation: '예약',
  order: '주문',
  cancel_refund: '취소/환불',
  complaint: '불만',
  hours_location: '문의',
  price: '가격',
  ingredients_allergy: '알레르기',
  catering_bulk: '단체',
  positive: '칭찬',
  other: '기타',
};

function parseInfo(call) {
  let info = call?.extracted_info;
  if (typeof info === 'string') {
    try { info = JSON.parse(info); } catch { info = {}; }
  }
  return info && typeof info === 'object' ? info : {};
}

function callDisplayName(c) {
  return c.caller_name || c.caller_number || '발신번호 없음';
}
function callInitial(c) {
  const n = c.caller_name || c.caller_number || '?';
  return (n.trim().charAt(0) || '?');
}
function callDirectionLabel(c) {
  return c.direction === 'outgoing' || c.call_type === 'outgoing' ? '발신' : '수신';
}
function callShortDesc(c) {
  const info = parseInfo(c);
  return info.special_notes || c.summary || CATEGORY_LABELS[info.category_code || c.category] || '통화 분석';
}
function callTime(c) {
  const d = new Date(c.created_at);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

// 더미 데이터 (백엔드 미연결 섹션)
const DUMMY_HISTORY_NAME = '김민수';
const DUMMY_AI_ANALYSIS =
  '김민준 고객은 주로 예약 변경과 단체 행사 관련 문의가 잦습니다. 창가 좌석을 선호하며, 땅콩 알레르기 정보를 안내 시 우선 확인해 주세요.';
const DUMMY_HISTORY = [
  { tag: '예약', title: '매물 방문 일정 등록', date: '2026.06.08' },
  { tag: '문의', title: '매물 재문의', date: '2026.06.08' },
  { tag: '방문', title: '매물 방문', date: '2026.05.24' },
];
const DUMMY_SCHEDULE = [
  { time: '14:00', desc: '김민수님 매물 재방문 일정이 있습니다', detail: '통화 자동 등록 · 김대리', filled: false },
  { time: '14:00', desc: '김민수님 매물 재방문 일정이 있습니다', detail: '통화 자동 등록 · 김대리', filled: true },
  { time: '14:00', desc: '김민수님 매물 재방문 일정이 있습니다', detail: '통화 자동 등록 · 김대리', filled: true },
];
// 2026년 6월: 1일=월요일. dot: 'auto' | 'manual' | null
const CAL_WEEKS = [
  [null, { d: 1, dot: 'auto' }, { d: 2, dot: 'auto' }, { d: 3, dot: 'auto' }, { d: 4, dot: 'auto' }, { d: 5, dot: 'auto' }, { d: 6, dot: 'auto' }],
  [{ d: 7, dot: 'auto' }, { d: 8, dot: 'auto' }, { d: 9, dot: 'auto' }, { d: 10, dot: 'manual' }, { d: 11, dot: 'auto' }, { d: 12, dot: 'auto' }, { d: 13, dot: 'auto' }],
  [{ d: 14, dot: 'auto' }, { d: 15, dot: 'auto' }, { d: 16, dot: 'auto' }, { d: 17, dot: 'auto' }, { d: 18, dot: 'manual' }, { d: 19, dot: 'auto' }, { d: 20, dot: 'manual' }],
  [{ d: 21, dot: 'auto' }, { d: 22, dot: 'auto' }, { d: 23, dot: 'auto' }, { d: 24, dot: 'auto' }, { d: 25, dot: 'auto' }, { d: 26, dot: 'auto' }, { d: 27, dot: 'auto' }],
  [{ d: 28, dot: 'auto' }, { d: 29, dot: 'auto' }, { d: 30, dot: 'auto' }, null, null, null, null],
];

const NAV_ITEMS = [
  { id: 'home', label: '홈' },
  { id: 'calls', label: '통화관리' },
  { id: 'customers', label: '고객관리' },
  { id: 'calendar', label: '일정관리' },
  { id: 'settings', label: '설정' },
];

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [authLoading, setAuthLoading] = useState(true);
  const [stores, setStores] = useState([]);
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsubscribe = watchAuthState(async (firebaseUser) => {
      if (!firebaseUser) {
        setAuthLoading(false);
        router.replace('/login');
        return;
      }
      setAuthLoading(false);
      await loadAll();
    });
    return () => unsubscribe();
  }, [router]);

  async function loadAll() {
    setLoading(true);
    setError('');
    try {
      const [storesRes, callsRes] = await Promise.all([
        storeApi.list(),
        callApi.list({ limit: 200 }),
      ]);
      setStores(storesRes.data?.stores || []);
      setCalls(callsRes.data?.calls || []);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || '데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    if (!confirm('로그아웃 할까요?')) return;
    await logout();
    router.replace('/');
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowedExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.mp4'];
    if (!allowedExtensions.includes(ext)) {
      setError('지원하지 않는 파일 형식입니다. m4a, mp3, wav, ogg, mp4만 가능해요.');
      e.target.value = '';
      return;
    }

    const MIME_BY_EXT = { m4a: 'audio/mp4', mp4: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg' };
    const fileFormat = ext.slice(1);
    const mimeType = MIME_BY_EXT[fileFormat] || file.type || 'audio/mp4';

    setUploading(true);
    setError('');
    setMessage('');
    try {
      const uploadRes = await callApi.requestUpload({
        storeId: stores[0]?.id || '',
        fileName: file.name,
        fileFormat,
        mimeType,
      });
      const { call_id, upload_url, upload_headers } = uploadRes.data;
      await callApi.uploadToS3(upload_url, file, upload_headers || { 'Content-Type': mimeType });
      await callApi.startProcessing(call_id);
      setMessage(`업로드 완료: ${file.name}. AI 분석 중입니다.`);
      await loadAll();
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.response?.data?.message || err.message || '업로드 실패');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  const todayLabel = useMemo(
    () => new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }),
    []
  );
  const recentCalls = useMemo(() => calls.slice(0, 3), [calls]);

  function handleNavClick(id) {
    if (id === 'settings') { handleLogout(); return; }
    // 통화관리/고객관리/일정관리 페이지는 아직 없음 — 추후 연결
  }

  if (authLoading) {
    return <main className="min-h-screen flex items-center justify-center bg-[#5f6071] text-sm text-white/70">로딩 중...</main>;
  }

  return (
    <main className="min-h-screen bg-[#5f6071] flex items-start justify-center px-6 py-12">
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*,.m4a,.mp3,.wav,.ogg,.mp4"
        onChange={handleFileSelect}
        disabled={uploading}
        className="hidden"
      />

      <div className="relative translate-x-[44px]">
        {/* 사이드 nav */}
        <nav className="absolute right-full top-0 flex flex-col gap-[16px] items-end w-[88px] py-[24px]">
          {NAV_ITEMS.map((item) => {
            const active = item.id === 'home';
            return (
              <button
                key={item.id}
                onClick={() => !active && handleNavClick(item.id)}
                className={`w-full rounded-l-[24px] flex flex-col items-center justify-center gap-[8px] pl-[16px] pr-[8px] py-[16px] transition-colors ${
                  active ? 'bg-white text-black cursor-default' : 'bg-[#e4e4e4] text-[#7e7e7e] hover:bg-[#d9d9d9]'
                }`}
              >
                <NavIcon id={item.id} />
                <span className="text-[14px] font-medium text-center">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* 본문 컬럼 */}
        <div className="w-[640px] flex flex-col items-center">
          {/* 헤더 */}
          <header className="h-[56px] w-full flex items-center justify-between relative">
            <div className="flex items-center justify-center px-[16px]">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="6" y="2" width="9" height="20" rx="2" /><path d="M18 9v6M21 7v10" /></svg>
            </div>
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18px] font-medium text-white whitespace-nowrap">AI 통화비서</div>
            <button className="px-[16px] flex items-center" title="알림">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
            </button>
          </header>

          {/* 날짜 / 업로드 / 필터 */}
          <section className="w-full flex flex-col items-center gap-[16px] pt-[16px] pb-[24px]">
            <div className="text-[20px] font-bold text-white text-center">{todayLabel}</div>
            <button
              onClick={() => !uploading && fileInputRef.current?.click()}
              disabled={uploading}
              className="w-full min-h-[123px] border border-dashed border-white rounded-[24px] flex items-center justify-center gap-[8px] p-[24px] hover:bg-white/[0.06] transition-colors disabled:opacity-60"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M12 18v-6M9 15h6" /></svg>
              <p className="text-[20px] font-bold text-white">{uploading ? '업로드 중...' : '통화파일을 추가해주세요.'}</p>
            </button>
            <div className="flex items-center justify-center gap-[8px] px-[16px] py-[8px] rounded-full">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" /></svg>
              <p className="text-[14px] font-bold text-white">중요 통화 필터링 ON</p>
            </div>
          </section>

          {/* 알림 영역 */}
          {(error || message) && (
            <div className="w-full mb-2">
              {error && <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800 break-all">{error}</div>}
              {message && <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-800">{message}</div>}
            </div>
          )}

          {/* 흰 카드 */}
          <section className="relative bg-white w-full rounded-t-[24px] p-[32px] text-[#343659]">
            <div className="flex gap-[24px] items-start">
              {/* 좌측 컬럼 */}
              <div className="flex-1 min-w-0 flex flex-col gap-[54px]">
                {/* 최근 분석 통화 */}
                <div className="flex flex-col w-full">
                  <SectionHead title="최근 분석 통화" more="전체보기 →" />
                  <div className="flex flex-col w-full">
                    {loading && !recentCalls.length ? (
                      <div className="py-8 text-center text-[12px] text-[#99a1b0]">불러오는 중...</div>
                    ) : recentCalls.length === 0 ? (
                      <div className="py-8 text-center text-[12px] text-[#99a1b0]">아직 분석된 통화가 없어요.</div>
                    ) : (
                      recentCalls.map((c) => (
                        <Link key={c.id} href={`/calls/${c.id}`} className="flex items-center gap-[10px] pl-[16px] pr-[24px] py-[16px] rounded-[12px] hover:bg-[#f7f7f9] transition-colors">
                          <div className="flex-none w-[34px] h-[34px] rounded-full bg-[#f1f1f1] flex items-center justify-center">
                            <span className="text-[14px] font-bold text-[#5f5f5f]">{callInitial(c)}</span>
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col gap-px">
                            <div className="flex items-center gap-[6px]">
                              <span className="text-[13px] font-bold text-[#343659] truncate">{callDisplayName(c)}</span>
                              <span className="flex-none bg-[#f1f1f1] px-[8px] py-[3px] rounded-full text-[10px] font-medium text-[#5f5f5f]">{callDirectionLabel(c)}</span>
                            </div>
                            <span className="text-[11px] text-[#343659] truncate">{callShortDesc(c)}</span>
                          </div>
                          <span className="flex-none text-[11px] text-[#99a1b0]">{callTime(c)}</span>
                        </Link>
                      ))
                    )}
                  </div>
                </div>

                {/* 고객 히스토리 (더미) */}
                <div className="flex flex-col w-full">
                  <div className="flex items-center justify-between p-[8px] border-b border-[#343659] text-[#343659] w-full">
                    <div className="flex items-center gap-[4px]">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6" /></svg>
                      <span className="text-[14px] font-bold whitespace-nowrap">{DUMMY_HISTORY_NAME}님의 히스토리</span>
                    </div>
                    <span className="text-[11px] font-medium whitespace-nowrap">전체 보기 →</span>
                  </div>
                  <div className="flex flex-col gap-[16px] p-[16px] w-full">
                    <div className="bg-[#f4f4f4] rounded-[14px] px-[16px] py-[8px] flex flex-col gap-[4px] text-[#343659]">
                      <span className="text-[11px] font-semibold">✦ AI 고객 분석</span>
                      <span className="text-[11px] leading-[17px]">{DUMMY_AI_ANALYSIS}</span>
                    </div>
                    <div className="flex flex-col gap-[7px] w-full">
                      {DUMMY_HISTORY.map((h, i) => (
                        <div key={i} className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-[7px] flex-1 min-w-0">
                            <span className="flex-none bg-[#dbeafe] px-[8px] py-[3px] rounded-full text-[11px] text-[#155dfc]">{h.tag}</span>
                            <span className="text-[12px] font-semibold text-[#343659] truncate">{h.title}</span>
                          </div>
                          <span className="flex-none text-[11px] text-[#99a1af]">{h.date}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* 우측 컬럼 */}
              <div className="w-[200px] flex flex-col gap-[24px] items-end">
                {/* 다가오는 일정 (캘린더, 더미) */}
                <div className="flex flex-col gap-[10px] w-full">
                  <SectionHead title="다가오는 일정" more="전체보기 →" />
                  <div className="flex items-center justify-between px-[24px] text-[#343659] w-full">
                    <span className="text-[22px] leading-[24px]">‹</span>
                    <span className="text-[16px] font-bold">2026년 6월</span>
                    <span className="text-[22px] leading-[24px]">›</span>
                  </div>
                  <div className="flex flex-col w-full">
                    <div className="flex flex-col gap-[4px] p-[4px] rounded-[16px] w-full">
                      <div className="flex gap-[2px] w-full">
                        {['일', '월', '화', '수', '목', '금', '토'].map((w, i) => (
                          <div key={w} className={`flex-1 text-center text-[10px] font-medium ${i === 0 ? 'text-[#d94038]' : i === 6 ? 'text-[#1c6bd4]' : 'text-[#99a1b0]'}`}>{w}</div>
                        ))}
                      </div>
                      {CAL_WEEKS.map((week, wi) => (
                        <div key={wi} className="flex gap-[2px] h-[28px] w-full">
                          {week.map((cell, ci) =>
                            cell ? (
                              <div key={ci} className="flex-1 h-[28px] flex flex-col items-center justify-between">
                                <span className="text-[12px] font-medium text-[#343659] h-[20px] flex items-center">{cell.d}</span>
                                <span className={`w-[6px] h-[4px] rounded-full ${cell.dot === 'manual' ? 'bg-[#22c55e]' : cell.dot === 'auto' ? 'bg-[#1c6bd4]' : 'bg-transparent'}`} />
                              </div>
                            ) : (
                              <div key={ci} className="flex-1 h-[28px] opacity-0" />
                            )
                          )}
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-[12px] pt-[8px] w-full">
                      <div className="flex items-center gap-[4px]"><span className="w-[6px] h-[6px] rounded-full bg-[#1c6bd4]" /><span className="text-[10px] text-[#99a1b0]">통화 자동등록</span></div>
                      <div className="flex items-center gap-[4px]"><span className="w-[6px] h-[6px] rounded-full bg-[#22c55e]" /><span className="text-[10px] text-[#99a1b0]">수동 등록</span></div>
                    </div>
                  </div>
                </div>

                {/* 오늘 일정 타임라인 (더미) */}
                <div className="flex flex-col w-full">
                  {DUMMY_SCHEDULE.map((s, i) => (
                    <div key={i} className="flex px-[8px] w-full">
                      <div className="w-[20px] flex flex-col items-center">
                        <span className={`w-[12px] h-[12px] rounded-full border-[3px] border-[#1c6bd4] flex-none ${s.filled ? 'bg-[#1c6bd4]' : 'bg-white'}`} />
                        <span className="flex-1 w-[2px] bg-[#d6d9e5] min-h-[8px]" />
                      </div>
                      <div className="flex-1 min-w-0 flex flex-col gap-[8px] pb-[16px]">
                        <span className="text-[12px] font-bold text-[#1c6bd4]">{s.time}</span>
                        <span className="text-[12px] font-bold text-[#343659] leading-[1.3]">{s.desc}</span>
                        <span className="text-[10px] text-[#99a1b0]">{s.detail}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

function SectionHead({ title, more }) {
  return (
    <div className="flex items-center justify-between p-[8px] border-b border-[#343659] text-[#343659] w-full">
      <span className="text-[14px] font-bold whitespace-nowrap">{title}</span>
      <span className="text-[11px] font-medium whitespace-nowrap">{more}</span>
    </div>
  );
}

function NavIcon({ id }) {
  const common = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  switch (id) {
    case 'home':
      return <svg {...common}><path d="M3 11l9-8 9 8" /><path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" /></svg>;
    case 'calls':
      return <svg {...common}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
    case 'customers':
      return <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
    case 'calendar':
      return <svg {...common}><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M16 2v4M8 2v4M3 10h18" /></svg>;
    case 'settings':
      return <svg {...common}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>;
    default:
      return null;
  }
}