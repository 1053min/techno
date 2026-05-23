import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 클라이언트에서 쿼리로 넘기던 itsId는 전체 조회를 위해 사용하지 않습니다.
  const SEOUL_API_KEY = process.env.SEOUL_API_KEY;

  if (!SEOUL_API_KEY) {
    return res.status(500).json({ error: 'SEOUL_API_KEY not configured' });
  }

  try {
    const baseUrl = 'http://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingInformation/1.0';

    // 💡 numOfRows를 1000으로 늘려 대량의 실시간 교차로 신호 데이터를 한 번에 요청합니다.
    const apiUrl = `${baseUrl}?apikey=${SEOUL_API_KEY}&type=json&pageNo=1&numOfRows=1000`;
    
    // API 호출
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    // 에러 시 호출된 URL을 로그로 남겨 디버깅 지원
    if (!response.ok) {
      console.error('Failed API URL:', apiUrl);
      throw new Error(`Seoul API responded with status: ${response.status}`);
    }

    const data = await response.json();

    // 💡 서울시 API 응답 구조 데이터 방어적 파싱 원칙 적용
    // 데이터가 body.items 안에 배열로 들어오는지 검증하고, 없을 경우 빈 배열을 내려주어 500 에러를 방어합니다.
    const items = data?.body?.items || (Array.isArray(data) ? data : []);

    return res.status(200).json(items);
  } catch (error: any) {
    console.error('API Sign Handler Error:', error);
    return res.status(500).json({ error: error.message });
  }
}