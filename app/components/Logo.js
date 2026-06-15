// app/components/Logo.js
//
// AI 통화 비서 로고
// - 스마트폰(검정/파랑) + 우하단 사운드 웨이브(농도 그라데이션)
// - size prop으로 크기 조절 (기본 76px)
//
// 사용 예:
//   <Logo />                   // 기본 76px
//   <Logo size={48} />         // 작게 (헤더용)
//   <Logo size={120} />        // 크게 (랜딩용)
//   <Logo size={28} mark />    // 마크만 (스마트폰만, 웨이브 없음)

export default function Logo({ size = 76, mark = false, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="AI 통화 비서"
      role="img"
    >
      {/* 스마트폰 본체 */}
      <rect
        x="15"
        y="8"
        width="22"
        height="40"
        rx="4.5"
        fill="none"
        stroke="#3B82F6"
        strokeWidth="2.6"
      />
      {/* 상단 스피커 슬릿 */}
      <line
        x1="22"
        y1="13"
        x2="30"
        y2="13"
        stroke="#3B82F6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      {/* 하단 홈 인디케이터 */}
      <line
        x1="22"
        y1="44"
        x2="30"
        y2="44"
        stroke="#3B82F6"
        strokeWidth="1.6"
        strokeLinecap="round"
      />

      {/* 사운드 웨이브 (mark=true면 생략) — 농도 그라데이션 */}
      {!mark && (
        <>
          <rect x="40" y="46" width="2.2" height="4"  rx="1.1" fill="#93C5FD" />
          <rect x="44" y="43" width="2.2" height="7"  rx="1.1" fill="#60A5FA" />
          <rect x="48" y="39" width="2.2" height="11" rx="1.1" fill="#3B82F6" />
          <rect x="52" y="35" width="2.2" height="15" rx="1.1" fill="#1E40AF" />
        </>
      )}
    </svg>
  );
}