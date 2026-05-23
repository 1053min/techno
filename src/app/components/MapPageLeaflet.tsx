import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Navigation } from "lucide-react";
import { useNavigate } from "react-router";
import {
  updateAllSignals,
  getSignalFromCache,
  getSignalEmoji,
  centiSecondsToSeconds,
} from "../services/trafficSignalService";
import { INTERSECTION_LOCATIONS, getNearbyIntersections } from "../services/intersectionData";
declare global {
  interface Window {
    Tmapv2: any;
  }
}

export function MapPageLeaflet() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMapRef = useRef<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  // 현재 위치 가져오기 (브라우저 Geolocation)
  useEffect(() => {
    if (!navigator.geolocation) {
      setCurrentPosition({ lat: 37.5559, lng: 127.0436 });  // 한양대학교
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCurrentPosition({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        setCurrentPosition({ lat: 37.5559, lng: 127.0436 });  // 한양대학교
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
    if (!window.Tmapv2) return; // 티맵 스크립트 로드 확인

    // TMAP 지도 객체 생성
    const map = new window.Tmapv2.Map(mapRef.current, {
      center: new window.Tmapv2.LatLng(currentPosition.lat, currentPosition.lng),
      width: "100%",
      height: "100%",
      zoom: 15,
      zoomControl: true,
      scrollwheel: true
    });

    leafletMapRef.current = map;

    // 현재 위치 서클/마커 표시 (HTML 커스텀 핀)
    const currentLocationMarker = new window.Tmapv2.Marker({
      position: new window.Tmapv2.LatLng(currentPosition.lat, currentPosition.lng),
      iconHTML: `
        <div style="
          width: 20px;
          height: 20px;
          background: #6366f1;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      `,
      map: map
    });

    return () => {
      // 언마운트 시 필요에 따라 초기화 처리
    };
  }, [currentPosition]);

  // 전체 신호 데이터 로드
  useEffect(() => {
    updateAllSignals();  // 최초 로드

    const interval = setInterval(updateAllSignals, 300000);  // 5분마다 업데이트

    return () => clearInterval(interval);
  }, []);

  // 주변 교차로 횡단보도 마커 표시
  const markersRef = useRef<L.Marker[]>([]);
  useEffect(() => {
    if (!leafletMapRef.current || !currentPosition) return;

    const updateSignalMarkers = () => {
      // 기존 마커 전체 삭제
      markersRef.current.forEach((marker) => marker.setMap(null));

      const newMarkers: any[] = [];
      const nearby = getNearbyIntersections(currentPosition.lat, currentPosition.lng, 3);

      nearby.slice(0, 15).forEach(intersection => {
        const signal = getSignalFromCache(intersection.itstId);
        if (!signal) return;

        const directions = [
          { key: 'ntPdsgRmdrCs', name: '북쪽', latOffset: 0.0003, lngOffset: 0, emoji: '↑' },
          { key: 'stPdsgRmdrCs', name: '남쪽', latOffset: -0.0003, lngOffset: 0, emoji: '↓' },
          { key: 'etPdsgRmdrCs', name: '동쪽', latOffset: 0, lngOffset: 0.0003, emoji: '→' },
          { key: 'wtPdsgRmdrCs', name: '서쪽', latOffset: 0, lngOffset: -0.0003, emoji: '←' },
        ];

        directions.forEach(dir => {
          const timeCs = signal[dir.key];
          if (!timeCs || timeCs === null) return;

          const time = centiSecondsToSeconds(timeCs);
          const emoji = getSignalEmoji(time);

          // TMAP 규격에 맞는 HTML 커스텀 마커 빌드
          const marker = new window.Tmapv2.Marker({
            position: new window.Tmapv2.LatLng(intersection.lat + dir.latOffset, intersection.lng + dir.lngOffset),
            iconHTML: `
              <div style="background: white; border: 2px solid #333; border-radius: 8px; padding: 6px 10px; box-shadow: 0 2px 6px rgba(0,0,0,0.2); text-align: center; min-width: 50px;">
                <div style="font-size: 14px; margin-bottom: 2px;">${dir.emoji}</div>
                <div style="font-size: 18px; margin-bottom: 2px;">${emoji}</div>
                <div style="font-weight: bold; font-size: 14px;">${time}초</div>
              </div>
            `,
            map: leafletMapRef.current
          });

          newMarkers.push(marker);
        });
      });

      setMarkers(newMarkers);
      markersRef.current = newMarkers;
    };

    updateSignalMarkers();

    // 10초마다 마커 업데이트 (캐시에서 조회이므로 빠름)
    const interval = setInterval(updateSignalMarkers, 10000);

    return () => clearInterval(interval);
  }, [leafletMapRef.current, currentPosition]);

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
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

      {/* Map */}
      <div className="flex-1 relative">
        <div ref={mapRef} className="w-full h-full" />

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-white rounded-2xl p-4 shadow-lg z-[1000]">
          <div className="text-sm font-medium mb-3">신호 상태</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🟢</span>
              <span>초록불 (20초 이상)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🟡</span>
              <span>곧 바뀜 (1-20초)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔴</span>
              <span>빨간불 (0초)</span>
            </div>
          </div>
        </div>

        {/* Floating Action Button */}
        <button
          onClick={() => {
            if (leafletMapRef.current && currentPosition) {
              leafletMapRef.current.setCenter(new window.Tmapv2.LatLng(currentPosition.lat, currentPosition.lng));
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
