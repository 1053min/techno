/**
 * [베타] 고도화된 경로 탐색 및 GPS 아트 맵핑 서비스
 * 기존 routeService.ts에 영향을 주지 않고 새로운 알고리즘을 테스트하기 위한 파일입니다.
 */
import { INTERSECTION_LOCATIONS } from './intersectionData';

const VERCEL_TMAP_API = '/api/tmap';

// 좌표 간 거리 계산 (km)
function getDistKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// 1. 내 주변 맞춤 쾌적 경로 생성 알고리즘
export async function generateComfortRoute(distanceKm: number, currentLat: number, currentLng: number) {
  console.log(`[Algorithm 1] ${distanceKm}km 쾌적 경로 탐색 시작. 기준점: ${currentLat}, ${currentLng}`);
  
  // 대략적인 반경 (둘레가 distanceKm가 되기 위한 사각형 한 변의 길이)
  const sideKm = distanceKm / 4;
  const latOffset = sideKm * 0.009; // 1km ≒ 0.009 위도
  const lngOffset = sideKm * 0.011; // 1km ≒ 0.011 경도

  // 실패 확률을 줄이기 위해 6가지 방향으로 후보군 대폭 확대
  const candidates = [
    { id: 1, name: "북동쪽 도심 탐험 코스", p1: { lat: currentLat, lng: currentLng + lngOffset }, p2: { lat: currentLat + latOffset, lng: currentLng + lngOffset }, p3: { lat: currentLat + latOffset, lng: currentLng } },
    { id: 2, name: "북서쪽 외곽 순환 코스", p1: { lat: currentLat, lng: currentLng - lngOffset }, p2: { lat: currentLat + latOffset, lng: currentLng - lngOffset }, p3: { lat: currentLat + latOffset, lng: currentLng } },
    { id: 3, name: "남동쪽 주거지 코스", p1: { lat: currentLat, lng: currentLng + lngOffset }, p2: { lat: currentLat - latOffset, lng: currentLng + lngOffset }, p3: { lat: currentLat - latOffset, lng: currentLng } },
    { id: 4, name: "남서쪽 골목길 회피 코스", p1: { lat: currentLat, lng: currentLng - lngOffset }, p2: { lat: currentLat - latOffset, lng: currentLng - lngOffset }, p3: { lat: currentLat - latOffset, lng: currentLng } },
    { id: 5, name: "동쪽 가로지르기 코스", p1: { lat: currentLat + (latOffset/2), lng: currentLng + lngOffset }, p2: { lat: currentLat, lng: currentLng + (lngOffset*1.5) }, p3: { lat: currentLat - (latOffset/2), lng: currentLng + lngOffset } },
    { id: 6, name: "서쪽 직선 위주 코스", p1: { lat: currentLat + (latOffset/2), lng: currentLng - lngOffset }, p2: { lat: currentLat, lng: currentLng - (lngOffset*1.5) }, p3: { lat: currentLat - (latOffset/2), lng: currentLng - lngOffset } },
  ];

  const results = [];

  for (const cand of candidates) {
    const passList = `${cand.p1.lng},${cand.p1.lat}_${cand.p2.lng},${cand.p2.lat}_${cand.p3.lng},${cand.p3.lat}`;
    try {
      const res = await fetch(VERCEL_TMAP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startX: currentLng.toString(), startY: currentLat.toString(),
          endX: (currentLng + 0.0001).toString(), endY: currentLat.toString(), // 출발/도착지 동일 에러 방지
          passList: passList,
          reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
          startName: "출발", endName: "도착", searchOption: "30" // 30: 보행자 맞춤
        })
      });
      const data = await res.json();
      
      if (data.features) {
        let score = 100;
        let stairCount = 0;
        let crosswalkCount = 0;
        let actualDist = 0;
        const fullPath: Array<[number, number]> = [];

        data.features.forEach((f: any) => {
          // 인도 선형 좌표 추출
          if (f.geometry.type === 'LineString') {
            fullPath.push(...f.geometry.coordinates);
            if (f.properties?.facilityType === '14' || f.properties?.facilityType === '15') {
              stairCount++;
              score -= 15; // 계단, 가파른 경사 패널티
            }
          }
          // 횡단보도(CP) 포인트 카운트
          if (f.geometry.type === 'Point' && f.properties?.pointType === 'CP') {
            crosswalkCount++;
            score -= 3; // 횡단보도 패널티
          }
        });

        actualDist = Number((data.features[0]?.properties?.totalDistance / 1000).toFixed(2)) || distanceKm;
        // 거리 오차 패널티
        score -= Math.abs(distanceKm - actualDist) * 10;

        results.push({
          id: cand.id,
          name: cand.name,
          conceptType: 'beta_comfort',
          path: fullPath,
          distance: actualDist,
          score: Math.max(0, score),
          stairCount,
          crosswalkCount,
        });
      }
    } catch (e) {
      console.warn("후보군 API 호출 에러", e);
    }
  }

  // TMAP API가 모두 실패하여 빈 배열이 반환되면 UI가 튕기는 현상 방지용 Fallback
  if (results.length === 0) {
    console.warn("모든 쾌적 경로 API 탐색이 실패하여 임시 다각형을 반환합니다.");
    results.push({
      id: 99,
      name: "기본 순환 코스 (안전모드)",
      conceptType: 'beta_comfort',
      path: [
        [currentLng, currentLat], 
        [currentLng + lngOffset, currentLat], 
        [currentLng + lngOffset, currentLat + latOffset], 
        [currentLng, currentLat + latOffset], 
        [currentLng, currentLat]
      ],
      distance: distanceKm,
      score: 50,
      stairCount: 0,
      crosswalkCount: 0,
    });
  }

  // 점수(쾌적도) 순으로 정렬하여 반환
  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}


// 2. 서울시 전체 대상 최적 GPS 아트 맵핑 알고리즘
export async function findBestArtMapping(shapeType: 'heart' | 'star' | 'cat') {
  console.log(`[Algorithm 2] 서울시 전체 대상 '${shapeType}' 도안 맵핑 시작.`);
  
  // 0~1.0 비율로 정규화된 템플릿 (크기, 위치 없음)
  const normalizedTemplates = {
    heart: [
      [0.2, 0.8], [0.5, 0.9], [0.8, 0.8], [0.9, 0.5], [0.5, 0.1], [0.1, 0.5]
    ],
    star: [
      [0.5, 0.9], [0.65, 0.5], [0.2, 0.7], [0.8, 0.7], [0.35, 0.5]
    ],
    cat: [
      [0.1, 0.6], [0.2, 0.8], [0.3, 0.9], [0.5, 0.7], [0.9, 0.7] // 주요 꺾임 포인트 5개로 압축 (API 경유지 한계)
    ]
  };

  const template = normalizedTemplates[shapeType];

  // 기존 3개 공원에서 벗어나, 서울시 주요 교차로 중 랜덤하게 50개를 추출하여 탐색 지점으로 사용
  const allIntersections = Object.values(INTERSECTION_LOCATIONS);
  const candidateZones = allIntersections
    .sort(() => 0.5 - Math.random())
    .slice(0, 50)
    .map(z => ({ name: z.itstNm + " 일대", lat: z.lat, lng: z.lng }));

  let bestZone = null;
  let bestPath: any[] = [];
  let minError = Infinity;

  // 도심 속 복잡한 형태를 매핑하기 위해 크기를 조금 더 넓게(약 3~4km) 스케일링
  const scaleLat = 0.025;
  const scaleLng = 0.035;

  // API 속도 제한(Rate Limit)을 피하기 위해 10개씩 배치(Batch) 처리
  const BATCH_SIZE = 10;
  for (let i = 0; i < candidateZones.length; i += BATCH_SIZE) {
    const batch = candidateZones.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async (zone) => {
      const realPoints = template.map(pt => ({
        lat: zone.lat + (pt[1] - 0.5) * scaleLat,
        lng: zone.lng + (pt[0] - 0.5) * scaleLng
      }));

      const start = realPoints[0];
      const passList = realPoints.slice(1, -1).map(pt => `${pt.lng},${pt.lat}`).join('_');

      try {
        const res = await fetch(VERCEL_TMAP_API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startX: start.lng.toString(), startY: start.lat.toString(),
            endX: (start.lng + 0.0001).toString(), endY: start.lat.toString(),
            passList: passList,
            reqCoordType: "WGS84GEO", resCoordType: "WGS84GEO",
            startName: "시작", endName: "도착", searchOption: "30"
          })
        });
        
        const data = await res.json();
        if (data.features) {
          let fullPath: Array<[number, number]> = [];
          data.features.forEach((f: any) => {
            if (f.geometry.type === 'LineString') {
              fullPath.push(...f.geometry.coordinates);
            }
          });
          if (fullPath.length > 0) fullPath.push(fullPath[0]); // Loop 닫기
          
          const apiDistance = data.features[0]?.properties?.totalDistance || 0;
          const error = Math.abs(3500 - apiDistance); // 도심 매핑 이상적 크기 3.5km 기준 오차
          return { zone: zone.name, fullPath, error };
        }
      } catch (e) {
        // 개별 API 에러는 무시하고 계속 진행
      }
      return null;
    });

    const results = await Promise.all(promises);
    for (const res of results) {
      if (res && res.error < minError && res.fullPath.length > 0) {
        minError = res.error;
        bestZone = res.zone;
        bestPath = res.fullPath;
      }
    }
  }

  // 50곳 모두 실패했을 경우 UI 튕김을 막기 위한 안전장치
  if (bestPath.length === 0) {
    console.warn("적합한 도로망을 찾지 못했습니다. 임시 가상 경로를 반환합니다.");
    const fbZone = candidateZones[0];
    const fbPath = template.map(pt => [
      fbZone.lng + (pt[0] - 0.5) * scaleLng,
      fbZone.lat + (pt[1] - 0.5) * scaleLat
    ]);
    fbPath.push(fbPath[0]);
    return {
      name: `[임시] '${fbZone.name}' ${shapeType === 'heart' ? '하트' : shapeType === 'star' ? '별' : '고양이'} 코스`,
      conceptType: `beta_art_${shapeType}`,
      path: fbPath as [number, number][]
    };
  }

  return {
    name: `최적 맵핑 성공! '${bestZone}' ${shapeType === 'heart' ? '하트' : shapeType === 'star' ? '별' : '고양이'} 코스`,
    conceptType: `beta_art_${shapeType}`,
    path: bestPath
  };
}