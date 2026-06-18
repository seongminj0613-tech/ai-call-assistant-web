'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { watchAuthState } from '@/lib/firebase';
import SideNav from '@/app/components/SideNav';

export default function PageShell({ title, active, top = null, children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const unsub = watchAuthState((u) => {
      if (!u) { setLoading(false); router.replace('/login'); return; }
      setLoading(false); setAuthed(true);
    });
    return () => unsub();
  }, [router]);

  if (loading) return <main className="min-h-screen flex items-center justify-center bg-[#5f6071] text-sm text-white/70">로딩 중...</main>;
  if (!authed) return null;

  return (
    <main className="min-h-screen bg-[#5f6071] flex flex-col items-center px-6 pt-12">
      <div className="relative translate-x-[44px] w-[640px] flex flex-col flex-1">
        <header className="h-[56px] w-full flex items-center justify-between relative">
          <button onClick={() => router.push('/dashboard')} className="px-[16px] flex items-center" title="뒤로">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
          </button>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-[18px] font-medium text-white whitespace-nowrap">{title}</div>
          <button className="px-[16px] flex items-center" title="알림">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
          </button>
        </header>

        {top}

        <section className="relative bg-white w-full rounded-t-[24px] flex-1 text-[#343659] flex flex-col">
          <SideNav active={active} />
          {children}
        </section>
      </div>
    </main>
  );
}