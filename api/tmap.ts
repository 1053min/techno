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

    const tmapUrl = 'https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json';

    // 🚀 [해결 로직] 프론트엔드에서 보낸 원본 데이터를 복사합니다.
    const requestBody = { ...req.body };

    // 문자로 넘어왔을 수 있는 좌표를 숫자로 변환
    const startX = parseFloat(requestBody.startX);
    const startY = parseFloat(requestBody.startY);
    const endX = parseFloat(requestBody.endX);
    const endY = parseFloat(requestBody.endY);

    // 🚀 💡 핵심: 출발지와 도착지가 완벽히 같으면(순환 러닝 코스), 도착지에 약 5m 오차 부여
    if (startX === endX && startY === endY) {
      requestBody.endX = (endX + 0.00005).toString(); // TMAP 서버가 다르게 인식하도록 미세 조정
      console.log('순환 코스 감지됨: TMAP 400 에러 방지를 위해 도착지에 오차(+0.00005)를 부여했습니다.');
    }

    // 수정된 requestBody를 TMap 서버로 전달
    const response = await fetch(tmapUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'appKey': TMAP_API_KEY,
      },
      // 원본 req.body가 아니라, 방금 오차를 부여한 requestBody를 문자열로 바꿔서 보냄!
      body: JSON.stringify(requestBody), 
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