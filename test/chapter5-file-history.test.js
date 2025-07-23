// test/file-history.test.js
import { strict as assert } from 'assert';
import mock from 'mock-fs';
import path from 'path';
import { getManifests, extractHash } from "../chapter5-file_backup/file-history.js";

describe('file-history.js 기능별 테스트', () => {
  afterEach(() => mock.restore());

  describe('getManifests()', () => {
    it('빈 디렉토리일 때 빈 배열을 반환해야 한다', async () => {
      mock({});  // 빈 파일 시스템
      const manifests = await getManifests(process.cwd());
      assert.deepEqual(manifests, []);
    });

    it('잘못된 이름의 파일은 무시하고 올바른 timestamp.csv만 반환해야 한다', async () => {
      mock({
        '0000000001.csv': '',
        'foo.csv': '',
        '1234567890.txt': '',
        '0000000002.csv': '',
      });
      const tsList = (await getManifests(process.cwd())).map(m => m.ts);
      assert.deepEqual(tsList, [1, 2]);
    });

    it('파일명이 10자리 숫자가 아닐 경우 필터링해야 한다', async () => {
      mock({
        '0123456789.csv': '',
        '00123456789.csv': '', // 11자리
        '123456789.csv': '',   // 9자리
      });
      const tsList = (await getManifests(process.cwd())).map(m => m.ts);
      assert.deepEqual(tsList, [123456789]);
    });
  });

  describe('extractHash()', () => {
    const manifestDir = 'manifests';
    const manifestPath = path.join(manifestDir, '1620000000.csv');

    beforeEach(() => {
      // 기본 맵핑과 일부 악성/빈 라인 포함
      const lines = [
        '',                                 // 빈 줄
        'src/a.js,hashA',                   // 첫 번째 유효 항목
        'malformed-line-without-comma',     // 쉼표 없는 줄
        'src/a.js,hashA-duplicate',         // 중복
        'src/b.js,hashB',                   // 다른 파일
        ',hash-without-path',               // 경로 없는 항목
        'src/c.js,',                        // 해시 없는 항목
        '  src/d.js  ,  hashD  ',           // 공백 포함
      ];
      mock({
        [manifestPath]: lines.join('\n'),
      });
    });

    it('첫 번째로 일치한 항목만 반환해야 한다', async () => { // 최종 상태만 반환
      const h = await extractHash(manifestPath, 'src/a.js');
      assert.equal(h, 'hashA');
    });

    it('공백이 둘러싼 항목도 트리밍하여 인식해야 한다', async () => {
      const h = await extractHash(manifestPath, 'src/d.js');
      assert.equal(h, 'hashD');
    });

    it('쉼표가 하나도 없는 라인은 건너뛰어야 한다', async () => {
      const h = await extractHash(manifestPath, 'malformed-line-without-comma');
      assert.equal(h, null);
    });

    it('경로 또는 해시가 없으면 무시하고 다음 줄로 넘어가야 한다', async () => {
      const h1 = await extractHash(manifestPath, '');
      const h2 = await extractHash(manifestPath, 'src/c.js');
      assert.equal(h1, null);
      assert.equal(h2, null);
    });

    it('존재하지 않는 파일 요청 시 null을 반환해야 한다', async () => {
      const h = await extractHash(manifestPath, 'nonexistent.js');
      assert.equal(h, null);
    });
  });
});
