/**
 * [베타] 고도화된 경로 탐색 및 GPS 아트 맵핑 서비스
 * 기존 routeService.ts에 영향을 주지 않고 새로운 알고리즘을 테스트하기 위한 파일입니다.
 */

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

  // 3가지 다른 방향의 루프 생성 (북동, 북서, 남쪽)
  const candidates = [
    { id: 1, name: "도시 중심 탐험 코스", p1: { lat: currentLat, lng: currentLng + lngOffset }, p2: { lat: currentLat + latOffset, lng: currentLng + lngOffset }, p3: { lat: currentLat + latOffset, lng: currentLng } },
    { id: 2, name: "강변/하천 외곽 코스", p1: { lat: currentLat, lng: currentLng - lngOffset }, p2: { lat: currentLat + latOffset, lng: currentLng - lngOffset }, p3: { lat: currentLat + latOffset, lng: currentLng } },
    { id: 3, name: "골목길 회피 직선 코스", p1: { lat: currentLat - latOffset, lng: currentLng }, p2: { lat: currentLat - latOffset, lng: currentLng + lngOffset }, p3: { lat: currentLat, lng: currentLng + lngOffset } },
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
          endX: currentLng.toString(), endY: currentLat.toString(),
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

  // 서울시 넓은 공터가 있는 3대 거점 후보 (템플릿 매칭 서치 스페이스)
  const candidateZones = [
    { name: "여의도 공원 일대", lat: 37.5255, lng: 126.9240 },
    { name: "올림픽공원 평화의광장", lat: 37.5186, lng: 127.1154 },
    { name: "보라매공원 트랙", lat: 37.4940, lng: 126.9180 }
  ];

  let bestZone = null;
  let bestPath: any[] = [];
  let minError = Infinity;

  // 스케일링 팩터 (~2km 내외로 크기 확대)
  const scaleLat = 0.015;
  const scaleLng = 0.020;

  // 각 거점별로 템플릿을 확대 적용하여 실제 도로망 TMAP 매칭 시도
  for (const zone of candidateZones) {
    const realPoints = template.map(pt => ({
      lat: zone.lat + (pt[1] - 0.5) * scaleLat,
      lng: zone.lng + (pt[0] - 0.5) * scaleLng
    }));

    // 시작점, 도착점, 그리고 사이를 잇는 다중 경유지 문자열 생성
    const start = realPoints[0];
    const passList = realPoints.slice(1, -1).map(pt => `${pt.lng},${pt.lat}`).join('_');
    const end = realPoints[realPoints.length - 1]; // 끝점이 도착점 (이후 시작점으로 돌아오는 처리는 컴포넌트나 API 응답에서 Loop 보정)

    try {
      const res = await fetch(VERCEL_TMAP_API, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startX: start.lng.toString(), startY: start.lat.toString(),
          endX: start.lng.toString(), endY: start.lat.toString(), // 닫힌 도형이 아닐 경우 시작점 = 도착점
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
        
        // 시작점과 끝점을 억지로 이어서 Loop를 만듦
        if (fullPath.length > 0) {
          fullPath.push(fullPath[0]);
        }

        // 도로망과의 매칭 오차 단순 계산 (경로를 찾는 데 성공한 것 자체로 점수 부여, 거리가 너무 길면 페널티)
        const apiDistance = data.features[0]?.properties?.totalDistance || 0;
        const error = Math.abs(2000 - apiDistance); // 2km 형태가 이상적이라고 가정

        if (error < minError) {
          minError = error;
          bestZone = zone.name;
          bestPath = fullPath;
        }
      }
    } catch (e) {
      console.warn("Art Mapping TMAP 호출 실패", e);
    }
  }

  // API 통신 완전 실패 시 Mock fallback 방지용 에러 던지거나 기본값 리턴
  if (bestPath.length === 0) {
     console.warn("적합한 도로망을 찾지 못했습니다.");
     return null;
  }

  return {
    name: `최적 맵핑 성공! '${bestZone}' ${shapeType === 'heart' ? '하트' : shapeType === 'star' ? '별' : '고양이'} 코스`,
    conceptType: `beta_art_${shapeType}`,
    path: bestPath
  };
}