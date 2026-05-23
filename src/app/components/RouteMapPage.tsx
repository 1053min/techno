import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Navigation, Play, MapPin } from "lucide-react";
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

// 💡 잠실 코스까지 완벽하게 통합된 데이터셋
const COURSE_DATA = {
  hanyang: {
    name: "한양대 코스",
    center: { lat: 37.5559, lng: 127.0436 },
    path: [
      { lat: 37.5559, lng: 127.0436 },
      { lat: 37.5575, lng: 127.0460 },
      { lat: 37.5545, lng: 127.0485 },
      { lat: 37.5520, lng: 127.0445 },
      { lat: 37.5535, lng: 127.0405 },
      { lat: 37.5559, lng: 127.0436 },
    ]
  },
  hanriver: {
    name: "한강 코스",
    center: { lat: 37.5284, lng: 127.0682 },
    path: [
      { lat: 37.5284, lng: 127.0682 },
      { lat: 37.5310, lng: 127.0640 },
      { lat: 37.5345, lng: 127.0675 },
      { lat: 37.5315, lng: 127.0725 },
      { lat: 37.5284, lng: 127.0682 },
    ]
  },
  gangnam: {
    name: "강남 코스",
    center: { lat: 37.4979, lng: 127.0276 },
    path: [
      { lat: 37.4979, lng: 127.0276 },
      { lat: 37.5005, lng: 127.0315 },
      { lat: 37.4985, lng: 127.0350 },
      { lat: 37.4950, lng: 127.0310 },
      { lat: 37.4979, lng: 127.0276 },
    ]
  },
  jamsil: {
    name: "잠실 코스",
    center: { lat: 37.5122, lng: 127.0988 },
    path: [
      { lat: 37.5122, lng: 127.0988 },
      { lat: 37.5100, lng: 127.1020 },
      { lat: 37.5080, lng: 127.0980 },
      { lat: 37.5105, lng: 127.0950 },
      { lat: 37.5122, lng: 127.0988 },
    ]
  }
};

type CourseType = keyof typeof COURSE_DATA;

export function RouteMapPage() {
  const navigate = useNavigate();
  const mapContainerId = "route-tmap-container";
  
  const [selectedCourse, setSelectedCourse] = useState<CourseType>("hanyang");
  
  const tmapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null);
  const userMarkerRef = useRef<any>(null);
  const [, setMarkers] = useState<any[]>([]);

  // 1. 지도 최초 초기화
  useEffect(() => {
    if (tmapRef.current || !window.Tmapv3) return;

    const currentCourse = COURSE_DATA[selectedCourse];
    const map = new window.Tmapv3.Map(mapContainerId, {
      center: new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng),
      zoom: 15,
      zoomControl: false,
    });
    tmapRef.current = map;

    userMarkerRef.current = new window.Tmapv3.Marker({
      position: new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng),
      map: map,
      iconHTML: `<div style="width: 20px; height: 20px; background: #6366f1; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -50%);"></div>`,
    });
  }, []);

  // 2. 코스 변경 시 노선 렌더링 갱신
  useEffect(() => {
    if (!tmapRef.current || !window.Tmapv3) return;

    const currentCourse = COURSE_DATA[selectedCourse];
    tmapRef.current.setCenter(new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng));

    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng));
    }

    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    const tmapPaths = currentCourse.path.map(
      (coord) => new window.Tmapv3.LatLng(coord.lat, coord.lng)
    );

    polylineRef.current = new window.Tmapv3.Polyline({
      path: tmapPaths,
      strokeColor: "#16a34a",
      strokeWeight: 6,
      strokeStyle: "solid",
      map: tmapRef.current,
    });
  }, [selectedCourse]);

  // 3. 10초 동기화
  useEffect(() => {
    updateAllSignals();
    const interval = setInterval(updateAllSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  // 4. 주변 마커 및 1초 보정 연산
  const markersRef = useRef<any[]>([]);
  const infoWindowRef = useRef<any>(null);

  useEffect(() => {
    if (!tmapRef.current) return;

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
      const currentCenter = COURSE_DATA[selectedCourse].center;
      const nearby = getNearbyIntersections(currentCenter.lat, currentCenter.lng, 3);

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
  }, [selectedCourse]);

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-border px-6 py-4 z-10 shadow-sm">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-full">
              <ArrowLeft className="size-6" />
            </button>
            <div className="flex-1">
              <h2 className="mb-0 text-lg font-bold">추천 러닝 코스 탐색</h2>
              <p className="text-xs text-muted-foreground">인도 중심 다각형 경로 및 신호등 잔여 시간 예측</p>
            </div>
          </div>
          
          <div className="flex bg-slate-100 p-1 rounded-xl w-full overflow-x-auto">
            {(Object.keys(COURSE_DATA) as CourseType[]).map((key) => (
              <button
                key={key}
                onClick={() => {
                  if(infoWindowRef.current) infoWindowRef.current.setVisible(false);
                  setSelectedCourse(key);
                }}
                className={`flex-1 flex items-center justify-center gap-1 text-xs py-2.5 font-semibold rounded-lg transition-all min-w-[75px] ${
                  selectedCourse === key
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <MapPin className="size-3.5" />
                {COURSE_DATA[key].name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 relative">
        <div id={mapContainerId} className="w-full h-full" />

        <div className="absolute bottom-28 left-6 bg-white rounded-2xl p-4 shadow-lg z-[1000]">
          <div className="text-sm font-medium mb-2 text-emerald-600">
            🟢 {COURSE_DATA[selectedCourse].name} 연동 중
          </div>
          <div className="space-y-1.5 text-xs">
            <div className="flex items-center gap-2"><span>🟢</span><span>초록불 (진입 권장)</span></div>
            <div className="flex items-center gap-2"><span>🔴</span><span>빨간불 (서행 및 대기)</span></div>
          </div>
        </div>

        <button
          onClick={() => {
            if (tmapRef.current) {
              const currentCourse = COURSE_DATA[selectedCourse];
              tmapRef.current.setCenter(new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng));
            }
          }}
          className="absolute bottom-28 right-6 bg-white border border-border rounded-full p-4 shadow-md z-[1000]"
        >
          <Navigation className="size-6 text-primary" />
        </button>

        <div className="absolute bottom-8 left-0 right-0 flex justify-center px-6 z-[1000]">
          <button
            onClick={() => navigate("/tracking")} 
            className="w-full max-w-md bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg py-4 rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2.5"
          >
            <Play className="size-5 fill-white" />
            {COURSE_DATA[selectedCourse].name} 시작하기
          </button>
        </div>
      </div>
    </div>
  );
}