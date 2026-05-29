import { useState } from "react";
import { ArrowLeft, Map, Wand2, Activity } from "lucide-react";
import { useNavigate } from "react-router";
import { generateComfortRoute, findBestArtMapping } from "../services/advancedRouteService";

export function BetaRoutePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [distance, setDistance] = useState<number>(3);
  const [comfortCandidates, setComfortCandidates] = useState<any[]>([]);
  // 💡 경로 탐색 실패 확률을 낮추기 위해 기본값을 'ignore'로 완화
  const [stairOption, setStairOption] = useState<'avoid' | 'allow_some' | 'ignore'>('ignore');
  const [gradientOption, setGradientOption] = useState<'flat' | 'allow_some' | 'ignore'>('ignore');

  // 1. 쾌적 경로 생성 테스트 핸들러
  const handleTestComfortRoute = async () => {
    setLoading(true);
    setComfortCandidates([]); // 초기화
    
    if (!navigator.geolocation) {
      alert("브라우저가 위치 정보를 지원하지 않습니다.");
      setLoading(false);
      return;
    }

    // 실제 GPS 위치 수신
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const results = await generateComfortRoute(distance, latitude, longitude, stairOption, gradientOption);
        
        if (results.length === 0) {
          alert("설정하신 조건(거리/회피 옵션)에 맞는 경로를 찾을 수 없습니다. 옵션을 변경해보세요.");
          setLoading(false);
          return;
        }
        
        setComfortCandidates(results);
        setLoading(false);
      },
      async (error) => {
        console.error("위치 가져오기 실패", error);
        alert("위치를 가져오는 데 실패했습니다.");
        setLoading(false);
      },
      { enableHighAccuracy: true }
    );
  };

  // 2. GPS 아트 매핑 테스트 핸들러
  const handleTestArtRoute = async (shapeType: 'heart' | 'star' | 'thumbsup') => {
    setLoading(true);
    const result = await findBestArtMapping(shapeType);
    
    if (result) {
      sessionStorage.setItem('selected_run_route', JSON.stringify(result));
      navigate("/route-map"); // 기존 지도 컴포넌트 재활용
    }
    setLoading(false);
  };

  const handleSelectComfortCandidate = (route: any) => {
    sessionStorage.setItem('selected_run_route', JSON.stringify(route));
    navigate("/route-map");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 font-sans selection:bg-indigo-500/30">
      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-4 sticky top-0 z-50 bg-slate-950/80 backdrop-blur-md">
        <button onClick={() => navigate(-1)} className="hover:bg-white/10 p-2 rounded-full transition-colors">
          <ArrowLeft className="size-6 text-slate-100" />
        </button>
        <div>
          <h1 className="text-lg font-black tracking-tight">베타 테스트 랩</h1>
          <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">Advanced Route Engine</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-6 space-y-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-indigo-400 gap-5">
            <Wand2 className="animate-spin size-8" />
            <div className="text-center">
              <div className="font-black text-lg tracking-tight text-white">Keep Steady.</div>
              <div className="text-sm font-medium text-slate-400 mt-1">완벽한 궤적을 연산하고 있습니다...</div>
            </div>
          </div>
        ) : (
          <>
            {/* 알고리즘 1번 랩 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400"><Activity size={20} /></div>
                <h2 className="font-black text-lg tracking-tight">주변 맞춤 쾌적 경로</h2>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium">
                현재 위치(반경 100m)에서 시작하여 지정한 거리만큼 계단, 육교, 횡단보도를 최대한 회피하는 안전 코스를 생성합니다.
              </p>
              
              <div className="mb-6">
                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">목표 거리: {distance}km</label>
                <input 
                  type="range" min="1" max="10" step="0.5" 
                  value={distance} 
                  onChange={(e) => setDistance(parseFloat(e.target.value))}
                  className="w-full accent-indigo-500 mb-5"
                />
                
                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">계단/단차 옵션</label>
                <div className="flex gap-2 mb-5">
                  <button onClick={() => setStairOption('avoid')} className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all ${stairOption === 'avoid' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>무조건 우회</button>
                  <button onClick={() => setStairOption('allow_some')} className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all ${stairOption === 'allow_some' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>일부 허용</button>
                  <button onClick={() => setStairOption('ignore')} className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all ${stairOption === 'ignore' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>상관 없음</button>
                </div>

                {/* 💡 경사도 분리 적용 */}
                <label className="text-xs font-bold text-slate-300 mb-2 block uppercase tracking-wider">경사도(언덕) 옵션</label>
                <div className="flex gap-2">
                  <button onClick={() => setGradientOption('flat')} className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all ${gradientOption === 'flat' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>평지 위주</button>
                  <button onClick={() => setGradientOption('allow_some')} className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all ${gradientOption === 'allow_some' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>일부 허용</button>
                  <button onClick={() => setGradientOption('ignore')} className={`flex-1 py-2 text-xs rounded-xl border font-bold transition-all ${gradientOption === 'ignore' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}>상관 없음</button>
                </div>
              </div>

              {!comfortCandidates.length ? (
                <button onClick={handleTestComfortRoute} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] text-white font-black tracking-wide rounded-2xl transition-all shadow-md">
                  현재 위치로 경로 후보 탐색 시작
                </button>
              ) : (
                <div className="mt-6 space-y-3">
                  <div className="text-xs font-black text-emerald-400 mb-2 uppercase">분석 완료! 마음에 드는 코스를 선택하세요.</div>
                  {comfortCandidates.map((route, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => handleSelectComfortCandidate(route)}
                      className="w-full text-left bg-slate-800/80 p-4 rounded-xl hover:scale-[1.02] hover:bg-slate-800 active:scale-[0.98] transition-all border border-slate-700 shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-black text-sm text-slate-100">{route.name}</h3>
                        <span className="text-[10px] font-black bg-slate-950 text-indigo-400 px-2 py-1 rounded-md">쾌적도 {route.score}점</span>
                      </div>
                      <div className="flex gap-4 text-[11px] font-medium text-slate-400">
                        <span>📏 {route.distance} km</span>
                        <span>🚦 횡단보도 {route.crosswalkCount}개</span>
                        {(route.stairCount > 0 || route.steepCount > 0) && <span className="text-rose-400">⚠️ 지형주의</span>}
                      </div>
                    </button>
                  ))}
                  <button onClick={() => setComfortCandidates([])} className="text-xs font-bold text-slate-500 hover:text-slate-300 w-full text-center pt-2">다시 검색하기</button>
                </div>
              )}
            </div>

            {/* 알고리즘 2번 랩 */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-md">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-pink-500/20 p-2 rounded-xl text-pink-400"><Map size={20} /></div>
                <h2 className="font-black text-lg tracking-tight">GPS 아트 맵핑</h2>
              </div>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed font-medium">
                선택한 도안(Template)과 서울시 도로망(Graph)을 대조하여, 형태가 가장 덜 일그러지는 최적의 동네를 역추적해 제안합니다.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <button onClick={() => handleTestArtRoute('heart')} className="bg-slate-800/80 border border-slate-700 hover:border-pink-500 hover:bg-slate-800 active:scale-[0.95] p-4 rounded-2xl flex flex-col items-center gap-2 transition-all">
                  <span className="text-3xl">❤️</span>
                  <span className="text-[11px] font-black text-slate-300">하트</span>
                </button>
                
                <button onClick={() => handleTestArtRoute('star')} className="bg-slate-800/80 border border-slate-700 hover:border-yellow-400 hover:bg-slate-800 active:scale-[0.95] p-4 rounded-2xl flex flex-col items-center gap-2 transition-all">
                  <span className="text-3xl">⭐</span>
                  <span className="text-[11px] font-black text-slate-300">별</span>
                </button>

                <button onClick={() => handleTestArtRoute('thumbsup')} className="bg-slate-800/80 border border-slate-700 hover:border-blue-400 hover:bg-slate-800 active:scale-[0.95] p-4 rounded-2xl flex flex-col items-center gap-2 transition-all">
                  <span className="text-3xl">👍</span>
                  <span className="text-[11px] font-black text-slate-300">엄지척</span>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}