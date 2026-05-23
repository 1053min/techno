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

// TMAP API TypeScript 선언
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

  // 1. 현재 사용자 위치 추적 (기존 fallback 유지)
  useEffect(() => {
    if (!navigator.geolocation) {
      setCurrentPosition({ lat: 37.5559, lng: 127.0436 });
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  // 2. TMAP 지도 초기화 및 추천 러닝 경로(Polyline) 그리기
  useEffect(() => {
    if (!currentPosition || tmapRef.current || !window.Tmapv3) return;

    // 지도 생성
    const map = new window.Tmapv3.Map(mapContainerId, {
      center: new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng),
      zoom: 15,
      zoomControl: false,
    });
    tmapRef.current = map;

    // 사용자 현위치 마커
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

    // 💡 [MVP 드로잉 러닝 원칙] 기획안에 맞춰 가상의 러닝 추천 코스(선)를 지도에 그려줍니다.
    // 향후 전달해주실 실제 GPX 파일 데이터 구조가 이 배열 자리에 치환되어 들어갈 예정입니다.
    const routePaths = [
      new window.Tmapv3.LatLng(currentPosition.lat, currentPosition.lng),
      new window.Tmapv3.LatLng(currentPosition.lat + 0.002, currentPosition.lng + 0.002),
      new window.Tmapv3.LatLng(currentPosition.lat + 0.004, currentPosition.lng + 0.001),
      new window.Tmapv3.LatLng(currentPosition.lat + 0.005, currentPosition.lng + 0.004),
    ];

    new window.Tmapv3.Polyline({
      path: routePaths,
      strokeColor: "#22c55e", // 러닝 코스는 스포티한 초록색 선으로 표현
      strokeWeight: 6,
      strokeStyle: "solid",
      map: map,
    });

  }, [currentPosition]);

  // 3. 백엔드 최적화: 10초 주기 전체 신호 대량 데이터 동기화
  useEffect(() => {
    updateAllSignals();
    const interval = setInterval(updateAllSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  // 4. 경로 주변 신호등 마커 바인딩 및 1초 단위 실시간 오차 보정 타이머
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

      // 코스 주변(반경 3km 내) 교차로 정보 로드
      const nearby = getNearbyIntersections(currentPosition.lat, currentPosition.lng, 3);

      nearby.slice(0, 12).forEach(intersection => {
        const signal = getSignalFromCache(intersection.itstId);
        if (!signal) return;

        // 서버 전송 시간 격차 정밀 오차 연산
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

          // 상단에 반응 잘했던 컴포넌트 마커 UI 디자인 완벽 계승
          const marker = new window.Tmapv3.Marker({
            position: latLng,
            map: tmapRef.current,
            iconHTML: `
              <div style="
                background: white;
                border: 2px solid #16a34a;
                border-radius: 8px;
                padding: 6px 10px;
                box-shadow: 0 2px 6px rgba(0,0,0,0.2);
                text-align: center;
                min-width: 50px;
                transform: translate(-50%, -100%);
              ">
                <div style="font-size: 13px; color: #16a34a; font-weight: bold; margin-bottom: 1px;">코스추천</div>
                <div style="font-size: 16px; margin-bottom: 2px;">${emoji} ${adjustedTime}초</div>
              </div>
            `
          });

          // 마커 클릭 시 상단 레이아웃과 일치하는 오차 검증 팝업 오픈
          marker.on("Click", () => {
            const popupContent = `
              <div style="padding: 12px; background: white; border-radius: 8px; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -100%); margin-top: -20px; white-space: nowrap;">
                <strong style="font-size: 14px; color: #16a34a;">🏃‍♂️ 추천 코스 내 교차로</strong><br>
                <strong style="font-size: 14px;">${intersection.itstNm}</strong><br>
                <span style="font-size: 15px;">${dir.emoji} ${dir.name} 횡단보도</span><br>
                <div style="margin-top: 8px; font-size: 18px;">
                  ${emoji} <strong>${adjustedTime}초</strong> 남음
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

    updateRouteSignalMarkers();

    const interval = setInterval(updateRouteSignalMarkers, 1000);
    return () => clearInterval(interval);
  }, [currentPosition]);

  return (
    <div className="h-screen flex flex-col">
      {/* 상단 네비게이션 바 디자인 통일 */}
      <div className="bg-white border-b border-border px-6 py-4 z-10">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-secondary rounded-full">
            <ArrowLeft className="size-6" />
          </button>
          <div className="flex-1">
            <h2 className="mb-0">추천 러닝 코스 지도</h2>
            <p className="text-sm text-muted-foreground">코스 선 위의 실시간 신호등 예측</p>
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        {/* TMAP 컨테이너 레이어 */}
        <div id={mapContainerId} className="w-full h-full" />

        {/* 좌측 하단 신호 요약 보드 */}
        <div className="absolute bottom-6 left-6 bg-white rounded-2xl p-4 shadow-lg z-[1000]">
          <div className="text-sm font-medium mb-3 text-emerald-600">🟢 러닝 코스 연동 중</div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2">
              <span>🟢</span><span>초록불 (진입 가능)</span>
            </div>
            <div className="flex items-center gap-2">
              <span>🔴</span><span>빨간불 (서행/대기)</span>
            </div>
          </div>
        </div>

        {/* 현위치 리센터 버튼 */}
        <button
          onClick={() => {
            if (tmapRef.current && currentPosition) {
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