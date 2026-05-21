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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [sdkStatus, setSdkStatus] = useState('⏳ 로딩 중');

  // ──────────────────────────────────────────
  // 🔒 아래 로직은 기존과 100% 동일 — 디자인만 변경
  // ──────────────────────────────────────────

  // 페이지 진입 시 카카오 SDK 초기화
  useEffect(() => {
    const timer = setTimeout(() => {
      initKakao();
      if (window.Kakao && window.Kakao.isInitialized()) {
        setSdkStatus('✅ 로드됨');
      } else {
        setSdkStatus('❌ 로드 실패');
      }
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // 카카오 로그인 버튼 클릭 처리
  const handleKakaoLogin = async () => {
    setError('');
    setIsLoading(true);

    try {
      const kakaoAccessToken = await loginWithKakao();
      console.log('✅ 카카오 access_token 받음');

      // 카카오 사용자 정보 프론트에서 직접 조회
      const kakaoUserResp = await fetch('https://kapi.kakao.com/v2/user/me', {
          headers: { Authorization: `Bearer ${kakaoAccessToken}` },
      });
      const kakaoUser = await kakaoUserResp.json();
      const kakaoId  = String(kakaoUser.id);
      const email    = kakaoUser.kakao_account?.email || '';
      const nickname = kakaoUser.kakao_account?.profile?.nickname || '';
      
      console.log('2️⃣ 백엔드에 인증 요청...');
      const response = await authApi.kakaoLogin(kakaoId, email, nickname);
      const { custom_token, uid } = response.data;
      console.log('✅ Firebase Custom Token 받음:', { uid, nickname });

      console.log('3️⃣ Firebase 로그인 중...');
      await loginWithFirebaseCustomToken(custom_token);
      console.log('✅ Firebase 로그인 완료');

      if (nickname) {
        localStorage.setItem('user_nickname', nickname);
      }

      console.log('🎉 로그인 성공! 대시보드로 이동');
      router.push('/dashboard');
    } catch (err) {
      console.error('로그인 실패:', err);
      setError(
        err.response?.data?.message ||
          err.message ||
          '로그인에 실패했습니다. 다시 시도해주세요.'
      );
      setIsLoading(false);
    }
  };

  // ──────────────────────────────────────────
  // 🎨 UI
  // ──────────────────────────────────────────
  return (
    <main className="min-h-screen flex flex-col px-6 pt-6 pb-8 lg:px-8">
      {/* 좌상단 — 뒤로가기 */}
      <div className="flex items-center animate-fade-up">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-ink-secondary
                     hover:text-ink-primary px-3 py-2 rounded-[10px]
                     hover:bg-surface-card transition-all"
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.5"
            strokeLinecap="round" strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          홈으로
        </Link>
      </div>

      {/* 가운데 콘텐츠 */}
      <div className="flex-1 flex items-center justify-center py-10">
        <div className="w-full max-w-[400px] flex flex-col gap-5
                        lg:max-w-[920px] lg:flex-row lg:items-start lg:gap-10">

          {/* ───── 로그인 카드 ───── */}
          <div className="w-full bg-surface-card rounded-[24px] px-8 py-10
                          border border-line/60 shadow-card animate-fade-up anim-delay-100
                          lg:flex-none lg:w-[380px] lg:self-center">
            {/* 로고 */}
            <div className="mx-auto mb-6 w-22 h-22 flex items-center justify-center
                            bg-surface-page rounded-[22px] border border-line/60
                            animate-fade-up anim-delay-200"
                 style={{ width: '88px', height: '88px' }}
            >
              <Logo size={52} />
            </div>

            {/* 제목 */}
            <div className="text-center animate-fade-up anim-delay-300">
              <h1 className="text-[22px] font-bold text-ink-primary tracking-tight mb-2">
                로그인하고 시작하기
              </h1>
              <p className="text-[14px] text-ink-secondary leading-relaxed">
                비즈니스 카카오 계정으로 1초만에 시작하세요.<br />
                번거로운 가입 절차가 없습니다.
              </p>
            </div>

            {/* 에러 메시지 */}
            {error && (
              <div className="mt-4 px-3.5 py-3 bg-red-50 border border-red-200
                              rounded-[10px] text-[13px] text-red-800">
                {error}
              </div>
            )}

            {/* 카카오 로그인 버튼 */}
            <button
              onClick={handleKakaoLogin}
              disabled={isLoading}
              className="w-full mt-8 py-4 px-5 rounded-[14px] font-semibold text-[15px]
                         inline-flex items-center justify-center gap-2
                         transition-all duration-150
                         disabled:opacity-50 disabled:cursor-not-allowed
                         hover:not(:disabled):translate-y-[-1px]
                         hover:not(:disabled):shadow-[0_6px_16px_rgba(254,229,0,0.35)]
                         animate-fade-up anim-delay-400"
              style={{
                background: '#FEE500',
                color: 'rgba(0, 0, 0, 0.85)',
              }}
              onMouseEnter={(e) => {
                if (!isLoading) e.currentTarget.style.background = '#F5DC00';
              }}
              onMouseLeave={(e) => {
                if (!isLoading) e.currentTarget.style.background = '#FEE500';
              }}
            >
              {isLoading ? (
                <>
                  <span className="inline-block w-[18px] h-[18px] border-[2.5px]
                                   border-black/25 border-t-black/70 rounded-full animate-spin" />
                  <span>로그인 중...</span>
                </>
              ) : (
                <>
                  {/* 카카오톡 말풍선 SVG */}
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 3C6.5 3 2 6.5 2 10.8c0 2.7 1.8 5.1 4.5 6.5l-1 3.7c-.1.4.3.7.6.5l4.4-2.9c.5.1 1 .1 1.5.1 5.5 0 10-3.5 10-7.9C22 6.5 17.5 3 12 3z" />
                  </svg>
                  <span>카카오로 시작하기</span>
                </>
              )}
            </button>

            {/* 약관 안내 */}
            <p className="mt-5 text-center text-[12px] text-ink-tertiary leading-[1.5]
                          animate-fade-up anim-delay-400">
              로그인 시 <a href="#" className="text-ink-secondary underline underline-offset-2">이용약관</a>
              {' '}및{' '}
              <a href="#" className="text-ink-secondary underline underline-offset-2">개인정보 처리방침</a>에<br />
              동의하는 것으로 간주됩니다.
            </p>
          </div>

          {/* ───── 우측 권한 안내 + 다운로드 (데스크탑 전용) ───── */}
          <aside className="hidden lg:block flex-1 pt-2 pl-2 animate-fade-in anim-delay-500">
            {/* 헤더 */}
            <div className="mb-6">
              <span className="inline-block text-[11px] font-semibold text-brand-blue
                               bg-brand-blue-light px-2.5 py-1 rounded-full mb-3
                               tracking-wide">
                📱 안드로이드 앱 권한 안내
              </span>
              <h2 className="text-[22px] font-bold text-ink-primary tracking-tight mb-2">
                이런 권한들을 사용해요
              </h2>
              <p className="text-[14px] text-ink-secondary leading-[1.55]">
                모바일 앱 설치 시 다음 권한이 필요합니다.<br />
                업무에 꼭 필요한 권한만 요청드려요.
              </p>
            </div>

            {/* 권한 카드 3개 */}
            <div className="flex flex-col gap-3 mb-4">
              <PermissionCard
                title="통화 녹음 파일 접근"
                desc="삼성 통화 녹음 앱이 자동 저장한 음성 파일을 AI가 분석합니다."
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                    <line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                }
              />
              <PermissionCard
                title="연락처 읽기"
                desc="저장된 연락처와 비교해 업무/개인 통화를 자동으로 분류합니다."
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                    <circle cx="8.5" cy="7" r="4"/>
                    <line x1="20" y1="8" x2="20" y2="14"/>
                    <line x1="23" y1="11" x2="17" y2="11"/>
                  </svg>
                }
              />
              <PermissionCard
                title="알림 전송"
                desc="중요한 통화를 분석하면 알림으로 알려드립니다."
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                       stroke="currentColor" strokeWidth="2"
                       strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                }
              />
            </div>

            {/* 권한 안내 노트 */}
            <div className="mt-2 px-3.5 py-3 rounded-[12px] flex gap-2.5 items-start"
                 style={{
                   background: 'rgba(59, 130, 246, 0.04)',
                   border: '1px dashed rgba(59, 130, 246, 0.25)',
                 }}>
              <svg className="flex-none mt-0.5 text-brand-blue" width="16" height="16"
                   viewBox="0 0 24 24" fill="none" stroke="currentColor"
                   strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="16" x2="12" y2="12"/>
                <line x1="12" y1="8" x2="12.01" y2="8"/>
              </svg>
              <p className="text-[12px] text-ink-secondary leading-[1.55]">
                권한은 <strong className="text-ink-primary font-semibold">안드로이드 앱 설치 시 별도로 요청</strong>됩니다.<br />
                웹에서는 통화 내역 조회와 관리만 가능합니다.
              </p>
            </div>

            {/* 안드로이드 다운로드 CTA */}
            <a
              href="https://drive.google.com/file/d/1jJNRF2CCVcCKSpdIPUODjWL6F5exxJ-T/view?usp=sharing"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 flex items-center gap-3.5 px-4.5 py-3.5 rounded-[14px]
                         text-white transition-all
                         hover:translate-y-[-1px]
                         hover:shadow-[0_8px_20px_rgba(17,24,39,0.18)]
                         group"
              style={{ background: '#111827', padding: '14px 18px' }}
            >
              <span className="flex-none w-10 h-10 rounded-[10px] flex items-center justify-center"
                    style={{ background: 'rgba(255, 255, 255, 0.1)' }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
                     stroke="currentColor" strokeWidth="2"
                     strokeLinecap="round" strokeLinejoin="round">
                  <rect x="5" y="2" width="14" height="20" rx="2" ry="2"/>
                  <line x1="12" y1="18" x2="12.01" y2="18"/>
                </svg>
              </span>
              <span className="flex-1">
                <span className="flex items-center gap-2 mb-0.5">
                  <span className="text-[14px] font-semibold text-white">
                    안드로이드 앱 다운로드
                  </span>
                  <span className="text-[10px] font-semibold px-[7px] py-0.5 rounded-full"
                        style={{
                          background: 'rgba(34, 197, 94, 0.2)',
                          color: '#22C55E',
                        }}>
                    시연 가능
                  </span>
                </span>
                <span className="block text-[12px] text-white/60">
                  APK 직접 다운로드 (22MB)
                </span>
              </span>
              <svg className="text-white/60 transition-transform group-hover:translate-x-0.5 group-hover:text-white"
                   width="18" height="18" viewBox="0 0 24 24" fill="none"
                   stroke="currentColor" strokeWidth="2.5"
                   strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
          </aside>
        </div>
      </div>

      {/* 개발용: SDK 상태 */}
      <p className="text-center text-[11px] text-ink-tertiary/70 font-mono mt-5">
        카카오 SDK: {sdkStatus}
      </p>
    </main>
  );
}

// ──────────────────────────────────────────
// 권한 카드 (재사용 가능한 작은 컴포넌트)
// ──────────────────────────────────────────
function PermissionCard({ icon, title, desc }) {
  return (
    <div className="bg-surface-card border border-line/70 rounded-[16px] px-4.5 py-4
                    flex gap-3.5 transition-all
                    hover:border-brand-blue/30 hover:translate-x-0.5"
         style={{ padding: '16px 18px' }}>
      <div className="flex-none w-10 h-10 rounded-[12px] flex items-center justify-center
                      bg-brand-blue-light text-brand-blue">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-[14px] font-semibold text-ink-primary mb-1">
          {title}
        </div>
        <div className="text-[12.5px] text-ink-secondary leading-[1.55]">
          {desc}
        </div>
      </div>
    </div>
  );
}