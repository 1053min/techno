/**
 * 서울 교통 신호 API에서 실제 사용 가능한 교차로 ID를 찾는 스크립트
 *
 * 사용법:
 * 1. api/sign.ts를 GitHub에 푸시하고 Vercel에 배포
 * 2. tsx scripts/test-intersection-ids.ts 또는 node --loader ts-node/esm scripts/test-intersection-ids.ts
 */

const VERCEL_API = 'https://techno-vert.vercel.app/api/sign';

interface SignalData {
  itstId: string;
  wtStsgRmdrCs: number;
  [key: string]: any;
}

interface ApiResponse {
  page?: number;
  totalCount?: number;
  data?: SignalData[];
  error?: string;
}

async function fetchAllIntersections() {
  try {
    console.log('[1/2] 전체 교차로 목록 가져오는 중...\n');

    // itsId 파라미터 없이 호출하여 모든 교차로 가져오기
    const response = await fetch(`${VERCEL_API}`);

    if (!response.ok) {
      throw new Error(`API Error: ${response.status}`);
    }

    const data: ApiResponse = await response.json();

    if (data.error) {
      console.error('❌ API 에러:', data.error);
      console.log('\n💡 해결 방법:');
      console.log('1. api/sign.ts 변경사항을 GitHub에 푸시');
      console.log('2. Vercel에 자동 배포될 때까지 대기');
      console.log('3. 이 스크립트를 다시 실행');
      return;
    }

    if (!data.data || data.data.length === 0) {
      console.warn('⚠️  데이터가 비어있습니다');
      return;
    }

    console.log(`✓ 총 ${data.totalCount}개 교차로 발견\n`);
    console.log(`[2/2] 사용 가능한 교차로 ID 추출 중...\n`);

    // 고유한 교차로 ID 추출
    const uniqueIds = new Set<string>();
    data.data.forEach(item => {
      if (item.itstId) {
        uniqueIds.add(item.itstId);
      }
    });

    const validIds = Array.from(uniqueIds).sort();

    console.log('═══════════════════════════════════════');
    console.log(`✓ 사용 가능한 교차로 ID: ${validIds.length}개`);
    console.log('═══════════════════════════════════════\n');

    console.log('교차로 ID 목록:');
    validIds.slice(0, 50).forEach((id, index) => {
      console.log(`  ${(index + 1).toString().padStart(2)}) ${id}`);
    });

    if (validIds.length > 50) {
      console.log(`\n  ... 외 ${validIds.length - 50}개`);
    }

    console.log('\n═══════════════════════════════════════');
    console.log('📋 다음 단계:');
    console.log('═══════════════════════════════════════');
    console.log('1. 위 ID 목록을 src/app/services/trafficSignalService.ts의 SEOUL_INTERSECTIONS에 업데이트');
    console.log('2. src/app/services/intersectionData.ts에서 유효한 ID만 필터링');
    console.log('3. 앱 재실행하여 실제 신호 데이터 확인\n');

    // JSON 파일로 저장
    const outputData = {
      totalCount: validIds.length,
      ids: validIds,
      fetchedAt: new Date().toISOString(),
      sampleData: data.data.slice(0, 3)
    };

    console.log(`💾 유효한 ID 목록:\n${JSON.stringify(validIds.slice(0, 20), null, 2)}\n`);

  } catch (error: any) {
    console.error('❌ 에러 발생:', error.message);
    console.log('\n디버깅 정보:');
    console.log('- API URL:', VERCEL_API);
    console.log('- 에러:', error.stack);
  }
}

async function testSampleIds() {
  console.log('\n[보너스] 샘플 ID 테스트...\n');

  const sampleIds = ['1537', '101', '1029', '1', '10', '100'];

  for (const id of sampleIds) {
    try {
      const response = await fetch(`${VERCEL_API}?itsId=${id}`);
      const data: ApiResponse = await response.json();

      if (data.error) {
        console.log(`  ✗ ID ${id.padEnd(6)} - 404 (데이터 없음)`);
      } else if (data.data && data.data.length > 0) {
        console.log(`  ✓ ID ${id.padEnd(6)} - 작동함! (신호: ${data.data[0].wtStsgRmdrCs}초)`);
      } else {
        console.log(`  ? ID ${id.padEnd(6)} - 응답은 왔지만 데이터 없음`);
      }
    } catch (error: any) {
      console.log(`  ✗ ID ${id.padEnd(6)} - 에러: ${error.message}`);
    }

    // Rate limiting 방지
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('');
}

// 실행
(async () => {
  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║   서울 교통 신호 API - 유효 ID 탐색 도구    ║');
  console.log('╚══════════════════════════════════════════════╝\n');

  await fetchAllIntersections();
  await testSampleIds();
})();
