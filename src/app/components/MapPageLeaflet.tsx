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

// TMAP API를 TypeScript에서 에러 없이 사용하기 위한 전역 타입 선언
declare global {
  interface Window {
    Tmapv3: any;
  }
}

export function MapPageTmap() {
  const navigate = useNavigate();
  // TMAP은 DOM의 ID 문자열을 기반으로 지도를 생성합니다.
  const mapContainerId = "tmap-container";
  const tmapRef = useRef<any>(null);
  const [, setMarkers] = useState<any[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);

  // 현재 위치 가져오기 (브라우저 Geolocation) - 기존과 동일
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

  // TMAP 지도 초기화
  useEffect(() => {
    if (!currentPosition || tmapRef.current || !window.Tmapv3) return;

    // 1. 지도 생성
    const map = new window.Tmapv3.Map(mapContainerId, {
      center: new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng),
      zoom: 15,
      zoomControl: false, // 필요시 true로 변경
    });
    tmapRef.current = map;

    // 2. 내 위치 마커 생성 (iconHTML로 커스텀 디자인 적용)
    new window.Tmapv3.Marker({
      position: new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng),
      map: map,
      iconHTML: `
        <div style="
          width: 20px;
          height: 20px;
          background: #6366f1;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          transform: translate(-50%, -50%);
        "></div>
      `,
    });

  }, [currentPosition]);

  // 💡 백엔드 최적화 반영: 10초 주기로 대량 데이터셋 기동 갱신 (기존과 동일)
  useEffect(() => {
    updateAllSignals();
    const interval = setInterval(updateAllSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  // 주변 교차로 횡단보도 마커 매핑 및 1초 단위 시간 정밀 카운트다운
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null); // TMAP Popup(InfoWindow) 관리용 Ref

  useEffect(() => {
    if (!tmapRef.current || !currentPosition) return;

    // 팝업 창이 없다면 하나 생성해 둡니다 (재사용 목적)
    if (!infoWindowRef.current) {
      infoWindowRef.current = new window.Tmapv3.InfoWindow({
        type: 2, // 꼬리가 있는 팝업 형태
        border: '0px solid #FF0000',
        background: false,
        visible: false, // 처음엔 숨김
        map: tmapRef.current
      });
    }

    const updateSignalMarkers = () => {
      // 기존 마커 청소 (TMAP은 remove 대신 setMap(null)을 사용합니다)
      markersRef.current.forEach((marker) => marker.setMap(null));
      const newMarkers: any[] = [];

      // 반경 3km 내 주변 교차로 수집
      const nearby = getNearbyIntersections(currentPosition.lat, currentPosition.lng, 3);

      nearby.slice(0, 15).forEach(intersection => {
        const signal = getSignalFromCache(intersection.itstId);
        if (!signal) return;

        const timeOffsetSeconds = signal.trsmUtcTime ? (Date.now() - signal.trsmUtcTime) / 1000 : 0;

        const directions = [
          { key: 'ntPdsgRmdrCs', name: '북쪽', latOffset: 0.0003, lngOffset: 0, emoji: '↑' },
          { key: 'stPdsgRmdrCs', name: '남쪽', latOffset: -0.0003, lngOffset: 0, emoji: '↓' },
          { key: 'etPdsgRmdrCs', name: '동쪽', latOffset: 0, lngOffset: 0.0003, emoji: '→' },
          { key: 'wtPdsgRmdrCs', name: '서쪽', latOffset: 0, lngOffset: -0.0003, emoji: '←' },
        ];

        directions.forEach(dir => {
          const rawTimeCs = signal[dir.key as keyof typeof signal];
          if (rawTimeCs === undefined || rawTimeCs === null) return;

          const baseTime = centiSecondsToSeconds(rawTimeCs as number);
          const adjustedTime = Math.max(0, Math.round(baseTime - timeOffsetSeconds));
          const emoji = getSignalEmoji(adjustedTime);

          const latLng = new window.Tmapv3.LatLng(intersection.lat + dir.latOffset, intersection.lng + dir.lngOffset);

          // TMAP 마커 생성 (HTML 커스텀 아이콘)
          const marker = new window.Tmapv3.Marker({
            position: latLng,
            map: tmapRef.current,
            // Leaflet의 iconAnchor 대신 CSS transform을 사용하여 중심점을 맞춥니다.
            iconHTML: `
              <div style="
                background: white;
                border: 2px solid #333;
                border-radius: 8px;
                padding: 6px 10px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                text-align: center;
                min-width: 50px;
                transform: translate(-50%, -100%);
              ">
                <div style="font-size: 14px; margin-bottom: 2px;">${dir.emoji}</div>
                <div style="font-size: 18px; margin-bottom: 2px;">${emoji}</div>
                <div style="font-weight: bold; font-size: 14px;">${adjustedTime}초</div>
              </div>
            `
          });

          // 마커 클릭 시 팝업 띄우기 로직 (Leaflet의 bindPopup 대체)
          marker.on("Click", () => {
            const popupContent = `
              <div style="padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -100%); margin-top: -20px; white-space: nowrap;">
                <strong style="font-size: 14px;">${intersection.itstNm}</strong><br>
                <span style="font-size: 16px;">${dir.emoji} ${dir.name} 횡단보도</span><br>
                <div style="margin-top: 8px; font-size: 18px;">
                  ${emoji} <strong>${adjustedTime}초</strong> 남음
                </div>
                <div style="margin-top: 4px; color: #666; font-size: 12px;">
                  ${adjustedTime > 20 ? '✅ 지금 건너세요!' : adjustedTime > 0 ? '⚠️ 서두르세요!' : '🛑 대기하세요'}
                </div>
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

    updateSignalMarkers();

    // 💡 1초 단위로 오차 연산 및 마커 갱신
    const interval = setInterval(updateSignalMarkers, 1000);
    return () => clearInterval(interval);
  }, [currentPosition]); // tmapRef.current는 참조값이므로 의존성 배열에서 제외하여 불필요한 재실행 방지

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-border px-6 py-4 z-10">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-secondary rounded-full">
            <ArrowLeft className="size-6" />
          </button>
          <div className="flex-1">
            <h2 className="mb-0">실시간 신호 지도 (TMAP)</h2>
            <p className="text-sm text-muted-foreground">주변 교차로 신호 정보</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {/* TMAP이 렌더링될 div 컨테이너. id값이 필수입니다. */}
        <div id={mapContainerId} className="w-full h-full" />

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
            if (tmapRef.current && currentPosition) {
              // TMAP의 위치 이동 함수
              tmapRef.current.setCenter(new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng));
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