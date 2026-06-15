'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { callApi } from '@/lib/api';
import AppLayout from '../components/AppLayout';

function formatDate(s) {
  if (!s) return '-';
  const d = new Date(s);
  return d.toLocaleString('ko-KR', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatDuration(sec) {
  if (!sec) return '-';
  const m = Math.floor(sec / 60), s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
}

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

export default function PendingPage() {
  const router = useRouter();
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) { router.push('/login'); return; }
      await loadPending();
    });
    return () => unsub();
  }, [router]);

  const loadPending = async () => {
    setLoading(true);
    try {
      // pending 전용 엔드포인트가 없으면 uploaded 상태로 필터링
      const res = await callApi.list({ status: 'uploaded', limit: 100 });
      setCalls((res.data.calls || []).filter(c => c.status === 'uploaded'));
    } catch (e) {
      setError(e.response?.data?.message || '데이터를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (callId) => {
    setProcessing(p => ({ ...p, [callId]: 'approving' }));
    setError('');
    try {
      await callApi.startProcessing(callId);
      setCalls(prev => prev.filter(c => c.id !== callId));
      setSuccessMsg('✅ 분석이 시작됐어요');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (e) {
      setError(e.response?.data?.message || '승인에 실패했습니다');
    } finally {
      setProcessing(p => { const n = { ...p }; delete n[callId]; return n; });
    }
  };

  const handleReject = async (callId) => {
    if (!confirm('이 녹음 파일을 삭제할까요?')) return;
    setProcessing(p => ({ ...p, [callId]: 'rejecting' }));
    try {
      await callApi.delete(callId);
      setCalls(prev => prev.filter(c => c.id !== callId));
    } catch (e) {
      setError(e.response?.data?.message || '삭제에 실패했습니다');
    } finally {
      setProcessing(p => { const n = { ...p }; delete n[callId]; return n; });
    }
  };

  const handleApproveAll = async () => {
    if (!confirm(`${calls.length}건을 모두 분석 시작할까요?`)) return;
    for (const c of calls) await handleApprove(c.id);
  };

  return (
    <AppLayout>
      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div>
          <h1 className="text-[22px] font-bold text-ink-primary tracking-tight mb-0.5">업로드 승인</h1>
          <p className="text-[13px] text-ink-secondary">AI 분석 전 승인이 필요한 녹음 파일이에요</p>
        </div>
        {calls.length > 0 && (
          <button onClick={handleApproveAll}
            className="text-[13px] font-semibold text-white bg-brand-blue hover:bg-brand-blue-hover px-4 py-2 rounded-[10px] transition-all">
            전체 승인 ({calls.length})
          </button>
        )}
      </div>

      {error && <div className="mb-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">{error}</div>}
      {successMsg && <div className="mb-4 px-3.5 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-800">{successMsg}</div>}

      {loading ? (
        <div className="text-center py-16 text-[13px] text-ink-tertiary">불러오는 중...</div>
      ) : calls.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[16px] border border-dashed border-line">
          <div className="text-5xl mb-3">✅</div>
          <h3 className="text-[16px] font-bold text-ink-primary mb-1">모두 처리됐어요</h3>
          <p className="text-[13px] text-ink-secondary">승인 대기 중인 녹음 파일이 없어요</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 animate-fade-up anim-delay-100">
          {calls.map(call => (
            <div key={call.id} className="bg-white border border-line rounded-[14px] p-4">
              <div className="flex items-start gap-3">
                <div className="flex-none w-10 h-10 rounded-[11px] bg-amber-50 text-amber-600 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[14px] font-bold text-ink-primary tabular-nums truncate">
                      {call.caller_number || '발신번호 없음'}
                    </span>
                    <span className="text-[11px] text-ink-tertiary ml-2 flex-none">{formatDate(call.created_at)}</span>
                  </div>
                  <div className="flex gap-3 text-[11px] text-ink-tertiary">
                    <span>⏱ {formatDuration(call.duration)}</span>
                    {call.file_size && <span>📁 {formatSize(call.file_size)}</span>}
                    {call.file_name && <span className="truncate">🎵 {call.file_name}</span>}
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-line">
                <button onClick={() => handleReject(call.id)}
                  disabled={!!processing[call.id]}
                  className="flex-1 py-2.5 text-[13px] font-semibold text-ink-secondary border border-line rounded-[10px] hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all disabled:opacity-50">
                  {processing[call.id] === 'rejecting' ? '처리 중...' : '삭제'}
                </button>
                <button onClick={() => handleApprove(call.id)}
                  disabled={!!processing[call.id]}
                  className="flex-2 flex-grow py-2.5 text-[13px] font-semibold text-white bg-brand-blue hover:bg-brand-blue-hover rounded-[10px] transition-all disabled:opacity-50">
                  {processing[call.id] === 'approving' ? '처리 중...' : '분석 시작'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}
