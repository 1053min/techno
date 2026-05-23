import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Navigation } from "lucide-react";
import { useNavigate } from "react-router";
import {
  updateAllSignals,
  getSignalFromCache,
  getSignalEmoji,
  centiSecondsToSeconds,
} from "../services/trafficSignalService";
import { getNearbyIntersections } from "../services/intersectionData";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export function MapPageLeaflet() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const [, setMarkers] = useState<L.Marker[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  // 현재 위치 가져오기 (브라우저 Geolocation)
  useEffect(() => {
    if (!navigator.geolocation) {
      setCurrentPosition({ lat: 37.5559, lng: 127.0436 }); // 한양대학교 fallback
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        setCurrentPosition({ lat: 37.5559, lng: 127.0436 });
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  // Leaflet 지도 초기화
  useEffect(() => {
    if (!mapRef.current || !currentPosition || leafletMapRef.current) return;

    const map = L.map(mapRef.current).setView([currentPosition.lat, currentPosition.lng], 15);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    const currentLocationIcon = L.divIcon({
      html: `
        <div style="
          width: 20px;
          height: 20px;
          background: #6366f1;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      `,
      className: "",
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });

    L.marker([currentPosition.lat, currentPosition.lng], { icon: currentLocationIcon }).addTo(map);
    leafletMapRef.current = map;

    return () => {
      map.remove();
      leafletMapRef.current = null;
    };
  }, [currentPosition]);

  // 💡 백엔드 최적화 반영: 10초 주기로 대량 데이터셋 기동 갱신
  useEffect(() => {
    updateAllSignals(); 
    const interval = setInterval(updateAllSignals, 10000); 
    return () => clearInterval(interval);
  }, []);

  // 주변 교차로 횡단보도 마커 매핑 및 1초 단위 시간 정밀 카운트다운
  const markersRef = useRef<L.Marker[]>([]);
  useEffect(() => {
    if (!leafletMapRef.current || !currentPosition) return;

    const updateSignalMarkers = () => {
      // 기존 마커 청소
      markersRef.current.forEach((marker) => marker.remove());
      const newMarkers: L.Marker[] = [];

      // 반경 3km 내 주변 교차로 수집
      const nearby = getNearbyIntersections(currentPosition.lat, currentPosition.lng, 3);

      nearby.slice(0, 15).forEach(intersection => {
        const signal = getSignalFromCache(intersection.itstId);
        if (!signal) return;

        // 💡 절대 시간 검증 원칙: 서버가 데이터를 만든 시점과 클라이언트의 현재 시간 격차 보정 계산
        const timeOffsetSeconds = signal.trsmUtcTime ? (Date.now() - signal.trsmUtcTime) / 1000 : 0;

        const directions = [
          { key: 'ntPdsgRmdrCs', name: '북쪽', latOffset: 0.0003, lngOffset: 0, emoji: '↑' },
          { key: 'stPdsgRmdrCs', name: '남쪽', latOffset: -0.0003, lngOffset: 0, emoji: '↓' },
          { key: 'etPdsgRmdrCs', name: '동쪽', latOffset: 0, lngOffset: 0.0003, emoji: '→' },
          { key: 'wtPdsgRmdrCs', name: '서쪽', latOffset: 0, lngOffset: -0.0003, emoji: '←' },
        ];

        directions.forEach(dir => {
          const rawTimeCs = signal[dir.key];
          if (rawTimeCs === undefined || rawTimeCs === null) return; // Null 처리 원칙 반영

          // 💡 오차가 정밀 보정된 리얼 잔여 시간 산출 (0초 이하로 떨어지지 않게 방어)
          const baseTime = centiSecondsToSeconds(rawTimeCs);
          const adjustedTime = Math.max(0, Math.round(baseTime - timeOffsetSeconds));

          const emoji = getSignalEmoji(adjustedTime);

          const crosswalkIcon = L.divIcon({
            html: `
              <div style="
                background: white;
                border: 2px solid #333;
                border-radius: 8px;
                padding: 6px 10px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                text-align: center;
                min-width: 50px;
              ">
                <div style="font-size: 14px; margin-bottom: 2px;">${dir.emoji}</div>
                <div style="font-size: 18px; margin-bottom: 2px;">${emoji}</div>
                <div style="font-weight: bold; font-size: 14px;">${adjustedTime}초</div>
              </div>
            `,
            className: "",
            iconSize: [50, 70],
            iconAnchor: [25, 35],
          });

          const marker = L.marker(
            [intersection.lat + dir.latOffset, intersection.lng + dir.lngOffset],
            { icon: crosswalkIcon }
          ).addTo(leafletMapRef.current!);

          marker.bindPopup(`
            <div style="padding: 12px;">
              <strong style="font-size: 14px;">${intersection.itstNm}</strong><br>
              <span style="font-size: 16px;">${dir.emoji} ${dir.name} 횡단보도</span><br>
              <div style="margin-top: 8px; font-size: 18px;">
                ${emoji} <strong>${adjustedTime}초</strong> 남음
              </div>
              <div style="margin-top: 4px; color: #666; font-size: 12px;">
                ${adjustedTime > 20 ? '✅ 지금 건너세요!' : adjustedTime > 0 ? '⚠️ 서두르세요!' : '🛑 대기하세요'}
              </div>
            </div>
          `);

          newMarkers.push(marker);
        });
      });

      setMarkers(newMarkers);
      markersRef.current = newMarkers;
    };

    updateSignalMarkers();

    // 💡 1초 단위로 오차 연산 및 마커 가시화 재연산 (클라이언트 부하 없음)
    const interval = setInterval(updateSignalMarkers, 1000);

    return () => clearInterval(interval);
  }, [leafletMapRef.current, currentPosition]);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-border px-6 py-4 z-10">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-secondary rounded-full">
            <ArrowLeft className="size-6" />
          </button>
          <div className="flex-1">
            <h2 className="mb-0">실시간 신호 지도</h2>
            <p className="text-sm text-muted-foreground">주변 교차로 신호 정보</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        <div className="absolute bottom-6 left-6 bg-white rounded-2xl p-4 shadow-lg z-[1000]">
          <div className="text-sm font-medium mb-3">신호 상태</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🟢</span>
              <span>초록불 (10초 초과)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟡</span>
              <span>곧 바뀜 (1-10초)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔴</span>
              <span>빨간불 (0초)</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            if (leafletMapRef.current && currentPosition) {
              leafletMapRef.current.setView([currentPosition.lat, currentPosition.lng], 15);
            }
          }}
          className="absolute bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:shadow-xl transition-all active:scale-95 z-[1000]"
        >
          <Navigation className="size-6" />
        </button>
      </div>
    </div>
  );
}