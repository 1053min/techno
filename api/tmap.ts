import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. CORS 헤더 설정
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader(
    'Access-Control-Allow-Headers', 
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version'
  );

  // 2. 💡 OPTIONS 요청 처리 (Preflight 요청을 200으로 즉시 종료하여 에러 방지)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed. POST 요청만 지원합니다.' });
  }

  try {
    // Vercel 환경 변수에서 TMAP API 키 가져오기
    const TMAP_API_KEY = process.env.TMAP_API_KEY;

    if (!TMAP_API_KEY) {
      console.error('TMAP_API_KEY가 환경 변수에 설정되지 않았습니다.');
      return res.status(500).json({ error: '서버에 API 키가 설정되지 않았습니다.' });
    }

    // TMap 보행자 경로 탐색 API 엔드포인트
    const tmapUrl = 'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json';

    // 프론트엔드에서 보낸 데이터(출발지, 목적지 등)를 그대로 TMap 서버로 전달
    const response = await fetch(tmapUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'appKey': TMAP_API_KEY, // 서버에 숨겨진 API 키 사용
      },
      body: JSON.stringify(req.body),
    });

    const data = await response.json();

    // TMap API에서 에러를 반환한 경우
    if (!response.ok) {
      console.error('TMap API Error:', data);
      return res.status(response.status).json(data);
    }

    // 성공적으로 경로 데이터를 받아온 경우 프론트엔드로 전달
    return res.status(200).json(data);

  } catch (error) {
    console.error('TMap Proxy Error:', error);
    return res.status(500).json({ error: '서버 내부 통신 에러가 발생했습니다.' });
  }
}