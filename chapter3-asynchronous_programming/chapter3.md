# 비동기 프로그래밍
콜백을 더 쉽게 작성하고 이해하기 위해 2015년 프로미스가 추가되었다.
- 예시: 프로미스와 동일한 핵심 기능을 제공하는 Pledge 클래스를 만들기

### 논블록킹 함수
- setTimeout은 0ms 지연을 설정해도 타이머 큐에 들어감
- 즉시 실행 가능한 함수를 먼저 실행하고 타이머 큐는 가장 후순위로 실행됨 
- setImmediate도 setTimeout(callback, 0)과 동일한 동작을 수행
```js
const nonBlocking = (callback) => {
  setTimeout(callback, 0);
};

[1000, 1500, 500].forEach((t) => {
  console.log(`about to do nonBlocking for ${t}`);
  nonBlocking(() => console.log(`inside timer handler for ${t}`));
});
```

```
about to do nonBlocking for 1000
about to do nonBlocking for 1500
about to do nonBlocking for 500
inside timer handler for 1000
inside timer handler for 1500
inside timer handler for 500
```

### Pledge - 프로미스 구현해보기

```js
class Pledge {
  constructor(action) {
    this.actionCallbacks = [];
    this.errorCallback = () => {};
    // params로 (resolve, reject)를 받는 callback를 action으로 넘긴다.
    // this가 해당 Pledge 인스턴스를 가리키도록 bind
    action(this.onResolve.bind(this), this.onReject.bind(this)); 
  }
  
  then(thenHandler) {
    this.actionCallbacks.push(thenHandler);
    return this; // 메서드 체이닝할 수 있도록 this를 반환. (플루언트 인터페이스)
  }
  
  catch(errorHandler) {
    this.errorCallback = errorHandler;
    return this;
  }
  
  onResolve(value) {
    let storedValue = value;
    try {
      this.actionCallbacks.forEach((action) => {
        storedValue = action(storedValue);
      })
    } catch (err) {
      this.actionCallbacks = [];
      this.onReject(err);
    }
  }
  
  onReject(err) {
    this.errorCallback(err);
  }
}

export default Pledge;
```

```js
new Pledge((resolve, reject) => {
  console.log('top of a single then clause')
  setTimeout(() => {
    console.log('about to call resolve callback')
    resolve('this is the result')
    console.log('after resolve callback')
  }, 0)
  console.log('end of a action callback')
}).then((value) => {
  console.log(`first 'then' with "${value}"`)
  return 'first then value'
}).then((value) => {
  console.log(`second 'then' with "${value}"`)
  return 'second then value'
})
```

```
top of single then clause // 지연 전 실행한 부분
end of a action callback // 즉시 실행 가능한 부분
about to call resolve callback // 지연된 부분
first 'then' with "this is the result" // resolve한 결과
second 'then' with "first then value" // 두번째 then
after resolve callback // 실제 프로미스와 호출 순서가 다른 부분
```
- 실제 프로미스에서는 `after resolve callback`이 `first...` 이전에 실행됨
- Node가 프로미스 then 핸들러 코드 실행을 지연시키고 있음

### then 내에서 또 다른 프로미스 반환하기
- 메서드가 두 번째 객체를 반환하면, 두 번째 객체의 메서드를 호출

```js
const delay = (message) => {
  return new Promise((resolve, reject) => {
    console.log(`constructing promise: ${message}`)
    setTimeout(() => {
      resolve(`resolving: ${message}`)
    })
  })
}

console.log('before')

delay('outer delay')
.then((value) => {
  console.log(`first then: ${value}`)
  return delay('inner delay') // 첫번째 then에서 프로미스 반환
})
.then((value) => {
  console.log(`second then: ${value}`)
})

console.log('after')
```

```
before
constructing promise: outer delay
after
first then: resolving: outer delay
constructing promise: inner delay
second then: resolving: inner delay
```


### 파일 줄 수 계산 프로그램
```js
// count-lines-single-file.js
import fs from 'fs-extra-promise'

const filename = process.argv[2]
fs.readFileAsync(filename, {encoding: 'utf-8'})
.then(data => {
  const length = data.split('\n').length -1
  console.log(`${filename}: ${length}`)
})
.catch(err => {
  console.error(err.message)
})
```

```
node count-lines-single-file.js count-lines-single-file.js
```

```
count-lines-single-file.js: 12
```

#### 파일 여러개 줄 수 계산 프로그램
```js
import glob from 'glob-promise'
import fs from 'fs-extra-promise'

const main = (srcDir) => {
  glob(`${srcDir}/**/*.*`) // 지연 작업이 필요한 경우 Promise.all로 모든 파일 처리 후 다음 단계 진행
    .then(files => Promise.all(files.map(f => statPair(f))))
    .then(files => files.filter(pair => pair.stats.isFile()))
    .then(files => files.map(pair => pair.filename))
    .then(files => Promise.all(files.map(f => lineCount(f)))) 
    .then(counts => counts.forEach(c => console.log(`${c.lines} ${c.name}`)))
    .catch(err => console.error(err.message))
}

const statPair = (filename) => {
  return new Promise((resolve, reject) => {
    fs.statAsync(filename)
      .then(stats => resolve({filename, stats}))
      .catch(err => reject(err))
  })
}

// then 내부 코드 처럼 임시 객체를 구성하면 필드를 추가하거나 재편성하기 좋고 문서 역할도 한다.
const lineCount = (filename) => {
  return new Promise((resolve, reject) => {
    fs.readFileAsync(filename, {encoding: 'utf-8'})
      .then(data => resolve({name: filename, lines: data.split('\n').length - 1}))
      .catch(err => reject(err))
  })
}
```


### 더 읽기 쉽게 만들기
- 프로미스는 심각한 콜백 중첩을 제거해주지만 이해하기는 여전히 어려울 수 있다.
- 최신 자바스크립트에서는 더 읽기 쉬운 `async`, `await`을 제공한다. 

#### 파일 이름 첫 열글자 반환 프로그램
```js
const firstTenCharacters = async (filename) => {
  const text = await fs.readFileAsync(filename, 'utf-8')
  console.log(`inside, raw text is ${text.length} characters long`)
  return text.slice(0,10)
}

console.log('about to call')
const result = firstTenCharacters(process.argv[2])
console.log(`function result has type ${result.constructor.name}`)
result.then(value => console.log(`outside, final result is "${value}"`))
```

```
about to call
function result has type Promise
inside, raw text is 24 characters long
outside, final result is "Begin at t"
```

#### 파일 여러개 줄 수 계산 프로그램 다시 작성해보기
```js
const main = async (srcDir) => {
  const files = await glob(`${srcDir}/**/*.*`)
  const pairs = await Promise.all(files.map(async (filename) => await statPair(filename)))
  const filtered = pairs.filter(pair => stats.isFile()).map(pair => pair.filename)
  const counts = await Promise.all(filtered.map(async (name) => await lineCount(name)))
  
  counts.forEach(
    ({filename, lines}) => console.log(`${lines}: ${filename}`)
  )
}

const statPair = async (filename) => {
  const stats = await fs.statAsync(filename)
  return {filename, stats}
}

const lineCount = async (filename) => {
  const data = await fs.readFileSync(filename, 'utf-8')
  return {
    filename,
    lines: data.split('\n').length - 1
  }
}

const srcDir = process.argv[2]
main(srcDir)
```

### 비동기 코드에서 에러 처리하기
#### 에러 바로 반환
```js
async function returnImmediately() {
  try {
    return Promise.reject(new Error("deliberate")) // promise를 그대로 반환
  } catch (err) {
    return new Error("caught exception") // 에러가 발생하기 전에 반환하므로 무시됨
  }
}

const result = returnImmediately();
result.catch((err) => console.log(`caller caught ${err}`))
```
```
caller caught Error: deliberate
```

#### 에러 기다렸다가 반환
```js
async function returnAwait() {
  try {
    return await Promise.reject(new Error("deliberate")) // await으로 기다렸다가 반환
  } catch (err) {
    console.log("caught exception") // 에러가 try 블록 안에서 발생하므로 catch 블록에서 잡을 수 있음
  }
}

returnAwait()
```

```
caught exception
```