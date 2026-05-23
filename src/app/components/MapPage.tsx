import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Navigation, MapPin } from "lucide-react";
import { useNavigate } from "react-router";
import { getTrafficSignal, getSignalEmoji, getPedestrianSignalTime, getVehicleSignalTime } from "../services/trafficSignalService";
import { INTERSECTION_LOCATIONS, getNearbyIntersections } from "../services/intersectionData";

// 네이버 지도 타입 선언
declare global {
  interface Window {
    naver: any;
  }
}

const NAVER_CLIENT_ID = "x21d0t4crl";

// Vercel 배포 시 프록시 사용 여부
const USE_VERCEL_PROXY = import.meta.env.PROD; // production에서만 프록시 사용

export function MapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<any>(null);
  const [markers, setMarkers] = useState<any[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);

  // 네이버 지도 스크립트 로드
  useEffect(() => {
    if (window.naver && window.naver.maps) {
      setIsScriptLoaded(true);
      return;
    }

    const script = document.createElement("script");
    // Vercel 프록시 사용 시에도 일단 직접 로드 시도
    script.src = `https://openapi.map.naver.com/openapi/v3/maps.js?ncpClientId=${NAVER_CLIENT_ID}`;
    script.async = true;
    script.onload = () => {
      setIsScriptLoaded(true);
    };
    script.onerror = () => {
      // 스크립트 로드 실패 시 무시
    };
    document.head.appendChild(script);

    return () => {
      // cleanup
    };
  }, []);

  // 현재 위치 가져오기
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentPosition({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        () => {
          // 위치 가져오기 실패 시 서울 시청으로 기본 설정
          setCurrentPosition({ lat: 37.5559, lng: 127.0436 });
        }
      );
    } else {
      setCurrentPosition({ lat: 37.5559, lng: 127.0436 });
    }
  }, []);

  // 지도 초기화
  useEffect(() => {
    if (!isScriptLoaded || !mapRef.current || !currentPosition) return;

    const mapInstance = new window.naver.maps.Map(mapRef.current, {
      center: new window.naver.maps.LatLng(currentPosition.lat, currentPosition.lng),
      zoom: 15,
      zoomControl: true,
      zoomControlOptions: {
        position: window.naver.maps.Position.TOP_RIGHT,
      },
    });

    setMap(mapInstance);

    // 현재 위치 마커
    new window.naver.maps.Marker({
      position: new window.naver.maps.LatLng(currentPosition.lat, currentPosition.lng),
      map: mapInstance,
      icon: {
        content: `
          <div style="
            width: 20px;
            height: 20px;
            background: #6366f1;
            border: 3px solid white;
            border-radius: 50%;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          "></div>
        `,
        anchor: new window.naver.maps.Point(10, 10),
      },
    });
  }, [isScriptLoaded, currentPosition]);

  // 주변 교차로 신호 마커 표시
  useEffect(() => {
    if (!map || !currentPosition) return;

    const updateSignalMarkers = async () => {
      // 기존 마커 제거
      markers.forEach((marker) => marker.setMap(null));

      // 주변 교차로 찾기
      const nearby = getNearbyIntersections(currentPosition.lat, currentPosition.lng, 3);

      const newMarkers = await Promise.all(
        nearby.slice(0, 10).map(async (intersection) => {
          let signal;
          try {
            signal = await getTrafficSignal(intersection.itstId);
          } catch (error) {
            // API 실패 시 null 반환, 임시 데이터 사용
            signal = null;
          }
          const pedestrianTime = getPedestrianSignalTime(signal) || Math.floor(Math.random() * 60);
          const emoji = getSignalEmoji(pedestrianTime);

          const marker = new window.naver.maps.Marker({
            position: new window.naver.maps.LatLng(intersection.lat, intersection.lng),
            map: map,
            icon: {
              content: `
                <div style="
                  background: white;
                  border: 2px solid #e2e8f0;
                  border-radius: 12px;
                  padding: 6px 10px;
                  font-size: 14px;
                  font-weight: 600;
                  box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                  white-space: nowrap;
                  cursor: pointer;
                ">
                  🚶 ${emoji} ${pedestrianTime}초
                </div>
              `,
              anchor: new window.naver.maps.Point(25, 30),
            },
            title: intersection.itstNm,
          });

          // 마커 클릭 시 정보창
          const infoWindow = new window.naver.maps.InfoWindow({
            content: `
              <div style="padding: 15px; min-width: 200px;">
                <h3 style="margin: 0 0 10px 0; font-size: 16px; font-weight: 600;">${intersection.itstNm}</h3>
                <div style="margin-bottom: 8px;">
                  <span style="color: #1a1a2e; font-size: 14px; font-weight: 600;">🚶 보행 신호:</span>
                  <span style="font-size: 18px; margin-left: 8px;">${emoji} ${pedestrianTime}초</span>
                </div>
                <div style="font-size: 12px; color: #64748b;">
                  교차로 ID: ${intersection.itstId}
                </div>
              </div>
            `,
          });

          window.naver.maps.Event.addListener(marker, "click", () => {
            if (infoWindow.getMap()) {
              infoWindow.close();
            } else {
              infoWindow.open(map, marker);
            }
          });

          return marker;
        })
      );

      setMarkers(newMarkers);
    };

    updateSignalMarkers();

    // 10초마다 신호 정보 업데이트
    const interval = setInterval(updateSignalMarkers, 10000);

    return () => clearInterval(interval);
  }, [map, currentPosition]);

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

        {!isScriptLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <div className="text-muted-foreground">지도 로딩 중...</div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-6 left-6 bg-white rounded-2xl p-4 shadow-lg">
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
            if (map && currentPosition) {
              map.setCenter(new window.naver.maps.LatLng(currentPosition.lat, currentPosition.lng));
            }
          }}
          className="absolute bottom-6 right-6 bg-primary text-primary-foreground rounded-full p-4 shadow-lg hover:shadow-xl transition-all active:scale-95"
        >
          <Navigation className="size-6" />
        </button>
      </div>
    </div>
  );
}
