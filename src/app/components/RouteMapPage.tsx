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

// 💡 [MVP 기획 원칙] 고유 중심점 및 다각형 인도 경로 데이터 정의
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
      { lat: 37.5559, lng: 127.0436 }, // 닫힌 다각형 구조
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
  }
};

type CourseType = keyof typeof COURSE_DATA;

export function RouteMapPage() {
  const navigate = useNavigate();
  const mapContainerId = "route-tmap-container";
  
  // 상태 관리: 현재 선택된 코스 (기본값: 한양대 코스)
  const [selectedCourse, setSelectedCourse] = useState<CourseType>("hanyang");
  
  const tmapRef = useRef<any>(null);
  const polylineRef = useRef<any>(null); // 변경되는 경로선을 관리하기 위한 Ref
  const userMarkerRef = useRef<any>(null); // 내 위치 마커 Ref
  const [, setMarkers] = useState<any[]>([]);

  // 1. TMAP 지도 최초 1회 초기화
  useEffect(() => {
    if (tmapRef.current || !window.Tmapv3) return;

    const currentCourse = COURSE_DATA[selectedCourse];
    const map = new window.Tmapv3.Map(mapContainerId, {
      center: new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng),
      zoom: 15,
      zoomControl: false,
    });
    tmapRef.current = map;

    // 초기 사용자 마커 생성
    userMarkerRef.current = new window.Tmapv3.Marker({
      position: new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng),
      map: map,
      iconHTML: `
        <div style="width: 20px; height: 20px; background: #6366f1; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 6px rgba(0,0,0,0.3); transform: translate(-50%, -50%);"></div>
      `,
    });
  }, []);

  // 2. 💡 코스(탭) 변경 시 지도 중심 이동 및 다각형 인도 경로선 변경 로직 부활
  useEffect(() => {
    if (!tmapRef.current || !window.Tmapv3) return;

    const currentCourse = COURSE_DATA[selectedCourse];

    // 지도의 중심점을 선택된 코스의 중심점으로 부드럽게 이동
    tmapRef.current.setCenter(new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng));

    // 기존 코스의 사용자 마커 위치 갱신
    if (userMarkerRef.current) {
      userMarkerRef.current.setPosition(new window.Tmapv3.LatLng(currentCourse.center.lat, currentCourse.center.lng));
    }

    // 기존에 그려져 있던 가이드 선(Polyline)이 있다면 삭제 처리하여 찌꺼기 방지
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
    }

    // 신규 선택된 코스의 좌표 세팅 및 그리기
    const tmapPaths = currentCourse.path.map(
      (coord) => new window.Tmapv3.LatLng(coord.lat, coord.lng)
    );

    polylineRef.current = new window.Tmapv3.Polyline({
      path: tmapPaths,
      strokeColor: "#16a34a", // 러닝 앱 스포티 그린 컬러 적용
      strokeWeight: 6,
      strokeStyle: "solid",
      map: tmapRef.current,
    });
  }, [selectedCourse]);

  // 3. 백엔드 데이터 최적화: 10초 주기 전체 신호 대량 동기화
  useEffect(() => {
    updateAllSignals();
    const interval = setInterval(updateAllSignals, 10000);
    return () => clearInterval(interval);
  }, []);

  // 4. 경로 주변 신호등 마커 바인딩 및 1초 단위 오차 보정 타이머
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
      
      // 💡 현재 선택된 코스의 중심점을 기준으로 주변 3km 신호 연동
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
  }, [selectedCourse]); // 코스가 변경될 때마다 신호등 마커도 해당 위치 주위로 즉시 재생성

  return (
    <div className="h-screen flex flex-col">
      <div className="bg-white border-b border-border px-6 py-4 z-10 shadow-sm">
        <div className="max-w-md mx-auto flex flex-col gap-3">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-secondary rounded-