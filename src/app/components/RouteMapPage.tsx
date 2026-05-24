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
  const [stats, setStats] = useState({ length: 0, intersectionCount: 0, successRate: 100 });
  const [activeIntersections, setActiveIntersections] = useState<any[]>([]);

  const markersRef = useRef<any[]>([]);

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

  // 2. TMAP 지도 초기화, GPX 경로 드로잉 및 통계 계산
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

    // TMAP용 경로 좌표 배열 생성 (유효성 검사 및 연속된 중복 좌표 필터링)
    const tmapPaths: any[] = [];
    let prevLat: number | null = null;
    let prevLng: number | null = null;
    
    routeInfo.path.forEach((c: any) => {
      const lng = Number(c[0]);
      const lat = Number(c[1]);
      if (!isNaN(lat) && !isNaN(lng)) {
        // 완전히 동일한 좌표가 연속되면 TMAP Polyline 렌더링이 실패할 수 있으므로 방어
        if (prevLat !== lat || prevLng !== lng) {
          tmapPaths.push(new window.Tmapv3.LatLng(lat, lng));
          prevLat = lat;
          prevLng = lng;
        }
      }
    });

    // 💡 [드로잉 러닝/실제 인도 경로 복구] GPX 데이터 기반 Polyline 드로잉
    const routePolyline = new window.Tmapv3.Polyline({
      path: tmapPaths,
      strokeColor: "#dd7e24", // 인디고 컬러 (HEX 대문자 권장)
      strokeWeight: 6,
      strokeOpacity: 1, // 누락 방지를 위해 투명도 명시
      strokeStyle: "solid",
    });
    
    // TMAP 버그 방지: 생성 시 map 객체를 넣지 않고 setMap으로 명시적 부착
    routePolyline.setMap(map);

    // 시작점 마커
    const startMarker = new window.Tmapv3.Marker({
      position: new window.Tmapv3.LatLng(startLat, startLng),
      iconHTML: `<div style="width: 18px; height: 18px; background: #421c01; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -50%);"></div>`,
    });
    startMarker.setMap(map);

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
      successRate: 100 // 추후 백엔드 연동 시 확률 계산
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

      activeIntersections.forEach((intersection) => {
        const signal = getSignalFromCache(intersection.itstId);
        const isAvailable = !!signal;
        let htmlContent = '';

        if (isAvailable) {
          // 오차 보정 로직 적용
          const timeOffsetSeconds = signal.trsmUtcTime ? (Date.now() - signal.trsmUtcTime) / 1000 : 0;
          // 대표 방향(동서남북 중 데이터가 있는 첫 번째 것) 추출 로직 (MVP용)
          const directions = ['ntPdsgRmdrCs', 'stPdsgRmdrCs', 'etPdsgRmdrCs', 'wtPdsgRmdrCs'];
          let validTimeCs = 0;
          
          for (const dir of directions) {
            if (signal[dir] !== undefined && signal[dir] !== null) {
              validTimeCs = signal[dir];
              break;
            }
          }
          
          const baseTime = centiSecondsToSeconds(validTimeCs);
          const adjustedTime = Math.max(0, Math.round(baseTime - timeOffsetSeconds));
          const emoji = getSignalEmoji(adjustedTime);

          htmlContent = `
            <div style="background: white; border: 2px solid #4f46e5; border-radius: 12px; padding: 4px 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 4px; font-weight: 900; font-size: 12px; transform: translate(-50%, -100%); white-space: nowrap;">
              <span>${emoji}</span>
              <span style="color: #374151;">${adjustedTime}초</span>
            </div>
          `;
        } else {
          // 데이터가 없을 때 (대기중)
          htmlContent = `
            <div style="background: #9ca3af; border: 2px solid #4b5563; border-radius: 12px; padding: 4px 8px; box-shadow: 0 4px 10px rgba(0,0,0,0.15); display: flex; align-items: center; gap: 4px; font-weight: 900; font-size: 11px; color: white; transform: translate(-50%, -100%); white-space: nowrap;">
              ⚪ 대기중
            </div>
          `;
        }

        const marker = new window.Tmapv3.Marker({
          position: new window.Tmapv3.LatLng(intersection.lat, intersection.lng),
          map: tmapRef.current,
          iconHTML: htmlContent,
        });

        newMarkers.push(marker);
      });

      markersRef.current = newMarkers;
    };

    updateSignals();
    const interval = setInterval(updateSignals, 1000);
    return () => clearInterval(interval);
  }, [activeIntersections]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 relative">
      {/* 💡 상단 헤더 (독립된 페이지로 구성, 탭 제거) */}
      <div className="p-4 bg-white border-b flex items-center gap-3 z-10 shadow-sm">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="size-5" />
        </button>
        <h2 className="font-black text-lg text-slate-800 mb-0">{routeInfo?.name || "로딩 중..."}</h2>
      </div>

      {/* TMAP 영역 */}
      <div className="flex-1 w-full relative z-0">
        <div id={mapContainerId} className="w-full h-full" />
      </div>

      {/* 📊 하단 패널: 통계 및 러닝 시작 버튼 (기존 로직 및 레이아웃 유지 + 디자인 업그레이드) */}
      <div className="absolute bottom-6 left-4 right-4 z-[1000] flex flex-col gap-3">
        <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl shadow-xl border border-slate-100 flex justify-between items-center px-6">
          <div className="text-center">
            <p className="text-[11px] text-slate-500 font-medium mb-0.5">총 길이</p>
            <p className="font-black text-lg text-slate-800">{stats.length}km</p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-center">
            <p className="text-[11px] text-slate-500 font-medium mb-0.5">거치는 교차로</p>
            <p className="font-black text-lg text-slate-800">{stats.intersectionCount}곳</p>
          </div>
          <div className="h-8 w-px bg-slate-200"></div>
          <div className="text-center">
            <p className="text-[11px] text-slate-500 font-medium mb-0.5">무정지율</p>
            <p className="font-black text-lg text-indigo-600">{stats.successRate}%</p>
          </div>
        </div>

        <button
          onClick={() => navigate("/tracking", { state: { routeInfo } })}
          className="w-full bg-indigo-600 text-white font-black text-lg py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <Play className="size-5 fill-white" />
          러닝 시작하기
        </button>
      </div>
    </div>
  );
}