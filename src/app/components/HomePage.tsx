import { Play, TrendingUp, Map, Heart, Award, Calendar } from "lucide-react";
import { useNavigate } from "react-router";

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="mb-2 text-2xl font-black text-slate-900">오늘의 러닝</h1>
            <p className="text-muted-foreground text-sm">멈추지 않는 당신의 리듬</p>
          </div>
          {/* ⚡ 크레딧 시스템 Mock-up */}
          <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-sm">
            <span className="text-base">⚡</span>
            <span className="font-bold text-orange-600 text-sm">2,400 C</span>
          </div>
        </div>

        {/* Main Action */}
        <button
          onClick={() => navigate("/routes", { state: { tab: 'recommend' } })}
          className="w-full bg-orange-500 text-white rounded-2xl p-8 mb-8 shadow-[0_8px_30px_rgb(249,115,22,0.3)] hover:shadow-[0_8px_30px_rgb(249,115,22,0.4)] transition-all active:scale-[0.98] text-left relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
          <div className="flex flex-col items-center gap-4">
            <div className="bg-white/20 rounded-xl p-5">
              <Play className="size-12" fill="white" />
            </div>
            <div className="text-center">
              <div className="text-xl font-bold mb-1">러닝 시작하기</div>
              <div className="text-sm opacity-90 font-medium">신호에 걸리지 않는 경로 찾기</div>
            </div>
          </div>
        </button>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={() => navigate("/map")}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left border border-gray-100"
          >
            <Map className="size-8 text-orange-500 mb-3" />
            <div className="font-bold text-slate-800 mb-1">실시간 지도</div>
            <div className="text-xs text-muted-foreground">신호 정보 보기</div>
          </button>

          <button
            onClick={() => navigate("/history")}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left border border-gray-100"
          >
            <TrendingUp className="size-8 text-black mb-3" />
            <div className="font-bold text-slate-800 mb-1">나의 기록</div>
            <div className="text-xs text-muted-foreground">성장 그래프</div>
          </button>

          {/* 🔥 뱃지 버튼 추가 */}
          <button
            onClick={() => navigate("/badges")}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left border border-gray-100"
          >
            <Award className="size-8 text-amber-500 mb-3" />
            <div className="font-bold text-slate-800 mb-1">내 뱃지</div>
            <div className="text-xs text-muted-foreground">달성 보상 확인</div>
          </button>

          {/* 🔥 월간 프로젝트 버튼 추가 */}
          <button
            onClick={() => navigate("/monthly-project")}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left border border-gray-100"
          >
            <Calendar className="size-8 text-emerald-500 mb-3" />
            <div className="font-bold text-slate-800 mb-1">월간 프로젝트</div>
            <div className="text-xs text-muted-foreground">스트링 아트 챌린지</div>
          </button>

          <button className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left border border-gray-100">
            <Heart className="size-8 text-pink-500 mb-3" />
            <div className="font-bold text-slate-800 mb-1">감정 일기</div>
            <div className="text-xs text-muted-foreground">러닝 무드</div>
          </button>

          {/* 🔥 요구사항 반영: '그림 그리기' 버튼을 누르면 드로잉 러닝 탭 상태를 가지고 페이지 이동 */}
          <button 
            onClick={() => navigate("/routes", { state: { tab: 'drawing' } })}
            className="bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-all active:scale-[0.98] text-left border border-gray-100 hover:ring-2 hover:ring-orange-500/20"
          >
            <div className="text-3xl mb-3">🎨</div>
            <div className="font-bold text-slate-800 mb-1">그림 그리기</div>
            <div className="text-xs text-muted-foreground">Drawing Running</div>
          </button>
        </div>

        {/* 🔥 베타 기능 테스트 랩 버튼 */}
        <button
          onClick={() => navigate("/beta-routes")}
          className="mt-6 w-full bg-slate-900 text-white rounded-xl p-4 shadow-md hover:bg-black transition-all active:scale-[0.98] text-center flex items-center justify-center gap-2"
        >
          <span className="text-xl">🧪</span>
          <span className="font-bold text-sm">베타 기능 테스트 랩 진입</span>
        </button>
      </div>
    </div>
  );
}