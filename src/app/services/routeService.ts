const VERCEL_TMAP_API = '/api/tmap';

export const COORD_PRESETS = {
  HANYANG: { lat: 37.5555, lng: 127.0436 },
  HANRIVER_YEOUIDO: { lat: 37.5276, lng: 126.9328 },
  GANGNAM: { lat: 37.4979, lng: 127.0276 },
  JAMSIL: { lat: 37.5148, lng: 127.1012 }
};

// 1. 단일 구간 보행자 경로 호출 헬퍼 함수
async function getPedestrianSegment(start: { lat: number; lng: number }, end: { lat: number; lng: number }) {
  try {
    const response = await fetch(VERCEL_TMAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startX: start.lng, startY: start.lat,
        endX: end.lng, endY: end.lat,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startName: "출발",
        endName: "도착",
        searchOption: "30"
      })
    });
    const data = await response.json();
    if (!data.features) return [];
    
    const segmentPath: Array<[number, number]> = [];
    data.features
      .filter((f: any) => f.geometry.type === 'LineString')
      .forEach((f: any) => segmentPath.push(...f.geometry.coordinates));
    
    return segmentPath;
  } catch (e) {
    return [];
  }
}

// 2. 다각형 순환 루프(Loop) 경로 생성 (4구간 병렬 병합 방식 - 절대 제자리에 머물지 않음)
export async function generateLoopRoute(start: { lat: number; lng: number }, distanceKm: number = 3) {
  // 거리에 비례하여 큼직한 사각형의 4개 꼭짓점 생성 (약 0.009도가 1km)
  const offset = (distanceKm / 4) * 0.009; 
  
  const p1 = { lat: start.lat, lng: start.lng };
  const p2 = { lat: start.lat, lng: start.lng + offset };
  const p3 = { lat: start.lat + offset, lng: start.lng + offset };
  const p4 = { lat: start.lat + offset, lng: start.lng };

  try {
    // 🚨 4개의 구간을 각각 호출하여 TMAP이 경유지를 무시하는 문제 원천 차단
    const segments = await Promise.all([
      getPedestrianSegment(p1, p2),
      getPedestrianSegment(p2, p3),
      getPedestrianSegment(p3, p4),
      getPedestrianSegment(p4, p1)
    ]);

    const fullPath = [...segments[0], ...segments[1], ...segments[2], ...segments[3]];

    // 만약 TMAP 서버 통신이 실패하더라도 화면이 튕기지 않게 직선 사각형이라도 무조건 렌더링 보장
    if (fullPath.length === 0) {
      console.warn("TMAP 통신 지연으로 임의의 사각형 좌표를 반환합니다.");
      return { 
        path: [[p1.lng, p1.lat], [p2.lng, p2.lat], [p3.lng, p3.lat], [p4.lng, p4.lat], [p1.lng, p1.lat]], 
        name: '순환형 루프 코스' 
      };
    }

    return { path: fullPath, name: '순환형 루프 코스' };
  } catch (error) {
    console.error("루프 경로 생성 실패:", error);
    return null;
  }
}

// 3. 프리셋 코스 분기 처리
export async function generatePresetRoute(concept: 'hanriver' | 'cherryblossom' | 'interval' | 'hanyang') {
  if (concept === 'hanriver') {
    return await generateLoopRoute(COORD_PRESETS.HANRIVER_YEOUIDO, 4); // 한강은 4km 큰 고리
  }
  const start = COORD_PRESETS[concept === 'hanyang' ? 'HANYANG' : 'GANGNAM'];
  return await generateLoopRoute(start, 3);
}

// 4. 실제 GPX 파일 매핑 및 파싱 (드로잉 경로 누락 완벽 해결)
export async function generateDrawingRoute(shape: 'dog' | 'sweetpotato') {
  const gpxFileName = shape === 'dog' ? 'dog_run.gpx' : 'sweetpotato_run.gpx';

  try {
    const response = await fetch(`/${encodeURIComponent(gpxFileName)}`);
    if (!response.ok) throw new Error(`GPX 파일을 찾을 수 없습니다: ${response.status}`);
    
    const gpxText = await response.text();
    const parser = new DOMParser();
    const gpxDoc = parser.parseFromString(gpxText, "text/xml");
    
    // 🚨 네임스페이스 호환성 문제 해결: 브라우저에 상관없이 trkpt 태그를 무조건 추출
    let trackPoints = gpxDoc.getElementsByTagNameNS("*", "trkpt");
    if (!trackPoints || trackPoints.length === 0) {
      trackPoints = gpxDoc.getElementsByTagName("trkpt");
    }
    
    const path: Array<[number, number]> = [];
    
    // 디테일 보존을 위해 촘촘하게(2칸 간격) 좌표 추출
    for (let i = 0; i < trackPoints.length; i += 2) {
      const lat = parseFloat(trackPoints[i].getAttribute("lat") || "0");
      const lon = parseFloat(trackPoints[i].getAttribute("lon") || "0");
      if (lat && lon) {
        path.push([lon, lat]); // TMAP 규격에 맞춰 [lng, lat] 배열로 삽입
      }
    }

    return { 
      path, 
      name: shape === 'dog' ? '경복궁 댕댕런 코스' : '여의도 고구마런 코스',
      conceptType: shape 
    };
  } catch (error) {
    console.error("GPX 파싱 실패:", error);
    return null;
  }
}