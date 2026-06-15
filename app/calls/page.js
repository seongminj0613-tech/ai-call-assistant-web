'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { callApi } from '@/lib/api';
import AppLayout from '../components/AppLayout';

const DarkNavy = '#3D4D6B';
const AccentBlue = '#3B7DD8';
const LightBg = '#F0F2F5';
const White = '#FFFFFF';

const CATEGORY_INFO = {
  reservation:   { label:'예약',  bg:'#E3EEFB', fg:'#2563B5' },
  order:         { label:'주문',  bg:'#E3EEFB', fg:'#2563B5' },
  cancel_refund: { label:'취소',  bg:'#FBE3E3', fg:'#C23B3B' },
  complaint:     { label:'불만',  bg:'#FBE3E3', fg:'#C23B3B' },
  hours_location:{ label:'문의',  bg:'#EBE9FB', fg:'#5B4FC2' },
  price:         { label:'문의',  bg:'#EBE9FB', fg:'#5B4FC2' },
  positive:      { label:'칭찬',  bg:'#E3FBED', fg:'#1A7A3C' },
  other:         { label:'기타',  bg:'#E8EBF0', fg:'#6B7889' },
};
const KO_MAP = {'예약':'reservation','주문':'order','취소':'cancel_refund','불만':'complaint','문의':'hours_location','기타':'other','칭찬':'positive'};

function getCatInfo(call) {
  let info = call.extracted_info;
  if (typeof info==='string'){try{info=JSON.parse(info);}catch{info=null;}}
  const code = info?.category_code || KO_MAP[call.category] || 'other';
  return CATEGORY_INFO[code] || CATEGORY_INFO.other;
}

function formatDate(s) {
  if (!s) return '-';
  const d = new Date(s), now = new Date();
  const diff = Math.floor((now-d)/60000);
  if (diff<1) return '방금';
  if (diff<60) return `${diff}분 전`;
  if (diff<1440) return `${Math.floor(diff/60)}시간 전`;
  return `${d.getMonth()+1}/${d.getDate()}`;
}

function formatDuration(sec) {
  if (!sec) return '';
  return `${Math.floor(sec/60)}:${String(sec%60).padStart(2,'0')}`;
}

const FILTERS = [
  {key:'all', label:'전체'},
  {key:'reservation', label:'예약'},
  {key:'inquiry', label:'문의'},
  {key:'complaint', label:'불만'},
  {key:'new', label:'새 통화'},
];

export default function CallsPage() {
  const router = useRouter();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) { setTimeout(() => router.push('/login'), 5000); return; }
      await loadCalls();
    });
    return () => unsub();
  }, [router]);

  const loadCalls = async () => {
    setLoading(true);
    try {
      const res = await callApi.list({ limit: 200 });
      setCalls(res.data.calls || []);
    } catch(e){ console.error(e); }
    finally { setLoading(false); }
  };

  const filtered = useMemo(() => {
    let list = [...calls];
    if (filter !== 'all') {
      list = list.filter(c => {
        let info = c.extracted_info;
        if (typeof info==='string'){try{info=JSON.parse(info);}catch{info=null;}}
        const code = info?.category_code || KO_MAP[c.category] || 'other';
        if (filter==='reservation') return ['reservation','order'].includes(code);
        if (filter==='inquiry') return ['hours_location','price','ingredients_allergy','catering_bulk'].includes(code);
        if (filter==='complaint') return code==='complaint';
        if (filter==='new') return c.is_read===0 && c.status==='summarized';
        return true;
      });
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(c => c.caller_number?.includes(q) || c.summary?.toLowerCase().includes(q));
    }
    return list;
  }, [calls, filter, search]);

  const handleDelete = async (callId, e) => {
    e.preventDefault(); e.stopPropagation();
    if (!confirm('삭제할까요?')) return;
    try { await callApi.delete(callId); setCalls(p=>p.filter(c=>c.id!==callId)); } catch{}
  };

  return (
    <AppLayout title="통화 목록" rightAction={
      <button onClick={loadCalls} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'6px 10px', color:'white', cursor:'pointer', fontSize:12 }}>
        새로고침
      </button>
    }>
      {/* 검색 + 필터 */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:White, borderRadius:12, padding:'10px 14px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9AA5B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input type="text" placeholder="전화번호, 요약 내용 검색..."
            value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#1F2A3D', background:'transparent' }} />
        </div>
        <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
          {FILTERS.map(f => (
            <button key={f.key} onClick={()=>setFilter(f.key)} style={{
              flexShrink:0, padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background: filter===f.key ? DarkNavy : White,
              color: filter===f.key ? White : '#6B7889',
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* 통화 목록 */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9AA5B5', fontSize:14 }}>불러오는 중...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9AA5B5', fontSize:14 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📭</div>
          통화가 없어요
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(call => {
            const cat = getCatInfo(call);
            let info = call.extracted_info;
            if (typeof info==='string'){try{info=JSON.parse(info);}catch{info=null;}}
            const name = info?.customer_name;
            const phone = call.caller_number || '발신번호 없음';
            return (
              <Link key={call.id} href={`/calls/${call.id}`} style={{ display:'block', background:White, borderRadius:14, padding:'14px 16px', textDecoration:'none', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', transition:'box-shadow 0.15s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  {/* 아바타 */}
                  <div style={{ width:44, height:44, borderRadius:'50%', background:DarkNavy, display:'flex', alignItems:'center', justifyContent:'center', color:White, fontWeight:700, fontSize:16, flexShrink:0 }}>
                    {(name||phone).slice(0,1).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                      <span style={{ fontWeight:700, fontSize:14, color:'#1F2A3D' }}>{name || phone}</span>
                      <span style={{ fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:4, background:cat.bg, color:cat.fg }}>{cat.label}</span>
                      {call.is_read===0 && call.status==='summarized' && (
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:10, background:'#E53E3E', color:White }}>NEW</span>
                      )}
                    </div>
                    {call.summary && <p style={{ margin:0, fontSize:12, color:'#6B7889', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{call.summary}</p>}
                    {name && <p style={{ margin:'2px 0 0', fontSize:11, color:'#9AA5B5', fontFamily:'monospace' }}>{phone}</p>}
                  </div>
                  <div style={{ flexShrink:0, textAlign:'right' }}>
                    <div style={{ fontSize:12, color:'#9AA5B5', marginBottom:4 }}>{formatDate(call.created_at)}</div>
                    {call.duration && <div style={{ fontSize:11, color:'#9AA5B5' }}>{formatDuration(call.duration)}</div>}
                    <button onClick={e=>handleDelete(call.id,e)} style={{ marginTop:4, background:'none', border:'none', cursor:'pointer', color:'#C8CDD5', fontSize:14, padding:'2px' }}>🗑</button>
                  </div>
                </div>
                {call.summary && (
                  <div style={{ marginTop:10, background:'#F0F7FF', borderRadius:8, padding:'8px 12px' }}>
                    <div style={{ fontSize:10, fontWeight:700, color:AccentBlue, marginBottom:3 }}>✨ AI 요약</div>
                    <p style={{ margin:0, fontSize:12, color:'#2D4A7A', lineHeight:1.5 }}>{call.summary}</p>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
