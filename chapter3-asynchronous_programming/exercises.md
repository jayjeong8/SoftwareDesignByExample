## Immediate versus next tick
> What is the difference between setImmediate and process.nextTick? When would you use each one?

- `setImmediate`: 다음 이벤트 루프에서 처리한다.
- `nextTick`: 현재 실행 중인 동기 코드가 완료되자마자 실행. 다음 이벤트 루프 전에 처리한다.
- 참고: https://nodejs.org/ko/learn/asynchronous-work/understanding-processnexttick


## Tracing promise execution
> What does this code print and why?
> ```js
> Promise.resolve('hello')
> ```
=> 아무 출력도 없음. resolved 값을 then에서 처리해줘야함

> What does this code print and why?
> ```js
> Promise.resolve('hello').then(result => console.log(result))
> ```
=> `hello` 출력. resolved 값을 then에서 result로 받아 console에 출력하고 있음.

> What does this code print and why?
> ```js
> const p = new Promise((resolve, reject) => resolve('hello'))
> .then(result => console.log(result))
> ```
=> `hello` 출력. 새로운 Promise 인스턴스를 만들어서 즉시 실행하고 있음


## Multiple catches
> Suppose we create a promise that deliberately fails and then add two error handlers:
> ```js
> const oops = new Promise((resolve, reject) => reject(new Error('failure')))
> oops.catch(err => console.log(err.message))
> oops.catch(err => console.log(err.message))
> ```

> When the code is run it produces:
> ```
> failure
> failure
> ```

> Trace the order of operations: what is created and when is it executed?

-  Promise 콜백 정의 => Promise 인스턴스 생성 및 콜백 즉시 실행 => oops에 reject 상태 Promise를 할당   
=> 첫번째 oops에 콜백 첨부 => 두번째 oops에 catch 콜백 첨부   
=> 첫번째 oops에서 reject된 에러 받아서 console 출력 => 두번째 oops에서 reject된 에러 받아서 console 출력  

> What happens if we run these same lines interactively? Why do we see something different than what we see when we run this file from the command line?
- 명령줄 실행: 전체 파일을 한 번에 실행
- 대화형 실행: 한 줄 한 줄 실행, 결과를 각각 출력
- 대화형 실행에서는 입력마다 결과를 보여주려고 하기 때문에 반환된 Promise 객체를 출력할 수 있음


## Then after catch
> Suppose we create a promise that deliberately fails and attach both then and catch to it:
> ```js
> new Promise((resolve, reject) => reject(new Error('failure')))
> .catch(err => console.log(err))
> .then(err => console.log(err))
> ```

> When the code is run it produces: 
> ```
> Error: failure
>    at /u/stjs/promises/catch-then/example.js:1:41
>    at new Promise (<anonymous>)
>    at Object.<anonymous> (/u/stjs/promises/catch-then/example.js:1:1)
>    at Module._compile (internal/modules/cjs/loader.js:1151:30)
>    at Object.Module._extensions..js \
> (internal/modules/cjs/loader.js:1171:10)
>    at Module.load (internal/modules/cjs/loader.js:1000:32)
>    at Function.Module._load (internal/modules/cjs/loader.js:899:14)
>    at Function.executeUserEntryPoint [as runMain] \
> (internal/modules/run_main.js:71:12)
>    at internal/main/run_main_module.js:17:47
> undefined
> ```

> Trace the order of execution.
> Why is undefined printed at the end?

- 에러를 생성해 reject를 호출하므로 프로미스 즉시 실패 => catch가 에러를 받아 console에 에러 출력
=> catch에서 return하는게 없기 때문에 then에서 undefined 출력 


## Head and tail
> The Unix head command shows the first few lines of one or more files, 
> while the tail command shows the last few. 
> Write programs head.js and tail.js that do the same things using promises and async/await, 
> 
> so that:
>
> ```
> node head.js 5 first.txt second.txt third.txt
> ```
>
> prints the first five lines of each of the three files and:
>
> ```
> node tail.js 5 first.txt second.txt third.txt
> ```
> prints the last five lines of each file.

```js
// head.js
import { processFiles, parseArgs } from './fileUtils.js';

async function main() {
  const { valid, lineCount, files } = parseArgs(process.argv);

  if (!valid) {
    console.error('Usage: node head.js <lineCount> <file1> [file2 ...]');
    process.exit(1);
  }

  await processFiles(lineCount, files, extractHead);
}

function extractHead(lines, count) {
  return lines.slice(0, count);
}

main();
```

```js
// tail.js
import { processFiles, parseArgs } from './fileUtils.js';

async function main() {
  const { valid, lineCount, files } = parseArgs(process.argv);

  if (!valid) {
    console.error('Usage: node tail.js <lineCount> <file1> [file2 ...]');
    process.exit(1);
  }

  await processFiles(lineCount, files, extractTail);
}

function extractTail(lines, count) {
  return lines.slice(-count);
}

main();
```

```js
// fileUtils.js
import { readFile } from 'fs/promises';

export function parseArgs(argv) {
  const [countStr, ...files] = argv.slice(2);
  const lineCount = parseInt(countStr, 10);

  if (isNaN(lineCount) || files.length === 0) {
    return { valid: false };
  }

  return { valid: true, lineCount, files };
}

export async function processFiles(lineCount, files, extractLinesFn) {
  for (const file of files) {
    const lines = await readFileLines(file);
    if (lines === null) continue;

    printFileHeader(file);
    const selected = extractLinesFn(lines, lineCount);
    console.log(selected.join('\n'));
  }
}

async function readFileLines(fileName) {
  try {
    const data = await readFile(fileName, { encoding: 'utf8' });
    return data.split('\n');
  } catch (err) {
    console.error(`Error reading ${fileName}:`, err.message);
    return null;
  }
}

function printFileHeader(fileName) {
  console.log(`==> ${fileName} <==`);
}

```

## Histogram of line counts
> Extend count-lines-with-stat-async.js to create a program lh.js that prints two columns of output:
> the number of lines in one or more files and the number of files that are that long.
> 
> For example, if we run:
>
> ```shell
> node lh.js promises/*.*
> ```


```js
import { glob } from 'glob'
import { readFile } from 'fs/promises'

const getAllFiles = async (srcDir) => {
  return await glob(`${srcDir}/**/*.*`, { nodir: true })
}

const countLines = async (filePath) => {
  try {
    const data = await readFile(filePath, { encoding: 'utf8' })
    const normalized = data.replace(/\r\n/g, '\n').replace(/\r/g, '\n') // CRLF/LF 통일
    const trimmed = normalized.replace(/\n+$/, '') // 마지막 연속 줄바꿈 제거
    const lineCount = trimmed ? trimmed.split('\n').length : 0
    return lineCount
  } catch (err) {
    console.error(`Failed to read ${filePath}:`, err.message)
    return null
  }
}

const countFilesByLineLength = async (srcDir) => {
  const files = await getAllFiles(srcDir)
  const lineCounts = await Promise.all(files.map(countLines))

  const resultMap = new Map()
  lineCounts.forEach(lineCount => {
    if (lineCount === null) return
    resultMap.set(lineCount, (resultMap.get(lineCount) || 0) + 1)
  })

  // 정렬 및 열 너비 계산
  const entries = [...resultMap.entries()].sort((a, b) => a[0] - b[0])
  const maxLineLengthWidth = Math.max(...entries.map(([line]) => String(line).length), 6)
  const maxFileCountWidth = Math.max(...entries.map(([_, count]) => String(count).length), 15)

  // 헤더
  console.log(
    'Length'.padStart(maxLineLengthWidth) + ' ' +
    'Number of Files'.padStart(maxFileCountWidth)
  )

  // 내용
  entries.forEach(([lines, count]) => {
    console.log(
      String(lines).padStart(maxLineLengthWidth) + ' ' +
      String(count).padStart(maxFileCountWidth)
    )
  })
}

const srcDir = process.argv[2] || '.'
countFilesByLineLength(srcDir).catch(err => console.error(err))


```


## Select matching lines
> Using async and await, write a program called match.js that finds and prints lines containing a given string. 
> 
> For example:
> ```
> node match.js Toronto first.txt second.txt third.txt
> ```
> would print all of the lines from the three files that contain the word “Toronto”.

```js
// match.js

import { readFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';

async function findMatches(searchTerm, fileNames) {
  for (const fileName of fileNames) {
    try {
      const content = await readFile(fileName, 'utf-8');
      
      const lines = content.split('\n');
      const matchedLines = lines
        .filter(line => line.includes(searchTerm))
        .map(line => `${fileName}: ${line}`);

      console.log(matchedLines.join('\n'));
    } catch (err) {
      console.error(`Error reading file ${fileName}:`, err.message);
    }
  }
}

const [,, searchTerm, ...fileNames] = argv;

if (!searchTerm || fileNames.length === 0) {
  console.error('Usage: node match.js <searchTerm> <file1> <file2> ...');
  exit(1);
}


findMatches(searchTerm, fileNames);
```


## Find lines in all files
> Using async and await, 
> write a program called in-all.js that finds and prints lines found in all of its input files. 
> 
> For example:
> ```
> node in-all.js first.txt second.txt third.txt
> ```
> will print those lines that occur in all three files.

```js
// in-all.js

import { readFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';

async function readLines(fileName) {
  try {
    const content = await readFile(fileName, { encoding: 'utf8' });
    return new Set(content.split('\n').filter(Boolean)); // 빈 줄 제거
  } catch (err) {
    console.error(`Error reading file ${fileName}:`, err.message);
    return null;
  }
}

async function findCommonLines(fileNames) {
  const sets = [];

  for (const fileName of fileNames) {
    const lines = await readLines(fileName);
    if (!lines) exit(1);
    sets.push(lines);
  }

  // 모든 파일에 존재하는 라인 찾기 (첫 번째 파일 기준으로 비교)
  const [first, ...rest] = sets;
  const commonLines = [...first].filter(line =>
    rest.every(set => set.has(line))
  );
 
  console.log(commonLines.join('\n'));
}

const [, , ...fileNames] = argv;

if (fileNames.length < 2) {
  console.error('Usage: node in-all.js <file1> <file2> [...moreFiles]');
  exit(1);
}

findCommonLines(fileNames);

```

## Find differences between two files
> Using async and await, 
> write a program called file-diff.js that compares the lines in two files and shows which ones are only in the first file, 
> which are only in the second, and which are in both. 
> 
> For example, if left.txt contains:
> ```
> some
> people
> ```
> and right.txt contains:
> ```
> write
> some
> code
> ```
> then:
> ```
> node file-diff.js left.txt right.txt
> ```
> would print:
> ```
> 2 code
> 1 people
> * some
> 2 write
> ```
> where 1, 2, and * show whether lines are in only the first or second file or are in both. 
> Note that the order of the lines in the file doesn’t matter.
>
> Hint: you may want to use the Set class to store lines.

```js
// file-diff.js

import { readFile } from 'node:fs/promises';
import { argv, exit } from 'node:process';

async function readLines(filePath) {
  try {
    const content = await readFile(filePath, { encoding: 'utf8' });
    return new Set(content.split('\n').map(line => line.trim()).filter(Boolean));
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err.message);
    exit(1);
  }
}

async function compareFiles(leftPath, rightPath) {
  const leftLines = await readLines(leftPath);
  const rightLines = await readLines(rightPath);

  const allLines = new Set([...leftLines, ...rightLines]);
  const sortedLines = [...allLines].sort(); // 알파벳 순 정렬

  for (const line of sortedLines) {
    const inLeft = leftLines.has(line);
    const inRight = rightLines.has(line);

    if (inLeft && inRight) {
      console.log(`* ${line}`);
    } else if (inLeft) {
      console.log(`1 ${line}`);
    } else if (inRight) {
      console.log(`2 ${line}`);
    }
  }
}

const [, , leftFile, rightFile] = argv;

if (!leftFile || !rightFile) {
  console.error('Usage: node file-diff.js <left.txt> <right.txt>');
  exit(1);
}

compareFiles(leftFile, rightFile);

```

## Trace file loading
> Suppose we are loading a YAML configuration file using the promisified version of the fs library. 
> In what order do the print statements in this test program appear and why?
> ```js
> 
> import fs from 'fs-extra-promise'
> import yaml from 'js-yaml'
> 
> const test = async () => {
> const raw = await fs.readFileAsync('config.yml', 'utf-8')
> console.log('inside test, raw text', raw)
> const cooked = yaml.safeLoad(raw)
> console.log('inside test, cooked configuration', cooked)
> return cooked
> }
> 
> const result = test()
> console.log('outside test, result is', result.constructor.name)
> result.then(something => console.log('outside test we have', something))
> ```

- 'outside test, result is Promise' => 'inside test, raw text <파일 내용>'
=> 'inside test, cooked configuration <safeLoad 파싱 결과>' => 'outside test we have <safeLoad 파싱 결과>'
- test()는 async 함수이므로 즉시 Promise를 반환 => 내부의 await fs.readFileAsync(...)는 비동기로 실행되며 파일 읽기가 끝날 때까지 기다림.
=> 파일 읽기와 무관하게 바깥에 있는 console.log에서 result에서 반환한 Promise 생성자 이름을 바로 출력
=> 비동기 파일 읽기가 완료되면, await 뒤의 코드 순차적으로 진행하며 console 출력
=> test 함수가 완료되면 then 콜백이 실행되고 test 함수에서 return한 값을 받아서 console 출력


## Any and all
> Add a method Pledge.any that takes an array of pledges and as soon as one of the pledges in the array resolves, 
> returns a single promise that resolves with the value from that pledge.
> Add another method Pledge.all that takes an array of pledges and returns a single promise 
> that resolves to an array containing the final values of all of those pledges.

```js
class Pledge {
  //... chapter3.md 파일에 기록한 내용 생략

  static any(pledges) {
    return new Pledge((resolve, reject) => {
      let rejections = [];
      let pending = pledges.length;

      if (pending === 0) {
        reject(new AggregateError([], 'All pledges were rejected'));
        return;
      }

      pledges.forEach((pledge, index) => {
        // 하나라도 then으로 넘어오면 resolve 호출해서 즉시 종료
        pledge.then(resolve).catch((error) => { 
          rejections[index] = error;
          if (--pending === 0) {
            // 전부 실패하면 reject
            reject(new AggregateError(rejections, 'All pledges were rejected'));
          }
        });
      });
    });
  }

  static all(pledges) {
    return new Pledge((resolve, reject) => {
      let results = [];
      let completed = 0;

      if (pledges.length === 0) {
        resolve([]);
        return;
      }

      pledges.forEach((pledge, index) => {
        pledge.then((value) => {
          results[index] = value;
          completed++;
          if (completed === pledges.length) {
            resolve(results);
          }
        }).catch((error) => {
          reject(error);
        });
      });
    });
  }
}

```