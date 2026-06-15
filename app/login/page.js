'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { initKakao, loginWithKakao } from '@/lib/kakao';
import { authApi } from '@/lib/api';
import { loginWithFirebaseCustomToken } from '@/lib/firebase';
import Logo from '../components/Logo';

const DarkNavy = '#3D4D6B';
const DarkNavyDeep = '#2E3D56';
const AccentBlue = '#3B7DD8';
const White = '#FFFFFF';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(null);
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
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) { setError('구글 로그인이 설정되지 않았습니다'); setLoading(null); return; }
    const redirectUri = `${window.location.origin}/oauth/google`;
    const state = Math.random().toString(36).slice(2);
    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=openid%20email%20profile&state=${state}`;
  };

  const handleNaverLogin = () => {
    setError(''); setLoading('naver');
    const clientId = process.env.NEXT_PUBLIC_NAVER_CLIENT_ID;
    if (!clientId) { setError('네이버 로그인이 설정되지 않았습니다'); setLoading(null); return; }
    const redirectUri = `${window.location.origin}/oauth/naver`;
    const state = Math.random().toString(36).slice(2);
    window.location.href = `https://nid.naver.com/oauth2.0/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: DarkNavy,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Pretendard Variable',Pretendard,sans-serif",
    }}>
      <div style={{
        width: '100%', maxWidth: 860,
        background: '#F0F2F5',
        borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.2)',
        display: 'flex', minHeight: 520,
      }}>
        {/* 좌측 다크 패널 */}
        <div style={{
          width: 320, flexShrink: 0,
          background: DarkNavyDeep,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px 36px', textAlign: 'center',
        }}>
          <Link href="/" style={{ textDecoration: 'none', marginBottom: 20 }}>
            <div style={{ width: 64, height: 64, background: 'rgba(255,255,255,0.1)', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Logo size={40} />
            </div>
          </Link>
          <h1 style={{ color: White, fontWeight: 800, fontSize: 22, margin: '0 0 10px' }}>AI 통화 비서</h1>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            소셜 계정으로 로그인하고<br />바로 시작하세요
          </p>
          <div style={{ marginTop: 40, width: '100%', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 24 }}>
            {[
              { icon: '🎙️', text: '통화 자동 분석' },
              { icon: '📋', text: 'AI 요약 정리' },
              { icon: '📅', text: '예약 일정 관리' },
            ].map(item => (
              <div key={item.text} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 13 }}>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 우측 로그인 폼 */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px',
        }}>
          <div style={{ width: '100%', maxWidth: 340 }}>
            <h2 style={{ fontWeight: 800, fontSize: 22, color: '#1F2A3D', margin: '0 0 6px' }}>로그인</h2>
            <p style={{ color: '#9AA5B5', fontSize: 13, margin: '0 0 32px' }}>소셜 계정으로 1초만에 시작하세요</p>

            {error && (
              <div style={{ marginBottom: 16, padding: '12px 14px', background: '#FBE3E3', borderRadius: 10, fontSize: 13, color: '#C23B3B' }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* 카카오 */}
              <button onClick={handleKakaoLogin} disabled={!!loading} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '14px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#FEE500', color: 'rgba(0,0,0,0.85)',
                fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1,
              }}>
                {loading === 'kakao' ? (
                  <span style={{ width: 18, height: 18, border: '2px solid rgba(0,0,0,0.2)', borderTop: '2px solid rgba(0,0,0,0.7)', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                ) : <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.8 5.1 4.5 6.5l-1 3.7c-.1.4.3.7.6.5l4.4-2.9c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.9C22 6.5 17.5 3 12 3z"/></svg>}
                카카오로 시작하기
              </button>

              {/* 구분선 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
                <div style={{ flex: 1, height: 1, background: '#E8EBF0' }} />
                <span style={{ fontSize: 11, color: '#C8CDD5', fontWeight: 500 }}>또는</span>
                <div style={{ flex: 1, height: 1, background: '#E8EBF0' }} />
              </div>

              {/* 구글 */}
              <button onClick={handleGoogleLogin} disabled={!!loading} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '13px 0', borderRadius: 12, border: '1px solid #E8EBF0', cursor: 'pointer',
                background: White, color: '#1F2A3D',
                fontWeight: 600, fontSize: 14, opacity: loading ? 0.6 : 1,
              }}>
                {loading === 'google' ? (
                  <span style={{ width: 18, height: 18, border: '2px solid #E8EBF0', borderTop: '2px solid #9AA5B5', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                )}
                구글로 시작하기
              </button>

              {/* 네이버 */}
              <button onClick={handleNaverLogin} disabled={!!loading} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                padding: '13px 0', borderRadius: 12, border: 'none', cursor: 'pointer',
                background: '#03C75A', color: White,
                fontWeight: 700, fontSize: 14, opacity: loading ? 0.6 : 1,
              }}>
                {loading === 'naver' ? (
                  <span style={{ width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
                ) : <span style={{ fontWeight: 900, fontSize: 16 }}>N</span>}
                네이버로 시작하기
              </button>
            </div>

            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 11, color: '#C8CDD5', lineHeight: 1.6 }}>
              로그인 시 <a href="#" style={{ color: '#9AA5B5' }}>이용약관</a> 및 <a href="#" style={{ color: '#9AA5B5' }}>개인정보 처리방침</a>에 동의합니다
            </p>
          </div>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
