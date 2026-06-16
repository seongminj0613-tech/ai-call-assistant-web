'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { calendarConnectApi } from '@/lib/api';
import AppLayout from '../components/AppLayout';

const DarkNavy='#3D4D6B', AccentBlue='#3B7DD8', White='#FFFFFF';
const WEEKDAYS=['일','월','화','수','목','금','토'];

function parseEventDate(value) {
  if (!value) return null;
  const d = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(d.getTime()) ? null : d;
}

function getEventStartDate(ev) {
  return parseEventDate(ev?.start_at || ev?.start_datetime || ev?.start);
}


export default function CalendarPage() {
  const router = useRouter();
  const now = new Date();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  useEffect(()=>{
    const unsub=watchAuthState(async(user)=>{
      if(!user){setTimeout(()=>router.push('/login'),5000);return;}
      await loadEvents(year,month);
    });
    return()=>unsub();
  },[router]);

  useEffect(()=>{ loadEvents(year,month); },[year,month]);

  const loadEvents = async(y,m)=>{
    setLoading(true);
    try{
      const from=`${y}-${String(m+1).padStart(2,'0')}-01`;
      const last=new Date(y,m+1,0).getDate();
      const to=`${y}-${String(m+1).padStart(2,'0')}-${last}`;
      const res=await calendarConnectApi.getEvents(from,to).catch(()=>({data:{events:[]}}));
      setEvents(res.data?.events||[]);
    }catch(e){console.error(e);}
    finally{setLoading(false);}
  };

  const firstDay=new Date(year,month,1).getDay();
  const lastDate=new Date(year,month+1,0).getDate();

  const eventsByDay=useMemo(()=>{
    const m={};
    events.forEach(ev=>{
      const start=getEventStartDate(ev);
      const d=ev.day_of_month||(start?start.getDate():null);
      if(d){if(!m[d])m[d]=[];m[d].push(ev);}
    });
    return m;
  },[events]);

  const selectedEvents = eventsByDay[selectedDay]||[];

  const prevMonth=()=>{if(month===0){setYear(y=>y-1);setMonth(11);}else setMonth(m=>m-1);};
  const nextMonth=()=>{if(month===11){setYear(y=>y+1);setMonth(0);}else setMonth(m=>m+1);};

  const formatTime=(ev)=>{
    if(ev.time) return ev.time;
    const start=getEventStartDate(ev);
    if(start) return start.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'});
    return '';
  };

  return (
    <AppLayout title="일정 관리" rightAction={
      <Link href="/calendar/connect" style={{ background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'6px 10px', color:'white', fontSize:12, textDecoration:'none', fontWeight:600 }}>
        캘린더 연동
      </Link>
    }>
      {/* 캘린더 카드 */}
      <div style={{ background:White, borderRadius:16, overflow:'hidden', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
        {/* 월 네비 */}
        <div style={{ background:DarkNavy, padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={prevMonth} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:20 }}>‹</button>
          <span style={{ color:White, fontWeight:700, fontSize:16 }}>{year}년 {month+1}월</span>
          <button onClick={nextMonth} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.7)', cursor:'pointer', fontSize:20 }}>›</button>
        </div>

        <div style={{ padding:'14px 16px' }}>
          {/* 요일 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', textAlign:'center', marginBottom:6 }}>
            {WEEKDAYS.map((d,i)=>(
              <div key={d} style={{ fontSize:11, fontWeight:600, color:i===0?'#E53E3E':i===6?AccentBlue:'#9AA5B5', padding:'4px 0' }}>{d}</div>
            ))}
          </div>
          {/* 날짜 */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:3 }}>
            {Array.from({length:firstDay}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:lastDate}).map((_,i)=>{
              const day=i+1;
              const isToday=year===now.getFullYear()&&month===now.getMonth()&&day===now.getDate();
              const isSel=day===selectedDay;
              const hasEv=eventsByDay[day]?.length>0;
              const col=(firstDay+i)%7;
              return (
                <button key={day} onClick={()=>setSelectedDay(day)} style={{
                  aspectRatio:'1', border:'none', cursor:'pointer', borderRadius:'50%',
                  background:isToday?DarkNavy:isSel?'#EFF6FF':'transparent',
                  color:isToday?White:col===0?'#E53E3E':col===6?AccentBlue:'#1F2A3D',
                  fontWeight:isToday||isSel?700:400, fontSize:12,
                  display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:1,
                }}>
                  {day}
                  {hasEv&&<div style={{ width:4, height:4, borderRadius:'50%', background:isToday?'rgba(255,255,255,0.8)':AccentBlue }}/>}
                </button>
              );
            })}
          </div>
          {/* 범례 */}
          <div style={{ display:'flex', gap:14, marginTop:12, paddingTop:10, borderTop:'1px solid #F0F2F5' }}>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#6B7889' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:AccentBlue }}/> 통화 자동등록
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#6B7889' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#3BA876' }}/> 수동 등록
            </div>
          </div>
        </div>
      </div>

      {/* 선택한 날 일정 */}
      <div style={{ fontWeight:700, fontSize:14, color:'#1F2A3D', marginBottom:10 }}>
        {month+1}월 {selectedDay}일 ({WEEKDAYS[(firstDay+selectedDay-1)%7]}) 일정
      </div>
      {loading ? (
        <div style={{ textAlign:'center', padding:'40px 0', color:'#9AA5B5', fontSize:14 }}>불러오는 중...</div>
      ) : selectedEvents.length===0 ? (
        <div style={{ textAlign:'center', padding:'40px 0', background:White, borderRadius:14, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
          <div style={{ fontSize:32, marginBottom:8 }}>📅</div>
          <p style={{ margin:0, fontSize:13, color:'#9AA5B5' }}>이날 등록된 일정이 없어요</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
          {selectedEvents.map((ev,i)=>{
            const colors=['#3B7DD8','#3BA876','#B56B8A'];
            const color=colors[i%colors.length];
            return (
              <div key={ev.id||i} style={{ background:White, borderRadius:14, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', display:'flex', gap:12 }}>
                <div style={{ width:3, background:color, borderRadius:2, flexShrink:0 }}/>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:4 }}>
                    <span style={{ fontWeight:700, fontSize:14, color:'#1F2A3D' }}>{ev.title}</span>
                    <span style={{ fontSize:13, fontWeight:600, color }}>{formatTime(ev)}</span>
                  </div>
                  {ev.description&&<p style={{ margin:0, fontSize:12, color:'#6B7889' }}>{ev.description}</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
