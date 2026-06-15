'use client';

import Link from 'next/link';
import Logo from './components/Logo';

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-6 pt-20 pb-12
                     lg:flex-row lg:justify-center lg:items-center lg:gap-20 lg:px-16 lg:py-16
                     lg:max-w-[1280px] lg:mx-auto">

      {/* ───────── 좌측(데스크탑) / 가운데(모바일): 카피 + CTA ───────── */}
      <div className="w-full max-w-[420px] mx-auto text-center flex-1 flex flex-col justify-center
                      lg:flex-none lg:max-w-[480px] lg:text-left lg:mx-0">
        {/* 로고 카드 — 모바일 큼 / 데스크탑 작음 */}
        <div className="mx-auto mb-8 inline-flex items-center justify-center
                        w-32 h-32 rounded-logo
                        bg-surface-card border border-line/60 shadow-logo
                        animate-fade-up
                        lg:mx-0 lg:w-20 lg:h-20 lg:rounded-[20px] lg:mb-6">
          <Logo size={76} className="lg:!w-12 lg:!h-12" />
        </div>

        {/* 브랜드명 */}
        <div className="text-[22px] font-bold text-brand-blue mb-14 tracking-tight
                        animate-fade-up anim-delay-100
                        lg:text-[18px] lg:mb-6">
          AI 통화 비서
        </div>

        {/* 헤드라인 */}
        <h1 className="text-[30px] font-bold leading-[1.35] tracking-tight text-ink-primary mb-5
                       animate-fade-up anim-delay-200
                       lg:text-[48px] lg:leading-[1.2] lg:mb-6">
          놓친 전화도<br />
          AI가 깔끔히 정리해요
        </h1>

        {/* 서브 카피 */}
        <p className="text-[15px] leading-relaxed text-ink-secondary
                      animate-fade-up anim-delay-300
                      lg:text-[17px] lg:max-w-[420px]">
          바쁜 매장 운영 중에도 통화 내용을<br />
          자동으로 요약하고 분류해드립니다.
        </p>

        {/* CTA — 모바일 세로 / 데스크탑 가로 */}
        <div className="w-full max-w-[320px] mx-auto mt-10 flex flex-col gap-2
                        animate-fade-up anim-delay-400
                        lg:max-w-none lg:mx-0 lg:flex-row lg:items-center lg:gap-4 lg:mt-10">
          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-2 w-full px-6 py-[17px]
                       bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold text-base
                       rounded-button transition-all
                       hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(59,130,246,0.25)]
                       lg:w-auto lg:px-8 lg:py-4"
          >
            시작하기
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5"
              strokeLinecap="round" strokeLinejoin="round"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>

          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center w-full px-6 py-3
                       text-ink-tertiary hover:text-ink-secondary
                       font-medium text-sm transition-colors
                       lg:w-auto lg:px-2"
          >
            건너뛰기
          </Link>
        </div>

        {/* 개발용 — API 상태 (아주 작게) */}
        <p className="text-center text-[10px] text-ink-tertiary/70 mt-4 font-mono
                      lg:text-left lg:mt-8">
          API: {process.env.NEXT_PUBLIC_API_BASE_URL ? '✓' : '✗'}
        </p>
      </div>

      {/* ───────── 우측(데스크탑 전용): 제품 미리보기 ───────── */}
      <div className="hidden lg:block flex-none w-[360px] animate-fade-in anim-delay-500">
        <PreviewCard />
      </div>

    </main>
  );
}

// ──────────────────────────────────────────────────────
// 데스크탑 전용 — 제품 미리보기 카드
// 더미 데이터로 우리 서비스가 어떻게 보이는지 살짝 보여줌
// ──────────────────────────────────────────────────────
function PreviewCard() {
  return (
    <div
      className="w-full bg-white rounded-[28px] p-5 border border-line/80
                 shadow-[0_30px_60px_-20px_rgba(17,24,39,0.18),0_18px_36px_-18px_rgba(17,24,39,0.10)]
                 animate-float"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between px-2 pb-3 mb-3 border-b border-surface-muted">
        <div className="text-[13px] font-semibold text-ink-primary">📞 통화 목록</div>
        <div className="bg-status-summarized-bg text-status-summarized-text
                        text-[10px] font-semibold px-2 py-[3px] rounded-full">
          3건 분석 완료
        </div>
      </div>

      {/* 카드 1 — 강조 */}
      <div className="bg-white border border-brand-blue rounded-[12px] p-3 mb-2
                      shadow-[0_0_0_3px_rgba(59,130,246,0.08)]">
        <div className="flex items-center justify-between mb-2">
          <span className="bg-status-summarized-bg text-status-summarized-text
                           text-[10px] font-semibold px-[7px] py-[2px] rounded-md">
            요약 완료 ✨
          </span>
          <span className="text-[11px] text-ink-tertiary">방금 전 · 2분 14초</span>
        </div>
        <div className="text-[13px] font-semibold text-ink-primary mb-0.5">
          010-3142-5687
          <span className="bg-status-new-bg text-status-new-text
                           text-[9px] font-semibold px-1.5 py-[2px] rounded-full ml-1.5">
            NEW
          </span>
        </div>
        <div className="text-[11px] text-ink-tertiary">예약 문의 · 김OO 손님</div>
        <div className="bg-brand-blue-light rounded-lg px-2.5 py-2 mt-2">
          <div className="text-[10px] font-semibold text-brand-blue mb-0.5">📝 AI 요약</div>
          <div className="text-[12px] text-ink-secondary leading-snug">
            토요일 저녁 7시, 4명 예약 요청. 창가 자리 선호하셨고 생일 케이크 준비 가능한지 문의.
          </div>
        </div>
      </div>

      {/* 카드 2 — 처리 중 */}
      <div className="bg-white border border-line rounded-[12px] p-3 mb-2">
        <div className="flex items-center justify-between mb-2">
          <span className="bg-status-processing-bg text-status-processing-text
                           text-[10px] font-semibold px-[7px] py-[2px] rounded-md">
            처리 중
          </span>
          <span className="text-[11px] text-ink-tertiary">3분 전</span>
        </div>
        <div className="text-[13px] font-semibold text-ink-primary mb-0.5">02-2273-4421</div>
        <div className="text-[11px] text-ink-tertiary">분석 중...</div>
      </div>

      {/* 카드 3 — 개인 통화 */}
      <div className="bg-white border border-line rounded-[12px] p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="bg-status-summarized-bg text-status-summarized-text
                           text-[10px] font-semibold px-[7px] py-[2px] rounded-md">
            요약 완료 ✨
          </span>
          <span className="text-[11px] text-ink-tertiary">10분 전 · 1분 02초</span>
        </div>
        <div className="text-[13px] font-semibold text-ink-primary mb-0.5">*** 8821</div>
        <div className="text-[11px] text-ink-tertiary">개인 통화</div>
      </div>
    </div>
  );
}