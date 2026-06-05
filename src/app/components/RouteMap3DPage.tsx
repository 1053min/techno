import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Plane } from "lucide-react";
import { useNavigate } from "react-router";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { INTERSECTION_LOCATIONS } from "../services/intersectionData";
import { updateAllSignals, getSignalFromCache, getSignalEmoji, centiSecondsToSeconds } from "../services/trafficSignalService";

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + 
            Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

// 두 좌표 간의 방위각(Bearing/방향)을 계산하는 함수 (가상 비행 카메라 회전용)
function getBearing(startLng: number, startLat: number, endLng: number, endLat: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;
  const dLng = toRad(endLng - startLng);
  const y = Math.sin(dLng) * Math.cos(toRad(endLat));
  const x = Math.cos(toRad(startLat)) * Math.sin(toRad(endLat)) - Math.sin(toRad(startLat)) * Math.cos(toRad(endLat)) * Math.cos(dLng);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function RouteMap3DPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [activeLayer, setActiveLayer] = useState<'general' | 'gradient' | 'stair'>('general');
  const [firstSignalTime, setFirstSignalTime] = useState<number | null>(null);
  const [stats, setStats] = useState({ length: 0, stairCount: 0, steepCount: 0 });
  const targetPacePerKm = 6.0; // km당 6분 페이스 기준
  const [isFlying, setIsFlying] = useState(false);
  const isFlyingRef = useRef(false);

  // 1. 세션 스토리지에서 선택된 경로 정보 가져오기
  useEffect(() => {
    const rawData = sessionStorage.getItem("selected_run_route");
    if (rawData) {
      setRouteInfo(JSON.parse(rawData));
    } else {
      navigate(-1);
    }
  }, [navigate]);

  // 1-0. 경로 기반 통계치 (거리, 계단, 경사도) 계산
  useEffect(() => {
    if (!routeInfo || !routeInfo.path) return;
    const totalLen = routeInfo.path.reduce((acc: number, _: any, i: number, arr: any[]) => 
      i < arr.length - 1 ? acc + getDistanceKm(arr[i][1], arr[i][0], arr[i+1][1], arr[i+1][0]) : acc, 0
    );
    setStats({
      length: Number(totalLen.toFixed(2)),
      stairCount: routeInfo.stairCount || 0,
      steepCount: routeInfo.steepCount || 0
    });
  }, [routeInfo]);

  // 1-1. 백엔드 최적화: 10초 주기 전체 신호 대량 동기화
  useEffect(() => {
    updateAllSignals();
    const interval = setInterval(updateAllSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  // 2. Mapbox 3D 지도 렌더링
  useEffect(() => {
    if (!mapContainer.current || !routeInfo || map.current) return;

    // Vercel 및 로컬 환경변수 사용 (Vite 기준)
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

    const startLng = routeInfo.path[0][0];
    const startLat = routeInfo.path[0][1];

    // 지도 초기화
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12", // 위성 지도 스타일
      center: [startLng, startLat],
      zoom: 15.5,
      pitch: 65, // 3D 효과를 위한 카메라 각도
      bearing: 45, // 카메라 회전 각도
    });

    map.current.on("load", () => {
      // 3D 지형(Terrain) 추가
      map.current!.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.current!.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 }); // 지형 과장도 1.5배

      // 💡 3D 건물 레이어 추가
      map.current!.addLayer({
        id: "3d-buildings",
        source: "composite",
        "source-layer": "building",
        filter: ["==", "extrude", "true"],
        type: "fill-extrusion",
        minzoom: 15,
        paint: {
          "fill-extrusion-color": "#e2e8f0", // 건물 색상 (밝은 회색)
          "fill-extrusion-height": [
            "interpolate", ["linear"], ["zoom"],
            15, 0,
            15.05, ["get", "height"],
          ],
          "fill-extrusion-base": [
            "interpolate", ["linear"], ["zoom"],
            15, 0,
            15.05, ["get", "min_height"],
          ],
          "fill-extrusion-opacity": 0.8, // 약간 투명하게 해서 경로가 잘 보이도록 함
        },
      });

      const features: any[] = [];
      for (let i = 0; i < routeInfo.path.length - 1; i++) {
        const p1 = routeInfo.path[i];
        const p2 = routeInfo.path[i + 1];
        const grade = p1[2] || 0; // 0: 평지, 1: 얕은 경사, 2: 계단, 3: 가파른 경사
        features.push({
          type: "Feature",
          properties: { grade },
          geometry: {
            type: "LineString",
            coordinates: [[p1[0], p1[1]], [p2[0], p2[1]]],
          },
        });
      }

      map.current!.addSource("route", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: features,
        },
      });

      map.current!.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { 
          "line-color": [
            "match", ["get", "grade"],
            3, "#7E22CE", // 보라 (가파른 경사)
            2, "#E11D48", // 빨강 (계단)
            1, "#F59E0B", // 주황 (얕은 경사)
            0, "#10B981", // 에메랄드 (평지)
            "#10B981"
          ], 
          "line-width": 8, 
          "line-opacity": 0.8 
        },
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [routeInfo]);

  // 💡 버튼 클릭 시 활성화된 뷰 모드(activeLayer)에 따라 3D 경로 색상 동적 변경
  useEffect(() => {
    if (!map.current || !map.current.getLayer("route")) return;

    let colorExpression: any[];
    if (activeLayer === 'gradient') {
      colorExpression = ["match", ["get", "grade"], 3, "#7E22CE", 1, "#EF4444", "#94A3B8"]; // 언덕(보라/빨강) 외엔 회색
    } else if (activeLayer === 'stair') {
      colorExpression = ["match", ["get", "grade"], 2, "#E11D48", "#CBD5E1"]; // 계단(빨강) 외엔 옅은 회색
    } else {
      // general (모든 지형 표시)
      colorExpression = [
        "match", ["get", "grade"],
        3, "#7E22CE",
        2, "#E11D48",
        1, "#F59E0B",
        0, "#10B981",
        "#10B981"
      ];
    }

    map.current.setPaintProperty("route", "line-color", colorExpression);
  }, [activeLayer]);

  // 3. 교차로 신호등 마커 업데이트
  useEffect(() => {
    if (!map.current || !routeInfo) return;
    const isBeta = routeInfo?.conceptType?.startsWith('beta');

    const startLat = Number(routeInfo.path[0][1]);
    const startLng = Number(routeInfo.path[0][0]);

    // 30m 반경 교차로 필터링
    const activeIntersections = Object.values(INTERSECTION_LOCATIONS).filter((intersection: any) => 
      routeInfo.path.some((p: [number, number]) => getDistanceKm(p[1], p[0], intersection.lat, intersection.lng) <= 0.03)
    );

    const updateSignals = () => {
      if (!map.current) return;
      
      // 기존 마커 제거
      markersRef.current.forEach((marker) => marker.remove());
      const newMarkers: mapboxgl.Marker[] = [];

      let closestDist = Infinity;
      let firstFoundSignalTime: number | null = null;

      activeIntersections.forEach((intersection: any) => {
        const signal = getSignalFromCache(intersection.itstId);
        const isAvailable = !!signal;
        let htmlContent = '';

        const directions = [
          { key: 'ntPdsgRmdrCs', emoji: '↑', latOffset: 0.00015, lngOffset: 0 },
          { key: 'stPdsgRmdrCs', emoji: '↓', latOffset: -0.00015, lngOffset: 0 },
          { key: 'etPdsgRmdrCs', emoji: '→', latOffset: 0, lngOffset: 0.00015 },
          { key: 'wtPdsgRmdrCs', emoji: '←', latOffset: 0, lngOffset: -0.00015 }
        ];
        let activeDir = directions[0];

        if (isAvailable) {
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

          const distToIntersection = getDistanceKm(startLat, startLng, intersection.lat, intersection.lng);

          // 시작점과 가장 가까운 교차로의 신호등 시간 저장
          if (distToIntersection < closestDist) {
            closestDist = distToIntersection;
            firstFoundSignalTime = adjustedTime;
          }

          if (isBeta) {
            const etaSeconds = distToIntersection * targetPacePerKm * 60;
            let paceGuide = "";
            let guideColor = "";
            const timeDiff = adjustedTime - etaSeconds; 
            
            if (timeDiff > 5) {
              paceGuide = "🏃 속도 유지";
              guideColor = "#10B981";
            } else if (timeDiff > -10 && timeDiff <= 5) {
              paceGuide = "🔥 스퍼트!";
              guideColor = "#F59E0B";
            } else {
              paceGuide = "🐢 페이스 늦추기";
              guideColor = "#EF4444";
            }

            htmlContent = `
              <div style="background: white; border: 2px solid ${guideColor}; border-radius: 12px; padding: 4px 6px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; flex-direction: column; align-items: center; gap: 2px; white-space: nowrap;">
                <div style="display: flex; gap: 4px; font-weight: 900; font-size: 12px; color: black;">
                  <span>${activeDir.emoji} ${emoji}</span>
                  <span style="color: #374151;">${adjustedTime}초</span>
                </div>
                <div style="font-size: 9px; font-weight: 800; color: ${guideColor}; background: ${guideColor}15; padding: 2px 6px; border-radius: 6px;">
                  ${paceGuide}
                </div>
              </div>
            `;
          } else {
            htmlContent = `
              <div style="background: white; border: 2px solid #000; border-radius: 12px; padding: 4px 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 4px; font-weight: 900; font-size: 12px; white-space: nowrap;">
                <span style="color: black;">${activeDir.emoji} ${emoji}</span>
                <span style="color: #374151;">${adjustedTime}초</span>
              </div>
            `;
          }
        } else {
          htmlContent = `
            <div style="background: #9ca3af; border: 2px solid #4b5563; border-radius: 12px; padding: 4px 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 4px; font-weight: 900; font-size: 11px; color: white; white-space: nowrap;">
              ⚪ 대기중
            </div>
          `;
        }

        const el = document.createElement('div');
        el.innerHTML = htmlContent;

        const marker = new mapboxgl.Marker({ element: el, anchor: 'bottom' })
          .setLngLat([intersection.lng + (isAvailable ? activeDir?.lngOffset : 0), intersection.lat + (isAvailable ? activeDir?.latOffset : 0)])
          .addTo(map.current!);
        
        newMarkers.push(marker);
      });

      markersRef.current = newMarkers;
      setFirstSignalTime(firstFoundSignalTime);
    };

    // 마커 업데이트 시작
    updateSignals();
    const interval = setInterval(updateSignals, 1000);
    
    return () => {
      clearInterval(interval);
      markersRef.current.forEach((marker) => marker.remove());
      markersRef.current = [];
    };
  }, [routeInfo]); // routeInfo가 바뀔 때만 재설정

  // 4. 가상 비행 (Fly-over) 카메라 애니메이션 로직
  const toggleFlyover = async () => {
    if (!map.current || !routeInfo) return;
    
    if (isFlying) {
      // 비행 중지
      setIsFlying(false);
      isFlyingRef.current = false;
      map.current.stop(); // 진행 중인 애니메이션 정지
      // 카메라 초기 시점으로 복구
      map.current.flyTo({
        center: [routeInfo.path[0][0], routeInfo.path[0][1]],
        zoom: 15.5,
        pitch: 65,
        bearing: 45,
        duration: 2000
      });
      return;
    }

    // 비행 시작
    setIsFlying(true);
    isFlyingRef.current = true;

    const coords = routeInfo.path;
    for (let i = 0; i < coords.length - 1; i++) {
      if (!isFlyingRef.current) break; // 중지 버튼 클릭 시 루프 탈출
      
      const p1 = coords[i];
      const p2 = coords[i+1];
      const dist = getDistanceKm(p1[1], p1[0], p2[1], p2[0]);
      
      if (dist < 0.002) continue; // 너무 짧은 구간은 카메라 흔들림 방지를 위해 스킵
      
      const bearing = getBearing(p1[0], p1[1], p2[0], p2[1]);

      await new Promise<void>((resolve) => {
        if (!map.current) { resolve(); return; }
        map.current.easeTo({
          center: [p2[0], p2[1]],
          bearing: bearing,
          pitch: 75, // 비행 중에는 시야를 더 낮춰서(눕혀서) 역동적인 뷰 제공
          zoom: 17.5, // 줌 인
          duration: dist * 30000, // 1km 당 30초 속도로 비행
          easing: (t) => t // 일정한 속도로 이동 (Linear)
        });
        map.current.once('moveend', () => resolve());
      });
    }
    
    setIsFlying(false);
    isFlyingRef.current = false;
  };

  // 컴포넌트 언마운트 시 비행 루프 종료
  useEffect(() => {
    return () => { isFlyingRef.current = false; };
  }, []);

  return (
    <div className="h-screen w-full relative bg-slate-950 flex flex-col font-sans">
      <div className="absolute top-0 left-0 right-0 p-4 bg-transparent z-10 flex items-center gap-3 pointer-events-none">
        <button onClick={() => navigate(-1)} className="pointer-events-auto p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full transition-colors">
          <ArrowLeft className="size-5 text-white" />
        </button>
        <h2 className="font-black text-lg text-white mb-0 drop-shadow-md">3D 다이내믹 코스 뷰어</h2>
      </div>

      {/* 💡 가상 비행 (Fly-over) 토글 버튼 */}
      <div className="absolute top-20 left-4 z-20 pointer-events-auto">
        <button 
          onClick={toggleFlyover}
          className={`px-4 py-3 text-sm font-black rounded-2xl shadow-lg border transition-all flex items-center gap-2 ${isFlying ? 'bg-rose-500 text-white border-rose-400 animate-pulse' : 'bg-slate-900/80 backdrop-blur-md text-emerald-400 border-emerald-500/50 hover:bg-slate-800'}`}
        >
          <Plane className={`size-4 ${isFlying ? 'animate-bounce' : ''}`} />
          {isFlying ? '비행 중지' : '가상 비행 시작'}
        </button>
      </div>

      {/* 💡 2D 맵과 동일한 지도 레이어 선택 UI (경사도 뷰 / 계단 뷰) 추가 */}
      <div className="absolute top-20 right-4 z-20 bg-slate-900/80 backdrop-blur-md rounded-2xl shadow-lg border border-slate-700 p-1 flex flex-col gap-1 pointer-events-auto">
        <button onClick={() => setActiveLayer('general')} className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeLayer === 'general' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>지형 전부</button>
        <button onClick={() => setActiveLayer('gradient')} className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeLayer === 'gradient' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>경사도 뷰</button>
        <button onClick={() => setActiveLayer('stair')} className={`px-3 py-2 text-xs font-bold rounded-xl transition-colors ${activeLayer === 'stair' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:bg-slate-800'}`}>계단 뷰</button>
      </div>

      {/* 💡 하단 통계 패널 및 START RUNNING 버튼 */}
      <div className="absolute bottom-6 left-4 right-4 z-20 flex flex-col gap-3 pointer-events-auto">
        <div className="bg-slate-900/90 backdrop-blur-md py-4 px-3 rounded-2xl shadow-xl border border-slate-700 flex justify-between items-center">
          <div className="text-center">
            <p className="text-[11px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">거리</p>
            <p className="font-black text-lg text-white">{stats.length}km</p>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">지형</p>
            <div className="flex gap-2 justify-center items-center">
              <span className={`text-xs font-black ${stats.stairCount > 0 ? 'text-rose-400' : 'text-slate-500'}`}>계단 {stats.stairCount}</span>
              <span className={`text-xs font-black ${stats.steepCount > 0 ? 'text-purple-400' : 'text-slate-500'}`}>언덕 {stats.steepCount}</span>
            </div>
          </div>
          <div className="h-6 w-px bg-slate-700"></div>
          <div className="text-center">
            <p className="text-[11px] text-slate-400 font-bold mb-0.5 uppercase tracking-wide">첫 신호</p>
            <p className={`font-black text-lg ${firstSignalTime !== null ? (firstSignalTime === 0 ? 'text-emerald-400' : 'text-rose-400') : 'text-slate-400'}`}>
              {firstSignalTime !== null ? (firstSignalTime === 0 ? '통과 가능' : `${firstSignalTime}초`) : '탐색중'}
            </p>
          </div>
        </div>

        <button onClick={() => navigate("/tracking", { state: { routeInfo } })} className="w-full bg-emerald-500 text-white font-black tracking-widest text-lg py-4 rounded-2xl shadow-lg hover:bg-emerald-400 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2">
          <Play className="size-5 fill-current" />
          START RUNNING
        </button>
      </div>

      <div ref={mapContainer} className="flex-1 w-full h-full" />
    </div>
  );
}