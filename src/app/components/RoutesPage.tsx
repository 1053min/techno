import { ArrowLeft, Zap, Sparkles, RefreshCw, Heart, TrendingUp, MapPin } from "lucide-react";
import { useNavigate, useLocation } from "react-router";
import { useState, useEffect } from "react";
import { generatePresetRoute, generateDrawingRoute } from "../services/routeService";
import { ApiStatus } from "./ApiStatus";

export function RoutesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  
  // 홈 화면 라우터 인가 상태를 확인하여 초기 기본 활성화 탭 분기 세팅
  const [activeTab, setActiveTab] = useState<'recommend' | 'concept' | 'drawing'>('recommend');

  useEffect(() => {
    if (location.state?.tab) {
      setActiveTab(location.state.tab);
    }
  }, [location.state]);

  const handleSelectCourse = async (type: 'hanriver' | 'cherryblossom' | 'interval' | 'hanyang' | 'dog' | 'sweetpotato') => {
    setLoading(true);
    let routeResult = null;

    if (type === 'dog' || type === 'sweetpotato') {
      routeResult = await generateDrawingRoute(type);
    } else {
      routeResult = await generatePresetRoute(type);
    }

    if (routeResult) {
      sessionStorage.setItem('selected_run_route', JSON.stringify({
        ...routeResult,
        name: type === 'hanriver' ? '한강 무신호 러닝 코스' : 
              type === 'cherryblossom' ? '강남 벚꽃길 추천 코스' : 
              type === 'interval' ? '잠실 스피드 인터벌 서킷' :
              type === 'hanyang' ? '한양대 주변 추천 코스 🏫' :
              type === 'dog' ? '귀여운 아기 강아지 아트 코스 🎨' : '달콤 노릇 고구마 아트 코스 🎨',
        conceptType: type
      }));
      navigate("/route-map");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-50 pb-12 font-sans">
      <div className="bg-white px-6 py-4 border-b border-neutral-200 flex items-center gap-4 sticky top-0 z-50">
        <button onClick={() => navigate("/")} className="hover:bg-neutral-100 p-1 rounded-full transition-colors">
          <ArrowLeft className="size-6 text-neutral-900" />
        </button>
        <div>
          <h1 className="text-lg font-black tracking-tight text-neutral-900">맞춤 경로 선택</h1>
          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-widest">Route Setter</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        <ApiStatus isUsingMockData={false} />

        {/* 대시보드 내비게이션 세션 탭바 */}
        <div className="grid grid-cols-3 bg-slate-200/70 p-1 rounded-xl mb-5">
          <button 
            onClick={() => setActiveTab('recommend')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'recommend' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}`}>
            추천 코스
          </button>
          <button 
            onClick={() => setActiveTab('concept')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'concept' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}`}>
            컨셉 러닝
          </button>
          <button 
            onClick={() => setActiveTab('drawing')}
            className={`py-2 text-xs font-bold rounded-lg transition-all ${activeTab === 'drawing' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600'}`}>
            드로잉 러닝
          </button>
        </div>

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-indigo-600 font-medium text-sm gap-2">
            <RefreshCw className="animate-spin size-6" />
            <span>TMap 보행자 코스 정밀 선형 가동 중...</span>
          </div>
        )}

        {!loading && (
          <div className="space-y-4">
            {/* 탭 1: 추천 코스 항목 */}
            {activeTab === 'recommend' && (
              <>
                <button onClick={() => handleSelectCourse('hanriver')} className="w-full text-left bg-white p-5 rounded-2xl shadow-xs border border-slate-100 block hover:ring-2 hover:ring-indigo-500/20 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-emerald-50 text-emerald-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="size-3 fill-emerald-600" /> 신호 무정지 존
                    </span>
                    <span className="text-sm font-black text-slate-700">5.2 km</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">한강 무신호 러닝 코스</h3>
                  <p className="text-xs text-slate-500 mt-1">뚝섬한강변의 강바람을 느끼며 끊김 없는 연속 주행 속도감을 확보한 러너 추천 트랙</p>
                </button>

                <button onClick={() => handleSelectCourse('interval')} className="w-full text-left bg-white p-5 rounded-2xl shadow-xs border border-slate-100 block hover:ring-2 hover:ring-indigo-500/20 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-blue-50 text-blue-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <TrendingUp className="size-3" /> 트랙 서킷 서포트
                    </span>
                    <span className="text-sm font-black text-slate-700">4.5 km</span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900">잠실 인터벌 트레이닝 코스</h3>
                  <p className="text-xs text-slate-500 mt-1">잠실 종합운동장 외곽 실도로 트랙을 연계하여 보행 고저 훈련 페이스를 높이기 최적화된 라인</p>
                </button>

                {/* 🔥 요구사항 반영: 정식 통합된 '한양대 주변 러닝 코스' 카드 배치 */}
                <button onClick={() => handleSelectCourse('hanyang')} className="w-full text-left bg-indigo-50/60 p-5 rounded-2xl shadow-xs border border-indigo-100 block hover:ring-2 hover:ring-indigo-500/40 transition-all">
                  <div className="flex justify-between items-start mb-3">
                    <span className="bg-indigo-600 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <MapPin className="size-3 fill-current" /> 현장 시연 트랙
                    </span>
                    <span className="text-sm font-black text-indigo-700">3.5 km</span>
                  </div>
                  <h3 className="text-base font-bold text-indigo-950">한양대 주변 러닝 코스</h3>
                  <p className="text-xs text-indigo-700/80 mt-1">한양대역 기점 살곶이공원 하천변 산책로를 연계하여 신호 배치를 즉각 시연 표출하는 마스터 트랙</p>
                </button>
              </>
            )}

            {/* 탭 2: 컨셉 러닝 항목 */}
            {activeTab === 'concept' && (
              <button onClick={() => handleSelectCourse('cherryblossom')} className="w-full text-left bg-white p-5 rounded-2xl shadow-xs border border-slate-100 block hover:ring-2 hover:ring-indigo-500/20 transition-all">
                <div className="flex justify-between items-start mb-3">
                  <span className="bg-pink-50 text-pink-600 text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Heart className="size-3 fill-pink-600" /> 시즌 한정 시그니처
                  </span>
                  <span className="text-sm font-black text-slate-700">3.8 km</span>
                </div>
                <h3 className="text-base font-bold text-slate-900">강남 벚꽃길 코스</h3>
                <p className="text-xs text-slate-500 mt-1">화사하게 가득 피어난 연분홍 가로수 터널의 벚꽃 정취를 따라 가볍게 조깅하기 안성맞춤인 힐링 코스</p>
              </button>
            )}

            {/* 탭 3: 드로잉 러닝 도안 선택 리스트 */}
            {activeTab === 'drawing' && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 font-medium px-1">코스 형태대로 정밀 완주하면 스케치가 지도 타임라인 공간에 예쁘게 패스로 새겨집니다.</p>
                
                <button onClick={() => handleSelectCourse('dog')} className="w-full bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-4 hover:ring-2 hover:ring-indigo-500/20 transition-all text-left">
                  <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center text-2xl shadow-inner">🐶</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-900">귀여운 아기 강아지 도안</h4>
                      <span className="text-xs font-black text-slate-600">3.2 km</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">귀 끝 셰이프부터 4개의 앙증맞은 다리와 꼬리 각 디테일을 표현해 복귀하는 GPS 가이드 도안</p>
                  </div>
                </button>

                <button onClick={() => handleSelectCourse('sweetpotato')} className="w-full bg-white p-4 rounded-2xl shadow-xs border border-slate-100 flex items-center gap-4 hover:ring-2 hover:ring-indigo-500/20 transition-all text-left">
                  <div className="w-14 h-14 bg-purple-100 rounded-xl flex items-center justify-center text-2xl shadow-inner">🍠</div>
                  <div className="flex-1">
                    <div className="flex justify-between items-center">
                      <h4 className="text-sm font-bold text-slate-900">달콤 노릇 고구마 도안</h4>
                      <span className="text-xs font-black text-slate-600">2.7 km</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">상하 바디 굴곡은 타원형으로 부드럽게 가져가고 측면 끝자락은 뾰족하게 각을 주는 큐트 도안</p>
                  </div>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}