'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { storeApi, callApi, calendarConnectApi } from '@/lib/api';
import AppLayout from '../components/AppLayout';

const DarkNavy = '#3D4D6B';
const AccentBlue = '#3B7DD8';
const White = '#FFFFFF';
const LightBg = '#F0F2F5';

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


function getSummary(call) {
  const s = call.summary;
  if (!s) return '';
  if (typeof s === 'string') return s;
  if (typeof s === 'object') {
    return s.label || s.code || JSON.stringify(s);
  }
  return String(s);
}

function getCatInfo(call) {
  let info = call.extracted_info;
  if (typeof info==='string'){try{info=JSON.parse(info);}catch{info=null;}}
  const code = info?.category_code || KO_MAP[call.category] || 'other';
  return CATEGORY_INFO[code] || CATEGORY_INFO.other;
}

function formatTime(s) {
  if (!s) return '';
  const d = new Date(s);
  return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

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
    return {phone,name:name||null,callCount:cs.length,lastCall:latest,summary:latest.summary};
  }).sort((a,b)=>b.callCount-a.callCount).slice(0,5);
}

const WEEKDAYS=['일','월','화','수','목','금','토'];

export default function DashboardPage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const now = new Date();
  const [calls, setCalls] = useState([]);
  const [stores, setStores] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  useEffect(()=>{
    const unsub=watchAuthState(async(user)=>{
      if(!user){setTimeout(()=>router.push('/login'),3000);return;}
      await loadData();
    });
    return()=>unsub();
  },[router]);

  const loadData=async()=>{
    setLoading(true);
    try{
      const [stRes,callRes]=await Promise.all([storeApi.list(),callApi.list({limit:200})]);
      setStores(stRes.data.stores||[]);
      setCalls(callRes.data.calls||[]);
      const from=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-01`;
      const last=new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
      const to=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${last}`;
      calendarConnectApi.getEvents(from,to).then(r=>setEvents(r.data?.events||[])).catch(()=>{});
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const handleFileSelect=async(e)=>{
    const file=e.target.files?.[0];
    if(!file){e.target.value='';return;}
    if(stores.length===0){
      e.target.value='';
      router.push('/stores/new');
      return;
    }
    const ext='.'+file.name.split('.').pop().toLowerCase();
    if(!['.mp3','.m4a','.wav','.ogg','.mp4'].includes(ext)){e.target.value='';return;}
    setUploading(true);setUploadProgress(0);
    try{
      const fmt=ext.replace('.','');
      const MIME={m4a:'audio/mp4',mp4:'audio/mp4',mp3:'audio/mpeg',wav:'audio/wav',ogg:'audio/ogg'};
      let mime=file.type||MIME[fmt]||'audio/mp4';
      if(['m4a','mp4'].includes(fmt))mime='audio/mp4';
      setUploadProgress(15);
      const{data:{call_id,upload_url}}=await callApi.requestUpload({storeId:stores[0].id,fileName:file.name,fileFormat:fmt,mimeType:mime});
      setUploadProgress(40);
      await fetch(upload_url,{method:'PUT',headers:{'Content-Type':mime},body:file});
      setUploadProgress(80);
      await callApi.startProcessing(call_id);
      setUploadProgress(100);
      await loadData();
    }catch(e){console.error(e);}
    finally{setUploading(false);setUploadProgress(0);e.target.value='';}
  };

  const pendingCount = useMemo(()=>calls.filter(c=>c.status==='uploaded').length,[calls]);
  const recentCalls  = useMemo(()=>calls.filter(c=>c.status==='summarized').slice(0,5),[calls]);
  const customers    = useMemo(()=>buildCustomers(calls),[calls]);

  const firstDay=new Date(calYear,calMonth,1).getDay();
  const lastDate=new Date(calYear,calMonth+1,0).getDate();
  const eventsByDay=useMemo(()=>{
    const m={};
    events.forEach(ev=>{const d=ev.day_of_month||(ev.start_datetime?new Date(ev.start_datetime).getDate():null);if(d){if(!m[d])m[d]=[];m[d].push(ev);}});
    return m;
  },[events]);
  const todayEvents=useMemo(()=>(eventsByDay[now.getDate()]||[]).slice(0,3),[eventsByDay]);

  const prevMonth=()=>{if(calMonth===0){setCalYear(y=>y-1);setCalMonth(11);}else setCalMonth(m=>m-1);};
  const nextMonth=()=>{if(calMonth===11){setCalYear(y=>y+1);setCalMonth(0);}else setCalMonth(m=>m+1);};

  const todayStr=`${now.getFullYear()}년 ${now.getMonth()+1}월 ${now.getDate()}일 ${WEEKDAYS[now.getDay()]}요일`;

  const cardStyle={background:White,borderRadius:16,padding:16,boxShadow:'0 1px 4px rgba(0,0,0,0.06)'};
  const sectionHeaderStyle={display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12};
  const sectionTitleStyle={fontWeight:700,fontSize:14,color:'#1F2A3D'};
  const linkStyle={fontSize:12,color:AccentBlue,textDecoration:'none'};

  // 업로드 버튼 (헤더 우측) — label 방식으로 맥 Safari 호환
  const handleUploadEntryClick=(e)=>{
    if(stores.length===0){
      e.preventDefault();
      router.push('/stores/new');
    }
  };

  const uploadAction = (
    <>
      <input
        ref={fileInputRef}
        id="dashboard-file-upload"
        type="file"
        accept="audio/*,.m4a,.mp3,.wav"
        onChange={handleFileSelect}
        disabled={uploading}
        style={{ position:'absolute', width:1, height:1, opacity:0, overflow:'hidden', clip:'rect(0,0,0,0)', whiteSpace:'nowrap' }}
      />
      <label htmlFor="dashboard-file-upload" onClick={handleUploadEntryClick} style={{
        display:'flex', alignItems:'center', gap:6,
        background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'6px 12px',
        color:'white', cursor: uploading ? 'not-allowed' : 'pointer',
        fontSize:12, fontWeight:600, opacity: uploading ? 0.6 : 1,
      }}>
        {uploading ? `⏳ ${uploadProgress}%` : stores.length===0 ? `🏪 가게 등록` : `📤 업로드`}
      </label>
    </>
  );

  return (
    <AppLayout title="AI 통화비서" rightAction={uploadAction}>
      {/* 날짜 + 대기 배너 */}
      <div style={{ background:DarkNavy, borderRadius:16, padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div>
          <p style={{ color:'rgba(255,255,255,0.6)', fontSize:12, margin:'0 0 4px' }}>{todayStr}</p>
          <p style={{ color:White, fontWeight:700, fontSize:15, margin:0 }}>
            통화 분석 대기 <span style={{ color:'#6FA8F0' }}>{pendingCount}건</span>
          </p>
        </div>
        <label htmlFor="dashboard-file-upload" onClick={handleUploadEntryClick} style={{
          background:'rgba(255,255,255,0.15)', borderRadius:10, padding:'10px 14px',
          color:White, cursor: uploading ? 'not-allowed' : 'pointer',
          fontSize:20, opacity: uploading ? 0.6 : 1,
        }}>
          🔄
        </label>
      </div>

      {/* 상단 2단 그리드 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:14 }}>

        {/* 최근 분석 통화 */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionTitleStyle}>최근 분석 통화</span>
            <Link href="/calls" style={linkStyle}>전체보기 →</Link>
          </div>
          {loading ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:12 }}>불러오는 중...</div>
          ) : recentCalls.length===0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:12 }}>통화가 없어요</div>
          ) : recentCalls.map(call=>{
            const cat=getCatInfo(call);
            let info=call.extracted_info;
            if(typeof info==='string'){try{info=JSON.parse(info);}catch{info=null;}}
            const name=info?.customer_name;
            const phone=call.caller_number||'발신번호 없음';
            return (
              <Link key={call.id} href={`/calls/${call.id}`} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', borderBottom:'1px solid #F0F2F5', textDecoration:'none' }}>
                <div style={{ width:34,height:34,borderRadius:'50%',background:DarkNavy,display:'flex',alignItems:'center',justifyContent:'center',color:White,fontWeight:700,fontSize:13,flexShrink:0 }}>
                  {(name||phone).slice(0,1).toUpperCase()}
                </div>
                <div style={{ flex:1,minWidth:0 }}>
                  <div style={{ display:'flex',alignItems:'center',gap:5,marginBottom:2 }}>
                    <span style={{ fontWeight:600,fontSize:12,color:'#1F2A3D',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{name||phone}</span>
                    <span style={{ fontSize:9,fontWeight:600,padding:'1px 5px',borderRadius:3,background:cat.bg,color:cat.fg,flexShrink:0 }}>{cat.label}</span>
                  </div>
                  {getSummary(call)&&<p style={{ margin:0,fontSize:10,color:'#6B7889',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{getSummary(call)}</p>}
                </div>
                <span style={{ fontSize:10,color:'#9AA5B5',flexShrink:0 }}>{formatTime(call.created_at)}</span>
              </Link>
            );
          })}
        </div>

        {/* 최근 관리 고객 */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionTitleStyle}>최근 관리 고객</span>
            <Link href="/customers" style={linkStyle}>전체보기 →</Link>
          </div>
          {loading ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:12 }}>불러오는 중...</div>
          ) : customers.length===0 ? (
            <div style={{ textAlign:'center', padding:'20px 0', color:'#9AA5B5', fontSize:12 }}>고객이 없어요</div>
          ) : customers.map(c=>(
            <Link key={c.phone} href="/customers" style={{ display:'flex',alignItems:'center',gap:10,padding:'8px 0',borderBottom:'1px solid #F0F2F5',textDecoration:'none' }}>
              <div style={{ width:34,height:34,borderRadius:'50%',background:AccentBlue,display:'flex',alignItems:'center',justifyContent:'center',color:White,fontWeight:700,fontSize:13,flexShrink:0 }}>
                {(c.name||c.phone).slice(0,1).toUpperCase()}
              </div>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:600,fontSize:12,color:'#1F2A3D',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{c.name||c.phone}</div>
                {getSummary({summary:c.summary})&&<p style={{ margin:0,fontSize:10,color:'#6B7889',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{getSummary({summary:c.summary})}</p>}
              </div>
              <span style={{ fontSize:11,fontWeight:700,color:'#1F2A3D',flexShrink:0 }}>{c.callCount}회</span>
            </Link>
          ))}
        </div>
      </div>

      {/* 하단 2단 그리드 */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

        {/* 캘린더 */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionTitleStyle}>캘린더</span>
            <Link href="/calendar" style={linkStyle}>전체보기 →</Link>
          </div>
          <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8 }}>
            <button onClick={prevMonth} style={{ background:'none',border:'none',cursor:'pointer',color:'#6B7889',fontSize:16,padding:'0 4px' }}>‹</button>
            <span style={{ fontWeight:600,fontSize:13,color:'#1F2A3D' }}>{calYear}년 {calMonth+1}월</span>
            <button onClick={nextMonth} style={{ background:'none',border:'none',cursor:'pointer',color:'#6B7889',fontSize:16,padding:'0 4px' }}>›</button>
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',textAlign:'center',marginBottom:4 }}>
            {WEEKDAYS.map((d,i)=><div key={d} style={{ fontSize:10,fontWeight:600,color:i===0?'#E53E3E':i===6?AccentBlue:'#9AA5B5',padding:'2px 0' }}>{d}</div>)}
          </div>
          <div style={{ display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2 }}>
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:lastDate}).map((_,i)=>{
              const day=i+1;
              const isToday=calYear===now.getFullYear()&&calMonth===now.getMonth()&&day===now.getDate();
              const isSel=day===selectedDay;
              const hasEv=eventsByDay[day]?.length>0;
              const col=(firstDay+i)%7;
              return (
                <button key={day} onClick={()=>setSelectedDay(day)} style={{
                  aspectRatio:'1',border:'none',cursor:'pointer',borderRadius:'50%',
                  background:isToday?DarkNavy:isSel?'#EFF6FF':'transparent',
                  color:isToday?White:col===0?'#E53E3E':col===6?AccentBlue:'#1F2A3D',
                  fontWeight:isToday||isSel?700:400,fontSize:11,
                  display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:1,
                }}>
                  {day}
                  {hasEv&&<div style={{ width:3,height:3,borderRadius:'50%',background:isToday?'rgba(255,255,255,0.8)':AccentBlue }}/>}
                </button>
              );
            })}
          </div>
          <div style={{ display:'flex',gap:10,marginTop:8,paddingTop:8,borderTop:'1px solid #F0F2F5' }}>
            <div style={{ display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#6B7889' }}>
              <div style={{ width:5,height:5,borderRadius:'50%',background:AccentBlue }}/> 통화 자동등록
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:4,fontSize:10,color:'#6B7889' }}>
              <div style={{ width:5,height:5,borderRadius:'50%',background:'#3BA876' }}/> 수동 등록
            </div>
          </div>
        </div>

        {/* 다가오는 일정 */}
        <div style={cardStyle}>
          <div style={sectionHeaderStyle}>
            <span style={sectionTitleStyle}>다가오는 일정</span>
            <Link href="/calendar" style={linkStyle}>전체보기 →</Link>
          </div>
          {todayEvents.length===0 ? (
            <div style={{ textAlign:'center',padding:'20px 0',color:'#9AA5B5',fontSize:12 }}>
              오늘 등록된 일정이 없어요
            </div>
          ) : todayEvents.map((ev,i)=>{
            const colors=['#3B7DD8','#3BA876','#B56B8A'];
            const color=colors[i%colors.length];
            const time=ev.time||(ev.start_datetime?new Date(ev.start_datetime).toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'}):'');
            return (
              <div key={ev.id||i} style={{ display:'flex',gap:10,padding:'8px 0',borderBottom:'1px solid #F0F2F5' }}>
                <span style={{ fontSize:12,fontWeight:700,color,flexShrink:0,minWidth:42 }}>{time}</span>
                <div style={{ flex:1,borderLeft:`2px solid ${color}`,paddingLeft:8 }}>
                  <div style={{ fontWeight:600,fontSize:12,color:'#1F2A3D' }}>{ev.title}</div>
                  {ev.description&&<div style={{ fontSize:10,color:'#6B7889',marginTop:1 }}>{ev.description}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
