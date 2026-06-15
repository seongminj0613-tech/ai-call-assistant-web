'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { calendarConnectApi } from '@/lib/api';
import AppLayout from '../../components/AppLayout';

const PROVIDERS = [
  {
    key: 'google',
    label: 'Google 캘린더',
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
      </svg>
    ),
    color: 'border-[#4285F4]/30 hover:border-[#4285F4]/60',
    activeColor: 'border-[#4285F4] bg-blue-50',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    key: 'kakao',
    label: '카카오 캘린더',
    icon: <span className="text-[18px]">💬</span>,
    color: 'border-[#FEE500]/60 hover:border-[#FEE500]',
    activeColor: 'border-[#FEE500] bg-yellow-50',
    badgeColor: 'bg-yellow-100 text-yellow-800',
  },
  {
    key: 'naver',
    label: '네이버 캘린더',
    icon: <span className="text-[18px] font-bold text-[#03C75A]">N</span>,
    color: 'border-[#03C75A]/30 hover:border-[#03C75A]/60',
    activeColor: 'border-[#03C75A] bg-green-50',
    badgeColor: 'bg-green-100 text-green-700',
  },
];

export default function CalendarConnectPage() {
  const router = useRouter();
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) { router.push('/login'); return; }
      await loadConnections();
    });
    return () => unsub();
  }, [router]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const res = await calendarConnectApi.getConnections();
      setConnections(res.data?.connections || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const connectedProviders = new Set(connections.map(c => c.provider));

  const handleConnect = async (provider) => {
    setActionLoading(provider);
    setError('');
    try {
      const redirectUri = `${window.location.origin}/oauth/${provider}`;
      const state = Math.random().toString(36).slice(2);
      const res = await calendarConnectApi.getOAuthUrl(provider, redirectUri, state);
      const url = res.data?.oauth_url || res.data?.url;
      if (url) window.location.href = url;
      else setError('OAuth URL을 받지 못했습니다');
    } catch (e) {
      setError(e.response?.data?.message || `${provider} 연동 시작에 실패했습니다`);
    } finally {
      setActionLoading('');
    }
  };

  const handleDisconnect = async (provider) => {
    if (!confirm(`${provider} 캘린더 연동을 해제할까요?`)) return;
    setActionLoading(provider);
    try {
      await calendarConnectApi.disconnect(provider);
      setConnections(prev => prev.filter(c => c.provider !== provider));
    } catch (e) {
      setError(e.response?.data?.message || '연동 해제에 실패했습니다');
    } finally {
      setActionLoading('');
    }
  };

  return (
    <AppLayout>
      <div className="mb-6 animate-fade-up">
        <Link href="/calendar"
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink-primary mb-4 px-3 py-2 hover:bg-white rounded-[10px] transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          캘린더로
        </Link>
        <h1 className="text-[22px] font-bold text-ink-primary tracking-tight mb-1">캘린더 연동</h1>
        <p className="text-[13px] text-ink-secondary">예약 일정을 자동으로 캘린더에 등록해드려요</p>
      </div>

      {error && (
        <div className="mb-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">{error}</div>
      )}

      {loading ? (
        <div className="text-center py-16 text-[13px] text-ink-tertiary">불러오는 중...</div>
      ) : (
        <div className="flex flex-col gap-3 animate-fade-up anim-delay-100">
          {PROVIDERS.map(p => {
            const isConnected = connectedProviders.has(p.key);
            const isLoading = actionLoading === p.key;
            return (
              <div key={p.key}
                className={`bg-white border rounded-[16px] p-5 transition-all ${isConnected ? p.activeColor : p.color}`}>
                <div className="flex items-center gap-4">
                  <div className="flex-none w-12 h-12 rounded-[14px] bg-surface-muted flex items-center justify-center">
                    {p.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[15px] font-bold text-ink-primary">{p.label}</span>
                      {isConnected && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${p.badgeColor}`}>연결됨</span>
                      )}
                    </div>
                    <p className="text-[12px] text-ink-secondary">
                      {isConnected ? '예약 일정이 자동으로 등록됩니다' : '연동하면 예약 일정을 자동으로 등록해요'}
                    </p>
                  </div>
                  {isConnected ? (
                    <button
                      onClick={() => handleDisconnect(p.key)}
                      disabled={isLoading}
                      className="flex-none text-[12px] font-semibold text-ink-tertiary hover:text-red-600 px-3 py-2 rounded-[9px] hover:bg-red-50 transition-all disabled:opacity-50">
                      {isLoading ? '처리 중...' : '해제'}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleConnect(p.key)}
                      disabled={isLoading}
                      className="flex-none text-[12px] font-semibold text-brand-blue bg-brand-blue-light hover:bg-blue-100 px-3 py-2 rounded-[9px] transition-all disabled:opacity-50">
                      {isLoading ? '...' : '연동하기'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 안내 */}
      <div className="mt-6 p-4 rounded-[14px] border border-dashed border-line bg-white animate-fade-up anim-delay-200">
        <div className="flex gap-3">
          <svg className="flex-none text-ink-tertiary mt-0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div>
            <p className="text-[13px] font-semibold text-ink-primary mb-1">캘린더 연동 안내</p>
            <p className="text-[12px] text-ink-secondary leading-relaxed">
              통화에서 예약 날짜·시간이 감지되면 연동된 캘린더에 자동으로 일정이 추가돼요.
              통화 상세 화면에서 수동으로 추가할 수도 있어요.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
