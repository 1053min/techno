import { useState } from "react";
import { ArrowLeft, Map, Wand2, Activity } from "lucide-react";
import { useNavigate } from "react-router";
import { generateComfortRoute, findBestArtMapping } from "../services/advancedRouteService";

export function BetaRoutePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState<number>(3);

  // 1. 쾌적 경로 생성 테스트 핸들러
  const handleTestComfortRoute = async () => {
    setLoading(true);
    // 현재 위치를 하드코딩 (실제로는 navigator.geolocation 사용)
    const mockLat = 37.5559;
    const mockLng = 127.0436;
    
    const result = await generateComfortRoute(distance, mockLat, mockLng);
    
    if (result) {
      sessionStorage.setItem('selected_run_route', JSON.stringify(result));
      navigate("/route-map"); // 기존 지도 컴포넌트 재활용
    }
    setLoading(false);
  };

  // 2. GPS 아트 매핑 테스트 핸들러
  const handleTestArtRoute = async (shapeType: 'heart' | 'star' | 'cat') => {
    setLoading(true);
    const result = await findBestArtMapping(shapeType);
    
    if (result) {
      sessionStorage.setItem('selected_run_route', JSON.stringify(result));
      navigate("/route-map"); // 기존 지도 컴포넌트 재활용
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white pb-12">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-4 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
          <ArrowLeft className="size-6 text-white" />
        </button>
        <div>
          <h1 className="text-lg font-bold">베타 알고리즘 테스트 랩</h1>
          <p className="text-xs text-indigo-400">Advanced Route Engine Test</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-6 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-400 gap-4">
            <Wand2 className="animate-spin size-8" />
            <span className="font-bold text-sm">엔진 가동 중... (수학적 연산 처리)</span>
          </div>
        ) : (
          <>
            {/* 알고리즘 1번 랩 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400"><Activity size={20} /></div>
                <h2 className="font-bold text-lg">주변 맞춤 쾌적 경로</h2>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                현재 위치(반경 100m)에서 시작하여 지정한 거리만큼 계단, 육교, 횡단보도를 최대한 회피하는 안전 코스를 생성합니다.
              </p>
              
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-500 mb-2 block">목표 거리 (km): {distance}km</label>
                <input 
                  type="range" min="1" max="10" step="0.5" 
                  value={distance} 
                  onChange={(e) => setDistance(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
              </div>

              <button onClick={handleTestComfortRoute} className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl transition-all">
                동적 쾌적 경로 생성 테스트
              </button>
            </div>

            {/* 알고리즘 2번 랩 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-pink-500/20 p-2 rounded-xl text-pink-400"><Map size={20} /></div>
                <h2 className="font-bold text-lg">서울시 전체 GPS 아트 탐색</h2>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                선택한 도안(Template)과 서울시 도로망(Graph)을 대조하여, 형태가 가장 덜 일그러지는 최적의 동네를 역추적해 제안합니다.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handleTestArtRoute('heart')} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all">
                  <span className="text-3xl">❤️</span>
                  <span className="text-sm font-bold text-slate-300">하트 그리기</span>
                </button>
                
                <button onClick={() => handleTestArtRoute('star')} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all">
                  <span className="text-3xl">⭐</span>
                  <span className="text-sm font-bold text-slate-300">별 그리기</span>
                </button>

                <button onClick={() => handleTestArtRoute('cat')} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 p-4 rounded-2xl flex flex-col items-center gap-2 transition-all">
                  <span className="text-3xl">🐈</span>
                  <span className="text-sm font-bold text-slate-300">고양이 그리기</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}