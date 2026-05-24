import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST만 허용' });

  try {
    const TMAP_API_KEY = process.env.TMAP_API_KEY;
    const body = req.body;

    // 💡 실패 좌표를 인도로 보정하기 위한 주변 장소(POI) 검색 API 분기
    if (body.action === 'poi') {
      const { centerLon, centerLat } = body;
      // 건물 안으로 경로가 튀는 현상(Spike)을 막기 위해 무조건 대로변에 위치한 버스정류장/지하철역을 타겟팅
      const poiUrl = `https://apis.openapi.sk.com/tmap/pois/search/around?version=1&format=json&categories=${encodeURIComponent('지하철역;버스정류장')}&resCoordType=WGS84GEO&reqCoordType=WGS84GEO&centerLon=${centerLon}&centerLat=${centerLat}&radius=1&count=1`;
      
      const poiResponse = await fetch(poiUrl, {
        method: 'GET',
        headers: { 'appKey': TMAP_API_KEY! },
      });
      
      const poiData = await poiResponse.json();
      return res.status(200).json(poiData);
    }

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

    const data = await response.json();

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