"use client";
import { useState, useEffect, useRef } from "react";
import { Pause, Play, Square, Maximize2, Minimize2, ArrowLeft } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { updateAllSignals, getSignalFromCache, getSignalEmoji } from "../services/trafficSignalService";
import { INTERSECTION_LOCATIONS } from "../services/intersectionData";

interface PathPoint {
  lat: number;
  lng: number;
  timestamp: number;
}

declare global {
  interface Window {
    Tmapv3: any;
  }
}

export function TrackingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeInfo = location.state?.routeInfo; 

  const mapContainerId = "tracking-master-map";
  const tmapRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const trackedPolylineRef = useRef<any>(null);
  
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0);
  const [distance, setDistance] = useState(0);
  const [nextSignal, setNextSignal] = useState<{ emoji: string; time: number; status: string; } | null>(null);
  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!routeInfo) {
      alert("선택된 경로 정보가 없습니다. 이전 화면으로 돌아갑니다.");
      navigate(-1);
    }
  }, [routeInfo, navigate]);

  // 1. TMAP 지도 초기화 및 가이드 경로(Gradient) 렌더링
  useEffect(() => {
    if (!routeInfo || tmapRef.current || !window.Tmapv3) return;

    const startLat = routeInfo.path?.[0]?.[1] ?? 37.5559;
    const startLng = routeInfo.path?.[0]?.[0] ?? 127.0436;

    const map = new window.Tmapv3.Map(mapContainerId, {
      center: new window.Tmapv3.LatLng(startLat, startLng),
      zoom: 16,
      zoomControl: false,
    });
    tmapRef.current = map;

    // 가이드 경로 그리기 (경사도 컬러 적용)
    setTimeout(() => {
      if (!tmapRef.current) return;
      
      const pathSegments: any[] = [];
      let currentSegment: any = { path: [], color: "" };
      
      const getColorByGrade = (grade: number) => {
         if (grade === 3) return "#7E22CE"; // 보라(가파름)
         if (grade === 2) return "#E11D48"; // 빨강(계단)
         if (grade === 1) return "#F59E0B"; // 노랑(단차)
         return "#f97316"; // 오렌지(평지)
      };

      routeInfo.path.forEach((c: any, index: number) => {
        const grade = c[2] || 0; 
        const color = getColorByGrade(grade);
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
        new window.Tmapv3.Polyline({
          path: seg.path,
          strokeColor: seg.color,
          strokeWeight: 8,
          strokeOpacity: 0.6,
          strokeStyle: "solid",
          direction: true,
          map: tmapRef.current,
        });
      });
    }, 1000);

    // 내 위치 마커 생성
    currentMarkerRef.current = new window.Tmapv3.Marker({
      position: new window.Tmapv3.LatLng(startLat, startLng),
      map: map,
      iconHTML: `<div style="width: 20px; height: 20px; background: #fbbf24; border: 4px solid white; border-radius: 50%; box-shadow: 0 0 12px rgba(251, 191, 36, 0.8); transform: translate(-50%, -50%);"></div>`,
      zIndex: 100,
    });

    return () => {
      if (tmapRef.current) {
        const mapDiv = document.getElementById(mapContainerId);
        if (mapDiv) mapDiv.innerHTML = "";
        tmapRef.current = null;
      }
    };
  }, [routeInfo]);

  // 2. GPS 실시간 추적
  useEffect(() => {
    if (!isRunning || !tmapRef.current) return;
    if (!navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const newPoint: PathPoint = { lat: position.coords.latitude, lng: position.coords.longitude, timestamp: Date.now() };
        
        setPathPoints((prev) => {
          const updated = [...prev, newPoint];
          if (updated.length > 1) {
            const lastPoint = updated[updated.length - 2];
            const dist = calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);
            if (dist > 0.003) { // 3m 이상 이동 시 거리 누적 (노이즈 방지)
              setDistance((prevDist) => prevDist + dist);
            }
          }
          return updated;
        });

        tmapRef.current?.setCenter(new window.Tmapv3.LatLng(newPoint.lat, newPoint.lng));
        if (currentMarkerRef.current) {
          currentMarkerRef.current.setPosition(new window.Tmapv3.LatLng(newPoint.lat, newPoint.lng));
        }
      },
      (error) => console.warn("GPS 갱신 실패", error),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [isRunning]);

  // 3. 내가 실제 뛴 궤적 그리기 (Solid Indigo)
  useEffect(() => {
    if (!tmapRef.current || pathPoints.length < 2) return;
    if (trackedPolylineRef.current) trackedPolylineRef.current.setMap(null);

    const path = pathPoints.map((p) => new window.Tmapv3.LatLng(p.lat, p.lng));
    trackedPolylineRef.current = new window.Tmapv3.Polyline({
      path: path,
      strokeColor: "#ea580c",
      strokeWeight: 6,
      strokeOpacity: 0.9,
      strokeStyle: "solid",
      map: tmapRef.current,
    });
  }, [pathPoints]);

  // 4. 타이머 및 신호등 데이터 백그라운드 갱신
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRunning) {
      interval = setInterval(() => setTime((prev) => prev + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    updateAllSignals();
    const interval = setInterval(updateAllSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  // 5. 실시간 내 위치 기반 다음 신호 갱신
  useEffect(() => {
    const updateNextSignal = () => {
      const currentLat = pathPoints.length > 0 ? pathPoints[pathPoints.length - 1].lat : (routeInfo?.path?.[0]?.[1] ?? 37.5559);
      const currentLng = pathPoints.length > 0 ? pathPoints[pathPoints.length - 1].lng : (routeInfo?.path?.[0]?.[0] ?? 127.0436);

      let closest = null;
      let minDist = Infinity;
      
      Object.values(INTERSECTION_LOCATIONS).forEach(inter => {
         const dist = calculateDistance(currentLat, currentLng, inter.lat, inter.lng);
         if(dist < 0.15 && dist < minDist) { // 150m 반경 스캔
             minDist = dist;
             closest = inter;
         }
      });

      if (closest) {
        const signal = getSignalFromCache(closest.itstId);
        if (signal) {
          const timeOffsetSeconds = signal.trsmUtcTime ? (Date.now() - signal.trsmUtcTime) / 1000 : 0;
          const directions = ['ntPdsgRmdrCs', 'stPdsgRmdrCs', 'etPdsgRmdrCs', 'wtPdsgRmdrCs'];
          let validTimeCs = 0;
          for (const dir of directions) {
            if (signal[dir] !== undefined && signal[dir] !== null) {
              validTimeCs = signal[dir];
              break;
            }
          }
          const baseTime = validTimeCs / 10;
          const adjustedTime = Math.max(0, Math.round(baseTime - timeOffsetSeconds));
          
          setNextSignal({
            emoji: getSignalEmoji(adjustedTime),
            time: adjustedTime,
            status: adjustedTime > 0 ? "초록불" : "빨간불",
          });
          return;
        }
      }
      setNextSignal(null);
    };

    const interval = setInterval(updateNextSignal, 1000);
    return () => clearInterval(interval);
  }, [pathPoints, routeInfo]);

  // 유틸 함수들
  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const pace = distance > 0 ? time / 60 / distance : 0;

  return (
    <div className="min-h-screen bg-gray-50 text-slate-900 font-sans flex flex-col selection:bg-orange-500/30">
      {/* 헤더 */}
      <div className="absolute top-0 w-full z-50 p-4 flex items-center justify-between pointer-events-none">
        <button onClick={() => navigate(-1)} className="pointer-events-auto bg-white/80 backdrop-blur-md p-3 rounded-full text-slate-900 hover:bg-gray-100 transition-colors border border-gray-200">
          <ArrowLeft className="size-5" />
        </button>
        <div className="bg-white/80 backdrop-blur-md px-4 py-2 rounded-full pointer-events-auto border border-gray-200">
          <span className="font-black text-orange-500 text-sm tracking-widest uppercase">Live Tracking</span>
        </div>
      </div>

      {/* 🗺️ 상단 TMAP 영역 (동적 비율 조절) */}
      <div className={`relative ${isMapExpanded ? "h-[85vh]" : "h-[45vh]"} bg-gray-100 transition-all duration-500 ease-in-out shrink-0`}>
        <div id={mapContainerId} className="w-full h-full" />
        
        {/* 🌸 트래킹 화면 벚꽃길 코스 전용 이펙트 */}
        {routeInfo?.conceptType === 'cherryblossom' && (
          <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="absolute animate-fall text-pink-300 drop-shadow-sm" style={{ left: `${Math.random() * 100}%`, top: `-10%`, animationDuration: `${Math.random() * 4 + 4}s`, animationDelay: `${Math.random() * 5}s`, opacity: Math.random() * 0.6 + 0.4, fontSize: `${Math.random() * 12 + 10}px` }}>🌸</div>
            ))}
            <style>{`
              @keyframes fall { 
                0% { transform: translateY(-10vh) rotate(0deg) translateX(0); } 
                50% { transform: translateY(50vh) rotate(180deg) translateX(20px); } 
                100% { transform: translateY(110vh) rotate(360deg) translateX(-20px); } 
              } 
              .animate-fall { animation: fall linear infinite; }
            `}</style>
          </div>
        )}

        {/* 지도 확대/축소 토글 버튼 */}
        <button onClick={() => setIsMapExpanded(!isMapExpanded)} className="absolute bottom-24 right-4 bg-white/90 backdrop-blur-md border border-gray-200 p-3 rounded-2xl shadow-lg z-[1000] active:scale-[0.95] transition-all text-black">
          {isMapExpanded ? <Minimize2 className="size-5" /> : <Maximize2 className="size-5" />}
        </button>

        {/* 다음 교차로 신호 패널 */}
        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl p-4 border border-gray-200 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold text-gray-500 tracking-wider">주변 교차로 (150m)</div>
              {nextSignal ? (
                <div className={`text-sm font-black px-2 py-0.5 rounded-md ${nextSignal.time > 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                  {nextSignal.emoji} {nextSignal.status} ({nextSignal.time}초)
                </div>
              ) : (
                <div className="text-xs font-bold text-slate-500 bg-gray-100 px-2 py-1 rounded-md">탐색 중...</div>
              )}
            </div>
            <div className="text-[11px] text-gray-600 font-medium mt-1 border-t border-gray-200 pt-2">
              {nextSignal && nextSignal.time > 15 ? "✨ 현재 페이스로 통과 가능합니다." 
                : nextSignal && nextSignal.time > 0 ? "🏃 통과하려면 스퍼트를 내세요!" 
                : nextSignal ? "🛑 신호 대기가 예상됩니다. 페이스를 늦추세요." : "근처에 신호등이 없습니다."}
            </div>
          </div>
        </div>
      </div> 

      {/* 📊 하단 대시보드 영역 */}
      <div className="flex-1 bg-white text-black rounded-t-[2rem] -mt-4 relative z-20 pt-6 px-6 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] border-t border-gray-200">
        <div className="max-w-md mx-auto">
          
          {/* 3단 메인 스탯 */}
          <div className="grid grid-cols-3 gap-4 mb-8">
            <div className="text-center">
              <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">경과 시간</div>
              <div className="text-3xl font-black tracking-tighter text-black">{formatTime(time)}</div>
            </div>
            <div className="text-center border-x border-gray-200">
              <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">달린 거리</div>
              <div className="text-3xl font-black tracking-tighter text-orange-500">{distance.toFixed(2)}<span className="text-sm ml-0.5">km</span></div>
            </div>
            <div className="text-center">
              <div className="text-xs font-bold text-slate-500 mb-1 uppercase tracking-wider">페이스</div>
              <div className="text-3xl font-black tracking-tighter text-black">{pace > 0 ? pace.toFixed(1) : "--"}<span className="text-sm ml-0.5">/km</span></div>
            </div>
          </div>

          {/* 서브 스탯 카드 */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="text-[10px] font-bold text-slate-500 mb-1">신호 대기 횟수</div>
              <div className="text-xl font-black text-slate-900">0회</div>
              <div className="text-[10px] font-bold text-emerald-500 mt-1">✨ 무정지 순항 중!</div>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
              <div className="text-[10px] font-bold text-slate-500 mb-1">목표 달성률</div>
              <div className="text-xl font-black text-slate-900">{routeInfo?.distance ? Math.min(100, Math.round((distance / routeInfo.distance) * 100)) : 0}%</div>
              <div className="text-[10px] font-bold text-slate-500 mt-1">총 {routeInfo?.distance || 0}km 코스</div>
            </div>
          </div>

          {/* 컨트롤러 버튼 */}
          <div className="flex items-center justify-center gap-6">
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`rounded-[2rem] p-6 shadow-lg transition-all active:scale-[0.95] border-2 ${isRunning ? 'bg-white text-orange-500 border-gray-200 hover:bg-gray-50' : 'bg-orange-500 text-white border-orange-500 hover:bg-orange-400'}`}
            >
              {isRunning ? <Pause className="size-8" fill="currentColor" /> : <Play className="size-8 ml-1" fill="currentColor" />}
            </button>

            {(isRunning || time > 0) && (
              <button
                onClick={() => { setIsRunning(false); navigate("/complete"); }}
                className="bg-black text-white border-2 border-black rounded-[2rem] p-6 shadow-md hover:bg-gray-800 transition-all active:scale-[0.95]"
              >
                <Square className="size-8" fill="currentColor" />
              </button>
            )}
          </div>
          
          <div className="text-center mt-6">
            <p className="text-slate-500 font-medium text-xs">
              {isRunning ? "Keep Steady. 호흡에 집중하세요." : time > 0 ? "일시정지됨. 언제든 다시 출발하세요." : "재생 버튼을 눌러 러닝을 시작하세요."}
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}