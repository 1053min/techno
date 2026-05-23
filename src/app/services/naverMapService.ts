// 네이버 지도 API 서비스 - Vercel 백엔드 사용

// Vercel 배포 URL
const VERCEL_MAP_API = '/api/map';

/**
 * 주소 → 좌표 변환 (Geocoding)
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const response = await fetch(`${VERCEL_MAP_API}?action=geocode&query=${encodeURIComponent(address)}`);

    if (!response.ok) {
      throw new Error(`Geocoding Error: ${response.status}`);
    }

    const data = await response.json();

    // 네이버 Geocoding API 응답 파싱
    if (data.addresses && data.addresses.length > 0) {
      const result = data.addresses[0];
      return {
        lat: parseFloat(result.y),
        lng: parseFloat(result.x),
      };
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 좌표 → 주소 변환 (Reverse Geocoding)
 */
export async function reverseGeocode(lng: number, lat: number): Promise<string | null> {
  try {
    const response = await fetch(`${VERCEL_MAP_API}?action=reverse&coords=${lng},${lat}`);

    if (!response.ok) {
      throw new Error(`Reverse Geocoding Error: ${response.status}`);
    }

    const data = await response.json();

    // 네이버 Reverse Geocoding API 응답 파싱
    if (data.results && data.results.length > 0) {
      const result = data.results[0];
      if (result.region) {
        const { area1, area2, area3, area4 } = result.region;
        return `${area1.name} ${area2.name} ${area3.name} ${area4.name}`.trim();
      }
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 경로 탐색 (Driving Directions)
 */
export async function getDirections(
  start: { lng: number; lat: number },
  goal: { lng: number; lat: number }
): Promise<any | null> {
  try {
    const response = await fetch(
      `${VERCEL_MAP_API}?action=direction&start=${start.lng},${start.lat}&goal=${goal.lng},${goal.lat}`
    );

    if (!response.ok) {
      throw new Error(`Directions Error: ${response.status}`);
    }

    const data = await response.json();

    // 네이버 Directions API 응답 반환
    return data;
  } catch (error) {
    return null;
  }
}
