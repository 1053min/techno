import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정은 유지 (중략)
  
  const { itsId } = req.query;
  const SEOUL_API_KEY = process.env.SEOUL_API_KEY;

  if (!SEOUL_API_KEY) {
    return res.status(500).json({ error: 'SEOUL_API_KEY not configured' });
  }

  try {
    // 1. API 주소 및 쿼리 파라미터 강제 고정
    // 서울시 API는 보통 apikey를 쿼리 맨 앞에 두는 것을 선호합니다.
    const baseUrl = 'https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingInformation/1.0';

  // 2. 파라미터명 확인 (공공데이터 포털은 보통 apiKey 또는 serviceKey를 사용합니다)
// 일단 serviceKey로 시도해 보시고, 안 되면 apikey로 변경하세요.
    let apiUrl = `${baseUrl}?serviceKey=${SEOUL_API_KEY}&type=json&pageNo=1&numOfRows=100`;

    if (itsId && typeof itsId === 'string') {
      apiUrl += `&itstId=${itsId}`;
    }

    // 3. 호출
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      // 404가 뜨는 경우, apiUrl을 찍어보는 것이 중요합니다.
      console.error('Failed URL:', apiUrl); 
      throw new Error(`Seoul API returned status: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}