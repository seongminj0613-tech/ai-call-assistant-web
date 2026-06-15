'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { callApi } from '@/lib/api';
import AppLayout from '../components/AppLayout';

const DarkNavy = '#3D4D6B';
const AccentBlue = '#3B7DD8';
const White = '#FFFFFF';

const KO_MAP = {'예약':'reservation','주문':'order','취소':'cancel_refund','불만':'complaint','문의':'hours_location','기타':'other'};

function buildCustomers(calls) {
  const map = {};
  calls.filter(c=>c.caller_number).forEach(c=>{
    const p=c.caller_number;
    if(!map[p])map[p]=[];
    map[p].push(c);
  });
  return Object.entries(map).map(([phone,cs])=>{
    const sorted=[...cs].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
    const latest=sorted[0];
    let info=latest.extracted_info;
    if(typeof info==='string'){try{info=JSON.parse(info);}catch{info=null;}}
    const name=cs.map(c=>{let i=c.extracted_info;if(typeof i==='string'){try{i=JSON.parse(i);}catch{i=null;}}return i?.customer_name;}).find(n=>n&&n.trim());
    return {phone,name:name||null,callCount:cs.length,lastCallAt:latest.created_at,lastSummary:latest.summary,calls:sorted,isVip:cs.length>=3};
  }).sort((a,b)=>b.callCount-a.callCount);
}

function formatDate(s) {
  if(!s) return '-';
  const d=new Date(s);
  return d.toLocaleString('ko-KR',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
}

const FILTERS = [{key:'all',label:'전체'},{key:'vip',label:'VIP'},{key:'new',label:'신규'},{key:'recent',label:'최근'}];

export default function CustomersPage() {
  const router = useRouter();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);

  useEffect(()=>{
    const unsub=watchAuthState(async(user)=>{
      if(!user){router.push('/login');return;}
      try{const res=await callApi.list({limit:500});setCalls(res.data.calls||[]);}
      catch(e){console.error(e);}
      finally{setLoading(false);}
    });
    return()=>unsub();
  },[router]);

  const customers = useMemo(()=>buildCustomers(calls),[calls]);

  const filtered = useMemo(()=>{
    let list=[...customers];
    if(filter==='vip') list=list.filter(c=>c.isVip);
    else if(filter==='new') list=list.filter(c=>c.callCount===1);
    else if(filter==='recent') list=[...list].sort((a,b)=>new Date(b.lastCallAt)-new Date(a.lastCallAt));
    if(search.trim()){const q=search.trim().toLowerCase();list=list.filter(c=>c.phone.includes(q)||(c.name&&c.name.toLowerCase().includes(q)));}
    return list;
  },[customers,filter,search]);

  if (selected) {
    return (
      <AppLayout title={selected.name || selected.phone} rightAction={
        <button onClick={()=>setSelected(null)} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:8, padding:'6px 10px', color:'white', cursor:'pointer', fontSize:12 }}>목록으로</button>
      }>
        <CustomerDetail customer={selected} />
      </AppLayout>
    );
  }

  return (
    <AppLayout title="고객 관리">
      {/* 통계 */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
        {[['전체 고객', customers.length, '#E3EEFB','#2563B5'],
          ['VIP (3회↑)', customers.filter(c=>c.isVip).length, '#EBE9FB','#5B4FC2'],
          ['신규 고객', customers.filter(c=>c.callCount===1).length, '#E3FBED','#1A7A3C']].map(([label,count,bg,fg])=>(
          <div key={label} style={{ background:bg, borderRadius:14, padding:'14px 12px', textAlign:'center' }}>
            <div style={{ fontSize:26, fontWeight:800, color:fg }}>{loading?'-':count}</div>
            <div style={{ fontSize:11, fontWeight:600, color:fg, opacity:0.8, marginTop:2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* 검색 + 필터 */}
      <div style={{ marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, background:White, borderRadius:12, padding:'10px 14px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#9AA5B5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input type="text" placeholder="이름 또는 전화번호 검색..." value={search} onChange={e=>setSearch(e.target.value)}
            style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#1F2A3D', background:'transparent' }} />
        </div>
        <div style={{ display:'flex', gap:8 }}>
          {FILTERS.map(f=>(
            <button key={f.key} onClick={()=>setFilter(f.key)} style={{
              padding:'6px 14px', borderRadius:20, border:'none', cursor:'pointer', fontSize:12, fontWeight:600,
              background:filter===f.key?DarkNavy:White, color:filter===f.key?White:'#6B7889',
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
            }}>{f.label}</button>
          ))}
        </div>
      </div>

      {/* 고객 목록 */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9AA5B5', fontSize:14 }}>불러오는 중...</div>
      ) : filtered.length===0 ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9AA5B5', fontSize:14 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
          고객이 없어요
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {filtered.map(c=>(
            <button key={c.phone} onClick={()=>setSelected(c)} style={{
              display:'flex', alignItems:'center', gap:12, background:White, borderRadius:14,
              padding:'14px 16px', border:'none', cursor:'pointer', textAlign:'left',
              boxShadow:'0 1px 4px rgba(0,0,0,0.06)', width:'100%', transition:'box-shadow 0.15s',
            }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:c.isVip?'#7B6BC2':DarkNavy, display:'flex', alignItems:'center', justifyContent:'center', color:White, fontWeight:700, fontSize:16, flexShrink:0 }}>
                {c.isVip ? '⭐' : (c.name||c.phone).slice(0,1).toUpperCase()}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                  <span style={{ fontWeight:700, fontSize:14, color:'#1F2A3D', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.phone}</span>
                  {c.isVip&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:10, background:'#EBE9FB', color:'#5B4FC2' }}>VIP</span>}
                  {c.callCount===1&&<span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:10, background:'#E3FBED', color:'#1A7A3C' }}>신규</span>}
                </div>
                {c.name&&<div style={{ fontSize:12, color:'#6B7889', marginBottom:2 }}>{c.name}</div>}
                {c.lastSummary&&<p style={{ margin:0, fontSize:11, color:'#9AA5B5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.lastSummary}</p>}
              </div>
              <div style={{ flexShrink:0, textAlign:'right' }}>
                <div style={{ fontSize:14, fontWeight:800, color:'#1F2A3D' }}>{c.callCount}<span style={{ fontSize:11, fontWeight:400, color:'#9AA5B5' }}>회</span></div>
                <div style={{ fontSize:10, color:'#9AA5B5', marginTop:2 }}>{formatDate(c.lastCallAt)}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

function CustomerDetail({ customer: c }) {
  return (
    <div>
      {/* 고객 헤더 카드 */}
      <div style={{ background:'#FFFFFF', borderRadius:16, padding:20, marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:56, height:56, borderRadius:'50%', background:c.isVip?'#7B6BC2':DarkNavy, display:'flex', alignItems:'center', justifyContent:'center', color:'white', fontWeight:700, fontSize:22 }}>
            {c.isVip?'⭐':(c.name||c.phone).slice(0,1).toUpperCase()}
          </div>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontSize:18, fontWeight:700, color:'#1F2A3D' }}>{c.phone}</span>
              {c.isVip&&<span style={{ fontSize:11, fontWeight:700, padding:'3px 8px', borderRadius:10, background:'#EBE9FB', color:'#5B4FC2' }}>VIP</span>}
            </div>
            {c.name&&<div style={{ fontSize:14, color:'#6B7889' }}>{c.name}</div>}
          </div>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, paddingTop:14, borderTop:'1px solid #F0F2F5' }}>
          {[['총 통화',`${c.callCount}회`],['마지막 통화',formatDate(c.lastCallAt)],['상태',c.isVip?'VIP':'일반']].map(([label,value])=>(
            <div key={label} style={{ textAlign:'center' }}>
              <div style={{ fontSize:10, color:'#9AA5B5', marginBottom:3 }}>{label}</div>
              <div style={{ fontSize:13, fontWeight:600, color:'#1F2A3D' }}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 통화 이력 */}
      <div style={{ fontWeight:700, fontSize:14, color:'#1F2A3D', marginBottom:10 }}>통화 이력</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {c.calls.map(call=>(
          <Link key={call.id} href={`/calls/${call.id}`} style={{ display:'block', background:'#FFFFFF', borderRadius:14, padding:'14px 16px', textDecoration:'none', boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
              <span style={{ fontSize:12, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'#E3EEFB', color:'#2563B5' }}>{call.category||'분류없음'}</span>
              <span style={{ fontSize:11, color:'#9AA5B5' }}>{formatDate(call.created_at)}</span>
            </div>
            {call.summary&&<p style={{ margin:0, fontSize:12, color:'#6B7889', lineHeight:1.5 }}>{call.summary}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
