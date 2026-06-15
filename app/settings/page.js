'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState, logout } from '@/lib/firebase';
import { storeApi, keywordApi } from '@/lib/api';
import AppLayout from '../components/AppLayout';

const DarkNavy='#3D4D6B', AccentBlue='#3B7DD8', White='#FFFFFF';

const INDUSTRY_PRESETS = [
  {label:'음식점', emoji:'🍽️', keywords:['예약','단체','알레르기','포장','배달','취소','자리','메뉴']},
  {label:'부동산', emoji:'🏠', keywords:['계약서','잔금','전세','월세','임대','매물','방문','등기']},
  {label:'미용실', emoji:'✂️', keywords:['예약','펌','염색','커트','탈색','두피','취소','변경']},
  {label:'병원',   emoji:'🏥', keywords:['예약','진료','처방','재진','검사','취소','접수','수술']},
  {label:'네일샵', emoji:'💅', keywords:['예약','젤네일','아트','제거','취소','연장','변경']},
  {label:'자동차정비', emoji:'🔧', keywords:['입고','정비','엔진오일','타이어','점검','부품','견적']},
];

const TABS=[{key:'store',label:'가게 정보'},{key:'keyword',label:'키워드'},{key:'filter',label:'통화 필터'},{key:'account',label:'계정'}];

const itemStyle = {
  display:'flex', alignItems:'center', justifyContent:'space-between',
  padding:'14px 0', borderBottom:'1px solid #F0F2F5',
};
const labelStyle = { fontSize:14, fontWeight:600, color:'#1F2A3D' };
const subStyle = { fontSize:12, color:'#9AA5B5', marginTop:2 };

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState('store');
  const [stores, setStores] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [newKw, setNewKw] = useState('');
  const [importantCats, setImportantCats] = useState(new Set(['예약','취소','불만','문의']));
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(()=>{
    const unsub=watchAuthState(async(user)=>{
      if(!user){router.push('/login');return;}
      await loadData();
    });
    return()=>unsub();
  },[router]);

  const loadData=async()=>{
    setLoading(true);
    try{
      const res=await storeApi.list();
      const list=res.data.stores||[];
      setStores(list);
      if(list.length>0){
        const s=list[0];
        setActiveStoreId(s.id);setStoreName(s.name||'');setStoreCategory(s.category||'');
        try{const kwRes=await keywordApi.list(s.id);setKeywords(kwRes.data?.keywords||[]);}catch{}
      }
      const saved=localStorage.getItem('important_categories');
      if(saved) setImportantCats(new Set(JSON.parse(saved)));
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const showMsg=(text)=>{ setMsg(text); setTimeout(()=>setMsg(''),2500); };

  const handleSaveStore=async()=>{
    if(!storeName.trim()){showMsg('❌ 가게 이름을 입력해주세요');return;}
    setSaving(true);
    try{
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/stores/${activeStoreId}`,{
        method:'PATCH', headers:{'Content-Type':'application/json','Authorization':`Bearer ${localStorage.getItem('firebase_id_token')}`},
        body:JSON.stringify({name:storeName,category:storeCategory}),
      });
      showMsg('✅ 저장됐어요');
    }catch{showMsg('❌ 저장 실패');}
    finally{setSaving(false);}
  };

  const handleAddKw=async()=>{
    if(!newKw.trim()||!activeStoreId) return;
    if(keywords.length>=20){showMsg('❌ 최대 20개까지 가능해요');return;}
    try{
      const res=await keywordApi.create(activeStoreId,newKw.trim());
      setKeywords(p=>[...p,res.data?.keyword||{id:Date.now(),keyword:newKw.trim()}]);
      setNewKw(''); showMsg('✅ 추가됐어요');
    }catch{showMsg('❌ 추가 실패');}
  };

  const handleDelKw=async(id)=>{
    if(!activeStoreId) return;
    try{await keywordApi.delete(activeStoreId,id);setKeywords(p=>p.filter(k=>k.id!==id));}catch{showMsg('❌ 삭제 실패');}
  };

  const handlePreset=(preset)=>{
    const existing=new Set(keywords.map(k=>k.keyword));
    const toAdd=preset.keywords.filter(kw=>!existing.has(kw));
    if(keywords.length+toAdd.length>20){showMsg('❌ 최대 20개를 초과해요');return;}
    setKeywords(p=>[...p,...toAdd.map((kw,i)=>({id:`p-${Date.now()}-${i}`,keyword:kw}))]);
    showMsg(`✅ ${preset.label} 키워드 추가됐어요`);
  };

  const toggleCat=(cat)=>{
    const next=new Set(importantCats);
    if(next.has(cat)) next.delete(cat); else next.add(cat);
    setImportantCats(next);
    localStorage.setItem('important_categories',JSON.stringify([...next]));
  };

  const cardStyle={background:White,borderRadius:16,padding:20,marginBottom:14,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'};

  return (
    <AppLayout title="설정">
      {msg&&<div style={{ marginBottom:14, padding:'12px 16px', background:msg.startsWith('✅')?'#E3FBED':'#FBE3E3', borderRadius:10, fontSize:13, color:msg.startsWith('✅')?'#1A7A3C':'#C23B3B' }}>{msg}</div>}

      {/* 탭 */}
      <div style={{ display:'flex', gap:8, marginBottom:16, overflowX:'auto', paddingBottom:4 }}>
        {TABS.map(t=>(
          <button key={t.key} onClick={()=>setTab(t.key)} style={{
            flexShrink:0, padding:'8px 16px', borderRadius:20, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
            background:tab===t.key?DarkNavy:White, color:tab===t.key?White:'#6B7889',
            boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9AA5B5', fontSize:14 }}>불러오는 중...</div>
      ) : (
        <>
          {/* 가게 정보 */}
          {tab==='store'&&(
            <div style={cardStyle}>
              <div style={{ fontWeight:700, fontSize:15, color:'#1F2A3D', marginBottom:16 }}>가게 정보</div>
              {stores.length===0 ? (
                <div style={{ textAlign:'center', padding:'20px 0' }}>
                  <p style={{ fontSize:13, color:'#9AA5B5', marginBottom:12 }}>등록된 가게가 없어요</p>
                  <Link href="/stores/new" style={{ color:AccentBlue, fontWeight:600, fontSize:13 }}>가게 등록하기 →</Link>
                </div>
              ):(
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#6B7889', marginBottom:6 }}>가게 이름</div>
                    <input type="text" value={storeName} onChange={e=>setStoreName(e.target.value)}
                      style={{ width:'100%', padding:'12px 14px', border:'1px solid #E8EBF0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <div>
                    <div style={{ fontSize:12, fontWeight:600, color:'#6B7889', marginBottom:6 }}>업종</div>
                    <input type="text" value={storeCategory} onChange={e=>setStoreCategory(e.target.value)} placeholder="예: 음식점, 미용실..."
                      style={{ width:'100%', padding:'12px 14px', border:'1px solid #E8EBF0', borderRadius:10, fontSize:14, outline:'none', boxSizing:'border-box' }}/>
                  </div>
                  <button onClick={handleSaveStore} disabled={saving} style={{ width:'100%', padding:'13px', background:DarkNavy, border:'none', borderRadius:10, color:White, fontWeight:600, fontSize:14, cursor:'pointer' }}>
                    {saving?'저장 중...':'저장하기'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 키워드 */}
          {tab==='keyword'&&(
            <>
              <div style={cardStyle}>
                <div style={{ fontWeight:700, fontSize:15, color:'#1F2A3D', marginBottom:4 }}>업종 프리셋</div>
                <p style={{ fontSize:12, color:'#9AA5B5', marginBottom:14 }}>업종을 선택하면 키워드가 자동으로 추가돼요</p>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {INDUSTRY_PRESETS.map(p=>(
                    <button key={p.label} onClick={()=>handlePreset(p)} style={{ display:'flex', alignItems:'center', gap:6, padding:'10px 12px', background:'#F0F2F5', border:'none', borderRadius:10, cursor:'pointer', fontSize:13, fontWeight:600, color:'#1F2A3D' }}>
                      <span>{p.emoji}</span>{p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div style={cardStyle}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'#1F2A3D' }}>내 키워드</div>
                  <span style={{ fontSize:12, color:'#9AA5B5' }}>{keywords.length}/20</span>
                </div>
                <div style={{ display:'flex', gap:8, marginBottom:14 }}>
                  <input type="text" value={newKw} onChange={e=>setNewKw(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleAddKw()} placeholder="키워드 입력 후 Enter"
                    style={{ flex:1, padding:'10px 14px', border:'1px solid #E8EBF0', borderRadius:10, fontSize:13, outline:'none' }}/>
                  <button onClick={handleAddKw} style={{ padding:'10px 16px', background:DarkNavy, border:'none', borderRadius:10, color:White, fontWeight:600, fontSize:13, cursor:'pointer' }}>추가</button>
                </div>
                {keywords.length===0 ? (
                  <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:13 }}>아직 키워드가 없어요</div>
                ):(
                  <div style={{ display:'flex', flexWrap:'wrap', gap:8 }}>
                    {keywords.map(kw=>(
                      <span key={kw.id} style={{ display:'inline-flex', alignItems:'center', gap:6, background:'#EFF6FF', color:AccentBlue, fontSize:13, fontWeight:600, padding:'6px 12px', borderRadius:20 }}>
                        {kw.keyword}
                        <button onClick={()=>handleDelKw(kw.id)} style={{ background:'none', border:'none', cursor:'pointer', color:AccentBlue, fontSize:12, padding:0, lineHeight:1 }}>✕</button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* 통화 필터 */}
          {tab==='filter'&&(
            <div style={cardStyle}>
              <div style={{ fontWeight:700, fontSize:15, color:'#1F2A3D', marginBottom:4 }}>중요 통화 필터</div>
              <p style={{ fontSize:12, color:'#9AA5B5', marginBottom:16 }}>홈에서 중요 통화로 표시할 카테고리를 선택하세요</p>
              {['예약','취소','불만','문의','주문','기타'].map(cat=>(
                <div key={cat} onClick={()=>toggleCat(cat)} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', marginBottom:8, borderRadius:12, border:`1px solid ${importantCats.has(cat)?AccentBlue:'#E8EBF0'}`, background:importantCats.has(cat)?'#EFF6FF':'transparent', cursor:'pointer' }}>
                  <span style={{ fontSize:14, fontWeight:600, color:'#1F2A3D' }}>{cat}</span>
                  <div style={{ width:22, height:22, borderRadius:'50%', border:`2px solid ${importantCats.has(cat)?AccentBlue:'#C8CDD5'}`, background:importantCats.has(cat)?AccentBlue:'transparent', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {importantCats.has(cat)&&<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 계정 */}
          {tab==='account'&&(
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div style={cardStyle}>
                <div style={{ fontWeight:700, fontSize:15, color:'#1F2A3D', marginBottom:14 }}>계정 정보</div>
                <div style={itemStyle}><span style={labelStyle}>로그인 방식</span><span style={{ fontSize:13, color:'#6B7889' }}>카카오</span></div>
                <div style={itemStyle}><span style={labelStyle}>앱 버전</span><span style={{ fontSize:13, color:'#6B7889' }}>웹 v1.0</span></div>
              </div>
              <div style={cardStyle}>
                <div style={{ fontWeight:700, fontSize:15, color:'#1F2A3D', marginBottom:14 }}>연결된 앱</div>
                <Link href="/calendar/connect" style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#F0F2F5', borderRadius:12, textDecoration:'none', marginBottom:8 }}>
                  <span style={{ fontSize:20 }}>📅</span>
                  <div><div style={{ fontSize:13, fontWeight:600, color:'#1F2A3D' }}>캘린더 연동 관리</div><div style={{ fontSize:11, color:'#9AA5B5' }}>구글, 카카오, 네이버</div></div>
                  <span style={{ marginLeft:'auto', color:'#C8CDD5' }}>›</span>
                </Link>
                <a href="https://drive.google.com/file/d/1jJNRF2CCVcCKSpdIPUODjWL6F5exxJ-T/view" target="_blank" rel="noopener noreferrer"
                  style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:DarkNavy, borderRadius:12, textDecoration:'none' }}>
                  <span style={{ fontSize:20 }}>📱</span>
                  <div><div style={{ fontSize:13, fontWeight:600, color:White }}>안드로이드 앱 다운로드</div><div style={{ fontSize:11, color:'rgba(255,255,255,0.5)' }}>APK 직접 다운로드</div></div>
                </a>
              </div>
              <button onClick={async()=>{await logout();router.push('/');}}
                style={{ width:'100%', padding:'14px', background:White, border:'1px solid #FBE3E3', borderRadius:14, color:'#C23B3B', fontWeight:600, fontSize:14, cursor:'pointer' }}>
                로그아웃
              </button>
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}
