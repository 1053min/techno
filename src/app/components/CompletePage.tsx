import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Home, Save, Share2 } from "lucide-react";

export function CompletePage() {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [routeScore, setRouteScore] = useState<number>(8); // 코스 평가 점수 (기본 8점)
  const [routeInfo, setRouteInfo] = useState<any>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // 뛰었던 경로 정보를 세션에서 가져옴
  useEffect(() => {
    const rawData = sessionStorage.getItem('selected_run_route');
    if (rawData) {
      setRouteInfo(JSON.parse(rawData));
    }
  }, []);

  const handleSaveRecord = async () => {
    const record = {
      date: new Date().toISOString(),
      mood: selectedMood,
      routeScore: routeScore, // 1~10점 평가 점수
      routeData: routeInfo,   // 어떤 경로였는지 맵핑 데이터
    };
    
    setIsSaving(true);
    try {
      const response = await fetch('/api/save-record', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ record })
      });
      const result = await response.json();

      if (response.ok) {
        console.log("[GitHub DB 저장 성공]", result);
        alert(`기록이 저장되었습니다!\n평가 점수: ${routeScore}점\n(수집된 데이터는 향후 AI 경로 추천 학습에 활용됩니다.)`);
        navigate("/history");
      } else {
        alert(`저장에 실패했습니다: ${result.error}`);
      }
    } catch (error) {
      alert('서버와 통신 중 문제가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  const moods = [
    { emoji: "😊", label: "행복해요", value: "happy" },
    { emoji: "💪", label: "뿌듯해요", value: "proud" },
    { emoji: "😌", label: "평온해요", value: "peaceful" },
    { emoji: "🔥", label: "에너지 넘쳐요", value: "energetic" },
    { emoji: "😮‍💨", label: "힘들었어요", value: "tired" },
    { emoji: "🤔", label: "그저 그래요", value: "neutral" },
  ];

  return (
    <div className="min-h-screen bg-gray-50 px-6 py-8 font-sans text-slate-900 selection:bg-orange-500/30">
      <div className="max-w-md mx-auto">
        {/* Celebration */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="mb-2 text-2xl font-black text-black tracking-tight">러닝 완료!</h1>
          <p className="text-slate-400 font-medium text-sm">오늘도 멈추지 않은 당신</p>
        </div>

        {/* Run Summary */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 mb-6 shadow-md">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-medium mb-1">5.2</div>
              <div className="text-sm text-slate-500">km</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-medium mb-1">30:24</div>
              <div className="text-sm text-slate-500">시간</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-medium mb-1">5.8</div>
              <div className="text-sm text-slate-500">분/km</div>
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-400">신호 대기</span>
              <span className="font-medium text-emerald-400">0회 ✨</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">소모 칼로리</span>
              <span className="font-medium">약 320 kcal</span>
            </div>
          </div>
        </div>

        {/* Mood Selection */}
        <div className="bg-white border border-gray-200 rounded-3xl p-6 mb-6 shadow-md">
          <h3 className="mb-4 font-bold text-black">오늘 러닝은 어땠나요?</h3>
          <div className="grid grid-cols-3 gap-3">
            {moods.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={`rounded-2xl p-4 transition-all ${
                  selectedMood === mood.value
                    ? "bg-orange-500/10 border-2 border-orange-500"
                    : "bg-gray-50 hover:bg-gray-100 border-2 border-transparent"
                }`}
              >
                <div className="text-3xl mb-2">{mood.emoji}</div>
                <div className="text-xs font-medium text-slate-500">{mood.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 🔥 AI 학습 데이터 수집용 코스 평가 (1~10점) */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-md border-2 border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-black">코스 형태 만족도</h3>
            <span className="text-xl font-black text-orange-500">{routeScore}점</span>
          </div>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            생성된 경로가 원래 목적(또는 도안)과 얼마나 비슷한지 평가해 주세요. 이 평가 데이터는 AI가 완벽한 도로망 매핑을 학습하는 데 사용됩니다.
          </p>
          <input 
            type="range" 
            min="1" 
            max="10" 
            step="1" 
            value={routeScore} 
            onChange={(e) => setRouteScore(Number(e.target.value))}
            className="w-full accent-orange-500 mb-2 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>1점 (전혀 다름)</span>
            <span>10점 (완벽함)</span>
          </div>
        </div>

        {/* Personal Message */}
        <div className="bg-orange-50 border border-orange-200 text-orange-900 rounded-3xl p-6 mb-6 shadow-sm">
          <div className="text-sm font-bold opacity-80 mb-2 uppercase tracking-wide">💭 Daily Message</div>
          <p className="leading-relaxed">
            "오늘도 무사히 완주하셨네요! 입력해주신 {routeScore}점의 피드백을 바탕으로 내일은 더 완벽한 코스를 만들어 드릴게요."
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/")}
            className="flex-1 bg-white text-black rounded-2xl py-4 flex items-center justify-center gap-2 shadow-md hover:bg-gray-50 transition-all font-bold border border-gray-200 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="size-5" />
            홈으로
          </button>
          <button 
            onClick={handleSaveRecord}
            disabled={isSaving}
            className="flex-1 bg-black border-2 border-black rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-gray-800 transition-all font-bold text-white shadow-md hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          >
            <Save className="size-5" />
            {isSaving ? '저장 중...' : '평가 및 저장'}
          </button>
        </div>

        {/* Streak Counter */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-gray-200">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-bold text-emerald-400">7일 연속 러닝 중!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
