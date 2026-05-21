// 카카오 SDK 초기화 + 로그인 헬퍼 함수 (v1 SDK)

// 카카오 SDK가 로드됐는지 확인하고 초기화
export function initKakao() {
  if (typeof window === 'undefined') return; // 서버에서는 실행 X
  if (!window.Kakao) {
    console.error('카카오 SDK가 로드되지 않았습니다.');
    return;
  }
  if (!window.Kakao.isInitialized()) {
    window.Kakao.init(process.env.NEXT_PUBLIC_KAKAO_JS_KEY);
    console.log('✅ 카카오 SDK 초기화 완료');
  }
}

// 카카오 로그인 (v1 SDK 팝업 방식, Redirect URI 불필요)
export function loginWithKakao() {
  return new Promise((resolve, reject) => {
    if (!window.Kakao) {
      reject(new Error('카카오 SDK가 로드되지 않았습니다.'));
      return;
    }
    if (!window.Kakao.isInitialized()) {
      reject(new Error('카카오 SDK가 초기화되지 않았습니다.'));
      return;
    }

    // v1 SDK: Kakao.Auth.login() - 팝업 방식
    window.Kakao.Auth.login({
      scope: 'profile_nickname, account_email',
      throughTalk: false,
      success: (authObj) => {
        console.log('카카오 로그인 성공:', authObj);
        resolve(authObj.access_token);
      },
      fail: (err) => {
        console.error('카카오 로그인 실패:', err);
        reject(err);
      },
    });
  });
}