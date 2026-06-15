'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { calendarConnectApi } from '@/lib/api';
import NavLayout from '../components/NavLayout';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

function getDaysInMonth(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  return { firstDay, lastDate };
}

export default function CalendarPage() {
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDay, setSelectedDay] = useState(now.getDate());

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) { router.push('/login'); return; }
      await loadData(year, month);
    });
    return () => unsub();
  }, [router]);

  useEffect(() => { loadData(year, month); }, [year, month]);

  const loadData = async (y, m) => {
    setLoading(true);
    try {
      const from = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const to = `${y}-${String(m + 1).padStart(2, '0')}-${lastDay}`;
      const [evRes, connRes] = await Promise.all([
        calendarConnectApi.getEvents(from, to).catch(() => ({ data: { events: [] } })),
        calendarConnectApi.getConnections().catch(() => ({ data: { connections: [] } })),
      ]);
      setEvents(evRes.data?.events || []);
      setConnections(connRes.data?.connections || []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const { firstDay, lastDate } = useMemo(() => getDaysInMonth(year, month), [year, month]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach(ev => {
      const d = ev.day_of_month || (ev.start_datetime ? new Date(ev.start_datetime).getDate() : null);
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(ev);
      }
    });
    return map;
  }, [events]);

  const selectedEvents = eventsByDay[selectedDay] || [];

  const prevMonth = () => { if (month === 0) { setYear(y => y - 1); setMonth(11); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setYear(y => y + 1); setMonth(0); } else setMonth(m => m + 1); };

  const formatTime = (ev) => {
    if (ev.time) return ev.time;
    if (ev.start_datetime) return new Date(ev.start_datetime).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
    return '';
  };

  return (
    <NavLayout>
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <h1 className="text-[22px] font-bold text-ink-primary tracking-tight mb-0.5">일정 관리</h1>
          <p className="text-[12px] text-ink-secondary">통화에서 추출된 예약 일정을 확인해요</p>
        </div>
        <Link href="/calendar/connect"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-brand-blue bg-brand-blue-light px-3 py-2 rounded-[10px] hover:bg-blue-100 transition-all">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          캘린더 연동
          {connections.length > 0 && (
            <span className="bg-brand-blue text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">{connections.length}</span>
          )}
        </Link>
      </div>

      {/* 캘린더 */}
      <div className="bg-white border border-line rounded-[16px] overflow-hidden mb-4 animate-fade-up anim-delay-100">
        {/* 월 네비 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line">
          <button onClick={prevMonth} className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-surface-muted transition-all text-ink-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <h2 className="text-[16px] font-bold text-ink-primary">
            {year}년 {month + 1}월
          </h2>
          <button onClick={nextMonth} className="w-8 h-8 flex items-center justify-center rounded-[8px] hover:bg-surface-muted transition-all text-ink-secondary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>

        {/* 요일 헤더 */}
        <div className="grid grid-cols-7 border-b border-line">
          {WEEKDAYS.map((d, i) => (
            <div key={d} className={`py-2 text-center text-[11px] font-semibold ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-ink-tertiary'}`}>{d}</div>
          ))}
        </div>

        {/* 날짜 그리드 */}
        <div className="grid grid-cols-7">
          {Array.from({ length: firstDay }).map((_, i) => (
            <div key={`empty-${i}`} className="h-14 border-b border-r border-line/50 last:border-r-0" />
          ))}
          {Array.from({ length: lastDate }).map((_, i) => {
            const day = i + 1;
            const isToday = year === now.getFullYear() && month === now.getMonth() && day === now.getDate();
            const isSelected = day === selectedDay;
            const hasEvents = eventsByDay[day]?.length > 0;
            const col = (firstDay + i) % 7;
            return (
              <button key={day} onClick={() => setSelectedDay(day)}
                className={`h-14 flex flex-col items-center justify-start pt-1.5 border-b border-r border-line/50 transition-all ${
                  isSelected ? 'bg-brand-blue-light' : 'hover:bg-surface-muted'
                } ${(firstDay + i) % 7 === 6 ? 'border-r-0' : ''}`}>
                <span className={`w-7 h-7 flex items-center justify-center rounded-full text-[13px] font-semibold ${
                  isToday ? 'bg-brand-blue text-white' : isSelected ? 'text-brand-blue' : col === 0 ? 'text-red-500' : col === 6 ? 'text-blue-500' : 'text-ink-primary'
                }`}>{day}</span>
                {hasEvents && (
                  <div className="flex gap-0.5 mt-0.5">
                    {(eventsByDay[day] || []).slice(0, 3).map((_, j) => (
                      <div key={j} className="w-1 h-1 rounded-full bg-brand-blue" />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 선택된 날 일정 */}
      <div className="animate-fade-up anim-delay-200">
        <h3 className="text-[14px] font-bold text-ink-primary mb-3">
          {month + 1}월 {selectedDay}일 ({WEEKDAYS[(firstDay + selectedDay - 1) % 7]}) 일정
        </h3>
        {loading ? (
          <div className="text-center py-8 text-[13px] text-ink-tertiary">불러오는 중...</div>
        ) : selectedEvents.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-[14px] border border-dashed border-line">
            <div className="text-2xl mb-2">📅</div>
            <p className="text-[13px] text-ink-secondary">이날 등록된 일정이 없어요</p>
            <p className="text-[11px] text-ink-tertiary mt-1">통화에서 예약 일정이 추출되면 자동으로 추가돼요</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {selectedEvents.map((ev, i) => (
              <div key={ev.id || i} className="bg-white border border-line rounded-[14px] p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-none w-1 h-full min-h-[40px] bg-brand-blue rounded-full self-stretch" />
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[14px] font-bold text-ink-primary">{ev.title}</span>
                      <span className="text-[12px] font-semibold text-brand-blue tabular-nums">{formatTime(ev)}</span>
                    </div>
                    {ev.description && <p className="text-[12px] text-ink-secondary leading-relaxed">{ev.description}</p>}
                    {ev.source === 'call' && ev.call_id && (
                      <a href={`/calls/${ev.call_id}`}
                        className="inline-flex items-center gap-1 text-[11px] text-brand-blue mt-2 hover:underline">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12"/>
                        </svg>
                        통화 상세 보기
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </NavLayout>
  );
}
