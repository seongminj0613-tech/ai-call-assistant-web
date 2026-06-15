'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { watchAuthState, logout } from '@/lib/firebase';
import { storeApi, keywordApi } from '@/lib/api';
import NavLayout from '../components/NavLayout';
import Link from 'next/link';

const INDUSTRY_PRESETS = [
  { label: '음식점', emoji: '🍽️', keywords: ['예약', '단체', '알레르기', '포장', '배달', '취소', '자리', '메뉴'] },
  { label: '부동산', emoji: '🏠', keywords: ['계약서', '잔금', '전세', '월세', '임대', '매물', '방문', '등기'] },
  { label: '미용실', emoji: '✂️', keywords: ['예약', '펌', '염색', '커트', '탈색', '두피', '취소', '변경'] },
  { label: '병원',  emoji: '🏥', keywords: ['예약', '진료', '처방', '재진', '검사', '취소', '접수', '수술'] },
  { label: '네일샵', emoji: '💅', keywords: ['예약', '젤네일', '아트', '제거', '취소', '연장', '변경'] },
  { label: '자동차정비', emoji: '🔧', keywords: ['입고', '정비', '엔진오일', '타이어', '점검', '부품', '견적'] },
];

const TABS = [
  { key: 'store',   label: '가게 정보', icon: '🏪' },
  { key: 'keyword', label: '키워드',   icon: '🏷️' },
  { key: 'filter',  label: '통화 필터', icon: '📋' },
  { key: 'account', label: '계정',     icon: '👤' },
];

export default function SettingsPage() {
  const router = useRouter();
  const [tab, setTab] = useState('store');
  const [stores, setStores] = useState([]);
  const [activeStoreId, setActiveStoreId] = useState(null);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [importantCats, setImportantCats] = useState(new Set(['예약', '취소', '불만', '문의']));
  const [storeName, setStoreName] = useState('');
  const [storeCategory, setStoreCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const unsub = watchAuthState(async (user) => {
      if (!user) { router.push('/login'); return; }
      await loadData();
    });
    return () => unsub();
  }, [router]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await storeApi.list();
      const list = res.data.stores || [];
      setStores(list);
      if (list.length > 0) {
        const s = list[0];
        setActiveStoreId(s.id);
        setStoreName(s.name || '');
        setStoreCategory(s.category || '');
        try {
          const kwRes = await keywordApi.list(s.id);
          setKeywords(kwRes.data?.keywords || []);
        } catch {}
      }
      const savedCats = localStorage.getItem('important_categories');
      if (savedCats) setImportantCats(new Set(JSON.parse(savedCats)));
    } catch (e) {
      setError('설정을 불러오지 못했습니다');
    } finally {
      setLoading(false);
    }
  };

  const showMsg = (msg, isError = false) => {
    if (isError) setError(msg);
    else setMessage(msg);
    setTimeout(() => { setMessage(''); setError(''); }, 2500);
  };

  const handleSaveStore = async () => {
    if (!storeName.trim()) { showMsg('가게 이름을 입력해주세요', true); return; }
    setSaving(true);
    try {
      // PATCH /stores/:id
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/stores/${activeStoreId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('firebase_id_token')}` },
        body: JSON.stringify({ name: storeName, category: storeCategory }),
      });
      showMsg('✅ 가게 정보가 저장됐어요');
    } catch { showMsg('저장에 실패했습니다', true); }
    finally { setSaving(false); }
  };

  const handleAddKeyword = async () => {
    if (!newKeyword.trim()) return;
    if (keywords.length >= 20) { showMsg('키워드는 최대 20개까지 가능해요', true); return; }
    if (!activeStoreId) return;
    try {
      const res = await keywordApi.create(activeStoreId, newKeyword.trim());
      setKeywords(prev => [...prev, res.data?.keyword || { id: Date.now(), keyword: newKeyword.trim() }]);
      setNewKeyword('');
      showMsg('✅ 키워드가 추가됐어요');
    } catch { showMsg('추가에 실패했습니다', true); }
  };

  const handleDeleteKeyword = async (kwId) => {
    if (!activeStoreId) return;
    try {
      await keywordApi.delete(activeStoreId, kwId);
      setKeywords(prev => prev.filter(k => k.id !== kwId));
    } catch { showMsg('삭제에 실패했습니다', true); }
  };

  const handlePreset = (preset) => {
    if (keywords.length + preset.keywords.length > 20) {
      showMsg(`최대 20개까지만 추가 가능해요 (현재 ${keywords.length}개)`, true); return;
    }
    setKeywords(prev => {
      const existing = new Set(prev.map(k => k.keyword));
      const toAdd = preset.keywords.filter(kw => !existing.has(kw));
      return [...prev, ...toAdd.map((kw, i) => ({ id: `preset-${Date.now()}-${i}`, keyword: kw }))];
    });
    showMsg(`✅ ${preset.label} 키워드 ${preset.keywords.length}개 추가됐어요`);
  };

  const toggleCat = (cat) => {
    const next = new Set(importantCats);
    if (next.has(cat)) next.delete(cat);
    else next.add(cat);
    setImportantCats(next);
    localStorage.setItem('important_categories', JSON.stringify([...next]));
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  return (
    <NavLayout>
      <div className="mb-5 animate-fade-up">
        <h1 className="text-[22px] font-bold text-ink-primary tracking-tight mb-0.5">설정</h1>
        <p className="text-[13px] text-ink-secondary">가게 정보와 분석 설정을 관리해요</p>
      </div>

      {message && <div className="mb-4 px-3.5 py-3 bg-green-50 border border-green-200 rounded-[10px] text-[13px] text-green-800">{message}</div>}
      {error && <div className="mb-4 px-3.5 py-3 bg-red-50 border border-red-200 rounded-[10px] text-[13px] text-red-800">{error}</div>}

      {/* 탭 */}
      <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 animate-fade-up anim-delay-100">
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-none inline-flex items-center gap-1.5 px-3.5 py-2 rounded-[10px] text-[13px] font-semibold transition-all whitespace-nowrap ${
              tab === t.key ? 'bg-brand-blue text-white' : 'bg-white border border-line text-ink-secondary hover:border-brand-blue/40'
            }`}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-[13px] text-ink-tertiary">불러오는 중...</div>
      ) : (
        <div className="animate-fade-up anim-delay-200">

          {/* 가게 정보 탭 */}
          {tab === 'store' && (
            <div className="bg-white border border-line rounded-[16px] p-5">
              <h2 className="text-[15px] font-bold text-ink-primary mb-4">가게 정보</h2>
              {stores.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-[13px] text-ink-secondary mb-3">아직 등록된 가게가 없어요</p>
                  <Link href="/stores/new" className="text-[13px] font-semibold text-brand-blue hover:underline">가게 등록하기 →</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">가게 이름</label>
                    <input type="text" value={storeName} onChange={e => setStoreName(e.target.value)}
                      placeholder="가게 이름을 입력하세요"
                      className="w-full px-4 py-3 text-[14px] border border-line rounded-[12px] outline-none focus:border-brand-blue transition-colors" />
                  </div>
                  <div>
                    <label className="block text-[12px] font-semibold text-ink-secondary mb-1.5">업종</label>
                    <input type="text" value={storeCategory} onChange={e => setStoreCategory(e.target.value)}
                      placeholder="예: 음식점, 미용실..."
                      className="w-full px-4 py-3 text-[14px] border border-line rounded-[12px] outline-none focus:border-brand-blue transition-colors" />
                  </div>
                  <button onClick={handleSaveStore} disabled={saving}
                    className="w-full py-3 text-[14px] font-semibold text-white bg-brand-blue hover:bg-brand-blue-hover rounded-[12px] transition-all disabled:opacity-50">
                    {saving ? '저장 중...' : '저장하기'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 키워드 탭 */}
          {tab === 'keyword' && (
            <div className="space-y-4">
              {/* 업종 프리셋 */}
              <div className="bg-white border border-line rounded-[16px] p-5">
                <h2 className="text-[15px] font-bold text-ink-primary mb-1">업종 프리셋</h2>
                <p className="text-[12px] text-ink-secondary mb-4">업종을 선택하면 관련 키워드가 자동으로 추가돼요</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INDUSTRY_PRESETS.map(p => (
                    <button key={p.label} onClick={() => handlePreset(p)}
                      className="flex items-center gap-2 px-3 py-2.5 bg-surface-muted hover:bg-brand-blue-light rounded-[12px] transition-all text-left">
                      <span className="text-lg">{p.emoji}</span>
                      <span className="text-[13px] font-semibold text-ink-primary">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 키워드 목록 */}
              <div className="bg-white border border-line rounded-[16px] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-[15px] font-bold text-ink-primary">내 키워드</h2>
                  <span className="text-[12px] text-ink-tertiary">{keywords.length}/20</span>
                </div>
                <div className="flex gap-2 mb-4">
                  <input type="text" value={newKeyword} onChange={e => setNewKeyword(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddKeyword()}
                    placeholder="키워드 입력 후 Enter"
                    className="flex-1 px-3.5 py-2.5 text-[13px] border border-line rounded-[10px] outline-none focus:border-brand-blue transition-colors" />
                  <button onClick={handleAddKeyword}
                    className="px-4 py-2.5 text-[13px] font-semibold text-white bg-brand-blue hover:bg-brand-blue-hover rounded-[10px] transition-all">
                    추가
                  </button>
                </div>
                {keywords.length === 0 ? (
                  <div className="text-center py-6 text-[12px] text-ink-tertiary">아직 키워드가 없어요</div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {keywords.map(kw => (
                      <span key={kw.id} className="inline-flex items-center gap-1.5 bg-brand-blue-light text-brand-blue text-[12px] font-semibold px-3 py-1.5 rounded-full">
                        {kw.keyword}
                        <button onClick={() => handleDeleteKeyword(kw.id)}
                          className="hover:text-red-500 transition-colors">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                          </svg>
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 통화 필터 탭 */}
          {tab === 'filter' && (
            <div className="bg-white border border-line rounded-[16px] p-5">
              <h2 className="text-[15px] font-bold text-ink-primary mb-1">중요 통화 필터</h2>
              <p className="text-[12px] text-ink-secondary mb-4">홈에서 중요 통화로 표시할 카테고리를 선택하세요</p>
              <div className="space-y-2">
                {['예약', '취소', '불만', '문의', '주문', '기타'].map(cat => (
                  <label key={cat}
                    className={`flex items-center justify-between p-3.5 rounded-[12px] border cursor-pointer transition-all ${
                      importantCats.has(cat) ? 'border-brand-blue bg-brand-blue-light' : 'border-line hover:border-brand-blue/40'
                    }`}>
                    <span className="text-[14px] font-medium text-ink-primary">{cat}</span>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      importantCats.has(cat) ? 'border-brand-blue bg-brand-blue' : 'border-line'
                    }`} onClick={() => toggleCat(cat)}>
                      {importantCats.has(cat) && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"/>
                        </svg>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 계정 탭 */}
          {tab === 'account' && (
            <div className="space-y-3">
              <div className="bg-white border border-line rounded-[16px] p-5">
                <h2 className="text-[15px] font-bold text-ink-primary mb-4">계정 정보</h2>
                <div className="space-y-3">
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink-secondary">로그인 방식</span>
                    <span className="font-semibold text-ink-primary">카카오</span>
                  </div>
                  <div className="flex justify-between text-[13px]">
                    <span className="text-ink-secondary">앱 버전</span>
                    <span className="font-semibold text-ink-primary">웹 v1.0</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-line rounded-[16px] p-5">
                <h2 className="text-[15px] font-bold text-ink-primary mb-4">연결된 앱</h2>
                <a href="https://drive.google.com/file/d/1jJNRF2CCVcCKSpdIPUODjWL6F5exxJ-T/view" target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3.5 bg-ink-primary rounded-[12px] text-white hover:opacity-90 transition-opacity">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/>
                  </svg>
                  <div>
                    <div className="text-[13px] font-semibold">안드로이드 앱 다운로드</div>
                    <div className="text-[11px] opacity-60">APK 직접 다운로드</div>
                  </div>
                </a>
              </div>
              <button onClick={handleLogout}
                className="w-full py-3.5 text-[14px] font-semibold text-red-600 bg-white border border-red-200 hover:bg-red-50 rounded-[14px] transition-all">
                로그아웃
              </button>
            </div>
          )}
        </div>
      )}
    </NavLayout>
  );
}
