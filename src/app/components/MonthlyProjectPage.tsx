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

  // 파도의 부드러운 곡선을 9개의 꼭짓점으로 쪼개어 만든 베이스 경로
  const getWavePath = (yOffset: number) => {
    return `M 10 ${yOffset} L 20 ${yOffset - 12} L 30 ${yOffset - 18} L 40 ${yOffset - 14} L 50 ${yOffset} L 60 ${yOffset + 14} L 70 ${yOffset + 18} L 80 ${yOffset + 12} L 90 ${yOffset}`;
  };

  // 과거에 뛰었던 기록들 (누적된 색상의 실들)
  const pastRuns = [
    { id: 1, d: getWavePath(50), color: "#67e8f9" }, // 파도결 1
    { id: 2, d: getWavePath(55), color: "#22d3ee" }, // 파도결 2
    { id: 3, d: getWavePath(60), color: "#38bdf8" }, // 파도결 3
    { id: 4, d: getWavePath(65), color: "#60a5fa" }, // 파도결 4
    { id: 5, d: getWavePath(70), color: "#3b82f6" }, // 파도결 5
    { id: 6, d: getWavePath(75), color: "#2563eb" }, // 파도결 6
    { id: 7, d: getWavePath(80), color: "#1d4ed8" }, // 파도결 7
  ];

  // 전체 작품의 배경이 될 가이드라인 (10개의 층)
  const guideWaves = Array.from({ length: 10 }, (_, i) => getWavePath(50 + i * 5));

  // 💡 오늘 달린 삐뚤빼뚤한 현실 GPS 궤적 (부드러운 모핑을 위해 파도선과 완벽히 같은 개수의 점(9개) 구조 사용)
  const pathTangled = "M 10 90 L 15 40 L 25 75 L 35 25 L 50 85 L 65 30 L 75 70 L 85 45 L 90 80";
  // 💡 예술 작품의 8번째 층으로 펴지며 안착할 형태
  const pathStraight = getWavePath(85);

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
          transition: d 2s cubic-bezier(0.34, 1.56, 0.64, 1), stroke 1s ease, filter 1s ease;
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
            
            {/* 도안 전체 실루엣 (파도 형태 가이드라인) */}
            <svg viewBox="0 0 100 100" className="absolute w-full h-full opacity-20">
              {guideWaves.map((d, i) => (
                <path
                  key={`guide-${i}`}
                  d={d}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="0.5"
                  strokeDasharray="1.5,2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
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