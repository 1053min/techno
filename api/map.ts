// Vercel Serverless Function - 네이버 지도 API 프록시
import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS 헤더 설정 (모든 origin 허용)
  const origin = req.headers.origin || '*';
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Accept, Accept-Version, Content-Length, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS 요청 처리 (CORS preflight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { action, query, coords, start, goal } = req.query;

  const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
  const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    return res.status(500).json({ error: 'NAVER credentials not configured' });
  }

  try {
    let apiUrl: string;

    // 1. Geocoding (주소 → 좌표)
    if (action === 'geocode') {
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'query parameter is required' });
      }
      apiUrl = `https://naveropenapi.apigw.ntruss.com/map-geocode/v2/geocode?query=${encodeURIComponent(query)}`;
    }

    // 2. Reverse Geocoding (좌표 → 주소)
    else if (action === 'reverse') {
      if (!coords || typeof coords !== 'string') {
        return res.status(400).json({ error: 'coords parameter is required (format: lng,lat)' });
      }
      const [lng, lat] = coords.split(',');
      apiUrl = `https://naveropenapi.apigw.ntruss.com/map-reversegeocode/v2/gc?coords=${lng},${lat}&output=json`;
    }

    // 3. Driving Directions (경로 탐색)
    else if (action === 'direction') {
      if (!start || typeof start !== 'string' || !goal || typeof goal !== 'string') {
        return res.status(400).json({ error: 'start and goal parameters are required (format: lng,lat)' });
      }
      apiUrl = `https://naveropenapi.apigw.ntruss.com/map-direction/v1/driving?start=${start}&goal=${goal}`;
    }

    else {
      return res.status(400).json({ error: 'Invalid action. Use: geocode, reverse, or direction' });
    }

    // 네이버 API 호출
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'X-NCP-APIGW-API-KEY-ID': NAVER_CLIENT_ID,
        'X-NCP-APIGW-API-KEY': NAVER_CLIENT_SECRET,
      },
    });

    if (!response.ok) {
      throw new Error(`Naver API Error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Naver API Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
