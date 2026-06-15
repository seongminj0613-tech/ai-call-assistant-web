'use client';

import Link from 'next/link';
import Logo from './components/Logo';

const DarkNavy = '#3D4D6B';
const DarkNavyDeep = '#2E3D56';
const AccentBlue = '#3B7DD8';
const White = '#FFFFFF';

export default function Home() {
  return (
    <div style={{
      minHeight: '100vh',
      background: DarkNavy,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
      fontFamily: "'Pretendard Variable',Pretendard,sans-serif",
    }}>
      {/* 떠있는 카드 */}
      <div style={{
        width: '100%',
        maxWidth: 960,
        background: '#F0F2F5',
        borderRadius: 24,
        overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.2)',
        display: 'flex',
        minHeight: 560,
      }}>
        {/* 좌측 다크 패널 */}
        <div style={{
          width: 380, flexShrink: 0,
          background: DarkNavyDeep,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '48px 40px',
          textAlign: 'center',
        }}>
          <div style={{
            width: 80, height: 80,
            background: 'rgba(255,255,255,0.1)',
            borderRadius: 22,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 24,
            boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
          }}>
            <Logo size={48} />
          </div>
          <h1 style={{ color: White, fontWeight: 800, fontSize: 26, margin: '0 0 10px', letterSpacing: '-0.5px' }}>
            AI 통화 비서
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 1.7, margin: '0 0 36px' }}>
            소상공인을 위한<br />AI 통화 요약 서비스
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%' }}>
            <Link href="/login" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '14px 0',
              background: AccentBlue,
              borderRadius: 12,
              color: White, fontWeight: 700, fontSize: 15,
              textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}>
              시작하기 →
            </Link>
            <Link href="/dashboard" style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              padding: '12px 0',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 12,
              color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontSize: 14,
              textDecoration: 'none',
            }}>
              건너뛰기
            </Link>
          </div>
        </div>

        {/* 우측 프리뷰 */}
        <div style={{
          flex: 1,
          background: '#F0F2F5',
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 32px',
        }}>
          <div style={{ width: '100%', maxWidth: 340 }}>
            <p style={{ color: '#9AA5B5', fontSize: 12, fontWeight: 600, letterSpacing: 1, marginBottom: 16, textTransform: 'uppercase' }}>미리보기</p>

            {/* 통화 카드 1 */}
            {[
              { phone: '010-3142-5687', label: '예약', labelBg: '#E3EEFB', labelFg: '#2563B5', time: '방금 전', summary: '토요일 저녁 7시, 4명 예약 요청. 창가 자리 선호.', isNew: true },
              { phone: '02-2273-4421', label: '문의', labelBg: '#EBE9FB', labelFg: '#5B4FC2', time: '3분 전', summary: '분석 중...', isNew: false },
              { phone: '*** 8821', label: '기타', labelBg: '#E8EBF0', labelFg: '#6B7889', time: '10분 전', summary: '개인 통화', isNew: false },
            ].map((item, i) => (
              <div key={i} style={{
                background: White, borderRadius: 14, padding: '14px 16px',
                marginBottom: 10,
                boxShadow: i === 0 ? `0 0 0 2px ${AccentBlue}, 0 4px 12px rgba(59,125,216,0.12)` : '0 1px 4px rgba(0,0,0,0.06)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: item.labelBg, color: item.labelFg }}>{item.label}</span>
                    {item.isNew && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: '#E53E3E', color: White }}>NEW</span>}
                  </div>
                  <span style={{ fontSize: 11, color: '#9AA5B5' }}>{item.time}</span>
                </div>
                <div style={{ fontWeight: 700, fontSize: 14, color: '#1F2A3D', marginBottom: 4 }}>{item.phone}</div>
                {i === 0 && (
                  <div style={{ background: '#EFF6FF', borderRadius: 8, padding: '8px 10px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: AccentBlue, marginBottom: 3 }}>✨ AI 요약</div>
                    <p style={{ margin: 0, fontSize: 12, color: '#2D4A7A', lineHeight: 1.5 }}>{item.summary}</p>
                  </div>
                )}
                {i !== 0 && <div style={{ fontSize: 12, color: '#9AA5B5' }}>{item.summary}</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
