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
  return (
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
  );
}