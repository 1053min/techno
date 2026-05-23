"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { INTERSECTION_LOCATIONS } from "../services/intersectionData";
import { getSignalEmoji, fetchAllTrafficSignals } from "../services/trafficSignalService";

function getDistanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export function RouteMapPage() {
  const navigate = useNavigate();
  const mapRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, L.Marker>>({});
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [stats, setStats] = useState({ length: 0, intersectionCount: 0, successRate: 100 });

  useEffect(() => {
    const rawData = sessionStorage.getItem('selected_run_route');
    if (rawData) setRouteInfo(JSON.parse(rawData));
  }, []);

  useEffect(() => {
    if (!mapRef.current || !routeInfo) return;

    const map = L.map(mapRef.current, { zoomControl: false }).setView([routeInfo.path[0][1], routeInfo.path[0][0]], 15);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png").addTo(map);

    const coords = routeInfo.path.map((c: [number, number]) => [c[1], c[0]] as L.LatLngExpression);
    L.polyline(coords, { color: "#4f46e5", weight: 6, opacity: 0.8 }).addTo(map);

    routeInfo.path.forEach((p: [number, number], i: number) => {
      if (i % 5 === 0) L.circleMarker([p[1], p[0]], { radius: 2, color: '#4f46e5', fillOpacity: 1 }).addTo(map);
    });

    const activeIntersections = Object.values(INTERSECTION_LOCATIONS).filter(intersection => 
      routeInfo.path.some((p: [number, number]) => getDistanceKm(p[1], p[0], intersection.lat, intersection.lng) <= 0.03)
    );

    const totalLen = routeInfo.path.reduce((acc: number, _, i: number, arr: any[]) => 
      i < arr.length - 1 ? acc + getDistanceKm(arr[i][1], arr[i][0], arr[i+1][1], arr[i+1][0]) : acc, 0);
    setStats({ length: Number(totalLen.toFixed(2)), intersectionCount: activeIntersections.length, successRate: 100 });

    const updateSignals = async () => {
      const allSignals = await fetchAllTrafficSignals();
      activeIntersections.forEach((intersection) => {
        const signalData = allSignals?.find(s => String(s.itstId) === String(intersection.itstId));
        const isAvailable = !!signalData;
        const validTime = signalData ? Math.floor((signalData.etPdsgRmdrCs || 0) / 10) : 0;
        
        const html = `<div class="bg-${isAvailable ? 'white' : 'gray-400'} border-2 border-${isAvailable ? 'indigo-500' : 'gray-600'} rounded-xl px-2 py-1 text-[10px] font-black shadow-xl flex items-center gap-1">
             ${isAvailable ? `${getSignalEmoji(validTime)} ${validTime}s` : '⚪ 대기중'}
           </div>`;

        if (markersRef.current[intersection.itstId]) {
          markersRef.current[intersection.itstId].setIcon(L.divIcon({ html, iconSize: [65, 30], iconAnchor: [32, 15] }));
        } else {
          markersRef.current[intersection.itstId] = L.marker([intersection.lat, intersection.lng], { icon: L.divIcon({ html, iconSize: [65, 30], iconAnchor: [32, 15] }) }).addTo(map);
        }
      });
    };

    const interval = setInterval(updateSignals, 10000);
    updateSignals();
    return () => { clearInterval(interval); map.remove(); };
  }, [routeInfo]);

  return (
    <div className="flex flex-col h-screen w-full bg-slate-50 relative">
      <div className="p-4 bg-white border-b flex items-center gap-3 z-10">
        <button onClick={() => navigate(-1)}><ArrowLeft className="size-5" /></button>
        <h2 className="font-black">{routeInfo?.name}</h2>
      </div>
      <div className="flex-1 w-full relative z-0">
        <div ref={mapRef} className="w-full h-full" />
      </div>

      {/* 📊 하단 패널: 통계 및 러닝 시작 버튼 */}
      <div className="absolute bottom-6 left-4 right-4 z-[1000] flex flex-col gap-3">
        <div className="bg-white/90 backdrop-blur-lg p-4 rounded-2xl shadow-xl border border-white/20 flex justify-between">
          <div className="text-center"><p className="text-[10px] text-slate-500">길이</p><p className="font-black">{stats.length}km</p></div>
          <div className="text-center"><p className="text-[10px] text-slate-500">교차로</p><p className="font-black">{stats.intersectionCount}곳</p></div>
          <div className="text-center"><p className="text-[10px] text-slate-500">무정지율</p><p className="font-black text-indigo-600">{stats.successRate}%</p></div>
        </div>
        <button
          onClick={() => navigate("/tracking", { state: { routeInfo } })}
          className="w-full bg-indigo-600 text-white font-black py-4 rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-95"
        >
          러닝 시작하기
        </button>
      </div>
    </div>
  );
}