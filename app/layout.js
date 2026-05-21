import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "AI 통화 비서",
  description: "소상공인을 위한 AI 통화 요약 서비스",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        {/* 카카오 SDK v1 로드 (팝업 방식 지원) */}
        <Script
          src="https://developers.kakao.com/sdk/js/kakao.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}