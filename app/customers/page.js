'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { watchAuthState } from '@/lib/firebase';
import { callApi } from '@/lib/api';
import NavLayout from '../components/NavLayout';

const KO_CATEGORY_MAP = {
  '예약': 'reservation', '주문': 'order', '취소': 'cancel_refund',
  '불만': 'complaint', '문의': 'hours_location', '기타': 'other',
};

const CUST_FILTERS = [
  { key: 'all',    label: '전체' },
  { key: 'vip',    label: 'VIP' },
  { key: 'new',    label: '신규' },
  { key: 'recent', label: '최근' },
];

function buildCustomers(calls) {
  const grouped = {};
  calls.filter(c => c.caller_number).forEach(c => {
    const phone = c.caller_number;
    if (!grouped[phone]) grouped[phone] = [];
    grouped[phone].push(c);
  });
  return Object.entries(grouped).map(([phone, cs]) => {
    const sorted = [...cs].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const latest = sorted[0];
    let info = latest.extracted_info;
    if (typeof info === 'string') { try { info = JSON.parse(info); } catch { info = null; } }
    const name = cs.map(c => {
      let i = c.extracted_info;
      if (typeof i === 'string') { try { i = JSON.parse(i); } catch { i = null; } }
      return i?.customer_name;
    }).find(n => n && n.trim());
    return {
      phone,
      name: name || null,
      callCount: cs.length,
      lastCallAt: latest.created_at,
      lastSummary: latest.summary,
      categories: [...new Set(cs.map(c => c.category).filter(Boolean))],
      calls: sorted,
      isVip: cs.length >= 3,
    };
  }).sort((a, b) => b.callCount - a.callCount);
}

function formatDate(s) {
  if (!s) return '-';
  const d = new Date(s);
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function CustomersPage() {
  const router = useRouter();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) { router.push('/login'); return; }
      try {
        const res = await callApi.list({ limit: 500 });
        setCalls(res.data.calls || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, [router]);

  const customers = useMemo(() => buildCustomers(calls), [calls]);

  const filtered = useMemo(() => {
    let list = [...customers];
    if (filter === 'vip') list = list.filter(c => c.isVip);
    else if (filter === 'new') list = list.filter(c => c.callCount === 1);
    else if (filter === 'recent') list = [...list].sort((a, b) => new Date(b.lastCallAt) - new Date(a.lastCallAt));
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.phone.includes(q) || (c.name && c.name.toLowerCase().includes(q)));
    }
    return list;
  }, [customers, filter, search]);

  if (selected) {
    return (
      <NavLayout>
        <CustomerDetail customer={selected} onBack={() => setSelected(null)} />
      </NavLayout>
    );
  }

  return (
    <NavLayout>
      <div className="mb-5 animate-fade-up">
        <h1 className="text-[22px] font-bold text-ink-primary tracking-tight mb-1">고객 관리</h1>
        <p className="text-[13px] text-ink-secondary">전화번호 기준으로 고객별 통화 이력을 확인해요</p>
      </div>

      {/* 통계 */}
      <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-up anim-delay-100">
        {[
          ['전체 고객', customers.length, 'bg-blue-50 text-blue-700'],
          ['VIP (3회↑)', customers.filter(c => c.isVip).length, 'bg-purple-50 text-purple-700'],
          ['신규 고객', customers.filter(c => c.callCount === 1).length, 'bg-emerald-50 text-emerald-700'],
        ].map(([label, count, cls]) => (
          <div key={label} className={`rounded-[14px] p-3.5 text-center ${cls}`}>
            <div className="text-[24px] font-extrabold tabular-nums">{loading ? '-' : count}</div>
            <div className="text-[11px] font-semibold mt-0.5 opacity-80">{label}</div>
          </div>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div className="mb-4 animate-fade-up anim-delay-200">
        <div className="flex items-center gap-2 bg-white border border-line rounded-[11px] px-3 py-2 mb-3">
          <svg className="text-ink-tertiary flex-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="이름 또는 전화번호 검색..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="flex-1 text-[13px] bg-transparent outline-none text-ink-primary placeholder:text-ink-tertiary" />
        </div>
        <div className="flex gap-2">
          {CUST_FILTERS.map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[12px] font-semibold transition-all ${
                filter === f.key ? 'bg-brand-blue text-white' : 'bg-white border border-line text-ink-secondary hover:border-brand-blue/40'
              }`}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* 고객 목록 */}
      <div className="animate-fade-up anim-delay-300">
        {loading ? (
          <div className="text-center py-16 text-[13px] text-ink-tertiary">불러오는 중...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-[14px] border border-dashed border-line">
            <div className="text-3xl mb-2">👥</div>
            <p className="text-[14px] font-bold text-ink-primary mb-1">고객이 없어요</p>
            <p className="text-[12px] text-ink-secondary">통화가 등록되면 자동으로 고객이 생성돼요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {filtered.map(c => (
              <button key={c.phone} onClick={() => setSelected(c)}
                className="w-full text-left bg-white border border-line rounded-[14px] p-4 transition-all hover:border-brand-blue hover:shadow-[0_4px_12px_rgba(59,130,246,0.08)]">
                <div className="flex items-center gap-3">
                  <div className={`flex-none w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold ${
                    c.isVip ? 'bg-purple-100 text-purple-700' : 'bg-brand-blue-light text-brand-blue'
                  }`}>
                    {c.isVip ? '⭐' : (c.name ? c.name[0] : '👤')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[14px] font-bold text-ink-primary tabular-nums truncate">{c.phone}</span>
                      {c.isVip && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">VIP</span>
                      )}
                      {c.callCount === 1 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">신규</span>
                      )}
                    </div>
                    {c.name && <div className="text-[12px] text-ink-secondary mb-0.5">{c.name}</div>}
                    {c.lastSummary && (
                      <div className="text-[11px] text-ink-tertiary truncate">{c.lastSummary}</div>
                    )}
                  </div>
                  <div className="flex-none text-right">
                    <div className="text-[13px] font-bold text-ink-primary tabular-nums">{c.callCount}회</div>
                    <div className="text-[10px] text-ink-tertiary mt-0.5">{formatDate(c.lastCallAt)}</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </NavLayout>
  );
}

function CustomerDetail({ customer: c, onBack }) {
  return (
    <div>
      <button onClick={onBack}
        className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink-primary mb-5 px-3 py-2 hover:bg-white rounded-[10px] transition-all">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
        고객 목록으로
      </button>

      {/* 고객 헤더 */}
      <div className="bg-white border border-line rounded-[16px] p-5 mb-4">
        <div className="flex items-center gap-3.5 mb-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold ${
            c.isVip ? 'bg-purple-100 text-purple-700' : 'bg-brand-blue-light text-brand-blue'
          }`}>
            {c.isVip ? '⭐' : (c.name ? c.name[0] : '👤')}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[18px] font-bold text-ink-primary tabular-nums">{c.phone}</span>
              {c.isVip && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">VIP</span>}
            </div>
            {c.name && <div className="text-[14px] text-ink-secondary">{c.name}</div>}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 pt-4 border-t border-line">
          {[
            ['총 통화', `${c.callCount}회`],
            ['마지막 통화', formatDate(c.lastCallAt)],
            ['카테고리', c.categories.join(', ') || '-'],
          ].map(([label, value]) => (
            <div key={label}>
              <div className="text-[10px] text-ink-tertiary mb-0.5">{label}</div>
              <div className="text-[12px] font-semibold text-ink-primary">{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 통화 이력 */}
      <h2 className="text-[14px] font-bold text-ink-primary mb-3">통화 이력</h2>
      <div className="flex flex-col gap-2.5">
        {c.calls.map(call => (
          <a key={call.id} href={`/calls/${call.id}`}
            className="block bg-white border border-line rounded-[14px] p-4 hover:border-brand-blue transition-all">
            <div className="flex items-start justify-between mb-2">
              <span className={`text-[11px] font-bold px-2 py-[2px] rounded-md border ${
                call.category ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-600 border-gray-200'
              }`}>{call.category || '분류없음'}</span>
              <span className="text-[11px] text-ink-tertiary tabular-nums">{formatDate(call.created_at)}</span>
            </div>
            {call.summary && <p className="text-[12px] text-ink-secondary leading-relaxed line-clamp-2">{call.summary}</p>}
          </a>
        ))}
      </div>
    </div>
  );
}
