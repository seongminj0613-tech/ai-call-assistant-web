'use client';
// /calls 는 /dashboard 로 리다이렉트
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CallsRedirect() {
  const router = useRouter();
  useEffect(() => { router.replace('/dashboard'); }, [router]);
  return null;
}
