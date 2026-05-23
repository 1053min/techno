import { AlertCircle, Wifi, WifiOff } from "lucide-react";

interface ApiStatusProps {
  isUsingMockData?: boolean;
}

export function ApiStatus({ isUsingMockData = true }: ApiStatusProps) {
  if (!isUsingMockData) {
    return null;
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-3 mb-4 flex items-start gap-3">
      <WifiOff className="size-5 text-amber-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <div className="text-sm font-medium text-amber-900 mb-1">
          데모 모드
        </div>
        <div className="text-xs text-amber-700">
          CORS 제한으로 시뮬레이션 데이터를 사용 중입니다. 실제 서비스에서는 백엔드 서버를 통해 실시간 신호 정보를 제공합니다.
        </div>
      </div>
    </div>
  );
}
