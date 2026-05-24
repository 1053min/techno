import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  try {
    const TMAP_API_KEY = process.env.TMAP_API_KEY;
    const body = req.body;

    // [디버그] 프론트엔드에서 보낸 좌표 확인
    console.log('TMAP API 요청 바디:', JSON.stringify(body));

    // 출발지와 도착지 미세 오차 부여 (5미터)
    const startX = parseFloat(body.startX);
    const endX = parseFloat(body.endX);
    if (Math.abs(startX - endX) < 0.0001) {
      body.endX = (endX + 0.0001).toString();
    }

    const response = await fetch('https://apis.openapi.sk.com/tmap/routes/pedestrian?version=1&format=json', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Accept': 'application/json',
        'Accept-Encoding': 'identity', // 💡 압축을 사용하지 않도록 강제 (에러 방지)
        'appKey': TMAP_API_KEY! 
      },
      body: JSON.stringify(body),
    });

    // TMAP 에러 시 XML이나 HTML이 반환되어 파싱 에러(500)가 나는 것을 방지
    const responseText = await response.text();
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      data = { rawText: responseText };
    }

    // 💡 에러 발생 시 상세 내용을 프론트로 쏴주어 개발자 도구(F12)에서 바로 보이게 함
    if (!response.ok) {
      console.error('TMAP API 400 상세 에러:', data);
      return res.status(response.status).json({
        message: 'TMAP API 에러',
        details: data
      });
    }

    return res.status(200).json(data);

  } catch (error: any) {
    return res.status(500).json({ error: error.toString() });
  }
}