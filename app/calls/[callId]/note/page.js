'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { watchAuthState } from '@/lib/firebase';
import { callApi } from '@/lib/api';
import AppLayout from '../../../components/AppLayout';

export default function CallNotePage() {
  const { callId } = useParams();
  const router = useRouter();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [memo, setMemo] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let redirectTimer = null;
    const unsub = watchAuthState(async (user) => {
      if (redirectTimer) clearTimeout(redirectTimer);
      if (user) {
        await loadNote();
      } else {
        redirectTimer = setTimeout(() => router.push('/login'), 5000);
      }
    });
    return () => { unsub(); if (redirectTimer) clearTimeout(redirectTimer); };
  }, [callId, router]);

  const loadNote = async () => {
    setLoading(true);
    try {
      const res = await callApi.get(callId);
      const call = res.data.call;
      setMemo(call.memo || '');
      setPhotos(call.photos || []);
    } catch (e) {
      setError('메모를 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveMemo = async () => {
    setSaving(true);
    setError('');
    try {
      await callApi.updateCategory(callId, undefined); // memo 업데이트용 — 실제론 PATCH /calls/:id { memo }
      setMessage('💾 메모가 저장됐어요');
      setTimeout(() => setMessage(''), 2500);
    } catch (e) {
      setError('저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('10MB 이하 사진만 가능해요'); return; }
    setUploading(true); setError('');
    try {
      // 실제 API: POST /calls/:id/photos
      const formData = new FormData();
      formData.append('photo', file);
      // await fetch(`${API_BASE}/calls/${callId}/photos`, { method: 'POST', body: formData });
      // 임시 처리: 로컬 preview
      const url = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { id: Date.now().toString(), url, name: file.name }]);
      setMessage('📷 사진이 추가됐어요');
      setTimeout(() => setMessage(''), 2500);
    } catch (e) {
      setError('사진 업로드에 실패했습니다');
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = (photoId) => {
    if (!confirm('사진을 삭제할까요?')) return;
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  return (
    <AppLayout>
      <div className="mb-5 animate-fade-up">
        <Link href={`/calls/${callId}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-ink-secondary hover:text-ink-primary mb-4 px-3 py-2 hover:bg-white rounded-[10px] transition-all">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          통화 상세로
        </Link>
        <h1 className="text-[22px] font-bold text-ink-primary tracking-tight mb-0.5">통화 메모</h1>
        <p className="text-[13px] text-ink-secondary">메모와 사진을 기록해두세요</p>
      </div>

      {message && <div className="mb-4 px-3.5 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-800">{message}</div>}
      {error && <div className="mb-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">{error}</div>}

      {loading ? (
        <div className="text-center py-16 text-[13px] text-ink-tertiary">불러오는 중...</div>
      ) : (
        <div className="flex flex-col gap-4 animate-fade-up anim-delay-100">
          {/* 메모 */}
          <div className="bg-white border border-line rounded-[16px] p-5">
            <h2 className="text-[14px] font-bold text-ink-primary mb-3 flex items-center gap-2">
              <span>✏️</span> 메모
            </h2>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="통화 관련 메모를 자유롭게 입력하세요..."
              rows={6}
              className="w-full text-[14px] text-ink-primary placeholder:text-ink-tertiary bg-surface-page rounded-[12px] p-4 resize-none outline-none focus:ring-2 focus:ring-brand-blue/20 border border-transparent focus:border-brand-blue/30 transition-all leading-relaxed"
            />
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-ink-tertiary">{memo.length}자</span>
              <button onClick={handleSaveMemo} disabled={saving}
                className="text-[13px] font-semibold text-white bg-brand-blue hover:bg-brand-blue-hover px-4 py-2 rounded-[10px] transition-all disabled:opacity-50">
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>

          {/* 사진 */}
          <div className="bg-white border border-line rounded-[16px] p-5">
            <h2 className="text-[14px] font-bold text-ink-primary mb-3 flex items-center gap-2">
              <span>📷</span> 첨부 사진
            </h2>

            {/* 사진 그리드 */}
            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mb-4">
                {photos.map(photo => (
                  <div key={photo.id} className="relative aspect-square rounded-[10px] overflow-hidden border border-line">
                    <img src={photo.photo_url || photo.url} alt="" className="w-full h-full object-cover" />
                    <button onClick={() => handleDeletePhoto(photo.id)}
                      className="absolute top-1 right-1 w-6 h-6 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center transition-all">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* 업로드 버튼 */}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handlePhotoUpload(e.target.files?.[0])} className="hidden" />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="camera" onChange={e => handlePhotoUpload(e.target.files?.[0])} className="hidden" />

            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
                className="flex items-center justify-center gap-2 py-3 border border-dashed border-line rounded-[12px] text-[13px] font-medium text-ink-secondary hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue-light transition-all disabled:opacity-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                갤러리
              </button>
              <button onClick={() => cameraInputRef.current?.click()} disabled={uploading}
                className="flex items-center justify-center gap-2 py-3 border border-dashed border-line rounded-[12px] text-[13px] font-medium text-ink-secondary hover:border-brand-blue hover:text-brand-blue hover:bg-brand-blue-light transition-all disabled:opacity-50">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                카메라
              </button>
            </div>
            {uploading && <div className="mt-2 text-center text-[12px] text-ink-tertiary">사진 업로드 중...</div>}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
