const VERCEL_SIGN_API = 'https://techno-vert.vercel.app/api/sign';

export interface SignalData {
  itstId: string;
  trsmUtcTime: number; // 💡 시간 동기화용 절대 시간 (ms 타임스탬프)
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

// 전역 단일 캐시 배열 구조로 단순화 및 최적화
let globalSignalsCache: SignalData[] = [];
let lastFetchTime = 0;
const CACHE_DURATION = 10000; // 10초 동안 캐시 유지

// 💡 1000개 전체 데이터를 통째로 가져와 메모리에 보관하는 핵심 함수
export async function fetchAllTrafficSignals(): Promise<SignalData[]> {
  try {
    if (globalSignalsCache.length > 0 && Date.now() - lastFetchTime < CACHE_DURATION) {
      return globalSignalsCache;
    }

    const response = await fetch(VERCEL_SIGN_API, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    });

    if (!response.ok) {
      console.error(`[API] 서버 에러 상태코드: ${response.status}`);
      return globalSignalsCache;
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

// MapPageLeaflet 등 인터페이스 일괄 연동용 함수 복원
export async function updateAllSignals(): Promise<void> {
  await fetchAllTrafficSignals(); // 한 번 호출로 1000개 일괄 수집
}

// 💡 빌드 에러의 원인이었던 함수를 확실하게 정의하여 export 합니다!
export function getSignalFromCache(itstId: string): SignalData | null {
  const target = globalSignalsCache.find((item) => String(item.itstId) === String(itstId));
  return target || null;
}

// 💡 Null 대처 원칙 반영 (센티초 -> 초 변환)
export function centiSecondsToSeconds(centiSeconds: number | undefined | null): number {
  if (centiSeconds === undefined || centiSeconds === null) return 0;
  return centiSeconds / 10;
}

export function getSignalEmoji(time: number): string {
  if (time > 10) return '🟢';
  if (time > 0) return '🟡';
  return '🔴';
}