import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play } from "lucide-react";
import { useNavigate } from "react-router";
import {
  updateAllSignals,
  getSignalFromCache,
  getSignalEmoji,
  centiSecondsToSeconds,
} from "../services/trafficSignalService";
import { INTERSECTION_LOCATIONS } from "../services/intersectionData";

declare global {
  interface Window {
    Tmapv3: any;
  }
}

// 두 좌표 간의 거리를 구하는 함수 (기존 로직 복구)
function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function RouteMapPage() {
  const navigate = useNavigate();
  const mapContainerId = "route-tmap-container";
  const tmapRef = useRef<any>(null);
  
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [stats, setStats] = useState({ length: 0, intersectionCount: 0, successRate: 100, stairCount: 0, steepCount: 0 });
  const [activeIntersections, setActiveIntersections] = useState<any[]>([]);
  const [firstSignalTime, setFirstSignalTime] = useState<number | null>(null);
  const [activeLayer, setActiveLayer] = useState<'general' | 'gradient' | 'stair'>('general');
  const targetPacePerKm = 6.0; // km당 6분 (360초) 타겟 페이스 시뮬레이션

  const markersRef = useRef<any[]>([]);
  const polylinesRef = useRef<any[]>([]);

  // 1. RoutesPage에서 선택한 경로(GPX 기반 데이터) 불러오기
  useEffect(() => {
    const rawData = sessionStorage.getItem('selected_run_route');
    if (!rawData) return;

    const data = JSON.parse(rawData);
    // data.path가 이미 배열로 있다면(GPX/Drawing), 그대로 사용
    // 없다면 TMAP API를 호출해서 경로를 생성하도록 분기 처리
    if (data.path && data.path.length > 0) {
      setRouteInfo(data);
    } else {
      // 데이터가 온전히 넘어오지 않은 경우 안전하게 뒤로가기
      console.error("경로 데이터를 불러오지 못했습니다.");
      navigate(-1);
    }
  }, []);

  // 2. TMAP 지도 초기화 및 통계 계산 (마운트 시 1회)
  useEffect(() => {
    if (!routeInfo || tmapRef.current || !window.Tmapv3) return;

    // routeInfo.path는 [lng, lat] 구조이므로 TMAP용 [lat, lng]로 변환
    const startLat = Number(routeInfo.path[0][1]);
    const startLng = Number(routeInfo.path[0][0]);

    const map = new window.Tmapv3.Map(mapContainerId, {
      center: new window.Tmapv3.LatLng(startLat, startLng),
      zoom: 15,
      zoomControl: false,
    });
    tmapRef.current = map;

    const isBeta = routeInfo.conceptType?.startsWith('beta');

    // 시작점 마커
    let startIconHTML = `<div style="width: 18px; height: 18px; background: #421c01; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -50%);"></div>`;
    if (isBeta) {
      startIconHTML = `<div style="width: 22px; height: 22px; background: #4F46E5; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.4); transform: translate(-50%, -50%); display: flex; align-items: center; justify-center; font-size:10px; color:white; font-weight:bold; padding-left:3px;">S</div>`;
    }

    const startMarker = new window.Tmapv3.Marker({
      position: new window.Tmapv3.LatLng(startLat, startLng),
      iconHTML: startIconHTML,
      zIndex: 100,
    });
    startMarker.setMap(map);

    if (isBeta) {
      // 도착점 마커 (베타에서만 노출)
      const endLat = Number(routeInfo.path[routeInfo.path.length - 1][1]);
      const endLng = Number(routeInfo.path[routeInfo.path.length - 1][0]);
      const endMarker = new window.Tmapv3.Marker({
        position: new window.Tmapv3.LatLng(endLat, endLng),
        iconHTML: `<div style="width: 22px; height: 22px; background: #E11D48; border: 3px solid white; border-radius: 20%; box-shadow: 0 2px 6px rgba(0,0,0,0.4); transform: translate(-50%, -50%); display: flex; align-items: center; justify-center; font-size:10px; color:white; font-weight:bold; padding-left:3px;">E</div>`,
        zIndex: 99,
      });
      endMarker.setMap(map);
    }

    // 💡 경로 주변(30m 반경) 교차로 필터링 로직 복구
    const filteredIntersections = Object.values(INTERSECTION_LOCATIONS).filter(intersection => 
      routeInfo.path.some((p: [number, number]) => getDistanceKm(p[1], p[0], intersection.lat, intersection.lng) <= 0.03)
    );
    setActiveIntersections(filteredIntersections);

    // 총 길이 계산
    const totalLen = routeInfo.path.reduce((acc: number, _: any, i: number, arr: any[]) => 
      i < arr.length - 1 ? acc + getDistanceKm(arr[i][1], arr[i][0], arr[i+1][1], arr[i+1][0]) : acc, 0
    );
    
    setStats({ 
      length: Number(totalLen.toFixed(2)), 
      intersectionCount: filteredIntersections.length, 
      successRate: 100, // 추후 백엔드 연동 시 확률 계산
      stairCount: routeInfo.stairCount || 0,
      steepCount: routeInfo.steepCount || 0
    });

    // React Strict Mode 마운트/언마운트 사이클 대응 (컨테이너 클린업)
    return () => {
      if (tmapRef.current) {
        const mapDiv = document.getElementById(mapContainerId);
        if (mapDiv) mapDiv.innerHTML = "";
        tmapRef.current = null;
      }
    };
  }, [routeInfo]);

  // 2-1. 레이어 상태(activeLayer)에 따른 경로 렌더링
  useEffect(() => {
    if (!tmapRef.current || !routeInfo) return;

    // 기존에 그려진 폴리라인들 제거
    polylinesRef.current.forEach(p => p.setMap(null));
    polylinesRef.current = [];

    setTimeout(() => {
      try {
        const pathSegments: any[] = [];
        let currentSegment: any = { path: [], color: "" };
        
        const getColorByLayer = (grade: number) => {
           if (activeLayer === 'general') return "#f97316"; // 기본: 전부 오렌지색
           if (activeLayer === 'gradient') {
             if (grade === 3) return "#7E22CE"; // 보라 (가파름)
             if (grade === 1) return "#EF4444"; // 빨강 (얕은 경사)
             return "#94A3B8"; // 회색 (평탄/계단무시)
           }
           if (activeLayer === 'stair') {
             if (grade === 2) return "#E11D48"; // 빨강 (계단)
             return "#CBD5E1"; // 밝은 회색 (평탄/경사무시)
           }
           return "#f97316";
        };

        routeInfo.path.forEach((c: any, index: number) => {
          const grade = c[2] || 0; 
          const color = getColorByLayer(grade);
          const latLng = new window.Tmapv3.LatLng(c[1], c[0]);

          if (index === 0) {
            currentSegment.color = color;
            currentSegment.path.push(latLng);
          } else {
            if (currentSegment.color !== color) {
              currentSegment.path.push(latLng); 
              pathSegments.push(currentSegment);
              currentSegment = { path: [latLng], color };
            } else {
              currentSegment.path.push(latLng);
            }
          }
        });
        if (currentSegment.path.length > 0) pathSegments.push(currentSegment);

        pathSegments.forEach((seg) => {
          const polyline = new window.Tmapv3.Polyline({
            path: seg.path,
            strokeColor: seg.color,
            strokeWeight: 8,
            strokeOpacity: 0.9,
            strokeStyle: "solid",
            direction: true, // 화살표
            map: tmapRef.current,
          });
          polylinesRef.current.push(polyline);
        });
      } catch (e) {
        console.warn("TMAP Polyline 렌더링 에러:", e);
      }
    }, 500);
  }, [routeInfo, activeLayer]);

  // 3. 백엔드 최적화: 10초 주기 전체 신호 대량 동기화
  useEffect(() => {
    updateAllSignals();
    const interval = setInterval(updateAllSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  // 4. 경로 위에 있는 교차로만 TMAP 마커로 띄우고 1초 실시간 카운트다운 적용
  useEffect(() => {
    if (!tmapRef.current || activeIntersections.length === 0) return;

    const updateSignals = () => {
      if (!tmapRef.current) return;
      // 기존 마커 초기화
      markersRef.current.forEach((marker) => marker.setMap(null));
      const newMarkers: any[] = [];

      const startLat = Number(routeInfo.path[0][1]);
      const startLng = Number(routeInfo.path[0][0]);

      let closestDist = Infinity;
      let firstFoundSignalTime: number | null = null;

      activeIntersections.forEach((intersection) => {
        const isBeta = routeInfo?.conceptType?.startsWith('beta');
        const signal = getSignalFromCache(intersection.itstId);
        const isAvailable = !!signal;
        let htmlContent = '';

        // 💡 횡단보도 방향 데이터를 if 블록 밖으로 꺼내서 스코프 에러(ReferenceError) 해결
        const directions = [
          { key: 'ntPdsgRmdrCs', emoji: '↑', latOffset: 0.00015, lngOffset: 0 },
          { key: 'stPdsgRmdrCs', emoji: '↓', latOffset: -0.00015, lngOffset: 0 },
          { key: 'etPdsgRmdrCs', emoji: '→', latOffset: 0, lngOffset: 0.00015 },
          { key: 'wtPdsgRmdrCs', emoji: '←', latOffset: 0, lngOffset: -0.00015 }
        ];
        let activeDir = directions[0];

        if (isAvailable) {
          // 오차 보정 로직 적용
          const timeOffsetSeconds = signal.trsmUtcTime ? (Date.now() - signal.trsmUtcTime) / 1000 : 0;
          
          let validTimeCs = 0;
          
          for (const dir of directions) {
            if (signal[dir.key] !== undefined && signal[dir.key] !== null) {
              validTimeCs = signal[dir.key];
              activeDir = dir;
              break;
            }
          }
          
          const baseTime = centiSecondsToSeconds(validTimeCs);
          const adjustedTime = Math.max(0, Math.round(baseTime - timeOffsetSeconds));
          const emoji = getSignalEmoji(adjustedTime);

          // 첫 신호 대기시간 추출을 위해 시작점과 가장 가까운 교차로 판별
          const distToIntersection = getDistanceKm(startLat, startLng, intersection.lat, intersection.lng);
          if (distToIntersection < closestDist) {
            closestDist = distToIntersection;
            firstFoundSignalTime = adjustedTime;
          }

          if (isBeta) {
            // 💡 베타: 러닝 페이스 기반 신호 예측 (ETA 산출 로직)
            const etaSeconds = distToIntersection * targetPacePerKm * 60; // 도착 예상 시간(초)
            
            let paceGuide = "";
            let guideColor = "";
            const timeDiff = adjustedTime - etaSeconds; 
            
            if (timeDiff > 5) {
              paceGuide = "🏃 속도 유지";
              guideColor = "#10B981"; // Emerald
            } else if (timeDiff > -10 && timeDiff <= 5) {
              paceGuide = "🔥 스퍼트!";
              guideColor = "#F59E0B"; // Amber
            } else {
              paceGuide = "🐢 페이스 늦추기";
              guideColor = "#EF4444"; // Rose
            }

            htmlContent = `
              <div style="background: white; border: 2px solid ${guideColor}; border-radius: 12px; padding: 4px 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; flex-direction: column; align-items: center; gap: 2px; transform: translate(-50%, -100%); white-space: nowrap;">
                <div style="display: flex; gap: 4px; font-weight: 900; font-size: 12px;">
                  <span>${activeDir.emoji} ${emoji}</span>
                  <span style="color: #374151;">${adjustedTime}초</span>
                </div>
                <div style="font-size: 9px; font-weight: 800; color: ${guideColor}; background: ${guideColor}15; padding: 2px 6px; border-radius: 6px;">
                  ${paceGuide}
                </div>
              </div>
            `;
          } else {
            // 일반: 기본 신호 타이머
            htmlContent = `
              <div style="background: white; border: 2px solid #000; border-radius: 12px; padding: 4px 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 4px; font-weight: 900; font-size: 12px; transform: translate(-50%, -100%); white-space: nowrap;">
                <span>${activeDir.emoji} ${emoji}</span>
                <span style="color: #374151;">${adjustedTime}초</span>
              </div>
            `;
          }
        } else {
          // 데이터가 없을 때 (대기중)
          htmlContent = `
            <div style="background: #9ca3af; border: 2px solid #4b5563; border-radius: 12px; padding: 4px 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 4px; font-weight: 900; font-size: 11px; color: white; transform: translate(-50%, -100%); white-space: nowrap;">
              ⚪ 대기중
            </div>
          `;
        }

        // 교차로 정중앙이 아닌 해당 횡단보도 방향으로 마커 위치 오차 적용
        const marker = new window.Tmapv3.Marker({
          position: new window.Tmapv3.LatLng(intersection.lat + (isAvailable ? activeDir?.latOffset : 0), intersection.lng + (isAvailable ? activeDir?.lngOffset : 0)),
          map: tmapRef.current,
          iconHTML: htmlContent,
        });

        newMarkers.push(marker);
      });

      markersRef.current = newMarkers;
      setFirstSignalTime(firstFoundSignalTime);
    };

    updateSignals();
    const interval = setInterval(updateSignals, 1000);
    return () => clearInterval(interval);
  }, [activeIntersections]);

  return (
    <div className="flex flex-col h-screen w-full bg-gray-50 relative selection:bg-orange-500/30 font-sans">
      {/* 💡 상단 헤더 (독립된 페이지로 구성, 탭 제거) */}
      <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft className="size-5 text-black" />
        </button>
        <h2 className="font-black text-lg text-black mb-0 tracking-tight">{routeInfo?.name || "로딩 중..."}</h2>
      </div>

      {/* TMAP 영역 */}
      <div className="flex-1 w-full relative z-0 overflow-hidden">
        
        {/* 🗺️ 지도 레이어 선택 UI */}
        <div className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-md rounded-2xl shadow-lg border border-gray-200 p-1 flex flex-col gap-1">
          <button onClick={() => setActiveLayer('general')} className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeLayer === 'general' ? 'bg-black text-white' : 'text-slate-500 hover:bg-gray-100'}`}>일반 경로</button>
          <button onClick={() => setActiveLayer('gradient')} className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeLayer === 'gradient' ? 'bg-purple-600 text-white' : 'text-slate-500 hover:bg-gray-100'}`}>경사도 뷰</button>
          <button onClick={() => setActiveLayer('stair')} className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeLayer === 'stair' ? 'bg-rose-600 text-white' : 'text-slate-500 hover:bg-gray-100'}`}>계단 뷰</button>
        </div>

        <div id={mapContainerId} className="w-full h-full" />
        
        {/* 🌸 벚꽃길 코스 전용 이펙트 */}
        {routeInfo?.conceptType === 'cherryblossom' && (
          <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-fall text-pink-300 drop-shadow-sm"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10%`,
                  animationDuration: `${Math.random() * 4 + 4}s`,
                  animationDelay: `${Math.random() * 5}s`,
                  opacity: Math.random() * 0.6 + 0.4,
                  fontSize: `${Math.random() * 12 + 10}px`
                }}
              >🌸</div>
            ))}
            <style>{`
              @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg) translateX(0); } 50% { transform: translateY(50vh) rotate(180deg) translateX(20px); } 100% { transform: translateY(110vh) rotate(360deg) translateX(-20px); } }
              .animate-fall { animation: fall linear infinite; }
            `}</style>
          </div>
        )}
      </div>

      {/* 📊 하단 패널: 통계 및 러닝 시작 버튼 (기존 로직 및 레이아웃 유지 + 디자인 업그레이드) */}
      <div className="absolute bottom-6 left-4 right-4 z-[1000] flex flex-col gap-3">
        <div className="bg-white/95 backdrop-blur-md py-4 px-3 rounded-2xl shadow-xl border border-gray-200 flex justify-between items-center">
          <div className="text-center">
            <p className="text-[11px] text-gray-500 font-bold mb-0.5 uppercase tracking-wide">거리</p>
            <p className="font-black text-lg text-black">{stats.length}km</p>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="text-center">
            <p className="text-[11px] text-gray-500 font-bold mb-0.5 uppercase tracking-wide">지형</p>
            <div className="flex gap-2 justify-center items-center">
              <span className={`text-xs font-black ${stats.stairCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>계단 {stats.stairCount}</span>
              <span className={`text-xs font-black ${stats.steepCount > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>언덕 {stats.steepCount}</span>
            </div>
          </div>
          <div className="h-6 w-px bg-gray-200"></div>
          <div className="text-center">
            {routeInfo?.conceptType?.startsWith('beta') ? (
              <>
                <p className="text-[11px] text-gray-500 font-bold mb-0.5 uppercase tracking-wide">첫 신호</p>
                <p className={`font-black text-lg ${firstSignalTime && firstSignalTime > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {firstSignalTime !== null ? (firstSignalTime === 0 ? '통과 가능' : `${firstSignalTime}초`) : '탐색중'}
                </p>
              </>
            ) : (
              <>
                <p className="text-[11px] text-gray-500 font-bold mb-0.5 uppercase tracking-wide">무정지율</p>
                <p className="font-black text-lg text-emerald-400">{stats.successRate}%</p>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => navigate("/tracking", { state: { routeInfo } })}
          className="w-full bg-orange-500 text-white font-black tracking-widest text-lg py-4 rounded-2xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          <Play className="size-5 fill-current" />
          START RUNNING
        </button>
      </div>
    </div>
  );
}