export function initKakao() {
  if (typeof window === 'undefined') return;
  if (!window.Kakao) return;
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
    console.log('✅ 카카오 SDK 초기화 완료');
  }
}

export function loginWithKakao() {
  if (!window.Kakao || !window.Kakao.isInitialized()) {
    throw new Error('카카오 SDK가 초기화되지 않았습니다.');
  }
  window.Kakao.Auth.authorize({
    redirectUri: `${window.location.origin}/oauth/kakao`,
    scope: 'profile_nickname',
    throughTalk: false,
  });
}