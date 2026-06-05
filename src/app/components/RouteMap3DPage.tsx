import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

export function RouteMap3DPage() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const navigate = useNavigate();
  const [routeInfo, setRouteInfo] = useState<any>(null);

  // 1. 세션 스토리지에서 선택된 경로 정보 가져오기
  useEffect(() => {
    const rawData = sessionStorage.getItem("selected_run_route");
    if (rawData) {
      setRouteInfo(JSON.parse(rawData));
    } else {
      navigate(-1);
    }
  }, [navigate]);

  // 2. Mapbox 3D 지도 렌더링
  useEffect(() => {
    if (!mapContainer.current || !routeInfo || map.current) return;

    // Vercel 및 로컬 환경변수 사용 (Vite 기준)
    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || "";

    const startLng = routeInfo.path[0][0];
    const startLat = routeInfo.path[0][1];

    // 지도 초기화
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12", // 위성 지도 스타일
      center: [startLng, startLat],
      zoom: 15.5,
      pitch: 65, // 3D 효과를 위한 카메라 각도
      bearing: 45, // 카메라 회전 각도
    });

    map.current.on("load", () => {
      // 3D 지형(Terrain) 추가
      map.current!.addSource("mapbox-dem", {
        type: "raster-dem",
        url: "mapbox://mapbox.mapbox-terrain-dem-v1",
        tileSize: 512,
        maxzoom: 14,
      });
      map.current!.setTerrain({ source: "mapbox-dem", exaggeration: 1.5 }); // 지형 과장도 1.5배

      // 경로 그리기
      const coordinates = routeInfo.path.map((pt: any) => [pt[0], pt[1]]);
      map.current!.addSource("route", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: coordinates,
          },
        },
      });

      map.current!.addLayer({
        id: "route",
        type: "line",
        source: "route",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: { "line-color": "#10B981", "line-width": 8, "line-opacity": 0.8 }, // 에메랄드 색상
      });
    });

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [routeInfo]);

  return (
    <div className="h-screen w-full relative bg-slate-950 flex flex-col font-sans">
      <div className="absolute top-0 left-0 right-0 p-4 bg-transparent z-10 flex items-center gap-3 pointer-events-none">
        <button onClick={() => navigate(-1)} className="pointer-events-auto p-2 bg-white/20 backdrop-blur-md hover:bg-white/40 rounded-full transition-colors">
          <ArrowLeft className="size-5 text-white" />
        </button>
        <h2 className="font-black text-lg text-white mb-0 drop-shadow-md">3D 다이내믹 코스 뷰어</h2>
      </div>
      <div ref={mapContainer} className="flex-1 w-full h-full" />
    </div>
  );
}