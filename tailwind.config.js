/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      // ─────────────────────────────────────
      // 컬러 토큰
      // ─────────────────────────────────────
      colors: {
        // 기존 호환 (page.js의 var(--background) 등 안 깨짐)
        background: "var(--background)",
        foreground: "var(--foreground)",

        // 브랜드
        // - Primary: 파랑 (메인 액션, 로고, 활성 상태)
        // - Accent: 노랑 (사용처는 화면별로 점진 결정)
        brand: {
          blue: {
            DEFAULT: "#3B82F6",
            hover: "#2563EB",
            light: "#EFF6FF",
            dark: "#1E40AF",
            // 로고 그라데이션용
            300: "#93C5FD",
            400: "#60A5FA",
            500: "#3B82F6",
            700: "#1E40AF",
          },
          yellow: {
            DEFAULT: "#FFD93B",
            hover: "#F5C518",
            light: "#FFF4C2",
            dark: "#E0A800",
          },
        },

        // 시맨틱 (감성 — 통화 상세에서 사용)
        sentiment: {
          positive: { DEFAULT: "#16A34A", bg: "#DCFCE7", text: "#15803D" },
          neutral:  { DEFAULT: "#6B7280", bg: "#F3F4F6", text: "#374151" },
          negative: { DEFAULT: "#DC2626", bg: "#FEE2E2", text: "#991B1B" },
        },

        // 통화 상태 (목록/상세 카드에서 사용)
        status: {
          uploaded:    { bg: "#DBEAFE", text: "#1E40AF" },
          processing:  { bg: "#FEF3C7", text: "#92400E" },
          transcribed: { bg: "#EDE9FE", text: "#5B21B6" },
          summarized:  { bg: "#DCFCE7", text: "#15803D" },
          error:       { bg: "#FEE2E2", text: "#991B1B" },
          new:         { bg: "#EF4444", text: "#FFFFFF" },
        },

        // 표면 (배경/카드)
        surface: {
          page: "#F5F6FA",     // 페이지 배경 (살짝 라벤더 톤, 목업 매칭)
          card: "#FFFFFF",
          muted: "#F3F4F6",
        },

        // 텍스트
        ink: {
          primary: "#111827",
          secondary: "#4B5563",
          tertiary: "#9CA3AF",
          inverse: "#FFFFFF",
        },

        // 보더
        line: {
          DEFAULT: "#E5E7EB",
          strong: "#D1D5DB",
          focus: "#3B82F6",
        },
      },

      // ─────────────────────────────────────
      // 폰트
      // ─────────────────────────────────────
      fontFamily: {
        sans: [
          "Pretendard Variable",
          "Pretendard",
          "-apple-system",
          "BlinkMacSystemFont",
          "system-ui",
          "Roboto",
          "Helvetica Neue",
          "Segoe UI",
          "Apple SD Gothic Neo",
          "Noto Sans KR",
          "Malgun Gothic",
          "sans-serif",
        ],
      },

      // ─────────────────────────────────────
      // 라운드/그림자
      // ─────────────────────────────────────
      borderRadius: {
        button: "14px",
        card: "16px",
        "card-lg": "20px",
        "logo": "32px",
        chip: "9999px",
      },
      boxShadow: {
        card: "0 1px 2px 0 rgba(17, 24, 39, 0.04), 0 2px 6px 0 rgba(17, 24, 39, 0.04)",
        "card-hover": "0 4px 12px 0 rgba(17, 24, 39, 0.06), 0 2px 6px 0 rgba(17, 24, 39, 0.04)",
        "logo": "inset 0 1px 0 rgba(255, 255, 255, 0.6), 0 6px 24px 0 rgba(17, 24, 39, 0.07), 0 2px 10px 0 rgba(17, 24, 39, 0.04)",
        "focus-blue": "0 0 0 4px rgba(59, 130, 246, 0.18)",
      },

      // ─────────────────────────────────────
      // 컨테이너 max-width
      // ─────────────────────────────────────
      maxWidth: {
        "container-sm": "640px",
        "container-md": "768px",
        "container-lg": "1024px",
      },

      // ─────────────────────────────────────
      // 진입 애니메이션
      // ─────────────────────────────────────
      keyframes: {
        "fade-up": {
          "0%":   { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          "0%":   { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%":      { transform: "translateY(-6px)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.5s ease-out forwards",
        "fade-in": "fade-in 0.4s ease-out forwards",
        "float":   "float 6s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};