'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { callApi } from '@/lib/api';
import AppLayout from '../../../components/AppLayout';

const DarkNavy = '#3D4D6B';
const AccentBlue = '#3B7DD8';
const White = '#FFFFFF';

export default function CallNotePage() {
  const router = useRouter();
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const [callId, setCallId] = useState(null);
  const [memo, setMemo] = useState('');
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // callId를 URL에서 추출
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const parts = window.location.pathname.replace(/\/$/, '').split('/');
    // /calls/[callId]/note
    const noteIdx = parts.indexOf('note');
    if (noteIdx > 0) {
      const id = parts[noteIdx - 1];
      if (id && id !== 'placeholder') {
        setCallId(id);
      }
    }
  }, []);

  // callId 확보되면 데이터 로드
  useEffect(() => {
    if (!callId) return;
    // localStorage 토큰 확인만 — watchAuthState 없이
    const token = localStorage.getItem('firebase_id_token');
    if (!token) {
      router.push('/login');
      return;
    }
    loadNote();
  }, [callId]);

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
    setSaving(true); setError('');
    try {
      const token = localStorage.getItem('firebase_id_token');
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/calls/${callId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ memo }),
      });
      setMessage('💾 메모가 저장됐어요');
      setTimeout(() => setMessage(''), 2500);
    } catch { setError('저장에 실패했습니다'); }
    finally { setSaving(false); }
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { setError('10MB 이하 사진만 가능해요'); return; }
    setUploading(true); setError('');
    try {
      const url = URL.createObjectURL(file);
      setPhotos(prev => [...prev, { id: Date.now().toString(), url, name: file.name }]);
      setMessage('📷 사진이 추가됐어요');
      setTimeout(() => setMessage(''), 2500);
    } catch { setError('사진 업로드에 실패했습니다'); }
    finally { setUploading(false); }
  };

  const handleDeletePhoto = (photoId) => {
    if (!confirm('사진을 삭제할까요?')) return;
    setPhotos(prev => prev.filter(p => p.id !== photoId));
  };

  return (
    <AppLayout title="통화 메모" rightAction={
      <Link href={callId ? `/calls/${callId}` : '/calls'} style={{ background:'rgba(255,255,255,0.15)', borderRadius:8, padding:'6px 10px', color:'white', fontSize:12, textDecoration:'none' }}>
        통화 상세로
      </Link>
    }>
      {message && <div style={{ marginBottom:14, padding:'12px 16px', background:'#E3FBED', borderRadius:10, fontSize:13, color:'#1A7A3C' }}>{message}</div>}
      {error && <div style={{ marginBottom:14, padding:'12px 16px', background:'#FBE3E3', borderRadius:10, fontSize:13, color:'#C23B3B' }}>{error}</div>}

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px 0', color:'#9AA5B5', fontSize:14 }}>불러오는 중...</div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {/* 메모 */}
          <div style={{ background:White, borderRadius:16, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <span style={{ fontSize:18 }}>✏️</span>
              <span style={{ fontWeight:700, fontSize:15, color:'#1F2A3D' }}>메모</span>
            </div>
            <textarea
              value={memo}
              onChange={e => setMemo(e.target.value)}
              placeholder="통화 관련 메모를 자유롭게 입력하세요..."
              rows={6}
              style={{ width:'100%', padding:'14px', background:'#F8F9FA', borderRadius:12, border:'1px solid #E8EBF0', fontSize:14, color:'#1F2A3D', resize:'none', outline:'none', lineHeight:1.6, boxSizing:'border-box', fontFamily:'inherit' }}
            />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:10 }}>
              <span style={{ fontSize:11, color:'#C8CDD5' }}>{memo.length}자</span>
              <button onClick={handleSaveMemo} disabled={saving} style={{
                padding:'10px 20px', background:DarkNavy, border:'none', borderRadius:10,
                color:White, fontWeight:600, fontSize:13, cursor:'pointer', opacity:saving?0.6:1,
              }}>
                {saving ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>

          {/* 사진 */}
          <div style={{ background:White, borderRadius:16, padding:20, boxShadow:'0 1px 4px rgba(0,0,0,0.06)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <span style={{ fontSize:18 }}>📷</span>
              <span style={{ fontWeight:700, fontSize:15, color:'#1F2A3D' }}>첨부 사진</span>
            </div>
            {photos.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8, marginBottom:14 }}>
                {photos.map(photo => (
                  <div key={photo.id} style={{ position:'relative', aspectRatio:'1', borderRadius:10, overflow:'hidden', border:'1px solid #E8EBF0' }}>
                    <img src={photo.photo_url || photo.url} alt="" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                    <button onClick={() => handleDeletePhoto(photo.id)} style={{
                      position:'absolute', top:4, right:4, width:22, height:22,
                      background:'rgba(0,0,0,0.5)', border:'none', borderRadius:'50%',
                      color:White, cursor:'pointer', fontSize:12, display:'flex', alignItems:'center', justifyContent:'center',
                    }}>✕</button>
                  </div>
                ))}
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" onChange={e => handlePhotoUpload(e.target.files?.[0])} style={{ display:'none' }} />
            <input ref={cameraInputRef} type="file" accept="image/*" capture="camera" onChange={e => handlePhotoUpload(e.target.files?.[0])} style={{ display:'none' }} />
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <button onClick={() => fileInputRef.current?.click()} disabled={uploading} style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'12px', border:'2px dashed #E8EBF0', borderRadius:12,
                background:'transparent', color:'#6B7889', fontSize:13, fontWeight:600, cursor:'pointer',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
                </svg>
                갤러리
              </button>
              <button onClick={() => cameraInputRef.current?.click()} disabled={uploading} style={{
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                padding:'12px', border:'2px dashed #E8EBF0', borderRadius:12,
                background:'transparent', color:'#6B7889', fontSize:13, fontWeight:600, cursor:'pointer',
              }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/>
                </svg>
                카메라
              </button>
            </div>
            {uploading && <div style={{ marginTop:8, textAlign:'center', fontSize:12, color:'#9AA5B5' }}>업로드 중...</div>}
          </div>
        </div>
      )}
    </AppLayout>
  );
}
