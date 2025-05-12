# 파일 백업

### 파일을 어떻게 고유하게 식별할 수 있을까요?
- 파일에 동일한 데이터가 포함되어 있는지 구분할 수 있는 방법이 필요하다.
  - 임의 데이터를 고정 길이 비트 문자열로 변환하는 해시 함수 사용(정확성 + 속도 빠름)


#### Node crypto 모듈로 SHA-1 해시 생성하기
```js
import crypto from 'crypto'

// SHA1 해시 생성기 만들기
const hash = crypto.createHash('sha1');

// 바이너리가 아닌 16진수로 인코딩하기
hash.setEncoding('hex');

// 텍스트 해싱
const text = process.argv[2];
hash.write(text);

// 텍스트 끝을 알림
hash.end();

// 결과물 표시
const sha1sum = hash.read();
console.log(`SHA1 of "${text}" is ${sha1sum}`)
```

```
node hash-text.js something
```
```
SHA1 of "something" is 1af17e73721dbe0c40011b82ed4bb1a7dbe3ce29
```


#### 파일 해싱하기
```js
import fs from 'fs';
import crypto from 'crypto'

const filename = process.argv[2]
const data = fs.readFileSync(filename, 'utf-8');
const hash = crypto.createHash('sha1').setEncoding('hex');

hash.write(data)
hash.end()

const sha1sum = hash.read()
console.log(`SHA1 of "${filename}" is "${sha1sum}"`);
```

```
node hash-file.js hash-file.js
```
```
SHA1 of "hash-file.js" is c54c8ee3e576770d29ae2d0d73568e5a5c49eac0
```


#### 파일을 스트림으로 효율적으로 처리하기
```js
import fs from "fs";
import crypto from "crypto";

const filename = process.argv[2];
const hash = crypto.createHash("sha1").setEncoding("hex");

// 1) createReadStream: 파일을 작은 청크 단위로 읽어 메모리 사용 최소화
// 2) pipe(hash): 각 청크를 해시 객체로 바로 전달하므로 전체 파일을 메모리에 올릴 필요 없음
fs.createReadStream(filename).pipe(hash);

hash.on("finish", () => {
  const final = hash.read();
  console.log("final", final);
});

// fs.createReadStream는 비동기로 동작함. 파일을 읽는 동안 다른 작업할 수 있음 (fs.readFileSync는 동기로 동작해서 블로킹 있음)
console.log("program ends");
```

```
node hash-stream.js hash-stream.js
```
```
program ends
final dc9e6c231e243860dace2dbf52845b121062b60e
```


### 파일을 어떻게 백업할 수 있을까요?
- 버전 관리 시스템이 스냅샷 저장할 때 마다 사본을 만들면 낭비 
- 대신 스냅샷이 만들어질 때 파일 이름과 콘텐츠 해시 키를 기록하는 데이터 구조를 저장

```js
import fs from 'fs-extra-promise';
import glob from 'glob-promise';
import crypto from 'crypto';

const hashExisting = (rootDir) => {
  const pattern = `${rootDir}/**/*`;
  return new Promise((resolve, reject) => {
    glob(pattern, {})
            .then(matches => Promise.all(maches.map(path => statPath(path)))) // 실제 파일인지 확인
            .then(pairs => Promise.all(pairs.map(([path, stat]) => readPath(path)))) // 파일 읽어오기
            .then(pairs => Promise.all(([path, content]) => hashPath(path, content))) // 파일 해시 계산
            .then(pairs => resolve(pairs))
            .catch(err => reject(err))
  })
}
```

```js
const statPath = (path) => {
  return new Promise((resolve, reject) => {
    fs.statAsync(path)
            .then(stat => resolve([path, stat]))
            .catch(err => reject(err))
  })
}

const readPath = (path) => {
  return new Promise((resolve, reject) => {
    fs.readFileAsync(path, 'utf-8')
            .then(content => resolve([path, content]))
            .catch(err => reject(err))
  })
}

const hashPath = (path, content) => {
  const hasher = crypto.createHash('sha1').setEncoding('hex'); // 스트림 기반 해시 객체 입력
  hasher.write(content);
  hasher.end();
  return [path, hasher.read()];
}
```

```js
import hashExisting from './hash-existing-promise.js'

const root = process.argv[2]
hashExisting(root).then(pairs => pairs.forEach(
  ([path, hash]) => console.log(path, hash)
))
```

```
node run-hash-existing-promise.js . | fgrep -v test/ | fgrep -v '~'
```

#### async, await 사용해서 가독성 개선

```js
const statPath = async (path) => {
  const stat = await fs.statAsync(path);
  return [path, stat];
}

const readPath = async (path) => {
  const content = await fs.readFileAsync(path, 'utf-8');
  return [path, content];
}

const hashPath = (path, content) => {
  const hasher = crypto.createHash('sha1').setEncoding('hex');
  hasher.write(content);
  hasher.end();
  return [path, hasher.read()];
}

const hashExisting = async (rootDir) => {
  const pattern = `${rootDir}/**/*`
  const options = {};
  const maches = await glob(pattern, options);
  const stats = await Promise.all(matches.map(path => statPath(path)));
  const files = stats.filter(([path, stat]) => stat.isFile());
  const contents = await Promise.all(files.map(([path, stat]) => readPath(path)));
  const hashes = contents.map(([path, content]) => hashPath(path, content));
  return hashes;
}
```

### 이미 백업된 파일을 추적하려면 어떻게 해야 하나요?
```js
import glob from 'glob-promise';
import path from 'path';

/* 새로운 pashHashPairs 중에 기존에 저장한 스냅샷과 동일한 항목은 제거한다. */
const findNew = async (rootDir, pathHashPairs) => {
  const hashToPath = pathHashPairs.reduce((obj, [path, hash]) => {
    obj[hash] = path;
    return obj;
  }, {})
  
  const pattern = `${rootDir}/*.bck`;
  const options = {};
  const existingFiles = await glob(pattern, options);
  
  existingFiles.forEach(filename => {
    const stripped = path.basename(filename).replace(/\.bck$/, '');
    delete hashToPath[stripped] // 중복 제거
  })
  
  return hashToPath
}

export default findNew
```

#### findNew 테스트 코드

```js
import assert from 'assert';
import findNew from '../check-existing-files.js';

describe('pre-existing hashes and actual filesystem', () => {
  it('finds no pre-existing files when none given or exist', async () => {
    const expected = {};
    const actual = await findNew('file-backup/test/bck-0-csv-0', []);
    assert.deepStrictEqual(expected, actual, 'Expected no files');
  })

  it('finds some files when one is given and none exist', async () => {
    const check = [['somefile.txt', '9876fedc']]
    const expected = { '9876fedc': 'somefile.txt' }
    const actual = await findNew('file-backup/test/bck-0-csv-0', check)
    assert.deepStrictEqual(expected, actual, 'Expected one file')
  })


  it('finds nothing needs backup when there is a match', async () => {
    const check = [['alpha.js', 'abcd1234']]
    const expected = {}
    const actual = await findNew('file-backup/test/bck-1-csv-1', check)
    assert.deepStrictEqual(expected, actual, 'Expected no files')
  })

  it('finds something needs backup when there is a mismatch', async () => {
    const check = [['alpha.js', 'a1b2c3d4']]
    const expected = { a1b2c3d4: 'alpha.js' }
    const actual = await findNew('file-backup/test/bck-1-csv-1', check)
    assert.deepStrictEqual(expected, actual, 'Expected one file')
  })

  it('finds mixed matches', async () => {
    const check = [
      ['matches.js', '3456cdef'],
      ['matches.txt', 'abcd1234'],
      ['mismatch.txt', '12345678']
    ]
    const expected = { 12345678: 'mismatch.txt' }
    const actual = await findNew('file-backup/test/bck-4-csv-2', check)
    assert.deepStrictEqual(expected, actual,
            'Expected one file')
  })
})
```

### 파일을 수정하는 코드를 어떻게 테스트할까요?

```js
import assert from 'assert';
// mock-fs 라이브러리는 모든 것을 메모리에 저장. 
// 테스트할 때 파일 시스템을 실수로 훼손하는 것을 방지하고 빠르게 접근할 수 있어서 테스트 속도도 빨라짐.
import mock from 'mock-fs';
import findNew from '../check-existing-files.js';

describe('check for pre-existing hashes using mock filesystem', () => {
  beforeEach(() => {
    // 파일과 파일에 포함되어야 하는 내용 작성
    mock({
      'bck-0-csv-0': {},
      'bck-1-csv-1': {
        '0001.csv': 'alpha.js,abcd1234',
        'abcd1234.bck': 'alpha.js content'
      },
      'bck-4-csv-2': {
        '0001.csv': ['alpha.js,abcd1234',
          'beta.txt,bcde2345'].join('\n'),
        '3024.csv': ['alpha.js,abcd1234',
          'gamma.png,3456cdef',
          'subdir/renamed.txt,bcde2345'].join('\n'),
        '3456cdef.bck': 'gamma.png content',
        'abcd1234.bck': 'alpha content',
        'bcde2345.bck': 'beta.txt became subdir/renamed.txt'
      }
    })
  })

  afterEach(() => {
    mock.restore()
  })
})
```

#### 파일을 백업하는 프로그램
```js
import fs from 'fs-extra-promise';
import hashExisting from './hash-existing-async.js';
import findNew from './check-existing-files.js';

const backup = async (src, dst, timestamp = null) => {
  if(timestamp === null) {
    timestamp = Math.round((new Date()).getTime() / 1000);
  }
  timestamp = String(timestamp).padStart(10, '0');
  
  const existing = await hashExisting(src);
  const needToCopy = await findNew(dst, existing);
  await copyFiles(dst, needToCopy);
  await saveManifest(dst, timestamp, existing);
}

const copyFiles = async (dst, needToCopy) => {
  const promises = Object.keys(needToCopy).map(hash => {
    const srcPath = needToCopy[hash];
    const dstPath = `${dst}/${hash}.bck`;
    fs.copyFileAsync(srcPath, dstPath);
  })
  
  return Promise.all(promises);
}

const saveManifest = async (dst, timestamp, pathHash) => {
  pathHash = pashHash.sort();
  const content = pathHash
            .map(([path, hash]) => `${path},${hash}`)
            .join('\n');
  const manifest = `${dst}/${timestamp}.csv`
  fs.writeFileAsync(manifest, content, 'utf-8')
}

export default backup
```

#### 테스트
```js
import backup from '../backup.js';

const hashString = (data) => {
  const hasher = crypto.createHash('sha1').setEncoding('hex');
  hasher.write(data);
  hasher.end();
  return hasher.read()
}

const Contents = {
  aaa: 'AAA',
  bbb: 'BBB',
  ccc: 'CCC'
}

const Hashes = Object.keys(Contents).reduce((obj, key) => {
  obj[key] = hashString(Contents[key]);
  return obj;
}, {});

const Fixture = {
  source: {
    'alpha.txt': Contents.aaa,
    'beta.txt': Contents.bbb,
    gamma: {
      'delta.txt': Contents.ccc
    }
  },
  backup: {}
}

const InitialBackups = Object.keys(Hashes).reduce((set, filename) => {
  set.add(`backup/${Hashes[filename]}.bck`);
  return set;
}, new Set());
```

```js
describe('check entire backup process', () => {
  beforeEach(() => {
    mock(Fixture);
  });

  afterEach(() => {
    mock.restore();
  });

  it('creates an initial CSV manifest', async () => {
    await backup('source', 'backup', 0);
    
    // bck 파일 3개 + csv 파일 1개
    assert.strictEqual((await glob('backup/*')).length, 4, 'Expected 4 files');
    
    const actualBackups = new Set(await glob('backup/*.bck'));
    assert.deepStrictEqual(actualBackups, InitialBackups, 'Expected 3 backup files');
    
    const actualManifests = await glob('backup/*.csv');
    assert.deepStrictEqual(actualManifests, ['backup/0000000000'], 'Expected one manifest');
  });

  it('does not duplicate files unnecessarily', async () => {
    await backup('source', 'backup', 0);
    assert.strictEqual((await glob('backup/*')).length, 4, 'Expected 4 files after first backup');

    await backup('source', 'backup', 1);
    // 중복파일은 추가되지 않고 csv 파일만 하나 더 추가됨 
    assert.strictEqual((await glob('backup/*')).length, 5, 'Expected 5 files after second backup');
    const actualBackups = new Set(await glob('backup/*.bck'));
    assert.deepStrictEqual(actualBackups, InitialBackups, 'Expected 3 backup files after second backup');
    
    const actualManifests = (await glob('backup/*.csv')).sort()
    assert.deepStrictEqual(actualManifests, ['backup/0000000000.csv', 'backup/0000000001.csv'], 'Expected two manifests')
  });

  it('adds a file as needed', async () => {
    await backup('source', 'backup', 0)
    assert.strictEqual((await glob('backup/*')).length, 4, 'Expected 4 files after first backup');

    await fs.writeFileAsync('source/newfile.txt', 'NNN');
    const hashOfNewFile = hashString('NNN');

    await backup('source', 'backup', 1);
    assert.strictEqual((await glob('backup/*')).length, 6, 'Expected 6 files after second backup');
    const expected = new Set(InitialBackups)
            .add(`backup/${hashOfNewFile}.bck`);
    const actualBackups = new Set(await glob('backup/*.bck'));
    assert.deepStrictEqual(actualBackups, expected, 'Expected 4 backup files after second backup');

    const actualManifests = (await glob('backup/*.csv')).sort()
    assert.deepStrictEqual(actualManifests, ['backup/0000000000.csv', 'backup/0000000001.csv'], 'Expected two manifests');
  })
});
```