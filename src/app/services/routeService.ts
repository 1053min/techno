import { generateComfortRoute } from './advancedRouteService';

const VERCEL_TMAP_API = '/api/tmap';

export const COORD_PRESETS = {
  HANYANG: { lat: 37.5555, lng: 127.0436 },
  HANRIVER_YEOUIDO: { lat: 37.5276, lng: 126.9328 },
  GANGNAM: { lat: 37.4979, lng: 127.0276 },
  JAMSIL: { lat: 37.5148, lng: 127.1012 }
};

// 💡 허공(강/산)에 찍힌 좌표를 가장 가까운 실제 가게(인도) 위치로 보정하는 헬퍼 함수
async function getSafePoiCoordinate(lat: number, lng: number) {
  try {
    const response = await fetch(VERCEL_TMAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'poi', centerLat: lat, centerLon: lng })
    });
    const data = await response.json();
    if (data.searchPoiInfo && data.searchPoiInfo.pois && data.searchPoiInfo.pois.poi.length > 0) {
      const poi = data.searchPoiInfo.pois.poi[0];
      return { lat: parseFloat(poi.noorLat), lng: parseFloat(poi.noorLon) };
    }
  } catch (e) {
    console.error("POI 보정 실패", e);
  }
  return { lat, lng }; // 실패 시 원래 좌표 그대로 반환
}

// 💡 삐죽 튀어나온 경로(Spike)나 불필요한 백트래킹을 제거하는 후처리 필터
function removeSpikes(path: Array<[number, number]>) {
  const smoothed: Array<[number, number]> = [];
  for (let i = 0; i < path.length; i++) {
    if (smoothed.length > 0 && i < path.length - 1) {
      const prev = smoothed[smoothed.length - 1];
      const next = path[i + 1];
      // 이전 점과 다음 점이 매우 가까운데 현재 점만 멀리 튀어나간 경우 (유클리디안 거리 약 30m 이내)
      const dist = Math.sqrt(Math.pow(prev[0] - next[0], 2) + Math.pow(prev[1] - next[1], 2));
      if (dist < 0.00008) {
        continue; // 튀어나온 현재 점을 스킵하여 매끄럽게 연결
      }
    }
    smoothed.push(path[i]);
  }
  return smoothed;
}

// 2. 자연스러운 다각형 순환 루프(Loop) 경로 생성 (다중 경유지 passList 활용)
export async function generateLoopRoute(start: { lat: number; lng: number }, distanceKm: number = 3) {
  // 다각형(자연스러운 원형/마름모) 루프를 만들기 위한 경유지 반경 설정
  // 1km는 약 0.009도. distanceKm가 총 둘레라면 중심에서 뻗어나가는 반경은 대략 distanceKm / 8
  const radiusLat = (distanceKm / 8) * 0.009; 
  const radiusLng = (distanceKm / 8) * 0.011; // 경도는 위도보다 약간 더 길게 보정
  
  // 시작점을 기준으로 3개의 경유지를 생성하여 다각형(자연스러운 루프) 구성
  // 출발지가 북쪽이라 가정하고 동 -> 남 -> 서 순으로 경유
  const p1 = { lat: start.lat - radiusLat, lng: start.lng + radiusLng }; // 동쪽 경유지
  const p2 = { lat: start.lat - (radiusLat * 2), lng: start.lng }; // 남쪽 경유지
  const p3 = { lat: start.lat - radiusLat, lng: start.lng - radiusLng }; // 서쪽 경유지
  
  // TMAP 다중 경유지(passList) 파라미터 규격: "경도,위도_경도,위도"
  const passList = `${p1.lng},${p1.lat}_${p2.lng},${p2.lat}_${p3.lng},${p3.lat}`;

  try {
    const response = await fetch(VERCEL_TMAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startX: start.lng.toString(),
        startY: start.lat.toString(),
        endX: start.lng.toString(), // api/tmap.ts 에서 출발/도착 오차를 자동으로 보정해 줌
        endY: start.lat.toString(),
        passList: passList,
        reqCoordType: "WGS84GEO",
        resCoordType: "WGS84GEO",
        startName: encodeURIComponent("출발"),
        endName: encodeURIComponent("도착"),
        searchOption: "30" // 30: 보행자 맞춤 최단거리
      })
    });

    const data = await response.json();
    
    if (!response.ok || !data.features) {
      throw new Error(data.message || "TMAP 경로 생성 실패");
    }
    
    const fullPath: Array<[number, number]> = [];
    data.features
      .filter((f: any) => f.geometry.type === 'LineString')
      .forEach((f: any) => fullPath.push(...f.geometry.coordinates));
    
    return { path: removeSpikes(fullPath), name: '추천 다각형 루프 코스' };
  } catch (error) {
    console.warn("1차 경로 탐색 실패! 유효하지 않은 좌표를 근처 가게(인도)로 보정하여 재시도합니다.", error);
    
    // 💡 실패 시 각 꼭짓점을 가장 가까운 '가게(인도)' 좌표로 보정
    const safeP1 = await getSafePoiCoordinate(p1.lat, p1.lng);
    const safeP2 = await getSafePoiCoordinate(p2.lat, p2.lng);
    const safeP3 = await getSafePoiCoordinate(p3.lat, p3.lng);
    
    const safePassList = `${safeP1.lng},${safeP1.lat}_${safeP2.lng},${safeP2.lat}_${safeP3.lng},${safeP3.lat}`;

    try {
      // 보정된 안전한 좌표로 2차 통신 시도
      const retryResponse = await fetch(VERCEL_TMAP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startX: start.lng.toString(),
          startY: start.lat.toString(),
          endX: start.lng.toString(), 
          endY: start.lat.toString(),
          passList: safePassList,
          reqCoordType: "WGS84GEO",
          resCoordType: "WGS84GEO",
          startName: encodeURIComponent("출발"),
          endName: encodeURIComponent("도착"),
          searchOption: "30"
        })
      });
      const retryData = await retryResponse.json();
      if (!retryResponse.ok || !retryData.features) throw new Error("재시도 실패");
      
      const retryFullPath: Array<[number, number]> = [];
      retryData.features.filter((f: any) => f.geometry.type === 'LineString').forEach((f: any) => retryFullPath.push(...f.geometry.coordinates));
      
      return { path: removeSpikes(retryFullPath), name: '추천 코스 (경로 보정됨)' };
    } catch (retryError) {
      return { 
        path: [[start.lng, start.lat], [p1.lng, p1.lat], [p2.lng, p2.lat], [p3.lng, p3.lat], [start.lng, start.lat]], 
        name: '임시 직선 코스' 
      };
    }
  }
}

// 💡 한강 다리를 건너는 커스텀 코스 생성 (반포대교 -> 강북 -> 동작대교 -> 강남)
async function generateHanRiverBridgeRoute() {
  const start = { lat: 37.5115, lng: 126.9975 }; // 반포 한강공원
  const p1 = { lat: 37.5250, lng: 126.9930 }; // 잠수교/반포대교 북단
  const p2 = { lat: 37.5180, lng: 126.9760 }; // 이촌 한강공원 (동작대교 북단 부근)
  const p3 = { lat: 37.5080, lng: 126.9840 }; // 동작대교 남단
  
  const passList = `${p1.lng},${p1.lat}_${p2.lng},${p2.lat}_${p3.lng},${p3.lat}`;

  try {
    const response = await fetch(VERCEL_TMAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startX: start.lng.toString(), startY: start.lat.toString(),
        endX: start.lng.toString(), endY: start.lat.toString(),
        passList: passList,
        reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
        startName: encodeURIComponent("출발"), endName: encodeURIComponent("도착"),
        searchOption: "30" 
      })
    });
    const data = await response.json();
    if (!response.ok || !data.features) throw new Error("TMAP 경로 생성 실패");
    
    const fullPath: Array<[number, number]> = [];
    data.features.filter((f: any) => f.geometry.type === 'LineString').forEach((f: any) => fullPath.push(...f.geometry.coordinates));
    
    return { path: fullPath, name: '한강 대교 크로스 런' };
  } catch (error) {
    return { path: [[start.lng, start.lat], [p1.lng, p1.lat], [p2.lng, p2.lat], [p3.lng, p3.lat], [start.lng, start.lat]], name: '임시 한강 대교 런' };
  }
}

// 💡 석촌호수(잠실) 동호~서호를 도는 커스텀 코스 생성
async function generateSeokchonLakeRoute() {
  const start = { lat: 37.5138, lng: 127.1030 }; // 석촌호수 중심부 북단
  const p1 = { lat: 37.5090, lng: 127.0988 }; // 서호 남단
  const p2 = { lat: 37.5075, lng: 127.1055 }; // 동호 남단
  const p3 = { lat: 37.5125, lng: 127.1085 }; // 동호 북단
  
  const passList = `${p1.lng},${p1.lat}_${p2.lng},${p2.lat}_${p3.lng},${p3.lat}`;

  try {
    const response = await fetch(VERCEL_TMAP_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startX: start.lng.toString(), startY: start.lat.toString(),
        endX: start.lng.toString(), endY: start.lat.toString(),
        passList: passList,
        reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
        startName: encodeURIComponent("출발"), endName: encodeURIComponent("도착"),
        searchOption: "30" 
      })
    });
    const data = await response.json();
    if (!response.ok || !data.features) throw new Error("TMAP 경로 생성 실패");
    
    const fullPath: Array<[number, number]> = [];
    data.features.filter((f: any) => f.geometry.type === 'LineString').forEach((f: any) => fullPath.push(...f.geometry.coordinates));
    
    return { path: fullPath, name: '잠실 석촌호수 순환 런' };
  } catch (error) {
    return { path: [[start.lng, start.lat], [p1.lng, p1.lat], [p2.lng, p2.lat], [p3.lng, p3.lat], [start.lng, start.lat]], name: '임시 석촌호수 런' };
  }
}

// 3. 프리셋 코스 분기 처리
export async function generatePresetRoute(concept: 'hanriver' | 'cherryblossom' | 'interval' | 'hanyang') {
  let routeData: any = null;

  if (concept === 'hanriver') {
    routeData = await generateHanRiverBridgeRoute();
  } else if (concept === 'interval') {
    routeData = await generateSeokchonLakeRoute();
  } else {
    let startLat = 0;
    let startLng = 0;
    let targetDist = 3;

    if (concept === 'hanyang') {
      startLat = COORD_PRESETS.HANYANG.lat;
      startLng = COORD_PRESETS.HANYANG.lng;
      targetDist = 3.5;
    } else if (concept === 'cherryblossom') {
      startLat = COORD_PRESETS.GANGNAM.lat;
      startLng = COORD_PRESETS.GANGNAM.lng;
      targetDist = 3.8;
    }

    const candidates = await generateComfortRoute(targetDist, startLat, startLng, 'ignore', 'ignore');
    routeData = candidates.length > 0 ? candidates[0] : null;

    if (!routeData) {
      routeData = await generateLoopRoute({ lat: startLat, lng: startLng }, targetDist);
    }
  }

  if (routeData) routeData.conceptType = concept;
  return routeData;
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