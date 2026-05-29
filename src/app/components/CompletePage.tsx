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
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white px-6 py-8">
      <div className="max-w-md mx-auto">
        {/* Celebration */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="mb-2">러닝 완료!</h1>
          <p className="text-muted-foreground">오늘도 멋진 당신</p>
        </div>

        {/* Run Summary */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-lg">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center">
              <div className="text-3xl font-medium mb-1">5.2</div>
              <div className="text-sm text-muted-foreground">km</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-medium mb-1">30:24</div>
              <div className="text-sm text-muted-foreground">시간</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-medium mb-1">5.8</div>
              <div className="text-sm text-muted-foreground">분/km</div>
            </div>
          </div>

          <div className="border-t border-border pt-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-muted-foreground">신호 대기</span>
              <span className="font-medium text-green-600">0회 ✨</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">소모 칼로리</span>
              <span className="font-medium">약 320 kcal</span>
            </div>
          </div>
        </div>

        {/* Mood Selection */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-lg">
          <h3 className="mb-4">오늘 러닝은 어땠나요?</h3>
          <div className="grid grid-cols-3 gap-3">
            {moods.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={`rounded-2xl p-4 transition-all ${
                  selectedMood === mood.value
                    ? "bg-indigo-100 border-2 border-indigo-500"
                    : "bg-secondary hover:bg-indigo-50 border-2 border-transparent"
                }`}
              >
                <div className="text-3xl mb-2">{mood.emoji}</div>
                <div className="text-xs">{mood.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* 🔥 AI 학습 데이터 수집용 코스 평가 (1~10점) */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-lg border-2 border-indigo-50">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-800">코스 형태 만족도</h3>
            <span className="text-xl font-black text-indigo-600">{routeScore}점</span>
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
            className="w-full accent-indigo-600 mb-2 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-400 font-bold">
            <span>1점 (전혀 다름)</span>
            <span>10점 (완벽함)</span>
          </div>
        </div>

        {/* Personal Message */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-3xl p-6 mb-6">
          <div className="text-sm opacity-90 mb-2">💭 오늘의 메시지</div>
          <p className="leading-relaxed">
            "오늘도 무사히 완주하셨네요! 입력해주신 {routeScore}점의 피드백을 바탕으로 내일은 더 완벽한 코스를 만들어 드릴게요."
          </p>
        </div>

        {/* Actions */}
          <button
            onClick={() => navigate("/")}
            className="flex-1 bg-primary text-primary-foreground rounded-2xl py-4 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Home className="size-5" />
            홈으로
          </button>
          <button 
            onClick={handleSaveRecord}
            disabled={isSaving}
            className="flex-1 bg-white border-2 border-border rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-slate-50 transition-colors font-bold text-slate-700 shadow-sm disabled:opacity-50"
          >
            <Save className="size-5" />
            {isSaving ? '저장 중...' : '평가 및 저장'}
          </button>

        {/* Streak Counter */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center justify-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border border-slate-100">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-medium">7일 연속 러닝 중!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
