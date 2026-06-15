'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { initKakao, loginWithKakao } from '@/lib/kakao';
import { authApi } from '@/lib/api';
import { loginWithFirebaseCustomToken } from '@/lib/firebase';
import Logo from '../components/Logo';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(null); // 'kakao' | 'google' | 'naver' | null
  const [error, setError] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => { initKakao(); }, 500);
    return () => clearTimeout(timer);
  }, []);

  const handleKakaoLogin = () => {
    setError(''); setLoading('kakao');
    try { loginWithKakao(); }
    catch (err) { setError(err.message || '카카오 로그인을 시작할 수 없습니다.'); setLoading(null); }
  };

  const handleGoogleLogin = () => {
    setError(''); setLoading('google');
    // Google OAuth — 리다이렉트 방식
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) { setError('구글 로그인이 설정되지 않았습니다'); setLoading(null); return; }
    const redirectUri = `${window.location.origin}/oauth/google`;
    const scope = 'openid email profile';
    const state = Math.random().toString(36).slice(2);
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scope)}&state=${state}`;
    window.location.href = url;
  };

  const handleNaverLogin = () => {
    setError(''); setLoading('naver');
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    if (!clientId) { setError('네이버 로그인이 설정되지 않았습니다'); setLoading(null); return; }
    const redirectUri = `${window.location.origin}/oauth/naver`;
    const state = Math.random().toString(36).slice(2);
    const url = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    window.location.href = url;
  };

  return (
    <main className="min-h-screen bg-surface-page flex flex-col px-5 pt-5 pb-8 lg:flex-row lg:items-center lg:justify-center lg:gap-16 lg:px-16">
      {/* 뒤로가기 */}
      <div className="mb-8 lg:hidden">
        <Link href="/" className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink-primary px-3 py-2 rounded-[10px] hover:bg-white transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          홈으로
        </Link>
      </div>

      {/* 로그인 카드 */}
      <div className="w-full max-w-[380px] mx-auto lg:mx-0 animate-fade-up">
        <div className="bg-white border border-line rounded-[24px] px-7 py-9 shadow-card">
          {/* 로고 */}
          <div className="flex flex-col items-center mb-7">
            <div className="w-20 h-20 bg-surface-page border border-line rounded-[22px] flex items-center justify-center mb-4">
              <Logo size={48} />
            </div>
            <h1 className="text-[20px] font-bold text-ink-primary tracking-tight mb-1.5">로그인하고 시작하기</h1>
            <p className="text-[13px] text-ink-secondary text-center leading-relaxed">
              소셜 계정으로 1초만에 시작하세요.<br />번거로운 가입 절차가 없어요.
            </p>
          </div>

          {/* 에러 */}
          {error && (
            <div className="mb-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">{error}</div>
          )}

          {/* 소셜 로그인 버튼들 */}
          <div className="flex flex-col gap-2.5">
            {/* 카카오 */}
            <button onClick={handleKakaoLogin} disabled={!!loading}
              className="w-full py-3.5 px-5 rounded-[14px] font-semibold text-[14px] inline-flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed hover:opacity-90 hover:-translate-y-[1px] hover:shadow-[0_4px_12px_rgba(254,229,0,0.35)]"
              style={{ background: '#FEE500', color: 'rgba(0,0,0,0.85)' }}>
              {loading === 'kakao' ? (
                <><span className="w-5 h-5 border-2 border-black/25 border-t-black/70 rounded-full animate-spin inline-block" />로그인 중...</>
              ) : (
                <><svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.8 5.1 4.5 6.5l-1 3.7c-.1.4.3.7.6.5l4.4-2.9c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.9C22 6.5 17.5 3 12 3z"/></svg>카카오로 시작하기</>
              )}
            </button>

            {/* 구분선 */}
            <div className="flex items-center gap-3 my-1">
              <div className="flex-1 h-px bg-line" />
              <span className="text-[11px] text-ink-tertiary font-medium">또는</span>
              <div className="flex-1 h-px bg-line" />
            </div>

            {/* 구글 */}
            <button onClick={handleGoogleLogin} disabled={!!loading}
              className="w-full py-3.5 px-5 rounded-[14px] font-semibold text-[14px] inline-flex items-center justify-center gap-2.5 bg-white border border-line text-ink-primary transition-all disabled:opacity-60 hover:-translate-y-[1px] hover:shadow-card hover:border-line-strong">
              {loading === 'google' ? (
                <><span className="w-5 h-5 border-2 border-ink-tertiary/30 border-t-ink-secondary rounded-full animate-spin inline-block" />연결 중...</>
              ) : (
                <><svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>구글로 시작하기</>
              )}
            </button>

            {/* 네이버 */}
            <button onClick={handleNaverLogin} disabled={!!loading}
              className="w-full py-3.5 px-5 rounded-[14px] font-semibold text-[14px] inline-flex items-center justify-center gap-2.5 transition-all disabled:opacity-60 hover:-translate-y-[1px] hover:opacity-90"
              style={{ background: '#03C75A', color: '#fff' }}>
              {loading === 'naver' ? (
                <><span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin inline-block" />연결 중...</>
              ) : (
                <><span className="text-[16px] font-black leading-none">N</span>네이버로 시작하기</>
              )}
            </button>
          </div>

          <p className="mt-5 text-center text-[11px] text-ink-tertiary leading-[1.6]">
            로그인 시 <a href="#" className="text-ink-secondary underline">이용약관</a> 및{' '}
            <a href="#" className="text-ink-secondary underline">개인정보 처리방침</a>에 동의하는 것으로 간주됩니다.
          </p>
        </div>
      </div>

      {/* 데스크탑 우측: 앱 안내 */}
      <aside className="hidden lg:flex flex-col max-w-[420px] pt-2 pl-4 animate-fade-in anim-delay-300">
        <div className="mb-5">
          <span className="inline-block text-[11px] font-semibold text-brand-blue bg-brand-blue-light px-2.5 py-1 rounded-full mb-3 tracking-wide">
            📱 안드로이드 앱 권한 안내
          </span>
          <h2 className="text-[22px] font-bold text-ink-primary tracking-tight mb-2">이런 권한들을 사용해요</h2>
          <p className="text-[13px] text-ink-secondary leading-[1.6]">
            모바일 앱 설치 시 다음 권한이 필요합니다.<br />업무에 꼭 필요한 권한만 요청드려요.
          </p>
        </div>
        <div className="flex flex-col gap-3 mb-5">
          {[
            { title: '통화 녹음 파일 접근', desc: '삼성 통화 녹음 앱이 자동 저장한 음성 파일을 AI가 분석합니다.' },
            { title: '연락처 읽기', desc: '저장된 연락처와 비교해 업무/개인 통화를 자동으로 분류합니다.' },
            { title: '알림 전송', desc: '중요한 통화를 분석하면 알림으로 알려드립니다.' },
          ].map(p => (
            <div key={p.title} className="bg-white border border-line rounded-[14px] px-4 py-3.5 flex gap-3 hover:border-brand-blue/30 transition-all">
              <div className="flex-none w-9 h-9 rounded-[10px] bg-brand-blue-light text-brand-blue flex items-center justify-center text-[16px]">✓</div>
              <div>
                <div className="text-[13px] font-semibold text-ink-primary mb-0.5">{p.title}</div>
                <div className="text-[12px] text-ink-secondary leading-[1.5]">{p.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <a href="https://drive.google.com/file/d/1jJNRF2CCVcCKSpdIPUODjWL6F5exxJ-T/view" target="_blank" rel="noopener noreferrer"
          className="flex items-center gap-3.5 px-4 py-3.5 rounded-[14px] text-white transition-all hover:-translate-y-[1px] hover:shadow-[0_8px_20px_rgba(17,24,39,0.2)] group"
          style={{ background: '#111827' }}>
          <div className="w-10 h-10 rounded-[10px] bg-white/10 flex items-center justify-center text-xl">📱</div>
          <div className="flex-1">
            <div className="text-[13px] font-semibold mb-0.5 flex items-center gap-2">
              안드로이드 앱 다운로드
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'rgba(34,197,94,0.2)', color: '#22C55E' }}>시연 가능</span>
            </div>
            <div className="text-[11px] opacity-60">APK 직접 다운로드 (22MB)</div>
          </div>
          <svg className="text-white/60 group-hover:text-white group-hover:translate-x-0.5 transition-all" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </a>
      </aside>
    </main>
  );
}
