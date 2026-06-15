'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { storeApi } from '@/lib/api';

const INDUSTRIES = [
  { value: 'food',    label: '🍽️', name: '음식점/카페' },
  { value: 'beauty',  label: '💄', name: '미용/뷰티' },
  { value: 'medical', label: '🏥', name: '병원/의원' },
  { value: 'retail',  label: '🛍️', name: '소매/판매' },
  { value: 'service', label: '🔧', name: '서비스업' },
  { value: 'other',   label: '📌', name: '기타' },
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
    <main className="min-h-screen bg-surface-page flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-[400px]">
        <Link href="/dashboard"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink-primary mb-6 px-3 py-2 hover:bg-white rounded-[10px] transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          대시보드로
        </Link>

        <div className="bg-white border border-line rounded-[20px] p-6">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto mb-3 bg-brand-blue-light rounded-[16px] flex items-center justify-center text-2xl">🏪</div>
            <h1 className="text-[20px] font-bold text-ink-primary mb-1">가게 등록</h1>
            <p className="text-[13px] text-ink-secondary">통화를 관리할 가게 정보를 입력하세요</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">
                가게 이름 <span className="text-red-500">*</span>
              </label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="예: 명동 칼국수" maxLength={50} disabled={submitting}
                className="w-full px-4 py-3 text-[14px] border border-line rounded-[12px] outline-none focus:border-brand-blue transition-colors disabled:bg-surface-muted" />
              <p className="text-[11px] text-ink-tertiary mt-1">{name.length}/50자</p>
            </div>

            <div>
              <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">업종</label>
              <div className="grid grid-cols-2 gap-2">
                {INDUSTRIES.map(ind => (
                  <label key={ind.value}
                    className={`flex items-center gap-2.5 p-3 rounded-[11px] border cursor-pointer transition-all ${
                      industry === ind.value ? 'border-brand-blue bg-brand-blue-light' : 'border-line hover:border-brand-blue/40'
                    }`}>
                    <input type="radio" name="industry" value={ind.value}
                      checked={industry === ind.value} onChange={e => setIndustry(e.target.value)}
                      disabled={submitting} className="sr-only" />
                    <span className="text-lg">{ind.label}</span>
                    <span className={`text-[13px] font-medium ${industry === ind.value ? 'text-brand-blue' : 'text-ink-primary'}`}>{ind.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {error && <div className="px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">{error}</div>}

            <button type="submit" disabled={submitting || !name.trim()}
              className="w-full py-3.5 text-[14px] font-semibold text-white bg-brand-blue hover:bg-brand-blue-hover disabled:bg-ink-tertiary/30 disabled:cursor-not-allowed rounded-[12px] transition-all flex items-center justify-center gap-2">
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />등록 중...</>
              ) : '가게 등록하기'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
