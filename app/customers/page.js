'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import PageShell from '@/app/components/PageShell';
import { callApi, notesApi } from '@/lib/api';

function parseInfo(call) {
  let info = call?.extracted_info;
  if (typeof info === 'string') { try { info = JSON.parse(info); } catch { info = {}; } }
  return info && typeof info === 'object' ? info : {};
}
function mostFrequent(arr) {
  const m = {}; let best = null, bestN = 0;
  for (const x of arr) { m[x] = (m[x] || 0) + 1; if (m[x] > bestN) { bestN = m[x]; best = x; } }
  return best;
}
function fmtDot(s) {
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}
function callShortDesc(c) {
  const info = parseInfo(c);
  return info.special_notes || c.summary || c.category || '통화 분석';
}

function grade(count) { if (count >= 5) return 'vip'; if (count >= 2) return 'regular'; return 'new'; }
const GRADE_LABEL = { vip: 'VIP', regular: '단골', new: '신규' };
const GRADE_BADGE = { vip: 'bg-[#fef3c7] text-[#b45309]', regular: 'bg-[#dbeafe] text-[#1c6bd4]', new: 'bg-[#f1f2f6] text-[#7e7e7e]' };
const CAT_BADGE = { '예약': 'bg-[#edf4ff] text-[#1c6bd4]', '문의': 'bg-[#e5f7f0] text-[#0d8061]', '취소': 'bg-[#fdecec] text-[#d94038]', '불만': 'bg-[#fdecec] text-[#d94038]' };
function catCls(c) { return CAT_BADGE[c] || 'bg-[#f1f2f6] text-[#343659]'; }

export default function CustomersPage() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [selectedPhone, setSelectedPhone] = useState(null);

  // 통화별 메모/사진 (callId -> {memo, photos, loading})
  const [notes, setNotes] = useState({});
  const [savingId, setSavingId] = useState(null);
  const [uploadingId, setUploadingId] = useState(null);
  const [zoomPhoto, setZoomPhoto] = useState(null);
  const photoInputRef = useRef(null);
  const uploadTargetRef = useRef(null);

  useEffect(() => {
    (async () => {
      setLoading(true); setError('');
      try {
        const res = await callApi.list({ limit: 200 });
        setCalls(res.data?.calls || []);
      } catch (err) {
        console.error(err);
        setError(err.response?.data?.error || err.response?.data?.message || err.message || '데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const customers = useMemo(() => {
    const groups = {};
    for (const c of calls) { if (!c.caller_number) continue; (groups[c.caller_number] ||= []).push(c); }
    return Object.entries(groups).map(([phone, list]) => {
      const sorted = [...list].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      const name = list.map((c) => parseInfo(c).customer_name).find((n) => n && String(n).trim());
      return { phone, name: name || null, calls: sorted, count: list.length, grade: grade(list.length) };
    }).sort((a, b) => b.count - a.count);
  }, [calls]);

  const gradeCounts = useMemo(() => {
    const g = { all: customers.length, vip: 0, regular: 0, new: 0 };
    customers.forEach((c) => { g[c.grade] += 1; });
    return g;
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return customers
      .filter((c) => filter === 'all' || c.grade === filter)
      .filter((c) => !q || [c.name, c.phone].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [customers, filter, query]);

  useEffect(() => {
    if (!filteredCustomers.length) { setSelectedPhone(null); return; }
    if (!filteredCustomers.some((c) => c.phone === selectedPhone)) setSelectedPhone(filteredCustomers[0].phone);
  }, [filteredCustomers, selectedPhone]);

  const customer = customers.find((c) => c.phone === selectedPhone) || null;

  // 고객 선택 시 그 고객 모든 통화의 메모/사진 일괄 로드
  useEffect(() => {
    if (!customer) { setNotes({}); return; }
    let alive = true;
    const ids = customer.calls.map((c) => c.id);
    setNotes((prev) => {
      const n = { ...prev };
      ids.forEach((id) => { if (!n[id]) n[id] = { memo: '', photos: [], loading: true }; });
      return n;
    });
    (async () => {
      await Promise.all(ids.map(async (id) => {
        try {
          const res = await notesApi.getNote(id);
          if (!alive) return;
          setNotes((prev) => ({ ...prev, [id]: { memo: res.data?.memo || '', photos: res.data?.photos || [], loading: false } }));
        } catch (err) {
          if (!alive) return;
          setNotes((prev) => ({ ...prev, [id]: { memo: '', photos: [], loading: false } }));
        }
      }));
    })();
    return () => { alive = false; };
  }, [selectedPhone]); // eslint-disable-line

  const aiSummary = useMemo(() => {
    if (!customer) return '';
    const nm = customer.name || customer.phone;
    const top = mostFrequent(customer.calls.map((c) => c.category).filter(Boolean));
    const res = customer.calls.filter((c) => c.category === '예약').length;
    const parts = [`${nm} 고객은 총 ${customer.count}건의 통화 기록이 있습니다.`];
    if (top) parts.push(`주로 '${top}' 관련 내용이 많았어요.`);
    if (res) parts.push(`예약 통화가 ${res}건 있었습니다.`);
    return parts.join(' ');
  }, [customer]);

  function setMemoFor(callId, val) {
    setNotes((prev) => ({ ...prev, [callId]: { ...(prev[callId] || { memo: '', photos: [] }), memo: val } }));
  }

  async function handleSaveMemo(callId) {
    setSavingId(callId);
    try {
      await notesApi.updateNote(callId, notes[callId]?.memo || '');
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || '메모 저장 실패');
    } finally {
      setSavingId(null);
    }
  }

  function triggerPhotoUpload(callId) {
    uploadTargetRef.current = callId;
    photoInputRef.current?.click();
  }

  async function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    const callId = uploadTargetRef.current;
    if (!file || !callId) return;
    if (!file.type.startsWith('image/')) { alert('이미지 파일만 업로드할 수 있어요.'); return; }
    setUploadingId(callId);
    try {
      const up = await notesApi.requestPhotoUpload(callId, file.name);
      const { photo_id, upload_url, s3_key, upload_headers } = up.data;
      await notesApi.uploadPhotoToS3(upload_url, file, upload_headers);
      await notesApi.savePhoto(callId, { photoId: photo_id, s3Key: s3_key });
      const res = await notesApi.getNote(callId);
      setNotes((prev) => ({ ...prev, [callId]: { ...(prev[callId] || { memo: '' }), photos: res.data?.photos || [], loading: false } }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || '사진 업로드 실패');
    } finally {
      setUploadingId(null);
    }
  }

  async function handleDeletePhoto(callId, photoId) {
    if (!confirm('이 사진을 삭제할까요?')) return;
    try {
      await notesApi.deletePhoto(callId, photoId);
      setNotes((prev) => ({ ...prev, [callId]: { ...prev[callId], photos: (prev[callId]?.photos || []).filter((p) => p.id !== photoId) } }));
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || err.message || '사진 삭제 실패');
    }
  }

  return (
    <PageShell title="고객관리" active="customers">
      <input ref={photoInputRef} type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />

      <div className="px-[24px] pt-[24px]">
        <p className="text-[13px] text-[#99a1b0]">고객별 통화 히스토리와 메모를 한 곳에서 관리하세요.</p>
      </div>

      <div className="px-[24px] pt-[16px] pb-[24px] flex gap-[24px] items-start">
        {/* 왼쪽: 고객 리스트 */}
        <div className="w-[236px] flex-none flex flex-col gap-[12px]">
          <div className="relative w-full">
            <span className="absolute left-[12px] top-1/2 -translate-y-1/2 text-[#99a1b0]">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.3-4.3" /></svg>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 · 번호 검색"
              className="w-full h-[40px] bg-white border border-[#d6d9e5] rounded-[12px] pl-[34px] pr-[12px] text-[12px] text-[#343659] placeholder:text-[#99a1b0] outline-none focus:border-[#1c6bd4]"
            />
          </div>

          <div className="flex flex-col gap-[8px] max-h-[550px] overflow-y-auto no-scrollbar">
            {loading ? (
              <div className="py-8 text-center text-[12px] text-[#99a1b0]">불러오는 중...</div>
            ) : error ? (
              <div className="py-8 text-center text-[12px] text-red-500">{error}</div>
            ) : filteredCustomers.length === 0 ? (
              <div className="py-8 text-center text-[12px] text-[#99a1b0]">고객이 없어요.</div>
            ) : (
              filteredCustomers.map((c) => {
                const sel = c.phone === selectedPhone;
                const showPhone = c.name && c.name !== c.phone;
                return (
                  <button
                    key={c.phone}
                    onClick={() => setSelectedPhone(c.phone)}
                    className={`w-full text-left rounded-[12px] p-[12px] border transition-colors ${
                      sel ? 'border-[1.4px] border-[#343659] bg-[#f9f9fc]' : 'border border-[#dfe2e8] bg-white hover:bg-[#fafbfd]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-[6px]">
                      <span className="text-[13px] font-bold text-[#343659] truncate">{c.name || c.phone}</span>
                      <span className="text-[11px] text-[#99a1b0] flex-none">{c.count}통화</span>
                    </div>
                    {showPhone && <div className="mt-[4px] text-[11px] text-[#99a1b0] truncate">{c.phone}</div>}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 오른쪽: 상세 (이 영역만 스크롤) */}
        <div className="flex-1 min-w-0 flex flex-col gap-[20px] max-h-[calc(96vh-90px)] overflow-y-auto no-scrollbar">
          {!customer ? (
            <div className="py-16 text-center text-[12px] text-[#99a1b0]">고객을 선택하세요.</div>
          ) : (
            <>
              {/* 고객 상세 헤더 */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between pb-[8px] border-b border-[#343659]">
                  <span className="text-[20px] font-bold text-[#343659]">고객 상세</span>
                  <span className="text-[11px] text-[#99a1b0]">{customer.count}통화</span>
                </div>
                <div className="mt-[12px] flex items-baseline gap-[10px] flex-wrap">
                  <span className="text-[15px] font-bold text-[#343659]">{customer.name || customer.phone}</span>
                  {customer.name && customer.name !== customer.phone && (
                    <span className="text-[13px] text-[#99a1b0]">{customer.phone}</span>
                  )}
                </div>
              </div>

              {/* AI 종합요약 */}
              <div className="bg-[#f1f2f6] rounded-[16px] p-[16px]">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-bold text-[#343659]">✦ AI 종합요약</span>
                  <span className="text-[10px] text-[#99a1b0]">통화 기록 기반</span>
                </div>
                <p className="mt-[10px] text-[12px] leading-[1.6] text-[#343659]">{aiSummary}</p>
              </div>

              {/* 날짜별 통화 히스토리 (각 항목 밑에 메모/사진 항상 표시) */}
              <div className="flex flex-col">
                <div className="flex items-center justify-between pb-[8px] border-b border-[#343659]">
                  <span className="text-[14px] font-bold text-[#343659]">날짜별 통화 히스토리</span>
                  <span className="text-[11px] text-[#99a1b0]">{customer.calls.length}건</span>
                </div>

                <div className="mt-[12px] flex flex-col gap-[14px]">
                  {customer.calls.map((c) => {
                    const info = parseInfo(c);
                    const infoRows = [['분류', c.category], ['방문일정', [info.date, info.time].filter(Boolean).join(' ')]].filter(([, v]) => v);
                    const note = notes[c.id] || { memo: '', photos: [], loading: true };
                    return (
                      <div key={c.id} className="rounded-[12px] border border-[#eceef3] bg-white p-[14px] flex flex-col gap-[12px]">
                        {/* 통화 헤더 + 전체 요약 */}
                        <div className="flex flex-col gap-[8px]">
                          <div className="flex items-center justify-between gap-[8px]">
                            <div className="flex items-center gap-[6px] min-w-0">
                              <span className={`flex-none px-[8px] py-[2px] rounded-full text-[10px] font-semibold ${catCls(c.category)}`}>{c.category || '통화'}</span>
                              <span className="text-[12px] font-bold text-[#343659] truncate">{callShortDesc(c)}</span>
                            </div>
                            <div className="flex items-center gap-[8px] flex-none">
                              <span className="text-[10px] text-[#99a1b0]">{fmtDot(c.created_at)}</span>
                              <Link href={`/calls/${c.id}`} className="text-[10px] text-[#99a1b0] hover:text-[#1c6bd4]">상세 →</Link>
                            </div>
                          </div>
                          <div className="rounded-[10px] bg-[#f7f8fb] p-[12px] flex flex-col gap-[8px]">
                            <span className="text-[11px] font-bold text-[#343659]">✦ 통화 요약</span>
                            <p className="text-[12px] leading-[1.6] text-[#343659] whitespace-pre-wrap">{c.summary || '요약이 아직 없어요.'}</p>
                            {infoRows.length > 0 && (
                              <div className="flex flex-col gap-[4px] pt-[8px] border-t border-[#eceef3]">
                                {infoRows.map(([k, v]) => (
                                  <div key={k} className="flex gap-[10px] text-[11px]"><span className="w-[56px] flex-none text-[#99a1b0]">{k}</span><span className="text-[#343659] font-medium break-all">{v}</span></div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* 메모 (항상 표시/수정) */}
                        <div className="flex flex-col gap-[8px]">
                          <span className="text-[12px] font-bold text-[#343659]">메모</span>
                          <textarea
                            value={note.memo}
                            onChange={(e) => setMemoFor(c.id, e.target.value)}
                            placeholder={note.loading ? '불러오는 중...' : '이 통화에 대한 메모를 남겨보세요.'}
                            rows={2}
                            className="w-full rounded-[10px] border border-[#d6d9e5] p-[10px] text-[12px] text-[#343659] placeholder:text-[#99a1b0] outline-none focus:border-[#1c6bd4] resize-none bg-white"
                          />
                          <button
                            onClick={() => handleSaveMemo(c.id)}
                            disabled={savingId === c.id || note.loading}
                            className="self-end h-[32px] px-[16px] rounded-[10px] bg-[#343659] text-white text-[12px] font-bold hover:opacity-90 disabled:opacity-50"
                          >
                            {savingId === c.id ? '저장 중...' : '메모 저장'}
                          </button>
                        </div>

                        {/* 사진 (항상 표시) */}
                        <div className="flex flex-col gap-[8px]">
                          <div className="flex items-center justify-between">
                            <span className="text-[12px] font-bold text-[#343659]">사진 {note.photos.length > 0 && `(${note.photos.length})`}</span>
                            <button
                              onClick={() => triggerPhotoUpload(c.id)}
                              disabled={uploadingId === c.id}
                              className="h-[28px] px-[10px] rounded-[8px] bg-[#f1f2f6] border border-[#dfe2e8] text-[#343659] text-[11px] font-semibold hover:bg-[#e9ebf1] disabled:opacity-50"
                            >
                              {uploadingId === c.id ? '업로드 중...' : '+ 사진 추가'}
                            </button>
                          </div>
                          {note.photos.length === 0 ? (
                            <p className="text-[11px] text-[#99a1b0]">{note.loading ? '불러오는 중...' : '등록된 사진이 없어요.'}</p>
                          ) : (
                            <div className="grid grid-cols-5 gap-[8px]">
                              {note.photos.map((p) => (
                                <div key={p.id} className="relative group aspect-square rounded-[10px] overflow-hidden border border-[#eceef3]">
                                  <button onClick={() => setZoomPhoto(p.url)} className="w-full h-full block" title="크게 보기">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img src={p.url} alt="첨부 사진" className="w-full h-full object-cover cursor-zoom-in" />
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDeletePhoto(c.id, p.id); }}
                                    className="absolute top-[4px] right-[4px] w-[20px] h-[20px] rounded-full bg-black/55 text-white text-[12px] leading-none flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="삭제"
                                  >
                                    ×
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {zoomPhoto && (
        <div
          onClick={() => setZoomPhoto(null)}
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-6 cursor-zoom-out"
        >
          <button
            onClick={() => setZoomPhoto(null)}
            className="absolute top-[20px] right-[24px] w-[40px] h-[40px] rounded-full bg-white/15 text-white text-[22px] leading-none flex items-center justify-center hover:bg-white/25"
            title="닫기"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={zoomPhoto}
            alt="확대 사진"
            onClick={(e) => e.stopPropagation()}
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-[12px] cursor-default"
          />
        </div>
      )}
    </PageShell>
  );
}