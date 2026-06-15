'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { watchAuthState } from '@/lib/firebase';

export default function AuthGuard({ children, onUser }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = watchAuthState((user) => {
      if (user) {
        if (onUser) onUser(user);
        setReady(true);
      } else {
        setTimeout(() => {
          setReady(false);
          router.push('/login');
        }, 3000);
      }
    });
    return () => unsub();
  }, [router, onUser]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
          <p className="text-[13px] text-ink-tertiary">로딩 중...</p>
        </div>
      </div>
    );
  }

  return children;
}
