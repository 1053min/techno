import { useState, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router";

// 🔥 이전의 가짜 SEOUL_INTERSECTIONS 대신 실제 intersectionData를 불러옵니다.
import { INTERSECTION_LOCATIONS } from "../services/intersectionData";
import { getTrafficSignal, getPedestrianSignalTime, getSignalEmoji } from "../services/trafficSignalService";

export function TrackingPage() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  
  // 시연을 위해 특정 교차로(예: '10' 난곡우체국앞)를 타겟으로 잡습니다.
  // 실제 서비스 시에는 유저의 현재 GPS와 가장 가까운 교차로 ID를 넣게 됩니다.
  const targetIntersectionId = "10"; 

  useEffect(() => {
    const fetchData = async () => {
      const target = INTERSECTION_LOCATIONS[targetIntersectionId];
      if (target) {
        const data = await getTrafficSignal(target.itstId);
        if (data) {
          // 'nt'(북쪽) 보행신호를 기준으로 잔여 시간을 파싱합니다.
          setTimeLeft(getPedestrianSignalTime(data, 'nt'));
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // 10초 주기 실시간 동기화
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center">
      <ArrowLeft 
        className="absolute top-6 left-6 cursor-pointer w-8 h-8" 
        onClick={() => navigate(-1)} 
      />
      <div className="text-sm opacity-60 mb-2">
        실시간 보행 신호 (북쪽) - {INTERSECTION_LOCATIONS[targetIntersectionId]?.itstNm}
      </div>
      <div className="text-8xl font-black mb-4">
        {timeLeft !== null ? timeLeft.toFixed(1) : '대기 중'}
      </div>
      <div className="text-4xl">
        {timeLeft !== null ? getSignalEmoji(timeLeft) : '⏳'}
      </div>
    </div>
  );
}