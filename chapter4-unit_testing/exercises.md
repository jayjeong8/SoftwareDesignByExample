## Asynchronous globbing
> Modify pray.js to use the asynchronous version of glob rather than glob.sync.

```js
// 최신 버전 glob은 비동기로 동작
options.filenames = await glob(`${options.root}/**/test-*.js`);
```

## Timing tests
> Install the [microtime](https://www.npmjs.com/package/microtime) package and then modify the dry-run.js example so that it records and reports the execution times for tests.

```js
const assert = require('assert');
const microtime = require('microtime');

let HopePass = 0;
let HopeFail = 0;
let HopeError = 0;

const HopeTests = [
  ['test 1', () => assert.strictEqual(1 + 1, 2)],
  ['test 2', () => assert.strictEqual(2 * 2, 5)],
  ['test 3', () => { throw new Error('Unexpected error'); }],
];

const main = () => {
  HopeTests.forEach(([message, test]) => {
    const start = microtime.now();

    try {
      test();
      HopePass += 1;
      const duration = microtime.now() - start;
      console.log(`${message} passed in ${duration}μs`);
    } catch (e) {
      const duration = microtime.now() - start;

      if (e instanceof assert.AssertionError) {
        HopeFail += 1;
        console.log(`${message} failed in ${duration}μs`);
      } else {
        HopeError += 1;
        console.log(`${message} errored in ${duration}μs: ${e.message}`);
      }
    }
  });

  console.log('\nTest Summary');
  console.log('------------');
  console.log(`Passed: ${HopePass}`);
  console.log(`Failed: ${HopeFail}`);
  console.log(`Errored: ${HopeError}`);
};

main();
```


## Approximately equal
> 1. Write a function assertApproxEqual that does nothing if two values are within a certain tolerance of each other but throws an exception if they are not:
>
> ```js
> // throws exception
> assertApproxEqual(1.0, 2.0, 0.01, 'Values are too far apart')
>
> // does not throw
> assertApproxEqual(1.0, 2.0, 10.0, 'Large margin of error')
> ```

```ts
function assertApproxEqual(
  actual: number,
  expected: number,
  tolerance: number,
  errorMessage: string
): void {
  // 두 값의 차이가 tolerance 이내인지 확인
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(errorMessage);
  }
}
```

> 2. Modify the function so that a default tolerance is used if none is specified:
> ```js
> // throws exception
> assertApproxEqual(1.0, 2.0, 'Values are too far apart')
>
> // does not throw
> assertApproxEqual(1.0, 2.0, 'Large margin of error', 10.0)
> ```
```ts
function assertApproxEqual(
  actual: number,
  expected: number,
  errorMessage: string,
  tolerance: number = 0.001 
): void {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(errorMessage);
  }
}

```

> 3. Modify the function again so that it checks the [relative error](https://third-bit.com/sdxjs/glossary/#relative_error) instead of the [absolute error](https://third-bit.com/sdxjs/glossary/#absolute_error). (The relative error is the absolute value of the difference between the actual and expected value, divided by the absolute value.)

```ts
function assertApproxEqual(
  actual: number,
  expected: number,
  errorMessage: string,
  tolerance: number = 0.001 
): void {
  if (expected === 0 && Math.abs(actual) > tolerance) {
    throw new Error(errorMessage);
  } else {
    const normalizedDifference = Math.abs(actual - expected) / Math.abs(expected);
    if (normalizedDifference > tolerance) {
      throw new Error(errorMessage);
    }
  }
}

```


## Rectangle overlay
> A windowing application represents rectangles using objects with four values: x and y are the coordinates of the lower-left corner, while w and h are the width and height. All values are non-negative: the lower-left corner of the screen is at (0, 0) and the screen’s size is WIDTHxHEIGHT.

> 1. Write tests to check that an object represents a valid rectangle.

```ts
function isValidRectangle(rect: { x: number; y: number; w: number; h: number }): boolean {
  return rect.x >= 0 && rect.y >= 0 && rect.w >= 0 && rect.h >= 0;
}
```

> 2. The function overlay(a, b) takes two rectangles and returns either a new rectangle representing the region where they overlap or null if they do not overlap. Write tests to check that overlay is working correctly.

```ts
interface Rectangle { x: number; y: number; w: number; h: number };

function overlay(a: Rectangle, b: Rectangle) {
  const x1 = Math.max(a.x, b.x); // 왼쪽 꼭지점 비교
  const y1 = Math.max(a.y, b.y); // 위쪽 꼭지점 비교
  const x2 = Math.min(a.x + a.w, b.x + b.w); // 오른쪽 꼭지점 비교
  const y2 = Math.min(a.y + a.h, b.y + b.h); // 아래쪽 꼭지점 비교

  if (x1 < x2 && y1 < y2) { // 겹치는 부분 반환
    return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
  }
  return null;
}

describe("overlay", () => {
  it("should return null for non-overlapping rectangles", () => {
    const a = { x: 0, y: 0, w: 2, h: 2 };
    const b = { x: 3, y: 3, w: 2, h: 2 };
    expect(overlay(a, b)).toBeNull();
  });

  it("should return correct overlap", () => {
    const a = { x: 0, y: 0, w: 4, h: 4 };
    const b = { x: 2, y: 2, w: 4, h: 4 };
    expect(overlay(a, b)).toEqual({ x: 2, y: 2, w: 2, h: 2 });
  });

  it("should return entire rectangle if fully overlapping", () => {
    const a = { x: 1, y: 1, w: 2, h: 2 };
    const b = { x: 0, y: 0, w: 5, h: 5 };
    expect(overlay(a, b)).toEqual(a);
  });

  it("should return null for touching on edge only", () => {
    const a = { x: 0, y: 0, w: 2, h: 2 };
    const b = { x: 2, y: 0, w: 2, h: 2 };
    expect(overlay(a, b)).toBeNull();
  });

  it("should return null for touching at corner only", () => {
    const a = { x: 0, y: 0, w: 2, h: 2 };
    const b = { x: 2, y: 2, w: 2, h: 2 };
    expect(overlay(a, b)).toBeNull();
  });
});

```

> 3. Do your tests assume that two rectangles that touch on an edge overlap or not? What about two rectangles that only touch at a single corner?
- 가장자리나 한 꼭지점에서만 접하는 경우 겹치는 부분이(overlay) 0이므로 null을 반환한다.


## Selecting tests
> Modify pray.js so that if the user provides -s pattern or --select pattern then the program only runs tests in files that contain the string pattern in their name.

```js
// pray.js
import minimist from "minimist";
import { glob } from "glob";
import Hope from "./hope.js";

const parse = (args) => {
  const argv = minimist(args, {
    string: ["output", "root", "select"],
    alias: { o: "output", r: "root", s: "select" },
    default: { output: "verbose", root: process.cwd(), select: "" }
  });

  return {
    output: argv.output,
    root: argv.root,
    select: argv.select,
    filenames: argv._,
  };
};

const main = async (args) => {
  const options = parse(args);

  // glob로 파일 목록 수집
  if (options.filenames.length === 0) {
    const pattern = options.select
      ? `${options.root}/**/test-*${options.select}*.js`
      : `${options.root}/**/test-*.js`;

    options.filenames = await glob(pattern);
  }

//...이하 생략
};

main(process.argv.slice(2));

```

## Tagging tests
> Modify `hope.js` so that users can optionally provide an array of strings to tag tests:
> ```js
> hope.test('Difference of 1 and 2',
>           () => assert((1 - 2) === -1),
>           ['math', 'fast'])
> ```
> Then modify `pray.js` so that if users specify either -t tagName or --tag tagName only tests with that tag are run.

```js
// hope.js
import assert from 'assert';
import caller from 'caller';

class Hope {
  constructor () {
    this.todo = [];     // [comment, callback, tags]
    this.passes = [];
    this.fails = [];
    this.errors = [];
    this.tagFilter = null; // 선택된 태그 (null이면 필터 없음)
  }

  test(comment, callback, tags = []) {
    this.todo.push([`${caller()}::${comment}`, callback, tags]);
  }

  setTagFilter(tag) {
    this.tagFilter = tag;
  }

  run() {
    this.todo.forEach(([comment, test, tags]) => {
      // 태그 필터가 지정되었고, 현재 테스트가 해당 태그를 포함하지 않으면 skip
      if (this.tagFilter && !tags.includes(this.tagFilter)) return;

      try {
        test();
        this.passes.push(comment);
      } catch (e) {
        if (e instanceof assert.AssertionError) {
          this.fails.push(comment);
        } else {
          this.errors.push(comment);
        }
      }
    });
  }

//...이하 생략
}

export default new Hope();
```

```js
// pray.js
const main = async (args) => {
  const options = parse(args);

  if (options.filenames.length === 0) {
    // ...생략
  }

  if (options.tag) {
    Hope.setTagFilter(options.tag);
  }

  for (const f of options.filenames) {
    await import(f);
  }

  Hope.run();
  const result = options.output === "terse" ? Hope.terse() : Hope.verbose();
  console.log(result);
};

main(process.argv.slice(2));
```


## Mock objects
> A mock object is a simplified replacement for part of a program whose behavior is easier to control and predict than the thing it is replacing. 
> For example, we may want to test that our program does the right thing if an error occurs while reading a file. 
> To do this, we write a function that wraps fs.readFileSync:
>
> ```js
> const mockReadFileSync = (filename, encoding = 'utf-8') => {
> return fs.readFileSync(filename, encoding)
> }
> ```
>
> and then modify it so that it throws an exception under our control. For example, if we define MOCK_READ_FILE_CONTROL like this:
>
> ```js
> const MOCK_READ_FILE_CONTROL = [false, false, true, false, true]
> ```
> then the third and fifth calls to mockReadFileSync throw an exception instead of reading data, as do any calls after the fifth. Write this function.

```js
const fs = require('fs')

const MOCK_READ_FILE_CONTROL = [false, false, true, false, true]

let callCount = 0

const mockReadFileSync = (filename, encoding = 'utf-8') => {
  if (callCount >= MOCK_READ_FILE_CONTROL.length || MOCK_READ_FILE_CONTROL[callCount]) {
    callCount++
    throw new Error('Mock readFileSync error')
  }

  callCount++
  return fs.readFileSync(filename, encoding)
}
```