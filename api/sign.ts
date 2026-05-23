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
    let apiUrl = `https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingFusionInformation/1.0?apikey=${SEOUL_API_KEY}`;
    
    // 2. 추가 파라미터 직접 연결
    apiUrl += `&type=json&pageNo=1&numOfRows=100`;
    
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