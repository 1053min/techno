interface TrafficLightProps {
  pedestrianTime: number; // 보행 신호 (초)
  vehicleTime?: number; // 차량 신호 (초, 선택)
  size?: 'small' | 'medium' | 'large';
}

export function TrafficLight({ pedestrianTime, vehicleTime, size = 'medium' }: TrafficLightProps) {
  const getStatus = (time: number) => {
    if (time > 20) return 'green';
    if (time > 0) return 'yellow';
    return 'red';
  };

  const pedestrianStatus = getStatus(pedestrianTime);

  const sizeClasses = {
    small: 'w-20',
    medium: 'w-24',
    large: 'w-32',
  };

  const lightSize = {
    small: 'w-3 h-3',
    medium: 'w-4 h-4',
    large: 'w-5 h-5',
  };

  const fontSize = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base',
  };

  return (
    <div className={`${sizeClasses[size]} bg-white rounded-xl shadow-lg p-3`}>
      {/* 보행자 아이콘 */}
      <div className="text-center mb-2">
        <span className="text-lg">🚶‍♂️</span>
      </div>

      {/* 신호등 */}
      <div className="flex flex-col items-center gap-1.5 mb-2">
        <div
          className={`${lightSize[size]} rounded-full transition-all ${
            pedestrianStatus === 'red' ? 'bg-red-500 shadow-lg shadow-red-500/50' : 'bg-gray-300'
          }`}
        />
        <div
          className={`${lightSize[size]} rounded-full transition-all ${
            pedestrianStatus === 'yellow' ? 'bg-yellow-400 shadow-lg shadow-yellow-400/50' : 'bg-gray-300'
          }`}
        />
        <div
          className={`${lightSize[size]} rounded-full transition-all ${
            pedestrianStatus === 'green' ? 'bg-green-500 shadow-lg shadow-green-500/50' : 'bg-gray-300'
          }`}
        />
      </div>

      {/* 남은 시간 */}
      <div className={`text-center font-bold ${fontSize[size]}`}>
        {pedestrianTime > 0 ? (
          <>
            <div className="text-xl">{pedestrianTime}</div>
            <div className="text-xs text-muted-foreground">초</div>
          </>
        ) : (
          <div className="text-red-500 text-xs">대기</div>
        )}
      </div>

      {/* 상태 텍스트 */}
      <div className={`text-center mt-1 ${fontSize[size]}`}>
        {pedestrianTime > 20 && <span className="text-green-600 font-medium">횡단 가능</span>}
        {pedestrianTime > 0 && pedestrianTime <= 20 && <span className="text-yellow-600 font-medium">곧 바뀜</span>}
        {pedestrianTime === 0 && <span className="text-red-600 font-medium">대기 중</span>}
      </div>

      {/* 차량 신호 (참고용) */}
      {vehicleTime !== undefined && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-center">
          <div className={`${fontSize[size]} text-muted-foreground`}>
            🚗 {vehicleTime}초
          </div>
        </div>
      )}
    </div>
  );
}
