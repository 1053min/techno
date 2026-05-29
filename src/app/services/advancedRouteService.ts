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

// 💡 Bounding Box를 활용하여 TMAP 경로와 템플릿의 '형태 유사도'를 MSE(평균제곱오차)로 계산하는 핵심 함수
function calculateShapeError(fullPath: Array<any>, template: Array<[number, number]>) {
  if (!fullPath || fullPath.length === 0) return Infinity;

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  fullPath.forEach(pt => {
    if (pt[0] < minLng) minLng = pt[0];
    if (pt[0] > maxLng) maxLng = pt[0];
    if (pt[1] < minLat) minLat = pt[1];
    if (pt[1] > maxLat) maxLat = pt[1];
  });
  const widthLng = maxLng - minLng || 1;
  const heightLat = maxLat - minLat || 1;

  // fullPath를 템플릿 점 개수(numPoints)만큼 정규화 및 샘플링 추출
  const sampledPath: Array<any> = [];
  const numPoints = template.length;
  for (let i = 0; i < numPoints; i++) {
    const idx = Math.floor((i / (numPoints - 1)) * (fullPath.length - 1));
    const pt = fullPath[idx];
    sampledPath.push([(pt[0] - minLng) / widthLng, (pt[1] - minLat) / heightLat]);
  }

  // 템플릿도 바운딩 박스 기준으로 재정규화 (회전 후 크기 변동 보정)
  let tMinX = Infinity, tMaxX = -Infinity, tMinY = Infinity, tMaxY = -Infinity;
  template.forEach(pt => {
    if (pt[0] < tMinX) tMinX = pt[0];
    if (pt[0] > tMaxX) tMaxX = pt[0];
    if (pt[1] < tMinY) tMinY = pt[1];
    if (pt[1] > tMaxY) tMaxY = pt[1];
  });
  const tWidth = tMaxX - tMinX || 1;
  const tHeight = tMaxY - tMinY || 1;
  const normalizedTemplate = template.map(pt => [(pt[0] - tMinX) / tWidth, (pt[1] - tMinY) / tHeight]);

  // 점 대 점 좌표 오차율 합산 (거리 차이 제곱합)
  let mse = 0;
  for (let i = 0; i < numPoints; i++) {
    const dx = sampledPath[i][0] - normalizedTemplate[i][0];
    const dy = sampledPath[i][1] - normalizedTemplate[i][1];
    mse += (dx * dx + dy * dy);
  }
  
  return mse / numPoints;
}

// 💡 고도화된 스파이크 & 백트래킹(왕복) 제거 필터
function removeSpikes(path: Array<any>) {
  const smoothed: Array<any> = [];
  for (let i = 0; i < path.length; i++) {
    let foundBacktrack = false;
    // 최근 지나온 경로(최대 15개 뎁스)를 스캔하여, 현재 점과 매우 가까운 곳을 다시 지나는 경우(왕복/루프) 그 사이를 잘라냅니다.
    for (let j = Math.max(0, smoothed.length - 15); j < smoothed.length - 1; j++) {
      const dist = Math.sqrt(Math.pow(smoothed[j][0] - path[i][0], 2) + Math.pow(smoothed[j][1] - path[i][1], 2));
      if (dist < 0.0003) { // 약 20~30m 이내로 다시 돌아왔다면 왕복 스파이크로 간주
        smoothed.length = j + 1; // 겹치는 루프 구간 통째로 폐기
        foundBacktrack = true;
        break;
      }
    }
    if (!foundBacktrack) {
      smoothed.push(path[i]);
    }
  }
  return smoothed;
}

// 1. 내 주변 맞춤 쾌적 경로 생성 알고리즘
export async function generateComfortRoute(distanceKm: number, currentLat: number, currentLng: number, stairOption: 'avoid' | 'allow_some' | 'ignore' = 'avoid') {
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
        let steepCount = 0;
        let crosswalkCount = 0;
        let actualDist = 0;
        const fullPath: Array<any> = [];

        data.features.forEach((f: any) => {
          // 💡 인도 선형 좌표 추출 및 계단/경사도 분리 주입
          if (f.geometry.type === 'LineString') {
            let grade = 0; // 0: 평지, 1: 얕은 경사, 2: 계단, 3: 가파른 경사
            if (f.properties?.facilityType === '14') {
              stairCount++;
              grade = 2; // 계단
            } else if (f.properties?.facilityType === '15') {
              steepCount++;
              grade = 3; // 가파른 경사
            } else if (f.properties?.facilityType === '16' || f.properties?.facilityType === '17') {
              steepCount++;
              grade = 1; // 얕은 경사/단차
            }
            
            f.geometry.coordinates.forEach((coord: any) => {
              fullPath.push([coord[0], coord[1], grade]); // [lng, lat, grade] 형태로 맵핑
            });
          }
          // 횡단보도(CP) 포인트 카운트
          if (f.geometry.type === 'Point' && f.properties?.pointType === 'CP') {
            crosswalkCount++;
            score -= 1; // 횡단보도 패널티 완화
          }
        });

        actualDist = Number((data.features[0]?.properties?.totalDistance / 1000).toFixed(2)) || distanceKm;
        // 거리 오차 패널티 완화
        score -= Math.abs(distanceKm - actualDist) * 5;

        // 💡 유저의 계단 회피 옵션에 따른 추가 패널티 적용
        let isValid = true;
        if (stairOption === 'avoid' && stairCount > 0) {
          isValid = false; // 계단이 있으면 아예 후보에서 배제
        } else if (stairOption === 'allow_some') {
          score -= stairCount * 2; // 감점 완화
        }
        
        // 스파이크 제거 후 최종 경로 삽입
        const cleanedPath = removeSpikes(fullPath);
        if (isValid && cleanedPath.length > 0) {
          results.push({
            id: cand.id,
            name: cand.name,
            conceptType: 'beta_comfort',
            path: cleanedPath,
            distance: actualDist,
            score: Math.max(80, Math.min(100, Math.round(score))), // 최소 80점 보장 및 100점 만점
            stairCount,
            steepCount,
            crosswalkCount,
          });
        }
      }
    } catch (e) {
      console.warn("후보군 API 호출 에러", e);
    }
  }

  // 점수(쾌적도) 순으로 정렬하여 반환
  return results.sort((a, b) => b.score - a.score).slice(0, 3);
}


// 2. 서울시 전체 대상 최적 GPS 아트 맵핑 알고리즘
export async function findBestArtMapping(shapeType: 'heart' | 'star' | 'thumbsup') {
  console.log(`[Algorithm 2] 서울시 전체 대상 '${shapeType}' 도안 맵핑 시작.`);
  
  // 0~1.0 비율로 정규화된 템플릿 (크기, 위치 없음)
  const normalizedTemplates = {
    heart: [
      [0.2, 0.8], [0.5, 0.9], [0.8, 0.8], [0.9, 0.5], [0.5, 0.1], [0.1, 0.5]
    ],
    star: [
      [0.5, 0.9], [0.65, 0.5], [0.2, 0.7], [0.8, 0.7], [0.35, 0.5]
    ],
    thumbsup: [
      [0.3, 0.9], [0.3, 0.2], [0.5, 0.2], [0.5, 0.4], [0.9, 0.4], [0.9, 0.8], [0.5, 0.9] // 손목 -> 엄지 -> 손가락 -> 손바닥
    ]
  };

  const template = normalizedTemplates[shapeType];

  // 속도를 위해 탐색 거점을 10개로 축소하는 대신, 각 거점마다 45도 간격으로 360도 회전하며 매핑 시도
  const allIntersections = Object.values(INTERSECTION_LOCATIONS);
  const candidateZones = allIntersections
    .sort(() => 0.5 - Math.random())
    .slice(0, 10)
    .map(z => ({ name: z.itstNm + " 일대", lat: z.lat, lng: z.lng }));

  // 45도 간격 라디안 배열 (0, 45, 90, 135, 180, 225, 270, 315)
  const angles = [0, 45, 90, 135, 180, 225, 270, 315].map(deg => (deg * Math.PI) / 180);
  
  // 검색 태스크 큐 (거점 10곳 * 회전 8개 = 총 80가지 경우의 수)
  const searchTasks: { zone: any, angle: number }[] = [];
  candidateZones.forEach(zone => angles.forEach(angle => searchTasks.push({ zone, angle })));

  let bestZone = null;
  let bestPath: any[] = [];
  let minError = Infinity;

  // 도심 속 복잡한 형태를 매핑하기 위해 크기를 조금 더 넓게(약 3~4km) 스케일링
  const scaleLat = 0.025;
  const scaleLng = 0.035;

  // API 속도 제한(Rate Limit)을 피하기 위해 10개씩 배치(Batch) 처리
  const BATCH_SIZE = 10;
  for (let i = 0; i < searchTasks.length; i += BATCH_SIZE) {
    const batch = searchTasks.slice(i, i + BATCH_SIZE);
    
    const promises = batch.map(async ({ zone, angle }) => {
      // 중심(0.5, 0.5)을 기준으로 템플릿 회전 적용 수학 공식
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotatedTemplate = template.map(pt => [
        (pt[0] - 0.5) * cos - (pt[1] - 0.5) * sin + 0.5,
        (pt[1] - 0.5) * cos + (pt[0] - 0.5) * sin + 0.5
      ]);

      const realPoints = rotatedTemplate.map(pt => ({
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
          
          // 💡 TMAP 경로(도로망)가 회전된 템플릿의 형태와 얼마나 유사한지 점수화
          const shapeError = calculateShapeError(fullPath, rotatedTemplate);
          const apiDistance = data.features[0]?.properties?.totalDistance || 0;
          const distError = Math.abs(3500 - apiDistance) / 3500; 
          
          // 형태 보존이 가장 중요하므로 가중치 80% 적용
          const error = shapeError * 0.8 + distError * 0.2; 
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
      name: `[임시] '${fbZone.name}' ${shapeType === 'heart' ? '하트' : shapeType === 'star' ? '별' : '엄지척'} 코스`,
      conceptType: `beta_art_${shapeType}`,
      path: fbPath as [number, number][]
    };
  }

  return {
    name: `최적 맵핑 성공! '${bestZone}' ${shapeType === 'heart' ? '하트' : shapeType === 'star' ? '별' : '엄지척'} 코스`,
    conceptType: `beta_art_${shapeType}`,
    path: bestPath
  };
}