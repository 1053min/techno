import { useEffect, useState } from "react";
import { ArrowLeft, Target, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

export function MonthlyProjectPage() {
  const navigate = useNavigate();
  
  // 애니메이션 페이즈 상태 관리
  // 0: 대기, 1: 궤적 그리기(오늘의 런), 2: 실타래로 변환(팽팽해짐), 3: 완료 및 게이지 상승
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState(64); // 기존 64%에서 시작

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 500); // 0.5초 후 궤적 그리기 시작
    const t2 = setTimeout(() => setPhase(2), 3500); // 3.5초 후 실타래로 팽팽하게 변환
    const t3 = setTimeout(() => {
      setPhase(3);
      setProgress(68); // 5초 후 게이지 68%로 상승
    }, 5000); 

    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // 과거에 뛰었던 기록들 (누적된 색상의 실들)
  const pastRuns = [
    { id: 1, d: "M 50 10 L 90 60", color: "#6366f1" }, // 1일차 - Indigo
    { id: 2, d: "M 90 60 L 20 80", color: "#14b8a6" }, // 2일차 - Teal
    { id: 3, d: "M 10 40 L 80 20", color: "#a855f7" }, // 3일차 - Purple
    { id: 4, d: "M 50 90 L 10 40", color: "#ec4899" }, // 4일차 - Pink
    { id: 5, d: "M 80 90 L 50 10", color: "#06b6d4" }, // 5일차 - Cyan
    { id: 6, d: "M 50 10 L 20 80", color: "#3b82f6" }, // 6일차 - Blue
    { id: 7, d: "M 80 20 L 50 90", color: "#8b5cf6" }, // 7일차 - Violet
  ];

  // 💡 오늘 달린 삐뚤빼뚤한 GPS 궤적
  const pathTangled = "M 20 80 L 15 60 L 35 50 L 25 30 L 65 40 L 80 20";
  // 💡 예술 작품의 일부가 되기 위해 팽팽하게 당겨진 실 (동일한 점 개수로 자연스러운 모핑 애니메이션 유도)
  const pathStraight = "M 20 80 L 32 68 L 44 56 L 56 44 L 68 32 L 80 20";

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-12 overflow-hidden relative">
      {/* 애니메이션용 커스텀 CSS */}
      <style>{`
        @keyframes draw-path {
          0% { stroke-dasharray: 200; stroke-dashoffset: 200; opacity: 1; }
          100% { stroke-dasharray: 200; stroke-dashoffset: 0; opacity: 1; }
        }
        .animate-draw {
          animation: draw-path 2.5s ease-in-out forwards;
        }
        /* Chrome 등에서 path의 d 속성이 자연스럽게 변하는 모핑 트랜지션 */
        .path-morph {
          transition: d 1.5s cubic-bezier(0.4, 0, 0.2, 1), stroke 1s ease, filter 1s ease;
        }
      `}</style>

      {/* 배경 블러 효과 */}
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-purple-600 rounded-full mix-blend-multiply filter blur-3xl opacity-50 animate-blob animation-delay-2000"></div>

      {/* 헤더 */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-4 sticky top-0 z-50">
        <button onClick={() => navigate("/")} className="hover:bg-white/10 p-1 rounded-full transition-colors">
          <ArrowLeft className="size-6 text-white" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-white">꾸준함의 실타래</h1>
          <p className="text-xs text-indigo-300">11월의 누적 궤적 프로젝트</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-8 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black mb-1 flex items-center gap-2">
              우주 고래 엮기 {phase === 3 && <Sparkles className="size-5 text-amber-400 animate-pulse" />}
            </h2>
            <p className="text-sm text-slate-400">매일의 불규칙한 노력이 모여 작품이 됩니다.</p>
          </div>
          <div className="bg-white/10 p-3 rounded-2xl border border-white/20">
            <Target className="size-6 text-indigo-400" />
          </div>
        </div>

        {/* 메인 캔버스 영역 */}
        <div className="bg-black/40 border border-white/10 backdrop-blur-xl rounded-3xl p-6 flex gap-6 shadow-2xl h-[400px]">
          
          {/* 좌측: 실타래 아트 애니메이션 영역 */}
          <div className="flex-1 relative flex items-center justify-center">
            
            {/* 도안 윤곽선 (배경 못/가이드라인) */}
            <svg viewBox="0 0 100 100" className="absolute w-full h-full opacity-30">
              <circle cx="50" cy="50" r="45" fill="none" stroke="white" strokeWidth="0.2" strokeDasharray="2,2" />
              {[...Array(12)].map((_, i) => (
                <circle 
                  key={i} 
                  cx={50 + 45 * Math.cos((i * Math.PI) / 6)} 
                  cy={50 + 45 * Math.sin((i * Math.PI) / 6)} 
                  r="1.5" fill="white" 
                />
              ))}
            </svg>

            {/* 그려지는 실들 */}
            <svg viewBox="0 0 100 100" className="relative w-full h-full">
              {/* 과거의 누적된 궤적들 (투명도 있게 표현) */}
              {pastRuns.map((run) => (
                <path
                  key={run.id}
                  d={run.d}
                  fill="none"
                  stroke={run.color}
                  strokeWidth="1"
                  className="transition-opacity duration-1000"
                  style={{ opacity: phase > 0 ? 0.6 : 0 }}
                />
              ))}

              {/* 🔥 오늘의 러닝 궤적 애니메이션 */}
              {phase > 0 && (
                <path 
                  d={phase >= 2 ? pathStraight : pathTangled}
                  fill="none" 
                  stroke={phase >= 2 ? "#fbbf24" : "#f472b6"} // 핑크(복잡) -> 골드(팽팽함)
                  strokeWidth={phase >= 2 ? "1.5" : "2"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: phase === 2 ? 'drop-shadow(0 0 6px #f59e0b)' : 'none'
                  }}
                  className={`path-morph ${phase === 1 ? 'animate-draw opacity-0' : ''}`}
                />
              )}
            </svg>
          </div>

          {/* 우측: 수직 진행률 게이지 바 */}
          <div className={`w-8 h-full bg-white/5 rounded-full border border-white/10 relative overflow-hidden flex flex-col justify-end shadow-inner pb-1 transition-all duration-500 ${phase === 3 ? 'ring-2 ring-amber-400/50' : ''}`}>
            <div className="absolute top-2 left-0 w-full text-center text-[10px] font-black text-white/50 z-20">
              100
            </div>
            {/* 차오르는 게이지 애니메이션 */}
            <div 
              className="w-full bg-gradient-to-t from-indigo-500 via-purple-500 to-pink-500 rounded-full transition-all duration-1000 ease-out relative"
              style={{ height: `${progress}%` }}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-white/70 rounded-full blur-[2px]"></div>
            </div>
          </div>
        </div>

        {/* 상태 메시지 인디케이터 */}
        <div className="mt-8 text-center bg-indigo-600/20 border border-indigo-500/30 rounded-2xl p-5 relative overflow-hidden">
          <div className="relative z-10 transition-opacity duration-300">
            {phase === 0 && <p className="text-indigo-200 text-sm">과거의 기록들을 불러오는 중...</p>}
            {phase === 1 && <p className="text-pink-300 text-sm animate-pulse">오늘 달린 복잡한 궤적을 분석하고 있습니다...</p>}
            {phase === 2 && <p className="text-amber-300 text-sm font-bold">궤적을 실타래로 변환하여 예술 작품에 엮습니다!</p>}
            {phase === 3 && (
              <div className="animate-fade-in-up">
                <p className="text-white font-medium text-sm mb-1">
                  오늘의 노력이 작품의 일부가 되었습니다! 🎉
                </p>
                <p className="text-indigo-200 text-xs">
                  현재 <strong className="text-amber-400 text-base">{progress}%</strong> 완성! 이번 달 목표까지 16km 남았어요.
                </p>
              </div>
            )}
          </div>
          
          {/* 완료 시 반짝이는 배경 효과 */}
          {phase === 3 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}></div>
          )}
        </div>
      </div>
    </div>
  );
}