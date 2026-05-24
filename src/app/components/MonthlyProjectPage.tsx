import { ArrowLeft, Target } from "lucide-react";
import { useNavigate } from "react-router";

export function MonthlyProjectPage() {
  const navigate = useNavigate();

  // Mockup Data
  const progressPercent = 68; // 68% 달성

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-12 overflow-hidden relative">
      {/* 배경 블러 효과 */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      {/* 헤더 (다크 모드 디자인) */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-4 sticky top-0 z-50">
        <button onClick={() => navigate("/")} className="hover:bg-white/10 p-1 rounded-full transition-colors">
          <ArrowLeft className="size-6 text-white" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">월간 프로젝트</h1>
          <p className="text-xs text-indigo-300">11월의 스트링 아트 챌린지</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-8 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black mb-1">별의 궤적 꿰매기</h2>
            <p className="text-sm text-slate-400">누적 거리로 도안을 완성하세요</p>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl border border-white/20">
            <Target className="size-6 text-indigo-400" />
          </div>
        </div>

        {/* 메인 캔버스 영역 (도안 & 게이지) */}
        <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl p-6 flex gap-6 shadow-2xl h-[400px]">
          
          {/* 좌측: 실타래 아트 애니메이션 영역 */}
          <div className="flex-1 relative flex items-center justify-center">
            {/* 도안 윤곽선 (옅은 배경 선) */}
            <svg viewBox="0 0 100 100" className="absolute w-full h-full opacity-20">
              <path d="M50 5 L61 38 L95 38 L67 59 L78 92 L50 72 L22 92 L33 59 L5 38 L39 38 Z" fill="none" stroke="white" strokeWidth="0.5" />
            </svg>

            {/* 🔥 실(Thread)이 그려지는 애니메이션 */}
            <svg viewBox="0 0 100 100" className="relative w-full h-full drop-shadow-[0_0_8px_rgba(99,102,241,0.8)]">
              <defs>
                <linearGradient id="threadGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#c084fc" />
                </linearGradient>
              </defs>
              {/* 기하학적 궤적 (별을 엮는 복잡한 패턴) */}
              <path 
                d="M50 5 L67 59 L5 38 L95 38 L33 59 Z" 
                fill="none" 
                stroke="url(#threadGradient)" 
                strokeWidth="1.5" 
                strokeLinecap="round"
                className="animate-draw-thread"
              />
            </svg>
          </div>

          {/* 우측: 수직 진행률 게이지 바 */}
          <div className="w-8 h-full bg-white/5 rounded-full border border-white/10 relative overflow-hidden flex flex-col justify-end shadow-inner pb-1">
            {/* 텍스트 퍼센트 표시 */}
            <div className="absolute top-2 left-0 w-full text-center text-[10px] font-black text-white/50 z-20">
              100
            </div>
            {/* 차오르는 게이지 애니메이션 */}
            <div 
              className="w-full bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
              style={{ height: `${progressPercent}%` }}
            >
              {/* 빛나는 팁 */}
              <div className="absolute top-0 left-0 w-full h-2 bg-white/50 rounded-full blur-[2px]"></div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-4">
          <p className="text-indigo-200 font-medium text-sm">
            현재 <strong className="text-white text-lg">{progressPercent}%</strong> 완성되었습니다! <br/> 이번 달 목표까지 16km 남았어요. 🏃‍♂️💨
          </p>
        </div>
      </div>
    </div>
  );
}