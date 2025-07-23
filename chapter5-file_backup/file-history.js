#!/usr/bin/env node
// 위 줄: 이 스크립트를 `node` 인터프리터로 실행하라는 shebang.
// 실행 권한(chmod +x)을 주면 `./file-history.js`로 직접 실행 가능.

import { promises as fs } from 'fs';
import path from 'path';

/**
 * [파일 이력 프로그램]
 * 이 프로그램은 파일 이름(fileToTrack)을 커맨드 라인의 인수로 받습니다.
 * 프로세스 실행 중인 작업 디렉토리의 manifest 목록을 읽어서 대상 파일(fileToTrack) 이력을 표시합니다.
 * manifest를 오름차순 정렬해서 과거 기록부터 표시합니다.
 */


// ───────────────────────────────────────────────────────────────────────────────
// 커맨드라인 인수 처리
//    - process.argv: Node.js 프로세스에 전달된 인수 배열
//    - slice(2): 앞의 `node`, 스크립트 경로를 제외하고 실제 인수만 남김
const [fileToTrack] = process.argv.slice(2);
if (!fileToTrack) {
  console.error('사용법: node file-history.js <파일 경로>');  // 인수가 없으면 사용법 안내
  process.exit(1);                                          // 비정상 종료 코드
}

// ───────────────────────────────────────────────────────────────────────────────
// 메인 실행부 (즉시 실행 함수 IIFE)
//    - manifest 목록 조회 → 각 파일에서 해시 추출 → 결과 출력
(async () => {
  const cwd = process.cwd();                                // 현재 프로세스 실행 중인 작업 디렉토리 문자열 반환 (current working directory)
  const manifests = await getManifests(cwd);                // manifest 파일 목록
  const history = [];                                 // 결과 저장소

  // 각 manifest 파일에 대해 대상 파일의 해시를 찾아 기록
  for (const { ts, file } of manifests) {
    const hash = await extractHash(file, fileToTrack);
    if (hash) history.push({ ts, hash });                   // 해시가 있으면 기록
  }

  // 히스토리가 없으면 메시지 출력 후 종료
  if (history.length === 0) {
    console.log(`히스토리 없음: ${fileToTrack}`);
    return;
  }

  // timestamp → ISO 날짜(YYYY-MM-DD)로 변환하여 순차 출력
  history.forEach(({ ts, hash }) => {
    const date = new Date(ts * 1000).toISOString().slice(0, 10);
    console.log(`[${date}] ${hash}`);
  });
})();

// ───────────────────────────────────────────────────────────────────────────────
// manifest 파일 목록 조회
//    - cwd 디렉토리에서 `<timestamp>.csv` 형식을 가진 파일만 필터링
//    - timestamp 숫자로 파싱 후 오름차순 정렬
async function getManifests(dir) {
  const entries = await fs.readdir(dir);             // 디렉토리 내 파일 목록
  return entries
    .filter(name => /^\d{10}\.csv$/.test(name))       // 10자리 timestamp.csv 패턴
    .map(name => ({
      ts: Number(name.slice(0, 10)),                        // 파일명 앞 10글자 timestamp를 숫자로 변환
      file: path.join(dir, name),                           // 절대/상대 경로 생성
    }))
    .sort((a, b) => a.ts - b.ts);                           // timestamp 기준 오름차순 정렬
}

// ───────────────────────────────────────────────────────────────────────────────
// 단일 manifest에서 대상 파일 해시 추출
//    - CSV 형식: "파일경로,해시" 한 줄씩 읽으며 비교
//    - 일치하면 해당 해시 반환, 없으면 null
async function extractHash(manifestPath, target) {
  const data = await fs.readFile(manifestPath, 'utf-8');    // CSV 전체 텍스트 읽기
  for (const line of data.split('\n')) {                   // 줄 단위 순회
    const [filePath, hash] = line.trim().split(','); // 쉼표로 분리
    if(!filePath || !hash) continue;
    if (filePath.trim() === target) return hash.trim();                    // 대상 파일이면 해시 반환
  }
  return null;                                                             // 찾지 못한 경우
}


export {getManifests, extractHash};