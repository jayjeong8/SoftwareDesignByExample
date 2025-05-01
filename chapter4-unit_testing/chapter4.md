# 유닛 테스트
### 유닛 테스트는 어떻게 구성해야 하나요?
- 통과 / 실패 / 에러로 구성
- 실패와 에러를 구분하는 방법: 어써션에서 파생된 예외일 경우 실패, 나머지 예외는 에러.

```js
const main = () => {
  HopeTests.forEach(([message, test]) => {
    try {
      test();
      HopePass += 1;
    } catch (e) {
      if (e instanceof assert.AssertionError) {
        HopeFail += 1;
      } else {
        HopeError += 1;
      }
    }
  })
}
```


### 테스트 등록은 어떻게 구성해야 하나요?
```js
class Hope {
  constructor() {
    this.todo = []; // 테스트 목록 상태를 class에서 관리
    this.passes = [];
    this.fails = [];
    this.errors = [];
  }
  
  /* 나중에 실행할 테스트 등록 */
  test(comment, callback) {
    // `caller` 모듈을 사용해서 테스트를 등록하는 함수 이름을 가져온다. 디버깅 시작할 위치를 알 수 있다.
    // caller()를 사용하는 대신 사용자가 함수명을 넘기게 할 수도 있다. 그럼 사용자가 테스트를 복사 붙여넣기하며 다른 테스트를 만들었을 때 엉뚱한 함수 이름을 넘길 수도 있다.
    this.todo.push([`${caller()}::${comment}`, callback]); 
  }
  
  /* 테스트 실행 */
  run() {
    this.todo.forEach(([comment, test]) => {
      // 어떤 테스트가 통과 또는 실패했는지 알 수 있도록 comment를 push
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
    })
  }
}

export default new Hope(); // 객체가 한 번만 생성되도록 싱글톤 사용
```


### 어떻게 테스트 커맨드라인 인터페이스를 만들 수 있을까요?
어떻게 테스트를 찾아서 실행할 수 있을까요?
- 방법: 테스트(`test()`)를 포함한 각 파일을 import한 뒤 실행(`run()`)
  - 유지보수 중에 금방 누군가가 테스트 파일 중 하나를 가져오는 것을 잊어버릴 수 있다. 
```js
// all-the-test.js
import './test-add.js';
import './test-sub.js';
import './test-mul.js';
import './test-div.js';

Hope.run()
```

- 더 나은 방법: 테스트 파일 동적 로드
```js
// pray.js
import minimist from "minimist"; // Unix 규칙으로 parse. `-x somthing` 패턴을 찾아 {x:something}로 파싱함
import glob from "glob";
import Hope from "./hope.js"

const main = async (args) => {
  const options = parse(args);
  
  if (options.filenames.length === 0) {
    // 현재 작업 디렉터리 하위에서 이름이 `test-*.js` 패턴과 일치하는 모든 파일 찾기
    options.filenames = glob.sync(`${options.root}/**/test-*.js`);
  }
  
  for (const f of options.filenames) {
    await import(f); // import를 비동기 함수로 사용 가능
  }
  
  Hope.run();
  const result = options.output === "terse" ? Hope.terse() : Hope.verbose();
  console.log(result);
}

// ...minimist를 사용하는 parse가 생략된 것 같음 

main(process.argv.slice(2));
```

#### Lifecycle of dynamically-discovered unit tests.
![img.png](img.png)