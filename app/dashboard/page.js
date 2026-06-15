'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { storeApi, callApi } from '@/lib/api';
import NavLayout from '../components/NavLayout';

const CATEGORY_INFO = {
  reservation:         { label: '예약',     color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  order:               { label: '주문',     color: 'bg-blue-50 text-blue-700 border-blue-200' },
  cancel_refund:       { label: '취소',     color: 'bg-orange-50 text-orange-700 border-orange-200' },
  complaint:           { label: '불만',     color: 'bg-red-50 text-red-700 border-red-200' },
  hours_location:      { label: '문의',     color: 'bg-sky-50 text-sky-700 border-sky-200' },
  price:               { label: '가격',     color: 'bg-sky-50 text-sky-700 border-sky-200' },
  ingredients_allergy: { label: '알레르기', color: 'bg-amber-50 text-amber-800 border-amber-200' },
  catering_bulk:       { label: '단체',     color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  positive:            { label: '칭찬',     color: 'bg-purple-50 text-purple-700 border-purple-200' },
  other:               { label: '기타',     color: 'bg-gray-50 text-gray-700 border-gray-200' },
};

const KO_CATEGORY_MAP = {
  '예약': 'reservation', '주문': 'order', '취소': 'cancel_refund',
  '환불': 'cancel_refund', '불만': 'complaint', '문의': 'hours_location',
  '칭찬': 'positive', '기타': 'other',
};

const FILTERS = [
  { key: 'all',         label: '전체' },
  { key: 'reservation', label: '예약' },
  { key: 'inquiry',     label: '문의' },
  { key: 'complaint',   label: '불만' },
];

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function formatNiceDate(dateStr) {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(d); target.setHours(0, 0, 0, 0);
    const diff = Math.round((target - today) / 86400000);
    let prefix = diff === 0 ? '오늘 ' : diff === 1 ? '내일 ' : diff === -1 ? '어제 ' : '';
    return `${prefix}${d.getMonth() + 1}/${d.getDate()}(${WEEKDAYS[d.getDay()]})`;
  } catch { return dateStr; }
}

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const [nickname, setNickname] = useState('사장님');
  const [stores, setStores] = useState([]);
  const [calls, setCalls] = useState([]);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [activeFilter, setActiveFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (user) {
        setNickname(localStorage.getItem('user_nickname') || '사장님');
        await loadData();
      } else {
        setTimeout(() => router.push('/login'), 3000);
      }
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setDataLoading(true);
    try {
      const [storesRes, callsRes] = await Promise.all([
        storeApi.list(),
        callApi.list({ limit: 200 }),
      ]);
      setStores(storesRes.data.stores || []);
      setCalls(callsRes.data.calls || []);
    } catch (err) {
      setError(err.response?.data?.message || '데이터를 불러오지 못했습니다');
    } finally {
      setDataLoading(false);
    }
  };

  const handleDelete = async (callId, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('이 통화를 삭제하시겠어요?')) return;
    try {
      await callApi.delete(callId);
      setCalls(prev => prev.filter(c => c.id !== callId));
    } catch { alert('삭제에 실패했습니다'); }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (stores.length === 0) { setError('먼저 가게를 등록해주세요'); e.target.value = ''; return; }
    const ext = '.' + file.name.split('.').pop().toLowerCase();
    const allowed = ['.mp3', '.m4a', '.wav', '.ogg', '.mp4'];
    if (!allowed.includes(ext)) { setError(`지원하지 않는 형식입니다. m4a, mp3, wav만 가능해요.`); e.target.value = ''; return; }
    if (file.size > 50 * 1024 * 1024) { setError('파일이 너무 큽니다. 50MB 이하만 가능해요.'); e.target.value = ''; return; }
    setError(''); setSuccessMsg(''); setUploading(true); setUploadProgress(0);
    try {
      const fileFormat = ext.replace('.', '') || 'm4a';
      const MIME = { m4a: 'audio/mp4', mp4: 'audio/mp4', mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg' };
      let mimeType = file.type || MIME[fileFormat] || 'audio/mp4';
      if (['m4a','mp4'].includes(fileFormat) || ['audio/m4a','audio/x-m4a'].includes(mimeType)) mimeType = 'audio/mp4';
      setUploadProgress(10);
      const { data: { call_id, upload_url } } = await callApi.requestUpload({ storeId: stores[0].id, fileName: file.name, fileFormat, mimeType });
      setUploadProgress(30);
      const res = await fetch(upload_url, { method: 'PUT', headers: { 'Content-Type': mimeType }, body: file });
      if (!res.ok) throw new Error(`S3 업로드 실패 (${res.status})`);
      setUploadProgress(70);
      await callApi.startProcessing(call_id);
      setUploadProgress(100);
      setSuccessMsg(`✅ "${file.name}" 업로드 완료! AI가 분석 중이에요 (1~3분)`);
      await loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || '업로드 실패');
    } finally {
      setUploading(false); setUploadProgress(0); e.target.value = '';
    }
  };

  const todayStats = useMemo(() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const tc = calls.filter(c => c.created_at && new Date(c.created_at) >= today);
    return { total: tc.length, summarized: tc.filter(c => c.status === 'summarized').length, newCount: tc.filter(c => c.is_read === 0 && c.status === 'summarized').length };
  }, [calls]);

  const filteredCalls = useMemo(() => {
    let filtered = [...calls];
    if (activeFilter !== 'all') {
      filtered = filtered.filter(c => {
        let info = c.extracted_info;
        if (typeof info === 'string') { try { info = JSON.parse(info); } catch { info = null; } }
        const code = info?.category_code || KO_CATEGORY_MAP[c.category] || 'other';
        if (activeFilter === 'reservation') return code === 'reservation' || code === 'order';
        if (activeFilter === 'inquiry') return ['hours_location','price','ingredients_allergy','catering_bulk'].includes(code);
        if (activeFilter === 'complaint') return code === 'complaint';
        return true;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      filtered = filtered.filter(c =>
        c.caller_number?.includes(q) ||
        c.summary?.toLowerCase().includes(q) ||
        c.category?.includes(q)
      );
    }
    return filtered;
  }, [calls, activeFilter, search]);

  const formatDate = (s) => {
    if (!s) return '-';
    const d = new Date(s), now = new Date();
    const diffMin = Math.floor((now - d) / 60000);
    if (diffMin < 1) return '방금 전';
    if (diffMin < 60) return `${diffMin}분 전`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}시간 전`;
    return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const formatDuration = (sec) => {
    if (!sec) return '-';
    const m = Math.floor(sec / 60), s = sec % 60;
    return m > 0 ? `${m}분 ${s}초` : `${s}초`;
  };

  return (
    <NavLayout>
      {/* 환영 + 통계 */}
      <div className="rounded-[20px] p-5 sm:p-6 text-white mb-5 relative overflow-hidden animate-fade-up"
           style={{ background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)' }}>
        <div className="absolute -top-8 -right-8 w-48 h-48 pointer-events-none"
             style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
        <div className="flex items-start justify-between mb-4 relative">
          <div>
            <p className="text-[12px] text-white/70 mb-0.5">
              {new Date().toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })}
            </p>
            <h1 className="text-[20px] font-bold tracking-tight">
              안녕하세요, {nickname}님 👋
            </h1>
          </div>
          <Link href="/stores/new"
            className="flex-none w-8 h-8 rounded-[9px] flex items-center justify-center bg-white/20 hover:bg-white/30 transition-all">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
            </svg>
          </Link>
        </div>
        <div className="grid grid-cols-3 gap-3 relative">
          {[['총 통화', todayStats.total], ['요약 완료', todayStats.summarized], ['새 통화', todayStats.newCount]].map(([name, num]) => (
            <div key={name}>
              <div className="text-[26px] font-extrabold tracking-tight leading-none mb-1 tabular-nums">
                {num}<span className="text-[13px] font-semibold text-white/70 ml-0.5">건</span>
              </div>
              <div className="text-[11px] text-white/70">{name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 업로드 */}
      <div className="mb-4 animate-fade-up anim-delay-100">
        <input ref={fileInputRef} type="file" accept="audio/*,.m4a,.mp3,.wav" onChange={handleFileSelect} disabled={uploading} className="hidden" />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading || stores.length === 0}
          className="w-full bg-white border-2 border-dashed border-line rounded-[14px] p-4 flex items-center gap-3 text-left transition-all hover:border-brand-blue hover:bg-brand-blue-light disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <div className="flex-none w-10 h-10 bg-brand-blue-light text-brand-blue rounded-[11px] flex items-center justify-center">
            {uploading ? <span className="text-lg">⏳</span> : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            {uploading ? (
              <>
                <div className="text-[13px] font-semibold text-ink-primary mb-1.5">업로드 중... {uploadProgress}%</div>
                <div className="w-full bg-surface-muted rounded-full h-1.5">
                  <div className="bg-brand-blue h-1.5 rounded-full transition-all" style={{ width: `${uploadProgress}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="text-[13px] font-semibold text-ink-primary mb-0.5">통화 녹음 파일 업로드</div>
                <div className="text-[11px] text-ink-tertiary">m4a, mp3, wav · 최대 50MB</div>
              </>
            )}
          </div>
        </button>
      </div>

      {error && <div className="mb-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">{error}</div>}
      {successMsg && <div className="mb-4 px-3.5 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-800">{successMsg}</div>}

      {/* 필터 탭 + 검색 */}
      <div className="mb-3 animate-fade-up anim-delay-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-1 bg-white border border-line rounded-[11px] px-3 py-2">
            <svg className="text-ink-tertiary flex-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              placeholder="전화번호, 요약 내용 검색..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="flex-1 text-[13px] bg-transparent outline-none text-ink-primary placeholder:text-ink-tertiary"
            />
          </div>
          <button onClick={loadData} disabled={dataLoading}
            className="flex-none w-9 h-9 flex items-center justify-center border border-line rounded-[10px] text-ink-secondary hover:bg-white transition-all disabled:opacity-50">
            <svg className={dataLoading ? 'animate-spin' : ''} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
          </button>
        </div>
        <div className="flex gap-2">
          {FILTERS.map(f => (
            <button key={f.key} onClick={() => setActiveFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                activeFilter === f.key
                  ? 'bg-brand-blue text-white'
                  : 'bg-white border border-line text-ink-secondary hover:border-brand-blue/40'
              }`}>
              {f.label}
              {f.key !== 'all' && (
                <span className="ml-1.5 opacity-70">
                  {calls.filter(c => {
                    let info = c.extracted_info;
                    if (typeof info === 'string') { try { info = JSON.parse(info); } catch { info = null; } }
                    const code = info?.category_code || KO_CATEGORY_MAP[c.category] || 'other';
                    if (f.key === 'reservation') return code === 'reservation' || code === 'order';
                    if (f.key === 'inquiry') return ['hours_location','price','ingredients_allergy','catering_bulk'].includes(code);
                    if (f.key === 'complaint') return code === 'complaint';
                    return false;
                  }).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* 통화 목록 */}
      <div className="animate-fade-up anim-delay-300">
        {dataLoading && calls.length === 0 ? (
          <div className="text-center py-16 text-ink-tertiary text-[13px]">불러오는 중...</div>
        ) : filteredCalls.length === 0 ? (
          <div className="text-center py-16 px-5 bg-white rounded-[14px] border border-dashed border-line">
            <div className="w-14 h-14 mx-auto mb-3 bg-surface-page rounded-[16px] flex items-center justify-center text-2xl">📭</div>
            <h3 className="text-[15px] font-bold text-ink-primary mb-1">
              {search ? '검색 결과가 없어요' : '아직 통화가 없어요'}
            </h3>
            <p className="text-[12px] text-ink-secondary leading-snug">
              {search ? '다른 검색어를 입력해보세요' : '위에서 녹음 파일을 업로드하거나\n앱을 설치해 자동 동기화를 시작해보세요'}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filteredCalls.map(call => (
              <CallCard key={call.id} call={call} onDelete={handleDelete} formatDate={formatDate} formatDuration={formatDuration} />
            ))}
          </div>
        )}
      </div>
    </NavLayout>
  );
}

function CallCard({ call, onDelete, formatDate, formatDuration }) {
  let info = call.extracted_info;
  if (typeof info === 'string') { try { info = JSON.parse(info); } catch { info = null; } }
  let internalKw = call.internal_keywords;
  if (typeof internalKw === 'string') { try { internalKw = JSON.parse(internalKw); } catch { internalKw = null; } }

  const categoryCode = info?.category_code || KO_CATEGORY_MAP[call.category] || 'other';
  const catInfo = CATEGORY_INFO[categoryCode] || CATEGORY_INFO.other;
  const phone = call.caller_number || '발신번호 없음';

  const rows = [];
  if (info && Object.keys(info).some(k => info[k])) {
    if (info?.customer_name) rows.push(['👤 성명', info.customer_name]);
    if (info?.date)          rows.push(['📅 날짜', formatNiceDate(info.date)]);
    if (info?.time)          rows.push(['🕐 시간', info.time]);
    if (info?.party_size)    rows.push(['👥 인원', `${info.party_size}명`]);
    if (info?.special_notes) rows.push(['⚠️ 특이사항', info.special_notes]);
  } else if (internalKw && Object.keys(internalKw).length > 0) {
    const ICON = { '시술':'✂️','일정':'📅','고객상태':'👤','예약인원':'👥','요청사항':'⚠️' };
    Object.entries(internalKw).forEach(([k, v]) => {
      if (v && k !== '액션') rows.push([`${ICON[k] || '📌'} ${k}`, v]);
    });
    if (internalKw['액션']) rows.push(['✅ 액션', internalKw['액션']]);
  }

  return (
    <Link href={`/calls/${call.id}`}
      className="block bg-white border border-line rounded-[14px] p-4 sm:p-5 transition-all hover:border-brand-blue hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)]">
      <div className="flex items-start justify-between gap-2 mb-2.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className={`inline-flex items-center text-[11px] font-bold px-2 py-[2px] rounded-md border ${catInfo.color}`}>
            {catInfo.label}
          </span>
          {call.is_read === 0 && call.status === 'summarized' && (
            <span className="text-[10px] font-bold px-[6px] py-[2px] rounded-full bg-status-new-bg text-status-new-text">NEW</span>
          )}
          {call.action_required === 1 && (
            <span className="text-[10px] font-bold px-[6px] py-[2px] rounded-full bg-red-100 text-red-700">처리필요</span>
          )}
        </div>
        <div className="flex items-center gap-1.5 flex-none text-[11px] text-ink-tertiary">
          <span className="tabular-nums">{formatDate(call.created_at)}</span>
          <span className="text-line">·</span>
          <span className="tabular-nums">{formatDuration(call.duration)}</span>
          <button onClick={e => onDelete(call.id, e)}
            className="ml-0.5 w-6 h-6 rounded-[7px] hover:bg-red-50 hover:text-red-600 flex items-center justify-center transition-all">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <div className="text-[18px] sm:text-[20px] font-bold text-ink-primary tracking-tight mb-3 tabular-nums">{phone}</div>

      {rows.length > 0 && (
        <div className="space-y-1 mb-3">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-start gap-2.5 text-[12px]">
              <span className="flex-none w-16 text-ink-tertiary">{label}</span>
              <span className="flex-1 text-ink-primary font-medium">{value}</span>
            </div>
          ))}
        </div>
      )}

      {call.summary && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-[10px] px-3 py-2.5">
          <div className="text-[10px] font-bold text-emerald-700 mb-1">✨ AI 요약</div>
          <div className="text-[12px] text-emerald-900 leading-relaxed line-clamp-2">{call.summary}</div>
        </div>
      )}
    </Link>
  );
}
