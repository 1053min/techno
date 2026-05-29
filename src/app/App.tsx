import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router";
import { HomePage } from "./components/HomePage";
import { RoutesPage } from "./components/RoutesPage";
import { TrackingPage } from "./components/TrackingPage";
import { CompletePage } from "./components/CompletePage";
import { HistoryPage } from "./components/HistoryPage";
import { MapPageTmap } from "./components/MapPageLeaflet";
import { RouteMapPage } from "./components/RouteMapPage";
import { BadgePage } from "./components/BadgePage";
import { MonthlyProjectPage } from "./components/MonthlyProjectPage";
import { BetaRoutePage } from "./services/BetaRoutePage"; // 파일 위치가 components 폴더에 있다면 "./components/BetaRoutePage"로 변경해 주세요.

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    // 2.2초 후 스플래시 화면 종료
    const timer = setTimeout(() => setShowSplash(false), 2200);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return (
      <div className="h-screen w-full bg-black flex flex-col items-center justify-center selection:bg-orange-500/30 font-sans">
        <style>{`
          @import url('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css');
          @keyframes drawPath { 0% { stroke-dasharray: 0 1000; opacity: 0; } 40% { opacity: 1; } 100% { stroke-dasharray: 200 1000; opacity: 1; } }
          .animate-draw { animation: drawPath 1.5s cubic-bezier(0.86, 0, 0.07, 1) forwards; }
        `}</style>
        <div className="relative w-24 h-24 mb-6">
          <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
            <path d="M 20 80 L 45 30 L 60 55 L 85 15" stroke="#f97316" strokeWidth="8" strokeLinecap="square" strokeLinejoin="miter" className="animate-draw" />
            <path d="M 40 80 L 60 40 L 95 65" stroke="#ea580c" strokeWidth="4" strokeLinecap="square" strokeLinejoin="miter" className="animate-draw" style={{ animationDelay: '0.2s' }} />
          </svg>
        </div>
        <h1 className="text-white text-2xl font-black tracking-tighter" style={{ fontFamily: 'Pretendard, sans-serif' }}>
          ROUTE<span className="text-orange-500">SETTER</span>
        </h1>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'Pretendard, sans-serif' }} className="antialiased text-slate-900">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/routes" element={<RoutesPage />} />
          <Route path="/route-map" element={<RouteMapPage />} />
          <Route path="/tracking" element={<TrackingPage />} />
          <Route path="/complete" element={<CompletePage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/map" element={<MapPageTmap />} />
          <Route path="/badges" element={<BadgePage />} />
          <Route path="/monthly-project" element={<MonthlyProjectPage />} />
          <Route path="/beta-routes" element={<BetaRoutePage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}