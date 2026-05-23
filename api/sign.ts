import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { itsId } = req.query;
  const SEOUL_API_KEY = process.env.SEOUL_API_KEY;

  if (!SEOUL_API_KEY) {
    return res.status(500).json({ error: 'SEOUL_API_KEY not configured' });
  }

  try {
    // 1. 규격에 맞춘 기본 URL (Fusion 제거한 버전)
    const baseUrl = 'https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingInformation/1.0';

    // 2. 파라미터 구성 (모두 소문자로 구성)
    // 규격대로 apiKey를 'apikey'로 설정
    let apiUrl = `${baseUrl}?apikey=${SEOUL_API_KEY}&type=json&pageNo=1&numOfRows=10`;
    
    if (itsId && typeof itsId === 'string') {
      apiUrl += `&itstId=${itsId}`;
    }

    // 3. API 호출
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    // 4. 에러 시 호출된 URL을 로그로 남겨 디버깅 지원
    if (!response.ok) {
      console.error('Failed API URL:', apiUrl);
      throw new Error(`Seoul API responded with status: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}