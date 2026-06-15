'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { storeApi } from '@/lib/api';
import Logo from '../../components/Logo';

const DarkNavy = '#3D4D6B';
const DarkNavyDeep = '#2E3D56';
const AccentBlue = '#3B7DD8';
const White = '#FFFFFF';

const INDUSTRIES = [
  { value:'food',    emoji:'🍽️', name:'음식점/카페' },
  { value:'beauty',  emoji:'💄', name:'미용/뷰티' },
  { value:'medical', emoji:'🏥', name:'병원/의원' },
  { value:'retail',  emoji:'🛍️', name:'소매/판매' },
  { value:'service', emoji:'🔧', name:'서비스업' },
  { value:'other',   emoji:'📌', name:'기타' },
];

export default function NewStorePage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [industry, setIndustry] = useState('food');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('가게 이름을 입력해주세요'); return; }
    if (name.trim().length < 2) { setError('가게 이름은 2자 이상이어야 해요'); return; }
    setSubmitting(true); setError('');
    try {
      await storeApi.create(name.trim(), industry);
      router.push('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || '가게 등록에 실패했습니다');
      setSubmitting(false);
    }
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
        width: '100%', maxWidth: 760,
        background: '#F0F2F5',
        borderRadius: 24, overflow: 'hidden',
        boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 8px 20px rgba(0,0,0,0.2)',
        display: 'flex', minHeight: 480,
      }}>
        {/* 좌측 */}
        <div style={{
          width: 260, flexShrink: 0,
          background: DarkNavyDeep,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          padding: '40px 28px', textAlign: 'center',
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🏪</div>
          <h2 style={{ color: White, fontWeight: 800, fontSize: 20, margin: '0 0 10px' }}>가게 등록</h2>
          <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 13, lineHeight: 1.7, margin: 0 }}>
            통화를 관리할<br />가게 정보를 입력하세요
          </p>
          <Link href="/dashboard" style={{
            marginTop: 32, color: 'rgba(255,255,255,0.4)', fontSize: 12, textDecoration: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>← 대시보드로</Link>
        </div>

        {/* 우측 폼 */}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 36px' }}>
          <div style={{ width: '100%', maxWidth: 360 }}>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7889', marginBottom: 6 }}>
                  가게 이름 <span style={{ color: '#E53E3E' }}>*</span>
                </label>
                <input type="text" value={name} onChange={e => setName(e.target.value)}
                  placeholder="예: 명동 칼국수" maxLength={50} disabled={submitting}
                  style={{ width: '100%', padding: '12px 14px', border: '1px solid #E8EBF0', borderRadius: 12, fontSize: 14, outline: 'none', boxSizing: 'border-box', background: White }} />
                <p style={{ fontSize: 11, color: '#C8CDD5', margin: '4px 0 0' }}>{name.length}/50자</p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6B7889', marginBottom: 8 }}>업종</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                  {INDUSTRIES.map(ind => (
                    <label key={ind.value} onClick={() => setIndustry(ind.value)} style={{
                      display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px',
                      borderRadius: 10, border: `1px solid ${industry === ind.value ? AccentBlue : '#E8EBF0'}`,
                      background: industry === ind.value ? '#EFF6FF' : White,
                      cursor: 'pointer', transition: 'all 0.15s',
                    }}>
                      <input type="radio" name="industry" value={ind.value} checked={industry === ind.value} onChange={() => setIndustry(ind.value)} style={{ display: 'none' }} />
                      <span>{ind.emoji}</span>
                      <span style={{ fontSize: 13, fontWeight: 500, color: industry === ind.value ? AccentBlue : '#1F2A3D' }}>{ind.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {error && <div style={{ padding: '12px 14px', background: '#FBE3E3', borderRadius: 10, fontSize: 13, color: '#C23B3B' }}>{error}</div>}

              <button type="submit" disabled={submitting || !name.trim()} style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: submitting || !name.trim() ? '#C8CDD5' : DarkNavy,
                color: White, fontWeight: 700, fontSize: 14, cursor: submitting || !name.trim() ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
                {submitting ? (
                  <><span style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTop: '2px solid white', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />등록 중...</>
                ) : '가게 등록하기'}
              </button>
            </form>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
