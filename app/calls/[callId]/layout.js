export async function generateStaticParams() {
  // 정적 빌드 시 placeholder 하나만 생성
  // 실제 callId는 클라이언트에서 useParams()로 받음
  return [{ callId: 'placeholder' }];
}

export const dynamicParams = true;

export default function Layout({ children }) {
  return children;
}