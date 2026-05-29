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
    { id: 1, d: "M 10 50 Q 25 30 50 50 T 90 50", color: "#67e8f9" }, // 파도결 1 - sky-400
    { id: 2, d: "M 10 55 Q 30 35 55 55 T 90 55", color: "#22d3ee" }, // 파도결 2 - cyan-400
    { id: 3, d: "M 10 60 Q 35 40 60 60 T 90 60", color: "#38bdf8" }, // 파도결 3 - light blue
    { id: 4, d: "M 10 65 Q 40 45 65 65 T 90 65", color: "#60a5fa" }, // 파도결 4 - blue-400
    { id: 5, d: "M 10 70 Q 45 50 70 70 T 90 70", color: "#3b82f6" }, // 파도결 5 - blue-500
    { id: 6, d: "M 10 75 Q 50 55 75 75 T 90 75", color: "#2563eb" }, // 파도결 6 - blue-600
    { id: 7, d: "M 10 80 Q 55 60 80 80 T 90 80", color: "#1d4ed8" }, // 파도결 7 - blue-700
  ];

  // 💡 오늘 달린 삐뚤빼뚤한 GPS 궤적
  const pathTangled = "M 10 90 L 25 20 L 40 85 L 60 10 L 75 80 L 90 30";
  // 💡 예술 작품의 일부가 되기 위해 팽팽하게 당겨진 실 (동일한 점 개수로 자연스러운 모핑 애니메이션 유도)
  const pathStraight = "M 10 85 Q 60 65 85 85 T 90 85";

  return (
    <div className="min-h-screen bg-orange-50 text-slate-900 pb-12 overflow-hidden relative selection:bg-orange-500/30">
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
      <div className="absolute top-[-10%] left-[-10%] w-64 h-64 bg-orange-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-[20%] right-[-10%] w-64 h-64 bg-amber-400 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>

      {/* 헤더 */}
      <div className="bg-white/80 backdrop-blur-md px-6 py-4 border-b border-gray-200 flex items-center gap-4 sticky top-0 z-50">
        <button onClick={() => navigate("/")} className="hover:bg-gray-100 p-1 rounded-full transition-colors">
          <ArrowLeft className="size-6 text-slate-900" />
        </button>
        <div>
          <h1 className="text-lg font-black text-black">꾸준함의 궤적</h1>
          <p className="text-xs font-bold text-orange-500">6월의 누적 프로젝트</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 pt-8 relative z-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-black mb-1 flex items-center gap-2 text-black">
              여름의 파도 엮기 {phase === 3 && <Sparkles className="size-5 text-amber-500 animate-pulse" />}
            </h2>
            <p className="text-sm text-gray-500 font-medium">매일의 불규칙한 노력이 모여 시원한 파도가 됩니다.</p>
          </div>
          <div className="bg-orange-100 p-3 rounded-2xl border border-orange-200">
            <Target className="size-6 text-orange-500" />
          </div>
        </div>

        {/* 메인 캔버스 영역 */}
        <div className="bg-white/90 border border-gray-200 backdrop-blur-xl rounded-3xl p-6 flex gap-6 shadow-lg h-[400px]">
          
          {/* 좌측: 실타래 아트 애니메이션 영역 */}
          <div className="flex-1 relative flex items-center justify-center">
            
            {/* 도안 윤곽선 (배경 못/가이드라인) */}
            <svg viewBox="0 0 100 100" className="absolute w-full h-full opacity-20">
              <circle cx="50" cy="50" r="45" fill="none" stroke="#f97316" strokeWidth="0.5" strokeDasharray="2,2" />
              {[...Array(12)].map((_, i) => (
                <circle 
                  key={i} 
                  cx={50 + 45 * Math.cos((i * Math.PI) / 6)} 
                  cy={50 + 45 * Math.sin((i * Math.PI) / 6)} 
                  r="1.5" fill="#f97316" 
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
                  stroke={phase >= 2 ? "#0ea5e9" : "#f43f5e"} // 빨강(복잡) -> 스카이블루(파도모양 안착)
                  strokeWidth={phase >= 2 ? "1.5" : "2"}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{
                    filter: phase === 2 ? 'drop-shadow(0 0 6px #38bdf8)' : 'none'
                  }}
                  className={`path-morph ${phase === 1 ? 'animate-draw opacity-0' : ''}`}
                />
              )}
            </svg>
          </div>

          {/* 우측: 수직 진행률 게이지 바 */}
          <div className={`w-8 h-full bg-gray-100 rounded-full border border-gray-200 relative overflow-hidden flex flex-col justify-end shadow-inner pb-1 transition-all duration-500 ${phase === 3 ? 'ring-2 ring-blue-400/50' : ''}`}>
            <div className="absolute top-2 left-0 w-full text-center text-[10px] font-black text-gray-400 z-20">
              100
            </div>
            {/* 차오르는 게이지 애니메이션 */}
            <div 
              className="w-full bg-gradient-to-t from-cyan-400 via-blue-500 to-blue-600 rounded-full transition-all duration-1000 ease-out relative"
              style={{ height: `${progress}%` }}
            >
              <div className="absolute top-0 left-0 w-full h-2 bg-white/60 rounded-full blur-[2px]"></div>
            </div>
          </div>
        </div>

        {/* 상태 메시지 인디케이터 */}
        <div className="mt-8 text-center bg-white border border-gray-200 shadow-sm rounded-2xl p-5 relative overflow-hidden">
          <div className="relative z-10 transition-opacity duration-300">
            {phase === 0 && <p className="text-gray-500 font-medium text-sm">과거의 기록들을 불러오는 중...</p>}
            {phase === 1 && <p className="text-rose-500 font-medium text-sm animate-pulse">오늘 달린 복잡한 궤적을 분석하고 있습니다...</p>}
            {phase === 2 && <p className="text-blue-600 text-sm font-bold">궤적을 변환하여 파도의 일부로 만듭니다!</p>}
            {phase === 3 && (
              <div className="animate-fade-in-up">
                <p className="text-black font-bold text-sm mb-1">
                  오늘의 노력이 작품의 일부가 되었습니다! 🎉
                </p>
                <p className="text-gray-500 text-xs font-medium">
                  현재 <strong className="text-blue-600 text-base">{progress}%</strong> 완성! 이번 달 목표까지 16km 남았어요.
                </p>
              </div>
            )}
          </div>
          
          {/* 완료 시 반짝이는 배경 효과 */}
          {phase === 3 && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-500/10 to-transparent animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}></div>
          )}
        </div>
      </div>
    </div>
  );
}