import { Play, TrendingUp, Map, Award, ChevronRight, User } from "lucide-react";
import { useNavigate } from "react-router";

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 pb-28 font-sans text-slate-900 relative">
      {/* Header Section */}
      <header className="bg-white px-6 pt-12 pb-6 rounded-b-3xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] mb-6">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border border-gray-200">
              <User className="size-6 text-gray-400" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight text-slate-900">안녕하세요, 러너님!</h1>
              <p className="text-xs font-bold text-gray-500 mt-0.5">오늘도 달릴 준비 되셨나요?</p>
            </div>
          </div>
          <div className="bg-orange-50 text-orange-600 px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1 border border-orange-100 shadow-sm">
            <span>⚡</span> 2,400 C
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-6 space-y-8">
        
        {/* Hero Section - Monthly Challenge */}
        <section>
          <div className="flex justify-between items-end mb-3 px-1">
            <h2 className="text-lg font-black text-slate-900">이달의 챌린지</h2>
            <button onClick={() => navigate("/monthly-project")} className="text-[11px] font-bold text-orange-500 flex items-center hover:text-orange-600">
              자세히 보기 <ChevronRight className="size-3 ml-0.5" />
            </button>
          </div>
          <div 
            onClick={() => navigate("/monthly-project")}
            className="w-full bg-slate-900 rounded-[2rem] p-6 relative overflow-hidden cursor-pointer shadow-lg active:scale-[0.98] transition-transform"
          >
            <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
            <div className="relative z-10">
              <div className="bg-white/10 backdrop-blur-md w-fit px-2 py-1 rounded-md text-[10px] font-bold text-white mb-2 uppercase tracking-widest border border-white/10">
                June Project
              </div>
              <h3 className="text-2xl font-black text-white mb-1">여름의 파도 엮기</h3>
              <p className="text-xs text-slate-400 font-medium mb-5">현재 64% 달성 · 16km 남음</p>
              
              <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full w-[64%] rounded-full relative">
                  <div className="absolute top-0 right-0 w-4 h-full bg-white/50 blur-[2px]"></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Dashboard Categories (Asymmetric Grid) */}
        <section>
          <h2 className="text-lg font-black text-slate-900 mb-3 px-1">대시보드</h2>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => navigate("/history")}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-36 active:scale-[0.98] transition-transform text-left hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100">
                <TrendingUp className="size-5 text-slate-800" />
              </div>
              <div>
              <div className="font-bold text-base text-slate-900 mb-0.5">나의 기록</div>
              <div className="text-xs text-gray-500 font-medium">성장 그래프 분석</div>
              </div>
            </button>

            <button 
              onClick={() => navigate("/badges")}
              className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between h-36 active:scale-[0.98] transition-transform text-left hover:shadow-md"
            >
              <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center border border-orange-100">
                <Award className="size-5 text-orange-500" />
              </div>
              <div>
              <div className="font-bold text-base text-slate-900 mb-0.5">내 뱃지</div>
              <div className="text-xs text-gray-500 font-medium">달성 보상 확인</div>
              </div>
            </button>
            
            <button 
              onClick={() => navigate("/map")}
              className="col-span-2 bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center justify-between active:scale-[0.98] transition-transform text-left hover:shadow-md"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                  <Map className="size-5 text-emerald-600" />
                </div>
                <div>
                <div className="font-bold text-base text-slate-900 mb-0.5">실시간 신호 지도</div>
                <div className="text-sm text-gray-500 font-medium">주변 교차로 정보 탐색</div>
                </div>
              </div>
              <ChevronRight className="size-5 text-gray-300" />
            </button>
          </div>
        </section>

        {/* Creative & Labs */}
        <section>
           <h2 className="text-lg font-black text-slate-900 mb-3 px-1">크리에이티브 러닝</h2>
           <div className="space-y-3">
             <button 
                onClick={() => navigate("/routes", { state: { tab: 'drawing' } })}
                className="w-full bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4 active:scale-[0.98] transition-transform text-left hover:shadow-md"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center text-xl border border-gray-100">🎨</div>
                <div className="flex-1">
                <div className="font-bold text-base text-slate-900 mb-0.5">GPS 아트 드로잉</div>
                <div className="text-sm text-gray-500 font-medium">지도 위에 예술을 남겨보세요</div>
                </div>
                <ChevronRight className="size-4 text-gray-300" />
              </button>

              <button 
                onClick={() => navigate("/beta-routes")}
                className="w-full bg-slate-900 text-white p-5 rounded-3xl shadow-md flex items-center gap-4 active:scale-[0.98] transition-transform text-left hover:bg-black"
              >
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center text-xl border border-white/10">🧪</div>
                <div className="flex-1">
                <div className="font-bold text-base mb-0.5">베타 기능 연구소</div>
                <div className="text-sm text-gray-400 font-medium">새로운 기능을 먼저 체험하세요</div>
                </div>
                <ChevronRight className="size-4 text-gray-500" />
              </button>
           </div>
        </section>
      </main>

      {/* Floating Action Button (Start Running) */}
      <div className="fixed bottom-6 left-0 right-0 px-6 z-50 flex justify-center pointer-events-none">
        <div className="max-w-md w-full pointer-events-auto">
          <button
            onClick={() => navigate("/routes", { state: { tab: 'recommend' } })}
            className="w-full bg-orange-500 text-white rounded-full py-4 px-6 shadow-[0_8px_25px_rgb(249,115,22,0.35)] hover:shadow-[0_8px_30px_rgb(249,115,22,0.5)] hover:-translate-y-1 transition-all active:scale-[0.98] flex items-center justify-center gap-2 border border-orange-400"
          >
            <Play className="size-6" fill="white" />
            <span className="font-black tracking-wide text-xl mt-0.5">러닝 시작하기</span>
          </button>
        </div>
      </div>
    </div>
  );
}