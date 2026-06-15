'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { logout, watchAuthState } from '@/lib/firebase';

const DarkNavy = '#3D4D6B';
const AccentBlue = '#3B7DD8';
const White = '#FFFFFF';
const LightBg = '#F0F2F5';

const NAV = [
  { href:'/dashboard', label:'홈',   icon:(
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  )},
  { href:'/calls',     label:'통화',  icon:(
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.53 2 2 0 0 1 3.6 1.37h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.1a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  )},
  { href:'/customers', label:'고객',  icon:(
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  )},
  { href:'/calendar',  label:'일정',  icon:(
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  )},
  { href:'/settings',  label:'설정',  icon:(
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )},
];

export default function AppLayout({ children, title = 'AI 통화비서', rightAction }) {
  const pathname = usePathname();
  const router = useRouter();
  const [nickname, setNickname] = useState('');

  useEffect(() => {
    setNickname(localStorage.getItem('user_nickname') || '사용자');
    const unsub = watchAuthState((user) => {
      if (!user) router.push('/login');
    });
    return () => unsub();
  }, [router]);

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  const isActive = (href) => {
    if (href === '/dashboard') return pathname === '/dashboard';
    return pathname.startsWith(href);
  };

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:LightBg, fontFamily:"'Pretendard Variable',Pretendard,sans-serif" }}>

      {/* ── 사이드바 ── */}
      <aside style={{
        width:72, background:DarkNavy, display:'flex', flexDirection:'column',
        alignItems:'center', paddingTop:16, paddingBottom:20, flexShrink:0,
        position:'sticky', top:0, height:'100vh', zIndex:30,
      }}>
        <Link href="/dashboard" style={{ textDecoration:'none', marginBottom:24 }}>
          <div style={{ width:42, height:42, background:'rgba(255,255,255,0.15)', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', color:White, fontSize:20 }}>
            📞
          </div>
        </Link>
        {NAV.map(item => {
          const active = isActive(item.href);
          return (
            <Link key={item.href} href={item.href} style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:4,
              padding:'10px 0', width:'100%', textDecoration:'none',
              color: active ? White : 'rgba(255,255,255,0.5)',
              background: active ? 'rgba(255,255,255,0.12)' : 'transparent',
              marginBottom:2, transition:'all 0.15s',
              borderLeft: active ? `3px solid ${AccentBlue}` : '3px solid transparent',
            }}>
              {item.icon}
              <span style={{ fontSize:10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
            </Link>
          );
        })}
        {/* 로그아웃 */}
        <div style={{ flex:1 }} />
        <button onClick={handleLogout} style={{
          background:'none', border:'none', color:'rgba(255,255,255,0.4)',
          cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, padding:'8px 0', width:'100%',
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          <span style={{ fontSize:9 }}>로그아웃</span>
        </button>
      </aside>

      {/* ── 메인 ── */}
      <div style={{ flex:1, display:'flex', flexDirection:'column', overflow:'hidden' }}>
        {/* 헤더 */}
        <header style={{ background:DarkNavy, padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <button onClick={()=>router.back()} style={{ background:'none', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:18, lineHeight:1, padding:'2px 4px' }}>←</button>
            <span style={{ color:White, fontWeight:700, fontSize:16 }}>{title}</span>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {rightAction}
            <span style={{ color:'rgba(255,255,255,0.7)', fontSize:12 }}>{nickname}님</span>
            <button style={{ background:'none', border:'none', color:'rgba(255,255,255,0.6)', cursor:'pointer', fontSize:18 }}>🔔</button>
          </div>
        </header>

        {/* 콘텐츠 */}
        <div style={{ flex:1, overflow:'auto', padding:20 }}>
          {children}
        </div>

        {/* 모바일 하단 탭 */}
        <nav style={{ display:'none' }} className="mobile-nav">
          {NAV.map(item => {
            const active = isActive(item.href);
            return (
              <Link key={item.href} href={item.href} style={{
                flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                padding:'8px 0', textDecoration:'none',
                color: active ? AccentBlue : '#9AA5B5', fontSize:10, fontWeight: active ? 600 : 400,
              }}>
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <style>{`
        @media (max-width: 768px) {
          aside { display: none !important; }
          .mobile-nav { display: flex !important; background: #fff; border-top: 1px solid #E8EBF0; }
        }
      `}</style>
    </div>
  );
}
