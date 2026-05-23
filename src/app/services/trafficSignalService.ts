const VERCEL_SIGN_API = 'https://techno-vert.vercel.app/api/sign';

export interface SignalData {
  itstId: string;
  ntPdsgRmdrCs?: number; stPdsgRmdrCs?: number; etPdsgRmdrCs?: number; wtPdsgRmdrCs?: number;
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

const signalCache: Map<string, { data: SignalData; timestamp: number }> = new Map();

// 💡 요청 및 응답 상태를 확인할 수 있도록 콘솔 로그 추가
export async function getTrafficSignal(itstId: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const response = await fetch(`${VERCEL_SIGN_API}?itstId=${itstId}`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) return null;

    const rawData = await response.json();
    
    // 💡 핵심 패치: 데이터가 배열로 들어오든 객체로 들어오든 유연하게 파싱
    const dataArray = Array.isArray(rawData) ? rawData : (rawData.data || [rawData]);
    
    // itstId가 일치하는 단일 교차로 객체만 완벽히 추출
    // 💡 교체할 핵심 로직
    const targetData = dataArray.find((item: any) => String(item.itstId) === String(itstId));

    return targetData || null;
  } catch (error) {
    return null;
  }
}
// 기존: export async function getTrafficSignal(itstId: string)
// 변경: 전체 데이터를 받아온 뒤, 그 안에서 해당 itstId를 찾는 함수로 변경
// 💡 Vercel API에서 전체 교차로 배열을 통째로 가져오는 함수 (순수 배열 반환)
export async function fetchAllTrafficSignals(): Promise<any[]> {
  try {
    // 💡 URL이 확실한지 다시 확인
    const url = VERCEL_SIGN_API;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        // 💡 CORS 문제를 방지하기 위한 헤더 추가 (가능한 경우)
      },
    });

    if (!response.ok) {
      console.error(`[API] 서버가 에러를 반환함: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : []; 

  } catch (e) {
    // 💡 여기가 핵심! 브라우저가 왜 fetch를 실패했는지 상세 내용을 콘솔에 출력함
    console.error("[API] Failed to fetch - 상세 원인:", e);
    return [];
  }
}
export async function updateAllSignals(itstIds: string[] = Object.values(SEOUL_INTERSECTIONS)): Promise<void> {
  const safeIds = itstIds.slice(0, 50);
  await Promise.allSettled(safeIds.map(id => getTrafficSignal(id)));
}

export function getSignalFromCache(itstId: string): SignalData | null {
  const cached = signalCache.get(itstId);
  return (cached && Date.now() - cached.timestamp < 10000) ? cached.data : null;
}

export function centiSecondsToSeconds(centiSeconds: number | undefined): number {
  return (centiSeconds || 0) / 10;
}

export function getPedestrianSignalTime(signal: SignalData, direction: 'nt' | 'st' | 'et' | 'wt'): number {
  const key = `${direction}PdsgRmdrCs` as keyof SignalData;
  return centiSecondsToSeconds(signal[key] as number);
}

export function getSignalEmoji(time: number): string {
  if (time > 10) return '🟢';
  if (time > 0) return '🟡';
  return '🔴';
}