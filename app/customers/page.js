'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
    const name=cs.map(c=>{let i=c.extracted_info;if(typeof i==='string'){try{i=JSON.parse(i);}catch{i=null;}}return i?.customer_name;}).find(n=>n&&n.trim());
    return {phone,name:name||null,callCount:cs.length,lastCallAt:latest.created_at,lastSummary:latest.summary,calls:sorted,isVip:cs.length>=3};
  }).sort((a,b)=>b.callCount-a.callCount);
}

function getSummary(call) {
  const s = call?.summary || call?.lastSummary;
  if (!s) return '';
  if (typeof s === 'string') return s;
  if (typeof s === 'object') return s.label || s.code || s.text || '';
  return String(s);
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
  const [noteModal, setNoteModal] = useState(null); // { callId, type: 'memo'|'photo' }

  useEffect(()=>{
    const unsub=watchAuthState(async(user)=>{
      if(!user){setTimeout(()=>router.push('/login'),5000);return;}
      try{
        const res=await callApi.list({limit:500});
        const allCalls=res.data.calls||[];
        setCalls(allCalls);
        // URL 파라미터로 상세 페이지 복원
        const phone = new URLSearchParams(window.location.search).get('phone');
        if (phone) {
          const map = {};
          allCalls.filter(c=>c.caller_number).forEach(c=>{
            if(!map[c.caller_number])map[c.caller_number]=[];
            map[c.caller_number].push(c);
          });
          if (map[phone]) {
            const cs = map[phone].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at));
            const name=cs.map(c=>{let i=c.extracted_info;if(typeof i==='string'){try{i=JSON.parse(i);}catch{i=null;}}return i?.customer_name;}).find(n=>n&&n.trim());
            setSelected({phone,name:name||null,callCount:cs.length,lastCallAt:cs[0].created_at,lastSummary:cs[0].summary,calls:cs,isVip:cs.length>=3});
          }
        }
      }
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

  return (
    <AppLayout title="고객 관리">
      {/* 메모/사진 모달 */}
      {noteModal && (
        <NoteModal
          callId={noteModal.callId}
          initialType={noteModal.type}
          onClose={() => setNoteModal(null)}
        />
      )}

      {/* 고객 상세 */}
      {selected ? (
        <CustomerDetail
          customer={selected}
          onBack={() => { setSelected(null); window.history.replaceState(null,'','/customers'); }}
          
        />
      ) : (
        <>
          {/* 통계 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:16 }}>
            {[
              ['전체 고객', customers.length, '#E3EEFB','#2563B5'],
              ['VIP (3회↑)', customers.filter(c=>c.isVip).length, '#EBE9FB','#5B4FC2'],
              ['신규 고객', customers.filter(c=>c.callCount===1).length, '#E3FBED','#1A7A3C'],
            ].map(([label,count,bg,fg])=>(
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
              <div style={{ fontSize:40, marginBottom:12 }}>👥</div>고객이 없어요
            </div>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {filtered.map(c=>(
                <button key={c.phone} onClick={()=>{ setSelected(c); window.history.replaceState(null,'',`/customers?phone=${encodeURIComponent(c.phone)}`); }} style={{
                  display:'flex', alignItems:'center', gap:12, background:White, borderRadius:14,
                  padding:'14px 16px', border:'none', cursor:'pointer', textAlign:'left',
                  boxShadow:'0 1px 4px rgba(0,0,0,0.06)', width:'100%',
                }}>
                  <div style={{ width:44,height:44,borderRadius:'50%',background:c.isVip?'#7B6BC2':DarkNavy,display:'flex',alignItems:'center',justifyContent:'center',color:White,fontWeight:700,fontSize:16,flexShrink:0 }}>
                    {c.isVip?'⭐':(c.name||c.phone).slice(0,1).toUpperCase()}
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
                    <div style={{ fontSize:13, fontWeight:800, color:'#1F2A3D' }}>{c.callCount}<span style={{ fontSize:11, fontWeight:400, color:'#9AA5B5' }}>회</span></div>
                    <div style={{ fontSize:10, color:'#9AA5B5', marginTop:2 }}>{formatDate(c.lastCallAt)}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </AppLayout>
  );
}

// 통화별 메모/사진 인라인 컴포넌트
function CallNoteInline({ call }) {
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;
  const getToken = () => localStorage.getItem('firebase_id_token');
  const fileInputRef = useRef(null);

  const [memo, setMemo] = useState('');
  const [photos, setPhotos] = useState([]);
  const [editingMemo, setEditingMemo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [msg, setMsg] = useState('');

  // 처음 열릴 때 로드
  useEffect(() => {
    fetch(`${API}/calls/${call.id}/note`, {
      headers: { 'Authorization': `Bearer ${getToken()}` }
    }).then(r=>r.json()).then(data=>{
      setMemo(data.memo || '');
      setPhotos(data.photos || []);
      setLoaded(true);
    }).catch(()=>setLoaded(true));
  }, [call.id]);

  const saveMemo = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/calls/${call.id}/note`, {
        method:'PATCH',
        headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},
        body:JSON.stringify({memo}),
      });
      setEditingMemo(false);
      setMsg('저장됐어요 ✓');
      setTimeout(()=>setMsg(''),2000);
    } catch{}
    finally{setSaving(false);}
  };

  const uploadPhoto = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const r1 = await fetch(`${API}/calls/${call.id}/photos/upload-url`,{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},
        body:JSON.stringify({file_name:file.name}),
      });
      const {photo_id,upload_url,s3_key,upload_headers}=await r1.json();
      await fetch(upload_url,{method:'PUT',headers:upload_headers,body:file});
      const r2=await fetch(`${API}/calls/${call.id}/photos`,{
        method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${getToken()}`},
        body:JSON.stringify({photo_id,s3_key}),
      });
      const saved=await r2.json();
      setPhotos(prev=>[...prev,saved.photo]);
      setMsg('사진 저장됐어요 ✓');
      setTimeout(()=>setMsg(''),2000);
    } catch(e){setMsg('업로드 실패');}
    finally{setUploading(false);}
  };

  const deletePhoto = async (photoId) => {
    if (!confirm('삭제할까요?')) return;
    await fetch(`${API}/calls/${call.id}/photos/${photoId}`,{
      method:'DELETE',headers:{'Authorization':`Bearer ${getToken()}`}
    });
    setPhotos(prev=>prev.filter(p=>p.id!==photoId));
  };

  return (
    <div style={{ borderTop:'1px solid #F0F2F5', padding:'12px 16px', background:'#FAFBFC' }}>
      {msg && <div style={{ fontSize:11, color:'#1A7A3C', marginBottom:8 }}>{msg}</div>}

      {/* 메모 영역 */}
      <div style={{ marginBottom: photos.length > 0 || editingMemo ? 10 : 0 }}>
        {editingMemo ? (
          <div>
            <textarea value={memo} onChange={e=>setMemo(e.target.value)} rows={3}
              placeholder="메모를 입력하세요..."
              style={{ width:'100%', padding:'8px 10px', fontSize:12, border:'1px solid #E8EBF0', borderRadius:8, resize:'none', outline:'none', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.5, background:White }}
            />
            <div style={{ display:'flex', gap:6, marginTop:6 }}>
              <button onClick={saveMemo} disabled={saving} style={{ padding:'5px 14px', background:DarkNavy, border:'none', borderRadius:6, color:White, fontSize:11, fontWeight:600, cursor:'pointer' }}>
                {saving?'저장 중...':'저장'}
              </button>
              <button onClick={()=>setEditingMemo(false)} style={{ padding:'5px 14px', background:'#E8EBF0', border:'none', borderRadius:6, color:'#6B7889', fontSize:11, cursor:'pointer' }}>취소</button>
            </div>
          </div>
        ) : memo ? (
          <div onClick={()=>setEditingMemo(true)} style={{ cursor:'pointer', background:White, borderRadius:8, padding:'8px 10px', border:'1px solid #E8EBF0' }}>
            <div style={{ fontSize:10, color:'#9AA5B5', marginBottom:3 }}>📝 메모 (클릭하여 수정)</div>
            <p style={{ margin:0, fontSize:12, color:'#1F2A3D', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{memo}</p>
          </div>
        ) : null}
      </div>

      {/* 사진 그리드 */}
      {photos.length > 0 && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6, marginBottom:8 }}>
          {photos.map(p=>(
            <div key={p.id} style={{ position:'relative', aspectRatio:'1', borderRadius:8, overflow:'hidden', border:'1px solid #E8EBF0' }}>
              <img src={p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
              <button onClick={()=>deletePhoto(p.id)} style={{ position:'absolute', top:2, right:2, width:18, height:18, background:'rgba(0,0,0,0.5)', border:'none', borderRadius:'50%', color:White, cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {/* 메모/사진 추가 버튼 */}
      <div style={{ display:'flex', gap:6 }}>
        {!editingMemo && (
          <button onClick={()=>setEditingMemo(true)} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', background:'none', border:'1px solid #E8EBF0', borderRadius:6, color:'#6B7889', fontSize:11, cursor:'pointer' }}>
            ✏️ {memo ? '메모 수정' : '메모 추가'}
          </button>
        )}
        <input ref={fileInputRef} type="file" accept="image/*" onChange={e=>uploadPhoto(e.target.files?.[0])} style={{ display:'none' }}/>
        <button onClick={()=>fileInputRef.current?.click()} disabled={uploading} style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', background:'none', border:'1px solid #E8EBF0', borderRadius:6, color:'#6B7889', fontSize:11, cursor:'pointer' }}>
          📷 {uploading ? '업로드 중...' : '사진 추가'}
        </button>
      </div>
    </div>
  );
}

function CustomerDetail({ customer: c, onBack }) {
  return (
    <div>
      <button onClick={onBack} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'#6B7889', fontSize:13, fontWeight:600, marginBottom:16, padding:'6px 0' }}>
        ← 고객 목록으로
      </button>
      <div style={{ background:White, borderRadius:16, padding:20, marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:16 }}>
          <div style={{ width:56,height:56,borderRadius:'50%',background:c.isVip?'#7B6BC2':DarkNavy,display:'flex',alignItems:'center',justifyContent:'center',color:White,fontWeight:700,fontSize:22 }}>
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

      <div style={{ fontWeight:700, fontSize:14, color:'#1F2A3D', marginBottom:10 }}>통화 이력</div>
      <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
        {c.calls.map(call=>(
          <div key={call.id} style={{ background:White, borderRadius:14, boxShadow:'0 1px 4px rgba(0,0,0,0.06)', overflow:'hidden' }}>
            {/* 통화 요약 */}
            <Link href={`/calls/${call.id}`} style={{ display:'block', padding:'14px 16px', textDecoration:'none' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:12, fontWeight:600, padding:'2px 8px', borderRadius:4, background:'#E3EEFB', color:'#2563B5' }}>{call.category||'분류없음'}</span>
                <span style={{ fontSize:11, color:'#9AA5B5' }}>{formatDate(call.created_at)}</span>
              </div>
              {getSummary(call)&&<p style={{ margin:0, fontSize:12, color:'#6B7889', lineHeight:1.5 }}>{getSummary(call)}</p>}
            </Link>
            {/* 메모/사진 인라인 */}
            <CallNoteInline call={call} />
          </div>
        ))}
      </div>
    </div>
  );
}

function NoteModal({ callId, initialType, onClose }) {
  const [type, setType] = useState(initialType);
  const [memo, setMemo] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const API = process.env.NEXT_PUBLIC_API_BASE_URL;

  const getToken = () => localStorage.getItem('firebase_id_token');

  useEffect(() => { loadNote(); }, [callId]);

  const loadNote = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/calls/${callId}/note`, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
      });
      const data = await res.json();
      setMemo(data.memo || '');
      setPhotos(data.photos || []);
    } catch { setError('불러오지 못했습니다'); }
    finally { setLoading(false); }
  };

  const handleSaveMemo = async () => {
    setSaving(true); setError('');
    try {
      const res = await fetch(`${API}/calls/${callId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ memo }),
      });
      if (!res.ok) throw new Error();
      setMessage('💾 저장됐어요!');
      setTimeout(() => setMessage(''), 2000);
    } catch { setError('저장 실패'); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    setUploading(true); setError('');
    try {
      // 1. presigned URL 발급
      const urlRes = await fetch(`${API}/calls/${callId}/photos/upload-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ file_name: file.name }),
      });
      const { photo_id, upload_url, s3_key, upload_headers } = await urlRes.json();

      // 2. S3에 직접 업로드
      await fetch(upload_url, {
        method: 'PUT',
        headers: upload_headers,
        body: file,
      });

      // 3. DB에 저장
      const saveRes = await fetch(`${API}/calls/${callId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ photo_id, s3_key }),
      });
      const saved = await saveRes.json();
      setPhotos(prev => [...prev, saved.photo]);
      setMessage('📷 사진 저장됐어요!');
      setTimeout(() => setMessage(''), 2000);
    } catch (e) { setError('사진 업로드 실패: ' + e.message); }
    finally { setUploading(false); }
  };

  const handleDeletePhoto = async (photoId) => {
    if (!confirm('사진을 삭제할까요?')) return;
    try {
      await fetch(`${API}/calls/${callId}/photos/${photoId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` },
      });
      setPhotos(prev => prev.filter(p => p.id !== photoId));
      setMessage('🗑 삭제됐어요');
      setTimeout(() => setMessage(''), 2000);
    } catch { setError('삭제 실패'); }
  };

  return (
    // 오버레이
    <div onClick={onClose} style={{
      position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:1000,
      display:'flex', alignItems:'flex-end', justifyContent:'center',
    }}>
      <div onClick={e=>e.stopPropagation()} style={{
        width:'100%', maxWidth:600, background:White,
        borderRadius:'20px 20px 0 0', padding:24, maxHeight:'80vh', overflow:'auto',
      }}>
        {/* 핸들 */}
        <div style={{ width:40, height:4, background:'#E8EBF0', borderRadius:2, margin:'0 auto 16px' }}/>

        {/* 탭 */}
        <div style={{ display:'flex', gap:8, marginBottom:20 }}>
          {[['memo','✏️ 메모'],['photo','📷 사진']].map(([k,label])=>(
            <button key={k} onClick={()=>setType(k)} style={{
              flex:1, padding:'10px 0', borderRadius:10, border:'none', cursor:'pointer', fontSize:13, fontWeight:600,
              background:type===k?DarkNavy:('#F0F2F5'),
              color:type===k?White:'#6B7889',
            }}>{label}</button>
          ))}
        </div>

        {message && <div style={{ marginBottom:12, padding:'10px 14px', background:'#E3FBED', borderRadius:8, fontSize:13, color:'#1A7A3C' }}>{message}</div>}
        {error && <div style={{ marginBottom:12, padding:'10px 14px', background:'#FBE3E3', borderRadius:8, fontSize:13, color:'#C23B3B' }}>{error}</div>}

        {loading ? (
          <div style={{ textAlign:'center', padding:'40px 0', color:'#9AA5B5' }}>불러오는 중...</div>
        ) : type === 'memo' ? (
          <div>
            <textarea value={memo} onChange={e=>setMemo(e.target.value)}
              placeholder="통화 관련 메모를 입력하세요..."
              rows={6} style={{ width:'100%', padding:14, background:'#F8F9FA', borderRadius:12, border:'1px solid #E8EBF0', fontSize:14, resize:'none', outline:'none', boxSizing:'border-box', fontFamily:'inherit', lineHeight:1.6 }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
              <span style={{ fontSize:11, color:'#C8CDD5' }}>{memo.length}자</span>
              <button onClick={handleSaveMemo} disabled={saving} style={{ padding:'10px 24px', background:DarkNavy, border:'none', borderRadius:10, color:White, fontWeight:600, fontSize:13, cursor:'pointer' }}>
                {saving?'저장 중...':'저장하기'}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {photos.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                {photos.map(p=>(
                  <div key={p.id} style={{ position:'relative', aspectRatio:'1', borderRadius:10, overflow:'hidden', border:'1px solid #E8EBF0' }}>
                    <img src={p.photo_url||p.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    <button onClick={()=>setPhotos(prev=>prev.filter(x=>x.id!==p.id))} style={{ position:'absolute', top:4, right:4, width:22, height:22, background:'rgba(0,0,0,0.5)', border:'none', borderRadius:'50%', color:White, cursor:'pointer', fontSize:11 }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={e=>handlePhotoUpload(e.target.files?.[0])} style={{ display:'none' }}/>
            <input ref={cameraInputRef} type="file" accept="image/*" capture="camera" onChange={e=>handlePhotoUpload(e.target.files?.[0])} style={{ display:'none' }}/>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={()=>fileInputRef.current?.click()} style={{ padding:'14px', border:'2px dashed #E8EBF0', borderRadius:12, background:'transparent', color:'#6B7889', fontSize:13, fontWeight:600, cursor:'pointer' }}>🖼️ 갤러리</button>
              <button onClick={()=>cameraInputRef.current?.click()} style={{ padding:'14px', border:'2px dashed #E8EBF0', borderRadius:12, background:'transparent', color:'#6B7889', fontSize:13, fontWeight:600, cursor:'pointer' }}>📸 카메라</button>
            </div>
          </div>
        )}
        <button onClick={onClose} style={{ width:'100%', marginTop:16, padding:'12px', background:'#F0F2F5', border:'none', borderRadius:10, color:'#6B7889', fontWeight:600, fontSize:13, cursor:'pointer' }}>닫기</button>
      </div>
    </div>
  );
}
