# 시스템 프로그래밍
초기 자바스크립트 프로그램은 비동기 연산에 콜백 함수를 사용했다. 
콜백은 작은 프로그램에서도 이해하기 어려울 수 있다. 
자바스크립트 개발자들은 콜백을 쉽게 관리할 수 있도록 프로미스 / async, await을 추가했다.
문제가 발생했을 때 디버깅하려면 세가지 방식을 모두 이해해야 한다. 이 장에서는 콜백을 먼저 살펴본다.
- 예시: Node 표준 라이브러리를 사용해서 파일과 디렉터리를 읽고 쓰는 방법 


### 1. 디렉터리를 나열하는 방법
- 명령할 때  인수를 사용해서 프로그램에 내용을 전달하면 Node는 `process.argv` 배열에 저장한다.
  - `node list-dir-wrong.js .` => `['/usr/local/bin/node', '/your/path/list-dir-wrong.js', '.']`

```js
import fs from 'fs'

const srcDir = process.argv[2]
const results = fs.readdir(srcDir) // fs.readdir는 비동기 함수

for(const name of results) { // fs.readdir는 반환하는 값이 없는 함수. results에 원하는 값이 없어서 에러 발생
  console.log(name)
}
```

### 2. 콜백 함수 사용
- `fs.readdir`는 데이터를 사용할 수 있을 때 수행할 작업을 알려주는 콜백 함수가 필요하다. 
- Node 콜백은 항상 첫 번째 인자로 에러 결과를, 두 번재 인자로 성공적인 함수 호출 결과를 받는다.

```js
import fs from 'fs'

const listContents = (err, files) => {
  if (err) {
    console.error(err);
  } else {
    for (const name of files) {
      console.log(name)
    }
  }
}

const srcDir = process.argv[2]
fs.readdir(srcDir, listContents)
```

### 3. 익명 함수 사용
- note: 함수는 데이터다. 숫자, 문자, 픽셀 대신 명령으로 이루어져 있지만 함수도 다른 데이터처럼 메모리에 저장된다. 

```js
import fs from 'fs'

const srcDir = process.argv[2]
fs.readdir(srcDir, (err, files) => {
  if (err) {
    console.error(err);
  } else {
    for (const name of files) {
      console.log(name)
    }
  }
})
```

### 4. 원하는 파일을 선택하는 방법
- `glob` 모듈 사용: 패턴과 일치하는 파일을 찾을 수 있다. 

```js
import glob from 'glob'

const srcDir = process.argv[2]
glob(`${srcDir}/**/*.*`, (err, files) => { // 모든 하위 디렉토리(**) 탐색, 재귀적으로 여러 단계 하위 디렉토리도 탐색함
  if (err) {
    console.error(err);
  } else {
    for (const name of files) {
      console.log(name)
    }
  }
})
```

#### `.bck`로 끝나는 편집기 백업 파일은 선택에서 제외하고 싶을 때
- 방법 1: Array.filter 사용
```js
glob(`${srcDir}/**/*.*`, (err, files) => { 
  files = files.filter(f => !f.endsWith('.bck'))
  // ...code
})
```
- 방법 2: glob 옵션 사용
  - note: 모든 것을 아는 사람은 없다. (저자는) 누군가가 glob의 `ignore` 옵션을 알려주기 전까지 1년 넘게 `Array.filter`를 사용했다.
    - 인생은 짧기 때문에 우리 대부분은 더 나은 것을 찾기보다는 눈앞의 문제를 해결하고 재사용하는 방법을 찾는다.
    - 코드 리뷰는 단순히 버그를 찾는 것뿐만 아니라 프로그래머 간에 지식을 전달하는 가장 효과적인 방법이기도 하다.
```js
glob(`${srcDir}/**/*.*`, { ignore: '*.bck' }, (err, files) => {
  // ...code
})
```

### 5. 선택한 파일을 복사하는 법
- 명령줄 인수로 원하는 출력 디렉토리를 입력 후 사용
  - 명령줄에 대상(dstDir)을 지정한 경우에만 작동
  - 대상 디렉토리를 지정했어도 이미 존재하는 디렉토리인 경우에만 작동

```js
import glob from 'glob'

const [srcDir, dstDir] = process.argv.slice(2)

glob(`${srcDir}/**/*.*`, (err, files) => { 
  if (err) {
    console.error(err);
  } else {
    for (const srcName of files) {
      const dstName = srcName.replace(srcDir, dstDir)
      console.log(srcName, dstName)
    }
  }
})
```

#### 대상 디렉토리가 없으면 자동으로 생성 후 파일을 복사
1. `glob`에 데이터가 있으면 작업을 수행한 다음 `fs.stat`를 호출해서 디렉토리가 아닌 파일만 구분 
2. `fs.stat`을 완료하면 `fs.ensureDir`를 호출
3. `fs.ensureDir`를 완료하면 `fs.copy`로 파일을 복사
- 총 4단계 콜백 `glob` => `stat` => `ensureDir` => `copy` 으로 가독성이 떨어져 이해하기 어려운 코드가 됨 

```js
import glob from 'glob'
import fs from 'fs-extra' // fs-extra는 fs를 기반으로 유용한 도구들을 제공함
import path from 'path' // 경로명 조작 편의를 위해 사용

const [srcRoot, dstRoot] = process.argv.slice(2) // glob 콜백에서 dstDir라는 이름 사용을 위해서 이름을 root로 변경

glob(`${srcRoot}/**/*.*`, (err, files) => {
  if (err) {
    console.error(err);
  } else {
    for (const srcName of files) {
      fs.stat(srcName, (err, stats) => { // srcName 상태(stat)를 확인해서 파일인지 구분
        if (err) {
          console.error(err)
        } else if (stats.isFile()) {
          const dstName = srcName.replace(srcRoot, dstRoot)
          const dstDir = path.dirname(dstName) // 디렉토리 경로만 추출. os에 따라 다른 경로 구분자도 맞게 처리

          fs.ensureDir(dstDir, err => { // dstDir 경로에 폴더가 없으면 중간 경로까지 전부 생성
            if (err) {
              console.error(err)
            } else {
              fs.copy(srcName, dstName, err => { // srcName 파일을 dstName 경로에 복사
                if (err) {
                  console.error(err)
                }
              })
            }
          })
        }
      })
    }
  }
})
```

