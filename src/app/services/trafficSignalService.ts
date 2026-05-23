const VERCEL_SIGN_API = 'https://techno-vert.vercel.app/api/sign';

export interface SignalData {
  itstId: string;
  trsmUtcTime: number; // 서버 전송 시간 (시간 동기화용)
  ntPdsgRmdrCs?: number | null; 
  stPdsgRmdrCs?: number | null; 
  etPdsgRmdrCs?: number | null; 
  wtPdsgRmdrCs?: number | null;
  [key: string]: any;
}

export const SEOUL_INTERSECTIONS = {
  NANKOK: '10',
  WOORI_AMSA: '1007',
  SUSEO: '101',
  SEONSASAGEORI: '1014',
  GANGDONG_ART: '1016',
  PUNGNAP: '1029',
};

// 교차로 데이터 전체 전역 캐시 변수 추가 (메모리 최적화)
let globalSignalsCache: any[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 10000; // 10초 동안은 보관된 데이터 재사용 (폴링 주기 고려)

// 💡 Vercel API에서 전체 교차로 1000개 배열을 가져오는 함수
export async function fetchAllTrafficSignals(): Promise<any[]> {
  try {
    // 💡 메모리 캐싱 전략: 10초 이내에 다시 호출되면 API 요청 없이 기존 캐시 반환
    if (globalSignalsCache.length > 0 && Date.now() - lastFetchTime < CACHE_DURATION) {
      return globalSignalsCache;
    }

    const response = await fetch(VERCEL_SIGN_API, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[API] 서버 에러 상태코드: ${response.status}`);
      return globalSignalsCache; // 에러 시 이전 캐시라도 반환하여 튕김 방지
    }
    
    const data = await response.json();
    if (Array.isArray(data)) {
      globalSignalsCache = data;
      lastFetchTime = Date.now();
      return globalSignalsCache;
    }
    return [];
  } catch (e) {
    console.error("[API] fetchAllTrafficSignals 실패 상세 원인:", e);
    return globalSignalsCache;
  }
}

// 💡 대량 데이터셋에서 특정 교차로를 탐색하는 함수로 전환
export async function getTrafficSignal(itstId: string): Promise<any | null> {
  try {
    const allSignals = await fetchAllTrafficSignals();
    
    // 명세서 규격에 맞게 itstId 문자열 비교로 데이터 매핑
    const targetData = allSignals.find((item: any) => String(item.itstId) === String(itstId));

    return targetData || null;
  } catch (error) {
    console.error(`[API] getTrafficSignal 탐색 오류 (itstId: ${itstId}):`, error);
    return null;
  }
}

// 💡 Null 대처 및 센티초 -> 초 변환 함수
export function centiSecondsToSeconds(centiSeconds: number | undefined | null): number {
  if (centiSeconds === undefined || centiSeconds === null) return 0; // Null 처리 원칙 반영
  return centiSeconds / 10;
}

// 💡 방향과 신호 종류에 따른 동적 변수 추출
export function getPedestrianSignalTime(signal: SignalData, direction: 'nt' | 'st' | 'et' | 'wt'): number {
  const key = `${direction}PdsgRmdrCs`;
  return centiSecondsToSeconds(signal[key]);
}

export function getSignalEmoji(time: number): string {
  if (time > 10) return '🟢';
  if (time > 0) return '🟡';
  return '🔴';
}

// 기존 인터페이스 호환용 일괄 업데이트 유지
export async function updateAllSignals(itstIds: string[] = Object.values(SEOUL_INTERSECTIONS)): Promise<void> {
  await fetchAllTrafficSignals(); // 한 번의 호출로 1000개 캐시 갱신 끝
}