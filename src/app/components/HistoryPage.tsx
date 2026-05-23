import { ArrowLeft, Calendar, TrendingUp } from "lucide-react";
import { useNavigate } from "react-router";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export function HistoryPage() {
  const navigate = useNavigate();

  const weeklyData = [
    { id: "mon", day: "월", distance: 3.2, mood: "😊" },
    { id: "tue", day: "화", distance: 5.1, mood: "💪" },
    { id: "wed", day: "수", distance: 0, mood: "" },
    { id: "thu", day: "목", distance: 4.8, mood: "😌" },
    { id: "fri", day: "금", distance: 6.2, mood: "🔥" },
    { id: "sat", day: "토", distance: 7.5, mood: "💪" },
    { id: "sun", day: "일", distance: 5.2, mood: "😊" },
  ];

  const recentRuns = [
    {
      id: "run-1",
      date: "2026-05-13",
      distance: 5.2,
      time: "30:24",
      mood: "😊",
      stops: 0,
    },
    {
      id: "run-2",
      date: "2026-05-11",
      distance: 7.5,
      time: "44:12",
      mood: "💪",
      stops: 1,
    },
    {
      id: "run-3",
      date: "2026-05-10",
      distance: 6.2,
      time: "36:48",
      mood: "🔥",
      stops: 0,
    },
  ];

  const totalDistance = weeklyData.reduce((sum, d) => sum + d.distance, 0);
  const avgDistance = totalDistance / weeklyData.filter(d => d.distance > 0).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* Header */}
      <div className="bg-white border-b border-border px-6 py-4">
        <div className="max-w-md mx-auto flex items-center gap-4">
          <button onClick={() => navigate("/")} className="p-2 -ml-2 hover:bg-secondary rounded-full">
            <ArrowLeft className="size-6" />
          </button>
          <div>
            <h2 className="mb-0">나의 기록</h2>
            <p className="text-sm text-muted-foreground">나와의 대화</p>
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-6">
        {/* Weekly Summary */}
        <div className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white rounded-3xl p-6 mb-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="size-5" />
            <span className="text-sm opacity-90">이번 주 (5월 7일 - 5월 13일)</span>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm opacity-75 mb-1">총 거리</div>
              <div className="text-3xl font-medium">{totalDistance.toFixed(1)} km</div>
            </div>
            <div>
              <div className="text-sm opacity-75 mb-1">평균 거리</div>
              <div className="text-3xl font-medium">{avgDistance.toFixed(1)} km</div>
            </div>
          </div>
        </div>

        {/* Progress Chart */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3>주간 그래프</h3>
            <TrendingUp className="size-5 text-green-600" />
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "#fff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "0.5rem"
                }}
              />
              <Line
                type="monotone"
                dataKey="distance"
                stroke="#6366f1"
                strokeWidth={3}
                dot={{ fill: "#6366f1", r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Mood Calendar */}
        <div className="bg-white rounded-3xl p-6 mb-6 shadow-lg">
          <h3 className="mb-4">이번 주 감정</h3>
          <div className="grid grid-cols-7 gap-2">
            {weeklyData.map((day) => (
              <div key={day.id} className="text-center">
                <div className="text-xs text-muted-foreground mb-2">{day.day}</div>
                <div className={`aspect-square rounded-xl flex items-center justify-center text-2xl ${
                  day.mood ? "bg-indigo-50" : "bg-gray-50"
                }`}>
                  {day.mood || "—"}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Runs */}
        <div className="bg-white rounded-3xl p-6 shadow-lg">
          <h3 className="mb-4">최근 러닝</h3>
          <div className="space-y-3">
            {recentRuns.map((run) => (
              <div key={run.id} className="flex items-center gap-4 p-4 bg-secondary rounded-2xl">
                <div className="text-3xl">{run.mood}</div>
                <div className="flex-1">
                  <div className="font-medium mb-1">{run.distance} km</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(run.date).toLocaleDateString("ko-KR", {
                      month: "long",
                      day: "numeric"
                    })} · {run.time}
                  </div>
                </div>
                {run.stops === 0 && (
                  <div className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                    무정지 ✨
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 bg-gradient-to-r from-amber-100 to-orange-100 rounded-3xl p-6">
          <div className="text-sm text-amber-900 mb-2">💡 인사이트</div>
          <p className="text-amber-900 leading-relaxed">
            이번 주는 지난 주보다 평균 1.2km 더 달렸어요.
            특히 주말에 가장 활발했습니다. 꾸준한 성장이 보이네요!
          </p>
        </div>
      </div>
    </div>
  );
}
