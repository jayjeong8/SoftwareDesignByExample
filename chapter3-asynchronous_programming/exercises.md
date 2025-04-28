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

=> Promise 콜백 정의 => Promise 인스턴스 생성 및 콜백 즉시 실행 => oops에 reject 상태 Promise를 할당   
=> 첫번째 oops에 콜백 첨부 => 두번째 oops에 catch 콜백 첨부   
=> 첫번째 oops에서 reject된 에러 받아서 console 출력 => 두번째 oops에서 reject된 에러 받아서 console 출력  

> What happens if we run these same lines interactively? Why do we see something different than what we see when we run this file from the command line?
- 명령줄 실행: 전체 파일을 한 번에 실행
- 대화형 실행: 한 줄 한 줄 실행, 결과를 각각 출력
- 대화형 실행에서는 입력마다 결과를 보여주려고 하기 때문에 반환된 Promise 객체를 출력할 수 있음
