'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { logout, watchAuthState } from '@/lib/firebase';
import { storeApi, callApi } from '@/lib/api';
import Logo from '../../app/components/Logo';

// ──────────────────────────────────────────────────────
// 카테고리 (LLM extracted_info.category_code 기준)
// ──────────────────────────────────────────────────────
const CATEGORY_INFO = {
  reservation:        { label: '예약',     icon: '📅', color: 'green' },
  order:              { label: '주문',     icon: '🛵', color: 'blue' },
  cancel_refund:      { label: '취소',     icon: '↩️', color: 'orange' },
  complaint:          { label: '불만',     icon: '⚠️', color: 'red' },
  hours_location:     { label: '문의',     icon: '💬', color: 'sky' },
  price:              { label: '가격',     icon: '💰', color: 'sky' },
  ingredients_allergy:{ label: '알레르기', icon: '🥜', color: 'amber' },
  catering_bulk:      { label: '단체',     icon: '🍱', color: 'indigo' },
  positive:           { label: '칭찬',     icon: '💜', color: 'purple' },
  other:              { label: '기타',     icon: '📞', color: 'gray' },
};

// 한글 category(LLM 첫 응답)도 매핑 (구버전 데이터 호환)
const KO_CATEGORY_MAP = {
  '예약': 'reservation',
  '주문': 'order',
  '취소': 'cancel_refund',
  '환불': 'cancel_refund',
  '불만': 'complaint',
  '문의': 'hours_location',
  '칭찬': 'positive',
  '기타': 'other',
};

// 색상별 Tailwind 클래스
const COLOR_STYLES = {
  green:  { badge: 'bg-emerald-100 text-emerald-700',  bar: 'bg-emerald-500'  },
  blue:   { badge: 'bg-blue-100 text-blue-700',        bar: 'bg-blue-500'     },
  orange: { badge: 'bg-orange-100 text-orange-700',    bar: 'bg-orange-500'   },
  red:    { badge: 'bg-red-100 text-red-700',          bar: 'bg-red-500'      },
  sky:    { badge: 'bg-sky-100 text-sky-700',          bar: 'bg-sky-500'      },
  amber:  { badge: 'bg-amber-100 text-amber-800',      bar: 'bg-amber-500'    },
  indigo: { badge: 'bg-indigo-100 text-indigo-700',    bar: 'bg-indigo-500'   },
  purple: { badge: 'bg-purple-100 text-purple-700',    bar: 'bg-purple-500'   },
  gray:   { badge: 'bg-gray-100 text-gray-700',        bar: 'bg-gray-400'     },
};

// 가게 이모지 자동 매핑
const guessStoreEmoji = (name = '') => {
  if (/햄버거|버거/.test(name)) return '🍔';
  if (/카페|coffee|커피/.test(name)) return '☕';
  if (/치킨|닭/.test(name)) return '🍗';
  if (/피자/.test(name)) return '🍕';
  if (/김밥/.test(name)) return '🍙';
  if (/술|호프|주점/.test(name)) return '🍺';
  if (/빵|베이커리/.test(name)) return '🥐';
  if (/돼지|고기|구이/.test(name)) return '🥩';
  if (/칼국수|면|국수/.test(name)) return '🍜';
  return '🏪';
};

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);

  const [user, setUser] = useState(null);
  const [nickname, setNickname] = useState('');
  const [authLoading, setAuthLoading] = useState(true);

  const [stores, setStores] = useState([]);
  const [calls, setCalls] = useState([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // ──────────────────────────────────────────────────────
  // 🔒 인증 + 데이터 로드
  // ──────────────────────────────────────────────────────
  useEffect(() => {
    const unsubscribe = watchAuthState(async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const savedNickname = localStorage.getItem('user_nickname') || '사장님';
        setNickname(savedNickname);
        await loadData();
      } else {
        router.push('/login');
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, [router]);

  const loadData = async () => {
    setDataLoading(true);
    setError('');
    try {
      const [storesRes, callsRes] = await Promise.all([
        storeApi.list(),
        callApi.list({ limit: 200 }),
      ]);
      setStores(storesRes.data.stores || []);
      setCalls(callsRes.data.calls || []);
    } catch (err) {
      console.error('데이터 로딩 실패:', err);
      setError(err.response?.data?.message || '데이터를 불러오지 못했습니다');
    } finally {
      setDataLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const handleDelete = async (callId, e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('이 통화를 삭제하시겠어요? 되돌릴 수 없습니다.')) return;
    try {
      await callApi.delete(callId);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
    } catch (err) {
      console.error('삭제 실패:', err);
      alert('삭제에 실패했습니다');
    }
  };

  // 파일 업로드 (기존 로직 유지)
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (stores.length === 0) {
      setError('먼저 가게를 등록해주세요');
      e.target.value = '';
      return;
    }

    const allowedTypes = ['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/x-m4a', 'audio/wav', 'audio/ogg'];
    const allowedExtensions = ['.mp3', '.m4a', '.wav', '.ogg', '.mp4'];
    const ext = '.' + file.name.split('.').pop().toLowerCase();

    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
      setError(`지원하지 않는 파일 형식입니다 (${file.type || ext}). m4a, mp3, wav만 가능해요.`);
      e.target.value = '';
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('파일이 너무 큽니다. 50MB 이하만 가능해요.');
      e.target.value = '';
      return;
    }

    setError('');
    setSuccessMsg('');
    setUploading(true);
    setUploadProgress(0);

    try {
      const fileFormat = ext.replace('.', '') || 'm4a';
      const storeId = stores[0].id;

      setUploadProgress(10);
      const uploadRes = await callApi.requestUpload({
        storeId,
        fileName: file.name,
        fileFormat,
      });
      const { call_id, upload_url } = uploadRes.data;

      setUploadProgress(30);
      const contentType = `audio/${fileFormat}`;
      const uploadResponse = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': contentType },
        body: file,
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        throw new Error(`S3 업로드 실패 (${uploadResponse.status}): ${errorText.substring(0, 200)}`);
      }

      setUploadProgress(70);
      await callApi.startProcessing(call_id);
      setUploadProgress(100);

      setSuccessMsg(`✅ "${file.name}" 업로드 완료! AI가 분석 중이에요 (1~3분)`);
      await loadData();
    } catch (err) {
      console.error('업로드 실패:', err);
      setError(err.response?.data?.message || err.message || '업로드 실패');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      e.target.value = '';
    }
  };

  // ──────────────────────────────────────────────────────
  // 🧮 가공 데이터
  // ──────────────────────────────────────────────────────
  const storeMap = useMemo(() => {
    const m = {};
    stores.forEach((s) => { m[s.id] = s; });
    return m;
  }, [stores]);

  const todayStats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayCalls = calls.filter((c) => {
      if (!c.created_at) return false;
      return new Date(c.created_at) >= today;
    });
    return {
      total: todayCalls.length,
      summarized: todayCalls.filter((c) => c.status === 'summarized').length,
      newCount: todayCalls.filter((c) => c.is_read === 0 && c.status === 'summarized').length,
    };
  }, [calls]);

  // ──────────────────────────────────────────────────────
  // 포맷 헬퍼
  // ──────────────────────────────────────────────────────
  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now - d;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (sec) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  const todayDateStr = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
  }, []);

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="text-ink-tertiary text-sm">로딩 중...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-surface-page">
      {/* ───────── 상단바 ───────── */}
      <div className="sticky top-0 z-10 backdrop-blur-md bg-surface-page/85 border-b border-line">
        <div className="max-w-[900px] mx-auto px-6 py-3 flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2 text-brand-blue font-bold text-[15px] tracking-tight">
            <Logo size={22} />
            AI 통화 비서
          </Link>
          <div className="flex-1" />
          <Link
            href="/stores/new"
            className="inline-flex items-center justify-center w-9 h-9 text-ink-secondary border border-line rounded-[10px] hover:bg-white hover:text-ink-primary transition-all"
            title="가게 관리"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </Link>
          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-ink-secondary border border-line px-3 py-2 rounded-[10px] text-[13px] font-medium hover:bg-white hover:text-ink-primary transition-all"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            로그아웃
          </button>
        </div>
      </div>

      <div className="max-w-[900px] mx-auto px-6 pt-7 pb-16">
        {/* ───────── 환영 ───────── */}
        <div className="mb-6 animate-fade-up">
          <h1 className="text-[26px] font-bold text-ink-primary tracking-tight mb-1">
            안녕하세요, {nickname}님 <span className="inline-block animate-[wave_2.5s_ease-in-out_0.4s_2] origin-[70%_70%]">👋</span>
          </h1>
          <p className="text-ink-secondary text-sm">오늘도 좋은 하루 되세요</p>
        </div>

        {/* ───────── 오늘의 통계 ───────── */}
        <section
          className="rounded-[20px] p-6 sm:p-7 text-white mb-6 relative overflow-hidden animate-fade-up anim-delay-100"
          style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' }}
        >
          <div
            className="absolute -top-10 -right-10 w-[200px] h-[200px] pointer-events-none"
            style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)' }}
          />
          <div className="flex items-center justify-between mb-4 relative">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-white/85 tracking-wide">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                <line x1="16" y1="2" x2="16" y2="6"/>
                <line x1="8" y1="2" x2="8" y2="6"/>
                <line x1="3" y1="10" x2="21" y2="10"/>
              </svg>
              오늘의 통화
            </span>
            <span className="text-[12px] text-white/60">{todayDateStr}</span>
          </div>
          <div className="grid grid-cols-3 gap-4 relative">
            <StatItem num={todayStats.total} name="총 통화" />
            <StatItem num={todayStats.summarized} name="요약 완료" />
            <StatItem num={todayStats.newCount} name="새 통화" />
          </div>
        </section>

        {/* ───────── 업로드 영역 ───────── */}
        <div className="mb-4 animate-fade-up anim-delay-200">
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*,.m4a,.mp3,.wav"
            onChange={handleFileSelect}
            disabled={uploading}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || stores.length === 0}
            className="w-full bg-white border-2 border-dashed border-line rounded-[14px] p-4 sm:p-5 flex items-center gap-3 text-left transition-all hover:border-brand-blue hover:bg-brand-blue-light disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <div className="flex-none w-11 h-11 bg-brand-blue-light text-brand-blue rounded-[12px] flex items-center justify-center">
              {uploading ? (
                <span className="text-xl">⏳</span>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              {uploading ? (
                <>
                  <div className="text-[14px] font-semibold text-ink-primary mb-1">업로드 중... {uploadProgress}%</div>
                  <div className="w-full bg-surface-muted rounded-full h-1.5">
                    <div
                      className="bg-brand-blue h-1.5 rounded-full transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="text-[14px] font-semibold text-ink-primary mb-0.5">통화 녹음 파일 업로드</div>
                  <div className="text-[12px] text-ink-tertiary">m4a, mp3, wav (최대 50MB)</div>
                </>
              )}
            </div>
          </button>
        </div>

        {error && (
          <div className="mb-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 px-3.5 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-800">
            {successMsg}
          </div>
        )}

        {/* ───────── 통화 카드 리스트 ───────── */}
        <div className="animate-fade-up anim-delay-300">
          {dataLoading && calls.length === 0 ? (
            <div className="text-center py-12 text-ink-tertiary text-sm">불러오는 중...</div>
          ) : calls.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="flex flex-col gap-2.5">
              {calls.map((call) => (
                <CallCard
                  key={call.id}
                  call={call}
                  store={storeMap[call.store_id]}
                  onDelete={handleDelete}
                  formatDate={formatDate}
                  formatDuration={formatDuration}
                />
              ))}
            </div>
          )}
        </div>

        {calls.length > 0 && (
          <div className="text-center mt-6">
            <button
              onClick={loadData}
              disabled={dataLoading}
              className="text-[12px] text-ink-tertiary hover:text-ink-secondary inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={dataLoading ? 'animate-spin' : ''}>
                <polyline points="23 4 23 10 17 10"/>
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
              </svg>
              새로고침
            </button>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes wave {
          0%, 60%, 100% { transform: rotate(0); }
          20% { transform: rotate(14deg); }
          40% { transform: rotate(-8deg); }
        }
      `}</style>
    </main>
  );
}

// ──────────────────────────────────────────────────────
// 통계 아이템
// ──────────────────────────────────────────────────────
function StatItem({ num, name }) {
  return (
    <div>
      <div className="text-[28px] sm:text-[30px] font-extrabold tracking-tight leading-none mb-1.5 tabular-nums">
        {num}
        <span className="text-[14px] sm:text-[15px] font-semibold text-white/70 ml-0.5">건</span>
      </div>
      <div className="text-[12px] text-white/70">{name}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════
// 🆕 통화 카드 (카테고리별 다른 레이아웃)
// ══════════════════════════════════════════════════════
function CallCard({ call, store, onDelete, formatDate, formatDuration }) {
  const cat = call.caller_category || 'UNCLASSIFIED';

  // PERSONAL은 마스킹 카드로 표시
  if (cat === 'PERSONAL') {
    return <MaskedCard call={call} onDelete={onDelete} formatDate={formatDate} formatDuration={formatDuration} />;
  }

  // extracted_info 파싱 (DB에서 JSON으로 옴 — 문자열일 수도 객체일 수도)
  let info = call.extracted_info;
  if (typeof info === 'string') {
    try { info = JSON.parse(info); } catch { info = null; }
  }

  // category_code 결정 (LLM이 준 영문 코드 우선, 없으면 한글 매핑)
  const categoryCode =
    info?.category_code ||
    KO_CATEGORY_MAP[call.category] ||
    'other';

  const catInfo = CATEGORY_INFO[categoryCode] || CATEGORY_INFO.other;
  const styles = COLOR_STYLES[catInfo.color];

  const displayNumber = call.caller_number || '발신번호 없음';
  const storeName = store?.name || '';
  const storeEmoji = guessStoreEmoji(storeName);

  return (
    <Link
      href={`/calls/${call.id}`}
      className="relative block bg-white border border-line rounded-[14px] overflow-hidden cursor-pointer transition-all hover:border-brand-blue hover:translate-x-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)]"
    >
      {/* 좌측 컬러 바 (action_required는 빨간색, 일반은 카테고리 색) */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-1 ${
          call.action_required === 1 ? 'bg-red-500' : styles.bar
        }`}
      />

      <div className="pl-4 pr-3 py-3.5 sm:pl-5 sm:pr-4 sm:py-4">
        {/* ─── 헤더: 배지 + 우측 메타 ─── */}
        <div className="flex items-start justify-between gap-2 mb-2.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 카테고리 배지 */}
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-[3px] rounded-md ${styles.badge}`}>
              <span>{catInfo.icon}</span>
              <span>{catInfo.label}</span>
            </span>

            {/* NEW 배지 */}
            {call.is_read === 0 && call.status === 'summarized' && (
              <span className="text-[10px] font-bold px-[7px] py-[3px] rounded-full bg-status-new-bg text-status-new-text tracking-wide">
                NEW
              </span>
            )}

            {/* 처리필요 배지 */}
            {call.action_required === 1 && (
              <span className="text-[10px] font-bold px-[7px] py-[3px] rounded-full bg-red-100 text-red-700">
                처리필요
              </span>
            )}

            {/* 가게 배지 (여러 가게 있을 때만 의미 있음) */}
            {storeName && (
              <span className="hidden sm:inline-flex text-[10px] font-semibold px-2 py-[3px] rounded-md bg-surface-muted text-ink-secondary">
                {storeEmoji} {storeName}
              </span>
            )}
          </div>

          {/* 우측: 통화 길이 + 삭제 */}
          <div className="flex items-center gap-1.5 flex-none">
            <span className="text-[11px] text-ink-tertiary tabular-nums">
              {formatDuration(call.duration)}
            </span>
            <button
              onClick={(e) => onDelete(call.id, e)}
              className="w-7 h-7 rounded-[8px] text-ink-tertiary hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all"
              title="삭제"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>

        {/* ─── 본문: 카테고리별로 다른 레이아웃 ─── */}
        <CardBody categoryCode={categoryCode} info={info} call={call} />

        {/* ─── 하단: 발신번호 + 시각 ─── */}
        <div className="mt-3 pt-2.5 border-t border-line flex items-center justify-between gap-2 text-[12px] text-ink-tertiary">
          <span className="inline-flex items-center gap-1 truncate">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-none">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
            </svg>
            <span className="truncate">{displayNumber}</span>
          </span>
          <span className="flex-none">{formatDate(call.created_at)}</span>
        </div>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────
// 카드 본문: 카테고리별 분기
// ──────────────────────────────────────────────────────
function CardBody({ categoryCode, info, call }) {
  // 데이터가 아예 없으면 fallback (구버전 데이터 / extracted_info 누락)
  if (!info) {
    return (
      <div className="text-[13px] text-ink-secondary leading-snug line-clamp-2">
        {call.summary || '요약 정보 없음'}
      </div>
    );
  }

  switch (categoryCode) {
    case 'reservation':
      return <ReservationBody info={info} />;
    case 'cancel_refund':
      return <CancelBody info={info} />;
    case 'complaint':
      return <ComplaintBody info={info} call={call} />;
    case 'order':
    case 'catering_bulk':
      return <OrderBody info={info} />;
    case 'positive':
      return <PositiveBody info={info} />;
    case 'hours_location':
    case 'price':
    case 'ingredients_allergy':
    case 'other':
    default:
      return <InquiryBody info={info} call={call} />;
  }
}

// ─── 예약 ───
function ReservationBody({ info }) {
  return (
    <div className="space-y-1.5">
      {info.customer_name && (
        <div className="text-[15px] font-bold text-ink-primary">
          {info.customer_name}님
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-secondary">
        {info.date && (
          <span className="inline-flex items-center gap-1">
            <span className="text-ink-tertiary">📅</span>
            <span className="font-semibold text-ink-primary">{formatNiceDate(info.date)}</span>
          </span>
        )}
        {info.time && (
          <span className="inline-flex items-center gap-1">
            <span className="text-ink-tertiary">🕐</span>
            <span className="font-semibold text-ink-primary">{info.time}</span>
          </span>
        )}
        {info.party_size && (
          <span className="inline-flex items-center gap-1">
            <span className="text-ink-tertiary">👥</span>
            <span className="font-semibold text-ink-primary">{info.party_size}명</span>
          </span>
        )}
      </div>
      {info.special_notes && (
        <div className="text-[12px] text-ink-tertiary mt-1">
          💬 {info.special_notes}
        </div>
      )}
    </div>
  );
}

// ─── 취소 ───
function CancelBody({ info }) {
  return (
    <div className="space-y-1.5">
      {info.customer_name && (
        <div className="text-[15px] font-bold text-ink-primary">
          {info.customer_name}님
        </div>
      )}
      {info.date && (
        <div className="text-[13px] text-ink-secondary">
          📅 <span className="font-semibold text-ink-primary">{formatNiceDate(info.date)}</span> 예약 취소
        </div>
      )}
      {info.special_notes && (
        <div className="text-[12px] text-ink-tertiary">
          💬 {info.special_notes}
        </div>
      )}
    </div>
  );
}

// ─── 불만 (메인 강조: 빨간 박스로 special_notes 부각) ───
function ComplaintBody({ info, call }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline gap-2 flex-wrap">
        {info.customer_name && (
          <span className="text-[15px] font-bold text-ink-primary">
            {info.customer_name}님
          </span>
        )}
        {info.menu && info.menu.length > 0 && (
          <span className="text-[12px] text-ink-tertiary">
            🍜 {info.menu.join(', ')}
          </span>
        )}
      </div>
      <div className="bg-red-50 border border-red-100 rounded-[8px] px-3 py-2 text-[13px] text-red-900 leading-snug">
        {info.special_notes || call.summary || '불만 사항'}
      </div>
    </div>
  );
}

// ─── 주문/단체 ───
function OrderBody({ info }) {
  return (
    <div className="space-y-1.5">
      {info.customer_name && (
        <div className="text-[15px] font-bold text-ink-primary">
          {info.customer_name}님
        </div>
      )}
      {info.menu && info.menu.length > 0 && (
        <div className="text-[13px] text-ink-secondary">
          🍱 <span className="font-semibold text-ink-primary">{info.menu.join(', ')}</span>
        </div>
      )}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-ink-secondary">
        {info.date && (
          <span className="inline-flex items-center gap-1">
            <span className="text-ink-tertiary">📅</span>
            <span className="font-semibold text-ink-primary">{formatNiceDate(info.date)}</span>
          </span>
        )}
        {info.time && (
          <span className="inline-flex items-center gap-1">
            <span className="text-ink-tertiary">🕐</span>
            <span className="font-semibold text-ink-primary">{info.time}</span>
          </span>
        )}
        {info.party_size && (
          <span className="inline-flex items-center gap-1">
            <span className="text-ink-tertiary">👥</span>
            <span className="font-semibold text-ink-primary">{info.party_size}명</span>
          </span>
        )}
      </div>
      {info.special_notes && (
        <div className="text-[12px] text-ink-tertiary">
          💬 {info.special_notes}
        </div>
      )}
    </div>
  );
}

// ─── 칭찬 ───
function PositiveBody({ info }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline gap-2 flex-wrap">
        {info.customer_name && (
          <span className="text-[15px] font-bold text-ink-primary">
            {info.customer_name}님
          </span>
        )}
        {info.menu && info.menu.length > 0 && (
          <span className="text-[12px] text-ink-tertiary">
            🍜 {info.menu.join(', ')}
          </span>
        )}
      </div>
      <div className="text-[13px] text-ink-secondary leading-snug">
        💜 {info.special_notes || '단골/칭찬 통화'}
      </div>
    </div>
  );
}

// ─── 문의/가격/알레르기/기타 ───
function InquiryBody({ info, call }) {
  return (
    <div className="text-[13px] text-ink-secondary leading-snug line-clamp-2">
      💬 {info.special_notes || call.summary || '문의 통화'}
    </div>
  );
}

// ─── PERSONAL 마스킹 카드 ───
function MaskedCard({ call, onDelete, formatDate, formatDuration }) {
  const masked = call.caller_number ? '*** ' + call.caller_number.slice(-4) : '통화 녹음 ***';
  return (
    <Link
      href={`/calls/${call.id}`}
      className="block bg-white border border-line rounded-[14px] p-4 sm:p-5 cursor-pointer transition-all hover:border-brand-blue hover:translate-x-0.5"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-bold px-2 py-[3px] rounded-md bg-gray-100 text-gray-600">
              🔒 개인 통화
            </span>
            <span className="text-[11px] text-ink-tertiary tabular-nums">
              {formatDuration(call.duration)}
            </span>
          </div>
          <div className="text-[14px] font-semibold text-ink-secondary mb-0.5">
            {masked}
          </div>
          <div className="text-[12px] text-ink-tertiary">
            {formatDate(call.created_at)} · 개인정보 보호를 위해 내용이 가려졌습니다
          </div>
        </div>
        <button
          onClick={(e) => onDelete(call.id, e)}
          className="flex-none w-7 h-7 rounded-[8px] text-ink-tertiary hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all"
          title="삭제"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    </Link>
  );
}

// ──────────────────────────────────────────────────────
// 날짜 포맷 (YYYY-MM-DD → "5/8(목)" 같은 친근한 형태)
// ──────────────────────────────────────────────────────
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
function formatNiceDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / (1000 * 60 * 60 * 24));

    let prefix = '';
    if (diffDays === 0) prefix = '오늘 ';
    else if (diffDays === 1) prefix = '내일 ';
    else if (diffDays === -1) prefix = '어제 ';

    return `${prefix}${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
  } catch {
    return dateStr;
  }
}

// ──────────────────────────────────────────────────────
// 빈 상태
// ──────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="text-center py-16 px-5 bg-white rounded-[14px] border border-dashed border-line">
      <div className="w-16 h-16 mx-auto mb-3.5 bg-surface-page rounded-[18px] flex items-center justify-center text-3xl">
        📭
      </div>
      <h3 className="text-[16px] font-bold text-ink-primary mb-1">아직 통화가 없어요</h3>
      <p className="text-[13px] text-ink-secondary leading-snug">
        위에서 녹음 파일을 업로드하거나<br />
        안드로이드 앱을 설치해 자동 동기화를 시작해보세요
      </p>
    </div>
  );
}