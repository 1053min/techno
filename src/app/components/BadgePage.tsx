import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

export function BadgePage() {
  const navigate = useNavigate();

  const badges = [
    { id: 1, title: "4주 연속 러닝", desc: "한 달 내내 지치지 않는 열정!", emoji: "🔥", color: "from-orange-400 to-red-500", achieved: true },
    { id: 2, title: "월간 50km 달성", desc: "마라톤 풀코스보다 긴 거리", emoji: "🏃‍♂️", color: "from-indigo-400 to-purple-500", achieved: true },
    { id: 3, title: "첫 야간 러닝", desc: "밤공기를 가르는 감성 러너", emoji: "🌙", color: "from-blue-400 to-indigo-600", achieved: true },
    { id: 4, title: "드로잉 아티스트", desc: "지도 위에 예술을 그리다", emoji: "🎨", color: "from-pink-400 to-rose-500", achieved: true },
    { id: 5, title: "신호등 브레이커", desc: "무정지율 100% 10회 달성", emoji: "🚦", color: "from-emerald-400 to-green-500", achieved: false },
    { id: 6, title: "한강 마스터", desc: "한강 코스 10번 완주", emoji: "🌊", color: "from-cyan-400 to-blue-500", achieved: false },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* 헤더 */}
      <div className="bg-white px-6 py-4 border-b flex items-center gap-4 sticky top-0 z-50 shadow-xs">
        <button onClick={() => navigate("/")} className="hover:bg-slate-100 p-1 rounded-full transition-colors">
          <ArrowLeft className="size-6 text-slate-800" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-900">내 뱃지</h1>
          <p className="text-xs text-slate-500">지금까지 모은 러닝의 흔적들</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-6">
        <div className="grid grid-cols-2 gap-4">
          {badges.map((badge) => (
            <div 
              key={badge.id} 
              className={`relative bg-white rounded-3xl p-5 border text-center transition-all ${
                badge.achieved ? 'border-slate-100 shadow-md hover:-translate-y-1' : 'border-slate-100 opacity-60 grayscale'
              }`}
            >
              {/* 뱃지 아이콘 (그라데이션 배경) */}
              <div className={`w-20 h-20 mx-auto rounded-full bg-gradient-to-br ${badge.color} flex items-center justify-center text-4xl shadow-inner mb-3`}>
                {badge.emoji}
              </div>
              
              <h3 className="font-bold text-slate-800 text-sm mb-1">{badge.title}</h3>
              <p className="text-[10px] text-slate-500 leading-tight">{badge.desc}</p>

              {/* 자물쇠 오버레이 */}
              {!badge.achieved && (
                <div className="absolute inset-0 bg-white/40 backdrop-blur-[1px] rounded-3xl flex items-center justify-center">
                  <div className="bg-slate-800/80 text-white rounded-full p-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}