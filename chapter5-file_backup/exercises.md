## Odds of collision
> If hashes were only 2 bits long, then the chances of collision with each successive file assuming no previous collision are:
> ```
> Number of Files	Odds of Collision  
> 1	0%  
> 2	25%  
> 3	50%  
> 4	75%  
> 5	100%  
> ```
> A colleague of yours says this means that if we hash four files, 
> there’s only a 75% chance of any collision occurring. 
> What are the actual odds?

- 테이블에 적힌 값은 "각 파일 순서에서 **이전에 충돌이 없었다고 가정**할 때"의 확률. 첫 번째 충돌이 네번째 파일에서 발생할 확률이 75%.
- 동료가 구하려고 한 값은 **네개의 파일을 해싱했을 때 충돌이 발생할 확률**. 지금까지 최소 한 번이라도 충돌했을 확률.
- 가능한 값 총 네개: 00, 01, 10, 11
- 각 파일이 이전 파일과 충돌하지 않을 가능성은 첫번째 값부터 순서대로 100%(4/4), 75%(3/4), 50%(2/4), 25%(1/4)
- 한 번도 충돌하지 않을 가능성은 1 * 0.75 * 0.5 * 0.25 = 0.09375(9.375%)
- 한 번이라도 충돌할 가능성은 100% - 9.375% = 90.625%


## Streaming I/O
> Write a small program using `fs.createReadStream` and `fs.createWriteStream` that copies a file piece-by-piece instead of reading it into memory and then writing it out again.

```js
const sourceFile = path.resolve(__dirname, 'source.txt');
const targetFile = path.resolve(__dirname, 'copy.txt');

const readStream = fs.createReadStream(sourceFile);
const writeStream = fs.createWriteStream(targetFile);

// sourceFile 스트림을 writeStream으로 전달 
readStream.pipe(writeStream);
```

```js
// Node.js 24.0.2에서는 아래처럼 작성
// https://nodejs.org/api/stream.html#streampipelinestreams-options
import { pipeline } from 'node:stream/promises';
import { createReadStream, createWriteStream } from 'node:fs';

await pipeline(
  createReadStream('source.txt'),
  createWriteStream('copy.txt'),
);
console.log('Pipeline succeeded.');
```

## Sequencing backups
> Modify the backup program so that manifests are numbered sequentially as 00000001.csv, 00000002.csv, 
> and so on rather than being timestamped. 
> Why doesn’t this solve the time of check/time of use race condition mentioned earlier?

```js
const backup = async (src, dst) => {
  const existing = await hashExisting(src);
  const needToCopy = await findNew(dst, existing);
  await copyFiles(dst, needToCopy);
  const nextSeq = await findNextSequenceNumber(dst); // Time-of-Check
  await saveManifest(dst, nextSeq, existing);// Time-of-Use
}

const findNextSequenceNumber = async (dst) => {
  const files = await fs.readdir(dst);
  const nums = files
    .map(f => path.basename(f, '.csv'))
    .filter(name => /^\d+$/.test(name))
    .map(name => parseInt(name, 10));

  const max = nums.length > 0 ? Math.max(...nums) : 0;
  return String(max + 1).padStart(8, '0');
}

```

- TOCTOU (Time-of-Check to Time-of-Use) 경쟁 조건이 해결되지 않는 이유
  - manifest 번호를 찾는 시점과 사용하는 시점 사이에 경쟁 조건 존재 
  - findNextSequenceNumber()에서 00000001.csv까지 존재한다고 판단한 후, 
다른 프로세스가 그 사이에 00000002.csv를 생성하면,
현재 프로세스도 00000002.csv를 생성하게 되어 중복 파일 생성 위험 발생.
  - `saveManifest` 함수에서 다음과 같이 존재하지 않을 때만 파일을 만들도록 할 수 있음
```js
// 잘못된 방법
// 존재 여부 확인, 파일 생성 두 단계로 나뉘기 대문에 TOCTOU 경쟁 조건이 해결되지 않음
const filename = 'manifest.csv';
if (!(await exists(filename))) {
  await fs.writeFile(filename, content);
}

// 올바른 방법
// 한 번의 호출로 확인 및 생성 처리. 동시 접근 시 한 쪽만 성공.
await fs.writeFile(manifest, content, {
encoding: 'utf-8',
flag: 'wx' // 원자적: 존재할 경우 실패
});
```

## JSON manifests
> 1. Modify backup.js so that it can save JSON manifests as well as CSV manifests based on a command-line flag.
```js
const isJson = process.argv.includes('--json');

const backup = async (src, dst) => {
  // ...
  await saveManifest(dst, nextSeq, existing, isJson);
}

const saveManifest = async (dst, sequence, pathHash, asJson = false) => {
  pathHash = pathHash.sort()

  let filename, content;
  if (asJson) {
    filename = `${dst}/${sequence}.json`;
    content = JSON.stringify(Object.fromEntries(pathHash), null, 2);
  } else {
    // ...
  }
  // ...
}
```


2. Write another program called migrate.js that converts a set of manifests from CSV to JSON. (The program’s name comes from the term data migration.)
```js
import fs from 'fs/promises';
import path from 'path';

const isCsvManifest = (filename) => /^\d{8}\.csv$/.test(filename); // ex_ manifest 파일이 00000001.csv와 같은 규칙이라고 가정

const convertManifest = async (dir, filename) => {
  const csvPath = path.join(dir, filename);
  const jsonPath = path.join(dir, filename.replace('.csv', '.json'));
  
  const content = await fs.readFile(csvPath, 'utf-8');
  const lines = content.trim().split('\n');
  const entries = lines.map(line => line.split(','));
  const obj = Object.fromEntries(entries);
  const jsonContent = JSON.stringify(obj, null, 2);
  
  await fs.writeFile(jsonPath, jsonContent, {
    encoding: 'utf-8',
    flag: 'wx'
  });
  
  console.log(`Converted: ${filename} → ${path.basename(jsonPath)}`);
};

const migrate = async (dir) => {
  const files = await fs.readdir(dir);
  const csvFiles = files.filter(isCsvManifest)
  
  if (csvFiles.length === 0) {
    console.log('No CSV manifests fount');
    return;
  }

  for (const filename of csvFiles) {
    try {
      await convertManifest(dir, filename);
    } catch (err) {
      if (err.code === 'EEXIST') {
        console.warn(`Skipped (already exists): ${filename.replace('.csv', '.json')}`);
      } else {
        console.error(`Error converting ${filename}:`, err.message);
      }
    }
  }
}

// CLI entry point
const [,, dir] = process.argv;

if (!dir) {
  console.error('Usage: node migrate.js <manifest-directory>');
  process.exit(1);
}

migrate(dir);
```


> 3. Modify backup.js programs so that each manifest stores the user name of the person who created it along with file hashes, 
> and then modify migrate.js to transform old files into the new format.

```js
const backup = async (src, dst) => {
  // ...
  await saveManifest(dst, nextSeq, existing, user, isJson);
};

const saveManifest = async (dst, sequence, pathHash, user, asJson = false) => {
  pathHash = pathHash.sort()
  
  const filename = `${dst}/${sequence}.csv`;
  
  const header = `# user: ${user}`;
  const body = entries.map(([path, hash]) => `${path},${hash}`).join('\n');
  const content = `${header}\n${body}`;

  await fs.writeFile(filename, content, {
    encoding: 'utf-8',
    flag: 'wx'
  });
}

// 커맨드라인 인자: node backup.js <src> <dst> --user=<name> [--json]
const args = process.argv.slice(2);
const src = args[0];
const dst = args[1];
const isJson = args.includes('--json');
const userArg = args.find(arg => arg.startsWith('--user='));
const user = userArg ? userArg.split('=')[1] : 'unknown';

backup(src, dst);
```

```js
const migrate = async (dir) => {
  const files = await fs.readdir(dir);
  const csvFiles = files.filter(isCsvManifest)

  if (csvFiles.length === 0) {
    console.log('No CSV manifests fount');
    return;
  }
}

const parseCsvManifest = async (filepath) => {
  const content = await fs.readFile(filepath, 'utf-8');
  const lines = content.trim().split('\n');
  
  let user = 'unknown';
  let startIndex = 0;
  
  if (lines[0].startsWith('# user:')) {
    user = lines[0].slice(7).trim(); // 정확히 "# user:" 이후만 추출
    startIndex = 1; // 다음 줄부터 파일 목록 시작
  }

  const entries = lines.slice(startIndex).map(line => line.split(','));
  const files = Object.fromEntries(entries);

  return { user, files };
};


const convertManifest = async (dir, filename) => {
  const csvPath = path.join(dir, filename);
  const jsonPath = path.join(dir, filename.replace('.csv', '.json'));
  
  const manifestObj = await parseCsvManifest(csvPath);
  const jsonContent = JSON.stringify(obmanifestObj, null, 2);
  
  await fs.writeFile(jsonPath, jsonContent, {
    encoding: 'utf-8',
    flag: 'wx'
  });

  console.log(`Converted: ${filename} → ${path.basename(jsonPath)}`);
};

```

## Mock hashes
> 1. Modify the file backup program so that it uses a function called ourHash to hash files.
```js
// hash-utils.js
import crypto from 'crypto';

export const ourHash = (content) => {
  const hasher = crypto.createHash('sha1').setEncoding('hex');
  hasher.write(content);
  hasher.end();
  return hasher.read();
}
```

```js
import { ourHash } from './hash-utils.js';

const hashPath = (path, content) => {
  const hash = ourHash(content);
  return [path, hash];
}
```

> 2. Create a replacement that returns some predictable value, such as the first few characters of the data.
```js
// test/mock-hash.js

// ourHash 대체 함수
export const mockHash = (content) => {
  // 문자열의 첫 8자를 반환
  return content.slice(0, 8).padEnd(8, '0');
}
```


> 3. Rewrite the tests to use this function.
```js
import { mockHash } from './mock-hash.js';
import * as hashUtils from '../hash-utils.js';

describe('backup with mock hash', () => {
  beforeEach(() => {
    // 실제 hash 함수를 mock으로 대체
    // https://jestjs.io/docs/jest-object#jestspyonobject-methodname
    jest.spyOn(hashUtils, 'ourHash').mockImplementation(mockHash);
    mock(Fixture);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    mock.restore();
  });

  // 기존 테스트 코드...
});
```


> How did you modify the main program so that the tests could control which hashing function is used?
- 메인 프로그램 코드를 변경하지 않고 jest를 사용한다고 가정하고 작성함.
- jest 없이 메인 프로그램 코드를 변경한다면 아래와 같이 작성.

```js
// 해시 함수를 주입할 수 있는 팩토리 함수
// 기본 값은 `ourHash`
export const createHasher = (hashFn = ourHash) => {
  return (path, content) => {
    const hash = hashFn(content);
    return [path, hash];
  };
};

// 기본 구현을 export
export const hashPath = createHasher();

```
```js
import assert from 'assert';
import { mockHash } from './mock-hash.js';
import { createHasher } from '../hash-utils.js';

describe('check entire backup process', () => {
  beforeEach(() => {
    mock(Fixture);
  });

  afterEach(() => {
    mock.restore();
  });

  // ...
})

```