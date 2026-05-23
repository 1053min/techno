import { useState } from "react";
import { useNavigate } from "react-router";
import { Home, Share2 } from "lucide-react";

export function CompletePage() {
  const navigate = useNavigate();
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

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

        {/* Personal Message */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-3xl p-6 mb-6">
          <div className="text-sm opacity-90 mb-2">💭 오늘의 메시지</div>
          <p className="leading-relaxed">
            "지난 주 같은 코스를 달렸을 때보다 2분 빨라졌어요.
            꾸준함이 만든 성장입니다."
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex-1 bg-primary text-primary-foreground rounded-2xl py-4 flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all"
          >
            <Home className="size-5" />
            홈으로
          </button>
          <button className="flex-1 bg-white border-2 border-border rounded-2xl py-4 flex items-center justify-center gap-2 hover:bg-secondary transition-colors">
            <Share2 className="size-5" />
            기록 저장
          </button>
        </div>

        {/* Streak Counter */}
        <div className="mt-6 text-center">
          <div className="inline-flex items-center gap-2 bg-amber-100 text-amber-900 rounded-full px-4 py-2">
            <span className="text-lg">🔥</span>
            <span className="text-sm font-medium">7일 연속 러닝 중!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
