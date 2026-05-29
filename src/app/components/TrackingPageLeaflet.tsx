"use client";

import { useState, useEffect, useRef } from "react";
import { Pause, Play, Square, ArrowLeft } from "lucide-react";
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


export function TrackingPageLeaflet() {

  const navigate = useNavigate();

  const location = useLocation(); // 💡 라우트 정보 받기

  const routeInfo = location.state?.routeInfo; // 💡 전달받은 경로 정보

  const mapContainerId = "tracking-tmap-container";
  
  const tmapRef = useRef<any>(null);
  const currentMarkerRef = useRef<any>(null);
  const trackedPolylineRef = useRef<any>(null);
  const [isRunning, setIsRunning] = useState(false);

  const [time, setTime] = useState(0);

  const [distance, setDistance] = useState(0);

  const [nextSignal, setNextSignal] = useState<{

    emoji: string;

    time: number;

    status: string;

  } | null>(null);

  const [pathPoints, setPathPoints] = useState<PathPoint[]>([]);

  const [isMapExpanded, setIsMapExpanded] = useState(false);

  const watchIdRef = useRef<number | null>(null);



  // Leaflet 지도 초기화

  useEffect(() => {

    if (tmapRef.current || !window.Tmapv3) return;

    const startLat = routeInfo?.path?.[0]?.[1] ?? 37.5559;

    const startLng = routeInfo?.path?.[0]?.[0] ?? 127.0436;

    const map = new window.Tmapv3.Map(mapContainerId, {
      center: new window.Tmapv3.LatLng(startLat, startLng),
      zoom: 17,
      zoomControl: false,
    });
    tmapRef.current = map;

    if (routeInfo?.path) {

      const tmapPaths: any[] = [];
      let prevLat: number | null = null;
      let prevLng: number | null = null;
      routeInfo.path.forEach((c: [number, number]) => {
        // 좌표 밀집도 분산 (약 20m 간격)으로 화살표 렌더링 최적화
        if (!prevLat || !prevLng || Math.abs(prevLat - c[1]) + Math.abs(prevLng - c[0]) > 0.0002) {
            tmapPaths.push(new window.Tmapv3.LatLng(c[1], c[0]));
            prevLat = c[1];
            prevLng = c[0];
        }
      });
      
      // TMAP WebGL 로딩 보장 (1.2초 지연 렌더링)
      setTimeout(() => {
        if (!tmapRef.current) return;
        new window.Tmapv3.Polyline({
          path: tmapPaths,
          strokeColor: "#4f46e5",
          strokeWeight: 6,
          strokeOpacity: 0.5,
          strokeStyle: "dot", // Leaflet의 dashArray와 유사한 점선 효과
          direction: true, // 💡 가이드 경로 진행 방향 화살표
          map: tmapRef.current,
        });
      }, 1200);

    }

    // 현재 위치 마커

    currentMarkerRef.current = new window.Tmapv3.Marker({
      position: new window.Tmapv3.LatLng(startLat, startLng),
      map: map,
      iconHTML: `
        <div style="
          width: 16px;
          height: 16px;
          background: #6366f1;
          border: 4px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(99, 102, 241, 0.5);
          transform: translate(-50%, -50%);
        "></div>
      `,
    });

    return () => {

      if (tmapRef.current) {
        const mapDiv = document.getElementById(mapContainerId);
        if (mapDiv) mapDiv.innerHTML = "";
        tmapRef.current = null;
      }

    };

  }, []);



  // GPS 추적 및 경로 그리기

  useEffect(() => {

    if (!isRunning || !tmapRef.current) return;



    if (!navigator.geolocation) {

      return;

    }



    watchIdRef.current = navigator.geolocation.watchPosition(

      (position) => {

        const newPoint: PathPoint = {

          lat: position.coords.latitude,

          lng: position.coords.longitude,

          timestamp: Date.now(),

        };



        setPathPoints((prev) => {

          const updated = [...prev, newPoint];



          if (updated.length > 1) {

            const lastPoint = updated[updated.length - 2];

            const dist = calculateDistance(lastPoint.lat, lastPoint.lng, newPoint.lat, newPoint.lng);



            // 너무 작은 이동은 무시 (노이즈 제거)

            if (dist > 0.005) { // 5m 이상

              setDistance((prevDist) => prevDist + dist);

            }

          }



          return updated;

        });



        // 지도 중심 이동

        tmapRef.current?.setCenter(new window.Tmapv3.LatLng(newPoint.lat, newPoint.lng));



        // 마커 위치 업데이트

        if (currentMarkerRef.current) {

          currentMarkerRef.current.setPosition(new window.Tmapv3.LatLng(newPoint.lat, newPoint.lng));

        }

      },

      (error) => {

        // GPS 추적 실패 - 자동으로 재시도됨

      },

      {

        enableHighAccuracy: true,

        timeout: 5000,

        maximumAge: 0,

      }

    );



    return () => {

      if (watchIdRef.current !== null) {

        navigator.geolocation.clearWatch(watchIdRef.current);

      }

    };

  }, [isRunning]);



  // Polyline 업데이트

  useEffect(() => {

    if (!tmapRef.current || pathPoints.length < 2) return;



    if (trackedPolylineRef.current) {

      trackedPolylineRef.current.setMap(null);

    }



    const path = pathPoints.map((point) => new window.Tmapv3.LatLng(point.lat, point.lng));



    trackedPolylineRef.current = new window.Tmapv3.Polyline({
      path: path,
      strokeColor: "#6366f1",
      strokeWeight: 5,
      strokeOpacity: 0.8,
      strokeStyle: "solid",
      direction: true, // 💡 실제 뛴 궤적에도 방향 화살표
      map: tmapRef.current,
    });

  }, [pathPoints]);



  // 타이머

  useEffect(() => {

    let interval: NodeJS.Timeout;

    if (isRunning) {

      interval = setInterval(() => {

        setTime((prev) => prev + 1);

      }, 1000);

    }

    return () => clearInterval(interval);

  }, [isRunning]);



  // 실시간 신호 정보 업데이트

  useEffect(() => {

    const updateSignal = async () => {

      try {

        const signal = await getSignalFromCache(SEOUL_INTERSECTIONS.SUSEO);

        if (signal) {

          const pedestrianTime = getPedestrianSignalTime(signal);

          setNextSignal({

            emoji: getSignalEmoji(pedestrianTime),

            time: pedestrianTime,

            status: pedestrianTime > 0 ? "초록불" : "빨간불",

          });

        }

      } catch (error) {

        setNextSignal({

          emoji: '🟢',

          time: 15,

          status: '초록불',

        });

      }

    };



    updateSignal();

    const interval = setInterval(updateSignal, 300000); // API 호출 제한 고려 - 5분마다



    return () => clearInterval(interval);

  }, []);



  const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {

    const R = 6371;

    const dLat = toRad(lat2 - lat1);

    const dLng = toRad(lng2 - lng1);



    const a =

      Math.sin(dLat / 2) * Math.sin(dLat / 2) +

      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);



    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;

  };



  const toRad = (degrees: number): number => {

    return (degrees * Math.PI) / 180;

  };



  const formatTime = (seconds: number) => {

    const mins = Math.floor(seconds / 60);

    const secs = seconds % 60;

    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;

  };



  const pace = distance > 0 ? time / 60 / distance : 0;



  const handleFinish = () => {

    setIsRunning(false);

    navigate("/complete");

  };



  return (

    <div className="min-h-screen bg-gradient-to-b from-indigo-600 to-purple-600 text-white">

      {/* Map */}

      <div

        className={`relative ${

          isMapExpanded ? "h-[70vh]" : "h-80"

        } bg-indigo-700/50 overflow-hidden transition-all duration-300`}

      >

        <div id={mapContainerId} className="w-full h-full" />
        
        {/* 🌸 트래킹 화면 벚꽃길 코스 전용 이펙트 */}
        {routeInfo?.conceptType === 'cherryblossom' && (
          <div className="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute animate-fall text-pink-300 drop-shadow-sm"
                style={{
                  left: `${Math.random() * 100}%`, top: `-10%`,
                  animationDuration: `${Math.random() * 4 + 4}s`,
                  animationDelay: `${Math.random() * 5}s`,
                  opacity: Math.random() * 0.6 + 0.4,
                  fontSize: `${Math.random() * 12 + 10}px`
                }}
              >🌸</div>
            ))}
            <style>{`
              @keyframes fall { 0% { transform: translateY(-10vh) rotate(0deg) translateX(0); } 50% { transform: translateY(50vh) rotate(180deg) translateX(20px); } 100% { transform: translateY(110vh) rotate(360deg) translateX(-20px); } }
              .animate-fall { animation: fall linear infinite; }
            `}</style>
          </div>
        )}



        {/* Map Expand Button */}

        <button

          onClick={() => setIsMapExpanded(!isMapExpanded)}

          className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-sm flex items-center gap-2 z-[1000]"

        >

          {isMapExpanded ? (

            <>

              <Minimize2 className="size-4" />

              지도 축소

            </>

          ) : (

            <>

              <Maximize2 className="size-4" />

              지도 확대

            </>

          )}

        </button>



        {/* Green Wave Indicator */}

        <div className="absolute bottom-4 left-4 right-4 z-[1000]">
          <div className="bg-white/20 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold tracking-tight">다음 교차로</div>
              {nextSignal ? (
                <div className="text-sm font-bold bg-white/20 px-2 py-0.5 rounded-md">
                  {nextSignal.emoji} {nextSignal.status} ({nextSignal.time}초)
                </div>
              ) : (
                <div className="text-sm font-medium">🟢 초록불 (15초)</div>
              )}
            </div>
            
           
            <div className="text-xs text-white/90 font-medium border-t border-white/20 pt-2 mt-1">
              {nextSignal && nextSignal.time > 10 
                ? "✨ 페이스 유지 시 통과 가능" 
                : nextSignal && nextSignal.time > 0 
                  ? "🏃 조금 더 빠르게 달리세요!" 
                  : "🛑 신호 대기 예상"}
            </div>
          </div>
        </div>

      {/* 👇 여기가 에러의 원인이었습니다. Map 컨테이너가 닫히지 않았었기 때문에 </div>를 하나 추가했습니다. */}
      </div> 


      {/* Stats Panel */}

      <div className="bg-white text-foreground rounded-t-3xl -mt-6 pt-6 pb-8 px-6 min-h-[calc(100vh-20rem)]">

        <div className="max-w-md mx-auto">

          {/* Main Stats */}

          <div className="grid grid-cols-3 gap-4 mb-8">

            <div className="text-center">

              <div className="text-sm text-muted-foreground mb-2">시간</div>

              <div className="text-3xl font-medium">{formatTime(time)}</div>

            </div>

            <div className="text-center">

              <div className="text-sm text-muted-foreground mb-2">거리</div>

              <div className="text-3xl font-medium">{distance.toFixed(2)}</div>

              <div className="text-sm text-muted-foreground">km</div>

            </div>

            <div className="text-center">

              <div className="text-sm text-muted-foreground mb-2">페이스</div>

              <div className="text-3xl font-medium">{pace > 0 ? pace.toFixed(1) : "--"}</div>

              <div className="text-sm text-muted-foreground">분/km</div>

            </div>

          </div>



          {/* Secondary Stats */}

          <div className="grid grid-cols-2 gap-4 mb-8">

            <div className="bg-secondary rounded-2xl p-4">

              <div className="text-sm text-muted-foreground mb-1">신호 대기</div>

              <div className="text-2xl font-medium">0회</div>

              <div className="text-xs text-green-600 mt-1">✨ 완벽한 러닝!</div>

            </div>

            <div className="bg-secondary rounded-2xl p-4">

              <div className="text-sm text-muted-foreground mb-1">예상 완주</div>

              <div className="text-2xl font-medium">12분</div>

              <div className="text-xs text-muted-foreground mt-1">남은 거리 3.2km</div>

            </div>

          </div>



          {/* Controls */}

          <div className="flex items-center justify-center gap-6">

            <button

              onClick={() => setIsRunning(!isRunning)}

              className="bg-primary text-primary-foreground rounded-full p-6 shadow-lg hover:shadow-xl transition-all active:scale-95"

            >

              {isRunning ? <Pause className="size-8" /> : <Play className="size-8" fill="currentColor" />}

            </button>



            {(isRunning || time > 0) && (

              <button

                onClick={handleFinish}

                className="bg-red-500 text-white rounded-full p-6 shadow-lg hover:shadow-xl transition-all active:scale-95"

              >

                <Square className="size-8" />

              </button>

            )}

          </div>



          {/* Motivational Message */}

          <div className="text-center mt-8">

            <p className="text-muted-foreground text-sm">

              {isRunning

                ? "당신의 리듬에 집중하세요 🎵"

                : time > 0

                ? "준비되면 다시 시작하세요"

                : "시작 버튼을 눌러 러닝을 시작하세요"}

            </p>

          </div>

        </div>

      </div>

    </div>

  );

}