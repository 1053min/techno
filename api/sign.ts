// Vercel Serverless Function - 서울 교통 신호 API 프록시
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

  const { itsId } = req.query;

  const SEOUL_API_KEY = process.env.SEOUL_API_KEY;

  if (!SEOUL_API_KEY) {
    return res.status(500).json({ error: 'SEOUL_API_KEY not configured' });
  }

  try {
    // 서울 교통 신호 API 호출
    const params = new URLSearchParams({
      apiKey: SEOUL_API_KEY,
      type: 'json',
      pageNo: '1',
      numOfRows: '100', // Get more results when querying all
    });

    // Only add itstId if provided
    if (itsId && typeof itsId === 'string') {
      params.append('itstId', itsId);
    }

    const apiUrl = `https://t-data.seoul.go.kr/apig/apiman-gateway/tapi/v2xSignalPhaseTimingFusionInformation/1.0?${params.toString()}`;

    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Seoul API Error: ${response.status}`);
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error: any) {
    console.error('Seoul Traffic API Error:', error);
    return res.status(500).json({
      error: error.message,
      itsId: itsId
    });
  }
}
