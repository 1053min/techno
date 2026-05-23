import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Navigation, Play } from "lucide-react";
import { useNavigate } from "react-router";
import {
  updateAllSignals,
  getSignalFromCache,
  getSignalEmoji,
  centiSecondsToSeconds,
} from "../services/trafficSignalService";
import { getNearbyIntersections } from "../services/intersectionData";

declare global {
  interface Window {
    Tmapv3: any;
  }
}

export function RouteMapPage() {
  const navigate = useNavigate();
  const mapContainerId = "route-tmap-container";
  const tmapRef = useRef<any>(null);
  const [, setMarkers] = useState<any[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      setCurrentPosition({ lat: 37.5559, lng: 127.0436 });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({ lat: position.coords.latitude, lng: position.coords.longitude });
      },
      () => { setCurrentPosition({ lat: 37.5559, lng: 127.0436 }); },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  useEffect(() => {
    if (!currentPosition || tmapRef.current || !window.Tmapv3) return;

    const map = new window.Tmapv3.Map(mapContainerId, {
      center: new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng),
      zoom: 15,
      zoomControl: false,
    });
    tmapRef.current = map;

    // 내 위치 마커
    new window.Tmapv3.Marker({
      position: new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng),
      map: map,
      iconHTML: `<div style="width: 20px; height: 20px; background: #6366f1; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -50%);"></div>`,
    });

    // 추천 러닝 코스 가이드 선
    const routePaths = [
      new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng),
      new window.Tmapv3.LatLng(currentPosition.lat + 0.002, currentPosition.lng + 0.002),
      new window.Tmapv3.LatLng(currentPosition.lat + 0.004, currentPosition.lng + 0.001),
      new window.Tmapv3.LatLng(currentPosition.lat + 0.005, currentPosition.lng + 0.004),
    ];

    new window.Tmapv3.Polyline({
      path: routePaths,
      strokeColor: "#16a34a",
      strokeWeight: 6,
      strokeStyle: "solid",
      map: map,
    });
  }, [currentPosition]);

  useEffect(() => {
    updateAllSignals();
    const interval = setInterval(updateAllSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!tmapRef.current || !currentPosition) return;

    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.Tmapv3.InfoWindow({
        type: 2,
        border: '0px solid #FF0000',
        background: false,
        visible: false,
        map: tmapRef.current
      });
    }

    const updateRouteSignalMarkers = () => {
      markersRef.current.forEach((marker) => marker.setMap(null));
      const newMarkers: any[] = [];
      const nearby = getNearbyIntersections(currentPosition.lat, currentPosition.lng, 3);

      nearby.slice(0, 12).forEach(intersection => {
        const signal = getSignalFromCache(intersection.itstId);
        if (!signal) return;

        const timeOffsetSeconds = signal.trsmUtcTime ? (Date.now() - signal.trsmUtcTime) / 1000 : 0;
        const directions = [
          { key: 'ntPdsgRmdrCs', name: '북쪽', latOffset: 0.0002, lngOffset: 0, emoji: '↑' },
          { key: 'stPdsgRmdrCs', name: '남쪽', latOffset: -0.0002, lngOffset: 0, emoji: '↓' },
          { key: 'etPdsgRmdrCs', name: '동쪽', latOffset: 0, lngOffset: 0.0002, emoji: '→' },
          { key: 'wtPdsgRmdrCs', name: '서쪽', latOffset: 0, lngOffset: -0.0002, emoji: '←' },
        ];

        directions.forEach(dir => {
          const rawTimeCs = signal[dir.key as keyof typeof signal];
          if (rawTimeCs === undefined || rawTimeCs === null) return;

          const baseTime = centiSecondsToSeconds(rawTimeCs as number);
          const adjustedTime = Math.max(0, Math.round(baseTime - timeOffsetSeconds));
          const emoji = getSignalEmoji(adjustedTime);
          const latLng = new window.Tmapv3.LatLng(intersection.lat + dir.latOffset, intersection.lng + dir.lngOffset);

          const marker = new window.Tmapv3.Marker({
            position: latLng,
            map: tmapRef.current,
            iconHTML: `
              <div style="background: white; border: 2px solid #16a34a; border-radius: 8px; padding: 6px 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); text-align: center; min-width: 50px; transform: translate(-50%, -100%);">
                <div style="font-size: 11px; color: #16a34a; font-weight: bold; margin-bottom: 1px;">추천코스</div>
                <div style="font-size: 15px; margin-bottom: 2px;">${emoji} ${adjustedTime}초</div>
              </div>
            `
          });

          marker.on("Click", () => {
            const popupContent = `
              <div style="padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -100%); margin-top: -20px; white-space: nowrap;">
                <strong style="font-size: 14px; color: #16a34a;">🏃‍♂️ 코스 내 교차로</strong><br>
                <strong style="font-size: 14px;">${intersection.itstNm}</strong><br>
                <span style="font-size: 15px;">${dir.emoji} ${dir.name} 횡단보도</span><br>
                <div style="margin-top: 8px; font-size: 18px;">${emoji} <strong>${adjustedTime}초</strong> 남음</div>
              </div>
            `;
            infoWindowRef.current.setContent(popupContent);
            infoWindowRef.current.setPosition(latLng);
            infoWindowRef.current.setVisible(true);
          });
          newMarkers.push(marker);
        });
      });
      setMarkers(newMarkers);
      markersRef.current = newMarkers;
    };

    updateRouteSignalMarkers();
    const interval = setInterval(updateRouteSignalMarkers, 1000);
    return () => clearInterval(interval);
  }, [currentPosition]);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-border px-6 py-4 z-10">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-full">
            <ArrowLeft className="size-6" />
          </button>
          <div className="flex-1">
            <h2 className="mb-0">추천 러닝 코스 지도</h2>
            <p className="text-sm text-muted-foreground">코스 선 위의 실시간 신호등 예측</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div id={mapContainerId} className="w-full h-full" />

        {/* 좌측 하단 보드 */}
        <div className="absolute bottom-28 left-6 bg-white rounded-2xl p-4 shadow-lg z-[1000]">
          <div className="text-sm font-medium mb-2 text-emerald-600">🟢 러닝 코스 연동 중</div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><span>🟢</span><span>초록불 (진입 가능)</span></div>
            <div className="flex items-center gap-2"><span>🔴</span><span>빨간불 (서행/대기)</span></div>
          </div>
        </div>

        {/* 현위치 버튼 */}
        <button
          onClick={() => {
            if (tmapRef.current && currentPosition) {
              tmapRef.current.setCenter(new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng));
            }
          }}
          className="absolute bottom-28 right-6 bg-white border border-border rounded-full p-4 shadow-md z-[1000]"
        >
          <Navigation className="size-6 text-primary" />
        </button>

        {/* 🚀 화면 최하단 플로팅 '러닝 시작' 버튼 */}
        <div className="absolute bottom-8 left-0 right-0 flex justify-center px-6 z-[1000]">
          <button
            onClick={() => navigate("/tracking")} 
            className="w-full max-w-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5"
          >
            <Play className="size-5 fill-white" />
            이 코스로 러닝 시작
          </button>
        </div>
      </div>
    </div>
  );
}