import axios from 'axios';

// 백엔드 API 기본 주소 (.env.local에서 자동으로 가져옴)
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// axios 인스턴스 - 모든 요청에 공통 설정 적용
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30초 타임아웃
  headers: {
    'Content-Type': 'application/json',
  },
});

// 모든 요청 전에 자동으로 Firebase ID Token을 헤더에 붙임
api.interceptors.request.use(async (config) => {
  if (typeof window !== 'undefined') {
    try {
      const { auth } = await import('./firebase');
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        const token = localStorage.getItem('firebase_id_token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      const token = localStorage.getItem('firebase_id_token');
      if (token) config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// 응답 에러 공통 처리
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // 토큰 만료(401) - 로그인 페이지로
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('firebase_id_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// ============ 1. 인증 API ============
export const authApi = {
  // 카카오 액세스 토큰 → Firebase Custom Token 발급
  kakaoLogin: (accessToken) =>
      api.post('/auth/kakao', { provider_access_token: accessToken }),
};

// ============ 2. 가게 API ============
export const storeApi = {
  // 내 가게 목록 조회
  list: () => api.get('/stores'),

  // 가게 생성
  create: (name, industry = 'food') =>
    api.post('/stores', { name, industry }),
};

// ============ 3. 통화 API ============
export const callApi = {
  // S3 업로드 Presigned URL 발급
  // mimeType은 Lambda가 ContentType으로 서명할 때 사용함 — PUT 헤더와 100% 일치해야 함
  requestUpload: ({ storeId, fileName, fileFormat = 'm4a', mimeType = 'audio/mp4', callerNumber = null, duration = null }) =>
    api.post('/calls/upload', {
      store_id: storeId,
      file_name: fileName,
      file_format: fileFormat,
      mime_type: mimeType,
      caller_number: callerNumber,
      duration: duration,
    }),

  // S3에 파일 직접 PUT 업로드 (presigned URL 사용)
  uploadToS3: (uploadUrl, file) =>
    axios.put(uploadUrl, file, {
      headers: { 'Content-Type': file.type || 'audio/mpeg' },
    }),

  // CLOVA STT 처리 시작
  startProcessing: (callId) => api.post(`/calls/${callId}/process`),

  // 통화 목록 조회
  list: ({ storeId = null, status = null, limit = 20, offset = 0 } = {}) =>
    api.get('/calls', {
      params: { store_id: storeId, status, limit, offset },
    }),

  // 통화 상세 조회
  get: (callId) => api.get(`/calls/${callId}`),

  // 분류 변경 (BUSINESS / PERSONAL / UNCLASSIFIED)
  updateCategory: (callId, callerCategory) =>
    api.patch(`/calls/${callId}`, { caller_category: callerCategory }),

  // 음성 재생용 presigned URL 발급
  getAudio: (callId) => api.get(`/calls/${callId}/audio`),

  // 통화 삭제
  delete: (callId) => api.delete(`/calls/${callId}`),
};

// ============ 4. 요약 API ============
export const summaryApi = {
  // 요약 조회 (조회 시 자동 읽음 처리)
  get: (callId) => api.get(`/summaries/${callId}`),
};

// ============ 5. 캘린더 API ============
export const calendarApi = {
  addCalendarEvent: (callId) => api.post(`/calls/${callId}/calendar-events`),
};

// ============ 유틸 함수 ============
export const getApiBase = () => API_BASE_URL;

export const getAuthHeaders = async () => {
  const headers = { 'Content-Type': 'application/json' };
  if (typeof window !== 'undefined') {
    try {
      const { auth } = await import('./firebase');
      const user = auth.currentUser;
      if (user) {
        const token = await user.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } else {
        const token = localStorage.getItem('firebase_id_token');
        if (token) headers['Authorization'] = `Bearer ${token}`;
      }
    } catch (e) {
      const token = localStorage.getItem('firebase_id_token');
      if (token) headers['Authorization'] = `Bearer ${token}`;
    }
  }
  return headers;
};

export default api;